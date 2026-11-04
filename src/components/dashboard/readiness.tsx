import clsx from "clsx";
import type { Readiness, ReadinessTier } from "@/lib/rubric";

const TIER: Record<ReadinessTier, { label: string; cls: string }> = {
  not_ready: { label: "Not ready", cls: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100" },
  meets_weak_merits: { label: "Meets criteria, weak merits", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  competitive: { label: "Competitive", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100" },
  strong: { label: "Strong", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" },
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

/** Gate 1 + Gate 2 + tier + independence ratio + rubric warnings. */
export function ReadinessPanel({ r }: { r: Readiness }) {
  const t = TIER[r.tier];
  const ind = Math.round(r.independenceRatio * 100);
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Petition readiness</h2>
        <span className={clsx("rounded px-2 py-0.5 text-xs font-medium", t.cls)}>{t.label}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Gate 1 - criteria met (quality floor)" value={`${r.gate1.met} / ${r.gate1.required}`} sub={r.gate1.pass ? "Passed" : "Not yet"} />
        <Stat label="Gate 2 - final-merits proxy" value={`${r.gate2.score}`} sub={`of 100 - competitive at 40, strong at 60`} />
        <Stat label="Independence ratio" value={`${ind}%`} sub="share of counted evidence that is disinterested (strong at 60%+)" />
      </div>
      {r.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          {r.warnings.map((w, i) => (
            <li key={i}>{w.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
