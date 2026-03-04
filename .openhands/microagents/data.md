---
triggers:
  - type: data
  - pmtiles
  - protomaps
  - oblast
  - osm.pbf
  - build-region
  - geocode
  - checksums
  - index.json
---

# Data Pipeline — TrueRoute

Read the full skill file before writing any code: `docs/skills/data-skill/SKILL.md`

## What the Pipeline Produces (per oblast)

```
regions/{id}/maps/{id}.pmtiles        ← Step 1: Protomaps
regions/{id}/geocode/{id}.db          ← Step 2: SQLite FTS5 index
regions/{id}/poi/{id}-cameras.json    ← Step 3: GeoJSON speed cameras + limits
```

Plus after all regions: `index.json` and `metadata/checksums.json`

## R2 Bucket

Name: `trueroute-data` — never `trueroute-maps` or anything else.

## index.json — Critical Rules

- `routing` field must be **absent** (not `null`) for every region in v1
- Must contain exactly **25** regions
- Validate against `src/schemas/regions.schema.ts` before uploading

## 25 Oblast IDs — Use These Exactly

```
cherkasy-oblast      chernihiv-oblast     chernivtsi-oblast
crimea               dnipropetrovsk-oblast donetsk-oblast
ivano-frankivsk-oblast kharkiv-oblast     kherson-oblast
khmelnytskyi-oblast  kirovohrad-oblast    kyiv-oblast
kyiv-city            luhansk-oblast       lviv-oblast
mykolaiv-oblast      odesa-oblast         poltava-oblast
rivne-oblast         sumy-oblast          ternopil-oblast
vinnytsia-oblast     volyn-oblast         zakarpattia-oblast
zaporizhzhia-oblast  zhytomyr-oblast
```

`kyiv-oblast` and `kyiv-city` are separate. 25 total.

## Idempotency

Every script must check if file already exists in R2 and skip if SHA256 matches.
Exit with non-zero code on any upload failure — never silently continue.

## V2 Valhalla

The `routing/` step is commented out in `build-region.sh`. Do not uncomment it.