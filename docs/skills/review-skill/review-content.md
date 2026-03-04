---
name: trueroute-review-content
description: Code review skill for TrueRoute MDX content pull requests. Triggered automatically when a PR with label `type: content` is opened or updated. Reviews how-to and troubleshooting pages for factual accuracy against the v1 SRS, correct page template structure, writing quality, and absence of v2/future features. Posts structured review as a PR comment and either approves or requests changes. This is the most important review skill — hallucinated app features in docs erode user trust.
---

# TrueRoute Content Code Review

You are reviewing an MDX documentation page for the TrueRoute app website.
The most important thing you do is verify factual accuracy against v1 of the app.

Read the PR diff, the linked issue, and `docs/skills/content-skill/SKILL.md` (for the approved feature and vocabulary list). Then post a structured review.

## V1 Feature Ground Truth

Cross-check every factual claim in the MDX against this list.
If a claim is not in this list, flag it as **unverified — must confirm against SRS**.

| Feature | Key verifiable facts |
|---------|---------------------|
| OBD2 | ELM327, Bluetooth Classic / SPP, J1962 port, scans for nearby adapters, auto-reconnects to last known adapter |
| GPS disruption detection | 4 detectors. Warning at score 0.6. Switches to DR at score 0.8. Returns to GPS when score < 0.3 for 30 continuous seconds |
| Dead reckoning | OBD2 + gyroscope. <5% drift per 10km with OBD2. <20% without OBD2. Orange position marker. Accuracy radius circle appears after 5min DR |
| Sensor fusion | Extended Kalman Filter. Three modes: GPS, Enhanced, Dead Reckoning |
| Offline maps | Download by oblast. No internet needed during navigation. OSM data via MapLibre |
| GPX import | Android share intent or file picker. Polyline shown on map. Audio cues at turns. Off-route warning at 200m deviation. No auto-reroute |
| Diagnostics | Shows: GPS position + accuracy, OBD2 speed + RPM, gyroscope yaw rate, compass heading, EKF fused position, spoof confidence score, per-detector sub-scores |
| Manual override | User can force GPS mode or DR mode via tap on mode indicator |

## Review Checklist — Check Every Item

### 1. Factual Accuracy (most critical)
- [ ] Every numerical value (0.6, 0.8, 0.3, 200m, 5km, 30s, etc.) matches the table above
- [ ] No v2/future features described as if they exist:
    - [ ] No turn-by-turn routing / offline routing engine
    - [ ] No Valhalla, Ferrostar, GraphHopper mentioned as current
    - [ ] No in-app speed camera display (data exists in packages, app UI does not)
    - [ ] No in-app address/street search
    - [ ] No iOS app
    - [ ] No auto-rerouting (v1 shows warning only)
- [ ] No claims about features the reviewer cannot verify in the SRS feature table above — flag these explicitly

### 2. Page Template Compliance
- [ ] Frontmatter has both `title` and `description` fields
- [ ] Page follows the exact template from `content-skill`: What you need → Steps → What success looks like → Something went wrong? → Related
- [ ] "What you need" section lists prerequisites as a bullet list
- [ ] Steps are numbered, not bullet points
- [ ] "Something went wrong?" links to the correct troubleshooting page (for how-to pages)
- [ ] "Related" section has at least one link

### 3. Writing Quality
- [ ] Steps use imperative voice: "Tap **X**" not "You should tap X"
- [ ] Maximum 2 sentences per step — no compound steps
- [ ] No "simply", "just", "easy", "obvious"
- [ ] No passive voice in steps
- [ ] UI elements bolded on first tap instruction: `Tap **Scan**`

### 4. Approved Vocabulary
- [ ] GPS disruption (not "spoofing") in user-facing descriptions
- [ ] OBD2 port (not "diagnostic port" or "OBDII port")
- [ ] ELM327 Bluetooth OBD2 adapter (full name on first mention)
- [ ] GPS mode / Enhanced mode / Dead Reckoning mode (capitalised, exact names)
- [ ] Dead Reckoning explained as: navigation using car's speed sensor and phone's gyroscope

### 5. Screenshots
- [ ] Every step that involves a visible screen state change has `[screenshot: ...]` placeholder
- [ ] Screenshot descriptions are specific enough to brief a designer/photographer
- [ ] No screenshots described that contradict the actual UI (based on SRS descriptions)

### 6. Links
- [ ] All internal links use correct slug paths (e.g. `/how-to/connect-obd2`, not `/connect-obd2`)
- [ ] No broken links to pages that don't exist yet (only link to pages that are in the merged codebase or the same PR)
- [ ] How-to pages link to their troubleshooting counterpart
- [ ] Troubleshooting pages link back to the how-to page

### 7. i18n
- [ ] No new translation keys added to `messages/en.json` for MDX body content (MDX is translated separately in v2)
- [ ] Only frontmatter values or nav labels go through `next-intl`

### 8. Acceptance Criteria
- [ ] Every criterion from the linked issue is met

## Review Output Format

```markdown
## AI Code Review — Content

**Issue:** #N — [issue title]
**Page:** `/how-to/{slug}` or `/troubleshooting/{slug}`
**Verdict:** ✅ Approved | ⚠️ Approved with notes | ❌ Changes requested

### Factual Issues (if any)
[Each issue: quote the claim → state what's wrong → provide the correct fact with source]

### Template/Structure Issues (if any)
[Specific structural problems]

### Writing Issues (if any)
[Voice, vocabulary, sentence length violations]

### Required Changes (if any)
[Numbered, specific, quote the exact text that needs changing and what it should say]

### Suggestions (optional)
[Non-blocking improvements]

### Acceptance Criteria
- [x] Criterion 1 — met
- [ ] Criterion 2 — NOT met: [reason]
```

**Verdict rules:**
- `✅ Approved` — factually accurate, template correct, all criteria met
- `⚠️ Approved with notes` — minor writing issues only, no factual problems
- `❌ Changes requested` — any factual error, any v2 feature described as current, any missing section

Any factual inaccuracy is an automatic `❌`. No exceptions — wrong information in docs is worse than no docs.