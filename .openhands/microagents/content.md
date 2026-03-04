---
triggers:
  - type: content
  - mdx
  - how-to
  - troubleshooting
  - connect-obd2
  - download-maps
  - import-gpx
  - positioning-modes
  - diagnostics
---

# MDX Content Writing — TrueRoute

Read the full skill file before writing any content: `docs/skills/content-skill/SKILL.md`

## The One Rule That Matters Most

**Only describe v1 features. Never describe v2 features as if they exist.**

| ✅ v1 — document freely | ❌ v2/future — never mention as current |
|------------------------|----------------------------------------|
| OBD2 connection (ELM327 Bluetooth Classic) | Turn-by-turn routing / Valhalla |
| GPS disruption detection | Auto-rerouting |
| Dead reckoning mode | In-app address/street search |
| Offline maps by oblast | In-app speed camera display |
| GPX route import (no auto-reroute) | iOS app |
| Diagnostics screen | |

## Approved Vocabulary

- GPS disruption (not "spoofing") in user-facing text
- **GPS mode** / **Enhanced mode** / **Dead Reckoning mode** — always capitalised, exactly these names
- ELM327 Bluetooth OBD2 adapter (full name on first mention)
- OBD2 port (not "diagnostic port")
- Dead Reckoning = "navigation using your car's speed sensor and phone's gyroscope"

## Page Template

```mdx
---
title: "..."
description: "One sentence."
---

# {title}

{description}

## What you need
- [Prerequisite as bullet]

## Steps

1. **Tap the action** — One or two sentences max.
   [screenshot: what is visible on screen]

## What success looks like
One sentence describing the correct outcome.

## Something went wrong?
**Most common problem:** One-sentence fix.
→ See full guide: [link to troubleshooting page]

## Related
- [link]
```

## Screenshot Placeholders

Every step with a visible screen state change needs: `[screenshot: specific description]`
Never skip, never invent — placeholders are filled in with real screenshots later.