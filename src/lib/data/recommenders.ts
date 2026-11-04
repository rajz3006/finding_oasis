import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listRecommenders = (args: Prisma.RecommenderFindManyArgs = {}) =>
  db.recommender.findMany({ orderBy: { createdAt: "desc" }, ...args });
export const getRecommender = (id: string) => db.recommender.findUnique({ where: { id } });
export const createRecommender = (data: Prisma.RecommenderUncheckedCreateInput) => db.recommender.create({ data });
export const updateRecommender = (id: string, data: Prisma.RecommenderUncheckedUpdateInput) => db.recommender.update({ where: { id }, data });
export const deleteRecommender = (id: string) => db.recommender.delete({ where: { id } });
/** Recommenders whose nextNudge is due (<= now), excluding declined/letter_received. */
export const dueRecommenderNudges = (now = new Date()) =>
  db.recommender.findMany({
    where: { nextNudge: { lte: now }, status: { notIn: ["declined", "letter_received"] } },
    orderBy: { nextNudge: "asc" },
  });
