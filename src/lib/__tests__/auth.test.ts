import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateApiKey, hashApiKey } from '@/lib/auth'
import type { DbClient } from '@/lib/db'

function makeRequest(apiKey?: string): Request {
  const headers = new Headers()
  if (apiKey) {
    headers.set('X-Api-Key', apiKey)
  }
  return new Request('https://example.com/api/test', { headers })
}

function makeMockDb(overrides: Partial<DbClient> = {}): DbClient {
  return {
    queryAll: vi.fn(),
    queryFirst: vi.fn().mockResolvedValue(null),
    execute: vi.fn(),
    batch: vi.fn(),
    binding: {} as DbClient['binding'],
    ...overrides,
  } as unknown as DbClient
}

describe('hashApiKey', () => {
  it('produces correct SHA-256 hex for a known input', async () => {
    const hash = await hashApiKey('test-key-123')
    expect(hash).toBe(
      '625faa3fbbc3d2bd9d6ee7678d04cc5339cb33dc68d9b58451853d60046e226a',
    )
  })

  it('returns a 64-character lowercase hex string', async () => {
    const hash = await hashApiKey('any-key')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when X-Api-Key header is missing', async () => {
    const db = makeMockDb()
    const result = await validateApiKey(makeRequest(), db)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    const body = await result!.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('returns 401 when key hash not found in DB', async () => {
    const db = makeMockDb({
      queryFirst: vi.fn().mockResolvedValue(null),
    })
    const result = await validateApiKey(makeRequest('invalid-key'), db)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    const body = await result!.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('returns null (pass-through) when key is valid and active', async () => {
    const db = makeMockDb({
      queryFirst: vi.fn().mockResolvedValue({ id: 1 }),
    })
    const result = await validateApiKey(makeRequest('valid-key'), db)

    expect(result).toBeNull()
  })

  it('queries api_keys with hashed key and is_active=1', async () => {
    const queryFirst = vi.fn().mockResolvedValue({ id: 1 })
    const db = makeMockDb({ queryFirst })

    await validateApiKey(makeRequest('test-key-123'), db)

    expect(queryFirst).toHaveBeenCalledWith(
      expect.stringContaining('api_keys'),
      [
        '625faa3fbbc3d2bd9d6ee7678d04cc5339cb33dc68d9b58451853d60046e226a',
        1,
      ],
    )
  })

  it('returns 503 when DB query throws', async () => {
    const db = makeMockDb({
      queryFirst: vi.fn().mockRejectedValue(new Error('DB down')),
    })
    const result = await validateApiKey(makeRequest('some-key'), db)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(503)
    const body = await result!.json()
    expect(body).toEqual({
      error: 'Data service unavailable',
      code: 'DB_UNAVAILABLE',
    })
  })
})
