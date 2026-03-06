import { z } from 'zod'

export const RegionFileSchema = z.object({
  type: z.string().min(1),
  url: z.string().url(),
  sizeBytes: z.number().positive(),
  sha256: z.string().length(64),
  generatedAt: z.string().datetime(),
})

export const RegionFileListSchema = z.object({
  version: z.literal(1),
  countryCode: z.string().length(2),
  regionId: z.string().min(1),
  files: z.array(RegionFileSchema),
})

export type RegionFile = z.infer<typeof RegionFileSchema>
export type RegionFileList = z.infer<typeof RegionFileListSchema>
