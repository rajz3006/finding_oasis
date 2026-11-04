import { addEvidence } from "@/app/evidence/actions";
import { EVIDENCE_KINDS } from "@/lib/enums";
import { maxUploadBytes } from "@/lib/evidence";
import { btnCls, inputCls } from "@/components/ui";

/** Attach a file, paste a link, or record a metric against one checklist item. */
export function AddEvidenceForm({ pursuitId, item }: { pursuitId: string; item: string | null }) {
  return (
    <form action={addEvidence} encType="multipart/form-data" className="mt-2 grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto]">
      <input type="hidden" name="pursuitId" value={pursuitId} />
      <input type="hidden" name="checklistItem" value={item ?? ""} />
      <select name="kind" defaultValue="link" className={inputCls}>{EVIDENCE_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
      <input name="label" placeholder="Label (e.g. invitation email)" className={inputCls} />
      <input name="value" placeholder="Link / metric value" className={inputCls} />
      <button className={btnCls}>Add</button>
      <input type="file" name="file" className="text-xs sm:col-span-3" />
      <span className="text-xs text-gray-500">Max {maxUploadBytes() / 1024 / 1024}MB</span>
    </form>
  );
}
