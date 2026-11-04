import fs from "node:fs/promises";
import path from "node:path";
import { resolveEvidencePath } from "@/lib/evidence";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".txt": "text/plain", ".md": "text/plain", ".eml": "message/rfc822",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segs } = await ctx.params;
  try {
    const abs = resolveEvidencePath(segs.map(decodeURIComponent).join("/"));
    const buf = await fs.readFile(abs);
    const type = TYPES[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Content-Disposition": `inline; filename="${path.basename(abs)}"`, "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
