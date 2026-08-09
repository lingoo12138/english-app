// tests/w126-ui.test.ts - W126 4 大激活功能页面 UI 改版稿 落地
// 业务: 4 大页 (PronounceCustom / DictationPage / SpellingPage / ErrorHistoryPage) 0 emoji + Icon SVG
//      + W123d 3 圆 顶 部 + W113 v2 card + W124 Bento 大圆环 + W123a sticky bottom + Skeleton + 3 状态色

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const readFile = (p: string) => readFileSync(p, 'utf-8') as string

describe('W126 — 4 大激活功能页面 UI 改版稿', () => {
  const pronounce = readFile('src/pages/PronounceCustom.tsx')
  const dictation = readFile('src/pages/DictationPage.tsx')
  const spelling = readFile('src/pages/SpellingPage.tsx')
  const history = readFile('src/pages/ErrorHistoryPage.tsx')

  describe('PronounceCustom: W123d 顶 部 + Icon + 0 emoji', () => {
    it('W123d 顶 部 3 圆 按 钮 + 标 题 居 中', () => {
      // 业务: 返 回 圆 按 钮 + 标 题 + 入口 圆 按 钮 (W123d 风 格)
      expect(pronounce).toMatch(/w-9 h-9 rounded-full/)
      expect(pronounce).toMatch(/flex items-center justify-between/)
      expect(pronounce).toMatch(/text-lg font-bold/)
      // 返 回 IconArrow (rotate-180)
      expect(pronounce).toMatch(/inline-block rotate-180/)
    })

    it('PronounceCustom: 0 操 作 emoji (W118 替 代)', () => {
      // 旧 emoji: 🤷 (空 态) + ✨ (顶 部 装 饰) + 🎤 (口 播 提 示)
      expect(pronounce).not.toContain('🤷')
      expect(pronounce).not.toContain('✨')
      // 改 用 Icon: IconWaving / IconSparkles / IconArrow
      expect(pronounce).toContain('IconWaving')
      expect(pronounce).toContain('IconSparkles')
      expect(pronounce).toContain('IconArrow')
    })

    it('PronounceCustom: W121 折 叠 + localStorage 持 久 化', () => {
      // 业务: 跟读小贴士折 叠状 态, 跟 Layout 一 致 (W121 风 格)
      expect(pronounce).toMatch(/openTip.*localStorage|localStorage.*openTip/)
      expect(pronounce).toContain('pronounce-custom-open-groups')
      expect(pronounce).toMatch(/aria-expanded=\{openTip/)
      // 折叠箭 头 ease-spring rotate
      expect(pronounce).toMatch(/ease-\[var\(--ease-spring\)\]/)
      expect(pronounce).toMatch(/rotate\(-90deg\)/)
    })
  })

  describe('DictationPage: W113 3 状态色 + Skeleton + sticky bottom', () => {
    it('W123d 顶 部 + 重 新 抽 题 圆 按 钮 (3 圆)', () => {
      // 业务: 返 回 + 标 题 + 重 新 抽 题 圆 按 钮
      expect(dictation).toMatch(/w-9 h-9 rounded-full/)
      expect(dictation).toContain('IconRefresh')
      expect(dictation).toMatch(/重新抽题/)
    })

    it('DictationPage: 0 操 作 emoji (全 Icon 替)', () => {
      // 旧: 🎧 🎤 ⏹ 🔊 ⭐ 📚 ✓ ⚠ 📊 🎉
      expect(dictation).not.toContain('🎧')
      expect(dictation).not.toContain('🎤')
      expect(dictation).not.toContain('⏹')
      expect(dictation).not.toContain('🔊')
      expect(dictation).not.toContain('⭐')
      expect(dictation).not.toContain('📚')
      // 替 Icon: IconHeadphones / IconMic / IconMicOff / IconStar / IconBook
      expect(dictation).toContain('IconHeadphones')
      expect(dictation).toContain('IconMic')
      expect(dictation).toContain('IconMicOff')
      expect(dictation).toContain('IconStar')
    })

    it('DictationPage: W113 3 状态 色 (success / warning / error) 大 圆 环', () => {
      // 业务: 反 馈 圆 环 + 难度 选 择 3 色
      expect(dictation).toMatch(/--state-success/)
      expect(dictation).toMatch(/--state-warning/)
      expect(dictation).toMatch(/--state-error/)
      // 大 圆 环 W124 Bento
      expect(dictation).toMatch(/w-24 h-24 rounded-full/)
    })

    it('DictationPage: W120 Skeleton 加 载 + W123a sticky bottom + safe-area', () => {
      // 加 载 fallback
      expect(dictation).toContain('SkeletonPage')
      expect(dictation).toMatch(/if \(loading\) \{/)
      // 移 动 端 input sticky bottom
      expect(dictation).toMatch(/sticky bottom-0/)
      expect(dictation).toMatch(/safe-area-inset-bottom/)
    })

    it('DictationPage: 难度 3 色 (替 DIFF_EMOJI 🌱🌿🌳)', () => {
      // 旧 DIFF_EMOJI 已 删
      expect(dictation).not.toContain('DIFF_EMOJI')
      expect(dictation).not.toContain('🌱')
      expect(dictation).not.toContain('🌿')
      expect(dictation).not.toContain('🌳')
      // 新 DIFF_STYLE: 3 状态色
      expect(dictation).toContain('DIFF_STYLE')
      expect(dictation).toMatch(/border-emerald-500/)
      expect(dictation).toMatch(/border-amber-500/)
      expect(dictation).toMatch(/border-rose-500/)
    })
  })

  describe('SpellingPage: W113 3 状态色 + Skeleton + sticky bottom', () => {
    it('W123d 顶 部 + 重 新 抽 词 圆 按 钮', () => {
      expect(spelling).toMatch(/w-9 h-9 rounded-full/)
      expect(spelling).toContain('IconEdit')
      expect(spelling).toContain('IconRefresh')
      expect(spelling).toMatch(/重新抽词/)
    })

    it('SpellingPage: 0 操 作 emoji', () => {
      // 旧: ✏️ 🌱 🌿 🌳 🔊 🎉
      expect(spelling).not.toContain('✏️')
      expect(spelling).not.toContain('🌱')
      expect(spelling).not.toContain('🌿')
      expect(spelling).not.toContain('🌳')
      expect(spelling).not.toContain('🔊')
      // 替 Icon
      expect(spelling).toContain('IconEdit')
      expect(spelling).toContain('IconHeadphones')
    })

    it('SpellingPage: W120 Skeleton + W123a sticky bottom', () => {
      expect(spelling).toContain('SkeletonPage')
      expect(spelling).toMatch(/if \(loading\) \{/)
      // 移 动 端 input sticky bottom
      expect(spelling).toMatch(/sticky bottom-0/)
      expect(spelling).toMatch(/safe-area-inset-bottom/)
    })

    it('SpellingPage: 大 圆 环 反 馈 (W124 Bento) + 3 状态 色', () => {
      // 大 圆 环 + 3 色 边 框
      expect(spelling).toMatch(/w-24 h-24 rounded-full/)
      expect(spelling).toMatch(/--state-success/)
      expect(spelling).toMatch(/--state-warning/)
      expect(spelling).toMatch(/--state-error/)
      // 难 度 3 色
      expect(spelling).toContain('DIFF_STYLE')
    })
  })

  describe('ErrorHistoryPage: W124 Bento + W121 折 叠 + Icon source', () => {
    it('W123d 顶 部 + 清 除 圆 按 钮 (替 🗑️)', () => {
      // 旧: 🗑️ emoji 清 除 按 钮
      expect(history).not.toContain('🗑️')
      expect(history).not.toContain('📊')
      // 替 Icon: IconClose + IconBarChart
      expect(history).toContain('IconClose')
      expect(history).toContain('IconBarChart')
      // 3 圆 按 钮 顶 部
      expect(history).toMatch(/w-9 h-9 rounded-full/)
    })

    it('ErrorHistoryPage: 0 操 作 emoji (source label 替 Icon)', () => {
      // 旧: ✍️ 💬 🇨🇳 🎧 🔤 🎤 📊 📋 🎯 ⭐ 👀 ⚠️ 🔁
      expect(history).not.toContain('✍️')
      expect(history).not.toContain('💬')
      expect(history).not.toContain('🇨🇳')
      expect(history).not.toContain('🎧')
      expect(history).not.toContain('🔤')
      expect(history).not.toContain('🎤')
      // 替 SOURCE_META + Icon
      expect(history).toContain('SOURCE_META')
      expect(history).toContain('IconEdit')
      expect(history).toContain('IconChat')
      expect(history).toContain('IconHeadphones')
    })

    it('ErrorHistoryPage: W124 大 圆 环 (ProgressRing SVG) + W121 折 叠', () => {
      // 业务: 大 圆 环 已 掌 握 / 总 进 度
      expect(history).toMatch(/ProgressRing/)
      expect(history).toMatch(/svg width=\{size\}/)
      // strokeDasharray SVG 圆 环
      expect(history).toMatch(/strokeDasharray/)
      // W121 折 叠 + localStorage
      expect(history).toContain('error-history-open-groups')
      expect(history).toMatch(/openGroups.*localStorage|localStorage.*openGroups/)
      expect(history).toMatch(/aria-expanded=\{openGroups/)
    })

    it('ErrorHistoryPage: W113 3 状态 色 进 度 条 + W120 Skeleton', () => {
      // 3 状态色 progress bar
      expect(history).toMatch(/var\(--state-success\)/)
      expect(history).toMatch(/var\(--state-warning\)/)
      expect(history).toMatch(/var\(--state-error\)/)
      // Skeleton
      expect(history).toContain('SkeletonPage')
      expect(history).toMatch(/if \(loading\) \{/)
    })
  })

  describe('4 页 共 规 范: card card-interactive + motion token + 暗色 + tnum', () => {
    const pages = { pronounce, dictation, spelling, history }

    it('4 页 全 用 card card-interactive (W113 v2)', () => {
      for (const [name, src] of Object.entries(pages)) {
        expect(src, `${name} 应 包含 card card-interactive`).toContain('card card-interactive')
      }
    })

    it('4 页 全 用 motion token (duration + ease-spring)', () => {
      for (const [name, src] of Object.entries(pages)) {
        expect(src, `${name} duration-[var(--t-fast)]`).toMatch(/duration-\[var\(--t-fast\)\]/)
      }
      // 折 叠箭 头 至 少 2 页 用 ease-spring
      const springCount = Object.values(pages).filter(s => /ease-\[var\(--ease-spring\)\]/.test(s)).length
      expect(springCount).toBeGreaterThanOrEqual(2)
    })

    it('4 页 全 暗 色 兼 容 (dark: 前 缀)', () => {
      for (const [name, src] of Object.entries(pages)) {
        expect(src, `${name} 暗 色 dark: 前 缀`).toMatch(/dark:/)
      }
    })

    it('4 页 全 数字 用 font-mono tabular-nums (W113 排版)', () => {
      for (const [name, src] of Object.entries(pages)) {
        expect(src, `${name} font-mono tabular-nums`).toMatch(/font-mono tabular-nums/)
      }
    })
  })
})
