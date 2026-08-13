// tests/w133-synonyms-translation.test.ts - W133 同义词 + 翻译页 UI 改版稿落地
// 业务: 8 大激活功能页 UI 改造剩余 (W126 后续) — 同义词 (SynonymsButton + WordNetwork) + 翻译 (Translate)
// 跟 W123d + W124 + W126 风格一致: 0 emoji + Icon SVG + W123d 3 圆顶部 + W113 v2 card + 状态色 + motion token

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const readFile = (p: string) => readFileSync(p, 'utf-8') as string

describe('W133 — 同义词 + 翻译页 UI 改版稿', () => {
  const translate = readFile('src/pages/Translate.tsx')
  const synonymsBtn = readFile('src/components/SynonymsButton.tsx')
  const wordNet = readFile('src/components/WordNetwork.tsx')

  // ──────────────────────────────────────────────────────────────────
  // 共享规范: card card-interactive + 状态色 + motion token + 暗色 + tnum
  // ──────────────────────────────────────────────────────────────────
  describe('3 文件 共享规范 (W113 v2 card + 状态色 + motion)', () => {
    const files = { translate, synonymsBtn, wordNet } as const

    it('Translate + SynonymsButton 全用 card card-interactive (W113 v2)', () => {
      // WordNetwork 是 嵌 套 在 WordDetail 内 部 4 tab 组 件, 不 强 调 card 壳
      expect(translate, 'Translate 应包含 card card-interactive').toContain('card card-interactive')
      expect(synonymsBtn, 'SynonymsButton 应包含 card card-interactive').toContain('card card-interactive')
    })

    it('3 文件 全用 --state-success / --state-warning / --state-error 3 状态色', () => {
      for (const [name, src] of Object.entries(files)) {
        expect(src, `${name} 应包含 --state-success`).toMatch(/var\(--state-success\)/)
        expect(src, `${name} 应包含 --state-warning`).toMatch(/var\(--state-warning\)/)
      }
      // 至少 1 个 --state-error
      const errorCount = Object.values(files).filter(s => /var\(--state-error\)/.test(s)).length
      expect(errorCount, '至少 1 个文件应有 --state-error').toBeGreaterThanOrEqual(1)
    })

    it('3 文件 全用 motion token (duration-[var(--t-fast)] + ease-spring)', () => {
      for (const [name, src] of Object.entries(files)) {
        expect(src, `${name} duration-[var(--t-fast)]`).toMatch(/duration-\[var\(--t-fast\)\]/)
      }
      // 折叠箭头 ease-spring 至少 1 个
      const springCount = Object.values(files).filter(s => /ease-\[var\(--ease-spring\)\]/.test(s)).length
      expect(springCount).toBeGreaterThanOrEqual(1)
    })

    it('3 文件 全暗色兼容 (dark: 前缀)', () => {
      for (const [name, src] of Object.entries(files)) {
        expect(src, `${name} 暗色 dark: 前缀`).toMatch(/dark:/)
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // Translate.tsx — 翻译页
  // ──────────────────────────────────────────────────────────────────
  describe('Translate.tsx: W123d 顶 部 + 3 状态色 + sticky bottom + 0 emoji', () => {
    it('W123d 顶 部: 3 圆按 钮 + 标 题 居 中 + IconArrow (rotate-180)', () => {
      expect(translate).toMatch(/w-9 h-9 rounded-full/)
      expect(translate).toContain('IconArrow')
      expect(translate).toMatch(/inline-block rotate-180/)
      expect(translate).toMatch(/text-lg font-bold/)
    })

    it('Translate: 0 操作 emoji (W118 Icon 替)', () => {
      // 旧 emoji: 📋 (复制) ⇄ (交换) ⚠️ (警告) ✨ (标题装饰)
      expect(translate).not.toContain('📋')
      expect(translate).not.toContain('⚠️')
      expect(translate).not.toContain('✨')
      expect(translate).not.toContain('⇄')
      // 替 Icon: IconShare (复制) / IconClose (清空) / IconRefresh (交换) / IconSparkles (标题)
      expect(translate).toContain('IconShare')
      expect(translate).toContain('IconClose')
      expect(translate).toContain('IconRefresh')
      expect(translate).toContain('IconSparkles')
    })

    it('Translate: 0 select emoji 标签 (🔑 ✓ 🛠)', () => {
      // 旧 option 文本: {p.name}{p.apiKeyRequired ? ' 🔑' : ''}{p.free ? ' ✓' : ''}{!p.builtin ? ' 🛠' : ''}
      expect(translate).not.toContain('🔑')
      expect(translate).not.toContain('🛠')
      // 业务: 选 项 已 简 化 为 仅 p.name
      expect(translate).toMatch(/\{p\.name\}/)
    })

    it('Translate: W121 折叠 + localStorage 持久化', () => {
      // 业务: 渠道 + 方向 折 叠状 态
      expect(translate).toMatch(/openGroups.*localStorage|localStorage.*openGroups/)
      expect(translate).toContain('translate-open-groups-v1')
      expect(translate).toMatch(/aria-expanded=\{openGroups\./)
      // 折叠箭头 ease-spring rotate
      expect(translate).toMatch(/ease-\[var\(--ease-spring\)\]/)
      expect(translate).toMatch(/rotate\(-90deg\)/)
    })

    it('Translate: W123a sticky bottom + safe-area-inset-bottom', () => {
      // 移 动 端 提 交 按 钮 sticky bottom
      expect(translate).toMatch(/sticky bottom-0/)
      expect(translate).toMatch(/safe-area-inset-bottom/)
    })

    it('Translate: W120 SkeletonPage 加 载 + 大 圆 环 结 果 (W124 Bento)', () => {
      // Skeleton fallback
      expect(translate).toContain('SkeletonPage')
      expect(translate).toMatch(/if \(initialLoading\)/)
      // 大 圆 环 状 态 指 示 (翻 译 成 功)
      expect(translate).toMatch(/w-12 h-12 rounded-full/)
    })

    it('Translate: 3 状态色 完整 (success / warning / error)', () => {
      // 翻 译 页 错 误 (STATE_ERROR) + 字 数 警 告 (STATE_WARNING) + 成 功 (STATE_SUCCESS)
      expect(translate).toMatch(/var\(--state-success\)/)
      expect(translate).toMatch(/var\(--state-warning\)/)
      expect(translate).toMatch(/var\(--state-error\)/)
      // 字 数 状 态 色 (≤ 500 / > 500 / > 2000)
      expect(translate).toContain('showWarning')
      expect(translate).toContain('showError')
    })

    it('Translate: 数字用 font-mono tabular-nums (W113 排版)', () => {
      // 字 数 计 数 + font-mono
      expect(translate).toMatch(/font-mono tabular-nums/)
    })

    it('Translate: 拷贝状态 1.5s 反馈 (StateSuccess 微交互)', () => {
      // 业务: 拷贝后 1.5s 反 馈, 跟 W113 状态色一 致
      expect(translate).toContain('copied')
      expect(translate).toMatch(/setTimeout.*1500|1500.*setTimeout/)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // SynonymsButton.tsx — 同义词辨析
  // ──────────────────────────────────────────────────────────────────
  describe('SynonymsButton.tsx: 0 emoji + Icon SVG + 3 状态色', () => {
    it('SynonymsButton: 0 操作 emoji (W118 Icon 替)', () => {
      // 旧 emoji: ⏳ 🔀 ✕ 📦 📚 ⚠️ 💬
      expect(synonymsBtn).not.toContain('⏳')
      expect(synonymsBtn).not.toContain('🔀')
      expect(synonymsBtn).not.toContain('✕')
      expect(synonymsBtn).not.toContain('📦')
      expect(synonymsBtn).not.toContain('📚')
      expect(synonymsBtn).not.toContain('⚠️')
      expect(synonymsBtn).not.toContain('💬')
      // 替 Icon
      expect(synonymsBtn).toContain('IconRefresh')
      expect(synonymsBtn).toContain('IconSparkles')
      expect(synonymsBtn).toContain('IconClose')
      expect(synonymsBtn).toContain('IconBookOpen')
    })

    it('SynonymsButton: card card-interactive + 大圆环 (W124 Bento)', () => {
      expect(synonymsBtn).toContain('card card-interactive')
      // 大 圆 环 状 态 头
      expect(synonymsBtn).toMatch(/w-10 h-10 rounded-full/)
    })

    it('SynonymsButton: 3 状态色 + v1.6 setLoading 修复保留', () => {
      // 3 状态色
      expect(synonymsBtn).toMatch(/var\(--state-success\)/)
      expect(synonymsBtn).toMatch(/var\(--state-warning\)/)
      expect(synonymsBtn).toMatch(/var\(--state-error\)/)
      // 保留 v1.6 修复: setLoading(true) 在 try 前
      expect(synonymsBtn).toMatch(/setLoading\(true\)[\s\S]{0,200}try/)
      // 保留 防重复点击
      expect(synonymsBtn).toMatch(/if \(loading\) return/)
      // 保留 catch unknown 守卫 (v1.6 修复)
      expect(synonymsBtn).toMatch(/catch \(e: unknown\)/)
    })

    it('SynonymsButton: motion token + 暗色兼容 + 0 emoji 业务 文 字', () => {
      // motion token
      expect(synonymsBtn).toMatch(/duration-\[var\(--t-fast\)\]/)
      // 暗色
      expect(synonymsBtn).toMatch(/dark:/)
      // 0 emoji 业务文字
      expect(synonymsBtn).not.toContain('🔀')
      expect(synonymsBtn).not.toContain('⏳')
    })

    it('SynonymsButton: aria-label (a11y)', () => {
      // 业务: 屏 幕 阅 读 器 友 好 (动 态 文 字)
      expect(synonymsBtn).toMatch(/aria-label=/)
      expect(synonymsBtn).toContain('同义词')
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // WordNetwork.tsx — 4 tab 触类旁通
  // ──────────────────────────────────────────────────────────────────
  describe('WordNetwork.tsx: 4 tab 0 emoji + 状态色 + 空 态 Icon', () => {
    it('WordNetwork: 4 tab label 0 emoji', () => {
      // 旧 TABS: icon: '🌱' / '📚' / '⚖️' / '🔗'
      expect(wordNet).not.toContain('🌱')
      expect(wordNet).not.toContain('📚')
      expect(wordNet).not.toContain('⚖️')
      expect(wordNet).not.toContain('🔗')
      // tab 标 签 简 化: 同根/近义/反义/搭配
      expect(wordNet).toContain('同根')
      expect(wordNet).toContain('近义')
      expect(wordNet).toContain('反义')
      expect(wordNet).toContain('搭配')
    })

    it('WordNetwork: 0 emoji 业务 字符 (🆕/⏳ 等)', () => {
      // 旧: 🆕 (未学 标 记) ⏳ (加 载 中)
      expect(wordNet).not.toContain('🆕')
      expect(wordNet).not.toContain('⏳')
      // 替 Icon / 文 字: "新" (短 文 字) + IconRefresh
      expect(wordNet).toContain('IconRefresh')
      expect(wordNet).toContain('IconBookOpen')
    })

    it('WordNetwork: 3 状态色 + 暗色兼容', () => {
      // 3 状态色 (W113)
      expect(wordNet).toMatch(/var\(--state-success\)/)
      expect(wordNet).toMatch(/var\(--state-warning\)/)
      expect(wordNet).toMatch(/var\(--state-error\)/)
      // 暗色
      expect(wordNet).toMatch(/dark:/)
    })

    it('WordNetwork: aria-label + role=tab (a11y)', () => {
      // a11y: role=tab + role=tablist
      expect(wordNet).toContain('role="tablist"')
      expect(wordNet).toContain('role="tab"')
      expect(wordNet).toContain('role="tabpanel"')
      expect(wordNet).toMatch(/aria-selected=\{isActive\}/)
    })

    it('WordNetwork: motion token + font-mono tabular-nums', () => {
      expect(wordNet).toMatch(/duration-\[var\(--t-fast\)\]/)
      // "共 N 个" 用 font-mono
      expect(wordNet).toMatch(/font-mono tabular-nums/)
    })

    it('WordNetwork: 空 态 用 Icon (W118 替 emoji)', () => {
      // 旧: "暂无相关词" 纯 文 字 — 改 用 Icon + 文 字
      expect(wordNet).toContain('IconBookOpen')
      expect(wordNet).toContain('w-12 h-12 rounded-full')
      // 加 载 中 用 IconRefresh (非 ⏳)
      expect(wordNet).toMatch(/IconRefresh.*animate-spin|animate-spin.*IconRefresh/)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // 跨 文件 一 致 性
  // ──────────────────────────────────────────────────────────────────
  describe('跨 文件 0 emoji + 0 隐 形 破 坏', () => {
    it('3 文件 0 emoji (除 math 符号 ✓ 外)', () => {
      // 业务: 0 emoji 操 作 / 标 签 / 装 饰
      const emojiRe = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/u
      // 注: 2700-27BF 包含 ✓ (U+2713) — 不 在 emoji 区 间, 但 仍 检 查
      expect(emojiRe.test(translate), 'Translate 0 emoji').toBe(false)
      expect(emojiRe.test(synonymsBtn), 'SynonymsButton 0 emoji').toBe(false)
      expect(emojiRe.test(wordNet), 'WordNetwork 0 emoji').toBe(false)
    })

    it('3 文件 29 个 Icon 仍 然 可 用 (W136 P2-4 加 3 + W146 加 4: IconCheck/IconChart/IconDownload/IconTrash)', () => {
      const icon = readFile('src/components/Icon.tsx')
      const iconCount = (icon.match(/^export const Icon/gm) || []).length
      // W136 P2-4: ErrorBoundary 替 emoji, 加 3 个 Icon
      // W146: 反馈回路 + UsagePage dashboard 加 4 个 (IconCheck/IconChart/IconDownload/IconTrash)
      // 22 (W133) + 3 (W136 P2-4) + 4 (W146) = 29
      expect(iconCount, 'Icon.tsx 应 29 个 (W133: 22 + W136 P2-4: 3 + W146: 4)').toBe(29)
    })

    it('8 大激活 数据 不 变 (W133 限制: 不 改 同义词词组 / 翻译词库)', () => {
      const synonyms = readFile('src/data/synonyms.ts')
      const synP3 = readFile('src/data/synonyms-p3.ts')
      const translateProviders = readFile('src/lib/translate.ts')
      // 业务: 数据 行 数 不 减
      expect(synonyms.length, 'synonyms 数据 不 变').toBeGreaterThan(10000)
      expect(synP3.length, 'synonyms-p3 数据 不 变').toBeGreaterThan(0)
      expect(translateProviders.length, 'translate 渠 道 数据 不 变').toBeGreaterThan(1000)
    })
  })
})
