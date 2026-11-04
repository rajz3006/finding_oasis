import { resolveAuthMode, type AuthMode } from "./auth-core";

// Static env access so NEXT_PUBLIC_* gets inlined in edge middleware.
export function currentAuthMode(): AuthMode {
  return resolveAuthMode({
    NODE_ENV: process.env.NODE_ENV,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    allowedEmail: process.env.ALLOWED_EMAIL,
  });
}
