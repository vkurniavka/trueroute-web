import { z } from 'zod'

export const RegionV2Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameUk: z.string().min(1),
})

export const RegionListSchema = z.object({
  version: z.literal(1),
  countryCode: z.string().length(2),
  regions: z.array(RegionV2Schema),
})

export type RegionV2 = z.infer<typeof RegionV2Schema>
export type RegionList = z.infer<typeof RegionListSchema>
