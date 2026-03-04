---
triggers:
  - type: api
  - RegionIndex
  - route handler
  - r2.ts
  - trueroute-data
  - api/data
  - zod schema
---

# API Development — TrueRoute

Read the full skill file before writing any code: `docs/skills/api-skill/SKILL.md`

Quick reference:

## R2 Access — Only One Way

```typescript
// ✅ Always
import { getR2Object } from '@/lib/r2'

// ❌ Never — don't instantiate S3Client directly
```

## Every Route Handler

```typescript
export async function GET(request: Request) {
  try {
    const data = await getR2Object<RegionIndex>('index.json')
    const validated = RegionIndexSchema.parse(data)           // validate before returning
    return NextResponse.json(validated, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Region index unavailable', code: 'R2_UNAVAILABLE' },
      { status: 503, headers: { 'Retry-After': '60' } }
    )
  }
}
```

## Cache Headers

| Data | Header |
|------|--------|
| Region index | `s-maxage=3600, stale-while-revalidate=86400` |
| Checksums | `s-maxage=86400, stale-while-revalidate=604800` |
| Dynamic | `no-store` |

## Error Shape — Always This, Nothing Else

```typescript
{ error: string; code: string }
```

Never expose stack traces. Never return `{ message: string }`.

## RegionIndex — routing field is ABSENT in v1

`routing` must be omitted entirely from every region's assets — not `null`, not `{}`.
The Zod schema in `src/schemas/regions.schema.ts` enforces this. Run `pnpm typecheck` to verify.