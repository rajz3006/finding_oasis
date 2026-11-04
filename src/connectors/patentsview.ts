import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

const BASE = "https://search.patentsview.org/api/v1/patent/";

interface PvPatent {
  patent_id: string;
  patent_title?: string;
  patent_date?: string;
}

// Patents by inventor name (PatentsView v1 API; needs PATENTSVIEW_API_KEY). Doc-based shape.
export const patentsview: Connector = {
  name: "PatentsView",
  async fetch(config, _scope, ctx) {
    const key = process.env.PATENTSVIEW_API_KEY;
    if (!key) {
      ctx.note("skipped", "PATENTSVIEW_API_KEY not set");
      return [];
    }
    const parts = ctx.profile.name.trim().split(/\s+/);
    if (parts.length < 2) {
      ctx.note("skipped", "Profile name needs first and last name");
      return [];
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    const q = { _and: [{ "inventors.inventor_name_first": first }, { "inventors.inventor_name_last": last }] };
    const f = ["patent_id", "patent_title", "patent_date"];
    const o = { size: Number(config.limit ?? 100) };
    const url = `${BASE}?q=${encodeURIComponent(JSON.stringify(q))}&f=${encodeURIComponent(JSON.stringify(f))}&o=${encodeURIComponent(JSON.stringify(o))}`;
    const data = await getJson<{ patents?: PvPatent[] }>(ctx.fetch, url, { "X-Api-Key": key });

    const out: NormalizedOpp[] = (data.patents ?? []).map((p) => ({
      title: `Patent US${p.patent_id}: ${p.patent_title ?? ""}`.trim(),
      type: "patent",
      criterionIds: [5],
      deadline: null,
      url: `https://patents.google.com/patent/US${p.patent_id}`,
      effort: "high",
      raw: { ...p, note: "Name-based match; confirm you are the inventor" },
    }));
    ctx.note("patents", out.length);
    return out;
  },
};
