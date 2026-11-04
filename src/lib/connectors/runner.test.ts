import { describe, expect, it, vi } from "vitest";

const { sourceUpdate, oppUpsert } = vi.hoisted(() => ({ sourceUpdate: vi.fn(), oppUpsert: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    source: {
      findUnique: vi.fn(async ({ where }: { where: { name: string } }) =>
        where.name === "Crossref" ? { id: "s1", name: "Crossref", config: "{}", lastRun: null } : null),
      update: sourceUpdate,
    },
    opportunity: { findUnique: vi.fn(async () => null), upsert: oppUpsert },
  },
}));
vi.mock("@/lib/scoring", () => ({ upsertScoredVenue: vi.fn(async () => ({ id: "v1" })) }));
vi.mock("@/lib/data/profile", () => ({
  getProfile: async () => ({ name: "", orcid: "", email: "", fieldTags: ["analytics"] }),
}));

import { runConnector, sourceHealth } from "./runner";

const json = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("runConnector", () => {
  it("upserts opportunities and sets lastRun", async () => {
    const r = await runConnector("Crossref", { fetchImpl: json({ message: { items: [{ title: "J", ISSN: ["1111-2222"] }] } }) });
    expect(r).toMatchObject({ ok: true, created: 1 });
    expect(oppUpsert).toHaveBeenCalledOnce();
    expect(sourceUpdate.mock.calls.at(-1)![0].data.lastRun).toBeInstanceOf(Date);
  });

  it("never throws; marks error on failure", async () => {
    const r = await runConnector("Crossref", { fetchImpl: json({}, 500) });
    expect(r.ok).toBe(false);
    expect(sourceUpdate.mock.calls.at(-1)![0].data.config).toContain('"status":"error"');
  });

  it("unknown source returns error result", async () => {
    expect((await runConnector("nope")).ok).toBe(false);
  });
});

describe("sourceHealth", () => {
  const now = new Date("2026-11-04");
  it("flags never-run, failed, old; passes fresh", () => {
    expect(sourceHealth({ lastRun: null, config: "{}" }, now).stale).toBe(true);
    expect(sourceHealth({ lastRun: now, config: '{"status":"error"}' }, now).stale).toBe(true);
    expect(sourceHealth({ lastRun: new Date("2026-10-01"), config: "{}" }, now).stale).toBe(true);
    expect(sourceHealth({ lastRun: new Date("2026-11-01"), config: '{"status":"ok"}' }, now).stale).toBe(false);
  });
});
