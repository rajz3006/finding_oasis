"use server";
import { assertUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/data/profile";
import { getSource, updateSource } from "@/lib/data/sources";
import { parseJson, toJson } from "@/lib/json";
import { RUNNER_KEYS } from "@/lib/connectors/config-hints";
import { runConnector } from "@/lib/connectors/runner";

export async function saveProfile(formData: FormData) {
  await assertUser();
  const tags = String(formData.get("fieldTags") ?? "").split(/[,\n]/);
  await updateProfile({
    name: String(formData.get("name") ?? ""),
    orcid: String(formData.get("orcid") ?? ""),
    email: String(formData.get("email") ?? ""),
    fieldTags: tags,
  });
  revalidatePath("/profile");
}

export async function runSourceNow(formData: FormData) {
  await assertUser();
  await runConnector(String(formData.get("name") ?? ""));
  revalidatePath("/profile");
  revalidatePath("/opportunities");
}

// Validate JSON server-side; keep runner-managed keys (status, lastError, ...) and note-keys not in the edit.
export async function saveSourceConfig(formData: FormData): Promise<void> {
  await assertUser();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("config") ?? "").trim() || "{}";
  const src = await getSource(id);
  if (!src) return;
  let next: unknown;
  try { next = JSON.parse(raw); } catch { throw new Error("Config is not valid JSON"); }
  if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error("Config must be a JSON object");
  const old = parseJson<Record<string, unknown>>(src.config, {});
  const merged: Record<string, unknown> = { ...(next as Record<string, unknown>) };
  for (const k of RUNNER_KEYS) if (k in old) merged[k] = old[k];
  await updateSource(id, { config: toJson(merged) });
  revalidatePath("/profile");
}
