import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getText, parseFeed } from "@/lib/connectors/feed";
import { sleep } from "@/lib/connectors/http";

// Atom API shape per arxiv.org/help/api (not verified live). Etiquette: ~1 req / 3s.
export const arxiv: Connector = {
  name: "arXiv",
  async fetch(config, fieldScope, ctx) {
    const max = Number(config.maxResults ?? 10);
    const out: NormalizedOpp[] = [];
    const seen = new Set<string>();
    let first = true;
    for (const tag of fieldScope) {
      if (!first) await sleep(Number(config.delayMs ?? 3000));
      first = false;
      const q = encodeURIComponent(`all:"${tag}"`);
      const xml = await getText(ctx.fetch, `https://export.arxiv.org/api/query?search_query=${q}&start=0&max_results=${max}&sortBy=submittedDate&sortOrder=descending`);
      for (const e of parseFeed(xml)) {
        const url = e.id || e.link;
        if (!url || !e.title || seen.has(url)) continue;
        seen.add(url);
        out.push({
          venue: { name: "arXiv", kind: "journal", homepage: "https://arxiv.org", selectivity: "not peer-reviewed", indexing: "arXiv", cost: "Free", fieldTags: fieldScope, notes: "Preprint server; not peer-reviewed. Supporting evidence only." },
          title: `Preprint: ${e.title}`,
          type: "publish_article",
          criterionIds: [5, 6],
          deadline: null,
          url,
          effort: "high",
          raw: { published: e.published, note: "not peer-reviewed", summary: e.summary.slice(0, 300) },
        });
      }
    }
    return out;
  },
};
