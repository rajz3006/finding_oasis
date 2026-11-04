import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listEvidence = (args: Prisma.EvidenceFindManyArgs = {}) =>
  db.evidence.findMany({ orderBy: { createdAt: "desc" }, ...args });
export const getEvidence = (id: string) => db.evidence.findUnique({ where: { id }, include: { pursuit: { include: { opportunity: true } } } });
export const createEvidence = (data: Prisma.EvidenceUncheckedCreateInput) => db.evidence.create({ data });
export const updateEvidence = (id: string, data: Prisma.EvidenceUncheckedUpdateInput) =>
  db.evidence.update({ where: { id }, data });
export const deleteEvidence = (id: string) => db.evidence.delete({ where: { id } });
