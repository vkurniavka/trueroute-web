import { z } from 'zod'

export const CountrySchema = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
  nameUk: z.string().min(1),
})

export const CountryListSchema = z.object({
  version: z.literal(1),
  countries: z.array(CountrySchema),
})

export type Country = z.infer<typeof CountrySchema>
export type CountryList = z.infer<typeof CountryListSchema>
