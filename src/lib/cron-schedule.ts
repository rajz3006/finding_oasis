// Shared cadence for scripts/cron.ts (node-cron) and the Vercel dispatcher. Keep imports relative (tsx).
export interface Cadence {
  /** node-cron expression, used by `npm run cron`. */
  expr: string;
  /** Minimum days between runs, used by the Vercel dispatcher. */
  everyDays: number;
}

export const SCHEDULE: Record<string, Cadence> = {
  "developers.events": { expr: "0 6 * * 1", everyDays: 7 },
  OpenAlex: { expr: "15 6 * * 1", everyDays: 7 },
  Crossref: { expr: "30 6 * * 1", everyDays: 7 },
  DOAJ: { expr: "45 6 1 * *", everyDays: 30 },
  GitHub: { expr: "0 7 * * *", everyDays: 1 },
  arXiv: { expr: "20 7 * * 2", everyDays: 7 },
  "NSF Awards": { expr: "40 7 1 * *", everyDays: 30 },
  GDELT: { expr: "0 8 * * 3", everyDays: 7 },
  "Google Alerts": { expr: "0 9 * * *", everyDays: 1 },
  "GitHub Profile": { expr: "10 7 * * *", everyDays: 1 },
  "Site Analytics": { expr: "20 7 * * *", everyDays: 1 },
  "Newsletter RSS": { expr: "30 7 * * 1", everyDays: 7 },
};

export interface SourceState {
  name: string;
  lastRun: Date | null;
  /** Last run failed or stopped at its time budget: retry on the next dispatch. */
  needsRetry?: boolean;
}

const DAY = 86_400_000;
/** Cron fires drift by up to an hour on Hobby; don't let that push a source a whole day late. */
const SLACK_MS = 2 * 3_600_000;

/** Sources due now, most overdue first (never-run first). Pure. */
export function selectDue(states: SourceState[], now: Date, schedule: Record<string, Cadence> = SCHEDULE): string[] {
  const due: { name: string; overdue: number }[] = [];
  for (const s of states) {
    const c = schedule[s.name];
    if (!c) continue;
    if (!s.lastRun) {
      due.push({ name: s.name, overdue: Infinity });
      continue;
    }
    const age = now.getTime() - s.lastRun.getTime();
    const interval = c.everyDays * DAY;
    if (s.needsRetry && age >= DAY - SLACK_MS) due.push({ name: s.name, overdue: age / interval });
    else if (age >= interval - SLACK_MS) due.push({ name: s.name, overdue: age / interval });
  }
  // Stable by name among ties so the order is deterministic.
  return due.sort((a, b) => (b.overdue === a.overdue ? a.name.localeCompare(b.name) : b.overdue - a.overdue)).map((d) => d.name);
}
