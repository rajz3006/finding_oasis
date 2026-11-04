import { PageHeader } from "@/components/page-header";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ensureSeeded } from "@/lib/seed";
import { listVenue } from "@/lib/data";
import { saveOpportunity } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  return (
    <>
      <PageHeader title="Add opportunity">Manual entry.</PageHeader>
      <OpportunityForm action={saveOpportunity} venues={await listVenue()} />
    </>
  );
}
