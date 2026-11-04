import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// DB-backed: runs only with TEST_DATABASE_URL (an empty throwaway Postgres DB).
const url = process.env.TEST_DATABASE_URL;
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
}

describe.skipIf(!url)("seed (postgres)", () => {
beforeAll(() => {
  execSync("npx prisma migrate deploy", { env: process.env, stdio: "ignore" });
}, 60000);
afterAll(async () => {
  const { db } = await import("./db");
  await db.$disconnect();
});

it("concurrent ensureSeeded does not throw and seeds once", async () => {
  const { ensureSeeded } = await import("./seed");
  const { db } = await import("./db");
  await Promise.all(Array.from({ length: 8 }, () => ensureSeeded()));
  const n = await db.opportunity.count();
  expect(n).toBeGreaterThan(0);
  await ensureSeeded();
  expect(await db.opportunity.count()).toBe(n);
}, 60000);

it("concurrent seedVenues is idempotent", async () => {
  const { seedVenues } = await import("./venue-seed");
  const { db } = await import("./db");
  const v = await db.venue.count();
  await Promise.all([seedVenues(), seedVenues(), seedVenues()]);
  expect(await db.venue.count()).toBe(v);
}, 60000);
});
