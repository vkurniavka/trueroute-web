import { describe, it, expect, vi, beforeEach } from 'vitest'
import { R2Error } from '@/lib/r2'
import type { Asset, Region, RegionIndex } from '@/schemas/regions.schema'

vi.mock('@/lib/r2', async () => {
  const actual = await vi.importActual<typeof import('@/lib/r2')>('@/lib/r2')
  return {
    ...actual,
    getR2Object: vi.fn(),
  }
})

import { getR2Object } from '@/lib/r2'
import { GET } from '@/app/api/data/index/route'

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

function makeAsset(overrides?: Partial<Asset>): Asset {
  return {
    url: 'https://r2.trueroute.app/regions/kyiv-oblast/maps/kyiv-oblast.pmtiles',
    sizeBytes: 1048576,
    sha256: 'a'.repeat(64),
    generatedAt: '2026-01-15T10:30:00Z',
    ...overrides,
  }
}

function makeRegion(overrides?: Partial<Region>): Region {
  return {
    id: 'kyiv-oblast',
    name: 'Kyiv Oblast',
    nameUk: 'Київська область',
    assets: {
      maps: makeAsset(),
      geocode: makeAsset(),
      poi: makeAsset(),
    },
    ...overrides,
  }
}

function makeRegionIndex(overrides?: Partial<RegionIndex>): RegionIndex {
  return {
    version: 1,
    generatedAt: '2026-01-15T10:30:00Z',
    regions: OBLAST_IDS.map((id) =>
      makeRegion({ id, name: id, nameUk: id }),
    ),
    ...overrides,
  }
}

describe('GET /api/data/index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns validated RegionIndex with 200 and correct cache headers', async () => {
    const mockData = makeRegionIndex()
    vi.mocked(getR2Object).mockResolvedValue(mockData)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
    expect(data.version).toBe(1)
    expect(data.regions).toHaveLength(26)
  })

  it('returns 503 with Retry-After when R2 is unavailable', async () => {
    vi.mocked(getR2Object).mockRejectedValue(
      new R2Error('Failed to fetch object: index.json', 'R2_UNAVAILABLE'),
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'R2_UNAVAILABLE',
    })
  })

  it('returns 503 with Retry-After when R2 object not found', async () => {
    vi.mocked(getR2Object).mockRejectedValue(
      new R2Error('Object not found: index.json', 'R2_NOT_FOUND'),
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Data service unavailable',
      code: 'R2_UNAVAILABLE',
    })
  })

  it('returns 503 with INDEX_INVALID when schema validation fails', async () => {
    vi.mocked(getR2Object).mockResolvedValue({
      version: 'not-a-number',
      regions: [],
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(data).toEqual({
      error: 'Index data is invalid',
      code: 'INDEX_INVALID',
    })
  })

  it('sets correct Cache-Control on success response', async () => {
    vi.mocked(getR2Object).mockResolvedValue(makeRegionIndex())

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
  })
})
