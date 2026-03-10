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
| `jq` | any | `apt install jq` or `brew install jq` |

### Ubuntu/Debian Installation

```bash
# System packages
sudo apt update
sudo apt install -y osmium-tool python3 python3-pip curl jq

# Python osmium bindings
pip install osmium

# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# pmtiles (download latest release from GitHub)
# See: https://github.com/protomaps/go-pmtiles/releases
# Example:
#   wget https://github.com/protomaps/go-pmtiles/releases/latest/download/go-pmtiles_Linux_x86_64.tar.gz
#   tar -xzf go-pmtiles_Linux_x86_64.tar.gz
#   sudo mv pmtiles /usr/local/bin/
```

## Required Environment Variables

Set these in `.env.local` or export them before running:

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT_URL` | Cloudflare R2 S3-compatible endpoint (e.g. `https://<account-id>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key |
| `R2_BUCKET_NAME` | R2 bucket name (defaults to `trueroute-data`) |

## Running the Pipeline

### 1. Validate prerequisites

Run the pre-flight check to confirm all tools and env vars are available:

```bash
./scripts/validate-pipeline.sh
```

Fix any `FAIL` items before continuing.

### 2. Test with a single region

Pick a small region for a test run:

```bash
./scripts/build-region.sh chernivtsi
```

This downloads the OSM extract, builds all three assets, and uploads to R2.
A small region like `chernivtsi` takes ~10–20 minutes depending on bandwidth.

### 3. Run all regions

```bash
./scripts/build-all-regions.sh
```

This reads `regions.txt` (26 regions) and processes them sequentially.

**Expected total run time:** ~4–8 hours for all regions, depending on bandwidth and CPU.

**Storage requirements:** ~15–30 GB of temporary disk space. Each region's temp files
are cleaned up automatically after processing, but the largest single region can
use ~2–3 GB of temp space during its build.

### Resuming after interruption

The pipeline is idempotent — you can safely re-run `build-all-regions.sh` after an
interruption. Regions that already completed will re-process (uploading identical
files to R2), and any failed region will be retried. The summary at the end reports
which regions passed and which failed.

To resume from a specific region, run individual regions manually:

```bash
./scripts/build-region.sh kharkiv
./scripts/build-region.sh kherson
# ... continue with remaining regions
```

## Usage

### Single region

```bash
./scripts/build-region.sh kyiv-oblast
```

### All 26 regions

```bash
./scripts/build-all-regions.sh
```

## What it does

### Step 1 — Protomaps (PMTiles)

1. Downloads the `.osm.pbf` extract from Geofabrik for the given region
2. Converts to `.pmtiles` with `pmtiles convert` (minzoom=5, maxzoom=15)
3. Uploads to R2 at `regions/{id}/maps/{id}.pmtiles`

### Step 2 — Geocode SQLite Index

1. Filters OSM data for named places (`n/name=*`) and addresses (`n/addr:street=*`, `n/addr:housenumber=*`, `w/addr:housenumber=*`) using `osmium tags-filter`
2. Merges both extracts with `osmium merge`
3. Runs `build-geocode-db.py` to parse nodes and building way centroids, building a SQLite FTS5 database
4. Database schema:
   - `places` table: `id`, `name`, `name_uk`, `name_en`, `addr_street`, `addr_housenumber`, `city`, `lat`, `lng`, `type`
   - `places_fts` virtual table: FTS5 index on `name`, `name_uk`, `name_en`
5. Place types: `city`, `town`, `village`, `hamlet`, `suburb`, `neighbourhood`, `street`, `address`
6. Uploads to R2 at `regions/{id}/geocode/{id}.db`

### Step 3 — POI Extraction (Safety + Navigation)

> **Note:** This data is for the TrueRoute mobile app ONLY — it is NOT rendered on the website.

1. Runs `build-poi-json.py` on the region PBF to produce two GeoJSON files:
   - **Safety POIs** (`{id}-cameras.json`): Speed cameras + railroad crossings
   - **Navigation POIs** (`{id}-nav-poi.json`): Fuel, hospital/clinic, pharmacy, parking
2. Speed camera features: Point geometry at node location with `maxspeed` (km/h or null), `direction` (degrees or null), `camera_type`
3. Railroad crossing features: Point geometry at level crossing nodes
4. Navigation POI features: Point geometry (node or way centroid) with `name`, `name_uk`, `brand` (fuel)
5. Speed limit midpoints removed — maxspeed data now lives in the PMTiles transportation layer
6. Validates both output files are valid JSON
7. Uploads both to R2 at `regions/{id}/poi/{id}-cameras.json` and `regions/{id}/poi/{id}-nav-poi.json`

Step 4 (Valhalla routing) is a v2 feature — commented out.

### Post-Build — Generate index.json and checksums.json

After all regions are uploaded, run:

```bash
./scripts/generate-index.sh
```

This script:

1. Lists all objects under `regions/` in the R2 bucket
2. Downloads each of the 78 assets (3 per region x 26 regions) to compute SHA256 checksums
3. Calls `generate-index.py` to build `index.json` conforming to the `RegionIndex` Zod schema
4. Builds `checksums.json` with SHA256 per file for integrity verification
5. Uploads `index.json` to the bucket root and `checksums.json` to `metadata/`

**Prerequisites:** `aws` CLI v2, `python3` 3.9+, `sha256sum` (coreutils)

**Optional env var:** `CDN_BASE_URL` — public CDN URL prefix for asset URLs in index.json (defaults to `https://cdn.trueroutenavigation.com`)

**Output files in R2:**

| Key | Description |
|-----|-------------|
| `index.json` | RegionIndex manifest — the mobile app reads this to discover available regions |
| `metadata/checksums.json` | SHA256 per file for all regional assets — used for integrity verification |

The script is idempotent — safe to re-run after any region rebuild.

## Expected Output Sizes (rough estimates)

| Region | `.osm.pbf` | `.pmtiles` |
|--------|-----------|------------|
| Small oblast (e.g. chernivtsi) | ~20–40 MB | ~15–30 MB |
| Medium oblast (e.g. lviv) | ~50–100 MB | ~40–80 MB |
| Large oblast (e.g. dnipropetrovsk) | ~80–150 MB | ~60–120 MB |
| kyiv-city | ~40–80 MB | ~30–60 MB |

Total for all 26 regions: roughly 1–3 GB of PMTiles.

## Region IDs

See `regions.txt` for the canonical list of all 26 Ukrainian region IDs.
