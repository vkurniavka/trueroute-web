import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { logger } from '@/lib/logger'

export class R2Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'R2Error'
  }
}

let _client: S3Client | undefined

function getClient(): S3Client {
  if (_client) return _client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME

  if (!accountId) {
    throw new Error('R2 configuration missing: R2_ACCOUNT_ID not set')
  }
  if (!accessKeyId) {
    throw new Error('R2 configuration missing: R2_ACCESS_KEY_ID not set')
  }
  if (!secretAccessKey) {
    throw new Error('R2 configuration missing: R2_SECRET_ACCESS_KEY not set')
  }
  if (!bucketName) {
    throw new Error('R2 configuration missing: R2_BUCKET_NAME not set')
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return _client
}

function getBucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error('R2 configuration missing: R2_BUCKET_NAME not set')
  }
  return bucketName
}

export async function getR2Object<T>(key: string): Promise<T> {
  let body: string
  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
    )
    body = (await response.Body?.transformToString()) ?? ''
  } catch (error: unknown) {
    if (isNoSuchKeyError(error)) {
      throw new R2Error(`Object not found: ${key}`, 'R2_NOT_FOUND')
    }
    logger.error('R2 fetch failed', { key, error })
    throw new R2Error(`Failed to fetch object: ${key}`, 'R2_UNAVAILABLE')
  }

  try {
    return JSON.parse(body) as T
  } catch {
    throw new R2Error(
      `Failed to parse JSON for object: ${key}`,
      'R2_PARSE_ERROR',
    )
  }
}

export async function listR2Objects(prefix: string): Promise<string[]> {
  try {
    const response = await getClient().send(
      new ListObjectsV2Command({ Bucket: getBucketName(), Prefix: prefix }),
    )
    return (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => key !== undefined)
  } catch (error: unknown) {
    logger.error('R2 list failed', { prefix, error })
    throw new R2Error(
      `Failed to list objects with prefix: ${prefix}`,
      'R2_UNAVAILABLE',
    )
  }
}

export async function getR2Metadata(
  key: string,
): Promise<Record<string, string>> {
  try {
    const response = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucketName(), Key: key }),
    )
    return response.Metadata ?? {}
  } catch (error: unknown) {
    if (isNoSuchKeyError(error)) {
      throw new R2Error(`Object not found: ${key}`, 'R2_NOT_FOUND')
    }
    logger.error('R2 metadata fetch failed', { key, error })
    throw new R2Error(
      `Failed to fetch metadata for object: ${key}`,
      'R2_UNAVAILABLE',
    )
  }
}

function isNoSuchKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('name' in error && (error as { name: string }).name === 'NoSuchKey') {
    return true
  }
  if ('Code' in error && (error as { Code: string }).Code === 'NoSuchKey') {
    return true
  }
  return false
}
