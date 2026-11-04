import type { ScoreView } from "@/lib/pursuit-input";
import { label } from "./index";

/** Two independent scores, never merged: Brand impact and EB-1A evidentiary strength (Layer A). */
export function ScorePanel({ s }: { s: ScoreView }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-label="Dual scores">
      <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Brand impact</div>
        <div className="text-2xl font-semibold">{s.brand}<span className="text-sm text-zinc-500">/100</span></div>
        <div className="text-xs text-zinc-500">{s.brandEstimated ? "estimated (type x venue prestige)" : "set manually"}</div>
      </div>
      <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">EB-1A evidentiary strength</div>
        <div className="text-2xl font-semibold">{s.eb1a}<span className="text-sm text-zinc-500">/100</span></div>
        <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-zinc-600 dark:text-zinc-400">
          {Object.entries(s.factors).map(([k, v]) => <li key={k}>{label(k)}: {v}</li>)}
          <li>independence: {s.independence}</li>
        </ul>
        {s.penalties.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-red-700 dark:text-red-400">
            {s.penalties.map((x) => <li key={x}>0.3x penalty: {x}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
