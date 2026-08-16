// Best-effort Zhihu parsing. Zhihu embeds page state in a JS blob assigned to
// `window.__INITIAL_STATE__`. Two common shapes in the wild:
//   1. window.__INITIAL_STATE__ = ({...})           // object literal (not strict JSON)
//   2. window.__INITIAL_STATE__ = JSON.parse("...")  // JSON string argument
// We extract that blob and pull fields out with tolerant regexes, then strip
// HTML to plain text. Defensive by design: Zhihu changes markup often and may
// serve a login wall (no __INITIAL_STATE__ at all), in which case content comes
// back empty and the tool reports it honestly.

export interface ParsedArticle {
  title?: string
  author?: string
  content?: string
  createdAt?: string
  /** True when the page had no __INITIAL_STATE__ (likely a login wall / anti-bot). */
  loginWall?: boolean
}

// Find the index of the closing quote of a JSON string literal whose opening
// quote is at `open`. Skips escaped characters so an escaped quote inside the
// string does not terminate the scan early.
function findJsonStringEnd(s: string, open: number): number {
  const q = s[open]
  let j = open + 1
  while (j < s.length) {
    const ch = s[j]
    if (ch === '\\') {
      j += 2
      continue
    }
    if (ch === q) return j
    j++
  }
  return -1
}

// Extract the embedded state blob, or null if none is present.
export function extractInitialState(html: string): string | null {
  const marker = 'window.__INITIAL_STATE__'
  let start = html.indexOf(marker)
  if (start === -1) {
    start = html.indexOf('__INITIAL_STATE__')
    if (start === -1) return null
  } else {
    start += marker.length
  }

  const eq = html.indexOf('=', start)
  if (eq === -1) return null

  let i = eq + 1
  while (i < html.length && /\s/.test(html[i])) i++

  // JSON.parse("...") / JSON.parse('...') form: pull the string argument,
  // unescape it, and re-serialize to a clean object blob.
  if (html.startsWith('JSON.parse(', i)) {
    const open = i + 'JSON.parse('.length
    const q = html[open]
    if (q === '"' || q === "'") {
      const end = findJsonStringEnd(html, open)
      if (end !== -1) {
        try {
          const raw = html
            .slice(open + 1, end)
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')
          return JSON.stringify(JSON.parse(raw))
        } catch {
          // fall through to bracket scan
        }
      }
    }
  }

  // A leading '(' wraps an object/array literal: window.__INITIAL_STATE__ = ({...})
  if (html[i] === '(') {
    i++
    while (i < html.length && /\s/.test(html[i])) i++
  }

  const c = html[i]
  if (c !== '{' && c !== '[') return null
  const close = c === '[' ? ']' : '}'
  let depth = 0
  for (let j = i; j < html.length; j++) {
    if (html[j] === c) depth++
    else if (html[j] === close) {
      depth--
      if (depth === 0) return html.slice(i, j + 1)
    }
  }
  return null
}

// True when the page carries no __INITIAL_STATE__ at all — the usual signature
// of a Zhihu login wall / anti-bot interstitial rather than real content.
export function isLoginWall(html: string): boolean {
  return (
    html.indexOf('window.__INITIAL_STATE__') === -1 &&
    html.indexOf('__INITIAL_STATE__') === -1
  )
}

function escapeKey(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Pull a field's quoted string value (double or single) out of the raw blob.
// The key is matched as a standalone property name (not a substring like
// `mytitle` or `subTitle`), and escaped quotes inside the value are restored.
function pickField(blob: string, key: string): string | null {
  const re = new RegExp(
    `(?<![\\w])['"]?${escapeKey(key)}['"]?\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`,
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

export function parseArticle(html: string): ParsedArticle {
  const blob = extractInitialState(html)
  if (!blob) return { loginWall: true }

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
