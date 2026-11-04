import { Field, btnPrimaryCls, dateInputValue, inputCls, label } from "@/components/ui";
import { RECOMMENDER_STATUSES } from "@/lib/enums";
import type { Recommender } from "@prisma/client";

/** Shared add/edit form; pass `rec` to edit. */
export function RecommenderForm({ action, rec, submit }: { action: (fd: FormData) => Promise<void>; rec?: Recommender; submit: string }) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {rec && <input type="hidden" name="id" value={rec.id} />}
      <Field label="Name"><input name="name" required defaultValue={rec?.name} className={inputCls} /></Field>
      <Field label="Role"><input name="role" defaultValue={rec?.role} className={inputCls} /></Field>
      <Field label="Organization"><input name="org" defaultValue={rec?.org} className={inputCls} /></Field>
      <Field label="Relationship" hint="e.g. cited my work, journal editor, former manager"><input name="relationship" defaultValue={rec?.relationship} className={inputCls} /></Field>
      <Field label="Status">
        <select name="status" defaultValue={rec?.status ?? "identified"} className={inputCls}>
          {RECOMMENDER_STATUSES.map((st) => <option key={st} value={st}>{label(st)}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 pt-6 text-sm">
        <input type="checkbox" name="independent" defaultChecked={rec?.independent} /> Independent (no coauthor/employer tie)
      </label>
      <Field label="Last contacted"><input type="date" name="lastContacted" defaultValue={dateInputValue(rec?.lastContacted)} className={inputCls} /></Field>
      <Field label="Next nudge"><input type="date" name="nextNudge" defaultValue={dateInputValue(rec?.nextNudge)} className={inputCls} /></Field>
      <div className="sm:col-span-2">
        <Field label="Notes"><textarea name="notes" rows={2} defaultValue={rec?.notes ?? ""} className={inputCls} /></Field>
      </div>
      <div><button className={btnPrimaryCls}>{submit}</button></div>
    </form>
  );
}
