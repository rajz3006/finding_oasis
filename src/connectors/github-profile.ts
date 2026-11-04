import type { Connector } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";
import { ensureChannel, upsertDailyMetric } from "@/lib/connectors/reach-sink";

// GitHub REST v3 /users/{login}, /users/{login}/repos; contributions need GraphQL + GITHUB_TOKEN.
// Writes a ReachMetric (no opportunities). Login from config.githubLogin.
export const githubProfile: Connector = {
  name: "GitHub Profile",
  async fetch(config, _scope, ctx) {
    const login = String(config.githubLogin ?? "").trim();
    if (!login) {
      ctx.note("skipped", "Set githubLogin in Source config");
      return [];
    }
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const user = await getJson<{ followers?: number; public_repos?: number; html_url?: string }>(ctx.fetch, `https://api.github.com/users/${encodeURIComponent(login)}`, headers);
    const repos = await getJson<{ stargazers_count?: number }[]>(ctx.fetch, `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100`, headers);
    const stars = repos.reduce((n, r) => n + (r.stargazers_count ?? 0), 0);

    let contributions: number | undefined;
    if (token) {
      const res = await ctx.fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "User-Agent": "eb1a-tracker (local)" },
        body: JSON.stringify({ query: `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions}}}}`, variables: { l: login } }),
      });
      if (res.ok) {
        const j = (await res.json()) as { data?: { user?: { contributionsCollection?: { contributionCalendar?: { totalContributions?: number } } } } };
        contributions = j.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;
      }
    }

    const ch = await ensureChannel("github", "GitHub", user.html_url ?? `https://github.com/${login}`);
    const followers = user.followers ?? 0;
    await upsertDailyMetric(ch.id, {
      followers,
      impressions: stars, // stars stand in for reach on a code channel
      notes: `stars=${stars}; repos=${user.public_repos ?? repos.length}; contributions(12mo)=${contributions ?? "n/a (set GITHUB_TOKEN)"}`,
    });
    ctx.note("githubFollowers", followers);
    ctx.note("githubStars", stars);
    if (contributions !== undefined) ctx.note("githubContributions", contributions);
    return [];
  },
};
