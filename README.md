# EB-1A Tracker

A lean, single-user, local-first web app to build an EB-1A profile from zero — find selective
opportunities, map them to the 10 criteria, score venue quality, and keep the proof.

Field scope: **data engineering / data product management**. Owner is starting with no evidence yet.

## Quickstart
```bash
cp .env.example .env     # DATABASE_URL=file:./eb1a.db (SQLite, relative to prisma/)
npm i                    # also runs prisma generate
npm run db:push          # create the SQLite schema
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

Env vars (`.env.example`): `DATABASE_URL`, `PATENTSVIEW_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `GITHUB_TOKEN`,
`ANALYTICS_BASE_URL`, `ANALYTICS_SITE_ID`, `ANALYTICS_TOKEN`. Keyless: arXiv, NSF, GDELT, RSS feeds.

## Limitations
- Live connectors are **unverified against the live APIs**; endpoints/fields may need adjusting
  (GDELT and arXiv are rate-limited, so runs are deliberately slow).
- Site Analytics needs a self-hosted/own Plausible or Umami instance; Google Alerts feeds must be created by hand.
- Single-user, local-first; no auth. Seed venue data and tiers are curated starting points - verify before relying on them.
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
