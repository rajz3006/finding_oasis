"use server";
import { assertUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteEvidenceFile, saveEvidenceFile } from "@/lib/evidence";
import { EVIDENCE_KINDS, isOneOf } from "@/lib/enums";
import { parseProofs } from "@/lib/pursuit-input";

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/** Add evidence: uploaded file wins, else the pasted link/metric value. */
export async function addEvidence(fd: FormData) {
  await assertUser();
  const pursuitId = s(fd, "pursuitId");
  if (!pursuitId || !(await db.pursuit.findUnique({ where: { id: pursuitId } }))) return;
  const checklistItem = s(fd, "checklistItem");
  const kindIn = s(fd, "kind");
  const file = fd.get("file");
  let kind = isOneOf(EVIDENCE_KINDS, kindIn) ? kindIn : "link";
  let value = s(fd, "value");
  if (file instanceof File && file.size > 0) {
    value = await saveEvidenceFile(file, pursuitId);
    if (kind === "link" || kind === "metric") kind = "file";
  }
  if (!value) return;
  await db.evidence.create({
    data: { pursuitId, kind, value, label: s(fd, "label") ?? checklistItem ?? "Evidence", checklistItem },
  });
  revalidatePath(`/evidence/pursuit/${pursuitId}`);
  revalidatePath("/evidence");
}

export async function removeEvidence(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  if (!id) return;
  const ev = await db.evidence.findUnique({ where: { id } });
  if (!ev) return;
  await db.evidence.delete({ where: { id } });
  // Only uploaded files live under evidence/; links/metrics are plain values.
  if (ev.kind !== "link" && ev.kind !== "metric" && !/^https?:/i.test(ev.value)) {
    try { await deleteEvidenceFile(ev.value); } catch { /* already gone or invalid */ }
  }
  revalidatePath(`/evidence/pursuit/${ev.pursuitId}`);
  revalidatePath("/evidence");
}

/** User-confirmed corroboration proofs (suggested from attached evidence). */
export async function saveProofs(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  if (!id || !(await db.pursuit.findUnique({ where: { id } }))) return;
  const p = parseProofs(fd);
  await db.pursuit.update({ where: { id }, data: { invitationProof: p.invitation, completionProof: p.completion, thirdPartyProof: p.thirdParty } });
  revalidatePath(`/evidence/pursuit/${id}`);
  revalidatePath("/evidence");
  revalidatePath("/pipeline");
}
