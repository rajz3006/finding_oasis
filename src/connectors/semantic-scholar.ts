import type { Connector } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

const BASE = "https://api.semanticscholar.org/graph/v1";

interface S2Paper {
  paperId: string;
  title?: string;
  year?: number;
  citationCount?: number;
  externalIds?: { DOI?: string };
}
interface S2Author {
  authorId: string;
  name?: string;
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
}

// Citation metrics only: records them in Source config, creates no opportunities.
// Author resolution: config.authorId, else exact-name match on the profile name.
export const semanticScholar: Connector = {
  name: "Semantic Scholar",
  async fetch(config, _scope, ctx) {
    const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
    const headers: Record<string, string> = key ? { "x-api-key": key } : {};
    let authorId = typeof config.authorId === "string" ? config.authorId : "";
    let author: S2Author | undefined;

    if (!authorId) {
      const name = ctx.profile.name.trim();
      if (!name) {
        ctx.note("skipped", "Profile name not set (or set config.authorId)");
        return [];
      }
      const q = encodeURIComponent(name);
      const res = await getJson<{ data?: S2Author[] }>(ctx.fetch, `${BASE}/author/search?query=${q}&fields=name,paperCount,citationCount,hIndex&limit=10`, headers);
      const exact = (res.data ?? []).filter((a) => a.name?.toLowerCase() === name.toLowerCase());
      if (!exact.length) {
        ctx.note("skipped", `No Semantic Scholar author named "${name}"`);
        return [];
      }
      author = exact.sort((a, b) => (b.paperCount ?? 0) - (a.paperCount ?? 0))[0];
      authorId = author.authorId;
      if (exact.length > 1) ctx.note("s2Ambiguous", `${exact.length} authors match; set config.authorId`);
    }

    const res = await getJson<{ data?: S2Paper[] }>(ctx.fetch, `${BASE}/author/${encodeURIComponent(authorId)}/papers?fields=title,year,citationCount,externalIds&limit=100`, headers);
    const works = (res.data ?? []).map((p) => ({ id: p.paperId, doi: p.externalIds?.DOI, title: p.title, year: p.year, cited: p.citationCount ?? 0 }));
    ctx.note("s2AuthorId", authorId);
    ctx.note("s2Works", works.length);
    ctx.note("s2TotalCitations", works.reduce((a, b) => a + b.cited, 0));
    if (author?.hIndex != null) ctx.note("s2HIndex", author.hIndex);
    ctx.note("s2WorkCitations", works);
    return [];
  },
};
