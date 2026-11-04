import type { CoverageSummary } from "@/lib/coverage";

export function Headline({ s }: { s: CoverageSummary }) {
  const pct = Math.min(100, (s.met / 10) * 100);
  const msg =
    s.met >= s.comfortable
      ? "Comfortable margin above the threshold."
      : s.met >= s.target
        ? `Target reached - ${s.toComfortable} more for a comfortable margin of ${s.comfortable}.`
        : `${s.toTarget} more to reach the minimum of ${s.target}; aim for ${s.comfortable} for a comfortable margin.`;
  return (
    <section className="mb-6">
      <h2 className="text-xl font-semibold">
        You meet {s.met} of 10 - {s.strong} with strong evidence
      </h2>
      <div className="relative mt-3 h-3 rounded bg-zinc-200 dark:bg-zinc-800">
        <div className="h-3 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 h-5 w-0.5 bg-zinc-900 dark:bg-zinc-100" style={{ left: `${s.target * 10}%` }} title="Target: 3" />
      </div>
      <p className="mt-2 text-sm text-zinc-500">Target line at {s.target}. {msg}</p>
    </section>
  );
}
