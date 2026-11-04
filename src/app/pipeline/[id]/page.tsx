import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AvoidBadge, CriteriaChecks, Field, TierBadge, btnPrimaryCls, dateInputValue, inputCls } from "@/components/ui";
import { PURSUIT_STATES, STRENGTHS } from "@/lib/enums";
import { parseIntArray } from "@/lib/json";
import { getPursuit } from "@/lib/data";
import { ensureSeeded } from "@/lib/seed";
import { savePursuit } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const p = await getPursuit(id);
  if (!p) notFound();
  const v = p.opportunity.venue;
  return (
    <>
      <PageHeader title={p.opportunity.title}>
        {v?.name} {v && <TierBadge tier={v.qualityTier} />} <Link href="/pipeline" className="underline">Back to pipeline</Link>{" · "}
        <Link href={`/evidence/pursuit/${p.id}`} className="underline">Evidence ({p.evidence.length})</Link>
      </PageHeader>
      {v?.avoidFlag && <div className="mb-4"><AvoidBadge /> Coverage is never counted on avoid-flagged evidence.</div>}
      <form action={savePursuit} className="max-w-2xl space-y-4">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="State">
            <select name="state" defaultValue={p.state} className={inputCls}>{PURSUIT_STATES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Strength">
            <select name="strength" defaultValue={p.strength ?? ""} className={inputCls}>
              <option value="">(unset)</option>{STRENGTHS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Applied on"><input type="date" name="appliedOn" defaultValue={dateInputValue(p.appliedOn)} className={inputCls} /></Field>
          <Field label="Decided on"><input type="date" name="decidedOn" defaultValue={dateInputValue(p.decidedOn)} className={inputCls} /></Field>
          <Field label="Completed on"><input type="date" name="completedOn" defaultValue={dateInputValue(p.completedOn)} className={inputCls} /></Field>
        </div>
        <div><div className="mb-1 text-sm font-medium">Criteria counted</div><CriteriaChecks selected={parseIntArray(p.criterionIds)} /></div>
        <Field label="Notes"><textarea name="notes" rows={4} defaultValue={p.notes ?? ""} className={inputCls} /></Field>
        <button className={btnPrimaryCls}>Save</button>
      </form>
    </>
  );
}
