"use server";
import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/data/profile";
import { runConnector } from "@/lib/connectors/runner";

export async function saveProfile(formData: FormData) {
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
  await runConnector(String(formData.get("name") ?? ""));
  revalidatePath("/profile");
  revalidatePath("/opportunities");
}
