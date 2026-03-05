import { NextResponse } from 'next/server'
import { getR2Object } from '@/lib/r2'

export const runtime = 'edge'
import { R2Error } from '@/lib/r2'
import { RegionIndexSchema } from '@/schemas/regions.schema'
import type { RegionIndex } from '@/schemas/regions.schema'
import type { ApiError } from '@/types/errors'
import { logger } from '@/lib/logger'

export async function GET(): Promise<NextResponse<RegionIndex | ApiError>> {
  let raw: unknown
  try {
    raw = await getR2Object<unknown>('index.json')
  } catch (error: unknown) {
    if (error instanceof R2Error) {
      logger.error('R2 error fetching index.json', {
        code: error.code,
        message: error.message,
      })
      return NextResponse.json<ApiError>(
        { error: 'Data service unavailable', code: 'R2_UNAVAILABLE' },
        {
          status: 503,
          headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
        },
      )
    }
    logger.error('Unexpected error fetching index.json', { error })
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'R2_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }

  const result = RegionIndexSchema.safeParse(raw)
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
    },
  })
}
