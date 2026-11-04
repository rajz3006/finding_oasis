# Deploying to Vercel + Supabase

Target: https://finding-oasis.vercel.app (single user). Nothing here was run against live Supabase/Vercel from the dev sandbox; follow the smoke tests at the end.

## 1. Supabase project
1. Create a project (note the DB password). Region close to your Vercel region.
2. Project Settings > API: copy **Project URL**, **anon key**, **service_role key** (secret).
3. Project Settings > Database > Connection string:
   - `DATABASE_URL`: Transaction pooler (port 6543), append `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: Session pooler or direct (port 5432), used only for migrations.
   Use the `postgres` user (role `postgres.<ref>` on the pooler); see RLS note below.

## 2. Migrations and bucket (run from your machine)
```bash
cp .env.example .env      # fill DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm i
npm run db:migrate        # prisma migrate deploy, uses DIRECT_URL
npm run storage:setup     # creates the private "evidence" bucket (idempotent; reads .env)
```
Migrations are **never** run by the Vercel build (build is `prisma generate && next build`). Run `npm run db:migrate` yourself before deploying a commit that adds a migration.

## 3. Supabase Auth (Authentication dashboard)
1. Sign In / Providers > Email: **Allow new users to sign up: off**.
2. Users > **Add user** with the exact `ALLOWED_EMAIL`, auto-confirm.
3. URL Configuration: Site URL `https://finding-oasis.vercel.app`; Redirect URLs `https://finding-oasis.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
4. Email Templates > Magic Link: include the code, e.g. `<p>Your code: {{ .Token }}</p>` (the login page accepts it if the link opens in another browser).
5. SMTP Settings: configure custom SMTP (the built-in mailer allows only a few emails/hour).

## 4. Vercel project
1. Add New > Project > import GitHub repo `rajz3006/finding_oasis`; Production Branch = your deploy branch (usually `main`).
2. Project name `finding-oasis` (gives finding-oasis.vercel.app; if taken, set a domain under Settings > Domains).
3. Framework Preset: Next.js. Build Command: `prisma generate && next build` (matches `npm run build`). Install: default. Do not add `db:migrate` to the build.
4. Environment Variables (Production; add Preview only if you want previews to work, they need the same Supabase redirect URLs):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | pooled, port 6543, `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | port 5432 (needed by the Prisma schema at generate time) |
| `NEXT_PUBLIC_SUPABASE_URL` | public; used by server and browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret, server only** |
| `SUPABASE_EVIDENCE_BUCKET` | optional, default `evidence` |
| `ALLOWED_EMAIL` | the single login email |
| `CRON_SECRET` | long random string (`openssl rand -hex 32`) |
| `GITHUB_TOKEN`, `PATENTSVIEW_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `ANALYTICS_*` | optional connector keys |

   Redeploy after changing env (NEXT_PUBLIC_ values are inlined at build time).
5. Deploy. If auth env is missing in production the whole app returns a 503 config-error page (fail closed).

## 5. Cron
`vercel.json` registers one job: `/api/cron/dispatch` daily at 07:00 UTC. Hobby allows 2 jobs, once per day, so a single dispatcher runs whichever sources are due within a ~50s budget. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Pro: raise `maxDuration` and add per-source jobs (see README).

## 6. First run
The first request seeds criteria, sources, venues and starter opportunities (`ensureSeeded`); `npm run seed` does the same from your machine. Then set your profile (field tags, ORCID) at `/profile`.

## 7. Smoke test
- [ ] `/` redirects to `/login`; `/api/sources` returns 401 when logged out.
- [ ] Request a code for `ALLOWED_EMAIL`, sign in via link or code; another email is rejected.
- [ ] Dashboard renders; add an opportunity and a pursuit; move it in the pipeline.
- [ ] Upload a small PDF (<4MB) in the evidence locker; open it (302 to signed URL); confirm bucket is private.
- [ ] `/api/export/dossier?format=pdf` and `/api/export/exhibit?format=zip` download when logged in, 401 when not.
- [ ] `curl -i https://finding-oasis.vercel.app/api/cron/dispatch` is 401; with `-H "Authorization: Bearer $CRON_SECRET"` is 200.
- [ ] Profile > run a keyless source (arXiv) and see results.

## 8. Troubleshooting
- **Prepared statement "s0" already exists / pgbouncer errors**: `DATABASE_URL` must be the 6543 pooler with `?pgbouncer=true`. Migrations must use `DIRECT_URL` (5432), never the transaction pooler.
- **Too many connections**: keep `connection_limit=1` on the pooled URL.
- **Upload fails with 413 / "too large"**: Vercel caps request bodies at 4.5MB; hosted uploads are limited to 4MB. Attach a link for bigger files.
- **Tables have RLS enabled (migration `enable_rls`) with no policies**: the Data API (anon key) sees nothing, which is intended. The app connects with the `postgres` role via Prisma, which bypasses RLS, and uses the service-role key for Storage. Do not connect Prisma as `anon`/`authenticated`.
- **503 "Configuration error" page**: one of `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAIL` is unset in the Production environment; the page lists which. Redeploy after fixing.
- **No login email**: SMTP not configured / rate limited; check Auth logs. Redirect loop: Site URL / Redirect URLs mismatch.
- **Cron 401**: `CRON_SECRET` not set on Vercel, or you called it without the bearer.
- **Cron 500/timeouts**: connectors need outbound network; check `/profile` source errors.

## 9. Rollback
- App: Vercel > Deployments > previous good deployment > Promote to Production (instant).
- Database: migrations are forward-only. Prefer a new corrective migration; for disasters restore from Supabase backups (Database > Backups; point-in-time needs a paid plan). Take a manual dump (`pg_dump "$DIRECT_URL"`) before applying a risky migration.
- Secrets: rotate `CRON_SECRET` / service-role key in both Supabase/Vercel and redeploy.
