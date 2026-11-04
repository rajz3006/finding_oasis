import { PageHeader } from "@/components/page-header";
import { CriterionGrid } from "@/components/dashboard/criterion-grid";
import { Headline } from "@/components/dashboard/headline";
import { NearestWins } from "@/components/dashboard/nearest-wins";
import { RemindersPanel } from "@/components/dashboard/reminders-panel";
import { getCandidateOpps, getCoverage, nearestWins } from "@/lib/coverage";
import { getReminders } from "@/lib/reminders";
import { ensureSeeded } from "@/lib/seed";
import { listCriteria } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const [coverage, criteria, opps, reminders] = await Promise.all([getCoverage(), listCriteria(), getCandidateOpps(), getReminders()]);
  const names = Object.fromEntries(criteria.map((c) => [c.id, c.name]));
  const items = coverage.criteria.map((c) => ({ ...c, name: names[c.id] ?? `Criterion ${c.id}` }));
  return (
    <>
      <PageHeader title="Dashboard">Where you stand against the 10 EB-1A criteria. Only completed, non-avoid evidence counts.</PageHeader>
      <Headline s={coverage.summary} />
      <CriterionGrid items={items} />
      <NearestWins wins={nearestWins(coverage, opps)} names={names} />
      <RemindersPanel r={reminders} />
    </>
  );
}
