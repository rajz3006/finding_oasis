import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail, isPublicPath } from "@/lib/auth-core";
import { currentAuthMode } from "@/lib/auth-env";

// Gates everything except /login, /auth/callback, static assets and /api/cron/* (bearer auth in the route).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)"],
};

function configError(missing: string[], api: boolean) {
  if (api) return NextResponse.json({ error: "auth not configured", missing }, { status: 503 });
  const html = `<!doctype html><meta charset="utf-8"><title>Configuration error</title>
<body style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">
<h1>Configuration error</h1><p>Authentication is not configured, so access is blocked.</p>
<p>Missing environment variables: <code>${missing.join(", ")}</code></p></body>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

let warned = false;

export async function middleware(req: NextRequest) {
  const mode = currentAuthMode();
  const { pathname } = req.nextUrl;
  const api = pathname.startsWith("/api/");

  if (mode.mode === "open-dev") {
    if (!warned) {
      warned = true;
      console.warn("[auth] Supabase/ALLOWED_EMAIL not configured: allowing access (development only).");
    }
    return NextResponse.next();
  }
  if (mode.mode === "misconfigured") return configError(mode.missing, api);

  // Session refresh: cookies updated by Supabase must reach both request and response.
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(mode.config.url, mode.config.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const ok = isAllowedEmail(data.user?.email, mode.config.allowedEmail);

  if (isPublicPath(pathname)) return res;
  if (ok) return res;

  // Server actions and API calls get 401, pages get a redirect.
  if (api || req.headers.has("next-action")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
