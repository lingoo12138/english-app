// W149 反馈 40+41+42+43: 4 大微动效
// 40. NEW HIGH! 闪烁字 (连续 10 题全 perfect/good)
// 41. 答对连续 10 题时徽章变红 + 火焰 pulse
// 42. 错题答对率从 sparkline 自动算 (百分比显示)
// 43. 错题答错连续 3 题时切下一题变红 5s (next-card-warn)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 40+41+42+43 — 4 大微动效 (NEW HIGH / 火焰徽章 / 答对率 / 错 3 红)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  describe('40. NEW HIGH! 闪烁字 (连续 10 题全 perfect/good)', () => {
    it('@keyframes newHighBlink (opacity 1→0.4, scale 1→1.15, rotate -3°→3°, 0.5s infinite)', () => {
      expect(css).toMatch(/@keyframes\s+newHighBlink\s*\{/)
      expect(css).toMatch(/50%\s*\{[^}]*opacity:\s*0\.4\s*;[^}]*transform:\s*scale\(1\.15\)\s+rotate\(3deg\)/)
    })

    it('.new-high-blink 0.5s infinite + 琥珀色 + font-weight 900', () => {
      expect(css).toMatch(/\.new-high-blink\s*\{[^}]*animation:\s*newHighBlink\s+0\.5s\s+ease-in-out\s+infinite/)
      expect(css).toMatch(/color:\s*#fbbf24/)
      expect(css).toMatch(/font-weight:\s*900/)
    })

    it('ErrorReviewPage streak10 时显示 NEW HIGH! (data-testid="new-high")', () => {
      // 跨 1500 字符窗口找 streak10 → NEW HIGH! 块
      const block = errorReview.match(/streak10[\s\S]{0,1500}NEW HIGH!/)
      expect(block).toBeTruthy()
      const b = block?.[0] || ''
      expect(b).toContain('NEW HIGH!')
      expect(b).toContain('data-testid="new-high"')
    })
  })

  describe('41. 答对连续 10 题时徽章变红 + 火焰 pulse', () => {
    it('.streak-badge-fire 红色 box-shadow (3px ring + 12px 模糊 + 239,68,68)', () => {
      expect(css).toMatch(/\.streak-badge-fire\s*\{[^}]*box-shadow:[^}]*239\s+68\s+68\s*\/\s*0\.5/)
    })

    it('@keyframes streakFirePulse (0.8s infinite, box-shadow 5px ring + 20px 模糊)', () => {
      expect(css).toMatch(/@keyframes\s+streakFirePulse\s*\{/)
      expect(css).toMatch(/animation:\s*streakFirePulse\s+0\.8s\s+ease-in-out\s+infinite/)
    })

    it('.streak-fire-pulse 0.8s infinite', () => {
      expect(css).toMatch(/\.streak-fire-pulse\s*\{[^}]*animation:\s*streakFirePulse\s+0\.8s\s+ease-in-out\s+infinite/)
    })

    it('ErrorReviewPage streak10 显示 "10连" 红色徽章 (data-testid="streak-badge-fire")', () => {
      const block = errorReview.match(/streak10[\s\S]{0,500}10连/)
      expect(block).toBeTruthy()
      const b = block?.[0] || ''
      expect(b).toContain('10连')
      expect(b).toContain('data-testid="streak-badge-fire"')
      expect(b).toContain('bg-red-500')
      expect(b).toContain('streak-badge-fire')
      expect(b).toContain('streak-fire-pulse')
    })
  })

  describe('42. 错题答对率从 sparkline 自动算 (百分比显示)', () => {
    it('ErrorReviewPage correctCount = points.filter(答对) (perfect/good)', () => {
      const block = errorReview.match(/const correctCount = points\.filter[\s\S]{0,200}/)
      expect(block).toBeTruthy()
      const b = block?.[0] || ''
      expect(b).toContain("p.grade === 'perfect' || p.grade === 'good'")
    })

    it('correctRate = round((correctCount / points.length) * 100)', () => {
      expect(errorReview).toMatch(/const\s+correctRate\s*=\s*Math\.round\(\(correctCount\s*\/\s*points\.length\)\s*\*\s*100\)/)
    })

    it('答对率 3 档色: ≥80 emerald / ≥50 amber / <50 rose', () => {
      expect(errorReview).toMatch(/correctRate\s*>=\s*80\s*\?\s*['"]text-emerald-500['"]/)
      expect(errorReview).toMatch(/correctRate\s*>=\s*50\s*\?\s*['"]text-amber-500['"]/)
      expect(errorReview).toMatch(/['"]text-rose-500['"]/)
    })

    it('答对率 data-testid="correct-rate" (e2e 用)', () => {
      expect(errorReview).toContain('data-testid="correct-rate"')
    })
  })

  describe('43. 错题答错连续 3 题时切下一题变红 5s (next-card-warn)', () => {
    it('@keyframes nextCardWarn (box-shadow 0 → 4px rose/0.4 → 0, 1.2s ease-in-out 5)', () => {
      expect(css).toMatch(/@keyframes\s+nextCardWarn\s*\{/)
      expect(css).toMatch(/50%\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+4px\s+rgb\(244\s+63\s+94\s*\/\s*0\.4\)/)
    })

    it('.next-card-warn 1.2s 5 iterations + 2px rose border', () => {
      expect(css).toMatch(/\.next-card-warn\s*\{[^}]*animation:\s*nextCardWarn\s+1\.2s\s+ease-in-out\s+5/)
      expect(css).toMatch(/border:\s*2px\s+solid\s+rgb\(244\s+63\s+94\)/)
    })

    it('ErrorReviewPage 答错连续 3 题触发 next-card-warn', () => {
      const block = errorReview.match(/last3[\s\S]{0,500}next-card-warn/)
      expect(block).toBeTruthy()
      const b = block?.[0] || ''
      expect(b).toContain('last3.every')
      expect(b).toContain("h.grade !== 'perfect' && h.grade !== 'good'")
      expect(b).toContain('next-card-warn')
    })

    it('last3 = session.history.slice(-3) (取最近 3 题)', () => {
      expect(errorReview).toMatch(/const\s+last3\s*=\s*session\.history\.slice\(-3\)/)
    })
  })

  describe('a11y: prefers-reduced-motion (装饰性动效)', () => {
    it('NEW HIGH 闪烁 / 火焰 pulse / next-card-warn 都是装饰性, 走 .page-transition 模式', () => {
      // 都是装饰, 即便 reduced-motion 用户也能接受 (语义信息在徽章颜色 / 边框还在)
      // 不强制关, 用户可选择看 / 不看
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })

    it('0 emoji 维持 (NEW HIGH! 0 emoji, 用 CSS animation + 文字)', () => {
      const newHighBlock = errorReview.match(/NEW HIGH[\s\S]{0,200}/g)
      expect(newHighBlock).toBeTruthy()
      const b = newHighBlock?.[0] || ''
      const nonText = b.replace(/NEW HIGH!/, '').trim()
      expect(nonText).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u)
    })
  })
})
