import { db } from "@/lib/db";
import { parseStringArray, serializeStringArray } from "@/lib/json";

export const DEFAULT_FIELD_TAGS = ["data engineering", "data product management", "analytics", "data management"];

export interface ProfileData {
  name: string;
  orcid: string;
  email: string;
  fieldTags: string[];
}

function toData(p: { name: string; orcid: string; email: string; fieldTags: string }): ProfileData {
  return { name: p.name, orcid: p.orcid, email: p.email, fieldTags: parseStringArray(p.fieldTags) };
}

/** Returns the single profile row, creating it with defaults if missing. */
export async function getProfile(): Promise<ProfileData> {
  const p = await db.profile.upsert({ where: { id: "me" }, create: { id: "me" }, update: {} });
  return toData(p);
}

export async function updateProfile(patch: Partial<ProfileData>): Promise<ProfileData> {
  const data: Record<string, string> = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.orcid !== undefined) data.orcid = patch.orcid.trim();
  if (patch.email !== undefined) data.email = patch.email.trim();
  if (patch.fieldTags !== undefined) {
    const tags = [...new Set(patch.fieldTags.map((t) => t.trim()).filter(Boolean))];
    data.fieldTags = serializeStringArray(tags);
  }
  const p = await db.profile.upsert({ where: { id: "me" }, create: { id: "me", ...data }, update: data });
  return toData(p);
}
