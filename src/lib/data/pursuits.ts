import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listPursuit = (args: Prisma.PursuitFindManyArgs = {}) =>
  db.pursuit.findMany({ orderBy: { createdAt: "desc" }, ...args });
export const getPursuit = (id: string) => db.pursuit.findUnique({ where: { id }, include: { opportunity: { include: { venue: true } }, evidence: true } });
export const createPursuit = (data: Prisma.PursuitUncheckedCreateInput) => db.pursuit.create({ data });
export const updatePursuit = (id: string, data: Prisma.PursuitUncheckedUpdateInput) =>
  db.pursuit.update({ where: { id }, data });
export const deletePursuit = (id: string) => db.pursuit.delete({ where: { id } });
