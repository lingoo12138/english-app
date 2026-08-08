// tests/w117-font.test.ts - W117 字 体 升 级 (Outfit + JetBrains Mono)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { existsSync } from 'fs'

describe('W117 字 体 升 级 (Outfit + JetBrains Mono)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const main = readFileSync('src/main.tsx', 'utf-8')
  const tailwind = readFileSync('tailwind.config.js', 'utf-8')
  const wordCard = readFileSync('src/components/WordCard.tsx', 'utf-8')

  it('main.tsx 引 入 Outfit 4 字 重 + JetBrains Mono 2 字 重', () => {
    // 业 务: 自 托 管 6 字 重, PWA 缓 存 命 中
    expect(main).toMatch(/@fontsource\/outfit\/400\.css/)
    expect(main).toMatch(/@fontsource\/outfit\/500\.css/)
    expect(main).toMatch(/@fontsource\/outfit\/600\.css/)
    expect(main).toMatch(/@fontsource\/outfit\/700\.css/)
    expect(main).toMatch(/@fontsource\/jetbrains-mono\/400\.css/)
    expect(main).toMatch(/@fontsource\/jetbrains-mono\/500\.css/)
  })

  it('Outfit 400 文 件 在 node_modules (自 托 管 验 证)', () => {
    // 业 务: 自 托 管, 不 依 赖 外 网
    expect(existsSync('node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff2')).toBe(true)
  })

  it('Outfit 700 文 件 在 node_modules', () => {
    expect(existsSync('node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff2')).toBe(true)
  })

  it('JetBrains Mono 400/500 在 node_modules', () => {
    expect(existsSync('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2')).toBe(true)
    expect(existsSync('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2')).toBe(true)
  })

  it('index.css body font-family 用 Outfit (主 字 体)', () => {
    // 业 务: body 字 体 栈 Outfit 优 先
    expect(css).toMatch(/font-family: 'Outfit', -apple-system, BlinkMacSystemFont/)
  })

  it('index.css body font-feature-settings tnum 启 用 (数 字 等 宽)', () => {
    // 业 务: 统 计 卡 数 字 对 齐
    expect(css).toMatch(/font-feature-settings: "tnum" 1, "lnum" 1/)
    expect(css).toMatch(/font-variant-numeric: tabular-nums lining-nums/)
  })

  it('tailwind.config.js fontFamily.sans 含 Outfit', () => {
    // 业 务: Tailwind font-sans utility 用 Outfit
    expect(tailwind).toContain("sans: ['Outfit'")
    expect(tailwind).toContain('-apple-system')
  })

  it('tailwind.config.js fontFamily.mono 含 JetBrains Mono', () => {
    // 业 务: Tailwind font-mono utility 用 JetBrains Mono
    expect(tailwind).toContain('JetBrains Mono')
    expect(tailwind).toContain('ui-monospace')
  })

  it('WordCard 音 标 用 font-mono + tabular-nums', () => {
    // 业 务: 音 标 /əˈbændən/ 等 宽 对 齐
    expect(wordCard).toMatch(/font-mono tabular-nums.*phonetic/)
  })
})
