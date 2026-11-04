import Link from "next/link";
import clsx from "clsx";
import type { CriterionCoverage } from "@/lib/coverage";

const BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  thin: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
};

export function CriterionGrid({ items }: { items: (CriterionCoverage & { name: string })[] }) {
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
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-2xl font-semibold">{c.count}</span>
            <span className="text-zinc-500">completed</span>
            {c.strength && <span className={clsx("ml-auto rounded px-2 py-0.5 text-xs", BADGE[c.strength])}>{c.strength}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
