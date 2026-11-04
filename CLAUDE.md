# CLAUDE.md — EB-1A Tracker

Guidance for the Claude Code orchestrator building this project. Read this first.

## What this is
A **lean, single-user** web app (local or hosted on Vercel + Supabase) that helps one person (the owner) build an EB-1A
("extraordinary ability") immigration profile from scratch. It finds selective opportunities,
maps each to the 10 regulatory criteria, scores venue quality, and stores the proof.

It is **not** a product: no other users, no accounts, no billing. Data lives in one Postgres database (Supabase when hosted). Favor lean and functional over polished.

## The owner's situation (drives priorities)
- Starting from **zero evidence**. This is a build-from-zero engine, not a tracker of existing wins.
- Field scope: **data engineering** and **data product management**. Scope all seeds and API
  queries to this domain.
- Target the **buildable criteria first**, in rough order: 6 (authorship), 5 (original
  contributions / OSS), 7 (talks), 4 (judging), 3 (press). Criteria 1, 2, 8, 9, 10 come later.

## The core bet
Quality beats quantity. USCIS weighs evidence quality at "final merits," and weak/pay-to-play
judging or authorship can backfire. Every venue carries a `qualityTier` and an `avoidFlag`.
Never count coverage on avoid-flagged evidence.

## Tech stack (recommended — adjust only with reason)
- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- Postgres via Prisma (schema in `prisma/schema.prisma`; migrations in `prisma/migrations`, applied with `npm run db:migrate`, never on Vercel build)
- Evidence files: local `./evidence` in dev, private Supabase Storage bucket when hosted (`src/lib/evidence.ts`); DB stores the object key
- Connectors are plain TS modules; run on demand, via `node-cron` locally, or via the Vercel cron dispatcher
- Seed data loaded from `seed/*.json` on first run

## Data model
Six entities: Venue, Opportunity, Criterion, Pursuit, Evidence, Source. See
`prisma/schema.prisma`. Coverage and strength per criterion are **derived on read**, not stored.

## Connector contract
Each source is one module exporting:
```ts
runConnector(config: SourceConfig, fieldScope: string[]): Promise<Opportunity[]>
```
It normalizes results to `Opportunity` records, upserts with dedupe on `(source, url)`, writes
`lastRun` to its `Source` row, and **never throws into the UI** — failures are logged and shown
as a "source stale" badge. On every Venue upsert, match against `seed/venues.seed.json` and
`seed/avoid-list.json` to set `qualityTier` / `avoidFlag`; unmatched venues land as `unrated`.

## Build order (phases — complete and verify each before the next)
0. Scaffold + Prisma schema + `/evidence` handling + load `seed/criteria.json`.
1. Import `seed/venues.seed.json` + `avoid-list.json`; build Dashboard (10-criteria grid,
   "N of 10" headline, nearest-wins strip); coverage/strength derivation.
2. Core manual loop: Opportunities (filters + avoid warnings), manual add/edit, Pipeline kanban
   (shortlisted → applied → accepted → completed → dropped), Evidence locker (proof checklist +
   per-criterion dossier). App is useful at the end of this phase.
3. First connectors: developers.events (conferences+CFPs), OpenAlex (journals+citations),
   Crossref, DOAJ, GitHub issues. Profile screen (field tags, ORCID id, sources panel).
4. Auto-scoring against seed/avoid-list; strength heuristics; deadline/stale reminders.
5. P2 connectors (ORCID, Semantic Scholar, PatentsView, IETF, Kaggle, Listen Notes, NSF) and
   per-criterion dossier export (PDF/CSV).

## Reliable open data sources (verify endpoints/auth at build time)
- developers.events — `all-events.json`, `all-cfps.json` (no key) — conferences + CFPs
- OpenAlex (no key; send a polite-pool email) — works, journals, citations, topics
- Crossref (no key) — article/journal metadata, DOIs
- DOAJ (no key) — open-access journals
- GitHub Search API (free token) — `good first issue` / `help wanted` by language + topic
- confs.tech, Call4DataSpeakers — curated CFP lists (GitHub JSON)
- Lower reliability / manual: Devpost/MLH (scrape), journal "call for reviewers" (manual),
  press/HARO successors (login-walled)

## Conventions
- Keep it simple; do not add infra (queues, external services) for one user.
- All dates ISO-8601. Enums exactly as in the schema.
- Do not invent venue facts; where acceptance rates/deadlines are unknown, leave null and let
  connectors fill them. Flag anything uncertain for the owner to confirm.

## v2 additions
- Dual scoring (criterion + final merits): `src/lib/rubric.ts`, `pursuit-input.ts`, `pursuit-view.ts`; readiness in `coverage.ts` / `components/dashboard/readiness.tsx`.
- Brand/reach: `src/lib/brand-growth.ts`, `lib/data/{channels,reach}.ts`, `/brand`. Recommenders: `lib/recommender.ts`, `/recommenders`.
- Exhibit export: `src/lib/exhibit.ts`, `/api/export/exhibit`.
- Connectors added: arXiv, NSF Awards, GDELT, Google Alerts, GitHub Profile, Site Analytics, Newsletter RSS (shared helpers in `src/lib/connectors/{feed,reach-sink}.ts`).
- Source config is editable on `/profile`; known keys live in `src/lib/connectors/config-hints.ts` (update it when a connector reads a new key). The runner owns `status`, `lastError`, `lastErrorAt`, `lastCounts`; never overwrite them from the UI.

## Conventions (v2)
- Pages in `src/app/<route>` own their `actions.ts`; data access only via `src/lib/data/*`; pure logic in `src/lib/*` with colocated `*.test.ts`.
- Before finishing: `npm run typecheck && npm run lint && npm test && npm run build`.

## Attribution for commits/PRs
Follow the attribution instructions given by the session/tooling; do not hardcode a model name here.

## Hosted mode (Vercel + Supabase)
- Deploy steps: `DEPLOY.md`. Env list: `.env.example` (one Supabase URL: `NEXT_PUBLIC_SUPABASE_URL`; `SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET` are server-only, never `NEXT_PUBLIC_`).
- Auth: `src/middleware.ts` gates everything (Supabase OTP, email must equal `ALLOWED_EMAIL`); production with missing auth env fails closed (503). Dev with no env is open. Route handlers call `requireUser()`, every exported server action starts with `await assertUser()` (`src/lib/auth.ts`); new routes/actions must do the same. `/login` and `/auth/*` actions are the exceptions.
- Storage: `evidence.ts` picks Supabase when URL + service key are set, else disk. Hosted uploads max 4MB (Vercel body cap). Client components must never import `evidence.ts`, `db.ts` or `auth.ts` (server-only).
- Cron: `vercel.json` has one daily `/api/cron/dispatch` (Hobby limit); bearer `CRON_SECRET`, fails closed if unset. Connectors must respect the ~50s budget. Prisma uses the `postgres` role (bypasses RLS); tables have RLS on with no policies.
