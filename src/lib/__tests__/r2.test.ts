import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendMock } = vi.hoisted(() => {
  return { sendMock: vi.fn() }
})

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class MockS3Client {
      send = sendMock
    },
    GetObjectCommand: class MockGetObjectCommand {
      constructor(public input: unknown) {}
    },
    ListObjectsV2Command: class MockListObjectsV2Command {
      constructor(public input: unknown) {}
    },
    HeadObjectCommand: class MockHeadObjectCommand {
      constructor(public input: unknown) {}
    },
  }
})

import { getR2Object, listR2Objects, getR2Metadata, R2Error } from '@/lib/r2'

function mockBody(content: string) {
  return { transformToString: () => Promise.resolve(content) }
}

describe('r2 client', () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  describe('getR2Object', () => {
    it('returns parsed JSON on success', async () => {
      const data = { version: 1, regions: [] }
      sendMock.mockResolvedValueOnce({
        Body: mockBody(JSON.stringify(data)),
      })

      const result = await getR2Object<typeof data>('index.json')
      expect(result).toEqual(data)
    })

    it('throws R2Error with code R2_NOT_FOUND on NoSuchKey', async () => {
      const error = new Error('NoSuchKey')
      error.name = 'NoSuchKey'
      sendMock.mockRejectedValueOnce(error)

      await expect(getR2Object('missing.json')).rejects.toThrow(R2Error)

      sendMock.mockRejectedValueOnce(error)
      await expect(getR2Object('missing.json')).rejects.toMatchObject({
        code: 'R2_NOT_FOUND',
      })
    })

    it('throws R2Error with code R2_UNAVAILABLE on network error', async () => {
      sendMock.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(getR2Object('index.json')).rejects.toThrow(R2Error)

      sendMock.mockRejectedValueOnce(new Error('Network timeout'))
      await expect(getR2Object('index.json')).rejects.toMatchObject({
        code: 'R2_UNAVAILABLE',
      })
    })

    it('throws R2Error with code R2_PARSE_ERROR on invalid JSON', async () => {
      sendMock.mockResolvedValueOnce({
        Body: mockBody('not valid json {{{'),
      })

      await expect(getR2Object('bad.json')).rejects.toThrow(R2Error)

      sendMock.mockResolvedValueOnce({
        Body: mockBody('not valid json {{{'),
      })
      await expect(getR2Object('bad.json')).rejects.toMatchObject({
        code: 'R2_PARSE_ERROR',
      })
    })
  })

  describe('listR2Objects', () => {
    it('returns array of key strings', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'regions/kyiv/maps/kyiv.pmtiles' },
          { Key: 'regions/kyiv/geocode/kyiv.db' },
        ],
      })

      const result = await listR2Objects('regions/kyiv/')
      expect(result).toEqual([
        'regions/kyiv/maps/kyiv.pmtiles',
        'regions/kyiv/geocode/kyiv.db',
      ])
    })

    it('returns empty array when no contents', async () => {
      sendMock.mockResolvedValueOnce({ Contents: undefined })

      const result = await listR2Objects('empty/')
      expect(result).toEqual([])
    })

    it('throws R2Error with code R2_UNAVAILABLE on error', async () => {
      sendMock.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(listR2Objects('prefix/')).rejects.toThrow(R2Error)

      sendMock.mockRejectedValueOnce(new Error('Connection refused'))
      await expect(listR2Objects('prefix/')).rejects.toMatchObject({
        code: 'R2_UNAVAILABLE',
      })
    })
  })

  describe('getR2Metadata', () => {
    it('returns metadata object', async () => {
      sendMock.mockResolvedValueOnce({
        Metadata: { 'content-type': 'application/json', version: '2' },
      })

      const result = await getR2Metadata('index.json')
      expect(result).toEqual({
        'content-type': 'application/json',
        version: '2',
      })
    })

    it('returns empty object when no metadata', async () => {
      sendMock.mockResolvedValueOnce({ Metadata: undefined })

      const result = await getR2Metadata('index.json')
      expect(result).toEqual({})
    })

    it('throws R2Error with code R2_NOT_FOUND on NoSuchKey', async () => {
      const error = new Error('NoSuchKey')
      error.name = 'NoSuchKey'
      sendMock.mockRejectedValueOnce(error)

      await expect(getR2Metadata('missing.json')).rejects.toThrow(R2Error)

      sendMock.mockRejectedValueOnce(error)
      await expect(getR2Metadata('missing.json')).rejects.toMatchObject({
        code: 'R2_NOT_FOUND',
      })
    })
  })
})
