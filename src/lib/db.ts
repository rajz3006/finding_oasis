import { PrismaClient } from "@prisma/client";

// Serverless-safe: one client per instance; global reuse only in dev (HMR).
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
