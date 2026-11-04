"use server";
import { redirect } from "next/navigation";
import { currentAuthMode } from "@/lib/auth-env";
import { isAllowedEmail, normalizeEmail, safeNext } from "@/lib/auth-core";
import { supabaseServer } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";

function enforced() {
  const m = currentAuthMode();
  return m.mode === "enforce" ? m.config : null;
}

/** Step 1: email a magic link + 6-digit code. Same response whether or not the email is allowed. */
export async function sendLink(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const next = safeNext(String(formData.get("next") ?? ""));
  const cfg = enforced();
  if (!cfg) redirect("/login?error=config");
  if (isAllowedEmail(email, cfg.allowedEmail)) {
    const supabase = await supabaseServer(cfg);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) console.error("[auth] signInWithOtp:", error.message);
  }
  redirect(`/login?sent=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

/** Step 2 (alternative to the link): verify the emailed code. */
export async function verifyCode(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").replace(/\s+/g, "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const cfg = enforced();
  if (!cfg) redirect("/login?error=config");
  if (isAllowedEmail(email, cfg.allowedEmail) && /^\d{6,10}$/.test(token)) {
    const supabase = await supabaseServer(cfg);
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (!error && isAllowedEmail(data.user?.email, cfg.allowedEmail)) redirect(next);
    if (!error) await supabase.auth.signOut();
  }
  redirect(`/login?sent=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}&error=code`);
}

/** Password sign-in (primary). Same generic error whether the email is disallowed or the password is wrong. */
export async function signInWithPassword(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const cfg = enforced();
  if (!cfg) redirect("/login?error=config");
  if (isAllowedEmail(email, cfg.allowedEmail) && password) {
    const supabase = await supabaseServer(cfg);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && isAllowedEmail(data.user?.email, cfg.allowedEmail)) redirect(next);
    if (!error) await supabase.auth.signOut();
  }
  redirect(`/login?error=password&next=${encodeURIComponent(next)}`);
}
