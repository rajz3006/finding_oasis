"use server";
import { assertUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/data/profile";
import { createChannel, deleteChannel, listChannels, updateChannel } from "@/lib/data/channels";
import { createReachMetric, deleteReachMetric, updateReachMetric } from "@/lib/data/reach";
import { STARTERS } from "@/components/brand/brand-data";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => { const n = Number(s(fd, k)); return Number.isFinite(n) ? n : 0; };
const done = () => { revalidatePath("/brand"); revalidatePath("/profile"); revalidatePath("/"); };

export async function savePositioning(fd: FormData) {
  await assertUser();
  await updateProfile({
    positioning: s(fd, "positioning"),
    pillars: s(fd, "pillars").split("\n"),
    cadenceNotes: s(fd, "cadenceNotes"),
  });
  done();
}

export async function addChannel(fd: FormData) {
  await assertUser();
  const name = s(fd, "name");
  if (!name) return;
  await createChannel({ name, type: s(fd, "type") || "site", ownership: s(fd, "ownership") === "earned" ? "earned" : "owned", url: s(fd, "url") || null });
  done();
}

export async function saveChannel(fd: FormData) {
  await assertUser();
  const name = s(fd, "name");
  if (!name) return;
  await updateChannel(s(fd, "id"), { name, type: s(fd, "type"), ownership: s(fd, "ownership") === "earned" ? "earned" : "owned", url: s(fd, "url") || null });
  done();
}

export async function removeChannel(fd: FormData) {
  await assertUser();
  await deleteChannel(s(fd, "id"));
  done();
}

/** Idempotent: creates only starter channels whose name is missing. */
export async function addStarterChannels() {
  await assertUser();
  const have = new Set((await listChannels()).map((c) => c.name.toLowerCase()));
  for (const st of STARTERS) {
    if (!have.has(st.name.toLowerCase())) await createChannel({ name: st.name, type: st.type, ownership: st.ownership });
  }
  done();
}

function metricData(fd: FormData) {
  const d = new Date(`${s(fd, "date")}T00:00:00Z`);
  return {
    date: Number.isNaN(d.getTime()) ? new Date() : d,
    followers: Math.round(num(fd, "followers")), impressions: Math.round(num(fd, "impressions")),
    engagementRate: num(fd, "engagementRate"), inboundCount: Math.round(num(fd, "inboundCount")),
    notes: s(fd, "notes") || null,
  };
}

export async function addMetric(fd: FormData) {
  await assertUser();
  await createReachMetric({ channelId: s(fd, "channelId"), ...metricData(fd) });
  done();
}
export async function saveMetric(fd: FormData) {
  await assertUser();
  await updateReachMetric(s(fd, "id"), metricData(fd));
  done();
}
export async function removeMetric(fd: FormData) {
  await assertUser();
  await deleteReachMetric(s(fd, "id"));
  done();
}
