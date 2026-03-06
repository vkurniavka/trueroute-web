import type { D1Database, D1Result, D1PreparedStatement } from '@/types/d1'
import { logger } from '@/lib/logger'

export class D1Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'D1Error'
  }
}

/**
 * Create a typed D1 client from a Cloudflare Workers D1 binding.
 * All Route Handlers must use this instead of accessing env.TRUEROUTE_DB directly.
 */
export function getDb(binding: D1Database): DbClient {
  return new DbClient(binding)
}

class DbClient {
  constructor(private readonly db: D1Database) {}

  /** Run a SELECT and return all matching rows. */
  async queryAll<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql).bind(...params)
      const result = await stmt.all<T>()
      return result.results
    } catch (error: unknown) {
      logger.error('D1 query failed', { sql, error })
      throw new D1Error('Data service unavailable', 'DB_UNAVAILABLE')
    }
  }

  /** Run a SELECT and return the first matching row, or null. */
  async queryFirst<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql).bind(...params)
      return await stmt.first<T>()
    } catch (error: unknown) {
      logger.error('D1 query failed', { sql, error })
      throw new D1Error('Data service unavailable', 'DB_UNAVAILABLE')
    }
  }

  /** Run an INSERT, UPDATE, or DELETE statement. */
  async execute(sql: string, params: unknown[] = []): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(sql).bind(...params)
      return await stmt.run()
    } catch (error: unknown) {
      logger.error('D1 execute failed', { sql, error })
      throw new D1Error('Data service unavailable', 'DB_UNAVAILABLE')
    }
  }

  /** Run multiple statements in a batch (single round-trip). */
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    try {
      return await this.db.batch(statements)
    } catch (error: unknown) {
      logger.error('D1 batch failed', { error })
      throw new D1Error('Data service unavailable', 'DB_UNAVAILABLE')
    }
  }

  /** Expose underlying D1 binding for prepare() in batch scenarios. */
  get binding(): D1Database {
    return this.db
  }
}

export type { DbClient }
