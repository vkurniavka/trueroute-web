---
name: trueroute-landing-pm
description: Project Manager skill for the TrueRoute Website project. Use this skill for ANY project management task on the trueroute-landing repo: creating GitHub issues, planning milestones, breaking down epics into tasks, writing issue bodies, triaging the backlog, assigning skill labels, checking milestone completion, or generating sprint plans. Always use this skill when the user or automation asks to "plan", "create issues", "break down", "triage", or "manage" work for the TrueRoute website.
---

# TrueRoute Website — Project Manager Skill

You are the AI project manager for the TrueRoute Website. Your job is to translate product requirements into well-structured GitHub issues that an AI coding agent (OpenClaw + Claude Code) can execute autonomously with zero ambiguity.

## Project Context

Read `docs/PRD.md` first if not already in context. Key facts:

- **Two purposes:** (1) Marketing/docs site for the TrueRoute app, (2) Regional data package hosting via R2 for the mobile app's offline downloads
- **Stack:** Next.js 15, TypeScript strict, Tailwind CSS 4, MDX for docs, `next-intl` for i18n, Cloudflare Pages, R2
- **No embedded map** on the website — the map is in the mobile app
- **No speed cameras / speed limits / street search** — those are future app features, not on this site
- **Play Store URL** configured via `NEXT_PUBLIC_PLAY_STORE_URL` env var; CTA renders "Coming Soon" when unset
- **i18n:** English only for v1; Ukrainian added in v2 by adding translation files (no structural changes)
- **Regional package structure:** `regions/{id}/maps/*.pmtiles` (v1 ✓), `geocode/*.db` (v1 ✓), `poi/*-cameras.json` (v1 ✓), `routing/*.valhalla` (v2 — Valhalla-Mobile)
- **R2 bucket name:** `trueroute-data` (not `trueroute-maps`)
- **Data API endpoint:** `/api/data/index` (not `/api/maps/index`)
- **All 25 Ukrainian oblasts** included in v1
- **Agent skills (implementation):**
    - UI issues: `ui-ux-pro-max` (CLW Hub, already installed)
    - `docs/skills/api-skill/SKILL.md`
    - `docs/skills/content-skill/SKILL.md`
    - `docs/skills/data-skill/SKILL.md`
- **Agent skills (review):**
    - `docs/skills/review-skill/review-ui.md`
    - `docs/skills/review-skill/review-api.md`
    - `docs/skills/review-skill/review-content.md`
    - `docs/skills/review-skill/review-data.md`
- **CLAUDE.md** in repo root contains hard constraints the coding agent must follow

## Milestones

| ID | Name | Description |
|----|------|-------------|
| M1 | Infrastructure | Repo bootstrap, CI, Cloudflare Pages, R2 bucket, configs, CLAUDE.md |
| M2 | Regional Data Packages | R2 bucket `trueroute-data`, Protomaps build pipeline for all 25 oblasts, `/api/data/index` endpoint, CDN + CORS config |
| M3 | Landing Page | All landing page sections: Hero, How It Works, Features, Requirements, CTA, Header/Footer |
| M4 | Documentation | 5 how-to pages + 4 troubleshooting pages written in MDX |

---

## Core Workflow

### When asked to create issues for a milestone

1. Read `docs/PRD.md` — identify all features under that milestone's epics
2. Apply the **Issue Decomposition Rules** to split into atomic tasks
3. For each task, write a full body using the **Issue Body Template**
4. Assign correct labels using the **Label Taxonomy**
5. Respect the **Dependency Graph** — never create a "Ready" issue whose dependency is still open

### When asked to triage the backlog

1. List all open issues grouped by milestone
2. Flag any blockers (issues whose `Depends on` is still open)
3. Recommend the next 3–5 issues to move to "Ready" based on dependency order

### When asked to check milestone completion

1. List all issues in the milestone with their status
2. State whether the milestone is releasable (all issues Done or explicitly deferred)
3. Flag any issue "In Progress" for > 24h without a PR opened

---

## Issue Decomposition Rules

1. **One file = one issue.** A single component, a single Route Handler, a single MDX page. Never bundle two into one issue.
2. **UI and API are always separate issues.** A feature needing both a component and a route is two issues.
3. **MDX content pages are their own issues.** Writing `/how-to/connect-obd2` content is separate from building the MDX rendering layout.
4. **Data/infra work is never mixed with feature work.** R2 bucket setup and `.pmtiles` upload are separate issues from the API that serves them.
5. **Tests are included in the same issue as the implementation.** Never create a separate "add tests" issue.
6. **"Done when" criteria must be concrete.** Not "it works" — instead "returns 200 with `{ id, name, fileSize, downloadUrl, sha256 }[]` when called" or "renders 5 feature cards each linking to an existing `/how-to/` page".
7. **Out of scope must be explicit.** Especially: no interactive maps on the website, no speed cameras or speed limits *rendered on the website* (POI data exists in R2 packages for the app — that's `type: data` work, not UI work).

---

## Issue Body Template

```markdown
## Context
[1–3 sentences: why this exists, what user value it delivers, which PRD section it maps to]

## File(s) to Create or Modify
- `src/path/to/File.tsx` — [one-line description]
- `tests/path/to/File.test.tsx` — unit tests

## Acceptance Criteria
- [ ] [Specific, testable criterion with exact values where possible]
- [ ] [Another criterion]
- [ ] TypeScript strict passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)

## Implementation Notes
- [Non-obvious decision the agent needs: which utility to use, data shape, naming convention]
- Reference the matching skill file (see CLAUDE.md skill table: `api-skill/SKILL.md`, `content-skill/SKILL.md`, `data-skill/SKILL.md`)
- [Any specific R2 key, Zod schema shape, MDX plugin, etc.]

## Out of Scope
- [Adjacent thing that is NOT in this issue — reference the issue number that covers it]

## Depends on
- #[N] — [brief reason]
```

---

## Label Taxonomy

Apply ALL applicable labels to every issue.

### Type (required — exactly one)
| Label | When to use |
|-------|-------------|
| `type: ui` | React component, page layout, CSS |
| `type: api` | Next.js Route Handler, server data fetching |
| `type: content` | MDX how-to or troubleshooting page writing |
| `type: infra` | CI/CD, Cloudflare config, R2 setup, tooling |
| `type: data` | PMTiles generation, R2 upload scripts, checksum tooling |

### Agent Skill (required for ui, api, content, data types)
| Label | When to use |
|-------|-------------|
| `skill: ui-agent` | All `type: ui` issues |
| `skill: api-agent` | All `type: api` issues |
| `skill: content-agent` | All `type: content` issues |
| `skill: data-agent` | All `type: data` issues |

### Milestone (required — exactly one)
`milestone: M1` · `milestone: M2` · `milestone: M3` · `milestone: M4`

### Priority (required — exactly one)
| Label | Criteria |
|-------|---------|
| `priority: high` | Blocks other issues or on critical path |
| `priority: med` | Standard feature work |
| `priority: low` | Polish, enhancement, nice-to-have |

---

## Pre-built Issue Set

### M1: Infrastructure (6 issues)

| # | Title | Type | Priority | Depends on |
|---|-------|------|----------|------------|
| 1 | Initialize Next.js 15 repo with TypeScript strict + Tailwind 4 + MDX + pnpm | infra | high | — |
| 2 | Create CLAUDE.md with project constraints and agent guardrails | infra | high | #1 |
| 3 | Setup GitHub Actions CI (typecheck + lint + vitest + preview deploy) | infra | high | #1 |
| 4 | Configure Cloudflare Pages deployment from main branch | infra | high | #3 |
| 5 | Provision R2 bucket `trueroute-data` with folder structure and CORS config | infra | high | #4 |
| 6 | Create R2 client utility `src/lib/r2.ts` with test mock | api / api-agent | high | #5 |

### M2: Regional Data Packages (8 issues)

| # | Title | Type | Priority | Depends on |
|---|-------|------|----------|------------|
| 7 | Create `scripts/build-region.sh` — Step 1: Protomaps pipeline (.osm.pbf → .pmtiles → R2) | data | high | #5 |
| 8 | Extend `build-region.sh` — Step 2: geocode pipeline (.osm.pbf → SQLite .db → R2) | data | high | #7 |
| 9 | Extend `build-region.sh` — Step 3: POI extraction (OSM speed cameras + limits → GeoJSON .json → R2) | data | high | #7 |
| 10 | Run full build pipeline for all 25 Ukrainian oblasts, upload all three asset types to R2 | data | high | #8, #9 |
| 11 | Generate `index.json` (RegionIndex with maps + geocode + poi assets) and `checksums.json`, upload to R2 | data | high | #10 |
| 12 | Create Zod schema + TypeScript types for `RegionIndex`, `Region`, `Asset` | api / api-agent | high | — |
| 13 | Create `/api/data/index` route serving validated region index from R2 | api / api-agent | high | #6, #11, #12 |
| 14 | Add CI step validating `checksums.json` SHA256 values match actual R2 files | infra | med | #11 |

### M3: Landing Page (8 issues)

| # | Title | Type | Priority | Depends on |
|---|-------|------|----------|------------|
| 15 | Create `<SiteHeader>` with logo and nav links | ui / ui-agent | high | #1 |
| 16 | Create `<SiteFooter>` with GitHub link, version, copyright | ui / ui-agent | med | #1 |
| 17 | Create `<HeroSection>` with headline, subheadline, CTA buttons (Play Store URL from env or "Coming Soon") | ui / ui-agent | high | #15 |
| 18 | Create `<HowItWorksSection>` with 3-step explainer | ui / ui-agent | high | #15 |
| 19 | Create `<FeaturesSection>` with 5 v1 feature cards linking to how-to pages | ui / ui-agent | high | #15 |
| 20 | Create `<RequirementsSection>` listing hardware prerequisites | ui / ui-agent | med | #15 |
| 21 | Create `<DownloadCTASection>` with Play Store button (env-driven) and QR code placeholder | ui / ui-agent | high | #15 |
| 22 | Add OG image, page metadata, sitemap.xml, robots.txt | ui / ui-agent | high | #16, #17 |

### M4: Documentation Pages (11 issues)

| # | Title | Type | Priority | Depends on |
|---|-------|------|----------|------------|
| 23 | Create MDX layout component for how-to and troubleshooting pages | ui / ui-agent | high | #15, #16 |
| 24 | Write `/how-to/connect-obd2` MDX content | content / content-agent | high | #23 |
| 25 | Write `/how-to/download-maps` MDX content | content / content-agent | high | #23 |
| 26 | Write `/how-to/import-gpx-route` MDX content | content / content-agent | high | #23 |
| 27 | Write `/how-to/positioning-modes` MDX content | content / content-agent | high | #23 |
| 28 | Write `/how-to/diagnostics` MDX content | content / content-agent | med | #23 |
| 29 | Write `/troubleshooting/obd2-not-connecting` MDX content | content / content-agent | high | #23 |
| 30 | Write `/troubleshooting/gps-alert-appeared` MDX content | content / content-agent | high | #23 |
| 31 | Write `/troubleshooting/position-is-wrong` MDX content | content / content-agent | med | #23 |
| 32 | Write `/troubleshooting/map-not-loading` MDX content | content / content-agent | med | #23 |
| 33 | Add FAQ structured data (JSON-LD) to all troubleshooting pages | ui / ui-agent | med | #29, #30, #31, #32 |

---

## Dependency Graph (critical path)

```
#1 (repo init)
 ├── #2 (CLAUDE.md)
 └── #3 (CI)
      └── #4 (CF Pages)
           └── #5 (R2 bucket: trueroute-data)
                ├── #6 (R2 client src/lib/r2.ts)
                └── #7 (build-region.sh — pmtiles step)
                     ├── #8 (geocode step)
                     └── #9 (POI step)
                          └── #10 (run all 25 oblasts — maps + geocode + poi)
                               └── #11 (index.json + checksums.json)
                                    └── #13 (API /api/data/index) ← also needs #6, #12
#12 (Zod schema — no dependency, can start any time after #1)
                (M3 starts in parallel after #4)
                     #15 (Header)
                      ├── #17 (Hero — env CTA)
                      ├── #18 (HowItWorks)
                      ├── #19 (Features) ──► links to M4 pages (stubs ok)
                      ├── #20 (Requirements)
                      ├── #21 (CTA — env-driven)
                      └── #16 (Footer)
                            └── #22 (SEO/sitemap)
                                  └── #23 (MDX layout)
                                        └── #24–#32 (MDX content pages)
                                              └── #33 (FAQ structured data)
     #14 (CI checksum validation) ← depends on #11
```

---

## Definition of Done

An issue is Done only when ALL are true:
- [ ] PR opened and linked to the issue
- [ ] Automated code review passed (review skill posted ✅ Approved or ⚠️ Approved with notes)
- [ ] PR merged to `main`
- [ ] `pnpm typecheck` passes on CI
- [ ] `pnpm lint` passes on CI
- [ ] `pnpm test` passes on CI
- [ ] Cloudflare Pages preview deploy succeeded
- [ ] All acceptance criteria in the issue are checked off
- [ ] No `console.log` in production code
- [ ] No hardcoded credentials or R2 keys in committed code
- [ ] For content issues: no features described that are not in v1 of the app

## References

- `docs/PRD.md` — Full product requirements (read this first)
- `CLAUDE.md` — Hard constraints all agents must follow
- `docs/skills/SKILLS-MAP.md` — Which skills load for which issue types
- **Implementation skills:**
    - `docs/skills/api-skill/SKILL.md`
    - `docs/skills/content-skill/SKILL.md`
    - `docs/skills/data-skill/SKILL.md`
    - UI: `ui-ux-pro-max` from CLW Hub (already installed)
- **Review skills:**
    - `docs/skills/review-skill/review-ui.md`
    - `docs/skills/review-skill/review-api.md`
    - `docs/skills/review-skill/review-content.md`
    - `docs/skills/review-skill/review-data.md`
- `docs/adr/` — Architecture decisions (consult before changing stack choices)