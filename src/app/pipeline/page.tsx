import { PageHeader } from "@/components/page-header";
import { Kanban, type Card } from "@/components/pipeline/kanban";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { scoreView } from "@/lib/pursuit-view";
import { parseIntArray, toIsoDate } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const rows = await db.pursuit.findMany({ include: { opportunity: { include: { venue: true } } }, orderBy: { createdAt: "desc" } });
  const cards: Card[] = rows.map((p) => {
    const sv = scoreView(p, p.opportunity, p.opportunity.venue);
    return {
    brand: sv.brand,
    brandEstimated: sv.brandEstimated,
    eb1a: sv.eb1a,
    penalized: sv.penalties.length > 0,
    invitation: p.invitationProof,
    completion: p.completionProof,
    id: p.id,
    state: p.state,
    title: p.opportunity.title,
    venue: p.opportunity.venue?.name ?? null,
    tier: p.opportunity.venue?.qualityTier ?? null,
    avoid: !!p.opportunity.venue?.avoidFlag,
    strength: p.strength,
    criteria: parseIntArray(p.criterionIds),
    deadline: toIsoDate(p.opportunity.deadline),
    date: toIsoDate(p.completedOn ?? p.decidedOn ?? p.appliedOn),
  };
  });
  return (
    <>
      <PageHeader title="Pipeline">Drag cards between lanes, or use the small move buttons. Moving to completed prompts for evidence.</PageHeader>
      <Kanban cards={cards} />
    </>
  );
}
