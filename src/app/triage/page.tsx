import { PageHeader } from "@/components/page-header";
import { listVenue } from "@/lib/data";
import { ensureSeeded } from "@/lib/seed";
import { QUALITY_TIERS } from "@/lib/enums";
import { markAvoid, triageVenue } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const venues = await listVenue({ where: { qualityTier: "unrated", avoidFlag: false } });
  const tiers = QUALITY_TIERS.filter((t) => t !== "unrated");
  return (
    <>
      <PageHeader title="Triage">Venues not matched by the seed catalog. Rate them or flag them to avoid.</PageHeader>
      {venues.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing to triage.</p>
      ) : (
        <ul className="space-y-2">
          {venues.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <div className="min-w-48 flex-1">
                <div className="font-medium">{v.name}</div>
                <div className="text-zinc-500">
                  {v.kind}
                  {v.homepage && (
                    <>
                      {" - "}
                      <a href={v.homepage} className="underline" target="_blank" rel="noreferrer">
                        {v.homepage}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <form action={triageVenue} className="flex items-center gap-2">
                <input type="hidden" name="id" value={v.id} />
                <select name="tier" defaultValue="T2" className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700">
                  {tiers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="avoid" /> avoid
                </label>
                <button className="rounded bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900">Save</button>
              </form>
              <form action={markAvoid}>
                <input type="hidden" name="id" value={v.id} />
                <button className="rounded border border-red-400 px-3 py-1 text-red-700 dark:text-red-300">Avoid</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
