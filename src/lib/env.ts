import type { D1Database } from '@/types/d1'

export const env = {
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
  r2EndpointUrl: process.env.R2_ENDPOINT_URL ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME ?? '',
} as const

/**
 * Cloudflare Workers runtime bindings (D1, R2 native, etc.).
 * These are injected by the Workers runtime, not available via process.env.
 */
export interface RateLimiter {
  limit: (opts: { key: string }) => Promise<{ success: boolean }>
}

export interface CloudflareEnv {
  TRUEROUTE_DB: D1Database
  RATE_LIMITER: RateLimiter
}
