import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AddEvidenceForm } from "@/components/evidence/add-form";
import { EvidenceRow } from "@/components/evidence/evidence-item";
import { AvoidBadge, Pill } from "@/components/ui";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { parseIntArray, parseStringArray } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const p = await db.pursuit.findUnique({
    where: { id },
    include: { opportunity: { include: { venue: true } }, evidence: { orderBy: { createdAt: "asc" } } },
  });
  if (!p) notFound();
  const crit = parseIntArray(p.criterionIds);
  const criteria = await db.criterion.findMany({ where: { id: { in: crit } }, orderBy: { id: "asc" } });
  const items = [...new Set(criteria.flatMap((c) => parseStringArray(c.proofChecklist)))];
  const unlinked = p.evidence.filter((e) => !e.checklistItem || !items.includes(e.checklistItem));
  const done = items.filter((i) => p.evidence.some((e) => e.checklistItem === i)).length;

  return (
    <>
      <PageHeader title={p.opportunity.title}>
        <Pill>{p.state}</Pill> {crit.map((n) => `C${n}`).join(" ") || "no criteria"} · {done}/{items.length} checklist items · {p.evidence.length} artifacts ·{" "}
        <Link href={`/pipeline/${p.id}`} className="underline">edit pursuit</Link> · <Link href="/evidence" className="underline">locker</Link>
      </PageHeader>
      {p.opportunity.venue?.avoidFlag && <div className="mb-4"><AvoidBadge /> Do not count this evidence toward coverage.</div>}
      {crit.length === 0 && <p className="mb-4 text-sm text-amber-600">No criteria set on this pursuit; choose some in the pursuit editor to get a checklist.</p>}
      <ul className="space-y-3">
        {items.map((item) => {
          const evs = p.evidence.filter((e) => e.checklistItem === item);
          return (
            <li key={item} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm">
                <span aria-label={evs.length ? "done" : "missing"} className={evs.length ? "text-emerald-600" : "text-zinc-400"}>{evs.length ? "[x]" : "[ ]"}</span>
                <span className="font-medium">{item}</span>
              </div>
              {evs.length > 0 && <ul className="mt-2 space-y-1">{evs.map((e) => <EvidenceRow key={e.id} ev={e} />)}</ul>}
              <details className="mt-1"><summary className="cursor-pointer text-xs text-zinc-500">Add proof</summary><AddEvidenceForm pursuitId={p.id} item={item} /></details>
            </li>
          );
        })}
        <li className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-sm font-medium">Other artifacts</div>
          {unlinked.length > 0 && <ul className="mt-2 space-y-1">{unlinked.map((e) => <EvidenceRow key={e.id} ev={e} />)}</ul>}
          <details className="mt-1" open={items.length === 0}><summary className="cursor-pointer text-xs text-zinc-500">Add artifact</summary><AddEvidenceForm pursuitId={p.id} item={null} /></details>
        </li>
      </ul>
    </>
  );
}
