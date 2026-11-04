// Pure auth helpers (no Next/Supabase imports): safe for edge middleware and unit tests.

export interface AuthConfig {
  url: string;
  anonKey: string;
  allowedEmail: string;
}

export type AuthMode =
  | { mode: "enforce"; config: AuthConfig }
  | { mode: "open-dev" } // dev only, no env: allow with a warning
  | { mode: "misconfigured"; missing: string[] };

export function normalizeEmail(e: string | null | undefined): string {
  return (e ?? "").trim().toLowerCase();
}

/** True only when both sides are non-empty and equal (case-insensitive). */
export function isAllowedEmail(email: string | null | undefined, allowed: string | null | undefined): boolean {
  const a = normalizeEmail(allowed);
  const e = normalizeEmail(email);
  return a !== "" && e !== "" && e === a;
}

export interface AuthEnv {
  NODE_ENV?: string;
  url?: string;
  anonKey?: string;
  allowedEmail?: string;
}

/** Production fails closed on any missing var; development with none set runs open. */
export function resolveAuthMode(env: AuthEnv): AuthMode {
  const url = env.url?.trim() ?? "";
  const anonKey = env.anonKey?.trim() ?? "";
  const allowedEmail = normalizeEmail(env.allowedEmail);
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !allowedEmail && "ALLOWED_EMAIL",
  ].filter(Boolean) as string[];
  if (!missing.length) return { mode: "enforce", config: { url, anonKey, allowedEmail } };
  // Dev only when nothing is configured; a partial config is still an error.
  if (env.NODE_ENV !== "production" && missing.length === 3) return { mode: "open-dev" };
  return { mode: "misconfigured", missing };
}

/** Only same-origin relative paths; blocks open redirects like //evil.com or /\evil.com. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/** Paths reachable without a session (the cron routes are excluded by the middleware matcher). */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/auth/callback";
}
