import { NextResponse } from 'next/server'

/**
 * CORS headers applied to all API responses.
 * TODO: In production, restrict Access-Control-Allow-Origin via env var ALLOWED_ORIGIN
 * instead of using wildcard '*'.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
} as const

/** Sets CORS headers on an existing NextResponse and returns it. */
export function withCors<T>(response: NextResponse<T>): NextResponse<T> {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}
