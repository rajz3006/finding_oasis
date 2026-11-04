"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { movePursuit } from "@/app/pipeline/actions";

export interface Card {
  id: string;
  state: string;
  title: string;
  venue: string | null;
  tier: string | null;
  avoid: boolean;
  strength: string | null;
  criteria: number[];
  deadline: string | null;
  date: string | null;
  brand: number;
  brandEstimated: boolean;
  eb1a: number;
  penalized: boolean;
  invitation: boolean;
  completion: boolean;
}

const LANES = ["shortlisted", "applied", "accepted", "completed", "dropped"];

export function Kanban({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [over, setOver] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);

  function move(id: string, state: string) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.state === state) return;
    start(async () => {
      await movePursuit(id, state);
      if (state === "completed") setPrompt(id);
      else setPrompt((cur) => (cur === id ? null : cur));
      router.refresh();
    });
  }

  return (
    <div className={pending ? "opacity-70" : ""}>
      {prompt && (
        <div role="dialog" className="mb-4 flex items-center gap-3 rounded border border-emerald-400 bg-emerald-50 p-3 text-sm dark:bg-emerald-950">
          <span>
            Completed. Attach proof now?
            {!cards.find((c) => c.id === prompt)?.completion && (
              <strong className="ml-1 text-amber-700 dark:text-amber-300">
                No completion proof: invitation without completion proof gets 0.3x and is not full credit.
              </strong>
            )}
          </span>
          <Link href={`/evidence/pursuit/${prompt}`} className="font-medium underline">Open evidence checklist</Link>
          <button onClick={() => setPrompt(null)} className="ml-auto underline">Later</button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-5">
        {LANES.map((lane) => {
          const items = cards.filter((c) => c.state === lane);
          return (
            <section
              key={lane}
              onDragOver={(e) => { e.preventDefault(); setOver(lane); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData("text/plain"), lane); }}
              className={`min-h-40 rounded border p-2 ${over === lane ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-zinc-200 dark:border-zinc-800"}`}
            >
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{lane} ({items.length})</h2>
              <div className="space-y-2">
                {items.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className={`cursor-grab rounded border p-2 text-sm ${c.avoid ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"}`}
                  >
                    {c.avoid && <div className="mb-1 text-xs font-semibold text-red-600">AVOID: pay-to-play venue</div>}
                    <Link href={`/pipeline/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                    <div className="mt-1 text-xs text-zinc-500">
                      {c.venue ?? "no venue"}{c.tier ? ` · ${c.tier}` : ""}{c.strength ? ` · ${c.strength}` : ""}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {c.criteria.map((n) => `C${n}`).join(" ") || "no criteria"}
                      {c.deadline ? ` · due ${c.deadline}` : ""}{c.date ? ` · ${c.date}` : ""}
                    </div>
                    <div className="mt-1 flex gap-2 text-xs" title="Independent scores: never merged">
                      <span>Brand {c.brand}{c.brandEstimated ? "~" : ""}</span>
                      <span className={c.penalized ? "text-red-600" : ""}>EB-1A {c.eb1a}{c.penalized ? " (0.3x)" : ""}</span>
                    </div>
                    {c.state === "completed" && !c.completion && <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">No completion proof</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {LANES.filter((l) => l !== lane).map((l) => (
                        <button key={l} onClick={() => move(c.id, l)} title={`Move to ${l}`} className="rounded border border-zinc-300 px-1 text-[11px] hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                          {l.slice(0, 4)}
                        </button>
                      ))}
                      <Link href={`/evidence/pursuit/${c.id}`} className="px-1 text-[11px] underline">evidence</Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
