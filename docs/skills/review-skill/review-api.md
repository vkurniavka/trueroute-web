---
name: trueroute-review-api
description: Code review skill for TrueRoute API pull requests. Triggered automatically when a PR with label `type: api` is opened or updated. Reviews Route Handlers, Zod schemas, R2 access patterns, cache headers, error shapes, and TypeScript correctness. Posts structured review as a PR comment and either approves or requests changes.
---

# TrueRoute API Code Review

You are reviewing an API pull request for the TrueRoute website.
Read the PR diff, the linked issue's acceptance criteria, and `CLAUDE.md`. Then post a structured review.

## Review Checklist — Check Every Item

### 1. Route Handler Structure
- [ ] Only named exports: `GET`, `POST`, `PUT`, `DELETE`, `PATCH` — never `export default`
- [ ] File lives under `src/app/api/` — never under `src/pages/api/`
- [ ] No business logic directly in the route file — extracted to a service or utility function
- [ ] No `async` functions without `try/catch` — every async path has error handling

### 2. R2 Access
- [ ] Uses `import { getR2Object, listR2Objects, getR2Metadata } from '@/lib/r2'` — never raw `S3Client`
- [ ] No R2 credentials or endpoint URLs hardcoded — uses `src/lib/env.ts`
- [ ] R2 errors caught and converted to `ApiError` shape — raw R2 errors never exposed to client
- [ ] R2 access only from Route Handlers or Server Components — never from Client Components

### 3. Zod Validation
- [ ] All request inputs validated with Zod before any logic runs
- [ ] Response data validated with Zod schema before returning — `.parse()` or `.safeParse()`
- [ ] Zod schemas live in `src/schemas/` — not inline in the route file
- [ ] TypeScript types inferred from Zod schemas — `z.infer<typeof Schema>` — no duplicated type definitions

### 4. RegionIndex Schema (if route touches region data)
- [ ] Uses `RegionIndexSchema`, `RegionSchema`, `AssetSchema` from `src/schemas/regions.schema.ts`
- [ ] Does not add `routing` asset to any region (v2 only — must be absent, not null)
- [ ] `regions` array has exactly 25 entries when returning full index
- [ ] `version` field is present and correct integer

### 5. Cache Headers
- [ ] Every successful response has an explicit `Cache-Control` header
- [ ] Region index uses `s-maxage=3600, stale-while-revalidate=86400`
- [ ] Checksum/metadata uses `s-maxage=86400, stale-while-revalidate=604800`
- [ ] Dynamic or user-specific data uses `no-store`
- [ ] Cache headers set via `NextResponse.json(data, { headers: { 'Cache-Control': '...' } })`

### 6. Error Responses
- [ ] All errors return `{ error: string; code: string }` shape — no other error shapes
- [ ] No stack traces in responses — `error.message` only, never `error.stack`
- [ ] R2 unavailable → `503` with `Retry-After: 60` header
- [ ] Validation failure → `400` with descriptive `error` message
- [ ] Status codes are semantically correct (not everything is `500`)

### 7. TypeScript
- [ ] No `any` types
- [ ] Return types explicitly annotated on exported handler functions
- [ ] No `// @ts-ignore` without explanation

### 8. Tests
- [ ] Test file at `__tests__/api/{resource}.test.ts`
- [ ] Happy path tested — correct response shape and status
- [ ] R2 failure tested — returns `503` with `Retry-After`, correct error shape
- [ ] R2 client mocked via `vi.mock('@/lib/r2')` — no real R2 calls
- [ ] Zod validation failure tested where inputs are accepted

### 9. Acceptance Criteria
- [ ] Every criterion from the linked issue is verifiably met in the diff

## Review Output Format

```markdown
## AI Code Review — API

**Issue:** #N — [issue title]
**Verdict:** ✅ Approved | ⚠️ Approved with notes | ❌ Changes requested

### Checklist Results
[List only items that FAILED. If all passed, write "All checks passed."]

### Required Changes (if any)
[Numbered, specific, actionable. Include file path and line reference.]

### Suggestions (optional)
[Non-blocking. Clearly marked optional.]

### Acceptance Criteria
- [x] Criterion 1 — met because [brief reason]
- [ ] Criterion 2 — NOT met: [specific reason]
```

**Verdict rules:**
- `✅ Approved` — all checks passed, all acceptance criteria met
- `⚠️ Approved with notes` — minor issues, no blocking problems
- `❌ Changes requested` — at least one Required Change present

Never approve a PR with a missing `Cache-Control` header, raw `S3Client` usage, or unmet acceptance criteria.