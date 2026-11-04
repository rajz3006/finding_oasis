import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listSources = () => db.source.findMany({ orderBy: { name: "asc" } });
export const getSource = (id: string) => db.source.findUnique({ where: { id } });
export const getSourceByName = (name: string) => db.source.findUnique({ where: { name } });
export const createSource = (data: Prisma.SourceCreateInput) => db.source.create({ data });
export const updateSource = (id: string, data: Prisma.SourceUpdateInput) =>
  db.source.update({ where: { id }, data });
export const markSourceRun = (id: string, when = new Date()) =>
  db.source.update({ where: { id }, data: { lastRun: when } });
export const deleteSource = (id: string) => db.source.delete({ where: { id } });
