"use server";
import { assertUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createRecommender, deleteRecommender, getRecommender, updateRecommender } from "@/lib/data/recommenders";
import { RECOMMENDER_STATUSES, isOneOf } from "@/lib/enums";
import { parseDate } from "@/lib/json";
import { snoozeDate } from "@/lib/recommender";

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const done = () => revalidatePath("/recommenders");

function fields(fd: FormData) {
  const status = s(fd, "status");
  return {
    role: s(fd, "role") ?? "",
    org: s(fd, "org") ?? "",
    relationship: s(fd, "relationship") ?? "",
    independent: fd.get("independent") === "on",
    status: isOneOf(RECOMMENDER_STATUSES, status) ? status : "identified",
    lastContacted: parseDate(s(fd, "lastContacted")),
    nextNudge: parseDate(s(fd, "nextNudge")),
    notes: s(fd, "notes"),
  };
}

export async function addRecommender(fd: FormData) {
  await assertUser();
  const name = s(fd, "name");
  if (!name) return;
  await createRecommender({ name, ...fields(fd) });
  done();
}
export async function saveRecommender(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  const name = s(fd, "name");
  if (!id || !name) return;
  await updateRecommender(id, { name, ...fields(fd) });
  done();
}
export async function removeRecommender(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  if (id) await deleteRecommender(id);
  done();
}
/** Mark contacted now and snooze the next nudge by N days (promotes identified -> contacted). */
export async function markContacted(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  const r = id ? await getRecommender(id) : null;
  if (!id || !r) return;
  const days = Number(s(fd, "days") ?? 14);
  const now = new Date();
  await updateRecommender(id, {
    lastContacted: now,
    nextNudge: snoozeDate(now, Number.isFinite(days) ? days : 14),
    status: r.status === "identified" ? "contacted" : undefined,
  });
  done();
}
export async function setStatus(fd: FormData) {
  await assertUser();
  const id = s(fd, "id");
  const status = s(fd, "status");
  if (!id || !isOneOf(RECOMMENDER_STATUSES, status)) return;
  // finished recommenders need no further nudges
  await updateRecommender(id, { status, nextNudge: status === "letter_received" || status === "declined" ? null : undefined });
  done();
}
