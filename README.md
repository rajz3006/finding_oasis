# EB-1A Tracker

A lean, single-user, web app to build an EB-1A profile from zero — find selective
opportunities, map them to the 10 criteria, score venue quality, and keep the proof.

Field scope: **data engineering / data product management**. Owner is starting with no evidence yet.

## Quickstart
```bash
# needs Postgres: Supabase, or local e.g. docker run -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
cp .env.example .env     # set DATABASE_URL + DIRECT_URL (same URL locally); leave Supabase/ALLOWED_EMAIL empty for open local dev
npm i                    # also runs prisma generate
npm run db:migrate       # apply migrations (db:push for throwaway dev DBs)
npm run seed             # criteria, sources, venues, starter opportunities (also auto-runs on first request)
npm run dev              # http://localhost:3000
```
Other scripts: `npm run build && npm start`, `npm test`, `npm run typecheck`, `npm run lint`,
`npm run connector -- <name>` (run one connector), `npm run cron` (scheduled connector runs).

## Features
- Opportunity catalog with venue quality tiers/avoid flags, mapped to the 10 EB-1A criteria
- Pipeline (shortlist -> applied -> accepted -> completed -> dropped), evidence locker, achievement logging
- Coverage dashboard, nearest-wins and deadline reminders; triage of connector-discovered items
- **v2 dual scoring**: each pursuit gets a criterion-satisfaction score and a final-merits score (rubrics in `src/lib/rubric.ts`), with corroboration
- **Readiness gates** on the dashboard: per-criterion readiness derived from evidence quality, not just counts
- **Brand** (`/brand`): channels, reach metrics over time, positioning, pillars, cadence notes
- **Recommenders** (`/recommenders`): lightweight CRM for recommendation-letter writers
- **Exhibit export** for the attorney: `/api/export/exhibit?format=pdf|csv|zip`
- Dossier export: `/api/export/dossier?format=csv|pdf`
- Profile screen: field tags, ORCID, positioning, and per-source **Edit config** (JSON, validated server-side; runner-managed keys such as `status`/`lastError` are preserved)

## Connectors
Opportunity: developers.events, OpenAlex, Crossref, DOAJ, GitHub issues, arXiv, NSF Awards, GDELT, Google Alerts.
Metrics/reach: ORCID, Semantic Scholar, PatentsView, GitHub Profile, Site Analytics (Plausible/Umami), Newsletter RSS.
Per-source config keys are listed under "Edit config" on `/profile`.

Env vars (`.env.example`; deployment steps in `DEPLOY.md`): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `SUPABASE_EVIDENCE_BUCKET`, `ALLOWED_EMAIL`, `CRON_SECRET`, `PATENTSVIEW_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `GITHUB_TOKEN`,
`ANALYTICS_BASE_URL`, `ANALYTICS_SITE_ID`, `ANALYTICS_TOKEN`. Keyless: arXiv, NSF, GDELT, RSS feeds.

## Limitations
- Live connectors are **unverified against the live APIs**; endpoints/fields may need adjusting
  (GDELT and arXiv are rate-limited, so runs are deliberately slow).
- Site Analytics needs a self-hosted/own Plausible or Umami instance; Google Alerts feeds must be created by hand.
- Single-user. Auth is Supabase email OTP restricted to ALLOWED_EMAIL (see "Auth and cron on Vercel"); with no Supabase env in development, access is open. Seed venue data and tiers are curated starting points - verify before relying on them.
- Scores are self-assessed heuristics, not a USCIS determination. Not legal advice.

## What's here
- `CLAUDE.md` — the build brief for the agent (read first).
- `prisma/schema.prisma` — the six-entity data model.
- `seed/criteria.json` — the 10 criteria, proof checklists, and which are buildable from zero.
- `seed/venues.seed.json` — curated, domain-scoped venues with quality tiers and criterion maps.
- `seed/avoid-list.json` — pay-to-play / low-value patterns to flag.

## Full plan
The complete product/architecture/UI plan lives in the EB-1A Build Plan doc these files were
generated from. Verify API endpoints, acceptance rates, and venue details at build time.

## Evidence storage

- Local dev: files go to `./evidence` (override with `EVIDENCE_DIR`), up to 25MB.
- Hosted: with `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY` set, files go to a private Supabase Storage bucket (`SUPABASE_EVIDENCE_BUCKET`, default `evidence`). Create it once with `npm run storage:setup`.
- Hosted uploads are limited to **4MB** (Vercel's 4.5MB request body cap); larger files get a clear error: attach a link instead.
- `/api/evidence/...` sits behind the auth middleware and 302-redirects to a 60s signed URL; the bucket is never public. Non-image/PDF/text types are served as attachments.

## Auth and cron on Vercel

**Auth** (`src/middleware.ts`): everything except `/login`, `/auth/callback`, static assets and `/api/cron/*` requires a Supabase session whose email equals `ALLOWED_EMAIL`. API routes call `requireUser()` and server actions call `assertUser()` (both pass with a warning when auth is unconfigured in dev). In production, missing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `ALLOWED_EMAIL` blocks the whole app with a 503 config-error page. In development with none set, access is open (console warning).

Supabase dashboard (owner):
1. Authentication > Sign In / Providers > **Allow new users to sign up: off**. Then Authentication > Users > **Add user** (create user, auto-confirm) with the `ALLOWED_EMAIL` address. The app sends OTPs with `shouldCreateUser: false`.
2. Authentication > URL Configuration: Site URL `https://finding-oasis.vercel.app`; Redirect URLs `https://finding-oasis.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
3. Authentication > Email Templates > Magic Link: include the code, e.g. add `<p>Code: {{ .Token }}</p>` (the login page accepts the code if the link is opened in another browser/device).
4. The built-in mailer is heavily rate limited (a few emails/hour, team addresses only). Configure custom SMTP (Authentication > SMTP Settings) for reliable delivery.
5. Vercel env: the Supabase vars above, `ALLOWED_EMAIL`, `CRON_SECRET` (long random string), plus `DATABASE_URL`/`DIRECT_URL`.

**Cron**: Vercel has no node-cron. `vercel.json` registers one daily job (Hobby allows max 2 jobs, once per day) hitting `/api/cron/dispatch` with `Authorization: Bearer $CRON_SECRET` (Vercel adds it automatically when `CRON_SECRET` is set). The dispatcher (`src/lib/cron-dispatch.ts`) picks sources due by cadence (`src/lib/cron-schedule.ts`), runs them in order within a ~50s budget (`maxDuration = 60`), and defers the rest to the next day. Connectors stop at throttle waits that would overrun the budget and save partial results (`partial: true`, retried next dispatch). Failed sources are retried the next day.
On Pro, raise `maxDuration` (and `DEFAULT_BUDGET_MS`) and add per-source jobs, e.g. `{ "path": "/api/cron/GitHub", "schedule": "0 7 * * *" }` (URL-encode spaces: `/api/cron/GitHub%20Profile`); cadences are in `SCHEDULE`. `npm run cron` still works locally.
