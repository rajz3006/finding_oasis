import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listOpportunity = (args: Prisma.OpportunityFindManyArgs = {}) =>
  db.opportunity.findMany({ orderBy: { createdAt: "desc" }, ...args });
export const getOpportunity = (id: string) => db.opportunity.findUnique({ where: { id }, include: { venue: true, source: true, pursuits: true } });
export const createOpportunity = (data: Prisma.OpportunityUncheckedCreateInput) => db.opportunity.create({ data });
export const updateOpportunity = (id: string, data: Prisma.OpportunityUncheckedUpdateInput) =>
  db.opportunity.update({ where: { id }, data });
export const deleteOpportunity = (id: string) => db.opportunity.delete({ where: { id } });
