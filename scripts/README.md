# scripts/ — Regional Data Build Pipeline

Builds regional data packages for TrueRoute and uploads them to Cloudflare R2.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| `pmtiles` | latest | [go-pmtiles](https://github.com/protomaps/go-pmtiles) |
| `aws` CLI | v2 | [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| `curl` | any | pre-installed on most systems |
| `osmium` | latest | [Osmium Tool](https://osmcode.org/osmium-tool/) — `apt install osmium-tool` or `brew install osmium-tool` |
| `python3` | 3.9+ | pre-installed on most systems |
| `pip install osmium` | latest | Python bindings for osmium — `pip install osmium` |

## Required Environment Variables

Set these in `.env.local` or export them before running:

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT_URL` | Cloudflare R2 S3-compatible endpoint (e.g. `https://<account-id>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key |
| `R2_BUCKET_NAME` | R2 bucket name (defaults to `trueroute-data`) |

## Usage

### Single region

```bash
./scripts/build-region.sh kyiv-oblast
```

### All 25 regions

```bash
./scripts/build-all-regions.sh
```

## What it does

### Step 1 — Protomaps (PMTiles)

1. Downloads the `.osm.pbf` extract from Geofabrik for the given region
2. Converts to `.pmtiles` with `pmtiles convert` (minzoom=5, maxzoom=14)
3. Uploads to R2 at `regions/{id}/maps/{id}.pmtiles`

### Step 2 — Geocode SQLite Index

1. Filters OSM data for named places (`n/name=*`) and addresses (`n/addr:street=*`) using `osmium tags-filter`
2. Merges both extracts with `osmium merge`
3. Runs `build-geocode-db.py` to parse nodes and build a SQLite FTS5 database
4. Database schema:
   - `places` table: `id`, `name`, `name_uk`, `name_en`, `lat`, `lng`, `type`
   - `places_fts` virtual table: FTS5 index on `name`, `name_uk`, `name_en`
5. Place types: `city`, `town`, `village`, `hamlet`, `suburb`, `neighbourhood`, `street`
6. Uploads to R2 at `regions/{id}/geocode/{id}.db`

Step 3 (POI) is placeholder — not yet implemented.
Step 4 (Valhalla routing) is a v2 feature — commented out.

## Expected Output Sizes (rough estimates)

| Region | `.osm.pbf` | `.pmtiles` |
|--------|-----------|------------|
| Small oblast (e.g. chernivtsi) | ~20–40 MB | ~15–30 MB |
| Medium oblast (e.g. lviv) | ~50–100 MB | ~40–80 MB |
| Large oblast (e.g. dnipropetrovsk) | ~80–150 MB | ~60–120 MB |
| kyiv-city | ~40–80 MB | ~30–60 MB |

Total for all 25 regions: roughly 1–3 GB of PMTiles.

## Region IDs

See `regions.txt` for the canonical list of all 25 Ukrainian oblast IDs.
