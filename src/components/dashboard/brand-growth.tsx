import Link from "next/link";
import clsx from "clsx";
import { sparklinePoints, engagementKpi, type ChannelGrowth, type KpiProgress } from "@/lib/brand-growth";

function Delta({ d, unit = "", digits = 0 }: { d: number | null; unit?: string; digits?: number }) {
  if (d === null) return <span className="text-zinc-400">first entry</span>;
  const cls = d > 0 ? "text-emerald-600 dark:text-emerald-400" : d < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500";
  return <span className={cls}>{d > 0 ? "+" : ""}{d.toFixed(digits)}{unit}</span>;
}

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return <span className="text-xs text-zinc-400">no trend yet</span>;
  return (
    <svg width="96" height="28" viewBox="0 0 96 28" role="img" aria-label="Followers trend" className="text-emerald-600 dark:text-emerald-400">
      <polyline points={sparklinePoints(series)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Bar({ k }: { k: KpiProgress }) {
  const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));
  return (
    <div className="text-xs">
      <div className="flex justify-between text-zinc-500">
        <span>{k.label}</span>
        <span>{fmt(k.value)} / {fmt(k.low)}-{fmt(k.high)}</span>
      </div>
      <div className="relative mt-1 h-2 rounded bg-zinc-200 dark:bg-zinc-800">
        <div className={clsx("h-2 rounded", k.status === "below" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${k.pctOfHigh}%` }} />
        <div className="absolute -top-0.5 h-3 w-0.5 bg-zinc-900 dark:bg-zinc-100" style={{ left: `${k.pctOfLow}%` }} title={`Year-1 minimum: ${fmt(k.low)}`} />
      </div>
    </div>
  );
}

export function BrandGrowth({ channels }: { channels: ChannelGrowth[] }) {
  if (!channels.length)
    return (
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Brand growth</h2>
        <p className="rounded border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          No channels yet. <Link href="/brand" className="underline">Add a channel and log reach</Link> to track followers, impressions, engagement and inbound against year-1 targets.
        </p>
      </section>
    );
  const eng = engagementKpi(channels);
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Brand growth</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((c) => (
          <div key={c.id} className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{c.name}</span> <span className="text-xs text-zinc-500">{c.type}</span>
              </div>
              <Sparkline series={c.series} />
            </div>
            {c.asOf ? (
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-zinc-500">Followers</dt><dd><b>{c.followers.value.toLocaleString()}</b> <Delta d={c.followers.delta} /></dd>
                <dt className="text-zinc-500">Impressions</dt><dd><b>{c.impressions.value.toLocaleString()}</b> <Delta d={c.impressions.delta} /></dd>
                <dt className="text-zinc-500">Engagement</dt><dd><b>{c.engagement.value.toFixed(1)}%</b> <Delta d={c.engagement.delta} unit="pp" digits={1} /></dd>
                <dt className="text-zinc-500">Inbound</dt><dd><b>{c.inbound.value}</b> <Delta d={c.inbound.delta} /></dd>
              </dl>
            ) : (
              <p className="mt-2 text-zinc-500">No metrics logged yet.</p>
            )}
            {c.kpi && <div className="mt-3"><Bar k={c.kpi} /></div>}
          </div>
        ))}
      </div>
      {eng && <div className="mt-3 max-w-md"><Bar k={eng} /></div>}
      <p className="mt-2 text-xs text-zinc-500">Bars fill toward the top of the year-1 range; the tick marks the minimum target. <Link href="/brand" className="underline">Log reach</Link></p>
    </section>
  );
}
