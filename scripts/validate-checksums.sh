#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# validate-checksums.sh — Spot-check SHA256 values in checksums.json against
#                         actual files stored in the R2 bucket.
#
# Usage: ./scripts/validate-checksums.sh
#
# Downloads metadata/checksums.json from R2, then randomly samples at least 3
# files per asset type (maps, geocode, poi) and verifies each file's SHA256
# matches the recorded value. Exits non-zero if any mismatch is found.
#
# Required env vars:
#   R2_ENDPOINT_URL        — Cloudflare R2 S3-compatible endpoint
#   R2_ACCESS_KEY_ID       — R2 API token access key ID
#   R2_SECRET_ACCESS_KEY   — R2 API token secret access key
#
# Optional env vars:
#   R2_BUCKET_NAME         — R2 bucket name (default: trueroute-data)
#   SAMPLE_PER_TYPE        — Files to check per asset type (default: 3)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
# Validate required env vars — skip gracefully when not configured
# This allows CI to succeed on branches/forks that don't have R2 secrets.
# The step will still fail on any actual checksum mismatch.
# ---------------------------------------------------------------------------
if [[ -z "${R2_ENDPOINT_URL:-}" || -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  log "WARNING: R2 credentials not configured — skipping checksum validation"
  log "  Set R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to enable."
  exit 0
fi

: "${R2_BUCKET_NAME:=trueroute-data}"
: "${SAMPLE_PER_TYPE:=3}"

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

# ---------------------------------------------------------------------------
# Create temp directory with cleanup trap
# ---------------------------------------------------------------------------
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

CHECKSUMS_LOCAL="$WORK_DIR/checksums.json"

log "Bucket: $R2_BUCKET_NAME"
log "Sample per asset type: $SAMPLE_PER_TYPE"

# ---------------------------------------------------------------------------
# Step 1: Download checksums.json from R2
# ---------------------------------------------------------------------------
log "Downloading metadata/checksums.json from R2..."

aws s3 cp \
  "s3://${R2_BUCKET_NAME}/metadata/checksums.json" \
  "$CHECKSUMS_LOCAL" \
  --endpoint-url "$R2_ENDPOINT_URL" \
  || die "Could not download metadata/checksums.json — has generate-index.sh been run?"

log "checksums.json downloaded ($(wc -c < "$CHECKSUMS_LOCAL") bytes)"

# ---------------------------------------------------------------------------
# Step 2: Parse checksums.json and build per-type file lists
# ---------------------------------------------------------------------------
# Use Python to extract keys grouped by asset type (maps, geocode, poi)
python3 - "$CHECKSUMS_LOCAL" "$SAMPLE_PER_TYPE" "$WORK_DIR" << 'PYEOF'
import json
import random
import sys
import os

checksums_path = sys.argv[1]
sample_n = int(sys.argv[2])
work_dir = sys.argv[3]

with open(checksums_path) as f:
    data = json.load(f)

files = data.get("files", {})
if not files:
    print("ERROR: checksums.json has no 'files' entries", file=sys.stderr)
    sys.exit(1)

# Group keys by asset type (maps, geocode, poi)
by_type = {"maps": [], "geocode": [], "poi": []}
for key, sha256 in files.items():
    parts = key.split("/")
    if len(parts) >= 3:
        asset_type = parts[2]
        if asset_type in by_type:
            by_type[asset_type].append((key, sha256))

# Sample and write to per-type files for bash to consume
total_sampled = 0
for asset_type, entries in by_type.items():
    if not entries:
        print(f"WARNING: no {asset_type} entries in checksums.json", file=sys.stderr)
        continue
    sample = random.sample(entries, min(sample_n, len(entries)))
    out_path = os.path.join(work_dir, f"sample_{asset_type}.txt")
    with open(out_path, "w") as f:
        for key, sha256 in sample:
            f.write(f"{key}\t{sha256}\n")
    total_sampled += len(sample)
    print(f"Sampled {len(sample)} {asset_type} file(s) for verification")

print(f"Total files to verify: {total_sampled}")
PYEOF

# ---------------------------------------------------------------------------
# Step 3: Download each sampled file and verify SHA256
# ---------------------------------------------------------------------------
TOTAL=0
MISMATCHES=0
MISMATCH_LIST=()

for asset_type in maps geocode poi; do
  sample_file="$WORK_DIR/sample_${asset_type}.txt"
  [[ -f "$sample_file" ]] || continue

  while IFS=$'\t' read -r key expected_sha256; do
    [[ -z "$key" ]] && continue
    TOTAL=$((TOTAL + 1))
    log "Checking [$asset_type]: $key"

    local_file="$WORK_DIR/verify_asset"

    if ! aws s3 cp "s3://${R2_BUCKET_NAME}/${key}" "$local_file" \
        --endpoint-url "$R2_ENDPOINT_URL" 2>/dev/null; then
      log "  FAIL: Could not download $key"
      MISMATCHES=$((MISMATCHES + 1))
      MISMATCH_LIST+=("$key (download failed)")
      continue
    fi

    actual_sha256=$(sha256sum "$local_file" | cut -d' ' -f1)
    rm -f "$local_file"

    if [[ "$actual_sha256" == "$expected_sha256" ]]; then
      log "  OK: sha256=${actual_sha256:0:16}..."
    else
      log "  FAIL: sha256 mismatch"
      log "    expected: $expected_sha256"
      log "    actual:   $actual_sha256"
      MISMATCHES=$((MISMATCHES + 1))
      MISMATCH_LIST+=("$key (expected=${expected_sha256:0:16}..., actual=${actual_sha256:0:16}...)")
    fi
  done < "$sample_file"
done

# ---------------------------------------------------------------------------
# Step 4: Print summary and exit
# ---------------------------------------------------------------------------
log "========================================="
log "Validated $TOTAL files, $MISMATCHES mismatch(es)"

if [[ ${#MISMATCH_LIST[@]} -gt 0 ]]; then
  log "Mismatched files:"
  for entry in "${MISMATCH_LIST[@]}"; do
    log "  - $entry"
  done
  die "Checksum validation FAILED — R2 files may be corrupt or out of sync"
fi

log "All sampled checksums match — R2 integrity confirmed"
