"use client";
import { useState } from "react";
import { MAX_PILLARS, pillarBalance } from "@/components/brand/brand-data";
import { btnPrimaryCls, inputCls } from "@/components/ui";

// Positioning, pillars, cadence; saved on Profile via the given server action.
export function PositioningForm(props: {
  action: (fd: FormData) => void | Promise<void>;
  positioning: string; pillars: string[]; cadenceNotes: string;
}) {
  const [pillars, setPillars] = useState(props.pillars.join("\n"));
  const list = pillars.split("\n").map((s) => s.trim()).filter(Boolean);
  const bal = pillarBalance(list);
  return (
    <form action={props.action} className="max-w-2xl space-y-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="block text-sm"><span className="font-medium">Positioning (one line: &ldquo;known for...&rdquo;)</span>
        <input name="positioning" defaultValue={props.positioning} placeholder="Known for making data platforms boringly reliable" className={`mt-1 ${inputCls}`} />
      </label>
      <label className="block text-sm"><span className="font-medium">Content pillars (one per line, 2-{MAX_PILLARS})</span>
        <textarea name="pillars" rows={3} value={pillars} onChange={(e) => setPillars(e.target.value)} className={`mt-1 ${inputCls}`} />
      </label>
      {list.length > MAX_PILLARS && <p className="text-xs text-amber-700">More than {MAX_PILLARS} pillars dilutes the wedge; trim to 2-3.</p>}
      {list.length === 1 && <p className="text-xs text-zinc-500">Add a second pillar (2-3 recommended).</p>}
      {list.length > 0 && (
        <p className="text-xs text-zinc-500">
          Pillar balance: {bal.covered.length ? `covers ${bal.covered.join(", ")}` : "no match yet"}
          {bal.missing.length > 0 && `; consider ${bal.missing.join(" / ")} (craft, opinion, building-in-public)`}.
        </p>
      )}
      <label className="block text-sm"><span className="font-medium">Cadence targets &amp; notes</span>
        <textarea name="cadenceNotes" rows={5} defaultValue={props.cadenceNotes} className={`mt-1 ${inputCls}`} />
      </label>
      <button className={btnPrimaryCls}>Save positioning</button>
    </form>
  );
}
