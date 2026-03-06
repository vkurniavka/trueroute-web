import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { D1Database, D1PreparedStatement, D1Result } from '@/types/d1'
import { getDb, D1Error } from '@/lib/db'

function mockResult<T>(results: T[]): D1Result<T> {
  return {
    results,
    success: true,
    meta: {
      duration: 0.5,
      changes_in: 0,
      changes_out: 0,
      last_row_id: 0,
      changed_db: false,
      size_after: 0,
      rows_read: results.length,
      rows_written: 0,
    },
  }
}

function createMockBinding() {
  const firstMock = vi.fn()
  const allMock = vi.fn()
  const runMock = vi.fn()
  const bindMock = vi.fn()

  const stmt: D1PreparedStatement = {
    bind: bindMock,
    first: firstMock,
    all: allMock,
    run: runMock,
    raw: vi.fn(),
  }

  // bind returns the same statement for chaining
  bindMock.mockReturnValue(stmt)

  const prepareMock = vi.fn().mockReturnValue(stmt)
  const batchMock = vi.fn()

  const db: D1Database = {
    prepare: prepareMock,
    batch: batchMock,
    exec: vi.fn(),
    dump: vi.fn(),
  }

  return { db, prepareMock, bindMock, firstMock, allMock, runMock, batchMock }
}

describe('db client', () => {
  let mocks: ReturnType<typeof createMockBinding>

  beforeEach(() => {
    mocks = createMockBinding()
  })

  describe('queryAll', () => {
    it('returns array of results', async () => {
      const rows = [
        { id: 1, code: 'UA', name: 'Ukraine' },
        { id: 2, code: 'PL', name: 'Poland' },
      ]
      mocks.allMock.mockResolvedValueOnce(mockResult(rows))

      const client = getDb(mocks.db)
      const result = await client.queryAll('SELECT * FROM countries')

      expect(result).toEqual(rows)
      expect(mocks.prepareMock).toHaveBeenCalledWith('SELECT * FROM countries')
    })

    it('passes bind parameters', async () => {
      mocks.allMock.mockResolvedValueOnce(mockResult([{ id: 1 }]))

      const client = getDb(mocks.db)
      await client.queryAll('SELECT * FROM countries WHERE code = ?', ['UA'])

      expect(mocks.bindMock).toHaveBeenCalledWith('UA')
    })

    it('returns empty array when no rows', async () => {
      mocks.allMock.mockResolvedValueOnce(mockResult([]))

      const client = getDb(mocks.db)
      const result = await client.queryAll('SELECT * FROM countries WHERE code = ?', ['XX'])

      expect(result).toEqual([])
    })

    it('throws D1Error with DB_UNAVAILABLE on failure', async () => {
      mocks.allMock.mockRejectedValueOnce(new Error('connection lost'))

      const client = getDb(mocks.db)

      await expect(
        client.queryAll('SELECT * FROM countries'),
      ).rejects.toThrow(D1Error)

      mocks.allMock.mockRejectedValueOnce(new Error('connection lost'))
      await expect(
        client.queryAll('SELECT * FROM countries'),
      ).rejects.toMatchObject({
        code: 'DB_UNAVAILABLE',
        message: 'Data service unavailable',
      })
    })
  })

  describe('queryFirst', () => {
    it('returns single row', async () => {
      const row = { id: 1, code: 'UA', name: 'Ukraine' }
      mocks.firstMock.mockResolvedValueOnce(row)

      const client = getDb(mocks.db)
      const result = await client.queryFirst('SELECT * FROM countries WHERE code = ?', ['UA'])

      expect(result).toEqual(row)
    })

    it('returns null when no match', async () => {
      mocks.firstMock.mockResolvedValueOnce(null)

      const client = getDb(mocks.db)
      const result = await client.queryFirst('SELECT * FROM countries WHERE code = ?', ['XX'])

      expect(result).toBeNull()
    })

    it('throws D1Error with DB_UNAVAILABLE on failure', async () => {
      mocks.firstMock.mockRejectedValueOnce(new Error('timeout'))

      const client = getDb(mocks.db)

      await expect(
        client.queryFirst('SELECT * FROM countries WHERE code = ?', ['UA']),
      ).rejects.toThrow(D1Error)

      mocks.firstMock.mockRejectedValueOnce(new Error('timeout'))
      await expect(
        client.queryFirst('SELECT * FROM countries WHERE code = ?', ['UA']),
      ).rejects.toMatchObject({
        code: 'DB_UNAVAILABLE',
      })
    })
  })

  describe('execute', () => {
    it('returns D1Result on success', async () => {
      const result = mockResult([])
      mocks.runMock.mockResolvedValueOnce(result)

      const client = getDb(mocks.db)
      const res = await client.execute(
        'INSERT INTO countries (code, name, name_uk, enabled) VALUES (?, ?, ?, ?)',
        ['UA', 'Ukraine', 'Україна', 1],
      )

      expect(res).toEqual(result)
      expect(mocks.bindMock).toHaveBeenCalledWith('UA', 'Ukraine', 'Україна', 1)
    })

    it('throws D1Error with DB_UNAVAILABLE on failure', async () => {
      mocks.runMock.mockRejectedValueOnce(new Error('disk full'))

      const client = getDb(mocks.db)

      await expect(
        client.execute('INSERT INTO countries (code) VALUES (?)', ['UA']),
      ).rejects.toThrow(D1Error)

      mocks.runMock.mockRejectedValueOnce(new Error('disk full'))
      await expect(
        client.execute('INSERT INTO countries (code) VALUES (?)', ['UA']),
      ).rejects.toMatchObject({
        code: 'DB_UNAVAILABLE',
      })
    })
  })

  describe('batch', () => {
    it('returns array of D1Result on success', async () => {
      const results = [mockResult([]), mockResult([])]
      mocks.batchMock.mockResolvedValueOnce(results)

      const client = getDb(mocks.db)
      const stmts = [
        client.binding.prepare('INSERT INTO countries (code) VALUES (?)').bind('UA'),
        client.binding.prepare('INSERT INTO countries (code) VALUES (?)').bind('PL'),
      ]
      const res = await client.batch(stmts)

      expect(res).toEqual(results)
    })

    it('throws D1Error with DB_UNAVAILABLE on failure', async () => {
      mocks.batchMock.mockRejectedValueOnce(new Error('batch failed'))

      const client = getDb(mocks.db)

      await expect(client.batch([])).rejects.toThrow(D1Error)

      mocks.batchMock.mockRejectedValueOnce(new Error('batch failed'))
      await expect(client.batch([])).rejects.toMatchObject({
        code: 'DB_UNAVAILABLE',
      })
    })
  })

  describe('binding', () => {
    it('returns the underlying D1Database', () => {
      const client = getDb(mocks.db)
      expect(client.binding).toBe(mocks.db)
    })
  })
})
