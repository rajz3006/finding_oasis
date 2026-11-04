import Link from "next/link";
import type { NearestWin } from "@/lib/coverage";

export function NearestWins({ wins, names }: { wins: NearestWin[]; names: Record<number, string> }) {
  if (!wins.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">Nearest wins</h2>
      <p className="mb-2 text-xs text-zinc-500">Ranked by combined leverage = brand impact x EB-1A merits weight.</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {wins.map((w) => (
          <li key={w.criterionId} className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="text-xs text-zinc-500">
              Criterion {w.criterionId} - {names[w.criterionId]} ({w.count === 0 ? "none yet" : "thin"})
            </div>
            {w.opportunity ? (
              <div className="mt-1">
                <Link href={`/opportunities?criterion=${w.criterionId}`} className="font-medium underline">
                  {w.opportunity.title}
                </Link>
                <div className="text-zinc-500">
                  {w.opportunity.venueTier}
                  {w.opportunity.deadline ? ` - due ${w.opportunity.deadline.toISOString().slice(0, 10)}` : " - no deadline listed"}
                </div>
                {w.scores && (
                  <div className="mt-1 flex gap-3 text-xs">
                    <span title="Estimated brand impact">Brand {w.scores.brand}</span>
                    <span title="EB-1A final-merits weight of this criterion">EB-1A {Math.round(w.scores.meritsWeight * 100)}</span>
                    <span className="font-semibold" title="Brand x merits weight">Leverage {w.scores.leverage}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 text-zinc-500">No open opportunity in the catalog yet.</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
