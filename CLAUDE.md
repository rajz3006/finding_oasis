# CLAUDE.md — EB-1A Tracker

Guidance for the Claude Code orchestrator building this project. Read this first.

## What this is
A **lean, single-user, local-first** web app that helps one person (the owner) build an EB-1A
("extraordinary ability") immigration profile from scratch. It finds selective opportunities,
maps each to the 10 regulatory criteria, scores venue quality, and stores the proof.

It is **not** a product: no other users, no accounts, no billing. Data stays on the owner's
machine in a single SQLite file. Favor lean and functional over polished.

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
- SQLite via Prisma (schema in `prisma/schema.prisma`)
- Evidence files stored in a local `/evidence` folder; DB stores the path
- Connectors are plain TS modules; run on demand or via `node-cron`
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

## Attribution for commits/PRs
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
