export const env = {
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? '',
  r2EndpointUrl: process.env.R2_ENDPOINT_URL ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME ?? '',
} as const
