# TrueRoute Website — Repository Agent

Next.js 15 website for the TrueRoute navigation app.
Stack: Next.js 15 · TypeScript strict · Tailwind CSS 4 · MDX · next-intl · Cloudflare Pages · R2.
Package manager: `pnpm`. Always use `pnpm`, never `npm` or `yarn`.

**Always read `CLAUDE.md` in the repo root before writing any code.** It contains hard rules
that override everything else. Violations cause automatic PR rejection.

---

## Autonomous Development Loop

When asked to implement one or more issues, execute this loop completely without stopping
to ask for confirmation at each step unless you hit an explicit blocker.

```
FOR EACH issue selected:

  1. READ the issue fully — body, acceptance criteria, "Depends on" list
  2. VERIFY dependencies are merged — if not, skip this issue and say why
  3. APPLY label `status: in progress` via gh CLI
     gh issue edit {N} --remove-label "status: ready" --add-label "status: in progress"
  4. READ the skill file for this issue's type (see Skill Selection below)
  5. IMPLEMENT — write code, run checks
     pnpm typecheck && pnpm lint && pnpm test
  6. COMMIT using Conventional Commits format:
     feat(scope): description     — new feature
     fix(scope): description      — bug fix
     chore(scope): description    — infra/config
     docs(scope): description     — content/MDX pages
  7. OPEN a PR:
     gh pr create \
       --title "{type}({scope}): {summary}" \
       --body "Closes #{N}\n\n## Changes\n{summary}\n\n## Checklist\n{checklist from CLAUDE.md}" \
       --label "type: {type}" \
       --label "status: in review"
  8. MOVE issue to in review:
     gh issue edit {N} --remove-label "status: in progress" --add-label "status: in review"
  9. REVIEW the PR — load and follow the correct review skill file:
       type: ui      → read docs/skills/review-skill/review-ui.md
       type: api     → read docs/skills/review-skill/review-api.md
       type: content → read docs/skills/review-skill/review-content.md
       type: data    → read docs/skills/review-skill/review-data.md
       type: infra   → check CLAUDE.md rules only
  10. IF review finds required changes — fix them, push to the same branch, re-review
  11. IF review passes — MERGE the PR:
      gh pr merge {PR} --squash --delete-branch
  12. MOVE issue to done:
      gh issue edit {N} --remove-label "status: in review" --add-label "status: done"

CONTINUE to next issue.
```

Do not stop between issues unless you hit a dependency problem or a test that cannot pass.
If something is unclear, make a reasonable decision and note it in the PR body.

---

## Skill Selection

Before implementing any issue, read the matching skill file:

| Issue label  | Skill file to read |
|--------------|--------------------|
| `type: ui`   | `docs/skills/ui-skill/SKILL.md` — also note: `ui-ux-pro-max` is installed globally |
| `type: api`  | `docs/skills/api-skill/SKILL.md` |
| `type: content` | `docs/skills/content-skill/SKILL.md` |
| `type: data` | `docs/skills/data-skill/SKILL.md` |
| `type: infra` | No skill file — follow `CLAUDE.md` only |

---

## GitHub Label System

### Status labels — drive the loop above
| Label | Meaning |
|-------|---------|
| `status: ready` | Issue is ready to implement — this is your trigger |
| `status: in progress` | You are working on it |
| `status: in review` | PR is open, review in progress |
| `status: done` | PR merged, issue complete |

### Type labels — select the skill
`type: ui` · `type: api` · `type: content` · `type: data` · `type: infra`

### Other
`priority: high` · `priority: med` · `priority: low`
`milestone: M1` · `milestone: M2` · `milestone: M3` · `milestone: M4`

---

## Key Paths

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Hard rules — read first, always |
| `docs/PRD.md` | Product requirements |
| `docs/skills/` | Skill files for each issue type |
| `src/lib/r2.ts` | R2 client — never re-implement |
| `src/lib/env.ts` | Typed env vars — never use process.env directly |
| `src/schemas/regions.schema.ts` | RegionIndex Zod schema — single source of truth |
| `messages/en.json` | All UI strings for i18n |
| `scripts/build-region.sh` | Data pipeline — 3-step: pmtiles → geocode → poi |

---

## What This Site Is NOT

Stop and re-read the issue if you find yourself implementing any of these:
- An interactive map on the website (the map is in the mobile app)
- Speed camera visualisation on the website (app feature, not website)
- Turn-by-turn routing (v2 — Valhalla not yet integrated)
- User authentication or accounts
- A CMS or admin panel