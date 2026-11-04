import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AvoidBadge, Pill, fmtDate } from "@/components/ui";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { parseIntArray, parseStringArray } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function Page() {
  await ensureSeeded();
  const [criteria, pursuits] = await Promise.all([
    db.criterion.findMany({ orderBy: { id: "asc" } }),
    db.pursuit.findMany({
      where: { state: { in: ["accepted", "completed"] } },
      include: { opportunity: { include: { venue: true } }, evidence: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <PageHeader title="Evidence locker">Proof artifacts by pursuit and by criterion.</PageHeader>
      <h2 className="mb-2 font-medium">By criterion (dossier)</h2>
      <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {criteria.map((c) => {
          const n = pursuits.filter((p) => parseIntArray(p.criterionIds).includes(c.id)).reduce((a, p) => a + p.evidence.length, 0);
          return (
            <Link key={c.id} href={`/evidence/criterion/${c.id}`} className="rounded border border-zinc-200 p-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <div className="font-medium">C{c.id}</div>
              <div className="line-clamp-2 text-xs text-zinc-500">{c.name}</div>
              <div className="mt-1 text-xs">{n} artifact{n === 1 ? "" : "s"}</div>
            </Link>
          );
        })}
      </div>
      <h2 className="mb-2 font-medium">By pursuit (accepted / completed)</h2>
      {pursuits.length === 0 && <p className="text-sm text-zinc-500">Nothing accepted or completed yet. Move a pursuit in the pipeline, or <Link href="/opportunities/achievement" className="underline">add an achievement</Link>.</p>}
      <ul className="space-y-2">
        {pursuits.map((p) => {
          const crit = parseIntArray(p.criterionIds);
          const items = new Set(crit.flatMap((id) => parseStringArray(criteria.find((c) => c.id === id)?.proofChecklist)));
          const done = [...items].filter((i) => p.evidence.some((e) => e.checklistItem === i)).length;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <Link href={`/evidence/pursuit/${p.id}`} className="font-medium hover:underline">{p.opportunity.title}</Link>
              <Pill>{p.state}</Pill>
              {p.completionProof ? <Pill>full credit</Pill> : <span className="text-xs font-medium text-amber-700 dark:text-amber-300">no completion proof{p.invitationProof ? " (0.3x)" : ""}</span>}
              {p.opportunity.venue?.avoidFlag && <AvoidBadge />}
              <span className="text-xs text-zinc-500">{crit.map((n) => `C${n}`).join(" ")} · {fmtDate(p.completedOn ?? p.decidedOn)}</span>
              <span className="ml-auto text-xs">{done}/{items.size} checklist · {p.evidence.length} artifacts</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
