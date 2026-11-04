// Brand-growth view model: latest/delta per channel, sparkline points, year-1 KPI progress.
import { db } from "./db";

export interface MetricPoint {
  date: Date;
  followers: number;
  impressions: number;
  engagementRate: number;
  inboundCount: number;
}
export interface Delta {
  value: number;
  delta: number | null; // vs previous entry; null when no previous
}
export interface ChannelGrowth {
  id: string;
  name: string;
  type: string;
  followers: Delta;
  impressions: Delta;
  engagement: Delta;
  inbound: Delta;
  series: number[]; // followers, oldest first
  asOf: Date | null;
  kpi: KpiProgress | null;
}

/** Year-1 follower targets from the plan (low-high), by channel type. */
export const FOLLOWER_TARGETS: Record<string, { low: number; high: number; label: string }> = {
  linkedin: { low: 2000, high: 5000, label: "LinkedIn followers" },
  newsletter: { low: 300, high: 1000, label: "Newsletter subscribers" },
  x: { low: 500, high: 2000, label: "X followers" },
  github: { low: 100, high: 500, label: "GitHub followers" },
};
export const ENGAGEMENT_TARGET = { low: 2, high: 5 }; // LinkedIn engagement %

export interface KpiProgress {
  label: string;
  value: number;
  low: number;
  high: number;
  pctOfHigh: number; // bar fill, 0-100
  pctOfLow: number; // marker position on the bar, 0-100
  status: "below" | "on_track" | "stretch"; // < low, >= low, >= high
}

export function kpiProgress(label: string, value: number, low: number, high: number): KpiProgress {
  const v = Math.max(0, value);
  return {
    label, value: v, low, high,
    pctOfHigh: Math.min(100, (v / high) * 100),
    pctOfLow: Math.min(100, (low / high) * 100),
    status: v >= high ? "stretch" : v >= low ? "on_track" : "below",
  };
}

const delta = (cur: number, prev: number | undefined): Delta => ({ value: cur, delta: prev === undefined ? null : cur - prev });

/** Pure: summarise one channel's metrics (any order). Engagement delta is in percentage points. */
export function summarizeChannel(ch: { id: string; name: string; type: string }, metrics: MetricPoint[]): ChannelGrowth {
  const m = [...metrics].sort((a, b) => a.date.getTime() - b.date.getTime());
  const last = m[m.length - 1];
  const prev = m[m.length - 2];
  const t = FOLLOWER_TARGETS[ch.type];
  return {
    id: ch.id, name: ch.name, type: ch.type,
    followers: delta(last?.followers ?? 0, prev?.followers),
    impressions: delta(last?.impressions ?? 0, prev?.impressions),
    engagement: delta(last?.engagementRate ?? 0, prev?.engagementRate),
    inbound: delta(last?.inboundCount ?? 0, prev?.inboundCount),
    series: m.map((x) => x.followers),
    asOf: last?.date ?? null,
    kpi: t ? kpiProgress(t.label, last?.followers ?? 0, t.low, t.high) : null,
  };
}

/** Pure: SVG polyline points string for a series in a w x h box (flat line when constant). */
export function sparklinePoints(series: number[], w = 96, h = 28, pad = 2): string {
  if (series.length === 0) return "";
  const min = Math.min(...series);
  const range = Math.max(...series) - min;
  const step = series.length > 1 ? (w - 2 * pad) / (series.length - 1) : 0;
  return series
    .map((v, i) => {
      const x = series.length > 1 ? pad + i * step : w / 2;
      const y = range === 0 ? h / 2 : h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Pure: LinkedIn engagement KPI (if a LinkedIn channel has data). */
export function engagementKpi(channels: ChannelGrowth[]): KpiProgress | null {
  const li = channels.find((c) => c.type === "linkedin" && c.asOf);
  return li ? kpiProgress("LinkedIn engagement %", li.engagement.value, ENGAGEMENT_TARGET.low, ENGAGEMENT_TARGET.high) : null;
}

export async function getBrandGrowth(): Promise<ChannelGrowth[]> {
  const rows = await db.channel.findMany({ orderBy: { createdAt: "asc" }, include: { metrics: true } });
  return rows.map((c) => summarizeChannel(c, c.metrics));
}
