import { defineTool } from '@deepseek-ai/dsh-tools'
import { fetchZhihu } from './client.js'
import { parseArticle, htmlToText, isLoginWall } from './parse.js'
import type { Config } from '../config.js'

// A fetch implementation. The default is the Node fetch with browser-like
// headers; for production behind a logged-in browser, pass a browser-backed
// implementation (see client.ts note on the dsh web half).
type FetchImpl = (
  url: string,
  config: Config,
  signal?: AbortSignal
) => Promise<string>

const ANTI_BOT_HINT =
  'Zhihu blocks datacenter IPs and requires login for many pages — run this behind a logged-in browser (dsh web half) instead of Node fetch.'

// Return a string either way: a successful markdown body, or a graceful error
// message. We never throw into the agent — report and let it decide.
async function safe(label: string, fn: () => Promise<string>): Promise<string> {
  try {
    return await fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `Error (${label}): ${msg}\n(${ANTI_BOT_HINT})`
  }
}

function formatArticle(
  data: ReturnType<typeof parseArticle>,
  fallbackTitle: string
): string {
  const lines: string[] = [`# ${data.title ?? fallbackTitle}`]
  if (data.author) lines.push(`作者: ${data.author}`)
  if (data.createdAt) lines.push(`发布于: ${data.createdAt}`)
  lines.push('', data.content ?? '')
  return lines.join('\n')
}

export function buildTools(config: Config, fetchImpl: FetchImpl = fetchZhihu) {
  return [
    defineTool({
      name: 'zhihu_fetch_column',
      description:
        'Fetch and parse a Zhihu column article by URL or ID (zhuanlan.zhihu.com/p/<id>). Returns the clean title, author, publish time and article body as text.',
      parameters: {
        url: {
          type: 'string',
          description:
            'Full column URL, e.g. https://zhuanlan.zhihu.com/p/2071956716355425552',
        },
        id: {
          type: 'string',
          description: 'Column ID only, without the URL',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        return safe('zhihu_fetch_column', async () => {
          const url =
            args.url ?? (args.id ? `https://zhuanlan.zhihu.com/p/${args.id}` : '')
          if (!url) return 'Error: provide url or id.'
          const html = await fetchImpl(url, config, exec.signal)
          if (isLoginWall(html)) {
            return `Fetched ${url} but the page has no article data — likely a Zhihu login wall / anti-bot interstitial. Open it in a logged-in browser. (${ANTI_BOT_HINT})`
          }
          const data = parseArticle(html)
          if (!data.content) {
            return `Fetched ${url} but could not parse article content. (${ANTI_BOT_HINT})`
          }
          return formatArticle(data, '(untitled)')
        })
      },
    }),

    defineTool({
      name: 'zhihu_fetch_answer',
      description:
        'Fetch and parse a Zhihu answer or question page by URL. Returns the clean answer body as text.',
      parameters: {
        url: {
          type: 'string',
          required: true,
          description: 'Zhihu answer/question URL',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        return safe('zhihu_fetch_answer', async () => {
          const html = await fetchImpl(args.url, config, exec.signal)
          if (isLoginWall(html)) {
            return `Fetched ${args.url} but the page has no answer data — likely a Zhihu login wall / anti-bot interstitial. Open it in a logged-in browser. (${ANTI_BOT_HINT})`
          }
          const data = parseArticle(html)
          if (!data.content) {
            return `Fetched ${args.url} but could not parse answer content. (${ANTI_BOT_HINT})`
          }
          return formatArticle(data, args.url)
        })
      },
    }),

    defineTool({
      name: 'zhihu_search',
      description:
        'Search Zhihu for a query and return a list of result URLs. Useful for discovery before fetching a specific page.',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description: 'Search keywords',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 10)',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        return safe('zhihu_search', async () => {
          const q = encodeURIComponent(args.query)
          const url = `https://www.zhihu.com/search?type=content&q=${q}`
          const html = await fetchImpl(url, config, exec.signal)
          if (isLoginWall(html)) {
            return `Fetched the search page but it has no results data — likely a Zhihu login wall. Open search in a logged-in browser. (${ANTI_BOT_HINT})`
          }
          // Absolute and relative Zhihu result links (question / answer / column / p / topic).
          const abs = [
            ...html.matchAll(
              /href="(https?:\/\/(?:www\.)?zhihu\.com\/(?:question|answer|p|topic|column|people)\/\d+[^"]*)"/gi
            ),
          ].map((m) => m[1])
          const rel = [
            ...html.matchAll(
              /href="(\/(?:question|answer|p|topic|column|people)\/\d+[^"]*)"/gi
            ),
          ].map((m) => `https://www.zhihu.com${m[1]}`)
          const uniq = [...new Set([...abs, ...rel])].slice(0, args.limit ?? 10)
          if (!uniq.length) {
            return `No results parsed for "${args.query}". (${ANTI_BOT_HINT})`
          }
          return uniq.map((l, i) => `${i + 1}. ${l}`).join('\n')
        })
      },
    }),
  ]
}
