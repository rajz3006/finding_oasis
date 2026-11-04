import type { Reminders } from "@/lib/reminders";

export function RemindersPanel({ r }: { r: Reminders }) {
  if (!r.deadlines.length && !r.stale.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">Reminders</h2>
      <ul className="space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
        {r.deadlines.map((d) => (
          <li key={`d${d.id}`}>
            Deadline in {d.daysLeft}d: {d.title}
            {d.pursued ? "" : " (not shortlisted)"}
          </li>
        ))}
        {r.stale.map((s) => (
          <li key={`s${s.id}`}>
            Stale {s.daysIdle}d in {s.state}: {s.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
