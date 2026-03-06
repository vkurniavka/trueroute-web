import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb, D1Error } from '@/lib/db'
import { RegionFileListSchema } from '@/schemas/region-files.schema'
import type { RegionFileList } from '@/schemas/region-files.schema'
import type { ApiError } from '@/types/errors'
import type { CloudflareEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

export const runtime = 'edge'

interface CountryRow {
  id: number
}

interface RegionRow {
  id: number
}

interface FileRow {
  file_type: string
  url: string
  size_bytes: number
  sha256: string
  generated_at: string
}

const DB_ERROR_RESPONSE = {
  body: { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' } as const,
  options: {
    status: 503,
    headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
  },
}

function dbErrorResponse(): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(DB_ERROR_RESPONSE.body, DB_ERROR_RESPONSE.options)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ countryCode: string; regionId: string }> },
): Promise<NextResponse<RegionFileList | ApiError>> {
  const { countryCode, regionId } = await params

  // Validate countryCode format: exactly 2 uppercase letters
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json<ApiError>(
      { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const { env } = getRequestContext() as unknown as { env: CloudflareEnv }
  const db = getDb(env.TRUEROUTE_DB)

  // Step 1: Check country exists and is enabled
  let country: CountryRow | null
  try {
    country = await db.queryFirst<CountryRow>(
      'SELECT id FROM countries WHERE code = ? AND enabled = ?',
      [countryCode, 1],
    )
  } catch (error: unknown) {
    if (!(error instanceof D1Error)) {
      logger.error('Unexpected error checking country', { countryCode, error })
    }
    return dbErrorResponse()
  }

  if (!country) {
    return NextResponse.json<ApiError>(
      { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Step 2: Check region exists in this country
  let region: RegionRow | null
  try {
    region = await db.queryFirst<RegionRow>(
      'SELECT id FROM regions WHERE country_id = ? AND code = ?',
      [country.id, regionId],
    )
  } catch (error: unknown) {
    if (!(error instanceof D1Error)) {
      logger.error('Unexpected error checking region', { countryCode, regionId, error })
    }
    return dbErrorResponse()
  }

  if (!region) {
    return NextResponse.json<ApiError>(
      { error: 'Region not found', code: 'REGION_NOT_FOUND' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Step 3: Fetch files for this region
  let rows: FileRow[]
  try {
    rows = await db.queryAll<FileRow>(
      'SELECT file_type, url, size_bytes, sha256, generated_at FROM region_files WHERE region_id = ?',
      [region.id],
    )
  } catch (error: unknown) {
    if (!(error instanceof D1Error)) {
      logger.error('Unexpected error fetching region files', { countryCode, regionId, error })
    }
    return dbErrorResponse()
  }

  const data: RegionFileList = {
    version: 1,
    countryCode,
    regionId,
    files: rows.map((r) => ({
      type: r.file_type,
      url: r.url,
      sizeBytes: r.size_bytes,
      sha256: r.sha256,
      generatedAt: r.generated_at,
    })),
  }

  const result = RegionFileListSchema.safeParse(data)
  if (!result.success) {
    logger.error('Region files data failed validation', {
      errors: result.error.issues,
    })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json<RegionFileList>(result.data, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
