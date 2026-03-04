# Product Requirements Document
## TrueRoute Website

**Version:** 2.1  
**Date:** March 4, 2026  
**Status:** Approved  
**Owner:** TrueRoute Team  

---

## 1. Overview

### 1.1 Product Summary

The TrueRoute website serves two purposes:

1. **Public-facing site** — communicates what TrueRoute does, drives app downloads, and provides user documentation for every implemented app feature including how-to guides and troubleshooting pages
2. **Regional data package hosting** — serves structured per-region data packages to the mobile app via Cloudflare R2. Each region ships four asset types: map tiles, geocoding index, and POI data in v1; routing data added in v2 when Valhalla-Mobile is ready

### 1.2 Problem Statement

TrueRoute has no web presence. New users have no place to learn what the app does or how to use it. Existing users have no reference when they hit a problem. The app also needs a reliable, fast CDN to distribute regional data packages (map tiles + geocoding + POI data in v1, routing added in v2) — Cloudflare R2 + Pages solves both in one deployment with a package structure that scales cleanly.

### 1.3 Goals

| Goal | Metric | Target |
|------|--------|--------|
| Drive app downloads | Play Store click-through from CTA | ≥ 8% of visitors |
| Reduce support load | Users self-serving from docs | ≥ 60% |
| PMTiles delivery | Time to first byte for map download | < 200ms (CF CDN) |
| SEO — how-to content | How-to pages indexed and ranking | Within 4 weeks of launch |

### 1.4 Non-Goals (v1)

- Interactive map embedded in the website (the map is in the app)
- Turn-by-turn routing (v2 — Valhalla-Mobile not yet stable)
- User accounts or authentication
- CMS or editable content management
- Real-time navigation in the browser

---

## 2. Users & Personas

### Primary: New User Evaluating the App
- Found TrueRoute through search, social, or word of mouth
- Wants to understand what the app does and whether it works with their phone/car
- Will read the landing page and probably one how-to page before deciding to download
- Device: Mobile (Android, Chrome) — majority

### Secondary: Existing User with a Problem
- App installed, hit an issue (OBD2 won't connect, map won't load, GPS alert appeared)
- Searches for the specific problem, lands on a troubleshooting page
- Wants a quick, scannable answer
- Device: Mobile or Desktop

### Tertiary: Technical Evaluator
- Developer, journalist, or investor understanding the technical approach
- Reads the features and how-it-works sections carefully
- Device: Desktop

---

## 3. Site Structure

```
trueroute.app/
├── /                               — Landing page
├── /how-to/
│   ├── connect-obd2                — OBD2 adapter setup guide
│   ├── download-maps               — Offline map download guide
│   ├── import-gpx-route            — GPX route import from Organic Maps
│   ├── positioning-modes           — GPS / Enhanced / Dead Reckoning explained
│   └── diagnostics                 — Reading the diagnostics screen
├── /troubleshooting/
│   ├── obd2-not-connecting         — OBD2 connection problems
│   ├── gps-alert-appeared          — What the spoofing alert means + what to do
│   ├── position-is-wrong           — Inaccurate position causes and fixes
│   └── map-not-loading             — Offline map issues
└── /api/maps/index                 — Region index endpoint (app-facing, not user page)
```

---

## 4. Features & Requirements

### 4.1 Epic 1 — Landing Page

**E1-F1: Hero Section**
- Headline communicating the core value prop in one sentence
- Subheadline: one sentence on how it works (OBD2 + phone sensors + dead reckoning)
- Primary CTA: "Download for Android" (Play Store link)
- Secondary CTA: "How it works" (smooth scroll to features section)
- Background: static illustration or abstract animation — no interactive map
- Renders correctly at 375px mobile

**E1-F2: How It Works Section**
- 3-step visual explainer:
  1. Connect an ELM327 OBD2 adapter to your car
  2. App fuses OBD2 speed + phone sensors with GPS into one position
  3. If GPS is disrupted — navigation continues using dead reckoning
- Each step: icon + headline + max 1 sentence
- Total copy: ≤ 120 words

**E1-F3: Features Section**
- Feature cards for each v1 implemented feature only:
  - **GPS Disruption Detection** — automatic, multi-sensor confidence scoring
  - **Dead Reckoning** — OBD2 speed + gyroscope, < 5% drift per 10 km
  - **Offline Maps** — download regions, works with no internet
  - **GPX Route Import** — plan in Organic Maps, navigate in TrueRoute
  - **Real-time Diagnostics** — sensor health, EKF state, spoof sub-scores
- Each card links to its corresponding `/how-to/` page
- No features listed that are not yet shipped in v1

**E1-F4: Requirements Section**
- What the user needs:
  - Android 8.0+ phone with gyroscope
  - ELM327 Bluetooth OBD2 adapter (~$10)
  - OBD2-equipped vehicle (petrol 2001+, most diesel 2004+)
- What is NOT needed: internet during navigation, subscription, special hardware

**E1-F5: Download CTA Section**
- "Download on Google Play" button (prominent)
- Minimum Android version notice
- Optional QR code for Play Store link

**E1-F6: Site Header + Footer**
- Header: logo, nav links to How-to and Troubleshooting sections
- Footer: GitHub repo link, app version, copyright

**Acceptance Criteria:**
- [ ] All feature cards link to existing how-to pages (no dead links)
- [ ] No interactive map component on this page
- [ ] Renders correctly at 375px, 768px, 1440px
- [ ] LCP < 2.5s on mobile 4G simulation

---

### 4.2 Epic 2 — How-To Documentation Pages

Each page covers one implemented feature end-to-end: goal → prerequisites → steps → expected result → what to do if it fails.

**E2-F1: Connect OBD2 Adapter** (`/how-to/connect-obd2`)
- What OBD2 is, which adapter to buy (ELM327, Bluetooth Classic / SPP profile, ~$10)
- Where the OBD2 port is located in a car (with illustration)
- Steps: plug in adapter → open app → tap Scan → select device → confirm connection
- What success looks like (speed reading shown in app, status indicator green)
- Link to `/troubleshooting/obd2-not-connecting`

**E2-F2: Download Offline Maps** (`/how-to/download-maps`)
- Why offline maps are needed (full navigation with no internet)
- How regions work (oblast/city granularity)
- Steps: open app → Maps screen → select region → Download → wait for completion
- Storage size estimates per region
- How maps get updated
- Link to `/troubleshooting/map-not-loading`

**E2-F3: Import a GPX Route** (`/how-to/import-gpx-route`)
- Why v1 uses GPX import instead of built-in routing (Valhalla-Mobile planned for v2)
- How to plan a route in Organic Maps and export as GPX
- Steps: share GPX from Organic Maps → TrueRoute opens → route shown on map → Start
- What happens if you go off-route (warning shown, no auto-reroute in v1)
- What happens if GPS is disrupted mid-route (dead reckoning continues route following)

**E2-F4: Positioning Modes Explained** (`/how-to/positioning-modes`)
- Three modes: GPS, Enhanced (GPS + OBD2 fusion), Dead Reckoning
- What triggers each mode, what the map indicator looks like for each
- Accuracy expectations: ≤ 5m fused, < 5% drift per 10km in DR with OBD2
- How the app returns from DR to GPS (confidence below 0.3 for 30 continuous seconds)
- Manual override: how to force GPS mode or DR mode

**E2-F5: Reading the Diagnostics Screen** (`/how-to/diagnostics`)
- How to open the diagnostics screen
- What each value means: GPS position + accuracy, OBD2 speed + RPM, gyroscope yaw rate, compass heading, EKF fused position, spoof confidence score, per-detector sub-scores
- How to use diagnostics to verify the system before a drive

**Acceptance Criteria:**
- [ ] Every how-to page has consistent site header/footer
- [ ] Every how-to page links to its relevant troubleshooting page
- [ ] All steps numbered, ≤ 2 sentences each
- [ ] No features described that are not in v1 of the app
- [ ] Pages readable as plain text — no interactive elements required

---

### 4.3 Epic 3 — Troubleshooting Pages

**E3-F1: OBD2 Not Connecting** (`/troubleshooting/obd2-not-connecting`)
- Checklist: adapter plugged in? Bluetooth on? Location permission granted?
- Common causes: WiFi adapter (not Bluetooth Classic), adapter needs reset, wrong SPP profile
- How to reset an ELM327 adapter
- How to verify Bluetooth Classic / SPP in Android settings
- When to replace the adapter (cheap clones with firmware issues)

**E3-F2: GPS Alert Appeared** (`/troubleshooting/gps-alert-appeared`)
- What the yellow warning banner and red Dead Reckoning banner each mean
- Confidence threshold explanation (0.6 = warning, 0.8 = switches to DR mode)
- Causes of false positives: tunnels, underground parking, dense urban canyons
- How to manually override to force GPS mode
- How to return to normal after the disruption passes

**E3-F3: Position Is Wrong** (`/troubleshooting/position-is-wrong`)
- Is OBD2 connected? (most DR accuracy depends on OBD2 speed input)
- How long has DR been active? (drift accumulates over time — check diagnostics)
- How to check accumulated error in the diagnostics screen
- How position resets when GPS is re-trusted

**E3-F4: Map Not Loading** (`/troubleshooting/map-not-loading`)
- Check if region was fully downloaded (progress reached 100%?)
- How to re-download a region
- Storage space requirements per region
- Interrupted download corruption — how to clear cache and re-download

**Acceptance Criteria:**
- [ ] Each page addresses a specific visible error state from the app
- [ ] Each troubleshooting page links back to the how-to page for that feature
- [ ] No jargon without a plain-language explanation alongside it
- [ ] Steps numbered and each one is a single, actionable instruction

---

### 4.4 Epic 4 — Regional Data Package Infrastructure

This is backend infrastructure. Users don't interact with it directly — the mobile app does. The package structure is designed once now and populated incrementally as app features ship.

**E4-F1: Regional Package Structure (R2 bucket)**

Each Ukrainian oblast gets its own directory with one file slot per data type. V1 populates `maps/` only. Subsequent app versions add files to the same structure without changing the schema.

```
trueroute-data/                                  ← R2 bucket name
│
├── index.json                                   ← Region + asset manifest (app-facing)
│
├── regions/
│   ├── kyiv-oblast/
│   │   ├── maps/kyiv-oblast.pmtiles             ← v1 ✓  (Protomaps)
│   │   ├── routing/kyiv-oblast.valhalla         ← v2 (planned — Valhalla-Mobile)
│   │   ├── geocode/kyiv-oblast.db               ← v1 ✓  (SQLite search index)
│   │   └── poi/kyiv-oblast-cameras.json         ← v1 ✓  (speed cameras + limits)
│   │
│   ├── kharkiv-oblast/
│   │   ├── maps/kharkiv-oblast.pmtiles          ← v1 ✓
│   │   ├── routing/kharkiv-oblast.valhalla      ← v2
│   │   ├── geocode/kharkiv-oblast.db            ← v1 ✓
│   │   └── poi/kharkiv-oblast-cameras.json      ← v1 ✓
│   │
│   └── ... (all 25 Ukrainian oblasts, same structure)
│
└── metadata/
    └── checksums.json                           ← SHA256 per file, all asset types
```

**All 25 Ukrainian oblasts included in v1:**
Cherkasy, Chernihiv, Chernivtsi, Crimea, Dnipropetrovsk, Donetsk, Ivano-Frankivsk, Kharkiv, Kherson, Khmelnytskyi, Kirovohrad, Kyiv (oblast), Kyiv (city), Luhansk, Lviv, Mykolaiv, Odesa, Poltava, Rivne, Sumy, Ternopil, Vinnytsia, Volyn, Zakarpattia, Zaporizhzhia, Zhytomyr

**E4-F2: Region Index Schema** (`index.json`)

The app reads this file to know what is available for download. Each region lists which asset types exist and their download URLs, sizes, and checksums. Missing asset types are omitted (not null) so the app can conditionally show download options.

```typescript
// index.json schema (Zod-validated)
type RegionIndex = {
  version: number           // schema version for forward compatibility
  generatedAt: string       // ISO timestamp
  regions: Region[]
}

type Region = {
  id: string                // e.g. "kyiv-oblast"
  name: string              // e.g. "Kyiv Oblast"
  nameUk: string            // e.g. "Київська область"
  assets: {
    maps: Asset             // v1: always present
    geocode: Asset          // v1: always present (SQLite search index)
    poi: Asset              // v1: always present (speed cameras + speed limits)
    routing?: Asset         // v2: present only when Valhalla file exists in R2
  }
}

type Asset = {
  url: string               // full CDN URL
  sizeBytes: number
  sha256: string
  generatedAt: string
}
```

**E4-F3: Region Index API** (`/api/data/index`)
- Returns the parsed + validated `index.json` from R2
- Cache: `s-maxage=3600, stale-while-revalidate=86400`
- Response schema validated with Zod against the `RegionIndex` type
- Graceful error if R2 unavailable (returns 503 with `Retry-After` header)

**E4-F4: Protomaps Build Pipeline** (`scripts/build-region.sh`)
- Input: OpenStreetMap `.osm.pbf` extract for a region (from Geofabrik Ukraine)
- **Step 1 — Maps:** `pmtiles` CLI → `{id}.pmtiles` → upload to `regions/{id}/maps/`
- **Step 2 — Geocode:** OSM data → SQLite search index → `{id}.db` → upload to `regions/{id}/geocode/`  
  Tool: `nominatim` or `pelias` offline pipeline (TBD by engineering — see Open Questions)
- **Step 3 — POI:** extract speed cameras + speed limits from OSM tags → `{id}-cameras.json` → upload to `regions/{id}/poi/`  
  Format: GeoJSON FeatureCollection with `type: "speed_camera" | "speed_limit"` properties
- **Post-build:** regenerate `index.json` and `checksums.json`, upload both
- Script is idempotent — safe to re-run after OSM data updates
- **V2 hook:** script has a commented-out Step 4 for Valhalla tile generation, with docs explaining what to uncomment

**E4-F5: CDN Delivery**
- All files in `regions/` served directly from R2 via Cloudflare CDN (not proxied)
- R2 bucket: public read for `regions/` prefix, private for everything else
- CORS: open for all origins (app needs direct CDN access)
- Range requests supported natively by R2 — required for PMTiles partial reads

**E4-F6: R2 Client Utility** (`src/lib/r2.ts`)
- Typed wrapper around `@aws-sdk/client-s3` (S3-compatible)
- Exports: `getR2Object<T>()`, `listR2Objects()`, `getR2Metadata()`
- Mock-able via dependency injection for tests
- Credentials only via Cloudflare binding — never hardcoded

**Acceptance Criteria:**
- [ ] All 25 oblast `.pmtiles` files present in R2 under `regions/{id}/maps/`
- [ ] All 25 oblast `.db` geocode files present in R2 under `regions/{id}/geocode/`
- [ ] All 25 oblast `-cameras.json` POI files present in R2 under `regions/{id}/poi/`
- [ ] `index.json` lists all 25 regions, each with required `maps`, `geocode`, `poi` asset entries; no `routing` entries (v2)
- [ ] `/api/data/index` returns valid JSON matching `RegionIndex` Zod schema
- [ ] `.pmtiles` files downloadable with Range header support confirmed
- [ ] `.db` and `.json` files downloadable via CDN URL
- [ ] `checksums.json` SHA256 values match actual files (CI step validates this)
- [ ] R2 bucket directory listing disabled
- [ ] Build pipeline script documented in `scripts/README.md`

---

### 4.5 Epic 5 — Infrastructure & Quality

**E5-F1: Next.js 15 App Setup**
- App Router, TypeScript strict mode, no `any`
- Tailwind CSS 4
- `pnpm` as package manager
- MDX support for documentation pages (`/how-to/` and `/troubleshooting/` content in Markdown)
- `generateStaticParams` for all doc pages (fully static, no server needed at read time)
- **i18n-ready:** use `next-intl` from day one; v1 ships English only (`en`), Ukrainian (`uk`) added in v2 without structural changes
- **Play Store URL configurable** via `NEXT_PUBLIC_PLAY_STORE_URL` env variable; if not set, CTA button renders as "Coming Soon" (disabled state) — no hardcoded URL anywhere in code

**E5-F2: Cloudflare Pages Deployment**
- Auto-deploy from `main` branch
- Preview deploys on every PR
- R2 bucket bound via Cloudflare binding (not exposed credentials)

**E5-F3: GitHub Actions CI**
- On PR: typecheck + lint + vitest + CF preview deploy
- On merge to main: production deploy + R2 checksum validation script

**E5-F4: SEO**
- `<meta>` title, description, OG image per page
- `sitemap.xml` including all how-to and troubleshooting pages
- `robots.txt`
- Structured data (FAQ schema on troubleshooting pages)

---

## 5. Content Template — How-To & Troubleshooting Pages

Every documentation page follows this exact layout:

```
# [Page Title]

[One sentence: what you will be able to do after reading this]

## What you need
- [Prerequisite 1]
- [Prerequisite 2]

## Steps
1. [Single action. One or two sentences max.]
2. [Single action.]
3. ...

## What success looks like
[One sentence or screenshot placeholder describing the expected outcome]

## Something went wrong?
[Top 2 common issues inline, then link to troubleshooting page]

## Related
- [Link to related how-to or troubleshooting page]
- [Link to related how-to or troubleshooting page]
```

### Writing Rules
- Imperative voice in steps: "Tap X", not "X should be tapped"
- ≤ 2 sentences per step
- Screenshot placeholder `[screenshot: description]` per key step — actual screenshots added after app is testable
- No feature mentioned that is not in the shipped v1 app

---

## 6. Technical Architecture

```
Browser / Mobile App
  └── Next.js 15 (Cloudflare Pages — static export + edge API)
        ├── / — Landing page (Server Component, static)
        ├── /how-to/[slug] — MDX pages (generateStaticParams, fully static)
        ├── /troubleshooting/[slug] — MDX pages (generateStaticParams, fully static)
        └── /api/data/index — Route Handler (edge, reads R2 index.json)

Cloudflare R2 (trueroute-data bucket)
  ├── index.json ← served via /api/data/index (validated, cached)
  ├── regions/
  │   └── {oblast-id}/
  │       ├── maps/{oblast-id}.pmtiles       ← CDN direct (v1 ✓)
  │       ├── routing/{oblast-id}.valhalla   ← CDN direct (v2 slot)
  │       ├── geocode/{oblast-id}.db         ← CDN direct (v1 ✓)
  │       └── poi/{oblast-id}-cameras.json   ← CDN direct (v1 ✓)
  └── metadata/checksums.json

Build Pipeline (scripts/build-region.sh)
  └── Per oblast: .osm.pbf (Geofabrik)
        ├── pmtiles CLI → maps/*.pmtiles
        ├── geocode pipeline → geocode/*.db
        ├── OSM tag extraction → poi/*-cameras.json
        └── Post-build: regenerate index.json + checksums.json
```

### Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Docs format | MDX in `/content/` | Written in Markdown, no CMS, version-controlled |
| Map tile format | PMTiles via Protomaps | Single-file, range-request efficient, good OSM toolchain |
| Package structure | Per-region directories with asset-type subdirs | Scales to routing/geocode/POI without schema changes |
| R2 bucket name | `trueroute-data` (not `trueroute-maps`) | Name reflects full multi-asset future, not just maps |
| API endpoint | `/api/data/index` (not `/api/maps/index`) | Consistent with broader data package scope |
| No embedded map | Intentional | Website is docs + download hub; map lives in the app |
| Static doc pages | `generateStaticParams` | Zero server cost, instant loads, works at edge |
| i18n library | `next-intl` | App Router-compatible, file-based translations, zero runtime cost for static pages |
| Play Store URL | `NEXT_PUBLIC_PLAY_STORE_URL` env var | Configurable pre-launch; CTA shows "Coming Soon" when unset |
| Analytics | Cloudflare Web Analytics | No cookies, no GDPR banner needed |

---

## 7. Milestones

| Milestone | Scope |
|-----------|-------|
| **M1: Infrastructure** | Repo, CI, Cloudflare Pages, R2 bucket setup, CLAUDE.md |
| **M2: Regional Data Packages** | R2 structure, Protomaps build pipeline for all 25 oblasts, `/api/data/index`, CDN + CORS config |
| **M3: Landing Page** | All landing page sections (Hero through Footer), i18n setup |
| **M4: Documentation** | 5 how-to pages + 4 troubleshooting pages in MDX |

---

## 8. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Geocode pipeline tooling — Nominatim offline, Pelias, or a lighter SQLite-based tool (e.g. `libpostal` + custom indexer)? Affects `scripts/build-region.sh` Step 2 implementation. | Engineering | Open |

---

## 9. Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Play Store URL | Not available at launch. Configured via `NEXT_PUBLIC_PLAY_STORE_URL` env var. When unset, CTA renders "Coming Soon" (button disabled). Owner sets it in Cloudflare Pages env before launch. |
| 2 | Regions in v1 | All 25 Ukrainian oblasts. See oblast list in E4-F1. |
| 3 | App screenshots | Provided by owner when app is published to Play Store. How-to pages use `[screenshot: description]` placeholders in MDX until then. |
| 4 | Documentation language | English only for v1. Built with `next-intl` from day one — Ukrainian (`uk`) added in v2 by adding translation files, no structural changes needed. |
| 5 | PMTiles tooling | **Protomaps** (`pmtiles` CLI). Input: Geofabrik `.osm.pbf` per oblast. See `scripts/build-region.sh`. |
| 6 | Regional package scope | `maps/` + `geocode/` + `poi/` are all **v1**. `routing/` (Valhalla) is v2. Build pipeline generates all three v1 asset types per region in a single run. |
