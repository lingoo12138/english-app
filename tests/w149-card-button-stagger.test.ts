// W149 反馈 3: 验证卡片 hover lift + 按钮按下涟漪 + 列表 stagger fade-in
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 3 — 微交互动效 (hover / 按钮 / 列表 stagger)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const wordCard = readFileSync('src/components/WordCard.tsx', 'utf-8')
  const wordList = readFileSync('src/pages/WordList.tsx', 'utf-8')
  const settings = readFileSync('src/pages/Settings.tsx', 'utf-8')

  describe('CSS: .card-interactive hover lift 增强', () => {
    it('hover: translateY(-3px) + scale(1.005) 浮起效果', () => {
      expect(css).toMatch(/\.card-interactive:hover\s*\{[^}]*transform:\s*translateY\(-3px\)\s*scale\(1\.005\)/)
    })

    it('transition: transform + box-shadow (双属性缓动)', () => {
      expect(css).toMatch(/\.card-interactive\s*\{[^}]*transition:\s*transform\s+var\(--t-base\)\s+var\(--ease\),\s*box-shadow\s+var\(--t-base\)\s+var\(--ease\)/)
    })
  })

  describe('CSS: .btn:active 涟漪 (按下 inset shadow)', () => {
    it('.btn:active scale(0.97) 物理按压', () => {
      expect(css).toMatch(/\.btn:active\s*\{[^}]*transform:\s*scale\(0\.97\)/)
    })

    it('.btn:active box-shadow inset 模拟按压深度', () => {
      expect(css).toMatch(/\.btn:active\s*\{[^}]*box-shadow:\s*inset\s+0\s+2px\s+6px\s+rgba/)
    })
  })

  describe('CSS: .stagger-item 列表错落 fade-in (n=1..15 + n+16)', () => {
    it('@keyframes listItemEnter (opacity 0→1, translateY 6px→0)', () => {
      expect(css).toMatch(/@keyframes\s+listItemEnter\s*\{/)
      expect(css).toMatch(/from\s*\{[^}]*opacity:\s*0\s*;?\s*transform:\s*translateY\(6px\)/)
      expect(css).toMatch(/to\s*\{?\s*opacity:\s*1\s*;?\s*transform:\s*translateY\(0\)/)
    })

    it('.stagger-item 320ms + spring 缓动', () => {
      expect(css).toMatch(/\.stagger-item\s*\{[^}]*animation:\s*listItemEnter\s+0\.32s\s+var\(--ease-spring\)\s+both/)
    })

    it('15 个 nth-child + 16+ 同步 (避免长列表 lag)', () => {
      for (let i = 1; i <= 15; i++) {
        const delay = (i - 1) * 0.03
        expect(css).toMatch(new RegExp(`\\.stagger-item:nth-child\\(${i}\\)\\s*\\{[^}]*animation-delay:\\s*${delay.toFixed(2)}s`))
      }
      expect(css).toMatch(/\.stagger-item:nth-child\(n\+16\)\s*\{[^}]*animation-delay:\s*0\.45s/)
    })

    it('will-change: opacity, transform (GPU 优化)', () => {
      expect(css).toMatch(/\.stagger-item\s*\{[^}]*will-change:\s*opacity,\s*transform/)
    })
  })

  describe('a11y: prefers-reduced-motion: reduce fallback', () => {
    it('取消 .stagger-item animation', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.stagger-item\s*\{[^}]*animation:\s*none/)
    })

    it('取消 .card-interactive transition', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.card-interactive\s*\{[^}]*transition:\s*none/)
    })
  })

  describe('WordCard: className prop 透传 stagger-item', () => {
    it('WordCard 接口加 className?: string', () => {
      expect(wordCard).toMatch(/className\?:\s*string/)
    })

    it('div 渲染时 className 透传到 className 列表末尾', () => {
      expect(wordCard).toMatch(/\$\{\s*className\s*\|\|\s*''\s*\}/)
    })
  })

  describe('WordList 分页模式加 stagger-item', () => {
    it('分页模式 WordCard 传 className="stagger-item"', () => {
      expect(wordList).toMatch(/className="stagger-item"/)
    })
  })

  describe('Settings 加 stagger-item (3 sections)', () => {
    it('3 个 <section> 全部加 stagger-item (含 data-testid 那个)', () => {
      // 注意: line 89 后面带 data-testid, 简单 > 不匹配
      const count = (settings.match(/<section className="card stagger-item"/g) || []).length
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('虚拟列表模式不加 stagger (跟 scroll 冲突, W136 已优化)', () => {
      // VirtualList 跟分页是 2 选 1 (line 423 ? : line 442), 看 VirtualList 调用:
      //   <VirtualList ... renderItem={(word) => { ... return <WordCard ... /> }} />
      // VirtualList 模式 <WordCard> 不传 className="stagger-item"
      // 简化: 用 VirtualList 标识 + 第一个 WordCard 范围
      const virtualBlock = wordList.match(/<VirtualList[\s\S]*?\/>/)?.[0] || ''
      // virtualBlock 应不包含 stagger-item
      expect(virtualBlock.includes('stagger-item')).toBe(false)
    })
  })
})
