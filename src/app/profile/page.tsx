import { PageHeader } from "@/components/page-header";
import { ensureSeeded } from "@/lib/seed";
import { getProfile } from "@/lib/data/profile";
import { listSources } from "@/lib/data/sources";
import { sourceHealth } from "@/lib/connectors/runner";
import { CONNECTORS } from "@/lib/connectors/registry";
import { runSourceNow, saveProfile } from "./actions";

export const dynamic = "force-dynamic";

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

      <div className="mb-8 flex items-center gap-2 text-sm">
        <span className="font-medium">Export evidence dossier</span>
        <a href="/api/export/dossier?format=csv" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">CSV</a>
        <a href="/api/export/dossier?format=pdf" className="rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100">PDF</a>
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
                  ) : (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">ok</span>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
