---
name: trueroute-review-data
description: Code review skill for TrueRoute data pipeline pull requests. Triggered automatically when a PR with label `type: data` is opened or updated. Reviews build scripts, R2 upload logic, index.json generation, checksum correctness, idempotency, and the regional package structure. Posts structured review as a PR comment and either approves or requests changes.
---

# TrueRoute Data Pipeline Code Review

You are reviewing a data pipeline pull request for the TrueRoute website.
Read the PR diff, the linked issue, and `docs/skills/data-skill/SKILL.md`. Then post a structured review.

## Review Checklist — Check Every Item

### 1. R2 Bucket Structure
- [ ] All uploads target `trueroute-data` bucket — not `trueroute-maps` or any other name
- [ ] File paths follow the exact convention:
    - `regions/{id}/maps/{id}.pmtiles`
    - `regions/{id}/geocode/{id}.db`
    - `regions/{id}/poi/{id}-cameras.json`
    - `metadata/checksums.json`
    - `index.json` (bucket root)
- [ ] No files uploaded outside `regions/` or `metadata/` prefixes (except `index.json`)
- [ ] No Valhalla files being generated or uploaded (v2 only — `routing/` must stay empty)

### 2. Oblast Coverage
- [ ] All 25 oblast IDs used — check against the canonical list in `data-skill/SKILL.md`
- [ ] No typos in oblast IDs — IDs are kebab-case, all lowercase
- [ ] `kyiv-oblast` and `kyiv-city` are separate entries (easy to miss)
- [ ] `index.json` `regions` array has exactly 25 entries

### 3. index.json Schema Compliance
- [ ] `version` field is an integer ≥ 1
- [ ] `generatedAt` is a valid ISO 8601 datetime string
- [ ] Each region has `id`, `name`, `nameUk`, `assets`
- [ ] Each region's `assets` contains `maps`, `geocode`, `poi` — all three required
- [ ] `routing` field is **absent** (not `null`, not `{}`, not `undefined`) in every region
- [ ] Each asset has `url`, `sizeBytes`, `sha256` (64 hex chars), `generatedAt`
- [ ] `sha256` values match the actual files (verified by checksum script)
- [ ] `sizeBytes` values are non-zero and plausible (PMTiles for an oblast: typically 50MB–500MB)

### 4. POI JSON Schema
- [ ] Output is a valid GeoJSON `FeatureCollection`
- [ ] Every feature has `type: "Feature"`, `geometry.type: "Point"`, `geometry.coordinates: [lng, lat]`
- [ ] Every feature's `properties.type` is `"speed_camera"` or `"speed_limit"` — no other values
- [ ] Speed camera features have at least `maxspeed` or `camera_type` property
- [ ] Speed limit features have `maxspeed` as a number (km/h), not a string
- [ ] `features.length > 0` for every oblast (Ukraine has extensive camera coverage)

### 5. Idempotency
- [ ] Script checks if file already exists in R2 before uploading
- [ ] Re-running the script with same input produces byte-identical output
- [ ] Script does not delete existing files before confirming replacements are ready
- [ ] Failed uploads cause non-zero exit code — no silent failure/continue

### 6. Checksums
- [ ] SHA256 computed after upload confirmation, not before
- [ ] `checksums.json` regenerated every time any file is changed
- [ ] CI validation step will catch any drift between `checksums.json` and actual files

### 7. Security
- [ ] No credentials hardcoded in scripts — uses environment variables
- [ ] R2 endpoint URL comes from `$R2_ENDPOINT_URL` env var
- [ ] No `.env` files committed
- [ ] R2 bucket listing not enabled (public read for `regions/` prefix only)

### 8. V2 Valhalla Hook
- [ ] Valhalla Step 4 block is present as a comment — not deleted
- [ ] Comment block explains what to uncomment and when
- [ ] No Valhalla code is active/uncommented

### 9. Documentation
- [ ] `scripts/README.md` updated with prerequisites and usage for any new script
- [ ] New environment variables documented in `.env.example`

### 10. Acceptance Criteria
- [ ] Every criterion from the linked issue is met

## Review Output Format

```markdown
## AI Code Review — Data Pipeline

**Issue:** #N — [issue title]
**Verdict:** ✅ Approved | ⚠️ Approved with notes | ❌ Changes requested

### Schema Issues (if any)
[Quote the problematic value and what it should be]

### Coverage Issues (if any)
[Missing oblasts, wrong IDs, count mismatches]

### Idempotency / Safety Issues (if any)
[Scripts that could overwrite or delete data unsafely]

### Required Changes (if any)
[Numbered, specific, include script name and line reference where possible]

### Suggestions (optional)
[Non-blocking]

### Acceptance Criteria
- [x] Criterion 1 — met
- [ ] Criterion 2 — NOT met: [reason]
```

**Verdict rules:**
- `✅ Approved` — all 25 oblasts covered, schema valid, idempotent, checksums correct
- `⚠️ Approved with notes` — minor doc or logging issues only
- `❌ Changes requested` — wrong oblast count, `routing` field present, non-idempotent script, schema mismatch, or Valhalla code uncommented

Missing oblasts or a `routing` field in `index.json` are automatic `❌` — the mobile app will break silently.