import { afterEach, describe, expect, it } from "vitest";
import { orcid } from "./orcid";
import { semanticScholar } from "./semantic-scholar";
import { patentsview } from "./patentsview";
import { dossierCsv } from "@/lib/dossier";
import { CONNECTORS } from "@/lib/connectors/registry";
import { SOURCE_SEEDS } from "@/lib/seed";
import type { ConnectorContext } from "@/lib/connectors/types";

function fakeFetch(routes: Record<string, unknown>, calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("nope", { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  }) as typeof fetch;
}
const mk = (routes: Record<string, unknown>, profile: Partial<{ name: string; orcid: string }> = {}) => {
  const notes: Record<string, unknown> = {};
  const calls: string[] = [];
  const ctx: ConnectorContext = {
    fetch: fakeFetch(routes, calls),
    profile: { name: "", orcid: "", email: "", ...profile },
    note: (k, v) => void (notes[k] = v),
  };
  return { ctx, notes, calls };
};

describe("registry/seeds", () => {
  it("registers P2 connectors with matching source seeds", () => {
    for (const n of ["ORCID", "Semantic Scholar", "PatentsView"]) {
      expect(CONNECTORS[n]).toBeDefined();
      expect(SOURCE_SEEDS.filter((s) => s.name === n)).toHaveLength(1);
    }
  });
});

describe("ORCID", () => {
  it("no-ops without an ORCID iD and makes no requests", async () => {
    const { ctx, notes, calls } = mk({});
    expect(await orcid.fetch({}, [], ctx)).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(notes.skipped).toBeTruthy();
  });
  it("maps works (c6) and peer reviews (c4)", async () => {
    const { ctx, notes } = mk(
      {
        "/works": { group: [{ "work-summary": [{ "put-code": 1, title: { title: { value: "Paper A" } }, "journal-title": { value: "J Data" }, "external-ids": { "external-id": [{ "external-id-type": "doi", "external-id-value": "10.1/x" }] } }] }] },
        "/peer-reviews": { group: [{ "peer-review-group": [{ "peer-review-summary": [{ "put-code": 9, "convening-organization": { name: "TKDE" }, "completion-date": { year: { value: "2025" } } }] }] }] },
      },
      { orcid: "https://orcid.org/0000-0001-2345-6789" },
    );
    const out = await orcid.fetch({}, ["data"], ctx);
    expect(out.find((o) => o.type === "publish_article")).toMatchObject({ criterionIds: [6], url: "https://doi.org/10.1/x" });
    expect(out.find((o) => o.type === "judge_review")).toMatchObject({ criterionIds: [4], title: "Peer review for TKDE (2025)" });
    expect(notes.orcidPeerReviews).toBe(1);
  });
});

describe("Semantic Scholar", () => {
  it("skips without a name or authorId", async () => {
    const { ctx, calls } = mk({});
    expect(await semanticScholar.fetch({}, [], ctx)).toEqual([]);
    expect(calls).toHaveLength(0);
  });
  it("records citation counts in notes", async () => {
    const { ctx, notes } = mk(
      {
        "author/search": { data: [{ authorId: "42", name: "Ada Lovelace", paperCount: 2, hIndex: 1 }] },
        "author/42/papers": { data: [{ paperId: "p1", citationCount: 5 }, { paperId: "p2", citationCount: 2 }] },
      },
      { name: "Ada Lovelace" },
    );
    expect(await semanticScholar.fetch({}, [], ctx)).toEqual([]);
    expect(notes.s2TotalCitations).toBe(7);
    expect(notes.s2HIndex).toBe(1);
  });
});

describe("PatentsView", () => {
  const prev = process.env.PATENTSVIEW_API_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.PATENTSVIEW_API_KEY;
    else process.env.PATENTSVIEW_API_KEY = prev;
  });
  it("skips without API key", async () => {
    delete process.env.PATENTSVIEW_API_KEY;
    const { ctx, calls } = mk({}, { name: "Ada Lovelace" });
    expect(await patentsview.fetch({}, [], ctx)).toEqual([]);
    expect(calls).toHaveLength(0);
  });
  it("maps patents to criterion 5", async () => {
    process.env.PATENTSVIEW_API_KEY = "k";
    const { ctx } = mk({ "search.patentsview.org": { patents: [{ patent_id: "1234567", patent_title: "Data thing", patent_date: "2024-01-02" }] } }, { name: "Ada Lovelace" });
    const out = await patentsview.fetch({}, [], ctx);
    expect(out[0]).toMatchObject({ type: "patent", criterionIds: [5], url: "https://patents.google.com/patent/US1234567" });
  });
});

describe("dossier CSV", () => {
  it("quotes fields and neutralizes formulas", () => {
    const csv = dossierCsv([{ id: 6, name: "Auth", rows: [["6. Auth", 'Say "hi", ok', "", "", "", "applied", "", "=cmd", "link", "", ""]] }]);
    expect(csv).toContain('"Say ""hi"", ok"');
    expect(csv).toContain(`"'=cmd"`);
    expect(csv.split("\r\n")[0]).toContain("Criterion,Opportunity");
  });
});
