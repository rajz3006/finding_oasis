import { describe, expect, it } from "vitest";
import { bestOpportunity, deriveCoverage, nearestWins, type CandidateOpp, type CoveragePursuit } from "./coverage";

const p = (o: Partial<CoveragePursuit>): CoveragePursuit => ({
  state: "completed", strength: "thin", criterionIds: [], opportunityCriterionIds: [6], venueAvoid: false, ...o,
});

describe("deriveCoverage", () => {
  it("is empty with no pursuits", () => {
    const c = deriveCoverage([]);
    expect(c.summary).toMatchObject({ met: 0, strong: 0, toTarget: 3, toComfortable: 5 });
    expect(c.criteria).toHaveLength(10);
  });
  it("ignores non-completed and avoid-flagged pursuits", () => {
    const c = deriveCoverage([p({ state: "accepted" }), p({ venueAvoid: true })]);
    expect(c.summary.met).toBe(0);
  });
  it("pursuit criteria override opportunity criteria", () => {
    const c = deriveCoverage([p({ criterionIds: [5] })]);
    expect(c.criteria[4].count).toBe(1);
    expect(c.criteria[5].count).toBe(0);
  });
  it("strength: 1 strong or 2 moderate is strong; 1 moderate is moderate; else thin", () => {
    const cov = (ps: CoveragePursuit[]) => deriveCoverage(ps).criteria[5];
    expect(cov([p({ strength: "strong" })]).strength).toBe("strong");
    expect(cov([p({ strength: "moderate" }), p({ strength: "moderate" })]).strength).toBe("strong");
    expect(cov([p({ strength: "moderate" })]).strength).toBe("moderate");
    expect(cov([p({ strength: null }), p({ strength: "thin" })]).strength).toBe("thin");
    expect(cov([])).toMatchObject({ strength: null, met: false });
  });
  it("summary margins", () => {
    const c = deriveCoverage([6, 5, 7, 4].map((id) => p({ opportunityCriterionIds: [id], strength: "strong" })));
    expect(c.summary).toMatchObject({ met: 4, strong: 4, toTarget: 0, toComfortable: 1 });
  });
});

const opp = (o: Partial<CandidateOpp>): CandidateOpp => ({
  id: "x", title: "t", type: "publish_article", criterionIds: [6], deadline: null, statusCatalog: "unknown",
  venueName: "v", venueTier: "T2", venueAvoid: false, activePursuit: false, ...o,
});
const now = new Date("2026-01-01");

describe("nearest wins", () => {
  it("prefers higher tier, skips avoid/closed/past/active", () => {
    const best = bestOpportunity(6, [
      opp({ id: "avoid", venueTier: "T1", venueAvoid: true }),
      opp({ id: "past", venueTier: "T1", deadline: new Date("2025-01-01") }),
      opp({ id: "closed", venueTier: "T1", statusCatalog: "closed" }),
      opp({ id: "active", venueTier: "T1", activePursuit: true }),
      opp({ id: "t2", venueTier: "T2" }),
      opp({ id: "t1late", venueTier: "T1", deadline: new Date("2026-06-01") }),
      opp({ id: "t1soon", venueTier: "T1", deadline: new Date("2026-02-01") }),
    ], now);
    expect(best?.id).toBe("t1soon");
  });
  it("lists priority criteria at 0 or thin, in order", () => {
    const cov = deriveCoverage([p({ strength: "strong" })]); // criterion 6 strong
    const w = nearestWins(cov, [], now);
    expect(w.map((x) => x.criterionId)).toEqual([5, 7, 4, 3]);
  });
});
