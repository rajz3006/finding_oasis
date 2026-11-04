import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson, pauseFor } from "@/lib/connectors/http";

// Shape per NSF Awards API docs (api.nsf.gov/services/v1/awards.json; not verified live).
// Pages via rpp (<=25) and offset (1-based).
interface NsfAward { id?: string; title?: string; piFirstName?: string; piLastName?: string; awardeeName?: string; date?: string; fundsObligatedAmt?: string; }

export const nsfAwards: Connector = {
  name: "NSF Awards",
  async fetch(config, fieldScope, ctx) {
    const pages = Number(config.pages ?? 1);
    const out: NormalizedOpp[] = [];
    const seen = new Set<string>();
    outer: for (const tag of fieldScope) {
      for (let p = 0; p < pages; p++) {
        const offset = 1 + p * 25;
        const q = encodeURIComponent(tag);
        const data = await getJson<{ response?: { award?: NsfAward[] } }>(
          ctx.fetch,
          `https://api.nsf.gov/services/v1/awards.json?keyword=${q}&rpp=25&offset=${offset}&printFields=id,title,piFirstName,piLastName,awardeeName,date,fundsObligatedAmt`,
        );
        const awards = data.response?.award ?? [];
        for (const a of awards) {
          if (!a.id || !a.title || seen.has(a.id)) continue;
          seen.add(a.id);
          out.push({
            venue: { name: "NSF", kind: "society", homepage: "https://www.nsf.gov", notes: "Funded-award context: PI/panel reviewer leads", fieldTags: fieldScope },
            title: `NSF award ${a.id}: ${a.title} (PI ${[a.piFirstName, a.piLastName].filter(Boolean).join(" ")})`,
            type: "judge_review",
            criterionIds: [4, 5],
            deadline: null,
            url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${a.id}`,
            effort: "medium",
            raw: a,
          });
        }
        if (awards.length < 25) break;
        if (!(await pauseFor(ctx, Number(config.delayMs ?? 500)))) break outer;
      }
    }
    return out;
  },
};
