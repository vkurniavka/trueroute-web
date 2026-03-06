import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb, D1Error } from '@/lib/db'
import { RegionIndexSchema } from '@/schemas/regions.schema'
import type { RegionIndex, Asset } from '@/schemas/regions.schema'
import type { ApiError } from '@/types/errors'
import type { CloudflareEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

interface JoinedRow {
  region_code: string
  region_name: string
  region_name_uk: string
  file_type: string
  url: string
  size_bytes: number
  sha256: string
  generated_at: string
}

const DEPRECATION_HEADERS = {
  Deprecation: 'true',
  Sunset: 'Sat, 31 Dec 2026 23:59:59 GMT',
  Link: '</api/v2/countries/UA/regions>; rel="successor-version"',
} as const

function dbErrorResponse(): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
    {
      status: 503,
      headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    },
  )
}

export async function GET(): Promise<NextResponse<RegionIndex | ApiError>> {
  const { env } = getRequestContext() as unknown as { env: CloudflareEnv }
  const db = getDb(env.TRUEROUTE_DB)

  let rows: JoinedRow[]
  try {
    rows = await db.queryAll<JoinedRow>(
      `SELECT r.code AS region_code, r.name AS region_name, r.name_uk AS region_name_uk,
              rf.file_type, rf.url, rf.size_bytes, rf.sha256, rf.generated_at
       FROM regions r
       JOIN region_files rf ON rf.region_id = r.id
       JOIN countries c ON c.id = r.country_id
       WHERE c.code = ? AND c.enabled = ?
       ORDER BY r.code, rf.file_type`,
      ['UA', 1],
    )
  } catch (error: unknown) {
    if (!(error instanceof D1Error)) {
      logger.error('Unexpected error fetching region index', { error })
    }
    return dbErrorResponse()
  }

  const regionMap = new Map<
    string,
    { id: string; name: string; nameUk: string; assets: Record<string, Asset> }
  >()

  for (const row of rows) {
    let region = regionMap.get(row.region_code)
    if (!region) {
      region = {
        id: row.region_code,
        name: row.region_name,
        nameUk: row.region_name_uk,
        assets: {},
      }
      regionMap.set(row.region_code, region)
    }

    const asset: Asset = {
      url: row.url,
      sizeBytes: row.size_bytes,
      sha256: row.sha256,
      generatedAt: row.generated_at,
    }

    region.assets[row.file_type] = asset
  }

  const data: RegionIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    regions: Array.from(regionMap.values()) as RegionIndex['regions'][number][],
  }

  const result = RegionIndexSchema.safeParse(data)
  if (!result.success) {
    logger.error('Index data failed validation', {
      errors: result.error.issues,
    })
    return NextResponse.json<ApiError>(
      { error: 'Index data is invalid', code: 'INDEX_INVALID' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json<RegionIndex>(result.data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      ...DEPRECATION_HEADERS,
    },
  })
}
