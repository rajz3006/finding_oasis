import { db } from "@/lib/db";
import { parseIntArray } from "@/lib/json";

export const DOSSIER_COLUMNS = ["Criterion", "Opportunity", "Venue", "Tier", "Avoid", "State", "Strength", "Evidence label", "Evidence kind", "Evidence value", "Checklist item"] as const;

export interface DossierSection {
  id: number;
  name: string;
  rows: string[][]; // aligned with DOSSIER_COLUMNS
}

/** One row per evidence item (or per pursuit with no evidence), grouped by criterion. Dropped pursuits excluded. */
export async function buildDossier(criterion?: number): Promise<DossierSection[]> {
  const [criteria, pursuits] = await Promise.all([
    db.criterion.findMany({ orderBy: { id: "asc" } }),
    db.pursuit.findMany({
      where: { state: { not: "dropped" } },
      include: { evidence: { orderBy: { createdAt: "asc" } }, opportunity: { include: { venue: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const sections: DossierSection[] = criteria
    .filter((c) => criterion == null || c.id === criterion)
    .map((c) => ({ id: c.id, name: c.name, rows: [] }));
  for (const p of pursuits) {
    const own = parseIntArray(p.criterionIds);
    const ids = own.length ? own : parseIntArray(p.opportunity.criterionIds);
    const v = p.opportunity.venue;
    for (const s of sections) {
      if (!ids.includes(s.id)) continue;
      const base = [`${s.id}. ${s.name}`, p.opportunity.title, v?.name ?? "", v?.qualityTier ?? "", v?.avoidFlag ? "yes" : "", p.state, p.strength ?? ""];
      if (!p.evidence.length) s.rows.push([...base, "", "", "", ""]);
      for (const e of p.evidence) s.rows.push([...base, e.label, e.kind, e.value, e.checklistItem ?? ""]);
    }
  }
  return sections;
}

const cell = (v: string) => (/[",\r\n]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"` : v);

export function dossierCsv(sections: DossierSection[]): string {
  const lines = [DOSSIER_COLUMNS.map(cell).join(",")];
  for (const s of sections) for (const r of s.rows) lines.push(r.map(cell).join(","));
  return lines.join("\r\n") + "\r\n";
}
