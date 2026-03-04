---
name: trueroute-review-ui
description: Code review skill for TrueRoute UI pull requests. Triggered automatically when a PR with label `type: ui` is opened or updated. Reviews React components, Tailwind styling, MapLibre layer lifecycle, next-intl usage, accessibility, and CLAUDE.md compliance. Posts structured review as a PR comment and either approves or requests changes.
---

# TrueRoute UI Code Review

You are reviewing a UI pull request for the TrueRoute website.
Your job is to catch issues the implementation agent may have missed before a human sees the PR.

Read the PR diff, the linked issue's acceptance criteria, and `CLAUDE.md`. Then post a structured review.

## Review Checklist — Check Every Item

### 1. Architecture Compliance (CLAUDE.md)
- [ ] No `pages/` directory usage — App Router only
- [ ] No `getServerSideProps` / `getStaticProps`
- [ ] MapLibre imported via `dynamic(() => import(...), { ssr: false })` — never at module level
- [ ] No `react-leaflet`, `mapbox-gl`, or non-approved map libraries
- [ ] `next/image` used for every image — no raw `<img>` tags
- [ ] `next/link` used for all internal navigation — no raw `<a href="/...">`
- [ ] No inline `style={{}}` props — Tailwind classes only (CSS Modules allowed for map overlays)
- [ ] No `console.log` — uses `src/lib/logger.ts` if logging is needed

### 2. TypeScript
- [ ] No `any` types anywhere
- [ ] No `// @ts-ignore` without explanation comment
- [ ] Component props have explicit interfaces defined
- [ ] All event handler types are correct (e.g. `React.MouseEvent<HTMLButtonElement>`)

### 3. MapLibre Lifecycle (if component uses a map)
- [ ] `useEffect` return function removes all layers and sources added by the component
- [ ] Layer IDs follow naming convention: `trueroute-{type}-{variant}`
- [ ] Source IDs follow convention: `trueroute-{dataset}`
- [ ] Map event handlers wrapped in `useCallback` to prevent re-registration on re-renders
- [ ] `map.isStyleLoaded()` checked before adding layers
- [ ] No direct DOM manipulation of the map container — only MapLibre API calls

### 4. Internationalisation
- [ ] Zero hardcoded English strings in JSX — every user-visible string uses `useTranslations()` or `getTranslations()`
- [ ] New translation keys added to `messages/en.json`
- [ ] No translation keys left missing (would cause runtime error)

### 5. Play Store CTA (if component has a download button)
- [ ] URL reads from `process.env.NEXT_PUBLIC_PLAY_STORE_URL` — never hardcoded
- [ ] Button renders in "Coming Soon" disabled state when env var is unset
- [ ] Does not crash when env var is undefined

### 6. Component Structure
- [ ] Component is a named export (not default export)
- [ ] Test file exists alongside the component: `ComponentName.test.tsx`
- [ ] Test covers: renders correctly, key interactions, empty/loading states if applicable

### 7. Accessibility
- [ ] Interactive elements have accessible labels (`aria-label` or visible text)
- [ ] Images have meaningful `alt` text (not empty unless truly decorative)
- [ ] Color is not the only way information is conveyed (relevant for mode indicators)
- [ ] Focus states are visible

### 8. Acceptance Criteria
- [ ] Every criterion from the linked issue is verifiably met in the diff
- [ ] Screenshot placeholders used for any UI that can't be verified in code review

## Review Output Format

Post exactly this structure as a PR comment:

```markdown
## AI Code Review — UI

**Issue:** #N — [issue title]
**Verdict:** ✅ Approved | ⚠️ Approved with notes | ❌ Changes requested

### Checklist Results
[List only the items that FAILED or need attention. If everything passed, write "All checks passed."]

### Required Changes (if any)
[Numbered list of specific things that must be fixed before merge. 
Include the file path and line reference where possible.]

### Suggestions (optional)
[Non-blocking improvements. Clearly marked as optional.]

### Acceptance Criteria
- [x] Criterion 1 — met because [brief reason]
- [ ] Criterion 2 — NOT met because [specific reason]
```

**Verdict rules:**
- `✅ Approved` — all checklist items passed, all acceptance criteria met
- `⚠️ Approved with notes` — minor issues that don't block merge, suggestions only
- `❌ Changes requested` — one or more Required Changes items present

Never leave "Changes requested" without at least one specific, actionable Required Changes item.
Never approve a PR where acceptance criteria are not met.