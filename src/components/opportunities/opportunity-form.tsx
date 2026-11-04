import type { Opportunity, Venue } from "@prisma/client";
import { CATALOG_STATUSES, EFFORTS, OPP_TYPES, STRENGTHS } from "@/lib/enums";
import { parseIntArray } from "@/lib/json";
import { CriteriaChecks, Field, btnPrimaryCls, dateInputValue, inputCls, label } from "@/components/ui";
import { VenueFields } from "./venue-fields";

interface Props {
  action: (fd: FormData) => Promise<void>;
  venues: Venue[];
  opp?: Opportunity | null;
  achievement?: boolean;
}

export function OpportunityForm({ action, venues, opp, achievement }: Props) {
  return (
    <form action={action} className="max-w-3xl space-y-4">
      {opp && <input type="hidden" name="id" value={opp.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><input name="title" required defaultValue={opp?.title} className={inputCls} /></Field>
        <Field label="Type">
          <select name="type" defaultValue={opp?.type ?? "publish_article"} className={inputCls}>
            {OPP_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        <Field label={achievement ? "Date (optional)" : "Deadline"}>
          <input type="date" name="deadline" defaultValue={dateInputValue(opp?.deadline)} className={inputCls} />
        </Field>
        <Field label="URL"><input name="url" defaultValue={opp?.url ?? ""} className={inputCls} /></Field>
        <Field label="Effort">
          <select name="effort" defaultValue={opp?.effort ?? "medium"} className={inputCls}>
            {EFFORTS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Catalog status">
          <select name="statusCatalog" defaultValue={opp?.statusCatalog ?? "unknown"} className={inputCls}>
            {CATALOG_STATUSES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div><div className="mb-1 text-sm font-medium">Criteria</div><CriteriaChecks selected={parseIntArray(opp?.criterionIds)} /></div>
      <Field label="Venue">
        <select name="venueId" defaultValue={opp?.venueId ?? ""} className={inputCls}>
          <option value="">(none)</option>
          <option value="__new">+ New venue (fill in below)</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name} [{v.qualityTier}]{v.avoidFlag ? " AVOID" : ""}</option>)}
        </select>
      </Field>
      <details className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm">New venue details (only used when &quot;New venue&quot; is selected)</summary>
        <div className="mt-3"><VenueFields p="venue_" /></div>
      </details>
      {achievement && (
        <div className="grid gap-3 rounded border border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-800">
          <Field label="Completed on"><input type="date" name="completedOn" defaultValue={dateInputValue(new Date())} className={inputCls} /></Field>
          <Field label="Strength">
            <select name="strength" className={inputCls}><option value="">(unset)</option>{STRENGTHS.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea name="notes" rows={2} className={inputCls} /></Field></div>
        </div>
      )}
      <button className={btnPrimaryCls}>{achievement ? "Add achievement" : "Save"}</button>
    </form>
  );
}
