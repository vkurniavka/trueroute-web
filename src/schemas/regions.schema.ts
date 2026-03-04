import { z } from 'zod'

export const AssetSchema = z.object({
  url: z.string().url(),
  sizeBytes: z.number().positive(),
  sha256: z.string().length(64),
  generatedAt: z.string().datetime(),
})

export const RegionSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.string().min(1),
  nameUk: z.string().min(1),
  assets: z.object({
    maps: AssetSchema,
    geocode: AssetSchema,
    poi: AssetSchema,
    routing: AssetSchema.optional(),
  }),
})

export const RegionIndexSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  regions: z.array(RegionSchema).min(25),
})

export type Asset = z.infer<typeof AssetSchema>
export type Region = z.infer<typeof RegionSchema>
export type RegionIndex = z.infer<typeof RegionIndexSchema>
