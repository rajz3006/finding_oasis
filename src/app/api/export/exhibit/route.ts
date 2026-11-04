import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import PDFDocument from "pdfkit";
import { readEvidenceFile } from "@/lib/evidence";
import { ensureSeeded } from "@/lib/seed";
import { buildZip, exhibitCsv, loadExhibitPackage, manifestCsv, planBundle, type ExhibitPackage } from "@/lib/exhibit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE = 25 * 1024 * 1024;
function exhibitPdf(pkg: ExhibitPackage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(18).text("EB-1A exhibit index");
    doc.fontSize(9).fillColor("#666").text(`Generated ${pkg.generatedAt}. Working document for counsel; not legal advice.`).fillColor("#000");
    const r = pkg.readiness;
    if (r) {
      doc.moveDown().fontSize(12).text("Readiness summary");
      doc.fontSize(9).text(
        `Tier: ${r.tier.replace(/_/g, " ")} | Gate 1: ${r.gate1.met}/${r.gate1.required} criteria met (${r.gate1.criteria.join(", ") || "none"}) | Final-merits proxy: ${r.gate2.score}/100 | Independence ratio: ${Math.round(r.independenceRatio * 100)}%`,
      );
      for (const w of r.warnings) doc.fillColor("#a15c00").text(`Warning: ${w.message}`).fillColor("#000");
    }
    for (const s of pkg.sections) {
      doc.moveDown().fontSize(13).text(`${s.id}. ${s.name}`);
      if (!s.items.length) doc.fontSize(9).fillColor("#666").text("No qualifying exhibits.").fillColor("#000");
      for (const i of s.items) {
        doc.moveDown(0.4).fontSize(10.5).text(`Exhibit ${i.ref}: ${i.title}`);
        doc.fontSize(8.5).fillColor("#444");
        if (i.description) doc.text(i.description);
        doc.text([i.venue && `Venue: ${i.venue}`, i.tier && `tier ${i.tier}`, `independence ${i.independence}`, `Layer A strength ${i.score}/100`].filter(Boolean).join(" | "));
        doc.text(`Corroboration: ${i.corroboration}`);
        if (i.disqualifiers.length) doc.text(`Disqualifiers: ${i.disqualifiers.join(", ")}`);
        doc.text(`State ${i.state} | applied ${i.dates.applied || "-"} | decided ${i.dates.decided || "-"} | completed ${i.dates.completed || "-"}`);
        if (!i.artifacts.length) doc.text("Artifacts: none attached");
        i.artifacts.forEach((a, n) => doc.text(`  ${n + 1}. ${a.label} (${a.kind}): ${a.value}${a.zipPath ? `  [${a.zipPath}]` : ""}`));
        doc.fillColor("#000");
      }
    }
    doc.addPage().fontSize(13).text("Appendix: excluded pursuits");
    if (!pkg.excluded.length) doc.fontSize(9).fillColor("#666").text("None.").fillColor("#000");
    for (const x of pkg.excluded) doc.fontSize(9).text(`${x.title}${x.venue ? ` (${x.venue})` : ""} - criteria ${x.criteria.join(", ")} - ${x.reason}`);
    doc.end();
  });
}

export async function GET(req: Request) {
  const deny = await requireUser();
  if (deny) return deny;
  const sp = new URL(req.url).searchParams;
  const raw = sp.get("criterion");
  const criterion = raw ? Number(raw) : undefined;
  if (criterion !== undefined && !(Number.isInteger(criterion) && criterion >= 1 && criterion <= 10)) {
    return NextResponse.json({ error: "criterion must be 1..10" }, { status: 400 });
  }
  const format = sp.get("format") ?? "pdf";
  if (!["pdf", "csv", "zip"].includes(format)) return NextResponse.json({ error: "format must be pdf, csv or zip" }, { status: 400 });

  await ensureSeeded();
  const pkg = await loadExhibitPackage(criterion);
  const name = `exhibits-${criterion ? `criterion-${criterion}` : "all"}`;
  const dl = (type: string, ext: string) => ({ "Content-Type": type, "Content-Disposition": `attachment; filename="${name}.${ext}"` });

  if (format === "csv") return new Response(exhibitCsv(pkg), { headers: dl("text/csv; charset=utf-8", "csv") });
  if (format === "pdf") return new Response(new Uint8Array(await exhibitPdf(pkg)), { headers: dl("application/pdf", "pdf") });

  // zip: fetch files from the storage driver first so the index/manifest show bundled paths
  const files = new Map<string, Buffer>();
  for (const s of pkg.sections) for (const i of s.items) for (const a of i.artifacts) {
    if (a.kind === "link" || a.kind === "metric" || /^https?:\/\//i.test(a.value) || files.has(a.value)) continue;
    const data = await readEvidenceFile(a.value.replace(/^file:\/\//, ""), MAX_FILE);
    if (data) files.set(a.value, data);
  }
  const plan = planBundle(pkg, (v) => (files.has(v) ? v : null));
  const entries = [
    { name: "exhibit-index.pdf", data: await exhibitPdf(pkg) },
    { name: "exhibit-index.csv", data: Buffer.from(exhibitCsv(pkg)) },
    { name: "manifest.csv", data: Buffer.from(manifestCsv(pkg)) },
  ];
  for (const f of plan) entries.push({ name: f.zipPath, data: files.get(f.source)! });
  return new Response(new Uint8Array(buildZip(entries)), { headers: dl("application/zip", "zip") });
}
