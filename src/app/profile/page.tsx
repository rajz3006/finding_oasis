import { PageHeader } from "@/components/page-header";
import { ensureSeeded } from "@/lib/seed";
import { getProfile } from "@/lib/data/profile";
import { listSources } from "@/lib/data/sources";
import { sourceHealth } from "@/lib/connectors/runner";
import { CONNECTORS } from "@/lib/connectors/registry";
import { CONFIG_HINTS, RUNNER_KEYS } from "@/lib/connectors/config-hints";
import { parseJson } from "@/lib/json";
import { runSourceNow, saveProfile, saveSourceConfig } from "./actions";
import { PositioningForm } from "@/components/profile/positioning-form";
import { savePositioning } from "@/app/brand/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the "Run now" server action runs connectors (budgeted to 50s)

const input = "mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm";

export default async function Page() {
  await ensureSeeded();
  const [profile, sources] = await Promise.all([getProfile(), listSources()]);

  return (
    <div>
      <PageHeader title="Profile & Sources">Field scope and identifiers drive every connector.</PageHeader>

      <form action={saveProfile} className="mb-8 max-w-xl space-y-3 rounded border border-zinc-200 p-4">
        <h2 className="font-medium">Profile</h2>
        <label className="block text-sm">Name
          <input name="name" defaultValue={profile.name} className={input} />
        </label>
        <label className="block text-sm">ORCID iD
          <input name="orcid" defaultValue={profile.orcid} placeholder="0000-0000-0000-0000" className={input} />
        </label>
        <label className="block text-sm">Email (OpenAlex/Crossref polite pool)
          <input name="email" type="email" defaultValue={profile.email} className={input} />
        </label>
        <label className="block text-sm">Field tags (comma separated)
          <textarea name="fieldTags" rows={2} defaultValue={profile.fieldTags.join(", ")} className={input} />
        </label>
        <button className="rounded bg-zinc-900 px-3 py-1 text-sm text-white">Save</button>
      </form>

      <section className="mb-8">
        <h2 className="mb-2 font-medium">Brand positioning</h2>
        <PositioningForm action={savePositioning} positioning={profile.positioning} pillars={profile.pillars} cadenceNotes={profile.cadenceNotes} />
      </section>

      <div className="mb-8 flex items-center gap-2 text-sm">
        <span className="font-medium">Export evidence dossier</span>
        <a href="/api/export/dossier?format=csv" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">CSV</a>
        <a href="/api/export/dossier?format=pdf" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">PDF</a>
        <span className="ml-4 font-medium">Attorney exhibits</span>
        <a href="/api/export/exhibit?format=pdf" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">PDF</a>
        <a href="/api/export/exhibit?format=csv" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">CSV</a>
        <a href="/api/export/exhibit?format=zip" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">ZIP</a>
      </div>

      <h2 className="mb-2 font-medium">Sources</h2>
      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="py-1">Source</th><th>Access</th><th>Last run</th><th>Status</th><th />
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const h = sourceHealth(s);
            const runnable = !!CONNECTORS[s.name];
            return (
              <tr key={s.id} className="border-b align-top">
                <td className="py-2 font-medium">{s.name}</td>
                <td>{s.access}</td>
                <td>{s.lastRun ? s.lastRun.toISOString().slice(0, 16).replace("T", " ") : "never"}</td>
                <td>
                  {h.stale ? (
                    <span title={h.error} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      source stale{h.reason ? `: ${h.reason}` : ""}
                    </span>
                  ) : parseJson<{ skipped?: string }>(s.config, {}).skipped ? (
                    <span title={parseJson<{ skipped?: string }>(s.config, {}).skipped} className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      not configured
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">ok</span>
                  )}
                  {!h.stale && parseJson<{ skipped?: string }>(s.config, {}).skipped && (
                    <div className="mt-1 max-w-xs truncate text-xs text-zinc-500">{parseJson<{ skipped?: string }>(s.config, {}).skipped}</div>
                  )}
                  {h.error && <div className="mt-1 max-w-xs truncate text-xs text-zinc-500" title={h.error}>{h.error}</div>}
                </td>
                <td>
                  {runnable && (
                    <form action={runSourceNow}>
                      <input type="hidden" name="name" value={s.name} />
                      <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100">Run now</button>
                    </form>
                  )}
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-zinc-600">Edit config</summary>
                    <form action={saveSourceConfig} className="mt-1 w-72 space-y-1">
                      <input type="hidden" name="id" value={s.id} />
                      <textarea
                        name="config"
                        rows={5}
                        defaultValue={JSON.stringify(
                          Object.fromEntries(Object.entries(parseJson<Record<string, unknown>>(s.config, {})).filter(([k]) => !RUNNER_KEYS.includes(k))),
                          null,
                          2,
                        )}
                        className="w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                      />
                      {CONFIG_HINTS[s.name] && <div className="text-xs text-zinc-500">Keys: {CONFIG_HINTS[s.name]}</div>}
                      <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100">Save config</button>
                    </form>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
