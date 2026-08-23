// W151: 0 emoji 硬约束 增量清理 (W148 收口后 + W149 招募期间又加的几个)
// - 4 个文件: ErrorReviewPage / Home / Settings / Icon
// - 13 处 emoji 替换为 Icon SVG 或 "中文/英文" 文案
// - 注释 emoji 也清理 (W151 0 容忍)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W151 0 emoji 硬约束 增量清理', () => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]/u
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')
  const home = readFileSync('src/pages/Home.tsx', 'utf-8')
  const settings = readFileSync('src/pages/Settings.tsx', 'utf-8')
  const icon = readFileSync('src/components/Icon.tsx', 'utf-8')

  describe('1. src/ 关键 UI 文件 0 emoji (W151 0 容忍)', () => {
    it('ErrorReviewPage.tsx 0 emoji', () => {
      const match = errorReview.match(emojiRegex)
      expect(match).toBeNull()
    })
    it('Home.tsx 0 emoji', () => {
      const match = home.match(emojiRegex)
      expect(match).toBeNull()
    })
    it('Settings.tsx 0 emoji', () => {
      const match = settings.match(emojiRegex)
      expect(match).toBeNull()
    })
    it('Icon.tsx 0 emoji (W136 老注释也清)', () => {
      const match = icon.match(emojiRegex)
      expect(match).toBeNull()
    })
  })

  describe('2. W151 13 处 emoji 替换', () => {
    it('ErrorReviewPage: 6 处 emoji 替 IconRefresh/IconStar/IconChart/IconSparkles/IconCheck/IconClose', () => {
      // 验证替换后的 Icon 已 import
      expect(errorReview).toContain('IconRefresh')
      expect(errorReview).toContain('IconStar')
      expect(errorReview).toContain('IconChart')
      expect(errorReview).toContain('IconSparkles')
      expect(errorReview).toContain('IconCheck')
      expect(errorReview).toContain('IconClose')
    })
    it('Home.tsx: 3 处 emoji 替 IconBook/IconChart + 1 处 title "已达成"', () => {
      expect(home).toContain('IconBook')
      expect(home).toContain('已达成')
    })
    it('Settings.tsx: 3 处 emoji 替 IconRefresh/IconSparkles + CATEGORIES 删 emoji 字段', () => {
      expect(settings).toContain('IconRefresh')
      expect(settings).toContain('IconSparkles')
      // CATEGORIES 不再含 emoji 字段
      expect(settings).not.toMatch(/emoji:\s*'/)
    })
  })

  describe('3. 业务 P0/P1 维持', () => {
    it('CATEGORIES 字段 (W150 字段删, UI 渲染 label 正常)', () => {
      // 验证 CATEGORIES 仍 3 项 (key + label, 无 emoji)
      const match = settings.match(/const CATEGORIES[\s\S]{0,300}\]/)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain('write')
      expect(match?.[0]).toContain('chat')
      expect(match?.[0]).toContain('explain')
      expect(match?.[0]).not.toMatch(/emoji:/)
    })
    it('lastResult.isLast 字段保留 (W150 修, W151 0 emoji 清理未动)', () => {
      expect(errorReview).toContain('lastResult.isLast')
    })
  })
})
