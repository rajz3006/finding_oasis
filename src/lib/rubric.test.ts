import { describe, expect, it } from "vitest";
import {
  computeReadiness, corroborationScore, criterionStrength, derivePrestige, deriveSelectivity, effectiveIndependence, estimateBrandScore,
  leverage, opportunityLeverage, opportunityStrength, pursuitStrengthScore, rollupCriteria, recencyOf, type RubricItem, type StrengthInput,
} from "./rubric";

const full = { invitation: true, completion: true, thirdParty: true };
const top: StrengthInput = { prestige: "flagship", independence: "independent", proofs: full, selectivity: "high" };
const now = new Date("2026-06-01");

describe("Layer A", () => {
  it("perfect = 100", () => expect(opportunityStrength(top).score).toBe(100));
  it("weights: recognized/mixed/partial/moderate", () => {
    const r = opportunityStrength({ prestige: "recognized", independence: "mixed", proofs: { invitation: false, completion: true, thirdParty: false }, selectivity: "moderate" });
    expect(r.score).toBe(Math.round(70 * 0.35 + 50 * 0.25 + 50 * 0.25 + 50 * 0.15));
    expect(r.penalized).toBe(false);
  });
  it("corroboration tiers", () => {
    expect(corroborationScore(full)).toBe(100);
    expect(corroborationScore({ invitation: true, completion: false, thirdParty: true })).toBe(50);
    expect(corroborationScore({ invitation: true, completion: false, thirdParty: false })).toBe(10);
    expect(corroborationScore({ invitation: false, completion: false, thirdParty: false })).toBe(10);
  });
  it("pay-to-play is penalized x0.3", () => {
    const r = opportunityStrength({ ...top, prestige: "pay_to_play" });
    expect(r.disqualifiers).toContain("pay_to_publish");
    expect(r.score).toBe(Math.round((0 + 25 + 25 + 15) * 0.3));
  });
  it("invitation without completion penalized", () => {
    const r = opportunityStrength({ ...top, proofs: { invitation: true, completion: false, thirdParty: true } });
    expect(r.disqualifiers).toEqual(["invitation_without_completion"]);
    expect(r.penalized).toBe(true);
  });
  it("flags penalize once", () => {
    const r = opportunityStrength({ ...top, flags: { employerOnly: true, advertorial: true, routineDuty: true } });
    expect(r.disqualifiers).toHaveLength(3);
    expect(r.score).toBe(30);
  });
});

describe("derivations", () => {
  it("prestige from tier", () => {
    expect(derivePrestige({ qualityTier: "T1" })).toBe("flagship");
    expect(derivePrestige({ qualityTier: "T2" })).toBe("recognized");
    expect(derivePrestige({ qualityTier: "T3" })).toBe("regional");
    expect(derivePrestige({ qualityTier: "curated" })).toBe("recognized");
    expect(derivePrestige({ qualityTier: "unrated" })).toBe("local");
    expect(derivePrestige(null)).toBe("local");
  });
  it("override and avoid", () => {
    expect(derivePrestige({ qualityTier: "T3", prestige: "flagship" })).toBe("flagship");
    expect(derivePrestige({ qualityTier: "T1", prestige: "flagship", avoidFlag: true })).toBe("pay_to_play");
    expect(derivePrestige({ qualityTier: "T1", prestige: "bogus" })).toBe("flagship");
  });
  it("selectivity text", () => {
    expect(deriveSelectivity("~20-30% applied track")).toBe("high");
    expect(deriveSelectivity("Highly selective; full peer review")).toBe("high");
    expect(deriveSelectivity("Selective; refereed")).toBe("moderate");
    expect(deriveSelectivity("65% acceptance")).toBe("unknown");
    expect(deriveSelectivity(null)).toBe("unknown");
  });
  it("independence: venue hint fills the mixed default only", () => {
    expect(effectiveIndependence("mixed", "independent")).toBe("independent");
    expect(effectiveIndependence("interested", "independent")).toBe("interested");
    expect(effectiveIndependence("mixed", null)).toBe("mixed");
    expect(effectiveIndependence("junk", "interested")).toBe("interested");
  });
  it("recency", () => {
    expect(recencyOf(new Date("2025-06-01"), now)).toBe(1);
    expect(recencyOf(new Date("2022-06-01"), now)).toBe(0.85);
    expect(recencyOf(new Date("2018-06-01"), now)).toBe(0.6);
    expect(recencyOf(null, now)).toBe(0.8);
  });
});

describe("Layer B", () => {
  it("strength = best + .5 second + .25 third, capped", () => {
    expect(criterionStrength([60, 40, 20, 90])).toBe(100); // 90+30+10 capped
    expect(criterionStrength([60, 40, 20, 30])).toBe(60 + 20 + 7.5);
    expect(criterionStrength([50, 40, 20])).toBe(75);
    expect(criterionStrength([])).toBe(0);
  });
  it("floors: judging 40, contributions 65, default 50", () => {
    const mk = (id: number, score: number): RubricItem => ({ criterionIds: [id], score, independence: "independent" });
    const r = rollupCriteria([mk(4, 40), mk(5, 60), mk(6, 49), mk(3, 50)]);
    const met = Object.fromEntries(r.map((c) => [c.id, c.met]));
    expect(met).toEqual({ 3: true, 4: true, 5: false, 6: false });
  });
  it("one item counts for several criteria", () => {
    expect(rollupCriteria([{ criterionIds: [3, 6, 6], score: 80, independence: "mixed" }]).map((c) => c.count)).toEqual([1, 1]);
  });
});

describe("Layer C", () => {
  const it_ = (ids: number[], score: number, o: Partial<RubricItem> = {}): RubricItem => ({
    criterionIds: ids, score, independence: "independent", thirdPartyProof: true, completedOn: new Date("2026-01-01"), ...o,
  });
  it("empty is not ready", () => {
    const r = computeReadiness([], now);
    expect(r.tier).toBe("not_ready");
    expect(r.gate2.score).toBe(0);
    expect(r.warnings[0].code).toBe("need_criteria");
  });
  it("<3 met criteria is not ready even with high scores", () => {
    expect(computeReadiness([it_([3], 95), it_([5], 95)], now).tier).toBe("not_ready");
  });
  it("sub-floor items do not meet", () => {
    expect(computeReadiness([it_([3], 30), it_([6], 30), it_([7], 30)], now).gate1.met).toBe(0);
  });
  it("3 weak-ish criteria = meets_weak_merits", () => {
    const r = computeReadiness([it_([4], 45, { independence: "interested" }), it_([6], 52, { independence: "interested" }), it_([7], 55, { independence: "interested" })], now);
    expect(r.gate1.pass).toBe(true);
    expect(r.tier).toBe("meets_weak_merits");
    expect(r.warnings.map((w) => w.code)).toContain("weak_merits");
    expect(r.warnings.map((w) => w.code)).toContain("low_independence");
  });
  it("strong needs >=4 criteria, high gate2, independence", () => {
    const items = [it_([5], 95), it_([3], 90), it_([1], 90), it_([6], 85)];
    const r = computeReadiness(items, now);
    expect(r.tier).toBe("strong");
    expect(r.independenceRatio).toBe(1);
    expect(computeReadiness(items.slice(0, 3), now).tier).toBe("competitive");
  });
  it("high score but low independence is not strong", () => {
    const items = [it_([5], 95, { independence: "mixed" }), it_([3], 90, { independence: "interested" }), it_([1], 90, { independence: "interested" }), it_([6], 85, { independence: "interested" })];
    expect(computeReadiness(items, now).tier).not.toBe("strong");
  });
  it("stale evidence lowers gate 2", () => {
    const fresh = computeReadiness([it_([5], 90), it_([3], 90), it_([1], 90)], now);
    const old = computeReadiness([5, 3, 1].map((c) => it_([c], 90, { completedOn: new Date("2015-01-01") })), now);
    expect(old.gate2.score).toBeLessThan(fresh.gate2.score);
    expect(old.warnings.map((w) => w.code)).toContain("stale_evidence");
  });
  it("warns on buildable criteria without independent impact", () => {
    const r = computeReadiness([it_([4], 60, { thirdPartyProof: false }), it_([6], 70), it_([5], 80, { thirdPartyProof: false })], now);
    const ids = r.warnings.filter((w) => w.code === "buildable_no_impact").map((w) => w.criterionId);
    expect(ids).toEqual([4, 5]);
  });
  it("counts penalized items", () => {
    const r = computeReadiness([it_([3], 60, { penalized: true }), it_([6], 60), it_([7], 60)], now);
    expect(r.warnings.map((w) => w.code)).toContain("penalized_items");
  });
});

describe("leverage and brand", () => {
  it("leverage = brand x weight, clamped", () => {
    expect(leverage(80, 1)).toBe(80);
    expect(leverage(80, 0.5)).toBe(40);
    expect(leverage(150, 2)).toBe(100);
    expect(leverage(-5, 0.5)).toBe(0);
  });
  it("opportunityLeverage uses heaviest criterion", () => {
    expect(opportunityLeverage(100, [4, 5])).toBe(100);
    expect(opportunityLeverage(100, [4])).toBe(50);
    expect(opportunityLeverage(100, [])).toBe(0);
  });
  it("brand estimate: type base scaled by prestige", () => {
    expect(estimateBrandScore({ type: "give_talk", prestige: "flagship" })).toBe(75);
    expect(estimateBrandScore({ type: "give_talk", prestige: "local" })).toBe(49);
    expect(estimateBrandScore({ type: "give_talk", prestige: "pay_to_play" })).toBe(30);
    expect(estimateBrandScore({ type: "nope", criterionIds: [3, 4], prestige: "flagship" })).toBe(75);
    expect(estimateBrandScore({})).toBe(35);
  });
});

describe("pursuitStrengthScore", () => {
  const p = { criterionIds: "[]", invitationProof: true, completionProof: true, thirdPartyProof: true, independence: "mixed", brandScore: null, completedOn: null };
  const o = { type: "judge_review", criterionIds: "[4]" };
  const v = { qualityTier: "T1", avoidFlag: false, prestige: null, independenceHint: "independent", selectivity: "Highly selective", kind: "journal", cost: null };
  it("maps DB shapes, venue hint and estimated brand", () => {
    const r = pursuitStrengthScore(p, o, v);
    expect(r.criterionIds).toEqual([4]);
    expect(r.independence).toBe("independent");
    expect(r.strength.score).toBe(100);
    expect(r.brandEstimated).toBe(true);
    expect(r.brand).toBe(25);
    expect(r.leverage).toBe(Math.round(25 * 0.5));
  });
  it("pursuit criteria and brandScore override; no venue = local", () => {
    const r = pursuitStrengthScore({ ...p, criterionIds: "[5]", brandScore: 90 }, o, null);
    expect(r.criterionIds).toEqual([5]);
    expect(r.brand).toBe(90);
    expect(r.brandEstimated).toBe(false);
    expect(r.strength.factors.prestige).toBe(15);
  });
  it("avoid venue is penalized", () => {
    const r = pursuitStrengthScore(p, o, { ...v, avoidFlag: true });
    expect(r.strength.disqualifiers).toContain("pay_to_publish");
  });
});
