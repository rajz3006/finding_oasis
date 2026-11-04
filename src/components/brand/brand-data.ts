// Pure brand helpers + plan constants (BUILD_PLAN: Brand strategy & channels).
export const CHANNEL_TYPES = ["linkedin", "github", "site", "newsletter", "podcast", "x", "youtube"] as const;

export interface Starter { name: string; type: string; ownership: "owned" | "earned"; stage: string; note: string; kpi: string }

// Sequenced: LinkedIn + GitHub first, YouTube last, X optional.
export const STARTERS: Starter[] = [
  { name: "LinkedIn", type: "linkedin", ownership: "owned", stage: "1 - now", note: "Discovery + inbound; daily 10-15 min, 3-5 posts/wk", kpi: "2,000-5,000 followers; 2-5%+ engagement" },
  { name: "GitHub", type: "github", ownership: "owned", stage: "1 - now", note: "Proof of work; profile README + 1-2 useful repos", kpi: "100-500 followers; one repo >100 stars" },
  { name: "Personal site / blog", type: "site", ownership: "owned", stage: "2 - months 2-3", note: "Durable SEO layer; 1 post per 2-4 wks", kpi: "12+ long-form pieces; name on Google p.1" },
  { name: "Newsletter", type: "newsletter", ownership: "owned", stage: "3 - once monthly long-form exists", note: "Highest-ownership audience; 1 issue per 1-2 wks", kpi: "300-1,000 subscribers; 12+ issues" },
  { name: "Podcasts (guest)", type: "podcast", ownership: "earned", stage: "4 - once you have a POV", note: "Borrowed audience; pitch a contrarian angle", kpi: "1 pitch per quarter; 1-2/mo later" },
  { name: "Conference talks", type: "podcast", ownership: "earned", stage: "4 - once you have a POV", note: "Authority spike + EB-1A evidence; meetup to regional to national", kpi: "2-4 talks; 3+ external articles" },
  { name: "X / Twitter", type: "x", ownership: "owned", stage: "Optional", note: "Peer credibility; weaker for job inbound", kpi: "500-2,000 followers" },
  { name: "YouTube", type: "youtube", ownership: "owned", stage: "5 - last", note: "Highest effort, highest moat; invest last", kpi: "n/a (invest last)" },
];

export const KPI_BY_TYPE: Record<string, string> = {
  linkedin: "Year-1: 2,000-5,000 followers; 2-5%+ engagement; 150+ posts",
  github: "Year-1: 100-500 followers; one repo >100 stars",
  site: "Year-1: 12+ long-form; name on Google p.1",
  newsletter: "Year-1: 300-1,000 subscribers; 12+ issues",
  x: "Year-1: 500-2,000 followers",
  podcast: "Year-1: 2-4 talks; 3+ external articles; 1-2 inbound/mo overall",
  youtube: "Invest last; no year-1 target",
};

export const DEFAULT_CADENCE = [
  "Daily: 10-15 min on LinkedIn (comments build network faster than posts early).",
  "Weekly: 2-3 hrs - one substantial post + ship something to GitHub.",
  "Monthly: one pillar asset, then atomize into 8+ pieces.",
  "Quarterly: one talk proposal + one podcast pitch.",
].join("\n");

export const MAX_PILLARS = 3;

type Bucket = "craft" | "opinion" | "building";
const BUCKETS: Record<Bucket, { label: string; re: RegExp }> = {
  craft: { label: "Craft", re: /craft|architect|cost|reliab|model|pipeline|engineer|quality|contract|performance|design/i },
  opinion: { label: "Opinion", re: /opinion|build.?vs|buy|take|product|strategy|contrarian|future|leader|why/i },
  building: { label: "Building in public", re: /public|ship|journey|lesson|mistake|learn|behind|diary|log/i },
};

/** Light heuristic: which of craft / opinion / building-in-public do the pillars cover? */
export function pillarBalance(pillars: string[]) {
  const covered = new Set<Bucket>();
  for (const p of pillars) for (const k of Object.keys(BUCKETS) as Bucket[]) if (BUCKETS[k].re.test(p)) covered.add(k);
  const missing = (Object.keys(BUCKETS) as Bucket[]).filter((k) => !covered.has(k)).map((k) => BUCKETS[k].label);
  return { covered: [...covered].map((k) => BUCKETS[k].label), missing };
}

export interface Pt { date: Date; followers: number; impressions: number; engagementRate: number; inboundCount: number }

/** Latest vs previous deltas (null when fewer than two points). */
export function deltas(pts: Pt[]) {
  if (pts.length < 2) return null;
  const a = pts[pts.length - 1], b = pts[pts.length - 2];
  return {
    followers: a.followers - b.followers,
    impressions: a.impressions - b.impressions,
    engagementRate: Math.round((a.engagementRate - b.engagementRate) * 100) / 100,
    inboundCount: a.inboundCount - b.inboundCount,
  };
}

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Inline SVG sparkline path points. */
export function sparkPoints(values: number[], w = 120, h = 28): string {
  if (values.length < 2) return "";
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  return values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`).join(" ");
}
