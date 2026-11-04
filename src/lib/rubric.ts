// EB-1A quality rubric (BUILD_PLAN "EB-1A quality rubric"). Pure functions + thin DB wrappers.
// Informs software logic; not legal advice.
import type { Opportunity, Pursuit, Venue } from "@prisma/client";
import { db } from "./db";
import { parseIntArray } from "./json";
import { isOneOf, INDEPENDENCE, PRESTIGE, type Independence, type Prestige } from "./enums";

// ---------- Layer A: per-opportunity strength ----------

export type PrestigeTier = Prestige | "pay_to_play";
export type SelectivityLevel = "high" | "moderate" | "unknown";
export type Disqualifier = "pay_to_publish" | "invitation_without_completion" | "employer_only" | "advertorial" | "routine_duty";

export const WEIGHTS_A = { prestige: 0.35, independence: 0.25, corroboration: 0.25, selectivity: 0.15 } as const;
export const DISQUALIFIER_PENALTY = 0.3;
export const PRESTIGE_SCORE: Record<PrestigeTier, number> = { flagship: 100, recognized: 70, regional: 40, local: 15, pay_to_play: 0 };
export const INDEPENDENCE_SCORE: Record<Independence, number> = { independent: 100, mixed: 50, interested: 10 };
export const SELECTIVITY_SCORE: Record<SelectivityLevel, number> = { high: 100, moderate: 50, unknown: 20 };

export interface Proofs {
  invitation: boolean;
  completion: boolean;
  thirdParty: boolean;
}
export interface DisqualifierFlags {
  employerOnly?: boolean;
  advertorial?: boolean;
  routineDuty?: boolean;
}
export interface StrengthInput {
  prestige: PrestigeTier;
  independence: Independence;
  proofs: Proofs;
  selectivity: SelectivityLevel;
  flags?: DisqualifierFlags;
}
export interface StrengthResult {
  score: number; // 0-100 integer
  factors: { prestige: number; independence: number; corroboration: number; selectivity: number }; // each 0-100
  disqualifiers: Disqualifier[];
  penalized: boolean;
}

/** All three proofs 100; completion or third-party alone/partial 50; invitation-only or nothing 10. */
export function corroborationScore(p: Proofs): number {
  if (p.invitation && p.completion && p.thirdParty) return 100;
  if (p.completion || p.thirdParty) return 50;
  return 10;
}

export function opportunityStrength(i: StrengthInput): StrengthResult {
  const factors = {
    prestige: PRESTIGE_SCORE[i.prestige],
    independence: INDEPENDENCE_SCORE[i.independence],
    corroboration: corroborationScore(i.proofs),
    selectivity: SELECTIVITY_SCORE[i.selectivity],
  };
  const disqualifiers: Disqualifier[] = [];
  if (i.prestige === "pay_to_play") disqualifiers.push("pay_to_publish");
  if (i.proofs.invitation && !i.proofs.completion) disqualifiers.push("invitation_without_completion");
  if (i.flags?.employerOnly) disqualifiers.push("employer_only");
  if (i.flags?.advertorial) disqualifiers.push("advertorial");
  if (i.flags?.routineDuty) disqualifiers.push("routine_duty");
  let raw =
    factors.prestige * WEIGHTS_A.prestige +
    factors.independence * WEIGHTS_A.independence +
    factors.corroboration * WEIGHTS_A.corroboration +
    factors.selectivity * WEIGHTS_A.selectivity;
  const penalized = disqualifiers.length > 0;
  if (penalized) raw *= DISQUALIFIER_PENALTY; // single penalty, not per disqualifier
  return { score: Math.round(raw), factors, disqualifiers, penalized };
}

/** Venue prestige: explicit override, else from qualityTier. avoid -> pay_to_play. */
export function derivePrestige(v: { prestige?: string | null; qualityTier?: string | null; avoidFlag?: boolean | null } | null | undefined): PrestigeTier {
  if (!v) return "local";
  if (v.avoidFlag) return "pay_to_play";
  if (isOneOf(PRESTIGE, v.prestige)) return v.prestige;
  switch (v.qualityTier) {
    case "T1": return "flagship";
    case "T2": return "recognized";
    case "T3": return "regional";
    case "curated": return "recognized";
    default: return "local";
  }
}

/** Heuristic from free-text selectivity: <=30% or "highly selective" -> high; any review/selective cue -> moderate. */
export function deriveSelectivity(text: string | null | undefined): SelectivityLevel {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  const rates = [...t.matchAll(/(\d{1,2}(?:\.\d+)?)\s*(?:-\s*(\d{1,2}(?:\.\d+)?))?\s*%/g)].map((m) => Number(m[2] ?? m[1]));
  if (rates.length && Math.min(...rates) <= 30) return "high";
  if (/highly selective|very selective|top[- ]tier/.test(t)) return "high";
  if (/selective|refereed|peer|competitive|review|curated|editorial/.test(t)) return "moderate";
  return "unknown";
}

// ---------- Layer B: per-criterion rollup ----------

/** Final-merits leverage weight per criterion id. */
export const CRITERION_WEIGHT: Record<number, number> = { 1: 0.85, 2: 0.6, 3: 0.9, 4: 0.5, 5: 1.0, 6: 0.6, 7: 0.3, 8: 0.8, 9: 0.6, 10: 0.3 };
export const DEFAULT_FLOOR = 50;
export const CRITERION_FLOOR: Record<number, number> = { 4: 40, 5: 65 };
export const floorFor = (id: number) => CRITERION_FLOOR[id] ?? DEFAULT_FLOOR;
export const weightFor = (id: number) => CRITERION_WEIGHT[id] ?? 0.5;

/** One completed piece of evidence, already scored by Layer A. */
export interface RubricItem {
  criterionIds: number[];
  score: number; // Layer A 0-100
  independence: Independence;
  thirdPartyProof?: boolean;
  completedOn?: Date | null;
  penalized?: boolean;
}
export interface CriterionRollup {
  id: number;
  count: number;
  best: number;
  strength: number; // best + 0.5*second + 0.25*third, capped 100
  floor: number;
  met: boolean; // some item >= floor
  weight: number;
}

export function criterionStrength(scores: number[]): number {
  const s = [...scores].sort((a, b) => b - a);
  return Math.min(100, (s[0] ?? 0) + 0.5 * (s[1] ?? 0) + 0.25 * (s[2] ?? 0));
}

export function rollupCriteria(items: RubricItem[]): CriterionRollup[] {
  const by = new Map<number, number[]>();
  for (const it of items) for (const id of new Set(it.criterionIds)) (by.get(id) ?? by.set(id, []).get(id)!).push(it.score);
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, scores]) => ({
      id,
      count: scores.length,
      best: Math.max(...scores),
      strength: Math.round(criterionStrength(scores)),
      floor: floorFor(id),
      met: scores.some((s) => s >= floorFor(id)),
      weight: weightFor(id),
    }));
}

// ---------- Layer C: readiness ----------

export type ReadinessTier = "not_ready" | "meets_weak_merits" | "competitive" | "strong";
export const GATE1_MIN = 3;
export const COMPETITIVE_MIN = 40; // gate 2 >= this: competitive
export const STRONG_MIN = 60; // gate 2 >= this (+ >=4 criteria, indep ratio >= 0.6): strong
export const STRONG_INDEPENDENCE = 0.6;
/** Buildable-from-zero criteria that need independent impact evidence to carry gate 2. */
export const BUILDABLE_LOW_MERIT = [4, 5, 6] as const;

export interface ReadinessWarning {
  code: "need_criteria" | "weak_merits" | "low_independence" | "buildable_no_impact" | "penalized_items" | "stale_evidence";
  message: string;
  criterionId?: number;
}
export interface Readiness {
  tier: ReadinessTier;
  gate1: { met: number; required: number; pass: boolean; criteria: number[] };
  gate2: { score: number; raw: number; recencyFactor: number; independenceFactor: number }; // score 0-100
  independenceRatio: number; // 0-1 (independent=1, mixed=0.5, interested=0)
  recencyFactor: number; // 0.6-1
  criteria: CriterionRollup[];
  warnings: ReadinessWarning[];
}

/** <=2y 1.0, <=5y 0.85, older 0.6, undated 0.8. */
export function recencyOf(d: Date | null | undefined, now = new Date()): number {
  if (!d) return 0.8;
  const yrs = (now.getTime() - d.getTime()) / (365.25 * 86400000);
  return yrs <= 2 ? 1 : yrs <= 5 ? 0.85 : 0.6;
}
const indepValue = (i: Independence) => (i === "independent" ? 1 : i === "mixed" ? 0.5 : 0);

export function computeReadiness(items: RubricItem[], now = new Date()): Readiness {
  const criteria = rollupCriteria(items);
  const met = criteria.filter((c) => c.met);
  const metIds = new Set(met.map((c) => c.id));
  // Items that support at least one met criterion drive the portfolio factors.
  const counted = items.filter((it) => it.criterionIds.some((id) => metIds.has(id)));
  const independenceRatio = counted.length ? counted.reduce((a, it) => a + indepValue(it.independence), 0) / counted.length : 0;
  const recencyFactor = counted.length ? counted.reduce((a, it) => a + recencyOf(it.completedOn, now), 0) / counted.length : 0;
  const independenceFactor = 0.6 + 0.4 * independenceRatio;

  const wsum = met.reduce((a, c) => a + c.weight, 0);
  const raw = wsum ? met.reduce((a, c) => a + c.strength * c.weight, 0) / wsum : 0;
  const score = Math.round(raw * recencyFactor * independenceFactor);

  const pass = met.length >= GATE1_MIN;
  let tier: ReadinessTier = "not_ready";
  if (pass) {
    tier =
      score >= STRONG_MIN && met.length >= 4 && independenceRatio >= STRONG_INDEPENDENCE ? "strong" : score >= COMPETITIVE_MIN ? "competitive" : "meets_weak_merits";
  }

  const warnings: ReadinessWarning[] = [];
  if (!pass) warnings.push({ code: "need_criteria", message: `${GATE1_MIN - met.length} more criteria must clear their quality floor (gate 1).` });
  if (tier === "meets_weak_merits")
    warnings.push({ code: "weak_merits", message: "Meets 3+ criteria but final-merits proxy is low (Amin risk): improve evidence quality, not criteria count." });
  if (counted.length && independenceRatio < 0.5)
    warnings.push({ code: "low_independence", message: "Less than half of the evidence is independent; add disinterested third-party corroboration." });
  for (const id of BUILDABLE_LOW_MERIT) {
    if (!metIds.has(id)) continue;
    const impact = items.some((it) => it.criterionIds.includes(id) && it.independence === "independent" && it.thirdPartyProof);
    if (!impact)
      warnings.push({ code: "buildable_no_impact", criterionId: id, message: `Criterion ${id} is buildable from zero but scores low on final merits without independent impact evidence (benchmarked citations, external adopters, standards incorporation).` });
  }
  const pen = counted.filter((it) => it.penalized).length;
  if (pen) warnings.push({ code: "penalized_items", message: `${pen} counted item(s) carry disqualifiers (pay-to-publish, invitation without completion, employer-only, advertorial, routine duty).` });
  if (counted.length && recencyFactor < 0.8) warnings.push({ code: "stale_evidence", message: "Much of the evidence is older than 2 years; acclaim must be sustained and recent." });

  return {
    tier,
    gate1: { met: met.length, required: GATE1_MIN, pass, criteria: met.map((c) => c.id) },
    gate2: { score, raw: Math.round(raw), recencyFactor, independenceFactor },
    independenceRatio,
    recencyFactor,
    criteria,
    warnings,
  };
}

// ---------- Combined leverage & brand estimate ----------

/** Combined leverage 0-100 = brand impact (0-100) x final-merits weight (0-1). */
export function leverage(brand: number, meritsWeight: number): number {
  const b = Math.max(0, Math.min(100, brand));
  const w = Math.max(0, Math.min(1, meritsWeight));
  return Math.round(b * w);
}
/** Leverage using the heaviest-weighted criterion of an opportunity. */
export function opportunityLeverage(brand: number, criterionIds: number[]): number {
  return leverage(brand, criterionIds.length ? Math.max(...criterionIds.map(weightFor)) : 0);
}

/**
 * Default brand-impact heuristic (when pursuit.brandScore is null): base by opportunity type
 * (public, shareable, audience-facing activity scores high; behind-the-scenes judging/membership low),
 * scaled by venue prestige (x0.6..1.0; pay-to-play x0.4). Unknown type falls back to the
 * best criterion base, else 40.
 */
export const BRAND_BASE_BY_TYPE: Record<string, number> = {
  give_talk: 75, press_mention: 75, submit_cfp: 65, publish_article: 65, oss_contribution: 60,
  award_entry: 55, standards_role: 40, patent: 30, judge_award: 35, judge_pc: 30, judge_review: 25, membership: 25,
};
export const BRAND_BASE_BY_CRITERION: Record<number, number> = { 1: 55, 2: 25, 3: 75, 4: 30, 5: 60, 6: 65, 7: 75, 8: 40, 9: 10, 10: 20 };
export function estimateBrandScore(o: { type?: string | null; criterionIds?: number[]; prestige?: PrestigeTier }): number {
  let base = o.type ? BRAND_BASE_BY_TYPE[o.type] : undefined;
  if (base === undefined) base = o.criterionIds?.length ? Math.max(...o.criterionIds.map((c) => BRAND_BASE_BY_CRITERION[c] ?? 40)) : 40;
  const p = o.prestige ?? "recognized";
  const scale = p === "pay_to_play" ? 0.4 : 0.6 + 0.4 * (PRESTIGE_SCORE[p] / 100);
  return Math.round(base * scale);
}

// ---------- DB-shape mapping ----------

type PursuitRow = Pick<Pursuit, "criterionIds" | "invitationProof" | "completionProof" | "thirdPartyProof" | "independence" | "brandScore" | "completedOn">;
type OppRow = Pick<Opportunity, "type" | "criterionIds">;
type VenueRow = Pick<Venue, "qualityTier" | "avoidFlag" | "prestige" | "independenceHint" | "selectivity" | "kind" | "cost"> | null;

export interface PursuitScores {
  criterionIds: number[]; // pursuit-level overrides opportunity-level
  strength: StrengthResult;
  independence: Independence;
  brand: number; // 0-100 (stored or estimated)
  brandEstimated: boolean;
  leverage: number; // brand x heaviest criterion weight
  item: RubricItem;
}

/** Pursuit independence; the "mixed" default yields to the venue's independenceHint when set. */
export function effectiveIndependence(pursuitIndependence: string, venueHint: string | null | undefined): Independence {
  const p: Independence = isOneOf(INDEPENDENCE, pursuitIndependence) ? pursuitIndependence : "mixed";
  if (p === "mixed" && isOneOf(INDEPENDENCE, venueHint)) return venueHint;
  return p;
}

/** Score one pursuit (+opportunity+venue). Advertorial/routine-duty/employer flags are not stored; pass via flags. */
export function pursuitStrengthScore(pursuit: PursuitRow, opportunity: OppRow, venue: VenueRow, flags?: DisqualifierFlags): PursuitScores {
  const own = parseIntArray(pursuit.criterionIds);
  const criterionIds = own.length ? own : parseIntArray(opportunity.criterionIds);
  const prestige = derivePrestige(venue);
  const independence = effectiveIndependence(pursuit.independence, venue?.independenceHint);
  const strength = opportunityStrength({
    prestige,
    independence,
    proofs: { invitation: pursuit.invitationProof, completion: pursuit.completionProof, thirdParty: pursuit.thirdPartyProof },
    selectivity: deriveSelectivity(venue?.selectivity),
    flags,
  });
  const brandEstimated = pursuit.brandScore == null;
  const brand = pursuit.brandScore ?? estimateBrandScore({ type: opportunity.type, criterionIds, prestige });
  return {
    criterionIds,
    strength,
    independence,
    brand,
    brandEstimated,
    leverage: opportunityLeverage(brand, criterionIds),
    item: { criterionIds, score: strength.score, independence, thirdPartyProof: pursuit.thirdPartyProof, completedOn: pursuit.completedOn, penalized: strength.penalized },
  };
}

/** Readiness from completed, non-avoid pursuits in the DB. */
export async function getReadiness(now = new Date()): Promise<Readiness> {
  const rows = await db.pursuit.findMany({ where: { state: "completed" }, include: { opportunity: { include: { venue: true } } } });
  const items = rows.filter((r) => !r.opportunity.venue?.avoidFlag).map((r) => pursuitStrengthScore(r, r.opportunity, r.opportunity.venue).item);
  return computeReadiness(items, now);
}
