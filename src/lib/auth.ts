import { NextResponse } from 'next/server'
import type { DbClient } from '@/lib/db'
import { D1Error } from '@/lib/db'
import type { ApiError } from '@/types/errors'
import type { CloudflareEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

interface ApiKeyRow {
  id: number
}

const UNAUTHORIZED_RESPONSE: ApiError = {
  error: 'Unauthorized',
  code: 'UNAUTHORIZED',
}

/**
 * Hash a raw API key using SHA-256 (edge-compatible via SubtleCrypto).
 * Returns lowercase hex string.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Validate the X-Api-Key header against the api_keys table.
 *
 * Returns null if the request is authenticated, or a NextResponse with
 * the appropriate error status if authentication fails.
 *
 * Must be called inline in each Route Handler (not via middleware,
 * which is unsupported on Cloudflare Workers).
 */
export async function validateApiKey(
  request: Request,
  db: DbClient,
  env?: Pick<CloudflareEnv, 'RATE_LIMITER'>,
): Promise<NextResponse<ApiError> | null> {
  const apiKey = request.headers.get('X-Api-Key')

  if (!apiKey) {
    return NextResponse.json<ApiError>(UNAUTHORIZED_RESPONSE, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const keyHash = await hashApiKey(apiKey)

  let row: ApiKeyRow | null
  try {
    row = await db.queryFirst<ApiKeyRow>(
      'SELECT id FROM api_keys WHERE key_hash = ? AND is_active = ?',
      [keyHash, 1],
    )
  } catch (error: unknown) {
    if (!(error instanceof D1Error)) {
      logger.error('Unexpected error validating API key', { error })
    }
    return NextResponse.json<ApiError>(
      { error: 'Data service unavailable', code: 'DB_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      },
    )
  }

  if (!row) {
    return NextResponse.json<ApiError>(UNAUTHORIZED_RESPONSE, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (env?.RATE_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    if (!success) {
      return NextResponse.json<ApiError>(
        { error: 'Too Many Requests', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
      )
    }
  }

  return null
}
