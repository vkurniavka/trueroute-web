#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# build-all-regions.sh — Run build-region.sh for all regions in regions.txt
#
# Usage: ./scripts/build-all-regions.sh
#
# Reads region IDs from scripts/regions.txt and processes each sequentially.
# Prints a summary at the end with pass/fail counts.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGIONS_FILE="$SCRIPT_DIR/regions.txt"
BUILD_SCRIPT="$SCRIPT_DIR/build-region.sh"

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

if [[ ! -f "$REGIONS_FILE" ]]; then
  log "ERROR: regions.txt not found at $REGIONS_FILE" >&2
  exit 1
fi

if [[ ! -x "$BUILD_SCRIPT" ]]; then
  log "ERROR: build-region.sh not found or not executable at $BUILD_SCRIPT" >&2
  exit 1
fi

TOTAL=0
PASSED=0
FAILED=0
FAILED_REGIONS=()

while IFS= read -r region || [[ -n "$region" ]]; do
  # Skip empty lines and comments
  [[ -z "$region" || "$region" == \#* ]] && continue

  TOTAL=$((TOTAL + 1))
  log "=== Building region $TOTAL: $region ==="

  if "$BUILD_SCRIPT" "$region"; then
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
log "========================================="
log "Summary: $PASSED/$TOTAL regions succeeded"

if [[ $FAILED -gt 0 ]]; then
  log "Failed regions:"
  for r in "${FAILED_REGIONS[@]}"; do
    log "  - $r"
  done
  exit 1
fi

log "All regions completed successfully"
