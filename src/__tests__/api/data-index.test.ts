import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { RegionIndex } from '@/schemas/regions.schema'
import type { ApiError } from '@/types/errors'

// Mock @cloudflare/next-on-pages to provide a fake D1 binding
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

// Mock auth — returns null (authenticated) by default
const mockValidateApiKey = vi.fn().mockResolvedValue(null)
vi.mock('@/lib/auth', () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
}))

// Must import after mocks are set up
import { GET } from '@/app/api/data/index/route'

function makeRequest(): Request {
  return new Request('http://localhost/api/data/index', {
    headers: { 'X-Api-Key': 'test-key' },
  })
}

const OBLAST_IDS = [
  'cherkasy',
  'chernihiv',
  'chernivtsi',
  'crimea',
  'dnipropetrovsk',
  'donetsk',
  'ivano-frankivsk',
  'kharkiv',
  'kherson',
  'khmelnytskyi',
  'kirovohrad',
  'kyiv-oblast',
  'kyiv-city',
  'luhansk',
  'lviv',
  'mykolaiv',
  'odesa',
  'poltava',
  'rivne',
  'sumy',
  'ternopil',
  'vinnytsia',
  'volyn',
  'zakarpattia',
  'zaporizhzhia',
  'zhytomyr',
]

function makeJoinedRows() {
  const fileTypes = ['geocode', 'maps', 'poi'] as const
  const rows = []
  for (const id of OBLAST_IDS) {
    for (const ft of fileTypes) {
      rows.push({
        region_code: id,
        region_name: id,
        region_name_uk: id,
        file_type: ft,
        url: `https://cdn.trueroutenavigation.com/regions/${id}/${ft}/${id}.pmtiles`,
        size_bytes: 1048576,
        sha256: 'a'.repeat(64),
        generated_at: '2026-01-15T10:30:00Z',
      })
    }
  }
  return rows
}

describe('GET /api/data/index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateApiKey.mockResolvedValue(null)
  })

  it('returns 401 when API key validation fails', async () => {
    mockValidateApiKey.mockResolvedValueOnce(
      NextResponse.json<ApiError>(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      ),
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('returns validated RegionIndex with 200 and correct cache headers', async () => {
    mockAll.mockResolvedValue({ results: makeJoinedRows() })

    const response = await GET(makeRequest())
    const data: RegionIndex = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
    expect(data.version).toBe(1)
    expect(data.regions).toHaveLength(26)

    // Deprecation headers
    expect(response.headers.get('Deprecation')).toBe('true')
    expect(response.headers.get('Sunset')).toBeTruthy()
    expect(response.headers.get('Link')).toContain('successor-version')
  })

  it('returns 503 with Retry-After when D1 is unavailable', async () => {
    mockAll.mockRejectedValue(new Error('D1 connection failed'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 with Retry-After when D1 query fails', async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('D1 prepare failed')
    })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 with INDEX_INVALID when schema validation fails', async () => {
    // Return empty results — will fail RegionIndexSchema .min(25) on regions
    mockAll.mockResolvedValue({ results: [] })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Index data is invalid',
      code: 'INDEX_INVALID',
    })
  })

  it('sets correct Cache-Control on success response', async () => {
    mockAll.mockResolvedValue({ results: makeJoinedRows() })

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
  })
})
