import { NextResponse, type NextRequest } from "next/server";
import { currentAuthMode } from "@/lib/auth-env";
import { isAllowedEmail, safeNext } from "@/lib/auth-core";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Magic-link landing: exchange the PKCE code for a session, then re-check the email.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const m = currentAuthMode();
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?error=${e}`, origin));
  if (m.mode !== "enforce") return fail("config");
  const code = searchParams.get("code");
  if (!code) return fail("link");
  const supabase = await supabaseServer(m.config);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail("link");
  if (!isAllowedEmail(data.user?.email, m.config.allowedEmail)) {
    await supabase.auth.signOut();
    return fail("denied");
  }
  return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
}
