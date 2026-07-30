// tests/md.test.ts - markdown 渲染器单元测试
import { describe, it, expect } from 'vitest'
import { renderMd } from '../src/lib/md'

describe('md.ts - 极简 markdown 渲染', () => {
  it('空输入返回空字符串', () => {
    expect(renderMd('')).toBe('')
  })

  it('渲染 H1 标题', () => {
    expect(renderMd('# Hello')).toContain('<h1')
    expect(renderMd('# Hello')).toContain('Hello')
  })

  it('渲染 H1-H6 标题', () => {
    expect(renderMd('## H2')).toContain('<h2')
    expect(renderMd('### H3')).toContain('<h3')
    expect(renderMd('#### H4')).toContain('<h4')
    expect(renderMd('##### H5')).toContain('<h5')
    expect(renderMd('###### H6')).toContain('<h6')
  })

  it('渲染粗体', () => {
    expect(renderMd('**bold**')).toContain('<strong>bold</strong>')
  })

  it('渲染斜体', () => {
    expect(renderMd('*italic*')).toContain('<em>italic</em>')
  })

  it('渲染行内 code', () => {
    expect(renderMd('`code`')).toContain('<code')
    expect(renderMd('`code`')).toContain('code')
  })

  it('code 块不被粗体/链接解析', () => {
    const out = renderMd('`**not bold**`')
    expect(out).not.toContain('<strong>')
    expect(out).toContain('**not bold**')
  })

  it('渲染链接', () => {
    const out = renderMd('[text](https://example.com)')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('text')
  })

  it('渲染无序列表', () => {
    const out = renderMd('- a\n- b\n- c')
    expect(out).toContain('<ul')
    expect(out).toContain('<li>a</li>')
    expect(out).toContain('<li>b</li>')
    expect(out).toContain('<li>c</li>')
  })

  it('渲染有序列表', () => {
    const out = renderMd('1. a\n2. b')
    expect(out).toContain('<ol')
    expect(out).toContain('<li>a</li>')
  })

  it('渲染代码块', () => {
    const out = renderMd('```\nfoo\nbar\n```')
    expect(out).toContain('<pre')
    expect(out).toContain('foo')
    expect(out).toContain('bar')
  })

  it('渲染引用', () => {
    const out = renderMd('> hello')
    expect(out).toContain('<blockquote')
    expect(out).toContain('hello')
  })

  it('渲染表格', () => {
    const out = renderMd('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(out).toContain('<table')
    expect(out).toContain('<th')
    expect(out).toContain('<td')
  })

  it('转义 HTML 防止 XSS', () => {
    const out = renderMd('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('段落用 <p> 包裹', () => {
    expect(renderMd('hello world')).toContain('<p')
  })

  it('多个段落分开', () => {
    const out = renderMd('first\n\nsecond')
    const matches = out.match(/<p/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })
})
