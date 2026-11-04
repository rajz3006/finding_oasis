import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listReachMetrics = (args: Prisma.ReachMetricFindManyArgs = {}) =>
  db.reachMetric.findMany({ orderBy: { date: "asc" }, ...args });
export const listReachForChannel = (channelId: string) => listReachMetrics({ where: { channelId } });
/** Latest metric per channel. */
export async function latestReachByChannel() {
  const rows = await db.reachMetric.findMany({ orderBy: { date: "desc" } });
  const out = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!out.has(r.channelId)) out.set(r.channelId, r);
  return out;
}
export const createReachMetric = (data: Prisma.ReachMetricUncheckedCreateInput) => db.reachMetric.create({ data });
export const updateReachMetric = (id: string, data: Prisma.ReachMetricUncheckedUpdateInput) => db.reachMetric.update({ where: { id }, data });
export const deleteReachMetric = (id: string) => db.reachMetric.delete({ where: { id } });
