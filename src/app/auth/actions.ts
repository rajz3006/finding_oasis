"use server";
import { redirect } from "next/navigation";
import { currentAuthMode } from "@/lib/auth-env";
import { supabaseServer } from "@/lib/supabase/server";

export async function signOut() {
  const m = currentAuthMode();
  if (m.mode === "enforce") await (await supabaseServer(m.config)).auth.signOut();
  redirect("/login");
}
