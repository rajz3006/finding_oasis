import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

interface CrJournal {
  title?: string;
  publisher?: string;
  ISSN?: string[];
  subjects?: { name?: string }[];
  counts?: Record<string, number>;
}

export const crossref: Connector = {
  name: "Crossref",
  async fetch(config, fieldScope, ctx) {
    const rows = Number(config.rows ?? 15);
    const mail = ctx.profile.email ? `&mailto=${encodeURIComponent(ctx.profile.email)}` : "";
    const out: NormalizedOpp[] = [];
    const seen = new Set<string>();
    for (const tag of fieldScope) {
      const data = await getJson<{ message?: { items?: CrJournal[] } }>(
        ctx.fetch,
        `https://api.crossref.org/journals?query=${encodeURIComponent(tag)}&rows=${rows}${mail}`,
      );
      for (const j of data.message?.items ?? []) {
        const issn = j.ISSN?.[0];
        if (!j.title || !issn || seen.has(issn)) continue;
        seen.add(issn);
        out.push({
          venue: {
            name: j.title,
            kind: "journal",
            homepage: `https://portal.issn.org/resource/ISSN/${issn}`,
            indexing: "DOI (Crossref)",
            notes: j.publisher ? `Publisher: ${j.publisher}` : undefined,
            fieldTags: fieldScope,
          },
          title: `Publish in ${j.title}`,
          type: "publish_article",
          criterionIds: [6],
          deadline: null,
          url: `https://portal.issn.org/resource/ISSN/${issn}`,
          effort: "high",
          raw: j,
        });
      }
    }
    return out;
  },
};
