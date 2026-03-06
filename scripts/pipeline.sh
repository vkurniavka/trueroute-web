#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# pipeline.sh — Full TrueRoute data pipeline
#
# Orchestrates three stages in order:
#   1. BUILD  — compile regions (PMTiles + geocode + POI) and upload to R2
#   2. INDEX  — generate index.json + checksums.json and upload to R2
#   3. D1     — seed Cloudflare D1 from the freshly generated index.json
#
# Usage:
#   ./scripts/pipeline.sh                   # all regions, all stages
#   ./scripts/pipeline.sh --region lviv     # single region, all stages
#   ./scripts/pipeline.sh --skip-build      # stages 2+3 only (re-index + seed D1)
#   ./scripts/pipeline.sh --skip-d1         # stages 1+2 only (no D1 update)
#   ./scripts/pipeline.sh --d1-only         # stage 3 only (seed from current R2 index.json)
#   ./scripts/pipeline.sh --dry-run         # validate env + tools, print plan, exit
#
# Required env vars (all stages except --d1-only):
#   R2_ENDPOINT_URL        Cloudflare R2 S3-compatible endpoint URL
#   R2_ACCESS_KEY_ID       R2 API token access key ID
#   R2_SECRET_ACCESS_KEY   R2 API token secret access key
#
# Optional env vars:
#   R2_BUCKET_NAME         R2 bucket name       (default: trueroute-data)
#   CDN_BASE_URL           Public CDN base URL  (default: https://cdn.trueroutenavigation.com)
#   D1_DATABASE_NAME       D1 database name     (default: trueroute-d1)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
R2_BUCKET_NAME="${R2_BUCKET_NAME:-trueroute-data}"
CDN_BASE_URL="${CDN_BASE_URL:-https://cdn.trueroutenavigation.com}"
D1_DATABASE_NAME="${D1_DATABASE_NAME:-trueroute-d1}"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
REGION=""          # empty = all regions
SKIP_BUILD=false
SKIP_D1=false
D1_ONLY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region)
      REGION="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-d1)
      SKIP_D1=true
      shift
      ;;
    --d1-only)
      D1_ONLY=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 [--region <id>] [--skip-build] [--skip-d1] [--d1-only] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

# D1_ONLY implies skip-build
if $D1_ONLY; then
  SKIP_BUILD=true
  SKIP_D1=false
fi

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }
sep() { log "================================================================"; }

# ---------------------------------------------------------------------------
# Dry-run: print plan and exit (no env/tool checks needed)
# ---------------------------------------------------------------------------
if $DRY_RUN; then
  sep
  log "DRY RUN — pipeline plan:"
  log ""
  _SINGLE_REGION_BUILD=$([[ -n "$REGION" ]] && ! $SKIP_BUILD && echo true || echo false)
  if ! $SKIP_BUILD; then
    if [[ -n "$REGION" ]]; then
      log "  STAGE 1 (BUILD):  build-region.sh $REGION"
    else
      log "  STAGE 1 (BUILD):  build-all-regions.sh (download ukraine-latest.osm.pbf once, extract + build 26 oblasts)"
    fi
  else
    log "  STAGE 1 (BUILD):  SKIPPED"
  fi
  if [[ "$_SINGLE_REGION_BUILD" == "true" ]]; then
    log "  STAGE 2 (INDEX):  SKIPPED (single-region build — run --skip-build after all regions are built)"
    log "  STAGE 3 (D1):     SKIPPED (single-region build)"
  elif ! $D1_ONLY; then
    log "  STAGE 2 (INDEX):  generate-index.sh → index.json + checksums.json → R2"
    if ! $SKIP_D1; then
      log "  STAGE 3 (D1):     seed-d1.ts → SQL → wrangler d1 execute $D1_DATABASE_NAME --remote"
    else
      log "  STAGE 3 (D1):     SKIPPED"
    fi
  else
    log "  STAGE 2 (INDEX):  SKIPPED — downloading current index.json from R2"
    log "  STAGE 3 (D1):     seed-d1.ts → SQL → wrangler d1 execute $D1_DATABASE_NAME --remote"
  fi
  log ""
  log "Env:  R2_BUCKET_NAME=$R2_BUCKET_NAME  CDN_BASE_URL=$CDN_BASE_URL  D1_DATABASE_NAME=$D1_DATABASE_NAME"
  sep
  log "DRY RUN complete — no changes made"
  exit 0
fi

# ---------------------------------------------------------------------------
# Validate required env vars (not needed for D1-only)
# ---------------------------------------------------------------------------
: "${R2_ENDPOINT_URL:?R2_ENDPOINT_URL is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

# ---------------------------------------------------------------------------
# Check required tools
# ---------------------------------------------------------------------------
REQUIRED_TOOLS=("aws" "wrangler" "node" "npx")
if ! $SKIP_BUILD; then
  REQUIRED_TOOLS+=("tilemaker" "pmtiles" "osmium" "python3" "curl")
fi

for cmd in "${REQUIRED_TOOLS[@]}"; do
  command -v "$cmd" >/dev/null 2>&1 || die "Required tool not found: $cmd"
done

# ---------------------------------------------------------------------------
# Temp dir (used for index.json download before D1 seeding)
# ---------------------------------------------------------------------------
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

INDEX_JSON="$WORK_DIR/index.json"
SEED_SQL="$WORK_DIR/seed.sql"

START_TIME=$(date +%s)
# Single-region builds can't produce a valid full index — skip stages 2+3
# unless the caller explicitly passes --skip-build (reindex-only) or --d1-only
if [[ -n "$REGION" ]] && ! $SKIP_BUILD; then
  log "Note: single-region build — skipping Stage 2 (INDEX) and Stage 3 (D1)."
  log "      Run './scripts/pipeline.sh --skip-build' once all regions are built."
  SKIP_D1=true
  # Mark that we should skip index too (reuse D1_ONLY flag logic for stage 2)
  _SKIP_INDEX=true
else
  _SKIP_INDEX=false
fi

sep
log "TrueRoute data pipeline starting"
log "  Region:      ${REGION:-all}"
log "  Bucket:      $R2_BUCKET_NAME"
log "  CDN:         $CDN_BASE_URL"
log "  D1 database: $D1_DATABASE_NAME"
sep

# ===========================================================================
# STAGE 1 — Build regions and upload to R2
# ===========================================================================
if ! $SKIP_BUILD; then
  sep
  if [[ -n "$REGION" ]]; then
    log "STAGE 1: Building single region: $REGION"
    "$SCRIPT_DIR/build-region.sh" "$REGION"
  else
    log "STAGE 1: Building all regions"
    "$SCRIPT_DIR/build-all-regions.sh"
  fi
  log "STAGE 1: Complete"
else
  log "STAGE 1 (BUILD): Skipped"
fi

# ===========================================================================
# STAGE 2 — Generate index.json + checksums.json and upload to R2
# ===========================================================================
if $_SKIP_INDEX; then
  sep
  log "STAGE 2 (INDEX): Skipped — single-region build"
  log "                 Run './scripts/pipeline.sh --skip-build' once all regions are built."
elif ! $D1_ONLY; then
  sep
  log "STAGE 2: Generating index.json and checksums.json"
  "$SCRIPT_DIR/generate-index.sh"
  log "STAGE 2: index.json and checksums.json uploaded to R2"

  # Download the freshly uploaded index.json for D1 seeding
  if ! $SKIP_D1; then
    log "STAGE 2: Downloading index.json from R2 for D1 seed..."
    aws s3 cp \
      "s3://${R2_BUCKET_NAME}/index.json" \
      "$INDEX_JSON" \
      --endpoint-url "$R2_ENDPOINT_URL"
    log "STAGE 2: index.json downloaded ($(wc -c < "$INDEX_JSON") bytes)"
  fi

  log "STAGE 2: Complete"
else
  # D1-only: download the current index.json from R2 (use wrangler — no R2 credentials needed)
  sep
  log "STAGE 2 (INDEX): Skipped — downloading current index.json from R2 via wrangler"
  wrangler r2 object get "${R2_BUCKET_NAME}/index.json" --file "$INDEX_JSON" 2>&1 \
    | grep -v "^🪵\|Logs were written" || true
  if [[ ! -s "$INDEX_JSON" ]]; then
    die "Failed to download index.json from R2 bucket '${R2_BUCKET_NAME}'"
  fi
  log "Downloaded index.json ($(wc -c < "$INDEX_JSON") bytes)"
fi

# ===========================================================================
# STAGE 3 — Seed D1 from index.json
# ===========================================================================
if ! $SKIP_D1; then
  sep
  log "STAGE 3: Generating D1 seed SQL from index.json"
  npx tsx "$SCRIPT_DIR/seed-d1.ts" "$INDEX_JSON" > "$SEED_SQL"

  STATEMENT_COUNT=$(grep -c '^INSERT\|^DELETE\|^BEGIN\|^COMMIT' "$SEED_SQL" || true)
  log "STAGE 3: Seed SQL generated — $STATEMENT_COUNT statements ($(wc -c < "$SEED_SQL") bytes)"

  log "STAGE 3: Applying seed SQL to D1 database: $D1_DATABASE_NAME"
  wrangler d1 execute "$D1_DATABASE_NAME" \
    --remote \
    --file="$SEED_SQL"

  log "STAGE 3: D1 seed complete"
else
  log "STAGE 3 (D1): Skipped"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
sep
log "Pipeline complete in ${ELAPSED}s"
if ! $SKIP_BUILD; then
  log "  ✓ Region files built and uploaded to R2 (${REGION:-all regions})"
fi
if ! $D1_ONLY && ! $_SKIP_INDEX; then
  log "  ✓ index.json + checksums.json uploaded to R2"
fi
if ! $SKIP_D1; then
  log "  ✓ D1 database seeded: $D1_DATABASE_NAME"
fi
if $_SKIP_INDEX; then
  log "  → Next: run './scripts/pipeline.sh --skip-build' to regenerate index + seed D1"
fi
sep
