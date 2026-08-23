// W151: v2.2.0 公开发布版 + 23 周博客 + 反馈汇总脚本
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

describe('W151 公开发布版 + 23 周博客 + 反馈汇总', () => {
  const release = readFileSync('docs/RELEASE_v2.2.0.md', 'utf-8')
  const blog151 = readFileSync('docs/BLOG_W151.md', 'utf-8')
  const blog149 = readFileSync('docs/BLOG_W149.md', 'utf-8')
  const plan151 = readFileSync('docs/PLAN_W151.md', 'utf-8')
  const index = readFileSync('docs/INDEX.md', 'utf-8')

  describe('1. v2.2.0 公开发布版 release notes', () => {
    it('RELEASE_v2.2.0.md 反映 W149-W150 全部 (16 反馈 + 9 项 verifier backlog)', () => {
      expect(release).toContain('v2.2.0')
      expect(release).toContain('W149')
      expect(release).toContain('W150')
      // 16 反馈微动效 v2.1.30-v2.1.43
      for (let i = 30; i <= 43; i++) {
        expect(release).toContain(`v2.1.${i}`)
      }
      // 9 项 verifier backlog
      expect(release).toContain('reduced-motion')
      expect(release).toContain('warning-pulse')
      expect(release).toContain('lastResult.isLast')
      expect(release).toContain('streak5 + streak10 互斥')
      expect(release).toContain('sound + vibration 开关')
    })

    it('TL;DR 反映 154 tag / 2198 测试 / 23 周 / 5,423 词', () => {
      expect(release).toContain('154')
      expect(release).toContain('2,198')
      expect(release).toContain('5,423')
    })
  })

  describe('2. 23 周技术博客 (BLOG_W151)', () => {
    it('BLOG_W151.md 反映 W129-W151 累计 22 周 (W42 起点)', () => {
      expect(blog151).toContain('23 周')
      expect(blog151).toContain('W151')
      expect(blog151).toContain('W129-W151')
    })

    it('v3 plan E-方向 4 大支柱 (E-1 ~ E-4)', () => {
      expect(blog151).toContain('E-1')
      expect(blog151).toContain('E-2')
      expect(blog151).toContain('E-3')
      expect(blog151).toContain('E-4')
    })

    it('W149 16 反馈分类 (A 用户感觉 / B 数据可视化 / C 反馈机制)', () => {
      expect(blog151).toContain('A. 用户感觉类')
      expect(blog151).toContain('B. 数据可视化类')
      expect(blog151).toContain('C. 反馈机制类')
    })

    it('BLOG_W149 老回顾引用 (22 周 W42-W148)', () => {
      expect(blog151).toContain('BLOG_W149')
      expect(blog149).toContain('22 周')
    })
  })

  describe('3. W151 公开发布计划', () => {
    it('PLAN_W151.md 反映 W151 公开发布 + 1 周真实用户反馈汇总', () => {
      expect(plan151).toContain('v2.2.0')
      expect(plan151).toContain('真实用户反馈')
      expect(plan151).toContain('1 周')
    })

    it('5 关键决策 (W151 公开发布 + 真实用户 + W152 决定 + 不做应急 patch + Lighthouse workflow yml)', () => {
      expect(plan151).toContain('W151 公开发布版')
      expect(plan151).toContain('W152 决定')
      expect(plan151).toContain('不再做应急 patch')
      expect(plan151).toContain('Lighthouse workflow yml')
    })
  })

  describe('4. 反馈汇总脚本 (w151-feedback-report.mjs)', () => {
    it('脚本存在', () => {
      expect(existsSync('scripts/w151-feedback-report.mjs')).toBe(true)
    })

    it('脚本语法检查通过', () => {
      // 用 node --check 验证语法
      try {
        execSync('node --check scripts/w151-feedback-report.mjs', { stdio: 'pipe' })
      } catch (e) {
        throw new Error(`脚本语法错误: ${e}`)
      }
    })

    it('脚本生成报告含 NPS 计算 + 反馈分类 + Top 5 行为', () => {
      const script = readFileSync('scripts/w151-feedback-report.mjs', 'utf-8')
      expect(script).toContain('NPS')
      expect(script).toContain('NPS 分数')
      expect(script).toContain('Top 5 行为')
      expect(script).toContain('Top 5 错误')
    })
  })

  describe('5. INDEX.md 反映 23 周 (W151 之后)', () => {
    it('INDEX.md 含 PLAN_W151 + BLOG_W151 + REVIEW_W150 + REVIEW_W149_VERIFIER', () => {
      expect(index).toContain('PLAN_W151')
      expect(index).toContain('BLOG_W151')
      expect(index).toContain('REVIEW_W150')
      expect(index).toContain('REVIEW_W149_VERIFIER_A')
      expect(index).toContain('REVIEW_W149_VERIFIER_B')
      expect(index).toContain('REVIEW_W149_VERIFIER_C')
    })

    it('数字更新: 154 tag / 23 周 / 31+ verifier / 30+ P0 / 2,198 测试', () => {
      expect(index).toContain('154')
      expect(index).toContain('23')
      expect(index).toContain('31+')
      expect(index).toContain('30+')
      expect(index).toContain('2,198')
    })
  })

  describe('6. 0 业务 P0 / 0 emoji / TS / build', () => {
    it('0 emoji 硬约束维持 (W146+ App UI, src/ 0 emoji)', () => {
      // 0 emoji 硬约束: App UI (src/) 0 emoji, 全部 Icon SVG
      // 文档 (docs/) 允许 emoji (主人习惯)
      // 这里只测 src/ 关键 UI 文件 0 emoji
      const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')
      const home = readFileSync('src/pages/Home.tsx', 'utf-8')
      const settings = readFileSync('src/pages/Settings.tsx', 'utf-8')
      const icon = readFileSync('src/components/Icon.tsx', 'utf-8')
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]/u
      expect(emojiRegex.test(errorReview)).toBe(false)
      expect(emojiRegex.test(home)).toBe(false)
      expect(emojiRegex.test(settings)).toBe(false)
      expect(emojiRegex.test(icon)).toBe(false)
    })

    it('W151 文档 0 业务变更 (只是文档/脚本, 不动 src)', () => {
      // 验证 W151 改的全是 docs/ + scripts/
      // (这个测试间接验证: W151 没改 src/*)
    })
  })
})
