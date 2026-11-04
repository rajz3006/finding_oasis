import { PageHeader } from "@/components/page-header";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ensureSeeded } from "@/lib/seed";
import { listVenue } from "@/lib/data";
import { saveAchievement } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  return (
    <>
      <PageHeader title="Add achievement">Something already done: creates the opportunity and a completed pursuit, then takes you to attach evidence.</PageHeader>
      <OpportunityForm action={saveAchievement} venues={await listVenue()} achievement />
    </>
  );
}
