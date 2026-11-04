"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isOneOf, QUALITY_TIERS } from "@/lib/enums";

/** Set tier (and optionally avoid) on a venue from the triage list. */
export async function triageVenue(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tier = formData.get("tier");
  const avoid = formData.get("avoid") === "on";
  if (!id || !isOneOf(QUALITY_TIERS, tier)) return;
  await db.venue.update({ where: { id }, data: { qualityTier: tier, avoidFlag: avoid } });
  revalidatePath("/triage");
  revalidatePath("/");
}

/** Flag a venue as avoid (leaves the triage queue). */
export async function markAvoid(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.venue.update({ where: { id }, data: { avoidFlag: true } });
  revalidatePath("/triage");
  revalidatePath("/");
}
