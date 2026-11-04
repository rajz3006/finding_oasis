import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { afterAll, beforeAll, expect, it } from "vitest";

// Fresh temp SQLite DB, set before db/seed modules load.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eb1a-seed-"));
process.env.DATABASE_URL = `file:${path.join(dir, "t.db")}`;

beforeAll(() => {
  execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "ignore" });
}, 60000);
afterAll(async () => {
  const { db } = await import("./db");
  await db.$disconnect();
  fs.rmSync(dir, { recursive: true, force: true });
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
