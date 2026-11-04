import { db } from "@/lib/db";

/** Find-or-create a Channel by type+name. */
export async function ensureChannel(type: string, name: string, url?: string, ownership = "owned") {
  const existing = await db.channel.findFirst({ where: { type, name } });
  if (existing) return existing;
  return db.channel.create({ data: { type, name, url: url ?? null, ownership } });
}

/** One ReachMetric per channel per UTC day: update if present, else create. */
export async function upsertDailyMetric(
  channelId: string,
  m: { followers?: number; impressions?: number; engagementRate?: number; inboundCount?: number; notes?: string },
  now = new Date(),
) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);
  const existing = await db.reachMetric.findFirst({ where: { channelId, date: { gte: start, lt: end } } });
  if (existing) return db.reachMetric.update({ where: { id: existing.id }, data: m });
  // Carry the last follower count forward when a source does not report one.
  let followers = m.followers;
  if (followers === undefined) followers = (await db.reachMetric.findFirst({ where: { channelId }, orderBy: { date: "desc" } }))?.followers ?? 0;
  return db.reachMetric.create({ data: { channelId, date: start, ...m, followers } });
}
