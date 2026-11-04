import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listChannels = (args: Prisma.ChannelFindManyArgs = {}) =>
  db.channel.findMany({ orderBy: { createdAt: "asc" }, ...args });
export const getChannel = (id: string) => db.channel.findUnique({ where: { id }, include: { metrics: { orderBy: { date: "asc" } } } });
export const createChannel = (data: Prisma.ChannelUncheckedCreateInput) => db.channel.create({ data });
export const updateChannel = (id: string, data: Prisma.ChannelUncheckedUpdateInput) => db.channel.update({ where: { id }, data });
export const deleteChannel = (id: string) => db.channel.delete({ where: { id } }); // cascades metrics
