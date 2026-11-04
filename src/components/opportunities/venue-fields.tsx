import type { Venue } from "@prisma/client";
import { QUALITY_TIERS, VENUE_KINDS } from "@/lib/enums";
import { parseStringArray } from "@/lib/json";
import { Field, inputCls, label } from "@/components/ui";

/** Venue inputs; `p` prefixes names so they can be embedded in the opportunity form. */
export function VenueFields({ venue, p = "" }: { venue?: Venue | null; p?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Venue name"><input name={p + "name"} defaultValue={venue?.name} className={inputCls} /></Field>
      <Field label="Kind">
        <select name={p + "kind"} defaultValue={venue?.kind ?? "conference"} className={inputCls}>
          {VENUE_KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}
        </select>
      </Field>
      <Field label="Quality tier">
        <select name={p + "qualityTier"} defaultValue={venue?.qualityTier ?? "unrated"} className={inputCls}>
          {QUALITY_TIERS.map((k) => <option key={k}>{k}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={p + "avoidFlag"} defaultChecked={venue?.avoidFlag} /> Avoid flag (pay-to-play / predatory)
      </label>
      <Field label="Selectivity"><input name={p + "selectivity"} defaultValue={venue?.selectivity ?? ""} className={inputCls} /></Field>
      <Field label="Indexing"><input name={p + "indexing"} defaultValue={venue?.indexing ?? ""} className={inputCls} /></Field>
      <Field label="Cost"><input name={p + "cost"} defaultValue={venue?.cost ?? ""} className={inputCls} /></Field>
      <Field label="Homepage"><input name={p + "homepage"} defaultValue={venue?.homepage ?? ""} className={inputCls} /></Field>
      <Field label="Field tags (comma separated)"><input name={p + "fieldTags"} defaultValue={parseStringArray(venue?.fieldTags).join(", ")} className={inputCls} /></Field>
      <Field label="Notes"><input name={p + "notes"} defaultValue={venue?.notes ?? ""} className={inputCls} /></Field>
    </div>
  );
}
