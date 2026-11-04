import clsx from "clsx";
import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
export const btnCls =
  "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
export const btnPrimaryCls =
  "rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", className ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")}>
      {children}
    </span>
  );
}

const TIER_CLS: Record<string, string> = {
  T1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  T2: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  T3: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  curated: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  unrated: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};
export const TierBadge = ({ tier }: { tier: string }) => <Badge className={TIER_CLS[tier] ?? TIER_CLS.unrated}>{tier}</Badge>;

export const AvoidBadge = () => (
  <Badge className="bg-red-600 text-white">AVOID: pay-to-play / low quality</Badge>
);

export const Pill = ({ children }: { children: ReactNode }) => <Badge>{children}</Badge>;

export function fmtDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}
export const dateInputValue = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const label = (s: string) => s.replace(/_/g, " ");

export function Field({ label: l, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{l}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function CriteriaChecks({ selected, name = "criterionIds" }: { selected: number[]; name?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <label key={n} className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700">
          <input type="checkbox" name={name} value={n} defaultChecked={selected.includes(n)} /> {n}
        </label>
      ))}
    </div>
  );
}
