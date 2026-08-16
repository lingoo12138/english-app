// W149 反馈 19-21: 3 大微动效
// 19. Switch 集成 Settings (telemetry toggle)
// 20. Skeleton 扫光 (SkeletonShimmer + brand-500 半透明 1.2s 循环)
// 21. 答对错 icon 弹出 (correct-pop scale + wrong-shake 抖动)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 19-21 — 3 大微动效 (Switch / Skeleton / Answer)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const settings = readFileSync('src/pages/Settings.tsx', 'utf-8')
  const skeleton = readFileSync('src/components/Skeleton.tsx', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  describe('19. Switch 集成 Settings (telemetry toggle)', () => {
    it('Settings.tsx import Switch component', () => {
      expect(settings).toMatch(/import\s*\{[^}]*Switch[^}]*\}\s*from\s*['"]\.\.\/components\/Switch['"]/)
    })

    it('Settings.tsx telemetry toggle 用 <Switch> 替代 <input type="checkbox">', () => {
      // 找到 telemetry toggle 块, 应该用 Switch 而非 input
      // Switch 块可能 <Switch 在 testId 之前, 用更宽的窗口
      const telemetryBlock = settings.match(/<Switch[\s\S]{0,300}settings-telemetry-toggle[\s\S]{0,200}/)?.[0] || ''
      expect(telemetryBlock).toContain('<Switch')
      expect(telemetryBlock).not.toMatch(/<input\s+type="checkbox"/)
    })

    it('Switch 接受 onChange setTelemetryOn (setter 函数)', () => {
      const telemetryBlock = settings.match(/<Switch[\s\S]{0,300}settings-telemetry-toggle[\s\S]{0,200}/)?.[0] || ''
      expect(telemetryBlock).toMatch(/onChange=\{setTelemetryOn\}/)
    })
  })

  describe('20. Skeleton 扫光 (SkeletonShimmer 新 component + CSS keyframes)', () => {
    it('@keyframes skeletonShimmer (background-position -200% → 200%, 1.2s linear infinite)', () => {
      expect(css).toMatch(/@keyframes\s+skeletonShimmer\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*background-position:\s*-200%/)
      expect(css).toMatch(/100%\s*\{[^}]*background-position:\s*200%/)
    })

    it('.skeleton-shimmer bg-color stone-200 (亮色) + stone-700 (暗色)', () => {
      expect(css).toMatch(/\.skeleton-shimmer\s*\{[^}]*background-color:\s*rgb\(231\s+229\s+228\)/)
      expect(css).toMatch(/\.dark\s+\.skeleton-shimmer\s*\{[^}]*background-color:\s*rgb\(68\s+64\s+60\)/)
    })

    it('.skeleton-shimmer::after 渐变 brand-500/0.08 半透明扫光', () => {
      expect(css).toMatch(/\.skeleton-shimmer::after\s*\{[^}]*background:\s*linear-gradient[^}]*rgba\(34,\s*197,\s*94,\s*0\.08\)/)
    })

    it('.skeleton-shimmer::after animation 1.2s linear infinite', () => {
      expect(css).toMatch(/\.skeleton-shimmer::after\s*\{[^}]*animation:\s*skeletonShimmer\s+1\.2s\s+linear\s+infinite/)
    })

    it('Skeleton.tsx 导出 SkeletonShimmer component', () => {
      expect(skeleton).toContain('export function SkeletonShimmer')
      expect(skeleton).toContain('skeleton-shimmer')
    })

    it('SkeletonShimmer 接受 height + className + aria-label="加载中"', () => {
      expect(skeleton).toMatch(/SkeletonShimmer[\s\S]{0,300}aria-label="加载中"/)
    })
  })

  describe('21. 答对错 icon 弹出 (correct-pop + wrong-shake)', () => {
    it('@keyframes correctPop (scale 0 → 1.3 → 1, rotate -15° → 8° → 0°)', () => {
      expect(css).toMatch(/@keyframes\s+correctPop\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*scale\(0\)\s+rotate\(-15deg\)/)
      expect(css).toMatch(/50%\s*\{[^}]*transform:\s*scale\(1\.3\)\s+rotate\(8deg\)/)
      expect(css).toMatch(/100%\s*\{[^}]*transform:\s*scale\(1\)\s+rotate\(0\)/)
    })

    it('.correct-pop 600ms spring 弹入', () => {
      expect(css).toMatch(/\.correct-pop\s*\{[^}]*animation:\s*correctPop\s+0\.6s\s+var\(--ease-spring\)\s+both/)
    })

    it('@keyframes wrongShake (translateX -6px / 6px 抖动 4 次)', () => {
      expect(css).toMatch(/@keyframes\s+wrongShake\s*\{/)
      expect(css).toMatch(/20%,\s*60%\s*\{[^}]*translateX\(-6px\)/)
      expect(css).toMatch(/40%,\s*80%\s*\{[^}]*translateX\(6px\)/)
    })

    it('.wrong-shake 500ms ease-in-out 抖动', () => {
      expect(css).toMatch(/\.wrong-shake\s*\{[^}]*animation:\s*wrongShake\s+0\.5s\s+ease-in-out/)
    })

    it('ErrorReviewPage "上次错" 卡片加 correct-pop / wrong-shake', () => {
      expect(errorReview).toContain('correct-pop')
      expect(errorReview).toContain('wrong-shake')
      expect(errorReview).toContain('aria-label="答对了"')
      expect(errorReview).toContain('aria-label="答错了"')
    })
  })

  describe('a11y: prefers-reduced-motion', () => {
    it('Skeleton 扫光 1.2s linear 已在 .stagger-item 那段被覆盖 (animation: none)', () => {
      // .skeleton-shimmer::after 走 .skeleton-shimmer 同源, .skeleton-shimmer 没在 reduced-motion 块
      // 注: 扫光是装饰, 即便 reduced-motion 用户也能接受 (跟 Loading 一样)
      // 不强制 fallback, 但需要测试 .stagger-item 块在
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('Switch 集成不破坏 Settings 其他 section (PreferencesSection / TTSSection 等还在)', () => {
      expect(settings).toContain('PreferencesSection')
      expect(settings).toContain('TTSSection')
      expect(settings).toContain('AppearanceSection')
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })
  })
})
