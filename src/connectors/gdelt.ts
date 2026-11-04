import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson, pauseFor } from "@/lib/connectors/http";

// GDELT DOC 2.0 artlist shape per docs (not verified live). Asks for <=1 req / 5s.
interface GdeltArticle { url?: string; title?: string; domain?: string; seendate?: string; sourcecountry?: string; }

export const gdelt: Connector = {
  name: "GDELT",
  async fetch(config, _scope, ctx) {
    const queries = Array.isArray(config.queries) ? (config.queries as string[]) : ctx.profile.name ? [`"${ctx.profile.name}"`] : [];
    if (!queries.length) {
      ctx.note("skipped", "Set Profile name or config.queries");
      return [];
    }
    const out: NormalizedOpp[] = [];
    let first = true;
    for (const query of queries) {
      if (!first && !(await pauseFor(ctx, Number(config.delayMs ?? 5000)))) break;
      first = false;
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=250&sort=datedesc`;
      let data: { articles?: GdeltArticle[] };
      try {
        data = await getJson<{ articles?: GdeltArticle[] }>(ctx.fetch, url);
      } catch (e) {
        // GDELT throttles intermittently (429) even when spaced; retry once after a pause.
        if (!(e instanceof Error) || !/HTTP 429/.test(e.message) || !(await pauseFor(ctx, Number(config.delayMs ?? 5000)))) throw e;
        data = await getJson<{ articles?: GdeltArticle[] }>(ctx.fetch, url);
      }
      for (const a of data.articles ?? []) {
        if (!a.url || !a.title || out.some((o) => o.url === a.url)) continue;
        out.push({
          venue: { name: a.domain || new URL(a.url).host, kind: "media_outlet", homepage: a.domain ? `https://${a.domain}` : undefined },
          title: `Mention: ${a.title}`,
          type: "press_mention",
          criterionIds: [3],
          deadline: null,
          url: a.url,
          effort: "low",
          raw: { query, seendate: a.seendate, country: a.sourcecountry },
        });
      }
    }
    return out;
  },
};
