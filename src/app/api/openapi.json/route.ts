import { NextResponse } from 'next/server'
import { openapiSpec } from '@/lib/openapi-spec'

export const runtime = 'edge'

export function GET(): NextResponse {
  return NextResponse.json(openapiSpec, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
