import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { serializeIntArray, serializeStringArray } from "./json";
import { INDEPENDENCE, isOneOf, QUALITY_TIERS } from "./enums";
import type { SeedVenue } from "./scoring";

/** Default starter opportunity (type, title) for a seed venue. Deadlines stay null. */
export function starterOpps(v: SeedVenue): { title: string; type: string; criterionIds: number[]; effort: string }[] {
  const crit = v.criterionIds ?? [];
  const out: { title: string; type: string; criterionIds: number[]; effort: string }[] = [];
  const judging = crit.includes(4);
  const authoring = crit.some((c) => c === 6 || c === 7 || c === 5);
  const own = crit.filter((c) => c !== 4);

  if (authoring || !judging) {
    const byKind: Record<string, { type: string; verb: string }> = {
      journal: { type: "publish_article", verb: "Publish an article in" },
      conference: { type: "submit_cfp", verb: "Submit a talk/paper to" },
      media_outlet: { type: "publish_article", verb: "Write for" },
      oss_project: { type: "oss_contribution", verb: "Contribute to" },
      award: { type: "award_entry", verb: "Enter" },
      podcast: { type: "give_talk", verb: "Appear on" },
      standards_body: { type: "standards_role", verb: "Take a standards role in" },
      society: { type: "membership", verb: "Pursue involvement in" },
      cert_program: { type: "judge_review", verb: "Join" },
    };
    const k = byKind[v.kind] ?? { type: "publish_article", verb: "Pursue" };
    out.push({ title: `${k.verb} ${v.name}`, type: k.type, criterionIds: own.length ? own : crit, effort: "high" });
  }
  if (judging) {
    const type = v.kind === "conference" ? "judge_pc" : v.kind === "award" ? "judge_award" : "judge_review";
    out.push({ title: `Judge/review for ${v.name}`, type, criterionIds: [4], effort: "medium" });
  }
  return out;
}

/** Idempotent: import seed venues (+ avoid flags) and starter opportunities. Never overwrites triaged venues. */
export function seedVenues(): Promise<{ venues: number; opportunities: number }> {
  // Serialize in-process runs so concurrent calls don't duplicate venues.
  const g = globalThis as unknown as { __eb1aVenueSeed?: Promise<unknown> };
  const run = (g.__eb1aVenueSeed ?? Promise.resolve()).catch(() => {}).then(seedVenuesOnce);
  g.__eb1aVenueSeed = run;
  return run;
}

async function seedVenuesOnce(): Promise<{ venues: number; opportunities: number }> {
  const file = path.join(process.cwd(), "seed", "venues.seed.json");
  const rows = JSON.parse(await fs.readFile(file, "utf8")) as SeedVenue[];
  const manual = await db.source.findUnique({ where: { name: "manual" } });
  const existing = await db.venue.findMany();
  const byName = new Map(existing.map((v) => [v.name.trim().toLowerCase(), v]));
  let venues = 0;
  let opportunities = 0;

  for (const s of rows) {
    const tier = isOneOf(QUALITY_TIERS, s.qualityTier) ? s.qualityTier : "unrated";
    const data = {
      name: s.name,
      kind: s.kind,
      qualityTier: tier,
      avoidFlag: !!s.avoidFlag,
      selectivity: s.selectivity ?? null,
      indexing: s.indexing ?? null,
      cost: s.cost ?? null,
      homepage: s.homepage ?? null,
      fieldTags: serializeStringArray(s.fieldTags ?? []),
      notes: s.notes ?? null,
      independenceHint: isOneOf(INDEPENDENCE, s.independenceHint) ? s.independenceHint : null,
    };
    let venue = byName.get(s.name.trim().toLowerCase());
    if (!venue) {
      venue = await db.venue.create({ data });
      byName.set(s.name.trim().toLowerCase(), venue);
      venues++;
    } else if (venue.qualityTier === "unrated" && tier !== "unrated") {
      venue = await db.venue.update({ where: { id: venue.id }, data: { qualityTier: tier, avoidFlag: venue.avoidFlag || !!s.avoidFlag } });
    }
    if (!venue.independenceHint && data.independenceHint) {
      venue = await db.venue.update({ where: { id: venue.id }, data: { independenceHint: data.independenceHint } });
    }

    if (s.avoidFlag) continue; // no starter opportunities on avoid-flagged venues
    for (const [i, o] of starterOpps(s).entries()) {
      const dup = await db.opportunity.findFirst({ where: { venueId: venue.id, title: o.title } });
      if (dup) continue;
      try {
        await db.opportunity.create({
          data: {
            venueId: venue.id,
            title: o.title,
            type: o.type,
            criterionIds: serializeIntArray(o.criterionIds),
            effort: o.effort,
            statusCatalog: "unknown",
            url: i === 0 ? (s.homepage ?? null) : null, // (sourceId,url) is unique
            sourceId: manual?.id ?? null,
            raw: JSON.stringify({ seed: true }),
          },
        });
        opportunities++;
      } catch (e) {
        // Lost a race on (sourceId,url): already seeded.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }
  return { venues, opportunities };
}
