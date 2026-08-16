import Schema from '@deepseek-ai/schemastery'

export interface Config {
  userAgent: string
  timeoutMs: number
  cache: boolean
}

export const Config: Schema<Config> = Schema.object({
  userAgent: Schema.string().default(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
  ),
  timeoutMs: Schema.number().default(15000),
  cache: Schema.boolean().default(true),
})
