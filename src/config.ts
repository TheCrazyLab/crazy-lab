import { z } from 'zod'

export const Config = z.object({
  userAgent: z
    .string()
    .default(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    ),
  timeoutMs: z.number().int().positive().default(15000),
  cache: z.boolean().default(true),
})

export type ZhihuConfig = z.infer<typeof Config>
