import { NextResponse } from "next/server";
import { currentAuthMode } from "./auth-env";
import { isAllowedEmail } from "./auth-core";
import { supabaseServer } from "./supabase/server";

let warned = false;

/**
 * Defense in depth for route handlers (middleware already gates everything).
 * Returns a Response to send back when access is denied, else null.
 *   const deny = await requireUser(); if (deny) return deny;
 */
export async function requireUser(): Promise<NextResponse | null> {
  const m = currentAuthMode();
  if (m.mode === "open-dev") {
    if (!warned) {
      warned = true;
      console.warn("[auth] Supabase/ALLOWED_EMAIL not configured: allowing access (development only).");
    }
    return null;
  }
  if (m.mode === "misconfigured") {
    return NextResponse.json({ error: "auth not configured", missing: m.missing }, { status: 503 });
  }
  const supabase = await supabaseServer(m.config);
  const { data } = await supabase.auth.getUser();
  if (!isAllowedEmail(data.user?.email, m.config.allowedEmail)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Guard for server actions (defense in depth; middleware already covers them). Throws when denied. */
export async function assertUser(): Promise<void> {
  const deny = await requireUser();
  if (deny) throw new Error(deny.status === 503 ? "Auth not configured" : "Unauthorized");
}
