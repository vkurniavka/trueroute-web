#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# generate-index.sh — Generate index.json and checksums.json from R2 bucket
#
# Usage: ./scripts/generate-index.sh
#
# Scans the R2 bucket for all regional assets, computes SHA256 checksums,
# generates index.json and checksums.json, and uploads both to R2.
#
# Required env vars:
#   R2_ENDPOINT_URL        — Cloudflare R2 S3-compatible endpoint
#   R2_ACCESS_KEY_ID       — R2 API token access key ID
#   R2_SECRET_ACCESS_KEY   — R2 API token secret access key
#
# Optional env vars:
#   R2_BUCKET_NAME         — R2 bucket name (default: trueroute-data)
#   CDN_BASE_URL           — Public CDN URL prefix (default: https://cdn.trueroutenavigation.com)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDN_BASE_URL="${CDN_BASE_URL:-https://cdn.trueroutenavigation.com}"

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
# Check required tools
# ---------------------------------------------------------------------------
for cmd in aws python3 sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || die "Required tool not found: $cmd"
done

# ---------------------------------------------------------------------------
# Validate required env vars
# ---------------------------------------------------------------------------
: "${R2_ENDPOINT_URL:?R2_ENDPOINT_URL is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"
: "${R2_BUCKET_NAME:=trueroute-data}"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

REGIONS_FILE="$SCRIPT_DIR/regions.txt"
[[ -f "$REGIONS_FILE" ]] || die "regions.txt not found at $REGIONS_FILE"

# ---------------------------------------------------------------------------
# Create temp directory with cleanup trap
# ---------------------------------------------------------------------------
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

MANIFEST="$WORK_DIR/manifest.jsonl"
: > "$MANIFEST"

log "Starting index generation"
log "Bucket: $R2_BUCKET_NAME"
log "CDN base: $CDN_BASE_URL"
log "Temp dir: $WORK_DIR"

# ---------------------------------------------------------------------------
# Step 1: List all objects under regions/ prefix
# ---------------------------------------------------------------------------
log "Listing objects in s3://$R2_BUCKET_NAME/regions/ ..."

aws s3api list-objects-v2 \
  --bucket "$R2_BUCKET_NAME" \
  --prefix 'regions/' \
  --endpoint-url "$R2_ENDPOINT_URL" \
  --output json > "$WORK_DIR/r2-listing.json"

log "R2 listing saved"

# ---------------------------------------------------------------------------
# Step 2: For each region, verify assets exist and compute checksums
# ---------------------------------------------------------------------------
ASSET_TYPES=("maps" "geocode" "poi")
ERRORS=0

while IFS= read -r region_id; do
  [[ -z "$region_id" || "$region_id" == \#* ]] && continue

  log "Processing region: $region_id"

  KEYS=(
    "regions/${region_id}/maps/${region_id}.pmtiles"
    "regions/${region_id}/geocode/${region_id}.db"
    "regions/${region_id}/poi/${region_id}-cameras.json"
  )

  for i in "${!KEYS[@]}"; do
    key="${KEYS[$i]}"
    asset_type="${ASSET_TYPES[$i]}"

    log "  [$asset_type] Downloading: $key"

    # Download asset to compute SHA256
    if ! aws s3 cp "s3://${R2_BUCKET_NAME}/${key}" "$WORK_DIR/asset_check" \
        --endpoint-url "$R2_ENDPOINT_URL" 2>/dev/null; then
      log "  ERROR: Asset not found in R2: $key"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    # Compute SHA256
    sha256=$(sha256sum "$WORK_DIR/asset_check" | cut -d' ' -f1)

    # Get file size
    sizeBytes=$(stat -c%s "$WORK_DIR/asset_check")

    # Get LastModified from R2 object metadata
    lastModified=$(aws s3api head-object \
      --bucket "$R2_BUCKET_NAME" \
      --key "$key" \
      --endpoint-url "$R2_ENDPOINT_URL" \
      --query 'LastModified' --output text)

    # Clean up downloaded asset
    rm -f "$WORK_DIR/asset_check"

    # Write manifest entry (JSONL — one JSON object per line)
    printf '{"key":"%s","sha256":"%s","sizeBytes":%d,"lastModified":"%s"}\n' \
      "$key" "$sha256" "$sizeBytes" "$lastModified" >> "$MANIFEST"

    log "  [$asset_type] sha256=${sha256:0:16}... size=$sizeBytes"
  done
done < "$REGIONS_FILE"

if [[ "$ERRORS" -gt 0 ]]; then
  die "$ERRORS asset(s) missing in R2 — cannot generate index"
fi

# ---------------------------------------------------------------------------
# Step 3: Generate index.json and checksums.json using Python helper
# ---------------------------------------------------------------------------
log "Generating index.json and checksums.json..."

python3 "$SCRIPT_DIR/generate-index.py" \
  --regions-file "$REGIONS_FILE" \
  --cdn-base-url "$CDN_BASE_URL" \
  --manifest "$MANIFEST" \
  --checksums "$WORK_DIR/checksums.json" \
  > "$WORK_DIR/index.json"

log "index.json generated ($(wc -c < "$WORK_DIR/index.json") bytes)"
log "checksums.json generated ($(wc -c < "$WORK_DIR/checksums.json") bytes)"

# ---------------------------------------------------------------------------
# Step 4: Upload index.json to R2 bucket root
# ---------------------------------------------------------------------------
log "Uploading index.json to s3://$R2_BUCKET_NAME/index.json"

aws s3 cp "$WORK_DIR/index.json" \
  "s3://${R2_BUCKET_NAME}/index.json" \
  --endpoint-url "$R2_ENDPOINT_URL" \
  --content-type "application/json"

log "index.json uploaded"

# ---------------------------------------------------------------------------
# Step 5: Upload checksums.json to R2 metadata/
# ---------------------------------------------------------------------------
log "Uploading checksums.json to s3://$R2_BUCKET_NAME/metadata/checksums.json"

aws s3 cp "$WORK_DIR/checksums.json" \
  "s3://${R2_BUCKET_NAME}/metadata/checksums.json" \
  --endpoint-url "$R2_ENDPOINT_URL" \
  --content-type "application/json"

log "checksums.json uploaded"

log "Done — index.json and metadata/checksums.json generated and uploaded"
