import { fetchZhihu } from './client.js'
import { parseArticle, htmlToText } from './parse.js'
import type { ZhihuConfig } from '../config.js'

// Tool definition shape passed to ctx.tools.register. Align field names
// (schema vs inputSchema, execute vs handler, return shape) to your installed
// @deepseek-ai/dsh-tools version; the behavior below is framework-agnostic.
export interface ToolDef {
  name: string
  description: string
  schema: Record<string, unknown>
  execute: (args: any) => Promise<string>
}

type FetchImpl = (url: string, config: ZhihuConfig) => Promise<string>

const ANTI_BOT_HINT =
  'Zhihu blocks datacenter IPs and requires login for many pages — run this behind a logged-in browser (dsh web half) instead of Node fetch.'

async function safe(label: string, fn: () => Promise<string>): Promise<string> {
  try {
    return await fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `Error (${label}): ${msg}\n(${ANTI_BOT_HINT})`
  }
}

export function buildTools(config: ZhihuConfig, fetchImpl: FetchImpl = fetchZhihu): ToolDef[] {
  return [
    {
      name: 'zhihu_fetch_column',
      description:
        'Fetch and parse a Zhihu column article by URL or ID (zhuanlan.zhihu.com/p/<id>). Returns the clean title, author and article body as text.',
      schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Full column URL, e.g. https://zhuanlan.zhihu.com/p/2071956716355425552',
          },
          id: { type: 'string', description: 'Column ID only, without the URL' },
        },
        required: ['url'],
      },
      execute: (args: { url?: string; id?: string }) =>
        safe('zhihu_fetch_column', async () => {
          const url =
            args.url ?? (args.id ? `https://zhuanlan.zhihu.com/p/${args.id}` : '')
          if (!url) return 'Error: provide url or id.'
          const html = await fetchImpl(url, config)
          const data = parseArticle(html)
          if (!data.content) {
            return `Fetched ${url} but could not parse article content. (${ANTI_BOT_HINT})`
          }
          return [
            `# ${data.title ?? '(untitled)'}`,
            data.author ? `作者: ${data.author}` : '',
            '',
            data.content,
          ]
            .filter(Boolean)
            .join('\n')
        }),
    },
    {
      name: 'zhihu_fetch_answer',
      description:
        'Fetch and parse a Zhihu answer or question page by URL. Returns the clean answer body as text.',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Zhihu answer/question URL' },
        },
        required: ['url'],
      },
      execute: (args: { url: string }) =>
        safe('zhihu_fetch_answer', async () => {
          const html = await fetchImpl(args.url, config)
          const data = parseArticle(html)
          const text = data.content ? htmlToText(data.content) : ''
          if (!text) {
            return `Fetched ${args.url} but could not parse answer content. (${ANTI_BOT_HINT})`
          }
          return [
            `# ${data.title ?? args.url}`,
            data.author ? `作者: ${data.author}` : '',
            '',
            text,
          ]
            .filter(Boolean)
            .join('\n')
        }),
    },
    {
      name: 'zhihu_search',
      description:
        'Search Zhihu for a query and return a list of result URLs. Useful for discovery before fetching a specific page.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: ['query'],
      },
      execute: (args: { query: string; limit?: number }) =>
        safe('zhihu_search', async () => {
          const q = encodeURIComponent(args.query)
          const url = `https://www.zhihu.com/search?type=content&q=${q}`
          const html = await fetchImpl(url, config)
          const links = [
            ...html.matchAll(/href="(https:\/\/www\.zhihu\.com\/[a-z]+\/\d+[^"]*)"/g),
          ].map((m) => m[1])
          const uniq = [...new Set(links)].slice(0, args.limit ?? 10)
          if (!uniq.length) {
            return `No results parsed for "${args.query}". (${ANTI_BOT_HINT})`
          }
          return uniq.map((l, i) => `${i + 1}. ${l}`).join('\n')
        }),
    },
  ]
}
