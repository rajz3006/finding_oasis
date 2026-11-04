import { db } from "@/lib/db";
import { parseJson, serializeIntArray, toJson } from "@/lib/json";
import { upsertScoredVenue } from "@/lib/scoring";
import { getProfile } from "@/lib/data/profile";
import { getConnector } from "./registry";
import { timeoutFetch, sleep, DEFAULT_TIMEOUT_MS } from "./http";
import type { RunResult, SourceConfig } from "./types";

/** Time kept free after a throttle wait for one more request plus DB writes. */
export const BUDGET_RESERVE_MS = 8_000;

/**
 * Run one connector by Source name. Never throws; failures are recorded on the Source.
 * `deadline` (epoch ms) is a soft time budget: throttle waits that would overrun it stop the connector
 * early and the partial results are still saved (flagged `partial`).
 */
export async function runConnector(
  sourceName: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; deadline?: number } = {},
): Promise<RunResult> {
  const result: RunResult = { source: sourceName, ok: false, found: 0, created: 0, updated: 0 };
  let sourceId: string | null = null;
  let config: SourceConfig = {};
  try {
    const source = await db.source.findUnique({ where: { name: sourceName } });
    if (!source) throw new Error(`Unknown source "${sourceName}"`);
    sourceId = source.id;
    config = parseJson<SourceConfig>(source.config, {});
    const connector = getConnector(sourceName);
    if (!connector) throw new Error(`No connector registered for "${sourceName}"`);

    const profile = await getProfile();
    const notes: Record<string, unknown> = {};
    const { deadline } = opts;
    // Cap per-request timeout so one slow call can't outlive the budget.
    const timeoutMs = deadline ? Math.max(2_000, Math.min(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, deadline - Date.now() - 1_000)) : opts.timeoutMs;
    const opps = await connector.fetch(config, profile.fieldTags, {
      fetch: timeoutFetch(opts.fetchImpl ?? fetch, timeoutMs),
      profile,
      pause: async (ms) => {
        if (deadline && Date.now() + ms + BUDGET_RESERVE_MS > deadline) {
          result.partial = true;
          return false;
        }
        await sleep(ms);
        return true;
      },
      note: (k, v) => {
        notes[k] = v;
      },
    });
    result.found = opps.length;

    const venueCache = new Map<string, string>();
    for (const o of opps) {
      if (!o.url) continue;
      let venueId: string | undefined;
      if (o.venue) {
        const key = `${o.venue.kind}:${o.venue.name}`;
        venueId = venueCache.get(key);
        if (!venueId) {
          venueId = (await upsertScoredVenue(o.venue)).id;
          venueCache.set(key, venueId);
        }
      }
      const data = {
        title: o.title,
        type: o.type,
        criterionIds: serializeIntArray(o.criterionIds),
        deadline: o.deadline ?? null,
        effort: o.effort ?? "medium",
        statusCatalog: o.deadline ? "open" : "unknown",
        raw: toJson(o.raw),
        venueId: venueId ?? null,
      };
      const where = { sourceId_url: { sourceId: source.id, url: o.url } };
      const existing = await db.opportunity.findUnique({ where, select: { id: true } });
      await db.opportunity.upsert({ where, create: { ...data, sourceId: source.id, url: o.url }, update: data });
      if (existing) result.updated++;
      else result.created++;
    }

    result.ok = true;
    await db.source.update({
      where: { id: source.id },
      data: { lastRun: new Date(), config: toJson({ ...config, status: "ok", lastError: null, partial: result.partial === true, lastCounts: { found: result.found, created: result.created }, ...notes }) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.error = msg;
    console.error(`[connector:${sourceName}] failed:`, msg);
    if (sourceId) {
      // lastRun left untouched so the source reads stale; error kept in config.
      try {
        await db.source.update({ where: { id: sourceId }, data: { config: toJson({ ...config, status: "error", lastError: msg, lastErrorAt: new Date().toISOString() }) } });
      } catch (e2) {
        console.error(`[connector:${sourceName}] could not record failure:`, e2);
      }
    }
  }
  return result;
}

export const STALE_DAYS = 14;

/** Stale if never run, last run failed, or older than 14 days. */
export function sourceHealth(s: { lastRun: Date | null; config: string }, now = new Date()): { stale: boolean; reason?: string; error?: string } {
  const cfg = parseJson<{ status?: string; lastError?: string }>(s.config, {});
  if (cfg.status === "error") return { stale: true, reason: "last run failed", error: cfg.lastError };
  if (!s.lastRun) return { stale: true, reason: "never run" };
  if (now.getTime() - s.lastRun.getTime() > STALE_DAYS * 86_400_000) return { stale: true, reason: `>${STALE_DAYS} days old` };
  return { stale: false };
}

