// Best-effort Zhihu parsing. Zhihu embeds page state in a JS object literal
// `window.__INITIAL_STATE__ = ({...});` (not strict JSON). We extract that blob
// and pull fields out with tolerant regexes, then strip HTML to plain text.
// This is intentionally defensive: Zhihu changes markup often and may serve a
// login wall, in which case content comes back empty and the tool reports it.

export function extractInitialState(html: string): string | null {
  const marker = 'window.__INITIAL_STATE__'
  const start = html.indexOf(marker)
  if (start === -1) return null
  const eq = html.indexOf('=', start)
  const open = html.indexOf('{', eq)
  if (open === -1) return null

  let depth = 0
  for (let i = open; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return html.slice(open, i + 1)
    }
  }
  return null
}

// Pull a field value (string literal) out of the raw JS object text. Handles
// both double- and single-quoted keys/values and unescapes the common ones.
function pickField(blob: string, key: string): string | null {
  const re = new RegExp(
    `(?:['"]?${key}['"]?)\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`,
    'm'
  )
  const m = blob.match(re)
  if (!m) return null
  return m[1]
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

export interface ParsedArticle {
  title?: string
  author?: string
  content?: string
  createdAt?: string
}

export function parseArticle(html: string): ParsedArticle {
  const blob = extractInitialState(html) ?? html
  const title = pickField(blob, 'title')
  const author = pickField(blob, 'name')
  const content = pickField(blob, 'content')
  const createdAt = pickField(blob, 'createdAt')
  return {
    title: title ? htmlToText(title) : undefined,
    author: author ? htmlToText(author) : undefined,
    content: content ? htmlToText(content) : undefined,
    createdAt: createdAt ?? undefined,
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
