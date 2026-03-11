/**
 * OpenAPI 3.1.0 specification for the TrueRoute Data API.
 * Hand-written to match the existing Zod schemas and route handlers.
 */

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'TrueRoute Data API',
    version: '2.0.0',
    description:
      'API for accessing TrueRoute regional map data packages. ' +
      'All endpoints require an API key passed via the X-Api-Key header.',
  },
  servers: [{ url: '/' }],
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/api/v2/countries': {
      get: {
        operationId: 'listCountries',
        summary: 'List enabled countries',
        tags: ['Countries'],
        responses: {
          '200': {
            description: 'List of enabled countries',
            headers: cacheHeaders(),
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CountryList' },
              },
            },
          },
          '401': unauthorizedResponse(),
          '503': dbUnavailableResponse(),
        },
      },
    },
    '/api/v2/countries/{countryCode}/regions': {
      get: {
        operationId: 'listRegions',
        summary: 'List regions for a country',
        tags: ['Regions'],
        parameters: [
          {
            name: 'countryCode',
            in: 'path',
            required: true,
            description: 'ISO 3166-1 alpha-2 country code (uppercase)',
            schema: { type: 'string', pattern: '^[A-Z]{2}$', example: 'UA' },
          },
        ],
        responses: {
          '200': {
            description: 'List of regions in the country',
            headers: cacheHeaders(),
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegionList' },
              },
            },
          },
          '401': unauthorizedResponse(),
          '404': {
            description: 'Country not found or not enabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
              },
            },
          },
          '503': dbUnavailableResponse(),
        },
      },
    },
    '/api/v2/countries/{countryCode}/regions/{regionId}/files': {
      get: {
        operationId: 'listRegionFiles',
        summary: 'List downloadable files for a region',
        tags: ['Files'],
        parameters: [
          {
            name: 'countryCode',
            in: 'path',
            required: true,
            description: 'ISO 3166-1 alpha-2 country code (uppercase)',
            schema: { type: 'string', pattern: '^[A-Z]{2}$', example: 'UA' },
          },
          {
            name: 'regionId',
            in: 'path',
            required: true,
            description: 'Region code',
            schema: { type: 'string', example: 'kyiv-oblast' },
          },
        ],
        responses: {
          '200': {
            description: 'List of downloadable files for the region',
            headers: cacheHeaders(),
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegionFileList' },
              },
            },
          },
          '401': unauthorizedResponse(),
          '404': {
            description: 'Country or region not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                examples: {
                  countryNotFound: {
                    summary: 'Country not found',
                    value: { error: 'Country not found', code: 'COUNTRY_NOT_FOUND' },
                  },
                  regionNotFound: {
                    summary: 'Region not found',
                    value: { error: 'Region not found', code: 'REGION_NOT_FOUND' },
                  },
                },
              },
            },
          },
          '503': dbUnavailableResponse(),
        },
      },
    },
    '/api/data/index': {
      get: {
        operationId: 'getLegacyIndex',
        summary: 'Legacy region index (UA only)',
        description: 'Deprecated. Use /api/v2/countries/UA/regions instead.',
        deprecated: true,
        tags: ['Legacy'],
        responses: {
          '200': {
            description: 'Region index with all file assets (UA only)',
            headers: {
              ...cacheHeaders(),
              Deprecation: {
                schema: { type: 'string' },
                description: 'Deprecation flag',
                example: 'true',
              },
              Sunset: {
                schema: { type: 'string' },
                description: 'Date after which this endpoint may be removed',
                example: 'Sat, 31 Dec 2026 23:59:59 GMT',
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegionIndex' },
              },
            },
          },
          '401': unauthorizedResponse(),
          '503': dbUnavailableResponse(),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
        description: 'API key for authentication',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        required: ['error', 'code'],
        properties: {
          error: { type: 'string', description: 'Human-readable error message' },
          code: { type: 'string', description: 'Machine-readable error code' },
        },
      },
      Country: {
        type: 'object',
        required: ['code', 'name', 'nameUk'],
        properties: {
          code: { type: 'string', minLength: 2, maxLength: 2, example: 'UA' },
          name: { type: 'string', minLength: 1, example: 'Ukraine' },
          nameUk: { type: 'string', minLength: 1, example: 'Україна' },
        },
      },
      CountryList: {
        type: 'object',
        required: ['version', 'countries'],
        properties: {
          version: { type: 'integer', const: 1 },
          countries: {
            type: 'array',
            items: { $ref: '#/components/schemas/Country' },
          },
        },
      },
      RegionV2: {
        type: 'object',
        required: ['id', 'name', 'nameUk'],
        properties: {
          id: { type: 'string', minLength: 1, example: 'kyiv-oblast' },
          name: { type: 'string', minLength: 1, example: 'Kyiv Oblast' },
          nameUk: { type: 'string', minLength: 1, example: 'Київська область' },
        },
      },
      RegionList: {
        type: 'object',
        required: ['version', 'countryCode', 'regions'],
        properties: {
          version: { type: 'integer', const: 1 },
          countryCode: { type: 'string', minLength: 2, maxLength: 2 },
          regions: {
            type: 'array',
            items: { $ref: '#/components/schemas/RegionV2' },
          },
        },
      },
      RegionFile: {
        type: 'object',
        required: ['type', 'url', 'sizeBytes', 'sha256', 'generatedAt'],
        properties: {
          type: { type: 'string', minLength: 1, example: 'maps' },
          url: { type: 'string', format: 'uri' },
          sizeBytes: { type: 'integer', minimum: 1 },
          sha256: { type: 'string', minLength: 64, maxLength: 64 },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegionFileList: {
        type: 'object',
        required: ['version', 'countryCode', 'regionId', 'files'],
        properties: {
          version: { type: 'integer', const: 1 },
          countryCode: { type: 'string', minLength: 2, maxLength: 2 },
          regionId: { type: 'string', minLength: 1 },
          files: {
            type: 'array',
            items: { $ref: '#/components/schemas/RegionFile' },
          },
        },
      },
      Asset: {
        type: 'object',
        required: ['url', 'sizeBytes', 'sha256', 'generatedAt'],
        properties: {
          url: { type: 'string', format: 'uri' },
          sizeBytes: { type: 'integer', minimum: 1 },
          sha256: { type: 'string', minLength: 64, maxLength: 64 },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegionAssets: {
        type: 'object',
        required: ['maps', 'geocode', 'poi'],
        properties: {
          maps: { $ref: '#/components/schemas/Asset' },
          geocode: { $ref: '#/components/schemas/Asset' },
          poi: { $ref: '#/components/schemas/Asset' },
          routing: { $ref: '#/components/schemas/Asset' },
        },
      },
      Region: {
        type: 'object',
        required: ['id', 'name', 'nameUk', 'assets'],
        properties: {
          id: { type: 'string', pattern: '^[a-z-]+$' },
          name: { type: 'string', minLength: 1 },
          nameUk: { type: 'string', minLength: 1 },
          assets: { $ref: '#/components/schemas/RegionAssets' },
        },
      },
      RegionIndex: {
        type: 'object',
        required: ['version', 'generatedAt', 'regions'],
        properties: {
          version: { type: 'integer', minimum: 1 },
          generatedAt: { type: 'string', format: 'date-time' },
          regions: {
            type: 'array',
            minItems: 25,
            items: { $ref: '#/components/schemas/Region' },
          },
        },
      },
    },
  },
} as const

function cacheHeaders() {
  return {
    'Cache-Control': {
      schema: { type: 'string' as const },
      description: 'Cache control directive',
      example: 's-maxage=3600, stale-while-revalidate=86400',
    },
  }
}

function unauthorizedResponse() {
  return {
    description: 'Missing or invalid API key',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      },
    },
  }
}

function dbUnavailableResponse() {
  return {
    description: 'Database unavailable',
    headers: {
      'Retry-After': {
        schema: { type: 'string' as const },
        description: 'Seconds to wait before retrying',
        example: '60',
      },
    },
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
        example: { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      },
    },
  }
}
