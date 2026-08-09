// tests/w120-skeleton-w121-groups.test.ts - W120 Skeleton + W121 4 大 组 折 叠
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W120 Skeleton 反 馈 层', () => {
  const skeleton = readFileSync('src/components/Skeleton.tsx', 'utf-8')
  const app = readFileSync('src/App.tsx', 'utf-8')

  it('Skeleton 模 板 5 个 出 口 (Base/WordCard/WordList/MainCTA/Page)', () => {
    // 业 务: 5 个 出 口 覆 盖 5 种 加 载 场 景
    expect(skeleton).toMatch(/export function Skeleton\(/)
    expect(skeleton).toMatch(/export function SkeletonWordCard\(/)
    expect(skeleton).toMatch(/export function SkeletonWordList\(/)
    expect(skeleton).toMatch(/export function SkeletonMainCTA\(/)
    expect(skeleton).toMatch(/export function SkeletonPage\(/)
  })

  it('Skeleton 用 animate-pulse (Tailwind 内 置, 0 额 外 依 赖)', () => {
    // 业 务: 0 额 外 依 赖, 用 Tailwind 内 置 pulse
    expect(skeleton).toContain('animate-pulse')
    expect(skeleton).not.toMatch(/from ['"]@?skeleton/)
  })

  it('Skeleton 灰 色 配 置 (stone-200 light / stone-700 dark)', () => {
    // 业 务: 暗 色 模 式 配 套
    expect(skeleton).toMatch(/bg-stone-200 dark:bg-stone-700/)
  })

  it('App.tsx Suspense fallback 改 用 SkeletonPage (替 "加 载 中...")', () => {
    // 业 务: SPA 整 页 加 载 改 Skeleton 脉 冲 灰, 友 好 反 馈
    expect(app).toMatch(/import \{ SkeletonPage \} from '\.\/components\/Skeleton'/)
    expect(app).toMatch(/<SkeletonPage \/>/)
    expect(app).not.toMatch(/加载中\.\.\./)
  })
})

describe('W121 22 项 侧 栏 收 敛 4 大 组', () => {
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')

  it('4 大 组 定 义 (学 习/练 习/复 习/设 置)', () => {
    // 业 务: 22 项 → 4 大 组 收 敛
    expect(layout).toMatch(/label: '学习'/)
    expect(layout).toMatch(/label: '练习'/)
    expect(layout).toMatch(/label: '复习'/)
    expect(layout).toMatch(/label: '设置'/)
  })

  it('4 大 组 22 项 全 存 在 (只 是 折 叠)', () => {
    // 业 务: 22 项 原 始 项 源 码 全 存 在
    const requiredItems = ['首页', '词库', '场景课', '每日一句', 'AI', '计划', '写作',
      '错题', '错题统计', '听力', '报告', '翻译', '生词本', '课文', '填空',
      '听写', '拼写', '释义收藏', '跟读趋势', '成就', '设置', '文档']
    for (const item of requiredItems) {
      expect(layout).toContain(item)
    }
  })

  it('openGroups 状 态 默 认 "学 习" 展 开, 其 余 折 叠', () => {
    // 业 务: 默 认 仅 学 习 组 展 开, 其 余 折 叠, 减 少 视 觉 噪 音
    expect(layout).toMatch(/学习: true/)
    expect(layout).toMatch(/练习: false/)
    expect(layout).toMatch(/复习: false/)
    expect(layout).toMatch(/设置: false/)
  })

  it('openGroups 持 久 化 到 localStorage (W104 风格)', () => {
    // 业 务: 折 叠 状 态 跨 刷 新 保留
    expect(layout).toContain('layout-open-groups')
  })

  it('折 叠 按 钮 aria-expanded (a11y)', () => {
    // 业 务: 屏 幕 阅 读 器 友 好
    expect(layout).toMatch(/aria-expanded=\{isOpen\}/)
  })

  it('折 叠 箭 头 用 ease-spring 旋 转 (W113 motion token)', () => {
    // 业 务: 折 叠/展 开 弹 簧 动 效
    expect(layout).toMatch(/ease-\[var\(--ease-spring\)\]/)
    expect(layout).toMatch(/rotate\(0deg\)|rotate\(-90deg\)/)
  })
})
