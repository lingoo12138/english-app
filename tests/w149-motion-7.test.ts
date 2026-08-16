// W149 反馈 22+24+25: 3 大微动效
// 22. 错题答完进度条 fill + CountUp 数字滚动 (5/10 题推进)
// 24. SkeletonShimmer 集成 DailyWordCard (Home LCP element 加载占位)
// 25. Switch 集成 AppearanceSection (暗色 / 高对比度 2 个开关)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 22+24+25 — 3 大微动效集成 (错题进度 / Skeleton / 多 Switch)', () => {
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')
  const dailyWord = readFileSync('src/components/home/DailyWordCard.tsx', 'utf-8')
  const appearance = readFileSync('src/components/settings/AppearanceSection.tsx', 'utf-8')

  describe('22. 错题答完进度条 fill + CountUp 数字滚动', () => {
    it('ErrorReviewPage 进度条 transition-all duration-500 ease-[var(--ease)] (fill 平滑 500ms)', () => {
      expect(errorReview).toMatch(/transition-all\s+duration-500\s+ease-\[var\(--ease\)\]/)
    })

    it('进度条加 .progress-fill class (跟 Home/Onboarding 一致)', () => {
      expect(errorReview).toMatch(/progress-fill/)
    })

    it('进度文字用 CountUp 滚动 (5/10 + ✓ 正确 + ✗ 错误 + 待重答)', () => {
      // 至少 4 处 CountUp
      const countUps = errorReview.match(/<CountUp\s+value=/g) || []
      expect(countUps.length).toBeGreaterThanOrEqual(4)
    })

    it('✓ / ✗ 用 IconCheck / IconClose 替 (0 emoji 维持)', () => {
      expect(errorReview).toContain('IconCheck')
      expect(errorReview).toContain('IconClose')
    })

    it('进度文字用 tabular-nums 等宽对齐 (CountUp 滚动不抖)', () => {
      const countUpsWithTabular = errorReview.match(/<CountUp value=[^>]*>\s*<\/CountUp>[\s\S]{0,100}tabular-nums|tabular-nums[\s\S]{0,100}<CountUp/g) || []
      expect(countUpsWithTabular.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('24. SkeletonShimmer 集成 DailyWordCard (Home LCP element)', () => {
    it('DailyWordCard 用 .skeleton-shimmer 替 .animate-pulse (3 处)', () => {
      const shimmers = dailyWord.match(/skeleton-shimmer/g) || []
      expect(shimmers.length).toBeGreaterThanOrEqual(3)
    })

    it('DailyWordCard 不再用 .animate-pulse (避免重复, 0 冲突)', () => {
      // 注: 5 处 .animate-pulse → 0
      const pulses = dailyWord.match(/animate-pulse/g) || []
      expect(pulses.length).toBe(0)
    })

    it('DailyWordCard Skeleton 状态保留 a11y (aria-busy="true")', () => {
      expect(dailyWord).toMatch(/aria-busy="true"/)
    })
  })

  describe('25. Switch 集成 AppearanceSection (暗色 / 高对比度 2 个开关)', () => {
    it('AppearanceSection import Switch component', () => {
      expect(appearance).toMatch(/import\s*\{[^}]*Switch[^}]*\}\s*from\s*['"]\.\.\/Switch['"]/)
    })

    it('暗色模式用 <Switch> 替代手写 button+div (Spring 200ms)', () => {
      // 找暗色块: darkMode + <Switch>
      const darkBlock = appearance.match(/<div>\s*<div className="font-medium">暗色模式[\s\S]{0,200}/)?.[0] || ''
      expect(darkBlock).toContain('<Switch')
      expect(darkBlock).not.toMatch(/<button\s+onClick=\{toggleDark\}/)
    })

    it('高对比度模式用 <Switch> 替代手写 button', () => {
      const hcBlock = appearance.match(/<div>\s*<div className="font-medium">高对比度[\s\S]{0,200}/)?.[0] || ''
      expect(hcBlock).toContain('<Switch')
      expect(hcBlock).not.toMatch(/<button\s+onClick=\{\(\) => setHighContrastState/)
    })

    it('暗色 Switch testId=settings-darkmode-toggle (e2e 用)', () => {
      expect(appearance).toContain('settings-darkmode-toggle')
    })

    it('高对比度 Switch testId=settings-highcontrast-toggle (e2e 用)', () => {
      expect(appearance).toContain('settings-highcontrast-toggle')
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('ErrorReviewPage 业务 0 变更 (session.total / remaining 还在)', () => {
      expect(errorReview).toContain('session.total')
      expect(errorReview).toContain('session.remaining')
    })

    it('AppearanceSection 主题色 / 字号 / 语言设置 0 变更', () => {
      expect(appearance).toContain('themeColor')
      expect(appearance).toContain('fontSize')
    })

    it('DailyWordCard 真实态 0 变更 (LCP element layout 一致)', () => {
      // 真实态的 min-h 跟 skeleton 一致 (防止 CLS)
      expect(dailyWord).toMatch(/min-h-\[2\.25rem\]/)
      expect(dailyWord).toMatch(/min-h-\[2\.5rem\]/)
    })
  })
})
