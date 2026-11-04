import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson, matchesTerms, scopeTerms } from "@/lib/connectors/http";

const BASE = "https://developers.events";

interface EventJson {
  name?: string;
  hyperlink?: string;
  location?: string;
  date?: number[]; // epoch ms
  misc?: string;
  tags?: string[];
}
interface CfpJson {
  link?: string;
  until?: string;
  untilDate?: number; // epoch ms
  conf?: EventJson;
}

const ms = (n: unknown) => (typeof n === "number" && n > 0 ? new Date(n) : null);

export const developersEvents: Connector = {
  name: "developers.events",
  async fetch(_config, fieldScope, ctx) {
    const terms = scopeTerms(fieldScope);
    const out: NormalizedOpp[] = [];
    const now = Date.now();

    const events = await getJson<EventJson[]>(ctx.fetch, `${BASE}/all-events.json`);
    for (const e of events) {
      if (!e.name || !e.hyperlink) continue;
      const start = e.date?.[0];
      if (start && start < now) continue; // past
      const hay = `${e.name} ${e.misc ?? ""} ${(e.tags ?? []).join(" ")}`;
      if (!matchesTerms(hay, terms)) continue;
      out.push({
        venue: { name: e.name, kind: "conference", homepage: e.hyperlink, fieldTags: fieldScope },
        title: `${e.name} (${e.location ?? "location n/a"})`,
        type: "give_talk",
        criterionIds: [7],
        deadline: null,
        url: e.hyperlink,
        effort: "medium",
        raw: e,
      });
    }

    // CFPs may fail independently; keep events if so.
    try {
      const cfps = await getJson<CfpJson[]>(ctx.fetch, `${BASE}/all-cfps.json`);
      for (const c of cfps) {
        const conf = c.conf;
        if (!c.link || !conf?.name) continue;
        const deadline = ms(c.untilDate);
        if (deadline && deadline.getTime() < now) continue;
        if (!matchesTerms(`${conf.name} ${conf.misc ?? ""}`, terms)) continue;
        out.push({
          venue: { name: conf.name, kind: "conference", homepage: conf.hyperlink, fieldTags: fieldScope },
          title: `CFP: ${conf.name}`,
          type: "submit_cfp",
          criterionIds: [6, 7],
          deadline,
          url: c.link,
          effort: "medium",
          raw: c,
        });
      }
    } catch (e) {
      ctx.note("cfpError", e instanceof Error ? e.message : String(e));
    }
    return out;
  },
};
