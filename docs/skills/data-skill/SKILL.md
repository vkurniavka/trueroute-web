---
name: trueroute-data
description: Data pipeline skill for TrueRoute regional data packages. Use for every issue labeled `type: data` — building or modifying scripts that generate PMTiles map files, geocoding SQLite databases, POI JSON files, and uploading them to the `trueroute-data` R2 bucket. Always load this skill before touching anything in `scripts/`, generating `index.json` or `checksums.json`, or running any region build task.
---

# TrueRoute Data Pipeline Skill

You are building or running the regional data package pipeline for TrueRoute.
Each pipeline run produces three files per Ukrainian oblast and uploads them to R2.

## What the Pipeline Produces Per Region

```
regions/{id}/
├── maps/{id}.pmtiles          ← Step 1: Protomaps (vector map tiles)
├── geocode/{id}.db            ← Step 2: SQLite address search index
└── poi/{id}-cameras.json      ← Step 3: GeoJSON speed cameras + speed limits
```

Plus, after all regions are processed:
```
index.json                     ← RegionIndex manifest (app reads this)
metadata/checksums.json        ← SHA256 per file for integrity verification
```

## Input Data

- **Source:** Geofabrik Ukraine extract — `ukraine-latest.osm.pbf`
- **URL:** `https://download.geofabrik.de/europe/ukraine-latest.osm.pbf`
- Oblast-level extracts: `https://download.geofabrik.de/europe/ukraine/` (individual files)
- Always download fresh data before a build run — never commit `.osm.pbf` files

## Step 1 — PMTiles (Protomaps)

```bash
# Install: https://github.com/protomaps/go-pmtiles
pmtiles convert {input}.osm.pbf {id}.pmtiles \
  --maxzoom=14 \
  --attribution="© OpenStreetMap contributors"

# Upload to R2
aws s3 cp {id}.pmtiles \
  s3://trueroute-data/regions/{id}/maps/{id}.pmtiles \
  --endpoint-url $R2_ENDPOINT_URL
```

- Max zoom 14 — sufficient for navigation, keeps file size manageable
- Min zoom 5 — shows oblast-level context
- Attribution is required by OSM license

## Step 2 — Geocode SQLite Index

The geocode tooling is TBD (see `docs/PRD.md` Open Questions). Until resolved, use this
placeholder that produces the correct output schema:

```bash
# Placeholder — extracts named places from OSM for the region
# Produces a SQLite database with FTS5 full-text search

osmium tags-filter {id}.osm.pbf \
  n/name r/name w/name \
  -o {id}-named.osm.pbf

# Build SQLite FTS5 index from named features
# Schema: CREATE TABLE places(id TEXT, name TEXT, nameUk TEXT, lat REAL, lng REAL, type TEXT)
# Index: CREATE VIRTUAL TABLE places_fts USING fts5(name, nameUk, content='places')
```

When engineering resolves the geocode tooling decision, update Step 2 here and in `scripts/build-region.sh`. The output schema above is fixed regardless of tooling choice.

## Step 3 — POI Extraction (Speed Cameras + Speed Limits)

Extract from OSM tags and produce a GeoJSON FeatureCollection:

```bash
# Extract speed enforcement features
osmium tags-filter {id}.osm.pbf \
  n/highway=speed_camera \
  n/enforcement=maxspeed \
  w/maxspeed \
  -o {id}-poi.osm.pbf
```

### Output Schema — `{id}-cameras.json`

```typescript
// GeoJSON FeatureCollection — this schema is consumed by the mobile app
type POIFeature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    type: "speed_camera" | "speed_limit"
    // For speed_camera:
    maxspeed?: number          // km/h enforced
    direction?: number         // bearing in degrees, if known
    camera_type?: "fixed" | "mobile" | "average"
    // For speed_limit (road segments rendered as points at midpoint):
    maxspeed: number           // km/h limit
    road_name?: string
  }
}
```

Validate output with `jq` before uploading:
```bash
jq '.features | length' {id}-cameras.json  # must be > 0
jq '.features[0].properties.type' {id}-cameras.json  # must be "speed_camera" or "speed_limit"
```

## Post-Build — Regenerate index.json and checksums.json

After ALL regions are uploaded, always regenerate both manifest files:

```bash
# scripts/generate-index.sh
# Scans R2 bucket, builds RegionIndex JSON, validates against schema, uploads

# Expected output shape — must match src/schemas/regions.schema.ts exactly:
{
  "version": 1,
  "generatedAt": "2026-03-04T12:00:00Z",
  "regions": [
    {
      "id": "kyiv-oblast",
      "name": "Kyiv Oblast",
      "nameUk": "Київська область",
      "assets": {
        "maps":    { "url": "...", "sizeBytes": 0, "sha256": "...", "generatedAt": "..." },
        "geocode": { "url": "...", "sizeBytes": 0, "sha256": "...", "generatedAt": "..." },
        "poi":     { "url": "...", "sizeBytes": 0, "sha256": "...", "generatedAt": "..." }
        // routing is OMITTED in v1 — not null, not empty — just absent
      }
    },
    // ... all 25 oblasts
  ]
}
```

The `routing` field must be absent (not `null`, not `{}`) for all regions in v1.
The Zod schema in `src/schemas/regions.schema.ts` enforces this — run validation locally.

## Idempotency Rules

Every script must be safe to re-run:

- Check if file already exists in R2 before uploading — skip if SHA256 matches
- Never delete existing files before verifying new ones are ready to replace them
- Log every upload with: region id, asset type, file size, SHA256
- Exit with non-zero code if any upload fails — never silently continue

## Oblast ID Reference

Use these exact IDs in all file names and `index.json` entries:

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

25 total. `index.json` must contain exactly 25 entries.

## V2 Hook — Valhalla (Do Not Implement Now)

The script contains a commented Step 4 block for Valhalla routing tile generation.
Do not uncomment or implement it. The comment explains what to do when v2 starts:

```bash
# STEP 4 — VALHALLA ROUTING (V2 — DO NOT UNCOMMENT)
# When Valhalla-Mobile (io.github.rallista:valhalla-mobile) reaches production stability:
# 1. Install valhalla toolchain
# 2. Run: valhalla_build_tiles -c valhalla.json {id}.osm.pbf
# 3. Package tiles: tar -czf {id}.valhalla valhalla_tiles/
# 4. Upload to: regions/{id}/routing/{id}.valhalla
# 5. Add routing: Asset entry to index.json for this region
```

## Done When

- [ ] All 25 oblast directories exist in R2 with `maps/`, `geocode/`, `poi/` populated
- [ ] `index.json` validates against `RegionIndexSchema` in `src/schemas/regions.schema.ts`
- [ ] No `routing` entries in any region in `index.json`
- [ ] `checksums.json` SHA256 values match actual R2 files (CI validates this)
- [ ] All POI files have `features.length > 0`
- [ ] Build script is idempotent — re-running produces identical output
- [ ] Script documented in `scripts/README.md` with prerequisites and usage
- [ ] V2 Valhalla block is commented out, not deleted