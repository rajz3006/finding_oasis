// Pure recommender-CRM helpers. Not legal advice.
export const fmtDateIso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export interface RecLike {
  independent: boolean;
  status: string;
}
export interface IndependenceSummary {
  total: number;
  independent: number;
  ratio: number; // 0-1, declined excluded
  warn: boolean;
  message: string | null;
}

/** Independence ratio over non-declined recommenders; warn when most (>50%) are non-independent. */
export function independenceSummary(recs: RecLike[]): IndependenceSummary {
  const active = recs.filter((r) => r.status !== "declined");
  const independent = active.filter((r) => r.independent).length;
  const ratio = active.length ? independent / active.length : 0;
  const warn = active.length > 0 && ratio < 0.5;
  return {
    total: active.length,
    independent,
    ratio,
    warn,
    message: warn ? "Most recommenders are coauthors/employer contacts. Independent, disinterested letters carry more weight; add independent experts." : null,
  };
}

/** Next nudge date after marking contacted: now + days. */
export const snoozeDate = (now: Date, days: number) => new Date(now.getTime() + Math.max(1, Math.round(days)) * 86_400_000);

export const NEXT_STATUS: Record<string, string> = { identified: "contacted", contacted: "agreed", agreed: "letter_received" };
