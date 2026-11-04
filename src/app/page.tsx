import { PageHeader } from "@/components/page-header";
import { CriterionGrid } from "@/components/dashboard/criterion-grid";
import { Headline } from "@/components/dashboard/headline";
import { NearestWins } from "@/components/dashboard/nearest-wins";
import { RemindersPanel } from "@/components/dashboard/reminders-panel";
import { ReadinessPanel } from "@/components/dashboard/readiness";
import { BrandGrowth } from "@/components/dashboard/brand-growth";
import { getCandidateOpps, getCoverage, nearestWins } from "@/lib/coverage";
import { getReadiness } from "@/lib/rubric";
import { getBrandGrowth } from "@/lib/brand-growth";
import { getReminders } from "@/lib/reminders";
import { ensureSeeded } from "@/lib/seed";
import { listCriteria } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const [coverage, readiness, criteria, opps, reminders, brand] = await Promise.all([
    getCoverage(), getReadiness(), listCriteria(), getCandidateOpps(), getReminders(), getBrandGrowth(),
  ]);
  const names = Object.fromEntries(criteria.map((c) => [c.id, c.name]));
  const quality = new Map(readiness.criteria.map((c) => [c.id, c]));
  const items = coverage.criteria.map((c) => {
    const q = quality.get(c.id);
    return { ...c, name: names[c.id] ?? `Criterion ${c.id}`, quality: q && { strength: q.strength, floor: q.floor, met: q.met } };
  });
  return (
    <>
      <PageHeader title="Dashboard">Two lenses: EB-1A criteria readiness and brand growth. Only completed, non-avoid evidence counts toward readiness.</PageHeader>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Lens 1 - Criteria readiness</h2>
      <ReadinessPanel r={readiness} />
      <Headline s={coverage.summary} />
      <CriterionGrid items={items} />
      <NearestWins wins={nearestWins(coverage, opps)} names={names} />
      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">Lens 2 - Brand growth</h2>
      <BrandGrowth channels={brand} />
      <RemindersPanel r={reminders} />
    </>
  );
}
