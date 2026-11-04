// Enum values stored as strings in SQLite. Keep in sync with prisma/schema.prisma comments.
export const VENUE_KINDS = ["journal", "conference", "award", "media_outlet", "podcast", "oss_project", "standards_body", "cert_program", "society"] as const;
export const QUALITY_TIERS = ["T1", "T2", "T3", "curated", "unrated"] as const;
export const OPP_TYPES = ["publish_article", "give_talk", "submit_cfp", "judge_review", "judge_pc", "judge_award", "membership", "press_mention", "oss_contribution", "award_entry", "patent", "standards_role"] as const;
export const EFFORTS = ["low", "medium", "high"] as const;
export const CATALOG_STATUSES = ["open", "closed", "rolling", "unknown"] as const;
export const PURSUIT_STATES = ["shortlisted", "applied", "accepted", "completed", "dropped"] as const;
export const STRENGTHS = ["strong", "moderate", "thin"] as const;
export const EVIDENCE_KINDS = ["file", "link", "email", "screenshot", "metric"] as const;
export const SOURCE_ACCESS = ["api", "scrape", "manual"] as const;
export const CHANNEL_TYPES = ["site", "newsletter", "linkedin", "x", "github", "youtube", "podcast"] as const;
export const CHANNEL_OWNERSHIP = ["owned", "earned"] as const;
export const INDEPENDENCE = ["independent", "mixed", "interested"] as const;
export const PRESTIGE = ["flagship", "recognized", "regional", "local"] as const;
export const RECOMMENDER_STATUSES = ["identified", "contacted", "agreed", "letter_received", "declined"] as const;
export const CRITERION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type VenueKind = (typeof VENUE_KINDS)[number];
export type QualityTier = (typeof QUALITY_TIERS)[number];
export type OppType = (typeof OPP_TYPES)[number];
export type Effort = (typeof EFFORTS)[number];
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export type PursuitState = (typeof PURSUIT_STATES)[number];
export type Strength = (typeof STRENGTHS)[number];
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type SourceAccess = (typeof SOURCE_ACCESS)[number];
export type CriterionId = (typeof CRITERION_IDS)[number];
export type ChannelType = (typeof CHANNEL_TYPES)[number];
export type ChannelOwnership = (typeof CHANNEL_OWNERSHIP)[number];
export type Independence = (typeof INDEPENDENCE)[number];
export type Prestige = (typeof PRESTIGE)[number];
export type RecommenderStatus = (typeof RECOMMENDER_STATUSES)[number];

export function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}
