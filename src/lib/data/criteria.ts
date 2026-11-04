import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listCriteria = () => db.criterion.findMany({ orderBy: { id: "asc" } });
export const getCriterion = (id: number) => db.criterion.findUnique({ where: { id } });
export const updateCriterion = (id: number, data: Prisma.CriterionUpdateInput) =>
  db.criterion.update({ where: { id }, data });
