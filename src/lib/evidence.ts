import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Storage driver: Supabase Storage (private bucket) when a Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY are set,
// else ./evidence on local disk (dev). Service-role key stays server-side.

export const MAX_LOCAL_BYTES = 25 * 1024 * 1024;
// Vercel caps request bodies at 4.5MB; keep headroom for multipart overhead.
export const MAX_HOSTED_BYTES = 4 * 1024 * 1024;
export const SIGNED_URL_TTL_S = 60;

export class EvidenceError extends Error {}

export const EVIDENCE_DIR = path.resolve(process.env.EVIDENCE_DIR ?? path.join(process.cwd(), "evidence"));

export const evidenceBucket = () => process.env.SUPABASE_EVIDENCE_BUCKET || "evidence";
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
export const isHosted = () => !!(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const maxUploadBytes = () => (isHosted() ? MAX_HOSTED_BYTES : MAX_LOCAL_BYTES);

// Inline-safe types; everything else is served as an attachment (no SVG/HTML inline).
const TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".txt": "text/plain", ".md": "text/plain", ".eml": "message/rfc822",
};
const INLINE = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md"]);
export const contentTypeFor = (name: string) => TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
export const isInline = (name: string) => INLINE.has(path.extname(name).toLowerCase());

/** Strip path parts and unsafe chars; never returns empty or dot-only names. */
export function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return clean || "file";
}

/** Validate a stored key: relative, no traversal, no odd chars. Returns it normalized or throws. */
export function assertSafeKey(rel: string): string {
  if (typeof rel !== "string" || !rel || rel.length > 400 || /[\0\\]/.test(rel) || rel.startsWith("/")) throw new Error("Invalid evidence path");
  const segs = rel.split("/");
  if (segs.some((s) => !s || s === "." || s === "..")) throw new Error("Invalid evidence path");
  return segs.join("/");
}

/** Build a new object key: <subdir>/<random>-<name>. */
export function makeKey(subdir: string, filename: string): string {
  return `${safeName(subdir)}/${crypto.randomBytes(4).toString("hex")}-${safeName(filename)}`;
}

// ---- driver ----
type Client = Pick<SupabaseClient, "storage">;
let clientOverride: Client | null = null;
let cached: Client | null = null;
/** Test hook: inject a (mock) Supabase client. */
export function __setSupabaseClient(c: Client | null) {
  clientOverride = c;
  cached = null;
}
function client(): Client {
  if (clientOverride) return clientOverride;
  return (cached ??= createClient(supabaseUrl()!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }));
}
const bucket = () => client().storage.from(evidenceBucket());

/** Resolve a stored key to an absolute local path; throws if it escapes the evidence dir. Local driver only. */
export function resolveEvidencePath(rel: string): string {
  const abs = path.resolve(EVIDENCE_DIR, assertSafeKey(rel));
  if (!abs.startsWith(EVIDENCE_DIR + path.sep)) throw new Error("Invalid evidence path");
  return abs;
}

/** Save an upload under <subdir>/. Returns the key (store in Evidence.value). Never overwrites. */
export async function saveEvidenceFile(file: File, subdir = "misc"): Promise<string> {
  const limit = maxUploadBytes();
  if (file.size > limit) {
    const mb = limit / 1024 / 1024;
    throw new EvidenceError(`File too large (max ${mb}MB${isHosted() ? " on the hosted deployment; host larger files elsewhere and attach a link" : ""}).`);
  }
  const key = makeKey(subdir, file.name);
  const data = Buffer.from(await file.arrayBuffer());
  if (isHosted()) {
    const { error } = await bucket().upload(key, data, { contentType: contentTypeFor(file.name), upsert: false });
    if (error) throw new EvidenceError(`Evidence upload failed: ${error.message}`);
  } else {
    const abs = resolveEvidencePath(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data, { flag: "wx" });
  }
  return key;
}

export async function deleteEvidenceFile(rel: string): Promise<void> {
  const key = assertSafeKey(rel);
  if (isHosted()) {
    const { error } = await bucket().remove([key]);
    if (error) throw new EvidenceError(`Evidence delete failed: ${error.message}`);
  } else {
    await fs.rm(resolveEvidencePath(key), { force: true });
  }
}

/** Read a file's bytes. Returns null if missing, invalid, or larger than maxBytes. */
export async function readEvidenceFile(rel: string, maxBytes = MAX_LOCAL_BYTES): Promise<Buffer | null> {
  try {
    const key = assertSafeKey(rel);
    if (isHosted()) {
      const { data, error } = await bucket().download(key);
      if (error || !data) return null;
      if (data.size > maxBytes) return null;
      return Buffer.from(await data.arrayBuffer());
    }
    const abs = resolveEvidencePath(key);
    const st = await fs.stat(abs);
    if (!st.isFile() || st.size > maxBytes) return null;
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export type EvidenceServe =
  | { kind: "redirect"; url: string }
  | { kind: "buffer"; data: Buffer; contentType: string; filename: string; inline: boolean };

/** How to serve a stored file: short-lived signed URL (hosted) or the bytes (local). Throws if invalid/missing. */
export async function serveEvidence(rel: string): Promise<EvidenceServe> {
  const key = assertSafeKey(rel);
  const filename = key.split("/").pop()!;
  const inline = isInline(filename);
  if (isHosted()) {
    // download option forces Content-Disposition: attachment for non-inline types
    const { data, error } = await bucket().createSignedUrl(key, SIGNED_URL_TTL_S, inline ? undefined : { download: filename });
    if (error || !data?.signedUrl) throw new Error("Not found");
    return { kind: "redirect", url: data.signedUrl };
  }
  return { kind: "buffer", data: await fs.readFile(resolveEvidencePath(key)), contentType: contentTypeFor(filename), filename, inline };
}
