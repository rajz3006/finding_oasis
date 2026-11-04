import type { Connector, NormalizedOpp } from "@/lib/connectors/types";
import { getText, parseFeed } from "@/lib/connectors/feed";

/** Google Alerts wraps targets as google.com/url?...&url=<real>; unwrap it. */
export function unwrapAlertUrl(link: string): string {
  try {
    const u = new URL(link);
    return u.hostname.endsWith("google.com") ? (u.searchParams.get("url") ?? link) : link;
  } catch {
    return link;
  }
}

// Keyless Atom feeds created at google.com/alerts (deliver to RSS); URLs go in config.feeds.
export const googleAlerts: Connector = {
  name: "Google Alerts",
  async fetch(config, _scope, ctx) {
    const feeds = Array.isArray(config.feeds) ? (config.feeds as string[]) : [];
    if (!feeds.length) {
      ctx.note("skipped", "Add Google Alerts RSS feed URL(s) as config.feeds");
      return [];
    }
    const out: NormalizedOpp[] = [];
    for (const feed of feeds) {
      for (const e of parseFeed(await getText(ctx.fetch, feed))) {
        const url = unwrapAlertUrl(e.link);
        if (!url || !e.title || out.some((o) => o.url === url)) continue;
        let host = "";
        try { host = new URL(url).host; } catch { continue; }
        out.push({
          venue: { name: host, kind: "media_outlet", homepage: `https://${host}` },
          title: `Mention: ${e.title.replace(/<[^>]+>/g, "")}`,
          type: "press_mention",
          criterionIds: [3],
          deadline: null,
          url,
          effort: "low",
          raw: { published: e.published },
        });
      }
    }
    return out;
  },
};
