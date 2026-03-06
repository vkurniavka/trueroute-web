import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb, D1Error } from '@/lib/db'
import { CountryListSchema } from '@/schemas/countries.schema'
import type { CountryList } from '@/schemas/countries.schema'
import type { ApiError } from '@/types/errors'
import type { CloudflareEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

interface CountryRow {
  code: string
  name: string
  name_uk: string
}

export async function GET(): Promise<NextResponse<CountryList | ApiError>> {
  const { env } = getRequestContext() as unknown as { env: CloudflareEnv }
  const db = getDb(env.TRUEROUTE_DB)

  let rows: CountryRow[]
  try {
    rows = await db.queryAll<CountryRow>(
      'SELECT code, name, name_uk FROM countries WHERE enabled = ?',
      [1],
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
    logger.error('Unexpected error querying countries', { error })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }

  const data: CountryList = {
    version: 1,
    countries: rows.map((r) => ({
      code: r.code,
      name: r.name,
      nameUk: r.name_uk,
    })),
  }

  const result = CountryListSchema.safeParse(data)
  if (!result.success) {
    logger.error('Countries data failed validation', {
      errors: result.error.issues,
    })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json<CountryList>(result.data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
