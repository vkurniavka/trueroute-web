import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CountryList } from '@/schemas/countries.schema'

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

// Must import after mocks are set up
import { GET } from '@/app/api/v2/countries/route'

describe('GET /api/v2/countries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with country list and correct cache headers', async () => {
    mockAll.mockResolvedValue({
      results: [
        { code: 'UA', name: 'Ukraine', name_uk: 'Україна' },
        { code: 'PL', name: 'Poland', name_uk: 'Польща' },
      ],
    })

    const response = await GET()
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
  })

  it('queries only enabled countries', async () => {
    mockAll.mockResolvedValue({ results: [] })

    await GET()

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('enabled'),
    )
    expect(mockBind).toHaveBeenCalledWith(1)
  })

  it('returns 200 with empty countries array when none enabled', async () => {
    mockAll.mockResolvedValue({ results: [] })

    const response = await GET()
    const data: CountryList = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ version: 1, countries: [] })
  })

  it('returns 503 with DB_UNAVAILABLE when D1 fails', async () => {
    mockAll.mockRejectedValue(new Error('D1 connection failed'))

    const response = await GET()
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

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })

  it('does not expose internal DB row ids in response', async () => {
    mockAll.mockResolvedValue({
      results: [
        { id: 1, code: 'UA', name: 'Ukraine', name_uk: 'Україна' },
      ],
    })

    const response = await GET()
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
