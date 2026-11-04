# EB-1A Build Plan

Nov 4, 2026 · @Raj N

A build-ready plan for a lean, single-user EB-1A profile tracker, written to hand to a Claude Code orchestrator.

## Overview & goals

A single-user web app that turns EB-1A profile-building from a scattered checklist into a tracked pipeline: it finds selective opportunities, maps each to the ten regulatory criteria, scores venue quality, and stores the proof. Built for my own use, not as a product, so it favors lean and functional over polished.

- **What it is:** a personal system of record for EB-1A evidence across all ten criteria, plus a feed of opportunities worth pursuing.
- **Who it's for:** only me. No other users, no accounts, no billing or subscription screens (the Ensol subscribe/cancel flows are out of scope).
- **The core bet:** quality beats quantity. Both attorney memos stress that USCIS now triangulates the *quality* of evidence, and weak judging or authorship can sink a petition at final merits. So the app actively steers toward selective, non-predatory venues and flags pay-to-play ones.
- **Design stance:** ship the smallest genuinely useful version first, then add source connectors one at a time. Manual entry is a first-class path, not a fallback.
- **Non-goals (v1):** legal advice, petition or letter drafting, collaboration, a native mobile app, and anything requiring someone else's login.

## Starting from zero

I am building this with no evidence yet, which suits the app: it is a build-from-zero engine, not a tracker of existing wins. Two consequences shape v1.

**Target the buildable criteria first.** From scratch, these are the ones you can deliberately earn, in rough order: authorship (6) via developer media then journals; original contributions (5) via open-source work; talks and showcasing (7); judging (4) via peer review then program committees; published material about me (3) via press and podcasts. Awards (1), selective membership (2), critical role (8), high salary (9), and performing-arts success (10) come later or passively. The dashboard's "nearest wins" steers toward criteria 3-7.

**Field scope: data engineering and data product management.** The seed catalog and every API query scope to this domain, so the conference, journal, and OSS seeds lean toward data platforms, data management, and analytics venues (VLDB/SIGMOD industrial tracks, IEEE Big Data, Journal of Big Data, Data Council, Data+AI Summit, Coalesce, Kafka Summit, PyData, Berlin Buzzwords) alongside the general high-tier outlets, and the OSS feed targets the data stack (Airflow, dbt, Dagster, DuckDB, Iceberg, Arrow, Great Expectations).

## EB-1A criteria model

EB-1A requires sustained national or international acclaim, shown by meeting at least **3 of 10** regulatory criteria (8 CFR 204.5(h)(3)), after which USCIS applies a holistic **final-merits** judgment (the two-step *Kazarian* analysis). The app therefore tracks two things at once: **coverage** (do I clear 3 of 10?) and **strength** (is each criterion backed by selective, verifiable evidence?).

The ten criteria below are mapped to the opportunity types this app surfaces and the proof artifacts to preserve for each. Criteria 1-7 are where the app does active work; 8-10 are mostly captured through manual records.

| # | Criterion | Opportunity types the app surfaces | Key proof to keep |
| --- | --- | --- | --- |
| 1 | Nationally/internationally recognized awards | Industry innovation awards, competition wins (Kaggle, hackathon finals) | Award page showing it is open to a national field; proof it is for excellence |
| 2 | Membership requiring outstanding achievement | IEEE Senior/Fellow, ACM Distinguished, selective societies | Membership criteria page; admission decision; any board/leadership role |
| 3 | Published material *about* me | Press, podcast guesting, feature interviews | Article + circulation/audience data; who reads the outlet |
| 4 | Judging others' work | Journal peer review, conference program committees, award juries, standards ballots, cert-exam SME panels, OSS approver/governance | Invitation email, reviewer dashboard, name on public roster, thank-you letter |
| 5 | Original contributions of major significance | Patents, widely-used OSS, adopted methods/datasets | Expert letters; evidence others rely on it (citations, adoption, downloads) |
| 6 | Authorship of scholarly/trade articles | Journals, conference proceedings, practitioner magazines, curated dev media, books | The article; outlet circulation/indexing; citation counts |
| 7 | Display/showcasing of work | Conference talks, invited presentations, demos | Agenda/slides showing I presented; event profile |
| 8 | Leading/critical role for distinguished orgs | (manual) | Org reputation evidence; description of the critical role |
| 9 | High salary/remuneration | (manual) | Contracts; W-2/pay stubs; comparison to field |
| 10 | Commercial success in performing arts | (manual, rarely applicable) | Box-office/receipts |

**Why quality is modeled explicitly:** the judging memo warns against mass-market "global judge" programs and pay-to-play venues, and the publishing memo warns against MDPI-style stigma. Each opportunity in the app carries a **quality tier** and an **avoid flag**, so coverage is never counted on evidence that would backfire at final merits.

## Product scope

The lean MVP is five things: a coverage dashboard, an opportunity catalog, a pipeline tracker, an evidence locker, and venue quality scoring. Everything else is deferred. Priorities below are **P0** (build first, the app is useless without it), **P1** (soon after), **P2** (later / nice-to-have).

**P0 - the core loop**

1. **Coverage dashboard** - at a glance: which of the 10 criteria I currently satisfy, how many are "strong" vs "thin", and distance to a safe 3+ with margin.
2. **Opportunity catalog** - a browsable, filterable list of opportunities (journals, conferences, judging roles, awards, press, OSS) each tagged with criterion, type, quality tier, deadline, and effort.
3. **Manual entry everywhere** - add any opportunity or achievement by hand, because the best venues have no API.
4. **Pipeline tracker** - move an opportunity through states: Shortlisted -> Applied/Submitted -> Accepted/Invited -> Completed. This is what converts "found" into "evidence".
5. **Evidence locker** - attach proof artifacts (files, links, emails, screenshots) to each completed item, using the per-criterion proof checklist from the criteria model.

**P1 - make it smart**

- **Quality scoring + avoid flag** - each venue carries a tier (T1-T3 / curated) and a predatory/pay-to-play warning, auto-applied to seeded venues and editable by hand.
- **Curated seed catalog** - preload the attorney-sourced publishing and judging venues so the catalog is valuable before any API runs.
- **First API connectors** - the reliable open ones: developers.events, OpenAlex/Crossref, GitHub.
- **Profile & field scoping** - set my field(s) once so the catalog and API queries are scoped to my domain, not a firehose.

**P2 - later**

- Additional connectors (patents, standards, podcasts, competitions, grants).
- Citation/impact tracking for my own works (evidence for criteria 5 and 6).
- Deadline and stale-pipeline reminders.
- Export the per-criterion evidence dossier (PDF/CSV).

**Explicitly out of scope for v1:** letter/petition drafting, anything multi-user, payments, and scraping behind logins.

## Core data model

Six entities carry the whole app. The spine is: a **Venue** hosts **Opportunities**; each Opportunity maps to one or more **Criteria**; when I act on one it becomes a **Pursuit** that moves through states and collects **Evidence**. **Sources** record where an Opportunity came from.

**Venue** - a place that confers evidence (a journal, conference, award, outlet, OSS project, standards body).

| Field | Type | Notes |
| --- | --- | --- |
| id | id |  |
| name | text |  |
| kind | enum | journal, conference, award, media\_outlet, podcast, oss\_project, standards\_body, cert\_program, society |
| quality\_tier | enum | T1, T2, T3, curated, unrated |
| avoid\_flag | bool | pay-to-play / predatory / student-only; shown as a warning |
| selectivity | text | acceptance rate, review model, etc. (free text + optional number) |
| indexing | text | Scopus / WoS / ACM DL / IEEE Xplore / DOI, where relevant |
| cost | text | APC or fee, if any |
| homepage | url |  |
| field\_tags | text\[\] | domain tags for scoping |
| notes | text |  |

**Opportunity** - a specific actionable thing at a Venue (an open CFP, a call for reviewers, an award cycle, an open issue).

| Field | Type | Notes |
| --- | --- | --- |
| id | id |  |
| venue\_id | id | nullable for one-off manual items |
| title | text |  |
| type | enum | publish\_article, give\_talk, submit\_cfp, judge\_review, judge\_pc, judge\_award, membership, press\_mention, oss\_contribution, award\_entry, patent, standards\_role |
| criterion\_ids | enum\[\] | which of the 10 it can satisfy |
| deadline | date | nullable |
| url | url |  |
| effort | enum | low, medium, high |
| status\_catalog | enum | open, closed, rolling, unknown |
| source\_id | id | where it was ingested from |
| raw | json | original payload from the source |

**Criterion** - the 10 regulatory criteria (seeded, static).

| Field | Type | Notes |
| --- | --- | --- |
| id | int | 1-10 |
| name | text |  |
| proof\_checklist | text\[\] | the per-criterion proof-to-keep list |
| active | bool | whether the app surfaces opportunities for it |

**Pursuit** - my relationship to an Opportunity (the pipeline item).

| Field | Type | Notes |
| --- | --- | --- |
| id | id |  |
| opportunity\_id | id |  |
| state | enum | shortlisted, applied, accepted, completed, dropped |
| criterion\_ids | enum\[\] | criteria this pursuit actually counts toward |
| strength | enum | strong, moderate, thin (my judgment of the resulting evidence) |
| dates | json | applied\_on, decided\_on, completed\_on |
| notes | text |  |

**Evidence** - a proof artifact attached to a Pursuit.

| Field | Type | Notes |
| --- | --- | --- |
| id | id |  |
| pursuit\_id | id |  |
| kind | enum | file, link, email, screenshot, metric |
| label | text | e.g. "invitation email", "name on PC roster" |
| value | text/url | file path or URL |
| checklist\_item | text | which proof-checklist item it satisfies |

**Source** - an ingestion source and its last run.

| Field | Type | Notes |
| --- | --- | --- |
| id | id |  |
| name | text | developers.events, OpenAlex, GitHub, manual, etc. |
| access | enum | api, scrape, manual |
| last\_run | date |  |
| config | json | query params, field scoping, keys ref |

**Coverage** is derived, not stored: for each Criterion, count completed Pursuits and their strength. This powers the dashboard.

## Data sources: the connectors

The honest split: a handful of genuinely open APIs cover conferences, journals, and OSS well; everything else is scrape-fragile or manual. Build the API connectors in reliability order, and never let a flaky source block the manual path. Verify each endpoint and auth at build time, as terms and keys change.

| Source | Feeds criteria | Access | Key needed | Refresh | Reliability |
| --- | --- | --- | --- | --- | --- |
| [developers.events](https://developers.events) (`all-events.json`, `all-cfps.json`) | 4, 6, 7 | API (plain JSON) | No | Weekly | High - the best single feed for conferences + open CFPs |
| [OpenAlex](https://openalex.org) | 5, 6 | API | No (polite pool: add email) | Weekly | High - 250M works; finds journals, tracks citations to my work, scopes by topic |
| [Crossref](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) | 6 | API | No | Weekly | High - journal/article metadata, DOIs |
| [DOAJ](https://doaj.org/api) | 6 | API | No | Monthly | High - open-access journals to submit to |
| GitHub Search API (issues) | 5 | API | Token (free) | Daily/weekly | High - good-first-issue / help-wanted by language + topic |
| [confs.tech](https://confs.tech) (open-source JSON) | 6, 7 | API (JSON/GitHub) | No | Weekly | Medium-high - second conference feed |
| arXiv API | 5, 6 | API | No | On demand | High - preprints (not peer-reviewed; supporting evidence) |
| Devpost / MLH | 1, 4 | Scrape | n/a | Weekly | Low - no official API; unofficial scrapers break |
| Journal "call for reviewers" | 4 | Manual (+ OpenAlex to find journals) | n/a | Manual | Low - no central API; per-journal pages |
| Press / HARO-style | 3 | Mostly manual | n/a | Manual | Low - [HARO/Connectively shut down Dec 2024](https://www.barchart.com/story/news/196158/haro-alternatives-2026-complete-guide-to-pr-and-linkbuilding-platforms); successors are login-walled |

**Connector contract (build each the same way):** a connector is a function that takes my field scoping + its config, returns a normalized list of `Opportunity` records (with `venue`, `type`, `criterion_ids`, `deadline`, `url`, `raw`), and upserts them with dedupe on `(source, url)`. It writes a `last_run` to its `Source` row and never throws into the UI - failures are logged and surfaced as a small "source stale" badge.

**Scoring on ingest:** when a new Venue is created from an API, match it against the curated seed catalog and the avoid-list to set `quality_tier` and `avoid_flag`; unmatched venues land as `unrated` for me to triage.

## What else exists in the open world

Beyond the one attorney's lists and the earlier search, here is a wider sweep of open sources worth wiring in or seeding from. Grouped by the job they do. Many are free APIs; the rest are curated or manual. This is the menu to pull from in P2, not all at once.

**Identity & my own record (the backbone)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [ORCID public API](https://info.orcid.org/documentation/) | My canonical works list *and* recorded peer-review activity | 4, 5, 6 | API, free token |
| [ROR](https://ror.org) | Org identifiers + reputation signals | 8 | API, free |

**Citation & impact (proving "others rely on it")**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [Semantic Scholar](https://www.semanticscholar.org/product/api) | Citations, influential-citation counts, author metrics | 5, 6 | API, free (optional key) |
| [CORE](https://core.ac.uk/services/api) | 260M+ open papers across repositories | 5, 6 | API, free key |
| [OpenAIRE](https://graph.openaire.eu/develop/) | EU research graph: works, projects, links | 5, 6 | API, free |
| [Lens.org](https://www.lens.org/lens/user/subscriptions#scholar) | Scholarly + patent linkage | 5, 6 | API, free tier/academic |

**Patents (original contributions)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [PatentsView](https://search.patentsview.org/) (USPTO) | Patents by inventor, citations to them | 5 | API, free key |

**Standards work (judging-adjacent, high value)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [IETF Datatracker](https://datatracker.ietf.org/api/) | Drafts, WG roles, my ballot/participation record | 4, 5 | API, free |
| IEEE SA / W3C groups | Ballot pools, working-group membership | 4 | Manual / account |

**Speaking & CFPs (talks, authorship)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [Sessionize](https://sessionize.com) | Open calls for speakers; hosts my speaker profile | 7 | API is for my own event/profile, not discovery - treat as profile + manual |
| PaperCall.io | Developer-conference CFPs | 6, 7 | Platform; scrape/manual |
| [Call for Data Speakers](https://github.com/Call4DataSpeakers/Call4Speakers) | Curated data/AI CFP list | 6, 7 | GitHub (structured) |
| awesome-cfp / confs.tech | Aggregated CFP lists | 6, 7 | GitHub JSON |

**Press & media (published material about me)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| Featured.com, Qwoted, SourceBottle, Help a B2B Writer | Journalist source requests (HARO successors) | 3 | Login-walled; mostly manual |
| [Listen Notes API](https://www.listennotes.com/api/) | Podcast search for guesting targets | 3, 7 | API, free tier |
| [Podchaser API](https://api-docs.podchaser.com/) | Podcast + episode + credits data | 3 | API, paid tiers |
| PodMatch / MatchMaker.fm | Guest-host matchmaking | 3, 7 | Platform; manual |
| [GDELT](https://www.gdeltproject.org/data.html) / news alerts (RSS) | Monitor press mentions of my name/work | 3 | API/RSS, free |

**Competitions & rankings (awards, contributions)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [Kaggle API](https://www.kaggle.com/docs/api) | Competitions + my medals/rank (evidence of standing) | 1, 5 | API, free |
| [Codeforces API](https://codeforces.com/apiHelp) | Contest standing/rating | 1 | API, free |
| DrivenData / AIcrowd | ML challenges with real prizes | 1, 5 | Scrape/manual |

**Grants & panels (judging, contributions)**

| Source | What it gives | Criteria | Access |
| --- | --- | --- | --- |
| [NSF Awards API](https://www.research.gov/common/webapi/awardapisearch-v1.htm) | US awards; panel-review context | 4, 5 | API, free |
| [Grants.gov API](https://www.grants.gov/web/grants/s2s/grantor/web-services.html) | US federal funding opportunities | 5 | API, free |
| [CORDIS](https://data.europa.eu/data/datasets/cordisref-data) | EU Horizon projects | 5 | API/data, free |

**My read on priorities:** after the P1 connectors, the highest-leverage additions are **ORCID** (it alone backs criteria 4, 5, 6 from my own record), **Semantic Scholar/OpenAlex citations** (turns "I published" into "others rely on it"), and **PatentsView** if I have patents. Press and podcasts stay mostly manual - the automation cost there is not worth it for one person.

## Curated seed catalog

This is the app's quality core: venues hand-picked from the attorney/reference memos, preloaded so the catalog is useful before any API runs. Each carries a tier and the proof to keep. Tiers: **T1** = strongest for final merits, **T2** = solid, **T3** = supporting. The orchestrator should import these as `Venue` rows with `quality_tier` set.

### Publishing venues (criteria 6, and 7 for talks/tracks)

| Venue | Tier | Type / review | Proof to keep |
| --- | --- | --- | --- |
| IEEE Access | T2 | OA, \~27-30%, fast | Article, acceptance, Xplore index |
| PLOS ONE | T2 | Soundness-only OA | Article, DOI |
| PeerJ Computer Science | T2 | Classic peer review, 28% | Article, reviews |
| Heliyon (Cell Press) | T2 | Multidisciplinary OA | Article, DOI |
| eLife reviewed preprint | T2 | Public reviews + DOI | Reviews, DOI |
| F1000Research | T3 | Open post-pub review | Article, 2 positive reviews |
| SoftwareX (Elsevier) | T2 | OSS packages, peer review | Article, repo DOI |
| JOSS | T2 | Free, GitHub-based review | Paper + public review thread |
| Data in Brief / MethodsX | T3 | Datasets / methods | Article, dataset DOI |
| IEEE Software | T1 | Full peer review, high rep | Article, reviewer letters |
| ACM Queue / CACM Practice | T1 | Editorial board review | Article, ACM DL, DOI |
| USENIX ;login: | T3 | Light external review | Article |
| Comms of the ACM / IEEE Spectrum | T1 | Editor + external review | Article, circulation proof |
| AI Magazine (AAAI) | T2 | Journal refereeing, OA | Article, reviews |
| Springer SN Computer Science / Discover | T2 | Peer-reviewed, Scopus/WoS | Article, indexing |
| Springer LNCS / CCIS | T1-T2 | Refereed proceedings, ISBN+DOI | Paper, PC acceptance |
| ICSE SEIP / industry tracks | T1 | 25-35%, IEEE/ACM DL | Paper, acceptance |
| Apress / Manning / O'Reilly (books) | T2 | Technical review, ISBN | Book, editorial review letters |
| InfoQ / The New Stack / DZone / DEV.to | T3 | Editorial/community | Article, readership stats |

*Avoid-list to seed as `avoid_flag=true`: MDPI-style soundness journals that carry stigma, and any outlet that is pure pay-to-publish. Hacker Noon flagged as weaker for EB-1A (per memo).*

### Judging venues (criterion 4)

| Venue | Tier | How judging works | Proof to keep |
| --- | --- | --- | --- |
| IEEE Trans. Cloud Computing / ACM TOSEM, TOCS, TACO / IEEE TVLSI, TCAD | T1 | Invited anonymous referee, 15-35% | Invitation, reviewer dashboard, ack letter |
| ACM SoCC | T1 | PC, 3 reviews + meta (\~23%) | PC roster, assignment log |
| USENIX ATC / OSDI | T1 | Double-blind, \~15-22% | Same |
| DAC / ISCA / MICRO / SC | T1 | PC sub-committee, 15-25% | Same |
| R&D 100 / ACM Gordon Bell / IEEE Technical Field Awards | T1 | Expert jury, COI rules | Appointment email, public judge roster, NDA |
| CES Innovation Awards / Fast Company IxD / DevOps Dozen | T2 | Product-award jury | Judge roster, criteria |
| IEEE SA / ISO-IEC / IETF ballot pools | T2 | One expert, one vote on specs | Name in public record, ballots |
| AWS / Cisco cert-exam SME panels | T2 | NDA item-writing workshops | Signed acknowledgement, badge |
| Kubernetes reviewer/approver, CNCF TOC, Apache PMC | T2 | Contributor ladder / peer election | Name in OWNERS/HISTORY, election record |

*Avoid: mass-market online hackathons and any program that sells "judge"/"mentor" seats - the judging memo warns these backfire at final merits.*

## Architecture & tech stack

Lean, local-first, single-user. The whole app runs on my machine, data stays in one SQLite file, and no auth is needed because there is only me. This also keeps sensitive immigration-prep data off any third-party server.

**Recommended stack**

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js (App Router) + TypeScript | One codebase for UI + API routes; easy for a Claude Code agent to scaffold and extend |
| UI | Tailwind + shadcn/ui | Fast, clean, componentized; no bespoke design work needed |
| DB | SQLite via Prisma (or Drizzle) | Zero-setup, single file, typed schema that mirrors the data model |
| Files/evidence | Local folder (`/evidence`), path stored in DB | Keeps proof artifacts on disk, nothing uploaded |
| Connectors | Plain TS modules + a `runConnector()` contract | Each source is one file; run on demand or by schedule |
| Scheduling | Node scripts via OS cron / `node-cron` | No job-queue infra for one user |
| Seed data | JSON files (curated catalog + avoid-list) loaded on init | The quality core ships with the repo |

**Shape of the system**

1. **Core app** - Next.js serves the five screens and reads/writes the SQLite DB through a thin data layer.
2. **Seed layer** - on first run, import `criteria.json`, `venues.seed.json`, and `avoid-list.json` into the DB.
3. **Connector layer** - each connector implements `runConnector(config, fieldScope) -> Opportunity[]`, normalizes, dedupes on `(source, url)`, and upserts. Connectors never block the UI; a failed run just marks the `Source` stale.
4. **Scoring layer** - on every Venue upsert, match against the seed catalog + avoid-list to set `quality_tier` and `avoid_flag`; unmatched = `unrated`.
5. **Derivation layer** - coverage and strength per criterion are computed on read, not stored.

**Key principle:** the high-value venues are the curated seed; the APIs are *top-ups* that get scored against that seed. The app is valuable from the first run on seed data alone, and each connector added later only widens the funnel.

**Deployment:** run with `npm run dev` locally. If I ever want remote access, the same app deploys to a private host with a single password env var - but that is out of scope for v1.

## UI & UX

Five screens, one left sidebar. This deliberately collapses Ensol's \~12 nav items: its separate Conferences / Abstracts / Hackathons / Media / Journals / Articles / OSS screens all become **one Opportunities list filtered by type**. Leaner, and it keeps the criteria front and center instead of the content types.

**1. Dashboard (home) - "where do I stand?"**

- A grid of the 10 criteria. Each tile shows: met / not-met, count of completed pursuits, and a strength badge (strong / moderate / thin).
- A headline: "You meet **N of 10** - M with strong evidence." Target line at 3, with encouragement to reach a comfortable margin above it.
- A "nearest wins" strip: criteria at 0 or thin, with the single best next opportunity for each.
- *Key interaction:* click a criterion tile -> Opportunities filtered to it.

**2. Opportunities - "what should I pursue?"**

- Filterable list: by criterion, type, quality tier, deadline window, effort. Default sort surfaces high-tier + near-deadline.
- Each row shows tier badge, deadline, effort, and a red **avoid** warning where flagged.
- *Key interaction:* "Shortlist" adds it to the pipeline in one click.

**3. My Pipeline - "what's in flight?"**

- A kanban board: Shortlisted -> Applied/Submitted -> Accepted/Invited -> Completed (plus a Dropped lane).
- *Key interaction:* drag a card forward; moving a card to Completed opens the evidence prompt for that pursuit.

**4. Evidence locker - "is the proof captured?"**

- Two views: per-pursuit (the proof checklist for its criteria, each item with an attach/link control) and per-criterion dossier (every artifact backing that criterion in one place).
- *Key interaction:* attach a file or paste a link and tick the checklist item it satisfies.

**5. Profile & sources - "keep it scoped and fresh"**

- My field tags (used to scope catalog + API queries), my own works/identifiers (name, ORCID), and a sources panel listing each connector with last-run time and a manual "Run now".
- *Key interaction:* set field scope; run or review a source.

**Design tone:** utilitarian and scannable - summary before detail, state shown as badges/pills, nothing fancy. Light/dark follows the system. This is a tool I operate daily, not a page I read.

## Implementation plan

Six phases, each shippable. The app is useful after Phase 2 (seed data + the full manual loop); every phase after that only widens the funnel. An orchestrator should complete and verify each phase before starting the next.

**Phase 0 - scaffold & schema**

- [ ] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui.
- [ ] Set up SQLite + Prisma; implement the six entities and enums from the data model.
- [ ] Create `/evidence` folder handling and a thin data-access layer.
- [ ] Seed `criteria.json` (the 10 criteria + proof checklists) on init.

**Phase 1 - seed catalog & dashboard**

- [ ] Author `venues.seed.json` and `avoid-list.json` from the curated catalog section.
- [ ] Import seed venues as `Venue` rows with tiers; generate starter `Opportunity` rows where known.
- [ ] Build the Dashboard: 10-criteria grid, "N of 10" headline, nearest-wins strip.
- [ ] Implement coverage/strength derivation on read.

**Phase 2 - the core loop (manual)**

- [ ] Opportunities screen with filters (criterion, type, tier, deadline, effort) and avoid warnings.
- [ ] Manual add/edit for Venue, Opportunity, and achievements.
- [ ] Pipeline kanban with the five states and drag-to-advance.
- [ ] Evidence locker: per-pursuit checklist + per-criterion dossier; attach files/links.
- [ ] Completing a pursuit prompts for evidence.

**Phase 3 - first API connectors**

- [ ] Define the `runConnector()` contract + dedupe + `Source` last-run + stale badge.
- [ ] developers.events connector (conferences + CFPs).
- [ ] OpenAlex connector (journals + citations to my works), scoped by field.
- [ ] Crossref + DOAJ connectors (journal metadata + OA venues).
- [ ] GitHub issues connector (good-first-issue / help-wanted by language + topic).
- [ ] Profile screen: field tags + my works/ORCID id + sources panel with "Run now".

**Phase 4 - scoring & polish**

- [ ] Auto-score new venues against seed + avoid-list on upsert; `unrated` triage view.
- [ ] Strength heuristics and the "nearest wins" recommendations.
- [ ] Deadline + stale-pipeline reminders.

**Phase 5 - P2 connectors & export**

- [ ] ORCID (works + recorded peer reviews), Semantic Scholar (citations), PatentsView (patents).
- [ ] Optional: IETF Datatracker, Kaggle/Codeforces, Listen Notes, NSF.
- [ ] Export per-criterion evidence dossier to PDF/CSV.

**Done-criteria for v1:** I can see where I stand against all 10 criteria, browse scoped high-quality opportunities, run items through a pipeline, and attach the proof - with at least the developers.events, OpenAlex, and GitHub connectors live.

## Open decisions for you

A handful of choices change what the orchestrator builds. My recommendation is in each.

1. **Hosting** - local-first (data in a SQLite file on your machine) vs a private hosted instance. *Recommend local-first for v1* - simpler, and your immigration-prep data never leaves your machine.
2. **Your field(s)** - the catalog and API queries need 1-3 domain tags to scope against (e.g. "cloud / distributed systems", "machine learning", "semiconductors"). *I need these from you* - everything personalizes off them.
3. **Keep the avoid/predatory warnings?** - the app would actively flag pay-to-play venues and low-value hackathons. *Recommend yes* - it is the single most differentiating feature and matches both memos.
4. **Auth** - none (single local user) vs a password. *Recommend none for v1.*
5. **What you already have** - do you hold patents, standards-body roles, or Kaggle/competition standings? *Tell me which apply* so we prioritize those connectors (PatentsView, IETF, Kaggle) over ones you will not use.
6. **Handoff format** - this doc exports to Markdown for the Claude Code orchestrator. *Recommend I also generate a `CLAUDE.md` + `README.md`* seeded from this plan, plus the `criteria.json` / `venues.seed.json` / `avoid-list.json` files, so the agent starts with the schema and seed data in hand.
7. **Connector priority** - confirm the P1 set (developers.events, OpenAlex, Crossref/DOAJ, GitHub) is the right first four, or reorder.

Answer 2 and 5 and I can turn this into the starter repo files whenever you want to move from plan to build.
