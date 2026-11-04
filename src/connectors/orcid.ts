import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";

const BASE = "https://pub.orcid.org/v3.0";

// Shapes follow the ORCID v3.0 public API docs (not verified live).
interface OrcidWorkSummary {
  "put-code"?: number;
  title?: { title?: { value?: string } };
  "journal-title"?: { value?: string } | null;
  url?: { value?: string } | null;
  type?: string;
  "external-ids"?: { "external-id"?: { "external-id-type"?: string; "external-id-value"?: string }[] };
}
interface OrcidPeerReviewSummary {
  "put-code"?: number;
  "review-group-id"?: string;
  "review-url"?: { value?: string } | null;
  "review-type"?: string;
  "convening-organization"?: { name?: string };
  "completion-date"?: { year?: { value?: string } } | null;
}

export const normalizeOrcid = (s: string) => s.trim().replace(/^https?:\/\/orcid\.org\//, "");

export const orcid: Connector = {
  name: "ORCID",
  async fetch(_config, fieldScope, ctx) {
    const id = normalizeOrcid(ctx.profile.orcid);
    if (!id) {
      ctx.note("skipped", "ORCID iD not set in Profile");
      return [];
    }
    const out: NormalizedOpp[] = [];

    const works = await getJson<{ group?: { "work-summary"?: OrcidWorkSummary[] }[] }>(ctx.fetch, `${BASE}/${id}/works`);
    for (const g of works.group ?? []) {
      const w = g["work-summary"]?.[0];
      const title = w?.title?.title?.value;
      if (!w || !title) continue;
      const doi = w["external-ids"]?.["external-id"]?.find((e) => e["external-id-type"] === "doi")?.["external-id-value"];
      const url = doi ? `https://doi.org/${doi}` : w.url?.value || `https://orcid.org/${id}#work-${w["put-code"]}`;
      const journal = w["journal-title"]?.value;
      out.push({
        venue: journal ? { name: journal, kind: "journal", fieldTags: fieldScope } : undefined,
        title,
        type: "publish_article",
        criterionIds: [6],
        deadline: null,
        url,
        effort: "high",
        raw: { source: "orcid-work", putCode: w["put-code"], type: w.type },
      });
    }
    ctx.note("orcidWorks", out.length);

    // Recorded peer reviews are judging evidence (criterion 4).
    const pr = await getJson<{ group?: { "peer-review-group"?: { "peer-review-summary"?: OrcidPeerReviewSummary[] }[] }[] }>(
      ctx.fetch,
      `${BASE}/${id}/peer-reviews`,
    );
    let reviews = 0;
    for (const g of pr.group ?? []) {
      for (const pg of g["peer-review-group"] ?? []) {
        for (const r of pg["peer-review-summary"] ?? []) {
          const org = r["convening-organization"]?.name;
          if (!org) continue;
          reviews++;
          const year = r["completion-date"]?.year?.value;
          out.push({
            venue: { name: org, kind: "journal", fieldTags: fieldScope },
            title: `Peer review for ${org}${year ? ` (${year})` : ""}`,
            type: "judge_review",
            criterionIds: [4],
            deadline: null,
            url: r["review-url"]?.value || `https://orcid.org/${id}#peer-review-${r["put-code"] ?? r["review-group-id"] ?? org}`,
            effort: "low",
            raw: { source: "orcid-peer-review", groupId: r["review-group-id"], type: r["review-type"] },
          });
        }
      }
    }
    ctx.note("orcidPeerReviews", reviews);
    return out;
  },
};
