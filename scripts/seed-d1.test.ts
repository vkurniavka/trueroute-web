import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateSeedSql, escapeSql } from './seed-d1'

interface SampleAsset {
  url: string
  sizeBytes: number
  sha256: string
  generatedAt: string
}

interface SampleRegion {
  id: string
  name: string
  nameUk: string
  assets: Record<string, SampleAsset>
}

interface SampleIndex {
  version: number
  generatedAt: string
  regions: SampleRegion[]
}

// sample-index.json uses placeholder sizeBytes: 0, but the Zod schema
// requires positive(). Patch each asset to have a realistic value.
function patchPlaceholders(raw: SampleIndex): SampleIndex {
  const regions = raw.regions.map((r) => {
    const patched: Record<string, SampleAsset> = {}
    for (const [key, asset] of Object.entries(r.assets)) {
      patched[key] = {
        ...asset,
        sizeBytes: asset.sizeBytes || 1024,
        sha256: asset.sha256.replace(/^0+$/, 'a'.repeat(64)),
      }
    }
    return { ...r, assets: patched }
  })
  return { ...raw, regions }
}

const rawSample: SampleIndex = JSON.parse(
  readFileSync(resolve(__dirname, 'sample-index.json'), 'utf-8'),
)
const sampleIndex = patchPlaceholders(rawSample)

describe('escapeSql', () => {
  it('doubles single quotes', () => {
    expect(escapeSql("it's")).toBe("it''s")
  })

  it('leaves strings without quotes unchanged', () => {
    expect(escapeSql('hello')).toBe('hello')
  })
})

describe('generateSeedSql', () => {
  it('produces valid SQL from sample-index.json', () => {
    const sql = generateSeedSql(sampleIndex)
    expect(sql).not.toContain('BEGIN TRANSACTION')
    expect(sql).not.toContain('COMMIT')
  })

  it('upserts Ukraine country row using ON CONFLICT DO UPDATE (not INSERT OR REPLACE)', () => {
    const sql = generateSeedSql(sampleIndex)
    // Must use ON CONFLICT upsert — not INSERT OR REPLACE, which would delete the
    // existing row and break FK references from regions.country_id.
    expect(sql).not.toContain('INSERT OR REPLACE INTO countries')
    expect(sql).toContain('ON CONFLICT(code) DO UPDATE SET')
    expect(sql).toContain("'UA'")
    expect(sql).toContain("'Ukraine'")
    expect(sql).toContain("'Україна'")
  })

  it('deletes existing data for idempotency before inserting', () => {
    const sql = generateSeedSql(sampleIndex)
    const deleteFilesIdx = sql.indexOf('DELETE FROM region_files')
    const deleteRegionsIdx = sql.indexOf('DELETE FROM regions')
    const firstInsertRegionIdx = sql.indexOf('INSERT INTO regions')

    expect(deleteFilesIdx).toBeGreaterThan(-1)
    expect(deleteRegionsIdx).toBeGreaterThan(-1)
    expect(firstInsertRegionIdx).toBeGreaterThan(-1)
    // Deletes happen before inserts
    expect(deleteFilesIdx).toBeLessThan(firstInsertRegionIdx)
    expect(deleteRegionsIdx).toBeLessThan(firstInsertRegionIdx)
  })

  it('inserts all 26 regions', () => {
    const sql = generateSeedSql(sampleIndex)
    const regionInserts = sql.match(/INSERT INTO regions/g)
    expect(regionInserts).toHaveLength(26)
  })

  it('inserts 78 region_files (26 regions × 3 assets each)', () => {
    const sql = generateSeedSql(sampleIndex)
    const fileInserts = sql.match(/INSERT INTO region_files/g)
    // sample-index.json has no routing assets, so 26 × 3 = 78
    expect(fileInserts).toHaveLength(78)
  })

  it('handles Ukrainian text with special characters', () => {
    const sql = generateSeedSql(sampleIndex)
    // Crimea's Ukrainian name
    expect(sql).toContain('Автономна Республіка Крим')
    // Ivano-Frankivsk's Ukrainian name
    expect(sql).toContain('Івано-Франківська')
  })

  it('includes all file types present in assets', () => {
    const sql = generateSeedSql(sampleIndex)
    expect(sql).toContain("'maps'")
    expect(sql).toContain("'geocode'")
    expect(sql).toContain("'poi'")
  })

  it('includes region file metadata (url, size, sha256, generated_at)', () => {
    const sql = generateSeedSql(sampleIndex)
    expect(sql).toContain('https://cdn.trueroutenavigation.com/regions/kyiv-city/maps/kyiv-city.pmtiles')
    expect(sql).toContain('size_bytes')
    expect(sql).toContain('sha256')
    expect(sql).toContain('generated_at')
  })

  it('handles optional routing asset when present', () => {
    const indexWithRouting = {
      ...sampleIndex,
      regions: [
        {
          ...sampleIndex.regions[0],
          assets: {
            ...sampleIndex.regions[0].assets,
            routing: {
              url: 'https://cdn.trueroutenavigation.com/regions/cherkasy/routing/cherkasy.osrm',
              sizeBytes: 1234,
              sha256: 'a'.repeat(64),
              generatedAt: '2026-03-04T00:00:00Z',
            },
          },
        },
        ...sampleIndex.regions.slice(1),
      ],
    }
    const sql = generateSeedSql(indexWithRouting)
    const fileInserts = sql.match(/INSERT INTO region_files/g)
    // 1 region with 4 assets + 25 regions with 3 assets = 79
    expect(fileInserts).toHaveLength(79)
    expect(sql).toContain("'routing'")
  })

  it('throws on invalid input (missing regions)', () => {
    expect(() => generateSeedSql({ version: 1, generatedAt: '2026-03-04T00:00:00Z' })).toThrow()
  })

  it('throws on input with fewer than 25 regions', () => {
    const tooFew = {
      version: 1,
      generatedAt: '2026-03-04T00:00:00Z',
      regions: sampleIndex.regions.slice(0, 5),
    }
    expect(() => generateSeedSql(tooFew)).toThrow()
  })

  it('uses subqueries for foreign keys instead of hardcoded IDs', () => {
    const sql = generateSeedSql(sampleIndex)
    // country_id should reference a subquery
    expect(sql).toContain("(SELECT id FROM countries WHERE code = 'UA')")
    // region_id should reference a subquery
    expect(sql).toContain('(SELECT id FROM regions WHERE code =')
  })
})
