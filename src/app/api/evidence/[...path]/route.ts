import { requireUser } from "@/lib/auth";
import { serveEvidence } from "@/lib/evidence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const deny = await requireUser();
  if (deny) return deny;
  const { path: segs } = await ctx.params;
  try {
    const r = await serveEvidence(segs.map(decodeURIComponent).join("/"));
    // Signed URL is short-lived (60s) and never cached.
    if (r.kind === "redirect") return new Response(null, { status: 302, headers: { Location: r.url, "Cache-Control": "no-store" } });
    return new Response(new Uint8Array(r.data), {
      headers: {
        "Content-Type": r.contentType,
        "Content-Disposition": `${r.inline ? "inline" : "attachment"}; filename="${r.filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
