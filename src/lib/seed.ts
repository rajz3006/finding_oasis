import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { serializeStringArray, toJson } from "./json";
import type { SourceAccess } from "./enums";
import { seedVenues } from "./venue-seed";

interface CriterionSeed {
  id: number;
  name: string;
  buildable?: boolean;
  active?: boolean;
  proofChecklist?: string[];
}

export const SOURCE_SEEDS: { name: string; access: SourceAccess }[] = [
  { name: "manual", access: "manual" },
  { name: "developers.events", access: "api" },
  { name: "OpenAlex", access: "api" },
  { name: "Crossref", access: "api" },
  { name: "DOAJ", access: "api" },
  { name: "GitHub", access: "api" },
  { name: "ORCID", access: "api" },
  { name: "Semantic Scholar", access: "api" },
  { name: "PatentsView", access: "api" },
  { name: "arXiv", access: "api" },
  { name: "NSF Awards", access: "api" },
  { name: "GDELT", access: "api" },
  { name: "Google Alerts", access: "api" },
  { name: "GitHub Profile", access: "api" },
  { name: "Site Analytics", access: "api" },
  { name: "Newsletter RSS", access: "api" },
];

export async function seedCriteria(): Promise<number> {
  const file = path.join(process.cwd(), "seed", "criteria.json");
  const rows = JSON.parse(await fs.readFile(file, "utf8")) as CriterionSeed[];
  for (const c of rows) {
    const data = {
      name: c.name,
      proofChecklist: serializeStringArray(c.proofChecklist ?? []),
      buildable: c.buildable ?? false,
      active: c.active ?? true,
    };
    await db.criterion.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  }
  return rows.length;
}

export async function seedSources(): Promise<number> {
  for (const s of SOURCE_SEEDS) {
    // Do not overwrite lastRun/config on re-seed.
    await db.source.upsert({
      where: { name: s.name },
      create: { name: s.name, access: s.access, config: toJson({}) },
      update: { access: s.access },
    });
  }
  return SOURCE_SEEDS.length;
}

export async function seedAll() {
  const criteria = await seedCriteria();
  const sources = await seedSources();
  const v = await seedVenues();
  return { criteria, sources, venues: v.venues, opportunities: v.opportunities };
}

// Shared via globalThis: Next may bundle this module once per route.
const gs = globalThis as unknown as { __eb1aSeeded?: Promise<void> | null };
/** Seed on first use; concurrent callers share one in-flight promise (reset on failure). */
export function ensureSeeded(): Promise<void> {
  gs.__eb1aSeeded ??= (async () => {
    if ((await db.criterion.count()) < 10 || (await db.source.count()) === 0 || (await db.venue.count()) === 0) await seedAll();
  })().catch((e) => {
    gs.__eb1aSeeded = null;
    throw e;
  });
  return gs.__eb1aSeeded;
}

/** Test helper: forget memoized seeding. */
export function resetSeedMemo() {
  gs.__eb1aSeeded = null;
}
