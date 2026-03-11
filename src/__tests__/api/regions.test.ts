import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { RegionList } from '@/schemas/regions-v2.schema'
import type { ApiError } from '@/types/errors'

// Mock @cloudflare/next-on-pages to provide a fake D1 binding
const mockFirst = vi.fn()
const mockAll = vi.fn()
const mockBind = vi.fn(() => ({ first: mockFirst, all: mockAll }))
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
import { GET } from '@/app/api/v2/countries/[countryCode]/regions/route'

function makeContext(countryCode: string) {
  return { params: Promise.resolve({ countryCode }) }
}

function makeRequest(countryCode: string): Request {
  return new Request(
    `http://localhost/api/v2/countries/${countryCode}/regions`,
    { headers: { 'X-Api-Key': 'test-key' } },
  )
}

describe('GET /api/v2/countries/[countryCode]/regions', () => {
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

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('returns 200 with region list and correct cache headers', async () => {
    // First call: country lookup (queryFirst → .first())
    mockFirst.mockResolvedValueOnce({ id: 1 })
    // Second call: regions query (queryAll → .all())
    mockAll.mockResolvedValueOnce({
      results: [
        { code: 'kyiv', name: 'Kyiv', name_uk: 'Київ' },
        { code: 'odesa', name: 'Odesa', name_uk: 'Одеса' },
      ],
    })

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data: RegionList = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
    expect(data.version).toBe(1)
    expect(data.countryCode).toBe('UA')
    expect(data.regions).toHaveLength(2)
    expect(data.regions[0]).toEqual({
      id: 'kyiv',
      name: 'Kyiv',
      nameUk: 'Київ',
    })
    expect(data.regions[1]).toEqual({
      id: 'odesa',
      name: 'Odesa',
      nameUk: 'Одеса',
    })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('queries only enabled countries and uses country_id for regions', async () => {
    mockFirst.mockResolvedValueOnce({ id: 42 })
    mockAll.mockResolvedValueOnce({ results: [] })

    await GET(makeRequest('UA'), makeContext('UA'))

    // First query: country lookup with enabled check
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('enabled'),
    )
    expect(mockBind).toHaveBeenNthCalledWith(1, 'UA', 1)
    // Second query: regions by country_id
    expect(mockBind).toHaveBeenNthCalledWith(2, 42)
  })

  it('returns 404 when country not found', async () => {
    mockFirst.mockResolvedValueOnce(null)

    const response = await GET(makeRequest('XX'), makeContext('XX'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Country not found',
      code: 'COUNTRY_NOT_FOUND',
    })
  })

  it('returns 404 for invalid country code format', async () => {
    const response = await GET(makeRequest('ua'), makeContext('ua'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Country not found',
      code: 'COUNTRY_NOT_FOUND',
    })
    // Should not hit D1 at all for invalid format
    expect(mockPrepare).not.toHaveBeenCalled()
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails on country lookup', async () => {
    mockFirst.mockRejectedValueOnce(new Error('D1 connection failed'))

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails on regions query', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockAll.mockRejectedValueOnce(new Error('D1 query failed'))

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('does not expose internal DB row ids in response', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockAll.mockResolvedValueOnce({
      results: [
        { id: 99, code: 'kyiv', name: 'Kyiv', name_uk: 'Київ' },
      ],
    })

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data: RegionList = await response.json()

    expect(response.status).toBe(200)
    // region.id should be the code, not the DB integer
    expect(data.regions[0].id).toBe('kyiv')
    expect(data.regions[0]).not.toHaveProperty('code')
  })

  it('returns 200 with empty regions array when country has no regions', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockAll.mockResolvedValueOnce({ results: [] })

    const response = await GET(makeRequest('UA'), makeContext('UA'))
    const data: RegionList = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      version: 1,
      countryCode: 'UA',
      regions: [],
    })
  })
})
