import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AuthConfig } from "@/lib/auth-core";

/** Supabase client bound to the request cookies (route handlers, server actions, pages). */
export async function supabaseServer(cfg: AuthConfig) {
  const store = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}
