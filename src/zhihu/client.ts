import type { Config } from '../config.js'

const ZHIHU_REFERER = 'https://www.zhihu.com/'

// Fetch a Zhihu URL with browser-like headers. Zhihu serves different markup
// (and sometimes a login wall) depending on UA / Referer, so we pin both.
//
// NOTE (anti-bot): from a datacenter / logged-out context Zhihu returns 403.
// The production fix is to route the fetch through the user's *logged-in
// browser* via dsh's web half (the `dsh-web-app` package), the same pattern
// modlens uses with `ctx.inject`. For that, pass a browser-backed fetchImpl
// into buildTools() instead of this Node fetch. This function stays as the
// offline / accessible-page default.
export async function fetchZhihu(
  url: string,
  config: Config,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  let onAbort: (() => void) | undefined
  if (signal) {
    if (signal.aborted) controller.abort()
    else {
      onAbort = () => controller.abort()
      signal.addEventListener('abort', onAbort, { once: true })
    }
  }
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        Referer: ZHIHU_REFERER,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
    if (onAbort && signal) signal.removeEventListener('abort', onAbort)
  }
}
