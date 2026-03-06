---
name: trueroute-api
description: API development skill for TrueRoute Website Route Handlers. Use for every issue labeled `type: api` — creating or modifying Next.js 15 Route Handlers, Zod schemas, TypeScript types, and R2 data access. Always load this skill before implementing any `/api/` route, any `src/schemas/` file, any `src/types/` file, or any file that accesses Cloudflare R2. This skill encodes the exact R2 bucket structure, RegionIndex schema, caching strategy, and error shape for the project.
---

# TrueRoute API Skill

You are implementing a Next.js 15 Route Handler for the TrueRoute website.
Read the linked GitHub issue, then follow this skill exactly.

## Stack

- Next.js 15 App Router Route Handlers (not Pages API)
- TypeScript strict — no `any`, no `unknown` without narrowing
- Zod for all input validation and response shape guarantees
- `@aws-sdk/client-s3` via the shared R2 client at `src/lib/r2.ts`
- `next-intl` is for UI only — API routes return raw JSON, never localised strings

## File Layout

For every API issue, create exactly these files:

```
src/
├── app/api/{resource}/route.ts       ← Route Handler (named exports only)
├── schemas/{resource}.schema.ts      ← Zod schemas
├── types/{resource}.ts               ← TypeScript types inferred from schemas
└── __tests__/api/{resource}.test.ts  ← Vitest tests
```

## R2 Access Pattern

Always use the shared client. Never instantiate `S3Client` directly in a route.

```typescript
// ✅ Correct
import { getR2Object, listR2Objects } from '@/lib/r2'

const index = await getR2Object<RegionIndex>('index.json')

// ❌ Never do this
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
const client = new S3Client({ ... })
```

`src/lib/r2.ts` exports:
- `getR2Object<T>(key: string): Promise<T>` — fetches and JSON-parses an object
- `listR2Objects(prefix: string): Promise<string[]>` — lists keys under a prefix
- `getR2Metadata(key: string): Promise<Record<string, string>>` — fetches object metadata

## D1 Database Access Pattern

Always use the shared client. Never access `env.TRUEROUTE_DB` directly in a Route Handler.

```typescript
// ✅ Correct — go through src/lib/db.ts
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb, D1Error } from '@/lib/db'
import type { CloudflareEnv } from '@/lib/env'

export async function GET(): Promise<NextResponse> {
  const { env } = getRequestContext() as unknown as { env: CloudflareEnv }
  const db = getDb(env.TRUEROUTE_DB)

  const rows = await db.queryAll<MyRow>(
    'SELECT code, name, name_uk FROM my_table WHERE enabled = ?',
    [1],
  )
}

// ❌ Never do this
const { env } = getRequestContext()
const result = await env.TRUEROUTE_DB.prepare('SELECT ...').all()
```

### DbClient API (`src/lib/db.ts`)

| Method | Returns | Use for |
|--------|---------|---------|
| `queryAll<T>(sql, params?)` | `T[]` | SELECT returning multiple rows |
| `queryFirst<T>(sql, params?)` | `T \| null` | SELECT returning one row or null |
| `execute(sql, params?)` | `D1Result` | INSERT, UPDATE, DELETE |
| `batch(statements)` | `D1Result[]` | Multiple statements in one round-trip |

All methods throw `D1Error` on failure — never raw D1 errors.

### D1 Error Handling

Catch `D1Error` and return the standard error shape:

```typescript
import { D1Error } from '@/lib/db'

try {
  rows = await db.queryAll<MyRow>(sql, params)
} catch (error: unknown) {
  if (error instanceof D1Error) {
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }
  // Log and return same shape for unexpected errors
  logger.error('Unexpected error', { error })
  return NextResponse.json<ApiError>(
    { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
    { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
  )
}
```

### D1 Row-to-Response Mapping

- **Never expose internal `id` integers** — use `code` or slug fields only
- **Map `snake_case` DB columns to `camelCase` JSON** — e.g. `name_uk` → `nameUk`

```typescript
// ✅ Correct — map columns, omit id
const data = {
  countries: rows.map((r) => ({
    code: r.code,
    name: r.name,
    nameUk: r.name_uk,  // snake_case → camelCase
  })),
}

// ❌ Never do this — exposes internal id
const data = { countries: rows }
```

### Parameterised Queries Only

Always use `?` placeholders. Never interpolate user input into SQL.

```typescript
// ✅ Correct
db.queryAll('SELECT * FROM regions WHERE country_id = (SELECT id FROM countries WHERE code = ?)', [countryCode])

// ❌ Never do this
db.queryAll(`SELECT * FROM regions WHERE code = '${regionCode}'`)
```

## Route Handler Rules

```typescript
// Every route: named exports only, never `export default`
export async function GET(request: Request) {
  // 1. Parse and validate any params/searchParams with Zod first
  // 2. Access R2 via shared client
  // 3. Validate response shape with Zod before returning
  // 4. Return with explicit cache headers
  // 5. Catch errors — never expose stack traces
}
```

### Cache Headers — Use the Right One

| Data type | Cache header |
|-----------|-------------|
| Region index (changes ~weekly) | `s-maxage=3600, stale-while-revalidate=86400` |
| Static metadata (checksums) | `s-maxage=86400, stale-while-revalidate=604800` |
| User-specific or dynamic | `no-store` |

Always set headers via `NextResponse.json(data, { headers: { 'Cache-Control': '...' } })`.

### Error Response Shape

Every error — without exception — uses this shape:

```typescript
// src/types/errors.ts (already exists, import from here)
type ApiError = { error: string; code: string }

// Example usage
return NextResponse.json<ApiError>(
  { error: 'Region index unavailable', code: 'R2_UNAVAILABLE' },
  { status: 503, headers: { 'Retry-After': '60' } }
)
```

Never return `{ message: string }`, never expose `error.stack`, never return raw R2 errors.

## RegionIndex Schema — The Most Important Type in the Project

The mobile app depends on this. Changes are breaking. Do not modify the schema
without a new `version` number and a migration plan.

```typescript
// src/schemas/regions.schema.ts — single source of truth
import { z } from 'zod'

export const AssetSchema = z.object({
  url: z.string().url(),
  sizeBytes: z.number().positive(),
  sha256: z.string().length(64),
  generatedAt: z.string().datetime(),
})

export const RegionSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),        // e.g. "kyiv-oblast"
  name: z.string(),                          // English name
  nameUk: z.string(),                        // Ukrainian name
  assets: z.object({
    maps: AssetSchema,                        // required in v1
    geocode: AssetSchema,                     // required in v1
    poi: AssetSchema,                         // required in v1
    routing: AssetSchema.optional(),          // v2 only — omit in v1
  }),
})

export const RegionIndexSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  regions: z.array(RegionSchema).min(25),    // must have all 25 oblasts
})

export type Asset = z.infer<typeof AssetSchema>
export type Region = z.infer<typeof RegionSchema>
export type RegionIndex = z.infer<typeof RegionIndexSchema>
```

## R2 Key Conventions

| Data | R2 key |
|------|--------|
| Region index | `index.json` |
| Checksums | `metadata/checksums.json` |
| PMTiles for a region | `regions/{id}/maps/{id}.pmtiles` |
| Geocode DB | `regions/{id}/geocode/{id}.db` |
| POI JSON | `regions/{id}/poi/{id}-cameras.json` |
| Valhalla (v2 only) | `regions/{id}/routing/{id}.valhalla` |

## Testing Pattern

Use Vitest + MSW to mock R2 responses. Never make real R2 calls in tests.

```typescript
// __tests__/api/data-index.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/data/index/route'

// Mock the R2 client
vi.mock('@/lib/r2', () => ({
  getR2Object: vi.fn(),
}))

describe('GET /api/data/index', () => {
  it('returns validated region index with correct cache headers', async () => {
    const mockData: RegionIndex = { ... }
    vi.mocked(getR2Object).mockResolvedValue(mockData)

    const response = await GET(new Request('http://localhost/api/data/index'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600')
    expect(data.regions).toHaveLength(25)
  })

  it('returns 503 with Retry-After when R2 is unavailable', async () => {
    vi.mocked(getR2Object).mockRejectedValue(new Error('R2 timeout'))

    const response = await GET(new Request('http://localhost/api/data/index'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    const data = await response.json()
    expect(data).toMatchObject({ error: expect.any(String), code: expect.any(String) })
  })
})
```

## Testing D1 Routes

Mock `@cloudflare/next-on-pages` to provide a fake D1 binding. Never hit a real database in tests.

```typescript
// __tests__/api/countries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set up mock chain: prepare → bind → all
const mockAll = vi.fn()
const mockBind = vi.fn(() => ({ all: mockAll }))
const mockPrepare = vi.fn(() => ({ bind: mockBind }))

vi.mock('@cloudflare/next-on-pages', () => ({
  getRequestContext: () => ({
    env: {
      TRUEROUTE_DB: { prepare: mockPrepare },
    },
  }),
}))

// Import route AFTER mocks are set up
import { GET } from '@/app/api/v2/countries/route'

describe('GET /api/v2/countries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when D1 succeeds', async () => {
    mockAll.mockResolvedValue({
      results: [{ code: 'UA', name: 'Ukraine', name_uk: 'Україна' }],
    })

    const response = await GET()
    expect(response.status).toBe(200)
  })

  it('returns 503 when D1 fails', async () => {
    mockAll.mockRejectedValue(new Error('D1 connection failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })
})
```

Key points:
- Mock the full chain: `prepare` → `bind` → `all`/`first`/`run`
- Import the route handler **after** `vi.mock()` calls
- Call `vi.clearAllMocks()` in `beforeEach`
- Test both success path and D1 failure path (503 + `DB_UNAVAILABLE`)
- Verify internal DB `id` fields are never exposed in responses

## Done When

- [ ] Route returns correct shape validated against the Zod schema in tests
- [ ] R2 failure path tested — returns `503` with `Retry-After`, never `500`
- [ ] Cache headers match the table above for this data type
- [ ] No `S3Client` instantiated directly — uses `src/lib/r2.ts`
- [ ] No `any` types — all inferred from Zod schemas
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes with ≥ 80% coverage on the route file