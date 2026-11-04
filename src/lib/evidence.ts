import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const EVIDENCE_DIR = path.resolve(process.cwd(), "evidence");

export async function ensureEvidenceDir(sub?: string): Promise<string> {
  const dir = sub ? path.join(EVIDENCE_DIR, safeName(sub)) : EVIDENCE_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Strip path parts and unsafe chars; never returns empty or dot-only names. */
export function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return clean || "file";
}

/**
 * Save an uploaded file under evidence/<subdir>/. Returns the path relative to the
 * evidence dir (store this in Evidence.value). Never overwrites.
 */
export async function saveEvidenceFile(file: File, subdir = "misc"): Promise<string> {
  const dir = await ensureEvidenceDir(subdir);
  const name = `${crypto.randomBytes(4).toString("hex")}-${safeName(file.name)}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return path.posix.join(safeName(subdir), name);
}

/** Resolve a stored relative path to an absolute one; throws if it escapes evidence/. */
export function resolveEvidencePath(rel: string): string {
  const abs = path.resolve(EVIDENCE_DIR, rel);
  if (abs !== EVIDENCE_DIR && !abs.startsWith(EVIDENCE_DIR + path.sep)) throw new Error("Invalid evidence path");
  return abs;
}

export async function deleteEvidenceFile(rel: string): Promise<void> {
  await fs.rm(resolveEvidencePath(rel), { force: true });
}
