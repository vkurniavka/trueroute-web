/**
 * Minimal Cloudflare D1 type definitions.
 * Matches the Workers runtime D1 API without requiring @cloudflare/workers-types.
 */

export interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: boolean
  meta: {
    duration: number
    changes_in: number
    changes_out: number
    last_row_id: number
    changed_db: boolean
    size_after: number
    rows_read: number
    rows_written: number
  }
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
  raw<T = unknown[]>(): Promise<T[]>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1Result>
  dump(): Promise<ArrayBuffer>
}
