import { describe, expect, it } from "vitest";
import { developersEvents } from "./developers-events";
import { openalex } from "./openalex";
import { crossref } from "./crossref";
import { doaj } from "./doaj";
import { github } from "./github";
import type { ConnectorContext } from "@/lib/connectors/types";

// Route-based fake fetch: first matching substring wins.
function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("nope", { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  }) as typeof fetch;
}
const mk = (routes: Record<string, unknown>, orcid = ""): { ctx: ConnectorContext; notes: Record<string, unknown> } => {
  const notes: Record<string, unknown> = {};
  return {
    notes,
    ctx: { fetch: fakeFetch(routes), profile: { name: "t", orcid, email: "a@b.co" }, note: (k, v) => void (notes[k] = v) },
  };
};
const future = Date.now() + 90 * 86_400_000;
const scope = ["data engineering", "analytics"];

describe("developers.events", () => {
  it("filters by scope and maps CFPs to criteria 6,7", async () => {
    const { ctx } = mk({
      "all-events.json": [
        { name: "Data Council", hyperlink: "https://dc.example", date: [future], location: "SF" },
        { name: "Knitting Fest", hyperlink: "https://knit.example", date: [future] },
        { name: "Old Data Conf", hyperlink: "https://old.example", date: [1000] },
      ],
      "all-cfps.json": [
        { link: "https://cfp.example/1", untilDate: future, conf: { name: "Big Data Summit", hyperlink: "https://bd.example" } },
        { link: "https://cfp.example/2", untilDate: 1000, conf: { name: "Expired data conf" } },
      ],
    });
    const out = await developersEvents.fetch({}, scope, ctx);
    expect(out.map((o) => o.url).sort()).toEqual(["https://cfp.example/1", "https://dc.example"]);
    const cfp = out.find((o) => o.type === "submit_cfp")!;
    expect(cfp.criterionIds).toEqual([6, 7]);
    expect(cfp.deadline).toBeInstanceOf(Date);
  });
});

describe("OpenAlex", () => {
  it("maps journals, dedupes, and records citations when ORCID set", async () => {
    const { ctx, notes } = mk(
      {
        "/sources": { results: [{ id: "https://openalex.org/S1", display_name: "J Data", is_in_doaj: true, apc_usd: 500 }] },
        "/works": { results: [{ id: "W1", title: "x", cited_by_count: 3 }, { id: "W2", cited_by_count: 4 }] },
      },
      "0000-0001-2345-6789",
    );
    const out = await openalex.fetch({}, scope, ctx);
    expect(out).toHaveLength(1); // same journal from both tags
    expect(out[0].venue?.indexing).toBe("DOAJ");
    expect(out[0].criterionIds).toEqual([6]);
    expect(notes.totalCitations).toBe(7);
  });
});

describe("Crossref", () => {
  it("maps journals by ISSN", async () => {
    const { ctx } = mk({ "api.crossref.org/journals": { message: { items: [{ title: "Data Mgmt Review", ISSN: ["1234-5678"] }, { title: "no issn" }] } } });
    const out = await crossref.fetch({}, ["analytics"], ctx);
    expect(out).toHaveLength(1);
    expect(out[0].venue?.kind).toBe("journal");
  });
});

describe("DOAJ", () => {
  it("maps OA journals", async () => {
    const { ctx } = mk({ "doaj.org/api": { results: [{ id: "abc", bibjson: { title: "OA Data J", apc: { has_apc: false } } }] } });
    const out = await doaj.fetch({}, ["analytics"], ctx);
    expect(out[0].url).toBe("https://doaj.org/toc/abc");
    expect(out[0].venue?.cost).toBe("No APC");
  });
});

describe("GitHub", () => {
  it("maps issues to oss_contribution criterion 5 and dedupes across labels", async () => {
    const { ctx } = mk({ "search/issues": { items: [{ html_url: "https://github.com/o/r/issues/1", number: 1, title: "fix", labels: [{ name: "help wanted" }] }] } });
    const out = await github.fetch({ repos: ["o/r"], delayMs: 0 }, scope, ctx);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "oss_contribution", criterionIds: [5] });
  });
});

describe("failures", () => {
  it("connector throws on HTTP error (runner catches)", async () => {
    const { ctx } = mk({});
    await expect(crossref.fetch({}, ["x"], ctx)).rejects.toThrow(/HTTP 404/);
  });
});
