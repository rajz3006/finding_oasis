import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { AvoidBadge, Badge, Pill, TierBadge, btnCls, btnPrimaryCls, fmtDate, inputCls, label } from "@/components/ui";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { EFFORTS, OPP_TYPES, QUALITY_TIERS, isOneOf } from "@/lib/enums";
import { parseIntArray } from "@/lib/json";
import { derivePrestige, estimateBrandScore, opportunityLeverage, weightFor } from "@/lib/rubric";
import { shortlist } from "./actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TIER_RANK: Record<string, number> = { T1: 0, T2: 1, curated: 2, T3: 3, unrated: 4 };
const WINDOWS = { "7": "next 7 days", "30": "next 30 days", "90": "next 90 days", none: "no deadline" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await ensureSeeded();
  const sp = await searchParams;
  const criterion = Number(one(sp.criterion)) || null;
  const type = one(sp.type);
  const tier = one(sp.tier);
  const effort = one(sp.effort);
  const win = one(sp.window);
  const sort = one(sp.sort) === "leverage" ? "leverage" : "";
  const hideAvoid = one(sp.hideAvoid) === "1";

  const where: Prisma.OpportunityWhereInput = {};
  if (isOneOf(OPP_TYPES, type)) where.type = type;
  if (isOneOf(EFFORTS, effort)) where.effort = effort;
  if (isOneOf(QUALITY_TIERS, tier)) where.venue = { qualityTier: tier };
  if (hideAvoid) where.NOT = { venue: { avoidFlag: true } };
  const now = new Date();
  if (win === "none") where.deadline = null;
  else if (win in WINDOWS) where.deadline = { gte: now, lte: new Date(now.getTime() + Number(win) * 864e5) };

  let rows = await db.opportunity.findMany({
    where,
    include: { venue: true, pursuits: { where: { state: { not: "dropped" } }, select: { id: true, state: true } } },
  });
  if (criterion) rows = rows.filter((o) => parseIntArray(o.criterionIds).includes(criterion));
  // High tier first, avoid-flagged last, then nearest deadline (no deadline last).
  const key = (o: (typeof rows)[number]) => (o.venue?.avoidFlag ? 10 : 0) + (TIER_RANK[o.venue?.qualityTier ?? "unrated"] ?? 4);
  const lev = new Map(rows.map((o) => {
    const ids = parseIntArray(o.criterionIds);
    const brand = estimateBrandScore({ type: o.type, criterionIds: ids, prestige: derivePrestige(o.venue) });
    return [o.id, { brand, w: ids.length ? Math.max(...ids.map(weightFor)) : 0, v: opportunityLeverage(brand, ids) }] as const;
  }));
  if (sort === "leverage") rows.sort((a, b) => lev.get(b.id)!.v - lev.get(a.id)!.v || key(a) - key(b));
  else rows.sort((a, b) => key(a) - key(b) || (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity));

  return (
    <>
      <PageHeader title="Opportunities">{rows.length} shown.</PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/opportunities/new" className={btnPrimaryCls}>Add opportunity</Link>
        <Link href="/opportunities/achievement" className={btnCls}>Add achievement</Link>
        <Link href="/opportunities/venues" className={btnCls}>Venues</Link>
      </div>
      <form className="mb-6 flex flex-wrap items-end gap-2 text-sm">
        <Sel name="criterion" value={String(criterion ?? "")} opts={Array.from({ length: 10 }, (_, i) => [String(i + 1), `Criterion ${i + 1}`])} any="Any criterion" />
        <Sel name="type" value={type} opts={OPP_TYPES.map((t) => [t, label(t)])} any="Any type" />
        <Sel name="tier" value={tier} opts={QUALITY_TIERS.map((t) => [t, t])} any="Any tier" />
        <Sel name="window" value={win} opts={Object.entries(WINDOWS)} any="Any deadline" />
        <Sel name="effort" value={effort} opts={EFFORTS.map((t) => [t, t])} any="Any effort" />
        <select name="sort" defaultValue={sort} className={inputCls + " !w-auto"}>
          <option value="">Sort: tier / deadline</option>
          <option value="leverage">Sort: leverage</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" name="hideAvoid" value="1" defaultChecked={hideAvoid} /> Hide avoid</label>
        <button className={btnCls}>Filter</button>
        <Link href="/opportunities" className="px-2 py-1.5 underline">Reset</Link>
      </form>
      {rows.length === 0 && <p className="text-sm text-zinc-500">No opportunities match. Add one manually or loosen the filters.</p>}
      <ul className="space-y-2">
        {rows.map((o) => {
          const crit = parseIntArray(o.criterionIds);
          const active = o.pursuits[0];
          const past = o.deadline && o.deadline < now;
          return (
            <li key={o.id} className={`rounded border p-3 ${o.venue?.avoidFlag ? "border-red-400 bg-red-50 dark:bg-red-950" : "border-zinc-200 dark:border-zinc-800"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/opportunities/${o.id}`} className="font-medium hover:underline">{o.title}</Link>
                {o.venue && <TierBadge tier={o.venue.qualityTier} />}
                {o.venue?.avoidFlag && <AvoidBadge />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                {o.venue && <span>{o.venue.name}</span>}
                <Pill>{label(o.type)}</Pill>
                {crit.map((c) => <Badge key={c} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">C{c}</Badge>)}
                <span className={past ? "text-red-600" : ""}>Deadline: {fmtDate(o.deadline)}{past ? " (past)" : ""}</span>
                <span>Effort: {o.effort}</span>
                <span title="Brand estimate x EB-1A criterion weight">Leverage ~{lev.get(o.id)!.v} (brand {lev.get(o.id)!.brand} x {lev.get(o.id)!.w})</span>
                <span>{o.statusCatalog}</span>
                {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="underline">link</a>}
                <span className="ml-auto">
                  {active ? (
                    <Link href="/pipeline" className="underline">In pipeline: {active.state}</Link>
                  ) : (
                    <form action={shortlist}><input type="hidden" name="id" value={o.id} /><button className={btnCls}>Shortlist</button></form>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Sel({ name, value, opts, any }: { name: string; value: string; opts: (readonly string[])[]; any: string }) {
  return (
    <select name={name} defaultValue={value} className={inputCls + " !w-auto"}>
      <option value="">{any}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
