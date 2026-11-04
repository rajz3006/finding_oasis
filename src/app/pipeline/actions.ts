"use server";
import { assertUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PURSUIT_STATES, STRENGTHS, isOneOf } from "@/lib/enums";
import { parseDate, serializeIntArray } from "@/lib/json";
import { parseBrand, parseIndependenceInput, parseProofs, type ScoreView } from "@/lib/pursuit-input";
import { scoreView } from "@/lib/pursuit-view";

/** Move a pursuit to a new state and stamp the matching date column. */
export async function movePursuit(id: string, state: string) {
  await assertUser();
  if (!isOneOf(PURSUIT_STATES, state)) return;
  const p = await db.pursuit.findUnique({ where: { id } });
  if (!p) return;
  const now = new Date();
  const data: Record<string, unknown> = { state };
  if (state === "applied") data.appliedOn = p.appliedOn ?? now;
  if (state === "accepted") data.decidedOn = p.decidedOn ?? now;
  if (state === "completed") {
    data.completedOn = p.completedOn ?? now;
    data.decidedOn = p.decidedOn ?? now;
  }
  await db.pursuit.update({ where: { id }, data });
  revalidatePath("/pipeline");
  revalidatePath("/evidence");
}

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function savePursuit(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  if (!id) return;
  const state = s(fd, "state");
  const strength = s(fd, "strength");
  const proofs = parseProofs(fd);
  await db.pursuit.update({
    where: { id },
    data: {
      state: isOneOf(PURSUIT_STATES, state) ? state : undefined,
      strength: isOneOf(STRENGTHS, strength) ? strength : null,
      criterionIds: serializeIntArray(fd.getAll("criterionIds").map(Number).filter((n) => n >= 1 && n <= 10)),
      appliedOn: parseDate(s(fd, "appliedOn")),
      decidedOn: parseDate(s(fd, "decidedOn")),
      completedOn: parseDate(s(fd, "completedOn")),
      notes: s(fd, "notes"),
      brandScore: parseBrand(fd.get("brandScore")),
      independence: parseIndependenceInput(fd.get("independence")),
      invitationProof: proofs.invitation,
      completionProof: proofs.completion,
      thirdPartyProof: proofs.thirdParty,
    },
  });
  revalidatePath("/pipeline");
  revalidatePath("/evidence");
  redirect("/pipeline");
}

/** Live preview of both scores for unsaved form values (never merged). */
export async function previewScores(
  id: string,
  v: { brand: string; independence: string; invitation: boolean; completion: boolean; thirdParty: boolean },
): Promise<ScoreView | null> {
  await assertUser();
  const p = await db.pursuit.findUnique({ where: { id }, include: { opportunity: { include: { venue: true } } } });
  if (!p) return null;
  const draft = {
    ...p,
    brandScore: parseBrand(v.brand),
    independence: parseIndependenceInput(v.independence),
    invitationProof: !!v.invitation,
    completionProof: !!v.completion,
    thirdPartyProof: !!v.thirdParty,
  };
  return scoreView(draft, p.opportunity, p.opportunity.venue);
}
