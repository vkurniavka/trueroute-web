#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# build-region.sh — Build regional data package for one Ukrainian oblast
#
# Usage:
#   ./scripts/build-region.sh <region-id>
#   ./scripts/build-region.sh <region-id> --ukraine-pbf /path/to/ukraine-latest.osm.pbf
#
# If --ukraine-pbf is not provided, the script downloads ukraine-latest.osm.pbf
# from Geofabrik (~1.6 GB). When building all regions, pass a shared PBF path
# from build-all-regions.sh to avoid downloading it 26 times.
#
# Steps:
#   1. Extract oblast from Ukraine PBF using osmium extract (bbox from regions-bbox.json)
#   2. Build PMTiles: tilemaker (→ .mbtiles) + pmtiles convert (→ .pmtiles) → R2
#   3. Build geocode SQLite FTS5 index → R2
#   4. Build POI GeoJSON (speed cameras + limits) → R2
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEOFABRIK_UKRAINE="https://download.geofabrik.de/europe/ukraine-latest.osm.pbf"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
REGION_ID="${1:-}"
UKRAINE_PBF=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ukraine-pbf)
      UKRAINE_PBF="$2"
      shift 2
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -z "$REGION_ID" ]] && die "Usage: $0 <region-id> [--ukraine-pbf /path/to/ukraine-latest.osm.pbf]"

# ---------------------------------------------------------------------------
# Check bounding box exists for this region
# ---------------------------------------------------------------------------
BBOX_FILE="$SCRIPT_DIR/regions-bbox.json"
[[ -f "$BBOX_FILE" ]] || die "regions-bbox.json not found at $BBOX_FILE"

BBOX=$(python3 -c "
import json, sys
data = json.load(open('$BBOX_FILE'))
region = '$REGION_ID'
if region not in data:
    print(f'ERROR: No bounding box for region: {region}', file=sys.stderr)
    sys.exit(1)
bbox = data[region]
print(f'{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}')
") || die "Unknown region '$REGION_ID' — add it to regions-bbox.json"

log "Region: $REGION_ID  bbox: $BBOX"

# ---------------------------------------------------------------------------
# Check required tools
# ---------------------------------------------------------------------------
for cmd in tilemaker pmtiles sqlite3 osmium python3 aws curl; do
  command -v "$cmd" >/dev/null 2>&1 || die "Required tool not found: $cmd"
done

# ---------------------------------------------------------------------------
# Check required env vars
# ---------------------------------------------------------------------------
: "${R2_ENDPOINT_URL:?R2_ENDPOINT_URL is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"
: "${R2_BUCKET_NAME:=trueroute-data}"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

# ---------------------------------------------------------------------------
# Temp directory with cleanup trap
# ---------------------------------------------------------------------------
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
log "Temp dir: $TMPDIR"

# ===========================================================================
# Stage A — Ukraine PBF (download if not provided)
# ===========================================================================
if [[ -n "$UKRAINE_PBF" ]]; then
  [[ -f "$UKRAINE_PBF" ]] || die "--ukraine-pbf path does not exist: $UKRAINE_PBF"
  log "Using provided Ukraine PBF: $UKRAINE_PBF ($(du -h "$UKRAINE_PBF" | cut -f1))"
else
  UKRAINE_PBF="$TMPDIR/ukraine-latest.osm.pbf"
  log "Downloading Ukraine OSM extract from Geofabrik..."
  curl -L --fail --progress-bar -o "$UKRAINE_PBF" "$GEOFABRIK_UKRAINE"
  log "Download complete — $(du -h "$UKRAINE_PBF" | cut -f1)"
fi

# ===========================================================================
# Stage B — Extract oblast from Ukraine PBF
# ===========================================================================
log "Extracting oblast '$REGION_ID' from Ukraine PBF (bbox: $BBOX)..."
OSM_FILE="$TMPDIR/${REGION_ID}.osm.pbf"
osmium extract \
  --bbox "$BBOX" \
  --strategy complete_ways \
  --output "$OSM_FILE" \
  --overwrite \
  "$UKRAINE_PBF"
log "Oblast extract complete — $(du -h "$OSM_FILE" | cut -f1)"

# ===========================================================================
# Step 1 — PMTiles (tilemaker → MBTiles, pmtiles convert → PMTiles)
# ===========================================================================
log "Step 1: Building PMTiles (tilemaker → MBTiles → PMTiles)..."
MBTILES_FILE="$TMPDIR/${REGION_ID}.mbtiles"
PMTILES_FILE="$TMPDIR/${REGION_ID}.pmtiles"
mkdir -p "$TMPDIR/tilemaker-store"

tilemaker \
  --input "$OSM_FILE" \
  --output "$MBTILES_FILE" \
  --config "$SCRIPT_DIR/tilemaker/config.json" \
  --process "$SCRIPT_DIR/tilemaker/process.lua" \
  --store "$TMPDIR/tilemaker-store"
log "Step 1: MBTiles complete — $(du -h "$MBTILES_FILE" | cut -f1)"

# tilemaker 2.4 does not write bounds metadata to MBTiles — pmtiles convert
# requires it. Inject the bbox from regions-bbox.json into the metadata table.
log "Step 1: Injecting bounds metadata into MBTiles..."
sqlite3 "$MBTILES_FILE" \
  "INSERT OR REPLACE INTO metadata(name,value) VALUES('bounds','$BBOX');"

pmtiles convert "$MBTILES_FILE" "$PMTILES_FILE"
rm -f "$MBTILES_FILE"
log "Step 1: PMTiles ready — $(du -h "$PMTILES_FILE" | cut -f1)"

log "Step 1: Uploading to R2..."
aws s3 cp "$PMTILES_FILE" \
  "s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/maps/${REGION_ID}.pmtiles" \
  --endpoint-url "$R2_ENDPOINT_URL"
log "Step 1: Upload complete"

# ===========================================================================
# Step 2 — Geocode SQLite Index
# ===========================================================================
log "Step 2: Filtering OSM for named places + addresses..."
osmium tags-filter "$OSM_FILE" n/name=* \
  -o "$TMPDIR/${REGION_ID}-named.osm.pbf" --overwrite

osmium tags-filter "$OSM_FILE" n/addr:street=* \
  -o "$TMPDIR/${REGION_ID}-addr.osm.pbf" --overwrite

osmium merge \
  "$TMPDIR/${REGION_ID}-named.osm.pbf" \
  "$TMPDIR/${REGION_ID}-addr.osm.pbf" \
  -o "$TMPDIR/${REGION_ID}-places.osm.pbf" --overwrite

log "Step 2: Building SQLite FTS5 geocode database..."
python3 "$SCRIPT_DIR/build-geocode-db.py" \
  "$TMPDIR/${REGION_ID}-places.osm.pbf" \
  "$TMPDIR/${REGION_ID}.db"
log "Step 2: Geocode DB complete — $(du -h "$TMPDIR/${REGION_ID}.db" | cut -f1)"

log "Step 2: Uploading to R2..."
aws s3 cp "$TMPDIR/${REGION_ID}.db" \
  "s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/geocode/${REGION_ID}.db" \
  --endpoint-url "$R2_ENDPOINT_URL"
log "Step 2: Upload complete"

# ===========================================================================
# Step 3 — POI (speed cameras + speed limits → GeoJSON)
# ===========================================================================
log "Step 3: Filtering OSM for speed cameras..."
osmium tags-filter "$OSM_FILE" \
  n/highway=speed_camera n/enforcement=maxspeed \
  -o "$TMPDIR/${REGION_ID}-cameras.osm.pbf" --overwrite

log "Step 3: Filtering OSM for speed limits..."
osmium tags-filter "$OSM_FILE" \
  w/maxspeed=* \
  -o "$TMPDIR/${REGION_ID}-limits.osm.pbf" --overwrite

log "Step 3: Converting to GeoJSON..."
python3 "$SCRIPT_DIR/build-poi-json.py" \
  "$TMPDIR/${REGION_ID}-cameras.osm.pbf" \
  "$TMPDIR/${REGION_ID}-limits.osm.pbf" \
  "$TMPDIR/${REGION_ID}-cameras.json"

python3 -c 'import json,sys; json.load(open(sys.argv[1]))' \
  "$TMPDIR/${REGION_ID}-cameras.json" || die "Step 3: Invalid JSON output"
log "Step 3: GeoJSON valid — $(du -h "$TMPDIR/${REGION_ID}-cameras.json" | cut -f1)"

log "Step 3: Uploading to R2..."
aws s3 cp "$TMPDIR/${REGION_ID}-cameras.json" \
  "s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/poi/${REGION_ID}-cameras.json" \
  --endpoint-url "$R2_ENDPOINT_URL"
log "Step 3: Upload complete"

log "Done — $REGION_ID (pmtiles + geocode + poi) complete"
