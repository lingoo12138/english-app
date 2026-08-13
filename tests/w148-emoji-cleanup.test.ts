// tests/w148-emoji-cleanup.test.ts - W148-C ShareCard + ShareModal emoji 全清
// 业务: W147 留的 老 3 风格 (simple/gradient/retro) emoji 全替 Icon SVG
// 硬约束: 0 emoji (W118 Icon 替 emoji 计划延续)
// 替换映射:
//   📚 → IconBook          ShareCard 头部
//   🔥 → IconStar (或纯文字) ShareCard Stat 标签
//   📅 → IconCalendar (或纯文字) ShareCard Stat 标签
//   📖 → IconBookOpen (或纯文字) ShareCard Stat 标签
//   ⭐ → IconStar          ShareCard Stat 标签
//   🏆 → IconTrophy        ShareCard 成就
//   📋 → IconShare         ShareModal 复制按钮
//   📱 / 💻 → 纯文字       ShareModal 提示段
//   handleCopy 文本 emoji  → 【】 / — 分隔

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const readFile = (p: string) => readFileSync(p, 'utf-8') as string

// 全 emoji 区间 regex (跟 W147 一致, 包含 2700-27BF 装饰符号)
const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}]/u

// ============================================================
// 1. ShareCard.tsx — 老 3 风格 emoji 全清 + Icon SVG 替
// ============================================================

describe('W148-C ShareCard.tsx — 老 3 风格 0 emoji + Icon 替', () => {
  const c = readFile('src/components/ShareCard.tsx')

  it('ShareCard 0 emoji (硬约束 — 含 streak / vocab 段)', () => {
    expect(EMOJI_RE.test(c), 'ShareCard 0 emoji').toBe(false)
  })

  it('老 3 风格 emoji 全清 — 7 个具体字符', () => {
    // 业务硬约束: 📚/🔥/📅/📖/⭐/🏆 都不能存在
    expect(c).not.toContain('📚')
    expect(c).not.toContain('🔥')
    expect(c).not.toContain('📅')
    expect(c).not.toContain('📖')
    expect(c).not.toContain('⭐')
    expect(c).not.toContain('🏆')
    // W147 引入的 🎯 (streak) / ✏️ (vocab) / 📈 (vocab) — 验证
    expect(c).not.toContain('🎯')
    expect(c).not.toContain('✏️')
    expect(c).not.toContain('📈')
  })

  it('Icon 导入 — 5 个新 Icon (IconBook/BookOpen/Calendar/Star/Trophy)', () => {
    expect(c).toMatch(/import\s*\{[^}]*IconBook[^}]*\}\s*from\s*['"]\.\/Icon['"]/)
    expect(c).toContain('IconBookOpen')
    expect(c).toContain('IconCalendar')
    expect(c).toContain('IconStar')
    expect(c).toContain('IconTrophy')
  })

  it('头部 IconBook — 📚 替换', () => {
    // 业务: 头部用 IconBook 替 📚
    expect(c).toMatch(/<IconBook[^/]*\/?>/)
    // 在头部段 (mb-2 紧跟 IconBook 后)
    expect(c).toMatch(/IconBook[\s\S]{0,200}?mb-2/)
  })

  it('Stat 4 项 — IconStar/IconCalendar/IconBookOpen 嵌入 (🔥/📅/📖/⭐)', () => {
    // 4 个 Stat 都有 icon prop
    const statBlock = c.match(/<Stat[^/]*\/>/g)
    expect(statBlock).toBeTruthy()
    expect(statBlock!.length).toBeGreaterThanOrEqual(4)
    // 验证 Stat prop 接受 icon
    expect(c).toMatch(/Stat\s*\(\s*\{[^}]*icon[^}]*label[^}]*value[^}]*unit[^}]*accent/)
    // 4 个 Stat 调用都带 icon
    const withIcon = statBlock!.filter(s => /icon=\{</.test(s!))
    expect(withIcon.length).toBeGreaterThanOrEqual(4)
  })

  it('成就 IconTrophy — 🏆 替换', () => {
    // 业务: 成就行用 IconTrophy 替 🏆
    expect(c).toMatch(/<IconTrophy[^/]*\/?>/)
  })

  it('sharecard-default data-testid (老 3 风格 e2e)', () => {
    // W148-C: 老 3 风格 fallback 加 data-testid
    expect(c).toMatch(/data-testid="sharecard-default"/)
  })
})

// ============================================================
// 2. ShareModal.tsx — handleCopy 文本 0 emoji + 提示段 0 emoji
// ============================================================

describe('W148-C ShareModal.tsx — handleCopy + 提示段 0 emoji', () => {
  const c = readFile('src/components/ShareModal.tsx')

  it('ShareModal 0 emoji (硬约束 — 含 STYLES / handleCopy / 提示段)', () => {
    expect(EMOJI_RE.test(c), 'ShareModal 0 emoji').toBe(false)
  })

  it('handleCopy 文 本 emoji 全清 — 7 个具体字符', () => {
    // 业务硬约束: handleCopy 文本的 📚/🔥/📅/📖/⭐/✏️ 都不能存在
    expect(c).not.toContain('📚')
    expect(c).not.toContain('🔥')
    expect(c).not.toContain('📅')
    expect(c).not.toContain('📖')
    expect(c).not.toContain('⭐')
    expect(c).not.toContain('✏️')
    // 提示段 📱/💻
    expect(c).not.toContain('📱')
    expect(c).not.toContain('💻')
    // 复制按钮 📋
    expect(c).not.toContain('📋')
  })

  it('handleCopy 文 本 — 替 【】 标题 + 纯 文 字 数据行', () => {
    // 业务: 标题用 【】 替 📚
    expect(c).toMatch(/【我的句刻学习】/)
    // 6 个数据行 emoji 全替
    expect(c).toContain('连续学习: ')
    expect(c).toContain('累计天数: ')
    expect(c).toContain('学过词数: ')
    expect(c).toContain('收藏: ')
    expect(c).toContain('错题: ')
    // 之前 emoji 数据行 (🔥 连续学习 等) 已清
    expect(c).not.toMatch(/🔥 连续学习/)
    expect(c).not.toMatch(/📅 累计天数/)
    expect(c).not.toMatch(/📖 学过词数/)
  })

  it('复制按钮 IconShare — 📋 替换 + data-testid', () => {
    // 业务: 复制分享文本按钮用 IconShare
    expect(c).toMatch(/import\s*\{[^}]*IconShare[^}]*\}\s*from\s*['"]\.\/Icon['"]/)
    expect(c).toMatch(/<IconShare[^/]*\/?>/)
    // data-testid 供 e2e
    expect(c).toMatch(/data-testid="share-copy-text"/)
  })

  it('提示段 纯 文 字 — 📱/💻 全替', () => {
    // 业务: 提示段用纯 文 字, 无 emoji
    expect(c).toContain('手机端: 长按图片')
    expect(c).toContain('电脑端: 右键图片')
  })

  it('STYLES 表保持 0 emoji (W147 清理 + W148 不破坏)', () => {
    const stylesBlock = c.match(/const STYLES[\s\S]{0,500}?\]/)
    expect(stylesBlock).toBeTruthy()
    expect(stylesBlock![0]).not.toMatch(EMOJI_RE)
  })
})

// ============================================================
// 3. 跨 文 件 — 0 emoji 全局回归
// ============================================================

describe('W148-C 跨 文 件 0 emoji + Icon 计数', () => {
  it('ShareCard + ShareModal 同步 0 emoji', () => {
    const shareCard = readFile('src/components/ShareCard.tsx')
    const shareModal = readFile('src/components/ShareModal.tsx')
    expect(EMOJI_RE.test(shareCard)).toBe(false)
    expect(EMOJI_RE.test(shareModal)).toBe(false)
  })

  it('Icon.tsx 仍 ≥ 29 个 (W146 加 4 个后基线)', () => {
    const icon = readFile('src/components/Icon.tsx')
    const iconCount = (icon.match(/^export const Icon/gm) || []).length
    expect(iconCount).toBeGreaterThanOrEqual(29)
  })
})
