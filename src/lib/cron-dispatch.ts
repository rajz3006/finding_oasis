import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { ensureSeeded } from "@/lib/seed";
import { runConnector, BUDGET_RESERVE_MS } from "@/lib/connectors/runner";
import { selectDue } from "@/lib/cron-schedule";
import type { RunResult } from "@/lib/connectors/types";

/** Keep in sync with `maxDuration` in the cron route (60s Hobby) minus headroom. */
export const DEFAULT_BUDGET_MS = 50_000;

export interface DispatchResult {
  due: string[];
  ran: RunResult[];
  /** Due but not started (no time left); picked up on the next dispatch. */
  deferred: string[];
}

/** Run due sources one after another within the time budget. */
export async function dispatchDue(budgetMs = DEFAULT_BUDGET_MS, now = new Date()): Promise<DispatchResult> {
  const deadline = Date.now() + budgetMs;
  await ensureSeeded();
  const rows = await db.source.findMany({ select: { name: true, lastRun: true, config: true } });
  const due = selectDue(
    rows.map((r) => {
      const cfg = parseJson<{ status?: string; partial?: boolean }>(r.config, {});
      return { name: r.name, lastRun: r.lastRun, needsRetry: cfg.status === "error" || cfg.partial === true };
    }),
    now,
  );
  const ran: RunResult[] = [];
  const deferred: string[] = [];
  for (const name of due) {
    if (Date.now() + BUDGET_RESERVE_MS > deadline) deferred.push(name);
    else ran.push(await runConnector(name, { deadline }));
  }
  return { due, ran, deferred };
}
