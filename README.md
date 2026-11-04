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
- Pipeline (shortlist -> in progress -> completed), evidence locker, achievement logging
- Coverage dashboard, scoring, nearest-wins and deadline reminders
- Triage of connector-discovered items; sources screen
- Dossier export (CSV and PDF) at `/api/export/dossier?format=csv|pdf`

## Limitations
- Live connectors (developers.events, OpenAlex, Crossref, DOAJ, GitHub, ORCID, Semantic Scholar,
  PatentsView) are **unverified against the live APIs**; endpoints/fields may need adjusting.
- Single-user, local-first; no auth. Seed venue data and tiers are curated starting points - verify before relying on them.
- Not legal advice.

## What's here
- `CLAUDE.md` — the build brief for the agent (read first).
- `prisma/schema.prisma` — the six-entity data model.
- `seed/criteria.json` — the 10 criteria, proof checklists, and which are buildable from zero.
- `seed/venues.seed.json` — curated, domain-scoped venues with quality tiers and criterion maps.
- `seed/avoid-list.json` — pay-to-play / low-value patterns to flag.

## Full plan
The complete product/architecture/UI plan lives in the EB-1A Build Plan doc these files were
generated from. Verify API endpoints, acceptance rates, and venue details at build time.
