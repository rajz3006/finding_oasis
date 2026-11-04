import type { Evidence } from "@prisma/client";
import { removeEvidence } from "@/app/evidence/actions";
import { Pill, btnCls, fmtDate } from "@/components/ui";

const isUrl = (v: string) => /^https?:\/\//i.test(v);

export function EvidenceRow({ ev, extra }: { ev: Evidence; extra?: React.ReactNode }) {
  const href = isUrl(ev.value) ? ev.value : ev.kind === "metric" ? null : `/api/evidence/${ev.value.split("/").map(encodeURIComponent).join("/")}`;
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <Pill>{ev.kind}</Pill>
      <span className="font-medium">{ev.label}</span>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="break-all underline">{isUrl(ev.value) ? ev.value : "open file"}</a> : <span>{ev.value}</span>}
      <span className="text-xs text-zinc-500">{fmtDate(ev.createdAt)}</span>
      {extra}
      <form action={removeEvidence} className="ml-auto">
        <input type="hidden" name="id" value={ev.id} />
        <button className={btnCls + " !px-2 !py-0.5 text-xs"}>Delete</button>
      </form>
    </li>
  );
}
