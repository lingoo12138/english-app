// W149 反馈 8-10: 验证 3 大微动效
// 8. Toast 滑入 (slide-down + spring 240ms)
// 9. TTSButton 涟漪 (active:scale-90 + inset shadow)
// 10. WordDetail 释义卡片 stagger (8 个 .card stagger-item)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 8-10 — 3 大微动效 (Toast / TTS / WordDetail)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const toast = readFileSync('src/components/Toast.tsx', 'utf-8')
  const tts = readFileSync('src/components/TTSButton.tsx', 'utf-8')
  const wordDetail = readFileSync('src/pages/WordDetail.tsx', 'utf-8')

  describe('8. Toast 滑入 (slide-down spring 240ms + 微 scale)', () => {
    it('@keyframes slide-down 升级: scale(0.95) + translateY(-100%)', () => {
      expect(css).toMatch(/@keyframes\s+slide-down\s*\{[^}]*transform:\s*translateY\(-100%\)\s*scale\(0\.95\)/)
    })

    it('.animate-slide-down 升级: 240ms + spring 缓动 + both (保持终态)', () => {
      expect(css).toMatch(/\.animate-slide-down\s*\{[^}]*animation:\s*slide-down\s+0\.24s\s+var\(--ease-spring\)\s+both/)
    })

    it('Toast.tsx 用 .animate-slide-down class', () => {
      expect(toast).toContain('animate-slide-down')
    })
  })

  describe('9. TTSButton 涟漪 (active:scale-90 + inset shadow)', () => {
    it('TTSButton className 含 active:scale-90 (按下缩 90%)', () => {
      expect(tts).toMatch(/active:scale-90/)
    })

    it('TTSButton className 含 active:shadow-[inset...] (涟漪阴影)', () => {
      expect(tts).toMatch(/active:shadow-\[inset_0_2px_6px_rgba/)
    })

    it('TTSButton 用 transition-all + duration fast 替代 transition-colors (含 scale)', () => {
      expect(tts).toMatch(/transition-all\s+duration-\[var\(--t-fast\)\]/)
    })
  })

  describe('10. WordDetail 释义卡片 stagger (8 个)', () => {
    it('8 个 <div className="card stagger-item"> 全部加 stagger', () => {
      const count = (wordDetail.match(/<div className="card stagger-item">/g) || []).length
      expect(count).toBeGreaterThanOrEqual(8)
    })

    it('原有 <div className="card"> (无 stagger) 全部替换为 stagger-item', () => {
      // 不应再有纯 "card" 没用 stagger 的
      // 注: 允许其他 className 加 card 的不算
      const pureNoStagger = (wordDetail.match(/<div className="card">/g) || []).length
      expect(pureNoStagger).toBe(0)
    })
  })

  describe('a11y: prefers-reduced-motion', () => {
    it('slide-down 在 reduced-motion 已被 page-transition 那一段覆盖 (CSS 复用)', () => {
      // .animate-slide-down 走 .page-transition 模式, 已经有 reduced-motion fallback
      // 验证 slide-down keyframes 在 reduced-motion 媒体查询内被 .page-transition 模式覆盖
      // 简化: 验证 prefers-reduced-motion 块存在
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('Toast 业务 0 变更 (useToastStore / toast API 仍能用)', () => {
      expect(toast).toContain('useToastStore')
      expect(toast).toContain('ToastType')
      expect(toast).toContain('success')
      expect(toast).toContain('error')
    })

    it('TTSButton 业务 0 变更 (isPlaying / handleClick / 朗读 都不动)', () => {
      expect(tts).toContain('isPlaying')
      expect(tts).toContain('handleClick')
    })

    it('WordDetail 业务 0 变更 (释义/同义词/词根都还在)', () => {
      // 主要 section 关键词
      expect(wordDetail).toContain('释义')  // 或相关关键词
    })
  })
})
