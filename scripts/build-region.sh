#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# build-region.sh — Build regional data package (Steps 1–2)
#
# Usage: ./scripts/build-region.sh <region-id>
# Example: ./scripts/build-region.sh kyiv-oblast
#
# Downloads OSM extract from Geofabrik, converts to PMTiles, builds geocode
# SQLite FTS5 index, and uploads both to R2.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GEOFABRIK_BASE="https://download.geofabrik.de/europe/ukraine"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Validate argument
# ---------------------------------------------------------------------------
REGION_ID="${1:-}"
if [[ -z "$REGION_ID" ]]; then
  die "Usage: $0 <region-id>  (e.g. kyiv-oblast)"
fi

# ---------------------------------------------------------------------------
# Check required tools
# ---------------------------------------------------------------------------
for cmd in pmtiles aws curl osmium python3; do
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
# Create temp directory with cleanup trap
# ---------------------------------------------------------------------------
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

log "Region: $REGION_ID"
log "Temp dir: $TMPDIR"

# ===========================================================================
# Step 1 — Protomaps (PMTiles)
# ===========================================================================
log "Step 1: Downloading OSM extract from Geofabrik..."
OSM_FILE="$TMPDIR/${REGION_ID}-latest.osm.pbf"
curl -L --fail --progress-bar \
  -o "$OSM_FILE" \
  "${GEOFABRIK_BASE}/${REGION_ID}-latest.osm.pbf"
log "Step 1: Download complete — $(du -h "$OSM_FILE" | cut -f1)"

log "Step 1: Converting to PMTiles (minzoom=5, maxzoom=14)..."
PMTILES_FILE="$TMPDIR/${REGION_ID}.pmtiles"
pmtiles convert "$OSM_FILE" "$PMTILES_FILE" \
  --maxzoom=14 \
  --minzoom=5 \
  --attribution='© OpenStreetMap contributors'
log "Step 1: Conversion complete — $(du -h "$PMTILES_FILE" | cut -f1)"

log "Step 1: Uploading to R2 — s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/maps/${REGION_ID}.pmtiles"
aws s3 cp "$PMTILES_FILE" \
  "s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/maps/${REGION_ID}.pmtiles" \
  --endpoint-url "$R2_ENDPOINT_URL"
log "Step 1: Upload complete"

# ===========================================================================
# Step 2 — Geocode SQLite Index
# ===========================================================================
log "Step 2: Filtering OSM for named places..."
osmium tags-filter "$OSM_FILE" n/name=* \
  -o "$TMPDIR/${REGION_ID}-named.osm.pbf"

log "Step 2: Filtering OSM for address tags..."
osmium tags-filter "$OSM_FILE" n/addr:street=* \
  -o "$TMPDIR/${REGION_ID}-addr.osm.pbf"

log "Step 2: Merging named + address extracts..."
osmium merge \
  "$TMPDIR/${REGION_ID}-named.osm.pbf" \
  "$TMPDIR/${REGION_ID}-addr.osm.pbf" \
  -o "$TMPDIR/${REGION_ID}-places.osm.pbf"

log "Step 2: Building SQLite FTS5 geocode database..."
python3 "$SCRIPT_DIR/build-geocode-db.py" \
  "$TMPDIR/${REGION_ID}-places.osm.pbf" \
  "$TMPDIR/${REGION_ID}.db"
log "Step 2: Geocode DB complete — $(du -h "$TMPDIR/${REGION_ID}.db" | cut -f1)"

log "Step 2: Uploading to R2 — s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/geocode/${REGION_ID}.db"
aws s3 cp "$TMPDIR/${REGION_ID}.db" \
  "s3://${R2_BUCKET_NAME}/regions/${REGION_ID}/geocode/${REGION_ID}.db" \
  --endpoint-url "$R2_ENDPOINT_URL"
log "Step 2: Upload complete"

# ===========================================================================
# Step 3 — POI Extraction (TODO — not yet implemented)
# ===========================================================================
# Placeholder for Step 3: speed cameras + speed limits GeoJSON extraction.
# Requires osmium. When ready:
#   osmium tags-filter {id}.osm.pbf n/highway=speed_camera n/enforcement=maxspeed w/maxspeed -o {id}-poi.osm.pbf
#   Convert to GeoJSON FeatureCollection: {id}-cameras.json
#   Validate: jq '.features | length' {id}-cameras.json

# ===========================================================================
# STEP 4 — VALHALLA ROUTING (V2 — DO NOT UNCOMMENT)
# ===========================================================================
# When Valhalla-Mobile (io.github.rallista:valhalla-mobile) reaches production stability:
# 1. Install valhalla toolchain
# 2. Run: valhalla_build_tiles -c valhalla.json {id}.osm.pbf
# 3. Package tiles: tar -czf {id}.valhalla valhalla_tiles/
# 4. Upload to: regions/{id}/routing/{id}.valhalla
# 5. Add routing: Asset entry to index.json for this region

log "Done — $REGION_ID Steps 1–2 (pmtiles + geocode) complete"
