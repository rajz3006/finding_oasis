import type { Connector } from "@/lib/connectors/types";
import { getText, parseFeed } from "@/lib/connectors/feed";
import { ensureChannel, upsertDailyMetric } from "@/lib/connectors/reach-sink";

// Records post count + latest title (cadence/output) on the newsletter Channel's ReachMetric notes.
export const newsletterRss: Connector = {
  name: "Newsletter RSS",
  async fetch(config, _scope, ctx) {
    const feedUrl = String(config.feedUrl ?? "").trim();
    if (!feedUrl) {
      ctx.note("skipped", "Set feedUrl in Source config");
      return [];
    }
    const posts = parseFeed(await getText(ctx.fetch, feedUrl)).filter((p) => p.title);
    const latest = posts[0];
    const ch = await ensureChannel("newsletter", String(config.channelName ?? "Newsletter"), feedUrl);
    await upsertDailyMetric(ch.id, { notes: `posts=${posts.length}; latest="${latest?.title ?? ""}"; latestDate=${latest?.published ?? ""}` });
    ctx.note("newsletterPosts", posts.length);
    ctx.note("newsletterLatest", latest?.title ?? null);
    return [];
  },
};
