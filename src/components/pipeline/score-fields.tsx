"use client";
import { useEffect, useRef, useState } from "react";
import { previewScores } from "@/app/pipeline/actions";
import { ScorePanel } from "@/components/ui/score-panel";
import { Field, inputCls } from "@/components/ui";
import { COMPLETION_WARNING, type ScoreView } from "@/lib/pursuit-input";
import { INDEPENDENCE, PURSUIT_STATES } from "@/lib/enums";

interface Props {
  id: string;
  state: string;
  brandScore: number | null;
  independence: string;
  invitation: boolean;
  completion: boolean;
  thirdParty: boolean;
  initial: ScoreView;
}

/** State + brand + independence + proof checklist with a live dual-score panel. */
export function ScoreFields(p: Props) {
  const [state, setState] = useState(p.state);
  const [brand, setBrand] = useState(p.brandScore == null ? "" : String(p.brandScore));
  const [ind, setInd] = useState(p.independence);
  const [inv, setInv] = useState(p.invitation);
  const [comp, setComp] = useState(p.completion);
  const [third, setThird] = useState(p.thirdParty);
  const [view, setView] = useState(p.initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let live = true;
    const t = setTimeout(async () => {
      const v = await previewScores(p.id, { brand, independence: ind, invitation: inv, completion: comp, thirdParty: third });
      if (live && v) setView(v);
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [p.id, brand, ind, inv, comp, third]);

  const warn = state === "completed" && !comp;
  const box = "flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="State">
          <select name="state" value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>{PURSUIT_STATES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Brand score (0-100)" hint={view.brandEstimated ? `Blank = estimated (${view.brand})` : "Clear to use the estimate"}>
          <input type="number" name="brandScore" min={0} max={100} value={brand} placeholder={`est. ${view.brand}`} onChange={(e) => setBrand(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Independence">
          <select name="independence" value={ind} onChange={(e) => setInd(e.target.value)} className={inputCls}>{INDEPENDENCE.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <div>
          <div className="mb-1 text-sm font-medium">Corroboration</div>
          <div className="flex flex-wrap gap-2">
            <label className={box}><input type="checkbox" name="invitationProof" checked={inv} onChange={(e) => setInv(e.target.checked)} /> invitation</label>
            <label className={box}><input type="checkbox" name="completionProof" checked={comp} onChange={(e) => setComp(e.target.checked)} /> completion</label>
            <label className={box}><input type="checkbox" name="thirdPartyProof" checked={third} onChange={(e) => setThird(e.target.checked)} /> third-party</label>
          </div>
        </div>
      </div>
      {warn && (
        <div role="alert" className="rounded border border-amber-500 bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {inv ? COMPLETION_WARNING : "No completion proof yet: this will not count as full credit."}
        </div>
      )}
      <ScorePanel s={view} />
    </div>
  );
}
