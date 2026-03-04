---
name: trueroute-content
description: MDX content writing skill for TrueRoute documentation pages. Use for every issue labeled `type: content` — writing or editing how-to guides and troubleshooting pages. Always load this skill before writing any `.mdx` file in `content/how-to/` or `content/troubleshooting/`. This skill encodes the exact v1 app feature set from the SRS as ground truth — the most common failure mode for AI-written app documentation is describing features that don't exist yet.
---

# TrueRoute Content Skill

You are writing user-facing documentation for the TrueRoute Android navigation app.

Before writing anything, understand the single most important rule:
**Only describe features that exist in v1 of the app.** The SRS is the source of truth.

## V1 Features — What You Can Write About

These features exist in v1. You may document them fully:

| Feature | Key facts for documentation |
|---------|----------------------------|
| OBD2 connection | ELM327 Bluetooth Classic adapter, SPP profile, plug into J1962 port, app scans for nearby adapters, auto-reconnects |
| GPS spoofing detection | 4 detectors: speed consistency, position jump, heading consistency, GNSS raw measurements. Confidence score 0–1. Warning at 0.6, DR mode at 0.8 |
| Dead reckoning mode | OBD2 speed + gyroscope heading. <5% drift per 10km with OBD2. Orange position marker. Accuracy radius grows over time |
| Sensor fusion (EKF) | GPS + OBD2 + IMU fused continuously. Three modes: GPS, Enhanced, Dead Reckoning |
| Offline maps | MapLibre. Download by oblast (region). Works with no internet. OSM data |
| GPX route import | Import via Android share intent from Organic Maps. Displays as polyline. Turn audio cues. Off-route warning at 200m. No auto-reroute |
| Diagnostics screen | GPS position + accuracy, OBD2 speed + RPM, gyroscope yaw rate, compass heading, EKF fused position, spoof confidence, per-detector sub-scores |
| Language support | English and Ukrainian |

## V2 / Future — Never Document as Existing

Never mention these as current features, even briefly:

- Turn-by-turn routing / Valhalla / Ferrostar (v2)
- Embedded offline routing engine (v2)
- iOS app (v2)
- Speed cameras in-app display (future — data exists in packages but app UI not built)
- Street/address search in-app (future)
- Multi-language voice guidance beyond alerts (v2)
- CarPlay / Android Auto (v3)
- Cloud sync or crowdsourced reporting (v3)

If a user will ask "can I search for an address in the app?" — the honest answer is no, not in v1.

## Page Template — Use This Exactly

Every how-to and troubleshooting page follows this structure:

```mdx
---
title: "[Page title]"
description: "[One sentence — used in <meta description> and page intro]"
---

# {title}

{description}

## What you need
- [Prerequisite — be specific: "ELM327 Bluetooth OBD2 adapter (Bluetooth Classic, not WiFi)"]
- [Another prerequisite]

## Steps

1. **[Action verb + object]** — [One or two sentences. Screenshot placeholder below if needed.]
   [screenshot: description of what the screenshot shows]

2. **[Next action]** — [One or two sentences.]

## What success looks like

[One sentence describing the correct outcome. What the user sees on screen.]

## Something went wrong?

**[Most common problem]:** [One-sentence fix]
**[Second common problem]:** [One-sentence fix]

→ See full guide: [Link to troubleshooting page]

## Related
- [Link to related page]
```

## Writing Rules

**Voice and tone**
- Steps use imperative: "Tap **Scan**" not "You should tap Scan"
- Direct and brief — drivers read this while parked, not at a desk
- Never use "simply" or "just" — if it were simple they wouldn't need a guide
- No passive voice in steps

**Steps**
- Maximum 2 sentences per step
- One action per step — never "Tap X, then tap Y, then wait for Z" (split into 3 steps)
- Bold the UI element being tapped: `Tap **Scan for adapters**`
- Screenshot placeholder on every step that involves a screen state change: `[screenshot: OBD2 scan list showing adapter named "OBDII"]`

**Technical accuracy**
- OBD2 port is always called "OBD2 port" (not "diagnostic port", not "OBDII")
- The adapter is always "ELM327 Bluetooth OBD2 adapter" on first mention, "adapter" thereafter
- The three modes: **GPS mode**, **Enhanced mode**, **Dead Reckoning mode** — capitalised, exact names
- Spoofing is called "GPS disruption" or "GPS signal disruption" in user-facing text — not "spoofing" (too technical for primary audience)
- Dead Reckoning is explained as: "navigation continues using your car's speed sensor and phone's gyroscope"

**Screenshots**
- Use `[screenshot: {description}]` as a placeholder — never omit, never describe a screenshot you can't verify
- Description format: what is visible on screen, e.g. `[screenshot: map screen showing orange position marker with accuracy radius circle]`

## File Location and Naming

```
content/
├── how-to/
│   ├── connect-obd2.mdx
│   ├── download-maps.mdx
│   ├── import-gpx-route.mdx
│   ├── positioning-modes.mdx
│   └── diagnostics.mdx
└── troubleshooting/
    ├── obd2-not-connecting.mdx
    ├── gps-alert-appeared.mdx
    ├── position-is-wrong.mdx
    └── map-not-loading.mdx
```

Filename = URL slug. Do not change filenames — it breaks inbound links.

## i18n Keys

All UI strings (navigation labels, page titles used outside MDX) go through `messages/en.json`.
MDX body content is written directly in English — it is translated separately in v2.
Do not add translation keys for MDX body text.

## Done When

- [ ] Frontmatter `title` and `description` are present and accurate
- [ ] Page follows the exact template structure above
- [ ] Every step has at most 2 sentences
- [ ] Every screen state change has a `[screenshot: ...]` placeholder
- [ ] No v2 or future features described as existing
- [ ] No passive voice in steps
- [ ] Links to the correct troubleshooting page (how-to pages) or how-to page (troubleshooting pages)
- [ ] Technical terms match the approved vocabulary table above
- [ ] `pnpm lint` passes (MDX lint via remark)