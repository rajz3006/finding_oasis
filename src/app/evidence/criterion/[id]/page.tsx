import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EvidenceRow } from "@/components/evidence/evidence-item";
import { AvoidBadge, Pill, TierBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { parseIntArray } from "@/lib/json";
import { scoreView } from "@/lib/pursuit-view";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const cid = Number((await params).id);
  const c = await db.criterion.findUnique({ where: { id: cid } });
  if (!c) notFound();
  const all = await db.pursuit.findMany({
    where: { state: { not: "dropped" } },
    include: { opportunity: { include: { venue: true } }, evidence: { orderBy: { createdAt: "asc" } } },
  });
  const rows = all.filter((p) => parseIntArray(p.criterionIds).includes(cid));
  const total = rows.reduce((a, p) => a + p.evidence.length, 0);
  return (
    <>
      <PageHeader title={`Criterion ${c.id}: ${c.name}`}>
        {rows.length} pursuits · {total} artifacts · <Link href="/evidence" className="underline">locker</Link>
      </PageHeader>
      {rows.length === 0 && <p className="text-sm text-zinc-500">No pursuits count toward this criterion yet.</p>}
      <div className="space-y-4">
        {rows.map((p) => {
          const sv = scoreView(p, p.opportunity, p.opportunity.venue);
          return (
          <section key={p.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/evidence/pursuit/${p.id}`} className="font-medium hover:underline">{p.opportunity.title}</Link>
              <Pill>{p.state}</Pill>
              {p.opportunity.venue && <TierBadge tier={p.opportunity.venue.qualityTier} />}
              {p.opportunity.venue?.avoidFlag && <AvoidBadge />}
              {p.strength && <Pill>{p.strength}</Pill>}
              <Pill>EB-1A {sv.eb1a}{sv.penalties.length ? " (0.3x)" : ""}</Pill>
              <Pill>{sv.independence}</Pill>
              {!p.completionProof && <span className="text-xs text-amber-700 dark:text-amber-300">no completion proof</span>}
            </div>
            {p.evidence.length ? (
              <ul className="mt-2 space-y-1">{p.evidence.map((e) => <EvidenceRow key={e.id} ev={e} extra={e.checklistItem ? <span className="text-xs text-zinc-500">[{e.checklistItem}]</span> : null} />)}</ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No artifacts yet.</p>
            )}
          </section>
          );
        })}
      </div>
    </>
  );
}
