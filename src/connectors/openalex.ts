import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

const BASE = "https://api.openalex.org";

interface OaSource {
  id: string;
  display_name: string;
  homepage_url?: string | null;
  is_oa?: boolean;
  is_in_doaj?: boolean;
  type?: string;
  apc_usd?: number | null;
  works_count?: number;
  summary_stats?: { "2yr_mean_citedness"?: number };
}
interface OaWork {
  id: string;
  doi?: string | null;
  title?: string;
  cited_by_count?: number;
}

export const openalex: Connector = {
  name: "OpenAlex",
  async fetch(config, fieldScope, ctx) {
    const mailto = ctx.profile.email ? `&mailto=${encodeURIComponent(ctx.profile.email)}` : "";
    const perTag = Number(config.perTag ?? 10);
    const out: NormalizedOpp[] = [];
    const seen = new Set<string>();

    for (const tag of fieldScope) {
      const url = `${BASE}/sources?search=${encodeURIComponent(tag)}&filter=type:journal&per-page=${perTag}${mailto}`;
      const data = await getJson<{ results?: OaSource[] }>(ctx.fetch, url);
      for (const s of data.results ?? []) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        const cited = s.summary_stats?.["2yr_mean_citedness"];
        out.push({
          venue: {
            name: s.display_name,
            kind: "journal",
            homepage: s.homepage_url ?? undefined,
            indexing: s.is_in_doaj ? "DOAJ" : undefined,
            cost: s.apc_usd ? `APC ~$${s.apc_usd}` : s.is_oa ? "OA (check APC)" : undefined,
            selectivity: cited != null ? `2yr mean citedness ${cited.toFixed(2)} (OpenAlex)` : undefined,
            fieldTags: fieldScope,
          },
          title: `Publish in ${s.display_name}`,
          type: "publish_article",
          criterionIds: [6],
          deadline: null,
          url: s.id,
          effort: "high",
          raw: s,
        });
      }
    }

    // Citation counts for own works (does not create opportunities).
    if (ctx.profile.orcid) {
      try {
        const orcid = ctx.profile.orcid.replace(/^https?:\/\/orcid\.org\//, "");
        const w = await getJson<{ results?: OaWork[] }>(
          ctx.fetch,
          `${BASE}/works?filter=author.orcid:${encodeURIComponent(orcid)}&per-page=100&select=id,doi,title,cited_by_count${mailto}`,
        );
        const works = (w.results ?? []).map((x) => ({ id: x.id, doi: x.doi, title: x.title, cited: x.cited_by_count ?? 0 }));
        ctx.note("works", works.length);
        ctx.note("totalCitations", works.reduce((a, b) => a + b.cited, 0));
        ctx.note("workCitations", works);
      } catch (e) {
        ctx.note("citationError", e instanceof Error ? e.message : String(e));
      }
    }
    return out;
  },
};
