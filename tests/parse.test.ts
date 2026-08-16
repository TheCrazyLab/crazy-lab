import { describe, it, expect } from 'vitest'
import {
  extractInitialState,
  isLoginWall,
  parseArticle,
  htmlToText,
} from '../src/zhihu/parse.js'

const doubleQuoteBlob = `window.__INITIAL_STATE__ = ({
  "title": "Hello <b>World</b>",
  "name": "Alice",
  "content": "<p>First line.</p><p>Second line.</p>",
  "createdAt": "2024-01-01T12:00:00Z"
});`

const singleQuoteBlob = `window.__INITIAL_STATE__ = ({
  'title': 'A "quoted" title',
  'name': 'Bob',
  'content': '<p>Line one.</p>',
  'createdAt': '2024-02-02'
});`

const escapedBlob = `window.__INITIAL_STATE__ = ({
  "title": "He said \\"hi\\" to me",
  "content": "<p>Escaped \\\\ backslash.</p>"
});`

const jsonParseBlob = `window.__INITIAL_STATE__ = JSON.parse("{\\"title\\":\\"JSON title\\",\\"name\\":\\"Carol\\",\\"content\\":\\"<p>JSON body.</p>\\",\\"createdAt\\":\\"2024-03-03\\"}");`

const loginWallHtml = `<html><body><div>请登录后查看</div></body></html>`

describe('extractInitialState', () => {
  it('extracts a ({...}) object literal with double-quoted values', () => {
    const blob = extractInitialState(doubleQuoteBlob)
    expect(blob).toBeTruthy()
    expect(blob).toContain('"title"')
  })

  it('extracts a ({...}) object literal with single-quoted values', () => {
    const blob = extractInitialState(singleQuoteBlob)
    expect(blob).toBeTruthy()
    expect(blob).toContain("'title'")
  })

  it('extracts a JSON.parse("...") form', () => {
    const blob = extractInitialState(jsonParseBlob)
    expect(blob).toBeTruthy()
    expect(blob).toContain('"title":"JSON title"')
  })

  it('returns null when no __INITIAL_STATE__ exists', () => {
    expect(extractInitialState(loginWallHtml)).toBeNull()
  })
})

describe('isLoginWall', () => {
  it('detects a login wall page', () => {
    expect(isLoginWall(loginWallHtml)).toBe(true)
  })
  it('does not flag a real state blob', () => {
    expect(isLoginWall(doubleQuoteBlob)).toBe(false)
  })
})

describe('parseArticle', () => {
  it('parses title/author/content/createdAt from double-quoted blob', () => {
    const data = parseArticle(doubleQuoteBlob)
    expect(data.loginWall).toBeFalsy()
    expect(data.title).toBe('Hello World')
    expect(data.author).toBe('Alice')
    expect(data.content).toContain('First line.')
    expect(data.content).toContain('Second line.')
    expect(data.createdAt).toBe('2024-01-01T12:00:00Z')
  })

  it('parses single-quoted values and restores embedded double quotes', () => {
    const data = parseArticle(singleQuoteBlob)
    expect(data.title).toBe('A "quoted" title')
    expect(data.author).toBe('Bob')
    expect(data.createdAt).toBe('2024-02-02')
  })

  it('restores escaped quotes and backslashes', () => {
    const data = parseArticle(escapedBlob)
    expect(data.title).toBe('He said "hi" to me')
    expect(data.content).toContain('Escaped \\ backslash.')
  })

  it('parses a JSON.parse("...") state blob', () => {
    const data = parseArticle(jsonParseBlob)
    expect(data.title).toBe('JSON title')
    expect(data.author).toBe('Carol')
    expect(data.content).toContain('JSON body.')
    expect(data.createdAt).toBe('2024-03-03')
  })

  it('flags login walls instead of crashing', () => {
    const data = parseArticle(loginWallHtml)
    expect(data.loginWall).toBe(true)
    expect(data.content).toBeUndefined()
  })

  it('does not confuse subTitle/mytitle with the title key', () => {
    const blob = `window.__INITIAL_STATE__ = ({
      "subTitle": "ignore me",
      "mytitle": "also ignore",
      "title": "real title",
      "content": "<p>body</p>"
    });`
    const data = parseArticle(blob)
    expect(data.title).toBe('real title')
  })
})

describe('htmlToText', () => {
  it('converts <br> to a newline', () => {
    expect(htmlToText('a<br>b')).toBe('a\nb')
  })
  it('converts </p> to a newline between paragraphs', () => {
    expect(htmlToText('<p>Hello</p><p>World</p>')).toBe('Hello\nWorld')
  })
  it('decodes common HTML entities', () => {
    expect(htmlToText('a &amp; b &lt; c &gt; d &nbsp;e')).toBe('a & b < c > d e')
  })
  it('drops script and style content', () => {
    expect(htmlToText('<p>keep</p><script>var x=1;</script>')).toBe('keep')
  })
})
