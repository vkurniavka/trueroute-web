#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# build-all-regions.sh — Build all Ukrainian oblasts
#
# Downloads ukraine-latest.osm.pbf ONCE from Geofabrik, then runs
# build-region.sh for each region in regions.txt, passing the shared PBF
# to avoid downloading 1.6 GB × 26 times.
#
# Usage: ./scripts/build-all-regions.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGIONS_FILE="$SCRIPT_DIR/regions.txt"
BUILD_SCRIPT="$SCRIPT_DIR/build-region.sh"
GEOFABRIK_UKRAINE="https://download.geofabrik.de/europe/ukraine-latest.osm.pbf"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }
sep() { log "================================================="; }

[[ -f "$REGIONS_FILE" ]] || die "regions.txt not found at $REGIONS_FILE"
[[ -x "$BUILD_SCRIPT" ]] || die "build-region.sh not found or not executable"

# ---------------------------------------------------------------------------
# Shared temp dir — holds the Ukraine PBF for the duration of the full build
# ---------------------------------------------------------------------------
SHARED_TMP="$(mktemp -d)"
trap 'rm -rf "$SHARED_TMP"' EXIT
UKRAINE_PBF="$SHARED_TMP/ukraine-latest.osm.pbf"

sep
log "Downloading Ukraine OSM extract from Geofabrik (~1.6 GB)..."
curl -L --fail --progress-bar -o "$UKRAINE_PBF" "$GEOFABRIK_UKRAINE"
log "Download complete — $(du -h "$UKRAINE_PBF" | cut -f1)"
sep

# ---------------------------------------------------------------------------
# Build each region
# ---------------------------------------------------------------------------
TOTAL=0
PASSED=0
FAILED=0
FAILED_REGIONS=()

while IFS= read -r region || [[ -n "$region" ]]; do
  [[ -z "$region" || "$region" == \#* ]] && continue

  TOTAL=$((TOTAL + 1))
  log "=== Building region $TOTAL: $region ==="

  if "$BUILD_SCRIPT" "$region" --ukraine-pbf "$UKRAINE_PBF"; then
    PASSED=$((PASSED + 1))
    log "=== PASS: $region ==="
  else
    FAILED=$((FAILED + 1))
    FAILED_REGIONS+=("$region")
    log "=== FAIL: $region ==="
  fi
  echo ""
done < "$REGIONS_FILE"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
sep
log "Summary: $PASSED/$TOTAL regions succeeded"
if [[ $FAILED -gt 0 ]]; then
  log "Failed regions:"
  for r in "${FAILED_REGIONS[@]}"; do log "  - $r"; done
  exit 1
fi
log "All regions completed successfully"
