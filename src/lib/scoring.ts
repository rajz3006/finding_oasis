import fs from "node:fs";
import path from "node:path";
import type { Venue } from "@prisma/client";
import { db } from "./db";
import { parseStringArray, serializeStringArray } from "./json";
import { isOneOf, QUALITY_TIERS, type QualityTier } from "./enums";

export interface SeedVenue {
  name: string;
  kind: string;
  qualityTier?: string;
  avoidFlag?: boolean;
  selectivity?: string | null;
  indexing?: string | null;
  cost?: string | null;
  homepage?: string | null;
  fieldTags?: string[];
  criterionIds?: number[];
  aliases?: string[];
  notes?: string | null;
}
interface AvoidList {
  hosts?: string[];
  namePatterns?: string[];
}

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** host without www; and host+path (no trailing slash) for precise matching. */
export function urlKey(u: string | null | undefined): { host: string; full: string } | null {
  if (!u) return null;
  try {
    const x = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const host = x.hostname.replace(/^www\./, "").toLowerCase();
    return { host, full: host + x.pathname.replace(/\/+$/, "").toLowerCase() };
  } catch {
    return null;
  }
}

let cache: { seeds: SeedVenue[]; byName: Map<string, SeedVenue>; byFull: Map<string, SeedVenue>; byHost: Map<string, SeedVenue>; avoid: AvoidList } | null = null;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "seed", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function load() {
  if (cache) return cache;
  const seeds = readJson<SeedVenue[]>("venues.seed.json", []);
  const byName = new Map<string, SeedVenue>();
  const byFull = new Map<string, SeedVenue>();
  const hostCount = new Map<string, number>();
  const hostSeed = new Map<string, SeedVenue>();
  for (const s of seeds) {
    const keys = [s.name, s.name.replace(/\(.*?\)/g, ""), s.name.split(/\s[—-]\s/)[0], ...(s.aliases ?? [])];
    for (const k of keys) {
      const n = normName(k);
      if (n && !byName.has(n)) byName.set(n, s);
    }
    const u = urlKey(s.homepage);
    if (u) {
      byFull.set(u.full, s);
      hostCount.set(u.host, (hostCount.get(u.host) ?? 0) + 1);
      hostSeed.set(u.host, s);
    }
  }
  // Host-only matching is safe only when exactly one seed uses that host.
  const byHost = new Map([...hostSeed].filter(([h]) => hostCount.get(h) === 1));
  cache = { seeds, byName, byFull, byHost, avoid: readJson<AvoidList>("avoid-list.json", {}) };
  return cache;
}

/** Test hook: drop cached seed files. */
export const resetScoringCache = () => {
  cache = null;
};

export function scoreVenue(v: { name: string; kind?: string; homepage?: string | null }): {
  qualityTier: QualityTier;
  avoidFlag: boolean;
  matched: boolean;
} {
  const { byName, byFull, byHost, avoid } = load();
  const u = urlKey(v.homepage);
  const seed = byName.get(normName(v.name)) ?? (u ? byFull.get(u.full) ?? byHost.get(u.host) : undefined);

  let avoidFlag = !!seed?.avoidFlag;
  if (!avoidFlag) {
    const name = v.name.toLowerCase();
    avoidFlag =
      (avoid.namePatterns ?? []).some((p) => {
        try {
          return new RegExp(p, "i").test(name);
        } catch {
          return false;
        }
      }) || (!!u && (avoid.hosts ?? []).some((h) => u.host === h || u.host.endsWith(`.${h}`)));
  }
  const tier = seed?.qualityTier;
  const qualityTier: QualityTier = isOneOf(QUALITY_TIERS, tier) ? tier : "unrated";
  return { qualityTier, avoidFlag, matched: !!seed || avoidFlag };
}

export interface ScoredVenueInput {
  name: string;
  kind: string;
  homepage?: string | null;
  selectivity?: string | null;
  indexing?: string | null;
  cost?: string | null;
  fieldTags?: string[];
  notes?: string | null;
}

/**
 * Find a venue by name (case-insensitive) or create it with seed scoring applied.
 * Existing venues: fill empty fields, merge tags; tier/avoid only change while still
 * "unrated" (never overrides a tier the owner set).
 */
export async function upsertScoredVenue(v: ScoredVenueInput): Promise<Venue> {
  const score = scoreVenue(v);
  const wanted = v.name.trim().toLowerCase();
  const all = await db.venue.findMany({ select: { id: true, name: true } });
  const hit = all.find((x) => x.name.trim().toLowerCase() === wanted);

  if (!hit) {
    return db.venue.create({
      data: {
        name: v.name.trim(),
        kind: v.kind,
        qualityTier: score.qualityTier,
        avoidFlag: score.avoidFlag,
        selectivity: v.selectivity ?? null,
        indexing: v.indexing ?? null,
        cost: v.cost ?? null,
        homepage: v.homepage ?? null,
        fieldTags: serializeStringArray(v.fieldTags ?? []),
        notes: v.notes ?? null,
      },
    });
  }

  const cur = await db.venue.findUniqueOrThrow({ where: { id: hit.id } });
  const triaged = cur.qualityTier !== "unrated";
  const tags = [...new Set([...parseStringArray(cur.fieldTags), ...(v.fieldTags ?? [])])];
  return db.venue.update({
    where: { id: cur.id },
    data: {
      ...(triaged ? {} : { qualityTier: score.qualityTier, avoidFlag: cur.avoidFlag || score.avoidFlag }),
      selectivity: cur.selectivity ?? v.selectivity ?? null,
      indexing: cur.indexing ?? v.indexing ?? null,
      cost: cur.cost ?? v.cost ?? null,
      homepage: cur.homepage ?? v.homepage ?? null,
      notes: cur.notes ?? v.notes ?? null,
      fieldTags: serializeStringArray(tags),
    },
  });
}
