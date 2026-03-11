import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { RegionFileList } from '@/schemas/region-files.schema'
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
import { GET } from '@/app/api/v2/countries/[countryCode]/regions/[regionId]/files/route'

function makeContext(countryCode: string, regionId: string) {
  return { params: Promise.resolve({ countryCode, regionId }) }
}

function makeRequest(countryCode: string, regionId: string): Request {
  return new Request(
    `http://localhost/api/v2/countries/${countryCode}/regions/${regionId}/files`,
    { headers: { 'X-Api-Key': 'test-key' } },
  )
}

describe('GET /api/v2/countries/[countryCode]/regions/[regionId]/files', () => {
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

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('returns 200 with file list and correct cache headers', async () => {
    // Query 1: country lookup
    mockFirst.mockResolvedValueOnce({ id: 1 })
    // Query 2: region lookup
    mockFirst.mockResolvedValueOnce({ id: 10 })
    // Query 3: files query
    mockAll.mockResolvedValueOnce({
      results: [
        {
          file_type: 'maps',
          url: 'https://r2.example.com/UA/kyiv/maps.pmtiles',
          size_bytes: 12345678,
          sha256: 'a'.repeat(64),
          generated_at: '2025-01-01T00:00:00Z',
        },
      ],
    })

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data: RegionFileList = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
    expect(data.version).toBe(1)
    expect(data.countryCode).toBe('UA')
    expect(data.regionId).toBe('kyiv')
    expect(data.files).toHaveLength(1)
    expect(data.files[0]).toEqual({
      type: 'maps',
      url: 'https://r2.example.com/UA/kyiv/maps.pmtiles',
      sizeBytes: 12345678,
      sha256: 'a'.repeat(64),
      generatedAt: '2025-01-01T00:00:00Z',
    })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 404 when country not found', async () => {
    mockFirst.mockResolvedValueOnce(null)

    const response = await GET(makeRequest('XX', 'kyiv'), makeContext('XX', 'kyiv'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Country not found',
      code: 'COUNTRY_NOT_FOUND',
    })
  })

  it('returns 404 when region not found in that country', async () => {
    // Country found
    mockFirst.mockResolvedValueOnce({ id: 1 })
    // Region not found
    mockFirst.mockResolvedValueOnce(null)

    const response = await GET(
      makeRequest('UA', 'nonexistent'),
      makeContext('UA', 'nonexistent'),
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Region not found',
      code: 'REGION_NOT_FOUND',
    })
  })

  it('returns 404 for invalid country code format', async () => {
    const response = await GET(makeRequest('ua', 'kyiv'), makeContext('ua', 'kyiv'))
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

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails on region lookup', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockFirst.mockRejectedValueOnce(new Error('D1 query failed'))

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails on files query', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockFirst.mockResolvedValueOnce({ id: 10 })
    mockAll.mockRejectedValueOnce(new Error('D1 query failed'))

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
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
    mockFirst.mockResolvedValueOnce({ id: 10 })
    mockAll.mockResolvedValueOnce({
      results: [
        {
          id: 99,
          file_type: 'maps',
          url: 'https://r2.example.com/UA/kyiv/maps.pmtiles',
          size_bytes: 12345678,
          sha256: 'a'.repeat(64),
          generated_at: '2025-01-01T00:00:00Z',
        },
      ],
    })

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data: RegionFileList = await response.json()

    expect(response.status).toBe(200)
    // File objects should not have the DB integer id
    const file = data.files[0]
    expect(file).not.toHaveProperty('id')
    expect(file).not.toHaveProperty('region_id')
    expect(file.type).toBe('maps')
  })

  it('returns 200 with empty files array when region has no files', async () => {
    mockFirst.mockResolvedValueOnce({ id: 1 })
    mockFirst.mockResolvedValueOnce({ id: 10 })
    mockAll.mockResolvedValueOnce({ results: [] })

    const response = await GET(makeRequest('UA', 'kyiv'), makeContext('UA', 'kyiv'))
    const data: RegionFileList = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      version: 1,
      countryCode: 'UA',
      regionId: 'kyiv',
      files: [],
    })
  })
})
