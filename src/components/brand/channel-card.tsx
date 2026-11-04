import type { Channel, ReachMetric } from "@prisma/client";
import { addMetric, removeChannel, removeMetric, saveChannel, saveMetric } from "@/app/brand/actions";
import { btnCls, btnPrimaryCls, dateInputValue, fmtDate, inputCls } from "@/components/ui";
import { CHANNEL_TYPES, KPI_BY_TYPE, deltas, signed, sparkPoints } from "./brand-data";

function Spark({ values }: { values: number[] }) {
  const pts = sparkPoints(values);
  if (!pts) return <span className="text-xs text-zinc-400">need 2+ points</span>;
  return (
    <svg width="120" height="28" viewBox="0 0 120 28" role="img" aria-label="followers trend" className="text-sky-600">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MetricFields({ m }: { m?: ReachMetric }) {
  const c = `${inputCls} w-full`;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      <input name="date" type="date" required defaultValue={dateInputValue(m?.date ?? new Date())} className={c} aria-label="Date" />
      <input name="followers" type="number" min="0" defaultValue={m?.followers ?? ""} placeholder="followers" className={c} />
      <input name="impressions" type="number" min="0" defaultValue={m?.impressions ?? ""} placeholder="impressions" className={c} />
      <input name="engagementRate" type="number" step="0.01" min="0" defaultValue={m?.engagementRate ?? ""} placeholder="eng. %" className={c} />
      <input name="inboundCount" type="number" min="0" defaultValue={m?.inboundCount ?? ""} placeholder="inbound" className={c} />
      <input name="notes" defaultValue={m?.notes ?? ""} placeholder="notes" className={c} />
    </div>
  );
}

const Delta = ({ label, v, unit = "" }: { label: string; v: number; unit?: string }) => (
  <span className={v > 0 ? "text-emerald-700" : v < 0 ? "text-red-700" : "text-zinc-500"}>{label} {signed(v)}{unit}</span>
);

export function ChannelCard({ channel, metrics }: { channel: Channel; metrics: ReachMetric[] }) {
  const latest = metrics[metrics.length - 1];
  const d = deltas(metrics);
  return (
    <section className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{channel.name} <span className="text-xs font-normal text-zinc-500">{channel.type} / {channel.ownership}</span></h3>
          <p className="text-xs text-zinc-500">{KPI_BY_TYPE[channel.type] ?? "No year-1 target"}</p>
          {latest && (
            <p className="mt-1 text-sm">
              {latest.followers.toLocaleString()} followers, {latest.impressions.toLocaleString()} impr., {latest.engagementRate}% eng., {latest.inboundCount} inbound
              <span className="text-xs text-zinc-500"> ({fmtDate(latest.date)})</span>
            </p>
          )}
          {d && (
            <p className="text-xs">vs previous: <Delta label="followers" v={d.followers} /> · <Delta label="impr." v={d.impressions} /> · <Delta label="eng." v={d.engagementRate} unit="pt" /> · <Delta label="inbound" v={d.inboundCount} /></p>
          )}
        </div>
        <Spark values={metrics.map((m) => m.followers)} />
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-zinc-600">Edit channel</summary>
        <form action={saveChannel} className="mt-2 grid gap-2 sm:grid-cols-5">
          <input type="hidden" name="id" value={channel.id} />
          <input name="name" required defaultValue={channel.name} className={inputCls} />
          <select name="type" defaultValue={channel.type} className={inputCls}>{CHANNEL_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select name="ownership" defaultValue={channel.ownership} className={inputCls}><option>owned</option><option>earned</option></select>
          <input name="url" defaultValue={channel.url ?? ""} placeholder="url" className={inputCls} />
          <button className={btnCls}>Save</button>
        </form>
        <form action={removeChannel} className="mt-2"><input type="hidden" name="id" value={channel.id} /><button className="text-xs text-red-700 underline">Delete channel and its metrics</button></form>
      </details>

      <form action={addMetric} className="mt-3 space-y-2">
        <input type="hidden" name="channelId" value={channel.id} />
        <MetricFields />
        <button className={btnPrimaryCls}>Add reach entry</button>
      </form>

      {metrics.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {[...metrics].reverse().map((m) => (
            <li key={m.id}>
              <details>
                <summary className="cursor-pointer">{fmtDate(m.date)}: {m.followers} followers, {m.impressions} impr., {m.engagementRate}%, {m.inboundCount} inbound{m.notes ? ` - ${m.notes}` : ""}</summary>
                <form action={saveMetric} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={m.id} />
                  <MetricFields m={m} />
                  <button className={btnCls}>Save</button>
                </form>
                <form action={removeMetric} className="mt-1"><input type="hidden" name="id" value={m.id} /><button className="text-xs text-red-700 underline">Delete entry</button></form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
