import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getJson, pauseFor } from "@/lib/connectors/http";

export const DEFAULT_REPOS = [
  "apache/airflow",
  "dbt-labs/dbt",
  "dagster-io/dagster",
  "duckdb/duckdb",
  "apache/iceberg",
  "apache/arrow",
  "fivetran/great_expectations",
];

interface GhIssue {
  html_url: string;
  title: string;
  number: number;
  repository_url: string;
  comments?: number;
  labels?: { name: string }[];
}

export const github: Connector = {
  name: "GitHub",
  async fetch(config, _scope, ctx) {
    const repos = Array.isArray(config.repos) ? (config.repos as string[]) : DEFAULT_REPOS;
    const perRepo = Number(config.perRepo ?? 10);
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const out: NormalizedOpp[] = [];

    const failed: string[] = [];
    let firstErr = "";
    outer: for (const repo of repos) {
      // Search API requires is:issue; labels are OR'd via separate queries.
      for (const label of ["good first issue", "help wanted"]) {
        const q = encodeURIComponent(`is:issue is:open repo:${repo} label:"${label}" no:assignee`);
        let data: { items?: GhIssue[] };
        try {
          data = await getJson<{ items?: GhIssue[] }>(
            ctx.fetch,
            `https://api.github.com/search/issues?q=${q}&sort=updated&per_page=${perRepo}`,
            headers,
          );
        } catch (e) {
          // One renamed/private repo (422) must not sink the whole run; rate limits (403/429) are fatal.
          const msg = e instanceof Error ? e.message : String(e);
          if (!/HTTP (422|404)/.test(msg)) throw e;
          firstErr ||= msg;
          if (!failed.includes(repo)) failed.push(repo);
          break;
        }
        for (const i of data.items ?? []) {
          if (out.some((o) => o.url === i.html_url)) continue;
          out.push({
            venue: {
              name: repo,
              kind: "oss_project",
              homepage: `https://github.com/${repo}`,
              fieldTags: ["data engineering"],
            },
            title: `${repo}#${i.number}: ${i.title}`,
            type: "oss_contribution",
            criterionIds: [5],
            deadline: null,
            url: i.html_url,
            effort: label === "good first issue" ? "low" : "medium",
            raw: { number: i.number, title: i.title, labels: i.labels?.map((l) => l.name), comments: i.comments },
          });
        }
        if (!token && !(await pauseFor(ctx, Number(config.delayMs ?? 6500)))) break outer; // unauth search: 10 req/min, so ~6.5s spacing
      }
    }
    if (failed.length) ctx.note("skippedRepos", failed);
    if (failed.length === repos.length) throw new Error(`All repos failed (${firstErr}); check config.repos for renamed/private repos`);
    return out;
  },
};
