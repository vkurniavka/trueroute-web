import { describe, it, expect } from 'vitest'
import {
  AssetSchema,
  RegionSchema,
  RegionIndexSchema,
} from '@/schemas/regions.schema'
import type { Asset, Region, RegionIndex } from '@/schemas/regions.schema'

function makeAsset(overrides?: Partial<Asset>): Asset {
  return {
    url: 'https://cdn.trueroutenavigation.com/regions/kyiv-oblast/maps/kyiv-oblast.pmtiles',
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

// Canonical oblast IDs matching scripts/regions.txt and issue #10
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

describe('AssetSchema', () => {
  it('rejects invalid sha256 (not 64 chars)', () => {
    const result = AssetSchema.safeParse(makeAsset({ sha256: 'tooshort' }))
    expect(result.success).toBe(false)
  })

  it('rejects invalid url', () => {
    const result = AssetSchema.safeParse(makeAsset({ url: 'not-a-url' }))
    expect(result.success).toBe(false)
  })
})

describe('RegionSchema', () => {
  it('rejects invalid id with uppercase or spaces', () => {
    const upper = RegionSchema.safeParse(makeRegion({ id: 'Kyiv-Oblast' }))
    expect(upper.success).toBe(false)

    const spaces = RegionSchema.safeParse(makeRegion({ id: 'kyiv oblast' }))
    expect(spaces.success).toBe(false)
  })

  it('rejects missing required asset (no maps)', () => {
    const region = makeRegion()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maps: _maps, ...assetsWithoutMaps } = region.assets
    const result = RegionSchema.safeParse({
      ...region,
      assets: assetsWithoutMaps,
    })
    expect(result.success).toBe(false)
  })

  it('passes when routing asset is absent', () => {
    const region = makeRegion()
    expect(region.assets.routing).toBeUndefined()
    const result = RegionSchema.safeParse(region)
    expect(result.success).toBe(true)
  })

  it('passes when routing asset is present', () => {
    const region = makeRegion({
      assets: {
        maps: makeAsset(),
        geocode: makeAsset(),
        poi: makeAsset(),
        routing: makeAsset(),
      },
    })
    const result = RegionSchema.safeParse(region)
    expect(result.success).toBe(true)
  })
})

describe('RegionIndexSchema', () => {
  it('validates a full RegionIndex with 25 regions', () => {
    const index = makeRegionIndex()
    const result = RegionIndexSchema.safeParse(index)
    expect(result.success).toBe(true)
  })

  it('rejects RegionIndex with fewer than 25 regions', () => {
    const result = RegionIndexSchema.safeParse(
      makeRegionIndex({
        regions: [makeRegion()],
      }),
    )
    expect(result.success).toBe(false)
  })
})
