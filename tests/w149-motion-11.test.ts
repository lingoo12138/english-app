// W149 反馈 37+38+39: 3 大微动效
// 37. 连续答对 5 题 streak 徽章弹出 (金色 Trophy + 旋转 spring)
// 38. 答题历史 sparkline (SVG path 描边动画 + dot hover 放大)
// 39. 错题超过 10 题时 warning-pulse (橙色 box-shadow pulse 提示)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 37+38+39 — 3 大微动效 (Streak 徽章 / Sparkline / 警告)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  describe('37. 连续答对 5 题 streak 徽章弹出', () => {
    it('@keyframes streakBadge (scale 0 + rotate -180° → 1.3 + 20° → 1 + 0°, 600ms spring)', () => {
      expect(css).toMatch(/@keyframes\s+streakBadge\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*scale\(0\)\s+rotate\(-180deg\)/)
      expect(css).toMatch(/50%\s*\{[^}]*transform:\s*scale\(1\.3\)\s+rotate\(20deg\)/)
      expect(css).toMatch(/100%\s*\{[^}]*transform:\s*scale\(1\)\s+rotate\(0\)/)
    })

    it('.streak-badge 600ms spring + 金色 box-shadow (3px ring + 12px 模糊)', () => {
      expect(css).toMatch(/\.streak-badge\s*\{[^}]*animation:\s*streakBadge\s+0\.6s\s+var\(--ease-spring\)\s+both/)
      expect(css).toMatch(/box-shadow:\s*0\s+0\s+0\s+3px\s+rgb\(251\s+191\s+36\s*\/\s*0\.4\)/)
    })

    it('ErrorReviewPage streak 计算: last5 全 perfect/good → 显示徽章', () => {
      // 找 streak5 计算
      const streakBlock = errorReview.match(/last5[\s\S]{0,500}streak-badge/g)
      expect(streakBlock).toBeTruthy()
      const block = streakBlock?.[0] || ''
      expect(block).toContain('last5.every')
      expect(block).toMatch(/h\.grade === ['"]perfect['"] \|\| h\.grade === ['"]good['"]/)
    })

    it('徽章内容: IconTrophy + "5连" 文字 + 金色 bg-amber-400', () => {
      const streakBlock = errorReview.match(/streak-badge[\s\S]{0,400}/g)
      expect(streakBlock).toBeTruthy()
      const block = streakBlock?.[0] || ''
      expect(block).toContain('IconTrophy')
      expect(block).toContain('5连')
      expect(block).toContain('bg-amber-400')
    })

    it('徽章 data-testid="streak-badge" (e2e 用)', () => {
      expect(errorReview).toContain('data-testid="streak-badge"')
    })
  })

  describe('38. 答题历史 sparkline (SVG path 描边动画 + dot hover)', () => {
    it('@keyframes sparklineDraw (stroke-dashoffset 200 → 0, 1.2s ease)', () => {
      expect(css).toMatch(/@keyframes\s+sparklineDraw\s*\{/)
      expect(css).toMatch(/from\s*\{[^}]*stroke-dashoffset:\s*200/)
      expect(css).toMatch(/to\s*\{?\s*stroke-dashoffset:\s*0/)
    })

    it('.sparkline-path 1.2s 描边动画 + stroke-linecap/linejoin=round', () => {
      expect(css).toMatch(/\.sparkline-path\s*\{[^}]*animation:\s*sparklineDraw\s+1\.2s\s+var\(--ease\)\s+both/)
      expect(css).toMatch(/stroke-linecap:\s*round/)
      expect(css).toMatch(/stroke-linejoin:\s*round/)
    })

    it('.sparkline-dot hover r: 5 (放大)', () => {
      expect(css).toMatch(/\.sparkline-dot:hover\s*\{[^}]*r:\s*5/)
    })

    it('ErrorReviewPage 算 points (xs/ys 数组)', () => {
      const sparklineBlock = errorReview.match(/const points = session\.history[\s\S]{0,500}/)
      expect(sparklineBlock).toBeTruthy()
      const block = sparklineBlock?.[0] || ''
      expect(block).toMatch(/const xs\s*=\s*points\.map\(\(_\s*,\s*i\)/)
      expect(block).toMatch(/const ys\s*=\s*points\.map\(p\s*=>\s*h\s*-\s*\(p\.score\s*\/\s*100\)\s*\*\s*h\)/)
    })

    it('SVG path M/L 命令拼 pathD (起始 M, 后续 L)', () => {
      const sparklineBlock = errorReview.match(/pathD\s*=[\s\S]{0,300}/)
      expect(sparklineBlock).toBeTruthy()
      const block = sparklineBlock?.[0] || ''
      expect(block).toMatch(/i === 0 \? 'M' : 'L'/)
    })

    it('每个点 <circle r=2.5, fill 答对 emerald-500 / 答错 rose-500', () => {
      const circleBlock = errorReview.match(/const correct = p\.grade[\s\S]{0,400}/)
      expect(circleBlock).toBeTruthy()
      const block = circleBlock?.[0] || ''
      // fill={correct ? '#22c55e' : '#f43f5e'} (双引号或单引号都可)
      expect(block).toMatch(/fill=\{correct\s*\?\s*['"]#22c55e['"]\s*:\s*['"]#f43f5e['"]\}/)
      expect(block).toMatch(/r=\{2\.5\}/)
    })

    it('sparkline 只在 history.length >= 2 时显示 (单点没意义)', () => {
      expect(errorReview).toMatch(/session\.history\.length\s*>=\s*2/)
    })

    it('sparkline data-testid sparkline-dot-i (e2e 用)', () => {
      expect(errorReview).toContain('sparkline-dot-${i}')
    })
  })

  describe('39. 错题超过 10 题时 warning-pulse (橙色 box-shadow pulse)', () => {
    it('@keyframes warningPulse (box-shadow 0 → 6px → 0, 1.5s ease-in-out infinite)', () => {
      expect(css).toMatch(/@keyframes\s+warningPulse\s*\{/)
      expect(css).toMatch(/0%,\s*100%\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+0\s+rgb\(245\s+158\s+11\s*\/\s*0\.4\)/)
      expect(css).toMatch(/50%\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+6px\s+rgb\(245\s+158\s+11\s*\/\s*0\)/)
    })

    it('.warning-pulse 1.5s ease-in-out infinite 循环', () => {
      expect(css).toMatch(/\.warning-pulse\s*\{[^}]*animation:\s*warningPulse\s+1\.5s\s+ease-in-out\s+infinite/)
    })

    it('ErrorReviewPage history 卡片 session.history.length > 10 时加 warning-pulse', () => {
      // 找 warning-pulse 应用处
      const warnBlock = errorReview.match(/session\.history\.length\s*>\s*10\s*\?\s*['"]warning-pulse['"]/g)
      expect(warnBlock).toBeTruthy()
      expect(warnBlock?.[0]).toContain('warning-pulse')
    })
  })

  describe('a11y: prefers-reduced-motion', () => {
    it('streak-badge / sparkline-dot / warning-pulse 都是装饰性, 走 .page-transition 模式', () => {
      // 装饰性反馈, 即便 reduced-motion 用户也能接受 (跟 confetti 一样)
      // 不强制关, 用户可选择看 / 不看 (语义信息在 5连 / 警告都还在)
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('sparkline 用纯 SVG (0 第三方库)', () => {
      // SVG path + circle 都是浏览器原生
      expect(errorReview).toMatch(/<svg\s+width=\{w\}/)
      expect(errorReview).toMatch(/<circle\s+key=\{i\}\s+cx=\{xs\[i\]\}/)
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })
  })
})
