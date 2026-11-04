import { PageHeader } from "@/components/page-header";
import { RecommenderForm } from "@/components/recommenders/recommender-form";
import { Badge, btnCls, fmtDate, label } from "@/components/ui";
import { dueRecommenderNudges, listRecommenders } from "@/lib/data/recommenders";
import { RECOMMENDER_STATUSES } from "@/lib/enums";
import { independenceSummary, NEXT_STATUS } from "@/lib/recommender";
import { ensureSeeded } from "@/lib/seed";
import { addRecommender, markContacted, removeRecommender, saveRecommender, setStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  identified: "bg-zinc-100 text-zinc-700",
  contacted: "bg-sky-100 text-sky-800",
  agreed: "bg-amber-100 text-amber-800",
  letter_received: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

function ContactedForm({ id, days = 14 }: { id: string; days?: number }) {
  return (
    <form action={markContacted} className="flex items-center gap-1 text-xs">
      <input type="hidden" name="id" value={id} />
      <button className={btnCls}>Mark contacted</button>
      <span>+</span>
      <input type="number" name="days" min={1} defaultValue={days} className="w-14 rounded border border-zinc-300 px-1 py-0.5" />
      <span>days</span>
    </form>
  );
}

export default async function Page() {
  await ensureSeeded();
  const [recs, due] = await Promise.all([listRecommenders(), dueRecommenderNudges()]);
  const sum = independenceSummary(recs);

  return (
    <div className="space-y-8">
      <PageHeader title="Recommenders">Letter-writers pipeline. Independent, disinterested letters outweigh coauthor and employer letters.</PageHeader>

      <section className="rounded border border-zinc-200 p-4 text-sm dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Independence ratio</span>
          <span className="text-lg font-semibold">{sum.total ? `${Math.round(sum.ratio * 100)}%` : "n/a"}</span>
          <span className="text-zinc-500">{sum.independent} of {sum.total} active recommenders independent</span>
        </div>
        {sum.warn && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-amber-800">{sum.message}</p>}
        <p className="mt-3 text-xs text-zinc-500">
          Exhibits for counsel: <a className="underline" href="/api/export/exhibit?format=pdf">PDF</a> · <a className="underline" href="/api/export/exhibit?format=csv">CSV</a> · <a className="underline" href="/api/export/exhibit?format=zip">ZIP with evidence</a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Due nudges ({due.length})</h2>
        {!due.length && <p className="text-sm text-zinc-500">Nothing due.</p>}
        <ul className="space-y-2">
          {due.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-zinc-900">
              <span><b>{r.name}</b> {r.org && `(${r.org})`} · {label(r.status)} · due {fmtDate(r.nextNudge)}</span>
              <ContactedForm id={r.id} />
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        {RECOMMENDER_STATUSES.map((st) => {
          const col = recs.filter((r) => r.status === st);
          return (
            <div key={st} className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
              <h3 className="mb-2 text-sm font-medium">{label(st)} ({col.length})</h3>
              <div className="space-y-2">
                {col.map((r) => (
                  <div key={r.id} className="rounded border border-zinc-200 p-2 text-xs dark:border-zinc-700">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-zinc-500">{[r.role, r.org].filter(Boolean).join(", ")}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge className={r.independent ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}>{r.independent ? "independent" : "not independent"}</Badge>
                      <Badge className={STATUS_CLS[r.status]}>{label(r.status)}</Badge>
                    </div>
                    <div className="mt-1 text-zinc-500">last {fmtDate(r.lastContacted)} · nudge {fmtDate(r.nextNudge)}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {NEXT_STATUS[r.status] && (
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={NEXT_STATUS[r.status]} />
                          <button className={btnCls}>to {label(NEXT_STATUS[r.status])}</button>
                        </form>
                      )}
                      {r.status !== "declined" && r.status !== "letter_received" && (
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="declined" />
                          <button className={btnCls}>declined</button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-2 font-medium">All recommenders</h2>
        <div className="space-y-2">
          {recs.map((r) => (
            <details key={r.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
              <summary className="cursor-pointer text-sm"><b>{r.name}</b> · {label(r.status)}{r.notes ? ` · ${r.notes.slice(0, 60)}` : ""}</summary>
              <div className="mt-3 space-y-3">
                <RecommenderForm action={saveRecommender} rec={r} submit="Save" />
                <div className="flex flex-wrap gap-3">
                  <ContactedForm id={r.id} />
                  <form action={removeRecommender}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className={btnCls}>Delete</button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-2 font-medium">Add recommender</h2>
        <RecommenderForm action={addRecommender} submit="Add" />
      </section>
    </div>
  );
}
