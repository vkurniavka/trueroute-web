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

## Done When

- [ ] Route returns correct shape validated against the Zod schema in tests
- [ ] R2 failure path tested — returns `503` with `Retry-After`, never `500`
- [ ] Cache headers match the table above for this data type
- [ ] No `S3Client` instantiated directly — uses `src/lib/r2.ts`
- [ ] No `any` types — all inferred from Zod schemas
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes with ≥ 80% coverage on the route file