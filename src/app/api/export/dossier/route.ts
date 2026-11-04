import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import PDFDocument from "pdfkit";
import { ensureSeeded } from "@/lib/seed";
import { buildDossier, dossierCsv, type DossierSection } from "@/lib/dossier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dossierPdf(sections: DossierSection[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(18).text("EB-1A evidence dossier");
    doc.fontSize(9).fillColor("#666").text(`Generated ${new Date().toISOString().slice(0, 10)}`).fillColor("#000");
    for (const s of sections) {
      doc.moveDown().fontSize(13).text(`${s.id}. ${s.name}`);
      if (!s.rows.length) doc.fontSize(9).fillColor("#666").text("No pursuits yet.").fillColor("#000");
      for (const r of s.rows) {
        const [, opp, venue, tier, avoid, state, strength, label, kind, value, item] = r;
        doc.moveDown(0.4).fontSize(10).text(opp, { continued: false });
        doc.fontSize(8.5).fillColor("#444").text(
          [venue && `Venue: ${venue}`, tier && `tier ${tier}`, avoid && "AVOID-FLAGGED", `state ${state}`, strength && `strength ${strength}`].filter(Boolean).join(" | "),
        );
        if (label) doc.text(`Evidence: ${label} (${kind}) ${value}`);
        if (item) doc.text(`Checklist: ${item}`);
        doc.fillColor("#000");
      }
    }
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
  const format = sp.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") return NextResponse.json({ error: "format must be csv or pdf" }, { status: 400 });

  await ensureSeeded();
  const sections = await buildDossier(criterion);
  const name = `dossier-${criterion ? `criterion-${criterion}` : "all"}`;
  if (format === "csv") {
    return new Response(dossierCsv(sections), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }
  const pdf = await dossierPdf(sections);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"` },
  });
}
