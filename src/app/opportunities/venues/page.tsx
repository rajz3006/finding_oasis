import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { VenueFields } from "@/components/opportunities/venue-fields";
import { AvoidBadge, Pill, TierBadge, btnPrimaryCls, label } from "@/components/ui";
import { ensureSeeded } from "@/lib/seed";
import { db } from "@/lib/db";
import { getVenue } from "@/lib/data";
import { saveVenue } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await ensureSeeded();
  const { edit } = await searchParams;
  const venues = await db.venue.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { opportunities: true } } } });
  const editing = edit ? await getVenue(edit) : null;
  return (
    <>
      <PageHeader title="Venues">{venues.length} venues. <Link href="/opportunities" className="underline">Back to opportunities</Link></PageHeader>
      <form action={saveVenue} className="mb-8 max-w-3xl space-y-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">{editing ? `Edit ${editing.name}` : "Add venue"}</h2>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <VenueFields venue={editing} key={editing?.id ?? "new"} />
        <button className={btnPrimaryCls}>Save venue</button>
      </form>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {venues.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-medium">{v.name}</span>
            <Pill>{label(v.kind)}</Pill>
            <TierBadge tier={v.qualityTier} />
            {v.avoidFlag && <AvoidBadge />}
            <span className="text-zinc-500">{v._count.opportunities} opps</span>
            <Link href={`/opportunities/venues?edit=${v.id}`} className="ml-auto underline">edit</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
