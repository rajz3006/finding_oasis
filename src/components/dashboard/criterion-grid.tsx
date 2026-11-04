import Link from "next/link";
import clsx from "clsx";
import type { CriterionCoverage } from "@/lib/coverage";

// Role of each criterion for final merits (BUILD_PLAN rubric).
const ROLE: Record<number, { label: string; cls: string }> = {
  4: { label: "entry", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200" },
  6: { label: "entry", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200" },
  5: { label: "merits-mover", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100" },
  3: { label: "merits-mover", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100" },
  8: { label: "merits-mover", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100" },
};

export type TileItem = CriterionCoverage & { name: string; quality?: { strength: number; floor: number; met: boolean } };

const BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  thin: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
};

export function CriterionGrid({ items }: { items: TileItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/opportunities?criterion=${c.id}`}
          className={clsx(
            "block rounded border p-3 hover:shadow",
            c.met
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
              : "border-zinc-200 dark:border-zinc-800",
          )}
        >
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Criterion {c.id}</span>
            <span className={clsx("font-medium", c.met ? "text-emerald-700 dark:text-emerald-300" : "")}>
              {c.met ? "Met" : "Not met"}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium leading-snug">{c.name}</div>
          {ROLE[c.id] && <span className={clsx("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]", ROLE[c.id].cls)}>{ROLE[c.id].label}</span>}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-2xl font-semibold">{c.count}</span>
            <span className="text-zinc-500">completed</span>
            {c.strength && <span className={clsx("ml-auto rounded px-2 py-0.5 text-xs", BADGE[c.strength])}>{c.strength}</span>}
          </div>
          <div className="mt-1 text-xs text-zinc-500" title="Layer B: best + 0.5 x second + 0.25 x third (0-100)">
            {c.quality ? (
              <>Quality {c.quality.strength}/100 {c.quality.met ? "- clears" : "- below"} floor {c.quality.floor}</>
            ) : (
              "Quality -"
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
