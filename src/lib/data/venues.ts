import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const listVenue = (args: Prisma.VenueFindManyArgs = {}) =>
  db.venue.findMany({ orderBy: { name: "asc" }, ...args });
export const getVenue = (id: string) => db.venue.findUnique({ where: { id }, include: { opportunities: true } });
export const createVenue = (data: Prisma.VenueUncheckedCreateInput) => db.venue.create({ data });
export const updateVenue = (id: string, data: Prisma.VenueUncheckedUpdateInput) =>
  db.venue.update({ where: { id }, data });
export const deleteVenue = (id: string) => db.venue.delete({ where: { id } });
