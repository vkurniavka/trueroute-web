import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/openapi.json/route'

describe('GET /api/openapi.json', () => {
  it('returns 200 with JSON content', async () => {
    const response = GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns valid OpenAPI 3.1 spec', async () => {
    const response = GET()
    const data = await response.json()

    expect(data.openapi).toBe('3.1.0')
    expect(data.info.title).toBe('TrueRoute Data API')
  })

  it('includes all 4 endpoint paths', async () => {
    const response = GET()
    const data = await response.json()

    expect(data.paths).toHaveProperty('/api/v2/countries')
    expect(data.paths).toHaveProperty(
      '/api/v2/countries/{countryCode}/regions',
    )
    expect(data.paths).toHaveProperty(
      '/api/v2/countries/{countryCode}/regions/{regionId}/files',
    )
    expect(data.paths).toHaveProperty('/api/data/index')
  })

  it('defines ApiKeyAuth security scheme', async () => {
    const response = GET()
    const data = await response.json()

    expect(data.components.securitySchemes.ApiKeyAuth).toEqual({
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
      description: 'API key for authentication',
    })
  })

  it('marks legacy endpoint as deprecated', async () => {
    const response = GET()
    const data = await response.json()

    expect(data.paths['/api/data/index'].get.deprecated).toBe(true)
  })

  it('sets cache headers', async () => {
    const response = GET()

    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=3600, stale-while-revalidate=86400',
    )
  })
})
