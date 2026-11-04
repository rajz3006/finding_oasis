import { PageHeader } from "@/components/page-header";
import { ensureSeeded } from "@/lib/seed";
import { getProfile } from "@/lib/data/profile";
import { listChannels } from "@/lib/data/channels";
import { listReachMetrics } from "@/lib/data/reach";
import { PositioningForm } from "@/components/profile/positioning-form";
import { ChannelCard } from "@/components/brand/channel-card";
import { CHANNEL_TYPES, DEFAULT_CADENCE, STARTERS } from "@/components/brand/brand-data";
import { addChannel, addStarterChannels, savePositioning } from "./actions";
import { btnCls, btnPrimaryCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const [profile, channels, metrics] = await Promise.all([getProfile(), listChannels(), listReachMetrics()]);
  const have = new Set(channels.map((c) => c.name.toLowerCase()));
  const missing = STARTERS.filter((s) => !have.has(s.name.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader title="Brand">Own one narrow wedge, 2-3 pillars, and a repeatable cadence. Consistency over 12 months beats intensity over 12 weeks.</PageHeader>

      <section>
        <h2 className="mb-2 font-medium">Positioning, pillars &amp; cadence</h2>
        <PositioningForm action={savePositioning} positioning={profile.positioning} pillars={profile.pillars} cadenceNotes={profile.cadenceNotes || DEFAULT_CADENCE} />
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h2 className="font-medium">Channel sequencing</h2>
          <form action={addStarterChannels}>
            <button className={btnPrimaryCls} disabled={missing.length === 0}>Add recommended starter channels{missing.length ? ` (${missing.length})` : " (all added)"}</button>
          </form>
        </div>
        <ol className="max-w-3xl space-y-1 text-sm">
          {STARTERS.map((s) => (
            <li key={s.name} className={have.has(s.name.toLowerCase()) ? "text-zinc-400" : ""}>
              <span className="font-medium">{s.name}</span> <span className="text-xs">[{s.stage}]</span> - {s.note}. <span className="text-xs">Target: {s.kpi}</span>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-xs text-zinc-500">Don&apos;t open every channel at once. LinkedIn and X analytics are entered manually below.</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Channels &amp; reach</h2>
        {channels.length === 0 && <p className="text-sm text-zinc-500">No channels yet.</p>}
        {channels.map((c) => (
          <ChannelCard key={c.id} channel={c} metrics={metrics.filter((m) => m.channelId === c.id)} />
        ))}
        <form action={addChannel} className="grid max-w-3xl gap-2 rounded border border-dashed border-zinc-300 p-3 sm:grid-cols-5">
          <input name="name" required placeholder="Channel name" className={inputCls} />
          <select name="type" className={inputCls}>{CHANNEL_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select name="ownership" className={inputCls}><option>owned</option><option>earned</option></select>
          <input name="url" placeholder="url (optional)" className={inputCls} />
          <button className={btnCls}>Add channel</button>
        </form>
      </section>
    </div>
  );
}
