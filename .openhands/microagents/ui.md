---
triggers:
  - type: ui
  - HeroSection
  - SiteHeader
  - SiteFooter
  - HowItWorks
  - FeaturesSection
  - DownloadCTA
  - tailwind
  - component
---

# UI Development — TrueRoute

Read the full skill file before writing any code: `docs/skills/ui-skill/SKILL.md`

Quick reference for the most commonly violated rules:

## Hard Rules

- `dynamic(() => import('maplibre-gl'), { ssr: false })` — never import MapLibre at module level
- Every user-visible string through `useTranslations()` — zero hardcoded English in JSX
- Play Store URL always from `process.env.NEXT_PUBLIC_PLAY_STORE_URL` — render "Coming Soon" button when unset
- `next/image` for every image, `next/link` for every internal link
- Named exports only — no `export default` from components
- Tailwind classes only — no `style={{}}` props

## MapLibre Cleanup (if map is involved)

Every `useEffect` that adds layers/sources must clean them up on unmount:
```typescript
useEffect(() => {
  map.addSource('trueroute-data', { ... })
  map.addLayer({ id: 'trueroute-layer', ... })
  return () => {
    if (map.getLayer('trueroute-layer')) map.removeLayer('trueroute-layer')
    if (map.getSource('trueroute-data')) map.removeSource('trueroute-data')
  }
}, [map])
```

## Test File

Every component needs a co-located test file: `ComponentName.test.tsx`
Minimum: renders without crash + key interaction + "Coming Soon" state if CTA is involved.