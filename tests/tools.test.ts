import { describe, it, expect } from 'vitest'
import { buildTools } from '../src/zhihu/tools.js'

const config = {
  userAgent: 'test',
  timeoutMs: 15000,
  cache: true,
}

const realBlob = `window.__INITIAL_STATE__ = ({
  "title": "DeepSeek Harness 实战",
  "name": "张三",
  "content": "<p>第一段内容。</p><p>第二段内容。</p>",
  "createdAt": "2026-08-13T08:00:00Z"
});`

const loginWallHtml = `<html><body><div class="Login">请登录</div></body></html>`

const searchHtml = `<html><body>
  <script>window.__INITIAL_STATE__ = ({});</script>
  <a href="/question/100">Q1</a>
  <a href="https://www.zhihu.com/answer/200">A1</a>
  <a href="/p/300">P1</a>
  <a href="/login">login</a>
</body></html>`

function makeFetch(map: Record<string, string>) {
  return async (url: string) => map[url] ?? realBlob
}

const exec = { signal: new AbortController().signal }

describe('buildTools — registration', () => {
  it('builds three well-formed tool definitions', () => {
    const tools = buildTools(config, makeFetch({}))
    expect(tools).toHaveLength(3)
    const names = tools.map((t) => t.name)
    expect(names).toContain('zhihu_fetch_column')
    expect(names).toContain('zhihu_fetch_answer')
    expect(names).toContain('zhihu_search')
    for (const t of tools) {
      expect(typeof t.execute).toBe('function')
      expect(t.output).toBeTruthy()
      expect(Array.isArray(t.output.render({}, ''))).toBe(true)
    }
  })
})

describe('zhihu_fetch_column', () => {
  it('parses a column page into markdown with author + createdAt', async () => {
    const [tool] = buildTools(config, makeFetch({ 'https://zhuanlan.zhihu.com/p/999': realBlob }))
    const value = await tool.execute({ url: 'https://zhuanlan.zhihu.com/p/999' }, exec)
    expect(value).toContain('# DeepSeek Harness 实战')
    expect(value).toContain('作者: 张三')
    expect(value).toContain('发布于: 2026-08-13T08:00:00Z')
    expect(value).toContain('第一段内容。')
    const rendered = tool.output.render({}, value)
    expect(rendered[0]).toEqual({ type: 'text', text: value })
  })

  it('builds the URL from an id', async () => {
    const [tool] = buildTools(config, makeFetch({ 'https://zhuanlan.zhihu.com/p/999': realBlob }))
    const value = await tool.execute({ id: '999' }, exec)
    expect(value).toContain('# DeepSeek Harness 实战')
  })

  it('reports a login wall honestly', async () => {
    const [tool] = buildTools(config, makeFetch({ 'https://zhuanlan.zhihu.com/p/1': loginWallHtml }))
    const value = await tool.execute({ url: 'https://zhuanlan.zhihu.com/p/1' }, exec)
    expect(value).toContain('login wall')
  })

  it('returns a graceful error when neither url nor id is given', async () => {
    const [tool] = buildTools(config, makeFetch({}))
    const value = await tool.execute({}, exec)
    expect(value).toContain('Error: provide url or id.')
  })
})

describe('zhihu_fetch_answer', () => {
  it('parses an answer page', async () => {
    const tools = buildTools(config, makeFetch({ 'https://www.zhihu.com/question/1/answer/2': realBlob }))
    const tool = tools.find((t) => t.name === 'zhihu_fetch_answer')!
    const value = await tool.execute({ url: 'https://www.zhihu.com/question/1/answer/2' }, exec)
    expect(value).toContain('# DeepSeek Harness 实战')
    expect(value).toContain('作者: 张三')
    expect(value).toContain('发布于: 2026-08-13T08:00:00Z')
  })

  it('reports a login wall honestly', async () => {
    const tools = buildTools(config, makeFetch({ 'https://www.zhihu.com/question/1/answer/2': loginWallHtml }))
    const tool = tools.find((t) => t.name === 'zhihu_fetch_answer')!
    const value = await tool.execute({ url: 'https://www.zhihu.com/question/1/answer/2' }, exec)
    expect(value).toContain('login wall')
  })
})

describe('zhihu_search', () => {
  it('captures both relative and absolute result links, skipping non-content', async () => {
    const tools = buildTools(config, makeFetch({ 'https://www.zhihu.com/search?type=content&q=deepseek': searchHtml }))
    const tool = tools.find((t) => t.name === 'zhihu_search')!
    const value = await tool.execute({ query: 'deepseek', limit: 10 }, exec)
    expect(value).toContain('https://www.zhihu.com/question/100')
    expect(value).toContain('https://www.zhihu.com/answer/200')
    expect(value).toContain('https://www.zhihu.com/p/300')
    expect(value).not.toContain('/login')
  })

  it('reports when nothing was parsed', async () => {
    const tools = buildTools(config, makeFetch({ 'https://www.zhihu.com/search?type=content&q=x': loginWallHtml }))
    const tool = tools.find((t) => t.name === 'zhihu_search')!
    const value = await tool.execute({ query: 'x' }, exec)
    expect(value).toContain('login wall')
  })
})
