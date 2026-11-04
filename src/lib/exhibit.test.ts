import { describe, expect, it } from "vitest";
import { buildExhibitPackage, buildZip, exhibitCsv, manifestCsv, planBundle, criterionLetter, type ExhibitRow } from "./exhibit";
import { independenceSummary, snoozeDate } from "./recommender";

const venue = (o = {}) => ({ name: "Conf", qualityTier: "T1", avoidFlag: false, prestige: null, independenceHint: "independent", selectivity: "15% acceptance", kind: "conference", cost: null, ...o });
const row = (id: string, o: Partial<ExhibitRow> = {}, v: ReturnType<typeof venue> | null = venue()): ExhibitRow => ({
  id, state: "completed", notes: null, criterionIds: "[3]", appliedOn: null, decidedOn: null, completedOn: new Date("2026-01-01"),
  invitationProof: true, completionProof: true, thirdPartyProof: true, independence: "independent", brandScore: null, strength: null,
  evidence: [{ label: "talk video", kind: "file", value: "talk.mp4", checklistItem: null }, { label: "page", kind: "link", value: "https://x.test", checklistItem: null }],
  opportunity: { title: `T-${id}`, type: "give_talk", url: null, criterionIds: "[3]", venue: v },
  ...o,
});
const crit = [{ id: 3, name: "Published material" }, { id: 5, name: "Original contributions" }];

describe("exhibit package", () => {
  it("numbers exhibits per criterion and excludes avoid/dropped", () => {
    const p = buildExhibitPackage([row("a"), row("b"), row("c", { state: "dropped" }), row("d", {}, venue({ avoidFlag: true }))], crit, null);
    const s = p.sections.find((x) => x.id === 3)!;
    expect(s.items.map((i) => i.ref)).toEqual(["C-1", "C-2"]);
    expect(p.excluded.map((e) => e.reason)).toEqual(["dropped pursuit", "avoid-flagged venue (pay-to-play / low quality)"]);
    expect(s.items[0].corroboration).toContain("fully corroborated");
    expect(s.items[0].score).toBeGreaterThan(50);
  });
  it("filters by criterion and flags invitation-only", () => {
    const p = buildExhibitPackage([row("a", { completionProof: false, thirdPartyProof: false, criterionIds: "[5]" })], crit, null, 5);
    expect(p.sections).toHaveLength(1);
    expect(p.sections[0].items[0].corroboration).toContain("invitation only");
    expect(criterionLetter(5)).toBe("E");
  });
  it("csv neutralizes formulas and plans bundle with unique paths", () => {
    const p = buildExhibitPackage([row("a", { evidence: [{ label: "=cmd", kind: "file", value: "a/x.pdf", checklistItem: null }, { label: "y", kind: "file", value: "b/x.pdf", checklistItem: null }] })], crit, null);
    const plan = planBundle(p, (v) => `/ev/${v}`);
    expect(plan.map((x) => x.zipPath)).toEqual(["evidence/C-1/x.pdf", "evidence/C-1/2-x.pdf"]);
    expect(exhibitCsv(p)).toContain("\"'=cmd\"");
    expect(manifestCsv(p)).toContain("evidence/C-1/x.pdf");
  });
  it("zip has local header + EOCD signatures", () => {
    const z = buildZip([{ name: "a.txt", data: Buffer.from("hi") }]);
    expect(z.readUInt32LE(0)).toBe(0x04034b50);
    expect(z.readUInt32LE(z.length - 22)).toBe(0x06054b50);
  });
});

describe("recommender helpers", () => {
  it("warns when most are non-independent, ignoring declined", () => {
    const s = independenceSummary([{ independent: false, status: "agreed" }, { independent: false, status: "contacted" }, { independent: true, status: "identified" }, { independent: true, status: "declined" }]);
    expect(s.total).toBe(3);
    expect(s.warn).toBe(true);
    expect(independenceSummary([{ independent: true, status: "agreed" }]).warn).toBe(false);
    expect(independenceSummary([]).warn).toBe(false);
  });
  it("snoozes by N days", () => {
    expect(snoozeDate(new Date("2026-01-01T00:00:00Z"), 14).toISOString().slice(0, 10)).toBe("2026-01-15");
  });
});
