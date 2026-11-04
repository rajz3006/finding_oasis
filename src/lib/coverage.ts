import { db } from "./db";
import { parseIntArray } from "./json";
import { CRITERION_IDS, type Strength } from "./enums";

export const TARGET = 3;
export const COMFORTABLE = 5;
/** Buildable-from-zero criteria, in priority order. */
export const PRIORITY_CRITERIA = [6, 5, 7, 4, 3] as const;

export interface CoveragePursuit {
  state: string;
  strength: string | null;
  criterionIds: number[]; // pursuit-level; non-empty overrides opportunity's
  opportunityCriterionIds: number[];
  venueAvoid: boolean;
}

export interface CriterionCoverage {
  id: number;
  count: number;
  strongCount: number;
  moderateCount: number;
  thinCount: number;
  strength: Strength | null; // null when count is 0
  met: boolean;
  strong: boolean;
}

export interface CoverageSummary {
  met: number;
  strong: number;
  target: number;
  comfortable: number;
  toTarget: number; // criteria still needed to reach target
  toComfortable: number;
}

export interface Coverage {
  criteria: CriterionCoverage[];
  summary: CoverageSummary;
}

/** Pure: derive per-criterion coverage from pursuits. Only completed, non-avoid pursuits count. */
export function deriveCoverage(pursuits: CoveragePursuit[]): Coverage {
  const criteria: CriterionCoverage[] = CRITERION_IDS.map((id) => ({
    id, count: 0, strongCount: 0, moderateCount: 0, thinCount: 0, strength: null, met: false, strong: false,
  }));
  const byId = new Map(criteria.map((c) => [c.id, c]));

  for (const p of pursuits) {
    if (p.state !== "completed" || p.venueAvoid) continue;
    const ids = p.criterionIds.length ? p.criterionIds : p.opportunityCriterionIds;
    for (const id of new Set(ids)) {
      const c = byId.get(id);
      if (!c) continue;
      c.count++;
      if (p.strength === "strong") c.strongCount++;
      else if (p.strength === "moderate") c.moderateCount++;
      else c.thinCount++; // null strength counts as thin
    }
  }
  for (const c of criteria) {
    c.met = c.count >= 1;
    c.strong = c.strongCount >= 1 || c.moderateCount >= 2;
    c.strength = c.count === 0 ? null : c.strong ? "strong" : c.moderateCount >= 1 ? "moderate" : "thin";
  }
  const met = criteria.filter((c) => c.met).length;
  const strong = criteria.filter((c) => c.strong).length;
  return {
    criteria,
    summary: {
      met, strong, target: TARGET, comfortable: COMFORTABLE,
      toTarget: Math.max(0, TARGET - met), toComfortable: Math.max(0, COMFORTABLE - met),
    },
  };
}

/** DB fetch + derive. */
export async function getCoverage(): Promise<Coverage> {
  const rows = await db.pursuit.findMany({
    where: { state: "completed" },
    include: { opportunity: { include: { venue: true } } },
  });
  return deriveCoverage(
    rows.map((r) => ({
      state: r.state,
      strength: r.strength,
      criterionIds: parseIntArray(r.criterionIds),
      opportunityCriterionIds: parseIntArray(r.opportunity.criterionIds),
      venueAvoid: !!r.opportunity.venue?.avoidFlag,
    })),
  );
}

// ---- nearest wins ----

export interface CandidateOpp {
  id: string;
  title: string;
  type: string;
  criterionIds: number[];
  deadline: Date | null;
  statusCatalog: string;
  venueName: string | null;
  venueTier: string;
  venueAvoid: boolean;
  activePursuit: boolean; // already shortlisted/applied/accepted/completed
}

export interface NearestWin {
  criterionId: number;
  count: number;
  strength: Strength | null;
  opportunity: CandidateOpp | null;
}

const TIER_RANK: Record<string, number> = { T1: 5, T2: 4, curated: 3, T3: 2, unrated: 1 };

/** Pure: best next opportunity for a criterion (highest tier, non-avoid, nearest future deadline). */
export function bestOpportunity(criterionId: number, opps: CandidateOpp[], now = new Date()): CandidateOpp | null {
  const ok = opps.filter(
    (o) =>
      o.criterionIds.includes(criterionId) &&
      !o.venueAvoid &&
      !o.activePursuit &&
      o.statusCatalog !== "closed" &&
      (!o.deadline || o.deadline >= now),
  );
  ok.sort((a, b) => {
    const t = (TIER_RANK[b.venueTier] ?? 0) - (TIER_RANK[a.venueTier] ?? 0);
    if (t) return t;
    const da = a.deadline?.getTime() ?? Infinity;
    const db_ = b.deadline?.getTime() ?? Infinity;
    return da - db_;
  });
  return ok[0] ?? null;
}

/** Pure: buildable criteria (priority order) that are at 0 or thin, each with its best next opportunity. */
export function nearestWins(coverage: Coverage, opps: CandidateOpp[], now = new Date()): NearestWin[] {
  return PRIORITY_CRITERIA.map((id) => coverage.criteria.find((c) => c.id === id)!)
    .filter((c) => c.count === 0 || c.strength === "thin")
    .map((c) => ({ criterionId: c.id, count: c.count, strength: c.strength, opportunity: bestOpportunity(c.id, opps, now) }));
}

export async function getCandidateOpps(): Promise<CandidateOpp[]> {
  const rows = await db.opportunity.findMany({
    include: { venue: true, pursuits: { select: { state: true } } },
  });
  return rows.map((o) => ({
    id: o.id,
    title: o.title,
    type: o.type,
    criterionIds: parseIntArray(o.criterionIds),
    deadline: o.deadline,
    statusCatalog: o.statusCatalog,
    venueName: o.venue?.name ?? null,
    venueTier: o.venue?.qualityTier ?? "unrated",
    venueAvoid: !!o.venue?.avoidFlag,
    activePursuit: o.pursuits.some((p) => p.state !== "dropped"),
  }));
}
