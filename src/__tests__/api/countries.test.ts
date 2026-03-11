import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { CountryList } from '@/schemas/countries.schema'
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
import { GET, OPTIONS } from '@/app/api/v2/countries/route'

function makeRequest(): Request {
  return new Request('http://localhost/api/v2/countries', {
    headers: { 'X-Api-Key': 'test-key' },
  })
}

describe('GET /api/v2/countries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateApiKey.mockResolvedValue(null)
  })

  it('returns 401 when API key is missing', async () => {
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

  it('returns 200 with country list and correct cache headers', async () => {
    mockAll.mockResolvedValue({
      results: [
        { code: 'UA', name: 'Ukraine', name_uk: 'Україна' },
        { code: 'PL', name: 'Poland', name_uk: 'Польща' },
      ],
    })

    const response = await GET(makeRequest())
    const data: CountryList = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
    expect(data.version).toBe(1)
    expect(data.countries).toHaveLength(2)
    expect(data.countries[0]).toEqual({
      code: 'UA',
      name: 'Ukraine',
      nameUk: 'Україна',
    })
    expect(data.countries[1]).toEqual({
      code: 'PL',
      name: 'Poland',
      nameUk: 'Польща',
    })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('queries only enabled countries', async () => {
    mockAll.mockResolvedValue({ results: [] })

    await GET(makeRequest())

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('enabled'),
    )
    expect(mockBind).toHaveBeenCalledWith(1)
  })

  it('returns 200 with empty countries array when none enabled', async () => {
    mockAll.mockResolvedValue({ results: [] })

    const response = await GET(makeRequest())
    const data: CountryList = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ version: 1, countries: [] })
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails', async () => {
    mockAll.mockRejectedValue(new Error('D1 connection failed'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 503 when D1 prepare throws', async () => {
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('D1 prepare failed')
    })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('returns 204 with CORS headers for OPTIONS preflight', async () => {
    const response = OPTIONS()

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, OPTIONS',
    )
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type, X-Api-Key',
    )
  })

  it('does not expose internal DB row ids in response', async () => {
    mockAll.mockResolvedValue({
      results: [
        { id: 1, code: 'UA', name: 'Ukraine', name_uk: 'Україна' },
      ],
    })

    const response = await GET(makeRequest())
    const data: CountryList = await response.json()

    expect(response.status).toBe(200)
    expect(data.countries[0]).not.toHaveProperty('id')
    expect(data.countries[0]).toEqual({
      code: 'UA',
      name: 'Ukraine',
      nameUk: 'Україна',
    })
  })
})
