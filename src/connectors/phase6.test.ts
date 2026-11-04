/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

const { chans, mets } = vi.hoisted(() => ({ chans: [] as any[], mets: [] as any[] }));
vi.mock("@/lib/db", () => ({
  db: {
    channel: {
      findFirst: async ({ where }: any) => chans.find((c) => c.type === where.type && c.name === where.name) ?? null,
      create: async ({ data }: any) => { const c = { id: `c${chans.length}`, ...data }; chans.push(c); return c; },
    },
    reachMetric: {
      findFirst: async ({ where }: any) => mets.filter((m) => m.channelId === where.channelId && (!where.date || (m.date >= where.date.gte && m.date < where.date.lt))).at(-1) ?? null,
      create: async ({ data }: any) => { const m = { id: `m${mets.length}`, ...data }; mets.push(m); return m; },
      update: async ({ where, data }: any) => Object.assign(mets.find((m) => m.id === where.id), data),
    },
  },
}));

import { arxiv } from "./arxiv";
import { nsfAwards } from "./nsf-awards";
import { gdelt } from "./gdelt";
import { googleAlerts } from "./google-alerts";
import { githubProfile } from "./github-profile";
import { siteAnalytics } from "./site-analytics";
import { newsletterRss } from "./newsletter-rss";
import { CONNECTORS } from "@/lib/connectors/registry";
import { SOURCE_SEEDS } from "@/lib/seed";
import type { ConnectorContext } from "@/lib/connectors/types";

const mk = (routes: Record<string, string | object>) => {
  const notes: Record<string, unknown> = {};
  const calls: string[] = [];
  const ctx: ConnectorContext = {
    fetch: (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const k = Object.keys(routes).find((r) => url.includes(r));
      if (!k) return new Response("nope", { status: 404 });
      const v = routes[k];
      return new Response(typeof v === "string" ? v : JSON.stringify(v), { status: 200 });
    }) as typeof fetch,
    profile: { name: "Ada Lovelace", orcid: "", email: "" },
    note: (k, v) => void (notes[k] = v),
  };
  return { ctx, notes, calls };
};

describe("registry/seeds", () => {
  it("registers v2 connectors with one seed each", () => {
    for (const n of ["arXiv", "NSF Awards", "GDELT", "Google Alerts", "GitHub Profile", "Site Analytics", "Newsletter RSS"]) {
      expect(CONNECTORS[n]).toBeDefined();
      expect(SOURCE_SEEDS.filter((s) => s.name === n)).toHaveLength(1);
    }
  });
});

describe("arXiv", () => {
  it("parses Atom entries as c5/c6 preprints and dedupes", async () => {
    const xml = `<feed><entry><id>http://arxiv.org/abs/1</id><title>Paper &amp; One</title><summary>s</summary><published>2026-01-01</published></entry></feed>`;
    const { ctx } = mk({ "arxiv.org/api": xml });
    const out = await arxiv.fetch({ delayMs: 0 }, ["a", "b"], ctx);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "publish_article", criterionIds: [5, 6], title: "Preprint: Paper & One" });
    expect(JSON.stringify(out[0].raw)).toContain("not peer-reviewed");
  });
});

describe("NSF Awards", () => {
  it("maps awards to c4/c5", async () => {
    const { ctx } = mk({ "api.nsf.gov": { response: { award: [{ id: "123", title: "T", piFirstName: "A", piLastName: "B" }] } } });
    const out = await nsfAwards.fetch({}, ["data"], ctx);
    expect(out[0]).toMatchObject({ criterionIds: [4, 5], url: expect.stringContaining("AWD_ID=123") });
  });
});

describe("GDELT / Google Alerts", () => {
  it("GDELT maps press mentions with maxrecords=250", async () => {
    const { ctx, calls } = mk({ "gdeltproject.org": { articles: [{ url: "https://x.com/a", title: "Hi", domain: "x.com" }] } });
    const out = await gdelt.fetch({}, [], ctx);
    expect(out[0]).toMatchObject({ type: "press_mention", criterionIds: [3] });
    expect(calls[0]).toContain("maxrecords=250");
  });
  it("Google Alerts skips when unconfigured, unwraps redirect links", async () => {
    const a = mk({});
    expect(await googleAlerts.fetch({}, [], a.ctx)).toEqual([]);
    expect(a.notes.skipped).toBeTruthy();
    const xml = `<feed><entry><title>&lt;b&gt;Ada&lt;/b&gt; talk</title><link href="https://www.google.com/url?rct=j&amp;url=https://news.io/p"/><id>1</id></entry></feed>`;
    const b = mk({ "alerts/feeds": xml });
    const out = await googleAlerts.fetch({ feeds: ["https://www.google.com/alerts/feeds/1"] }, [], b.ctx);
    expect(out[0]).toMatchObject({ url: "https://news.io/p", type: "press_mention", title: "Mention: Ada talk" });
  });
});

describe("reach connectors", () => {
  it("GitHub Profile writes one metric per day (idempotent)", async () => {
    const routes = { "/repos": [{ stargazers_count: 3 }, { stargazers_count: 4 }], "/users/ada": { followers: 12, public_repos: 2 } };
    const { ctx, notes } = mk(routes);
    expect(await githubProfile.fetch({ githubLogin: "ada" }, [], ctx)).toEqual([]);
    await githubProfile.fetch({ githubLogin: "ada" }, [], ctx);
    expect(chans.filter((c) => c.type === "github")).toHaveLength(1);
    const gm = mets.filter((m) => m.channelId === chans.find((c) => c.type === "github").id);
    expect(gm).toHaveLength(1);
    expect(gm[0]).toMatchObject({ followers: 12, impressions: 7 });
    expect(notes.githubStars).toBe(7);
  });
  it("GitHub Profile and Site Analytics skip gracefully", async () => {
    const a = mk({});
    await githubProfile.fetch({}, [], a.ctx);
    await siteAnalytics.fetch({}, [], a.ctx);
    expect(a.calls).toHaveLength(0);
  });
  it("Site Analytics reads Plausible aggregate", async () => {
    const { ctx } = mk({ "stats/aggregate": { results: { visitors: { value: 5 }, pageviews: { value: 9 } } } });
    await siteAnalytics.fetch({ baseUrl: "https://p.example", siteId: "s", token: "t" }, [], ctx);
    expect(mets.find((m) => m.notes?.includes("visitors=5"))).toMatchObject({ impressions: 9 });
  });
  it("Newsletter RSS records post count + latest title", async () => {
    const xml = `<rss><channel><item><title>Issue 2</title><link>l2</link></item><item><title>Issue 1</title></item></channel></rss>`;
    const { ctx, notes } = mk({ "feed.xml": xml });
    await newsletterRss.fetch({ feedUrl: "https://n.io/feed.xml" }, [], ctx);
    expect(notes.newsletterPosts).toBe(2);
    expect(mets.find((m) => m.notes?.includes("Issue 2"))).toBeTruthy();
  });
});
