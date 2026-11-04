// Attorney-ready exhibit builders. Pure except loadExhibitPackage (DB). Not legal advice.
import { crc32 } from "node:zlib";
import { db } from "./db";
import { getReadiness, pursuitStrengthScore, type Readiness } from "./rubric";
import { fmtDateIso } from "./recommender";

export interface ExhibitArtifact {
  label: string;
  kind: string;
  value: string; // file path or URL
  checklistItem: string | null;
  zipPath?: string; // set when bundled
}
export interface ExhibitItem {
  ref: string; // "A-1"
  pursuitId: string;
  title: string;
  description: string;
  venue: string;
  tier: string;
  independence: string;
  score: number;
  disqualifiers: string[];
  proofs: { invitation: boolean; completion: boolean; thirdParty: boolean };
  corroboration: string;
  state: string;
  dates: { applied: string; decided: string; completed: string };
  artifacts: ExhibitArtifact[];
}
export interface ExhibitSection {
  id: number;
  name: string;
  letter: string;
  items: ExhibitItem[];
}
export interface ExcludedItem {
  title: string;
  venue: string;
  criteria: number[];
  reason: string;
}
export interface ExhibitPackage {
  generatedAt: string;
  readiness: Readiness | null;
  sections: ExhibitSection[];
  excluded: ExcludedItem[];
}

/** Criterion 1 -> A ... 10 -> J. */
export const criterionLetter = (id: number) => String.fromCharCode(64 + id);

export function corroborationStatus(p: { invitation: boolean; completion: boolean; thirdParty: boolean }): string {
  const bits = [`invitation ${p.invitation ? "yes" : "no"}`, `completion ${p.completion ? "yes" : "no"}`, `third-party ${p.thirdParty ? "yes" : "no"}`];
  const n = [p.invitation, p.completion, p.thirdParty].filter(Boolean).length;
  const head = n === 3 ? "fully corroborated" : p.invitation && !p.completion ? "invitation only (weak)" : n === 0 ? "uncorroborated" : "partially corroborated";
  return `${head} (${bits.join(", ")})`;
}

// ---- pure builder over DB-shaped rows ----
export interface ExhibitRow {
  id: string;
  state: string;
  notes: string | null;
  criterionIds: string;
  appliedOn: Date | null;
  decidedOn: Date | null;
  completedOn: Date | null;
  invitationProof: boolean;
  completionProof: boolean;
  thirdPartyProof: boolean;
  independence: string;
  brandScore: number | null;
  strength: string | null;
  evidence: { label: string; kind: string; value: string; checklistItem: string | null }[];
  opportunity: {
    title: string;
    type: string;
    url: string | null;
    criterionIds: string;
    venue: { name: string; qualityTier: string; avoidFlag: boolean; prestige: string | null; independenceHint: string | null; selectivity: string | null; kind: string; cost: string | null } | null;
  };
}

export function buildExhibitPackage(
  rows: ExhibitRow[],
  criteria: { id: number; name: string }[],
  readiness: Readiness | null,
  criterion?: number,
  now = new Date(),
): ExhibitPackage {
  const sections: ExhibitSection[] = criteria
    .filter((c) => criterion == null || c.id === criterion)
    .sort((a, b) => a.id - b.id)
    .map((c) => ({ id: c.id, name: c.name, letter: criterionLetter(c.id), items: [] }));
  const excluded: ExcludedItem[] = [];
  const sorted = [...rows].sort((a, b) => (a.completedOn?.getTime() ?? 0) - (b.completedOn?.getTime() ?? 0));
  for (const r of sorted) {
    const v = r.opportunity.venue;
    const sc = pursuitStrengthScore(r, r.opportunity, v);
    const wanted = criterion == null ? sc.criterionIds : sc.criterionIds.filter((x) => x === criterion);
    if (!wanted.length) continue;
    const reason = r.state === "dropped" ? "dropped pursuit" : v?.avoidFlag ? "avoid-flagged venue (pay-to-play / low quality)" : null;
    if (reason) {
      excluded.push({ title: r.opportunity.title, venue: v?.name ?? "", criteria: wanted, reason });
      continue;
    }
    for (const s of sections) {
      if (!wanted.includes(s.id)) continue;
      const proofs = { invitation: r.invitationProof, completion: r.completionProof, thirdParty: r.thirdPartyProof };
      s.items.push({
        ref: `${s.letter}-${s.items.length + 1}`,
        pursuitId: r.id,
        title: r.opportunity.title,
        description: [r.opportunity.type.replace(/_/g, " "), r.opportunity.url, r.notes].filter(Boolean).join(" | "),
        venue: v?.name ?? "",
        tier: v?.qualityTier ?? "",
        independence: sc.independence,
        score: sc.strength.score,
        disqualifiers: sc.strength.disqualifiers,
        proofs,
        corroboration: corroborationStatus(proofs),
        state: r.state,
        dates: { applied: fmtDateIso(r.appliedOn), decided: fmtDateIso(r.decidedOn), completed: fmtDateIso(r.completedOn) },
        artifacts: r.evidence.map((e) => ({ label: e.label, kind: e.kind, value: e.value, checklistItem: e.checklistItem })),
      });
    }
  }
  return { generatedAt: now.toISOString().slice(0, 10), readiness, sections, excluded };
}

export async function loadExhibitPackage(criterion?: number): Promise<ExhibitPackage> {
  const [criteria, rows, readiness] = await Promise.all([
    db.criterion.findMany({ orderBy: { id: "asc" } }),
    db.pursuit.findMany({
      include: { evidence: { orderBy: { createdAt: "asc" } }, opportunity: { include: { venue: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getReadiness(),
  ]);
  return buildExhibitPackage(rows, criteria, readiness, criterion);
}

// ---- CSV ----
export const EXHIBIT_COLUMNS = ["Criterion", "Exhibit", "Title", "Description", "Venue", "Tier", "Independence", "Strength score", "Corroboration", "State", "Applied", "Decided", "Completed", "Artifact label", "Artifact kind", "Artifact", "Bundled path"] as const;

const cell = (v: string) => {
  const f = /^[=+\-@]/.test(v) ? "'" + v : v; // neutralize spreadsheet formulas
  return /[",\r\n]/.test(f) || f !== v ? `"${f.replace(/"/g, '""')}"` : f;
};

export function exhibitCsv(pkg: ExhibitPackage): string {
  const lines = [EXHIBIT_COLUMNS.map(cell).join(",")];
  for (const s of pkg.sections)
    for (const i of s.items) {
      const base = [`${s.id}. ${s.name}`, `Exhibit ${i.ref}`, i.title, i.description, i.venue, i.tier, i.independence, String(i.score), i.corroboration, i.state, i.dates.applied, i.dates.decided, i.dates.completed];
      if (!i.artifacts.length) lines.push([...base, "", "", "", ""].map(cell).join(","));
      for (const a of i.artifacts) lines.push([...base, a.label, a.kind, a.value, a.zipPath ?? ""].map(cell).join(","));
    }
  for (const x of pkg.excluded) lines.push([`${x.criteria.join("/")}`, "EXCLUDED", x.title, x.reason, x.venue, "", "", "", "", "", "", "", "", "", "", "", ""].map(cell).join(","));
  return lines.join("\r\n") + "\r\n";
}

// ---- zip (store-only, no dependency) ----
export interface ZipEntry {
  name: string;
  data: Buffer;
}
export function buildZip(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data) >>> 0;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // utf-8 names
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(e.data.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    parts.push(lh, name, e.data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(e.data.length, 20);
    ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + e.data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

/** Safe zip name: strips directories and odd characters. */
export const safeName = (s: string) => s.replace(/^.*[\\/]/, "").replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "file";

/** Plan which file artifacts to bundle: unique zip paths under evidence/<ref>/. Mutates artifacts' zipPath for those resolvable. */
export function planBundle(pkg: ExhibitPackage, resolve: (value: string) => string | null): { zipPath: string; source: string }[] {
  const out: { zipPath: string; source: string }[] = [];
  const used = new Set<string>();
  for (const s of pkg.sections)
    for (const i of s.items)
      for (const a of i.artifacts) {
        if (a.kind === "link" || a.kind === "metric" || /^https?:\/\//i.test(a.value)) continue;
        const src = resolve(a.value);
        if (!src) continue;
        let p = `evidence/${i.ref}/${safeName(src)}`;
        for (let n = 2; used.has(p); n++) p = `evidence/${i.ref}/${n}-${safeName(src)}`;
        used.add(p);
        a.zipPath = p;
        out.push({ zipPath: p, source: src });
      }
  return out;
}

/** Manifest of every artifact: exhibit, label, value, bundled path or "not bundled". */
export function manifestCsv(pkg: ExhibitPackage): string {
  const lines = [["Exhibit", "Label", "Kind", "Value", "Bundled path"].map(cell).join(",")];
  for (const s of pkg.sections)
    for (const i of s.items) for (const a of i.artifacts) lines.push([`Exhibit ${i.ref}`, a.label, a.kind, a.value, a.zipPath ?? "not bundled"].map(cell).join(","));
  return lines.join("\r\n") + "\r\n";
}
