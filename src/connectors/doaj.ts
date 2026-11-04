import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

interface DoajJournal {
  id: string;
  bibjson?: {
    title?: string;
    ref?: { journal?: string };
    publisher?: { name?: string };
    apc?: { has_apc?: boolean; max?: { price?: number; currency?: string }[] };
    editorial?: { review_process?: string[] };
    keywords?: string[];
  };
}

export const doaj: Connector = {
  name: "DOAJ",
  async fetch(config, fieldScope, ctx) {
    const pageSize = Number(config.pageSize ?? 10);
    const out: NormalizedOpp[] = [];
    const seen = new Set<string>();
    for (const tag of fieldScope) {
      const data = await getJson<{ results?: DoajJournal[] }>(
        ctx.fetch,
        `https://doaj.org/api/search/journals/${encodeURIComponent(tag)}?pageSize=${pageSize}`,
      );
      for (const r of data.results ?? []) {
        const b = r.bibjson;
        if (!b?.title || seen.has(r.id)) continue;
        seen.add(r.id);
        const apc = b.apc?.has_apc ? `APC ${b.apc.max?.map((m) => `${m.price} ${m.currency}`).join(", ") ?? ""}`.trim() : "No APC";
        const url = `https://doaj.org/toc/${r.id}`;
        out.push({
          venue: {
            name: b.title,
            kind: "journal",
            homepage: b.ref?.journal,
            indexing: "DOAJ",
            cost: apc,
            selectivity: b.editorial?.review_process?.join(", "),
            notes: b.publisher?.name ? `Publisher: ${b.publisher.name}` : undefined,
            fieldTags: fieldScope,
          },
          title: `Publish in ${b.title}`,
          type: "publish_article",
          criterionIds: [6],
          deadline: null,
          url,
          effort: "high",
          raw: r,
        });
      }
    }
    return out;
  },
};
