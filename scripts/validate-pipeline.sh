#!/usr/bin/env bash
set -euo pipefail

PASS=0; FAIL=0
check() { if eval "$2" 2>/dev/null; then echo "PASS: $1"; PASS=$((PASS+1)); else echo "FAIL: $1"; FAIL=$((FAIL+1)); fi }

check 'pmtiles installed'              'command -v pmtiles'
check 'aws CLI installed'              'command -v aws'
check 'osmium installed'               'command -v osmium'
check 'python3 installed'              'command -v python3'
check 'regions.txt exists'             'test -f scripts/regions.txt'
check 'regions.txt has 26 IDs'         'test $(grep -c . scripts/regions.txt) -eq 26'
check 'build-region.sh executable'     'test -x scripts/build-region.sh'
check 'build-all-regions.sh executable' 'test -x scripts/build-all-regions.sh'
check 'R2_ENDPOINT_URL set'            'test -n "${R2_ENDPOINT_URL:-}"'
check 'R2_ACCESS_KEY_ID set'           'test -n "${R2_ACCESS_KEY_ID:-}"'
check 'R2_SECRET_ACCESS_KEY set'       'test -n "${R2_SECRET_ACCESS_KEY:-}"'

echo
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then exit 1; fi
