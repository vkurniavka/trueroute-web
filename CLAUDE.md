# CLAUDE.md — TrueRoute Website

> This file is read automatically by Claude Code on every task.
> It is the single source of truth for agent behavior in this repo.
> Do not modify without updating the PM skill and notifying the team.

---

## Project Identity

Next.js 15 website for the TrueRoute navigation app.
Two purposes: (1) marketing + docs site, (2) regional data package hosting via Cloudflare R2.
Stack: Next.js 15 · TypeScript strict · Tailwind CSS 4 · MDX · next-intl · Cloudflare Pages · R2.

---

## Workflow — What Happens Before You Write Code

Before touching any file, always:

1. Read the linked GitHub issue completely
2. Identify the issue type from its labels: `type: ui` / `type: api` / `type: content` / `type: data` / `type: infra`
3. Read the matching skill file listed in the table below
4. Read `docs/PRD.md` section referenced in the issue's Context block
5. Check the issue's "Depends on" list — confirm those issues are merged before starting

| Issue label | Skill to load before starting |
|-------------|-------------------------------|
| `type: ui` | `docs/skills/ui-skill/SKILL.md` — also loaded automatically via `ui-ux-pro-max` |
| `type: api` | `docs/skills/api-skill/SKILL.md` |
| `type: content` | `docs/skills/content-skill/SKILL.md` |
| `type: data` | `docs/skills/data-skill/SKILL.md` |
| `type: infra` | No skill file — follow CLAUDE.md rules only |

---

## Hard Rules — Never Do These

Violations of these rules will cause the PR to be rejected automatically.

**Architecture**
- Never use the `pages/` directory — App Router only, always
- Never use `getServerSideProps` or `getStaticProps` — use Server Components or Route Handlers
- Never import MapLibre at module level — always `dynamic(() => import(...), { ssr: false })`
- Never install `react-leaflet`, `mapbox-gl`, or any map library other than `maplibre-gl`
- Never add a new npm dependency without noting it in the PR description with justification
- Never create a database — all data comes from R2 or static MDX files

**TypeScript**
- Never use `any` — define proper types for everything
- Never use `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why it is unavoidable
- Never export `default` from Route Handlers — only named exports (`GET`, `POST`, etc.)

**Security**
- Never hardcode R2 credentials, API keys, or secrets anywhere in the codebase
- Never commit `.env.local` — add it to `.gitignore` and document variables in `.env.example`
- Never reference `process.env.CLOUDFLARE_*` directly — use the typed env helper at `src/lib/env.ts`
- Never make R2 bucket root publicly listable

**Content**
- Never describe a feature that is not in v1 of the TrueRoute app
- Never mention routing/turn-by-turn navigation as a current feature (it's v2)
- Never hardcode the Play Store URL — always read from `NEXT_PUBLIC_PLAY_STORE_URL` env var

**Quality**
- Never leave `console.log` in committed code — use `src/lib/logger.ts`
- Never push directly to `main` — all changes via PR
- Never merge a PR with failing CI

---

## Always Do These

**Code style**
- TypeScript strict mode — `"strict": true` is set in `tsconfig.json`, keep it
- Use `next/image` for every `<img>` — no raw image tags
- Use `next/font` for all fonts — no Google Fonts CDN links
- Use `next/link` for all internal navigation — no raw `<a href>` to internal routes
- Tailwind utility classes for all styling — no inline `style={{}}` props
- CSS Modules only for map overlay positioning where Tailwind is insufficient

**Internationalisation**
- All user-visible strings go through `next-intl` — `useTranslations()` in client components, `getTranslations()` in server components
- Never hardcode English text directly in JSX — always use a translation key
- Add new keys to `messages/en.json` — never leave keys missing

**Components**
- Every component is a named export in its own file — no barrel default exports
- Co-locate test file with component: `ComponentName.test.tsx` beside `ComponentName.tsx`
- Map components must clean up in `useEffect` return: remove layers and sources on unmount
- Use `useCallback` for all map event handlers

**API routes**
- Validate all inputs with Zod before touching any data
- Always set explicit cache headers — static data `s-maxage=3600`, dynamic `no-store`
- Return errors as `{ error: string, code: string }` — never expose stack traces

**R2 access**
- Always use the shared client: `import { getR2Object } from '@/lib/r2'`
- Never instantiate `S3Client` directly in a Route Handler
- Never call R2 from a Client Component — only from Server Components or Route Handlers

---

## Key Files — Know These Before Touching Anything

| File | Purpose |
|------|---------|
| `src/lib/r2.ts` | R2 client — do not re-implement |
| `src/lib/env.ts` | Typed env variable access — do not bypass |
| `src/lib/logger.ts` | Structured logger — use instead of console.log |
| `src/types/regions.ts` | `RegionIndex`, `Region`, `Asset` types — single source of truth |
| `src/schemas/regions.schema.ts` | Zod schemas matching the types above |
| `messages/en.json` | All English UI strings |
| `wrangler.toml` | Cloudflare config — never modify the `[vars]` or `[[r2_buckets]]` sections |
| `docs/PRD.md` | Product requirements — check before implementing any feature |
| `docs/adr/` | Architecture decisions — check before changing any stack choice |

---

## PR Checklist

Every PR description must include this checklist, fully checked before requesting review:

```
## PR Checklist
- [ ] Issue number linked: closes #N
- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm lint` passes locally  
- [ ] `pnpm test` passes locally
- [ ] All acceptance criteria from the issue are met
- [ ] No hardcoded strings in JSX (all through next-intl)
- [ ] No new dependencies added without justification in this PR
- [ ] No console.log in production code
- [ ] No R2 credentials or secrets committed
- [ ] Tested at 375px mobile width
- [ ] For UI: map cleanup verified (useEffect returns clean up layers/sources)
- [ ] For API: Zod validation present, cache headers set, errors use standard shape
- [ ] For content: no v2 features described, screenshot placeholders used correctly
- [ ] For data: checksums.json regenerated after any R2 upload
```

---

## Definition of Done

A GitHub issue moves to Done only when:
1. PR is merged to `main`
2. All CI checks pass (typecheck + lint + test + CF preview deploy)
3. Every acceptance criterion in the issue is explicitly checked off in the PR
4. Code review approved by the `review` skill (automated) or human reviewer

---

## Out of Scope — Remind Yourself of These

If you find yourself about to implement any of the following, stop and re-read the issue:

- An interactive map on the website (the map is in the mobile app)
- Speed camera or speed limit visualisation on the website (app feature, not website)
- Street/address search on the website (app feature, not website)
- Valhalla routing data generation (v2 — script has a commented placeholder)
- User authentication or accounts
- A CMS or admin panel
- Server-side rendering for documentation pages (they must be statically generated)