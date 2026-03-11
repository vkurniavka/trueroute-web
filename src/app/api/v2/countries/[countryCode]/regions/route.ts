import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb, D1Error } from '@/lib/db'
import { RegionListSchema } from '@/schemas/regions-v2.schema'
import type { RegionList } from '@/schemas/regions-v2.schema'
import type { ApiError } from '@/types/errors'
import type { CloudflareEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { validateApiKey } from '@/lib/auth'

export const runtime = 'edge'

interface CountryRow {
  id: number
}

interface RegionRow {
  code: string
  name: string
  name_uk: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ countryCode: string }> },
): Promise<NextResponse<RegionList | ApiError>> {
  const { countryCode } = await params

  // Validate countryCode format: exactly 2 uppercase letters
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json<ApiError>(
      { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const { env } = getRequestContext() as unknown as { env: CloudflareEnv }
  const db = getDb(env.TRUEROUTE_DB)

  const authError = await validateApiKey(request, db, env)
  if (authError) return authError

  // Step 1: Check country exists and is enabled
  let country: CountryRow | null
  try {
    country = await db.queryFirst<CountryRow>(
      'SELECT id FROM countries WHERE code = ? AND enabled = ?',
      [countryCode, 1],
    )
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
    logger.error('Unexpected error checking country', { countryCode, error })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }

  if (!country) {
    return NextResponse.json<ApiError>(
      { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Step 2: Fetch regions for this country
  let rows: RegionRow[]
  try {
    rows = await db.queryAll<RegionRow>(
      'SELECT code, name, name_uk FROM regions WHERE country_id = ?',
      [country.id],
    )
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
    logger.error('Unexpected error fetching regions', { countryCode, error })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }

  const data: RegionList = {
    version: 1,
    countryCode,
    regions: rows.map((r) => ({
      id: r.code,
      name: r.name,
      nameUk: r.name_uk,
    })),
  }

  const result = RegionListSchema.safeParse(data)
  if (!result.success) {
    logger.error('Regions data failed validation', {
      errors: result.error.issues,
    })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json<RegionList>(result.data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
