import { db } from "@/lib/db";
import { parseStringArray, serializeStringArray } from "@/lib/json";

export const DEFAULT_FIELD_TAGS = ["data engineering", "data product management", "analytics", "data management"];

export interface ProfileData {
  name: string;
  orcid: string;
  email: string;
  fieldTags: string[];
  positioning: string;
  pillars: string[];
  cadenceNotes: string;
}

function toData(p: {
  name: string; orcid: string; email: string; fieldTags: string;
  positioning: string | null; pillars: string; cadenceNotes: string | null;
}): ProfileData {
  return {
    name: p.name, orcid: p.orcid, email: p.email, fieldTags: parseStringArray(p.fieldTags),
    positioning: p.positioning ?? "", pillars: parseStringArray(p.pillars), cadenceNotes: p.cadenceNotes ?? "",
  };
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
  if (patch.positioning !== undefined) data.positioning = patch.positioning.trim();
  if (patch.pillars !== undefined) data.pillars = serializeStringArray([...new Set(patch.pillars.map((t) => t.trim()).filter(Boolean))]);
  if (patch.cadenceNotes !== undefined) data.cadenceNotes = patch.cadenceNotes.trim();
  const p = await db.profile.upsert({ where: { id: "me" }, create: { id: "me", ...data }, update: data });
  return toData(p);
}
