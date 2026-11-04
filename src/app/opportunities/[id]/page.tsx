import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { btnCls } from "@/components/ui";
import { ensureSeeded } from "@/lib/seed";
import { getOpportunity, listVenue } from "@/lib/data";
import { deleteOpportunityAction, saveOpportunity } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();
  return (
    <>
      <PageHeader title="Edit opportunity">{opp.title}</PageHeader>
      <OpportunityForm action={saveOpportunity} venues={await listVenue()} opp={opp} />
      {opp.pursuits.length === 0 && (
        <form action={deleteOpportunityAction} className="mt-6">
          <input type="hidden" name="id" value={opp.id} />
          <button className={btnCls}>Delete opportunity</button>
        </form>
      )}
    </>
  );
}
