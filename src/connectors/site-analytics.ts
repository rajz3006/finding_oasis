import type { Connector } from "@/lib/connectors/types";
import { getJson } from "@/lib/connectors/http";
import { ensureChannel, upsertDailyMetric } from "@/lib/connectors/reach-sink";

// Self-hosted Plausible (Stats API v1 /api/v1/stats/aggregate) or Umami (/api/websites/{id}/stats).
// Shapes per vendor docs (not verified live). Config: provider, baseUrl, siteId, token (or env
// ANALYTICS_TOKEN), channelName. Skips gracefully when unconfigured.
export const siteAnalytics: Connector = {
  name: "Site Analytics",
  async fetch(config, _scope, ctx) {
    const baseUrl = String(config.baseUrl ?? process.env.ANALYTICS_BASE_URL ?? "").replace(/\/+$/, "");
    const siteId = String(config.siteId ?? process.env.ANALYTICS_SITE_ID ?? "");
    const token = String(config.token ?? process.env.ANALYTICS_TOKEN ?? "");
    if (!baseUrl || !siteId || !token) {
      ctx.note("skipped", "Set baseUrl, siteId and token (config or ANALYTICS_* env)");
      return [];
    }
    const auth = { Authorization: `Bearer ${token}` };
    let visitors = 0;
    let pageviews = 0;
    if (config.provider === "umami") {
      const end = Date.now();
      const d = await getJson<{ pageviews?: { value?: number }; visitors?: { value?: number } }>(
        ctx.fetch,
        `${baseUrl}/api/websites/${encodeURIComponent(siteId)}/stats?startAt=${end - 30 * 86_400_000}&endAt=${end}`,
        auth,
      );
      visitors = d.visitors?.value ?? 0;
      pageviews = d.pageviews?.value ?? 0;
    } else {
      const d = await getJson<{ results?: { visitors?: { value?: number }; pageviews?: { value?: number } } }>(
        ctx.fetch,
        `${baseUrl}/api/v1/stats/aggregate?site_id=${encodeURIComponent(siteId)}&period=30d&metrics=visitors,pageviews`,
        auth,
      );
      visitors = d.results?.visitors?.value ?? 0;
      pageviews = d.results?.pageviews?.value ?? 0;
    }
    const ch = await ensureChannel("site", String(config.channelName ?? "Personal site"), baseUrl);
    await upsertDailyMetric(ch.id, { impressions: pageviews, notes: `30d visitors=${visitors}; pageviews=${pageviews}` });
    ctx.note("siteVisitors30d", visitors);
    ctx.note("sitePageviews30d", pageviews);
    return [];
  },
};
