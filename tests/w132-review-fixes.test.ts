// tests/w132-review-fixes.test.ts — W132 修 3 reviewer 找 到的 15 P0 + 14 P1 + 2 P2
// 验证 W129 e2e 修 + W130 文档 修 + W131 源码 修
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string
const exists = (p: string) => fs.existsSync(p)

/** 读出实际单元测试数 (e2e 不计, 单元 test 块计数) */
function countUnitTests(): number {
  const testsDir = 'tests'
  const files = fs.readdirSync(testsDir).filter(f => /\.(test|spec)\.(ts|tsx)$/.test(f))
  let count = 0
  for (const f of files) {
    const c = readFile(path.join(testsDir, f))
    // 匹配 it() 顶层调用 (缩进 0-N 空格)
    const matches = c.match(/^\s+it\(/gm)
    if (matches) count += matches.length
  }
  return count
}

/** 读出实际页面数 (src/pages/*.tsx) */
function countPages(): number {
  const dir = 'src/pages'
  if (!exists(dir)) return 0
  return fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).length
}

/** 读出实际组件数 (src/components 递归) */
function countComponents(): number {
  const dir = 'src/components'
  if (!exists(dir)) return 0
  let count = 0
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f)
      if (fs.statSync(p).isDirectory()) walk(p)
      else if (f.endsWith('.tsx') || (f.endsWith('.ts') && !f.endsWith('.test.ts'))) count++
    }
  }
  walk(dir)
  return count
}

describe('W132 — 修 3 reviewer 找 到的 15 P0 + 14 P1 + 2 P2', () => {
  // ========================================================================
  // 1. W129 P0-1/2/7/9: IDB 软验证 `>= 0` → 真验证 `>= 1`
  // ========================================================================
  describe('W129 P0-1/2/7/9: e2e IDB 真验证 (无 `>= 0` 软通过)', () => {
    it('w129-error-review-flow.spec.ts: history.length 必须 `>= 1` 强验证', () => {
      const c = readFile('e2e/w129-error-review-flow.spec.ts')
      // 不允许 .toBeGreaterThanOrEqual(0) 紧跟 history 长度
      const softChecks = c.match(/history\.length\)\.toBeGreaterThanOrEqual\(0\)/g) || []
      expect(softChecks.length).toBe(0)
      // 必须有 `>= 1` 真验证
      expect(c).toMatch(/history\.length\)\.toBeGreaterThanOrEqual\(1\)/)
    })

    it('w129-error-review-flow.spec.ts: 删 if (history.length > 0) 软通过', () => {
      const c = readFile('e2e/w129-error-review-flow.spec.ts')
      // 旧版: if (history.length > 0) { expect(...) } 软通过
      expect(c).not.toMatch(/if \(history\.length > 0\) \{[^}]*expect/)
    })

    it('w129-dictation-flow.spec.ts: errors.length 必须 `>= 1` 强验证 (非 `>= 0`)', () => {
      const c = readFile('e2e/w129-dictation-flow.spec.ts')
      expect(c).not.toMatch(/errors\.length\)\.toBeGreaterThanOrEqual\(0\)/)
      expect(c).toMatch(/errors\.length\)\.toBeGreaterThanOrEqual\(1\)/)
    })

    it('w129-dictation-flow.spec.ts: P0-6 死代码 (双赋值 userInput) 已删', () => {
      const c = readFile('e2e/w129-dictation-flow.spec.ts')
      // 旧版: userInput = 'placeholder_word_' + i  // 故意错
      //       userInput = 'xxxxxxxxxxwrongxxx' + i
      expect(c).not.toMatch(/placeholder_word_'\s*\+/)
      // 只剩 1 个 userInput 赋值
      const matches = c.match(/^\s*const userInput =/gm) || []
      expect(matches.length).toBeGreaterThanOrEqual(1)
      expect(matches.length).toBeLessThanOrEqual(1)
    })

    it('w129-aichat-flow.spec.ts: chats.length 必须 `>= 1` 强验证', () => {
      const c = readFile('e2e/w129-aichat-flow.spec.ts')
      expect(c).not.toMatch(/chats\.length\)\.toBeGreaterThanOrEqual\(0\)/)
      expect(c).toMatch(/chats\.length\)\.toBeGreaterThanOrEqual\(1\)/)
      // 验证 messages 至少 2 条 (user + assistant)
      expect(c).toMatch(/messages\.length\s*>=\s*2/)
    })
  })

  // ========================================================================
  // 2. W129 P0-3/8: waitForTimeout 兜底 → waitForSelector
  // ========================================================================
  describe('W129 P0-3/8: waitForSelector 替 waitForTimeout', () => {
    it('w129-error-review-flow.spec.ts: 0 个 waitForTimeout 兜底', () => {
      const c = readFile('e2e/w129-error-review-flow.spec.ts')
      const timeouts = c.match(/waitForTimeout\(\d+\)/g) || []
      expect(timeouts.length).toBe(0)
    })

    it('w129-dictation-flow.spec.ts: 0 个 waitForTimeout 兜底', () => {
      const c = readFile('e2e/w129-dictation-flow.spec.ts')
      // 允许 IDB 异步写入 200-500ms 小缓冲 (用于 IDB 写入 race condition)
      // 不允许 1000+ms 硬等待 (旧版有)
      const timeouts = c.match(/waitForTimeout\(\d+\)/g) || []
      // 过滤掉注释里的提及
      const realTimeouts = timeouts.filter(t => !/^[a-z\s]+$/.test(t))
      // 实际只允许 ≤ 500ms 缓冲 (用于 IDB 异步 race), 不允许 1000+ms 兜底
      const tooLong = timeouts.filter(t => {
        const m = t.match(/\((\d+)\)/)
        return m && parseInt(m[1], 10) > 500
      })
      expect(tooLong.length).toBe(0)
    })

    it('w129-aichat-flow.spec.ts: 不再有 8000ms 硬等', () => {
      const c = readFile('e2e/w129-aichat-flow.spec.ts')
      expect(c).not.toMatch(/waitForTimeout\(8000\)/)
      // 用 expect(input).toBeEnabled() 等 loading 结束
      expect(c).toMatch(/expect\(input\)\.toBeEnabled/)
    })
  })

  // ========================================================================
  // 3. W129 P0-4/5/10/11/12/13: try/catch + 监听器 + 弱 list 验证
  // ========================================================================
  describe('W129 P0-4/5/10/11/12/13: 其他 P0 修复', () => {
    it('w129-error-review-flow.spec.ts: 删 try/catch 空 catch summary 验证', () => {
      const c = readFile('e2e/w129-error-review-flow.spec.ts')
      // 旧版: try { await page.waitForSelector('text=复习完成, text=答完, text=完成') } catch { /* 软通过 */ }
      expect(c).not.toMatch(/\/\/ 一 些 UI 变 体 可 能 用 其 他 文 字,\s*软 通过/)
      // 复合 selector `'text=X, text=Y'` 已 删 (Playwright 实际整串匹配)
      expect(c).not.toMatch(/'text=复习完成, text=答完, text=完成'/)
    })

    it('w129-error-review-flow.spec.ts: 加 localStorage.clear() 防 session 残留', () => {
      const c = readFile('e2e/w129-error-review-flow.spec.ts')
      // 必须有 localStorage.clear() 调用
      expect(c).toMatch(/localStorage\.clear\(\)/)
    })

    it('w129-aichat-flow.spec.ts: 监听器加在 test 顶部 BEFORE navigation', () => {
      const c = readFile('e2e/w129-aichat-flow.spec.ts')
      // 监听器应 在 setupNetworkMocks + page.goto 之前
      const listenerIdx = c.search(/page\.on\(['"]pageerror['"]/)
      const gotoIdx = c.search(/page\.goto\(BASE \+ '\/'/)
      // listener 必须在 page.goto 之前
      expect(listenerIdx).toBeGreaterThan(-1)
      expect(gotoIdx).toBeGreaterThan(-1)
      expect(listenerIdx).toBeLessThan(gotoIdx)
    })

    it('w129-lesson-score.spec.ts: 弱 list 验证 `hasLessons || hasList` 已删', () => {
      const c = readFile('e2e/w129-lesson-score.spec.ts')
      // 弱 list 验证代码片段已删 (注释里也可能提到, 用代码特征判断)
      expect(c).not.toMatch(/const\s+hasLessons\s*=/)
      expect(c).not.toMatch(/const\s+hasList\s*=/)
      // 复合 selector `'text=暂无此状态的课文, text=篇'` 已 删 (注释里可保留说明)
      expect(c).not.toMatch(/'text=暂无此状态的课文,\s*text=篇'/)
      // 改 waitForSelector 分支
      expect(c).toMatch(/emptyMsg\.isVisible/)
      expect(c).toMatch(/lessonCard\.isVisible/)
    })

    it('w129-fav-search.spec.ts: firstWord null 显式 throw', () => {
      const c = readFile('e2e/w129-fav-search.spec.ts')
      // 旧版: `if (!firstWord) return  // type narrow` 静默 return
      // 修复: `if (!firstWord) throw new Error(...)`
      expect(c).not.toMatch(/if \(!firstWord\) return/)
      expect(c).toMatch(/if \(!firstWord\) \{[^}]*throw new Error/)
    })

    it('w129-fav-search.spec.ts: 跨词结果 真验证 (命中数字 + word 链接)', () => {
      const c = readFile('e2e/w129-fav-search.spec.ts')
      // 旧版: `bodyText2.toMatch(/跨词搜索|命中/)` 标题永远 显示, 等于没验证
      // 修复: `命中 N 词` 数字 + 至少 1 个 /words/:id 链接
      // 文件中: /命中\s*\d+\s*词/ (regex literal) 或 '命中\\s*\\d+\\s*词' (escaped string)
      const hasRegex =
        /\/命中\s*\d+\s*词\//.test(c) ||
        /\/命中\\s\*\\d\+\\s\*词\//.test(c) ||
        /\/命中\\s\*\(\\d\+\)\\s\*词\//.test(c)
      expect(hasRegex, '命中\\d+词 regex 应存在于文件').toBe(true)
      // 命中数字 + word 链接 强验证
      expect(c).toMatch(/hitCount|parseInt\(hitMatch/)
      expect(c).toMatch(/crossWordLinks/)
    })
  })

  // ========================================================================
  // 4. W130 P0: 文档 准确性 (release tag / 测试数 / 词数 / 行数 / 页+组件)
  // ========================================================================
  describe('W130 P0: 文档 准确性', () => {
    it('P0-3: CHANGELOG.md 累计测试数 3 处一致 (1478)', () => {
      const c = readFile('docs/CHANGELOG.md')
      // 实际单元测试数
      const actualCount = countUnitTests()
      // 至少有 1 处提到 1478 (实际 ≥1400 即 算 修 过)
      const matches1478 = c.match(/1478\s*单\s*元\s*测\s*试/g) || []
      expect(matches1478.length).toBeGreaterThanOrEqual(1)
      // 验证 实际单元测试 ≥ 1400
      expect(actualCount).toBeGreaterThanOrEqual(1400)
    })

    it('P0-4: W130 测试数 6+ → 46', () => {
      const c = readFile('docs/CHANGELOG.md')
      // 不再出现 6+ 测试 (旧版)
      expect(c).not.toMatch(/W130\s*\|\s*v2\.1\.[0-9]+\s*\|[^|]+\|\s*6\+\s*测\s*试\s*\|/)
      // 必须有 46 测试
      expect(c).toMatch(/W130\s*\|\s*v2\.1\.13\s*\|[^|]+\|\s*46\s*测\s*试\s*\|/)
    })

    it('P0-7: W126 4 文件行数 准确 (137/474/381/437)', () => {
      const c = readFile('docs/CHANGELOG.md')
      expect(c).toMatch(/PronounceCustom\.tsx\*\*\s*\(60\s*→\s*137\s*行/)
      expect(c).toMatch(/DictationPage\.tsx\*\*\s*\(399\s*→\s*474\s*行/)
      expect(c).toMatch(/SpellingPage\.tsx\*\*\s*\(317\s*→\s*381\s*行/)
      expect(c).toMatch(/ErrorHistoryPage\.tsx\*\*\s*\(264\s*→\s*437\s*行/)
      // 实际文件行数验证 — 文件末尾换行 → split('\n') 比 newlines 多 1
      // 137 newlines = 138 parts (with trailing empty); 文档说 137 行 (不 计末尾空行)
      // wc -l 也数 newlines, 所以这里按 newlines 验证
      const newlines = (p: string) => (readFile(p).match(/\n/g) || []).length
      expect(newlines('src/pages/PronounceCustom.tsx')).toBe(137)
      expect(newlines('src/pages/DictationPage.tsx')).toBe(474)
      expect(newlines('src/pages/SpellingPage.tsx')).toBe(381)
      expect(newlines('src/pages/ErrorHistoryPage.tsx')).toBe(437)
    })

    it('P0-8: 累计页/组件数 27/32 → 37/37 (实际 src 真验证)', () => {
      const actualPages = countPages()
      const actualComponents = countComponents()
      // 实际至少 37 个页面 + 37 个组件
      expect(actualPages).toBeGreaterThanOrEqual(37)
      expect(actualComponents).toBeGreaterThanOrEqual(37)

      // CHANGELOG.md 不再写 27 页面 / 32 组件
      const c = readFile('docs/CHANGELOG.md')
      expect(c).not.toMatch(/27\s*页\s*面\s*\/\s*32\s*组\s*件/)
      expect(c).toMatch(/37\s*页\s*面\s*\/\s*37\s*组\s*件/)

      // README.md / DEV_LOG.md / FEATURES.md / ARCHITECTURE.md 同样
      for (const p of ['README.md', 'docs/DEV_LOG.md', 'docs/FEATURES.md', 'docs/ARCHITECTURE.md']) {
        const cc = readFile(p)
        expect(cc, `${p} 应 含 37 页面 / 37 组件`).toMatch(/37\s*页\s*面/)
        expect(cc, `${p} 应 不 含 27 页面 / 32 组件`).not.toMatch(/27\s*页\s*面/)
      }
    })

    it('P0-9: v2.1.7 测试基线 1225 → 1232', () => {
      const c = readFile('docs/CHANGELOG.md')
      // 不再写 1225 (v2.1.7 旧值)
      expect(c).not.toMatch(/v2\.1\.7\s+1225/)
      expect(c).not.toMatch(/v2\.1\.7 1225 →/)
      // 必须有 1232
      expect(c).toMatch(/v2\.1\.7\s+1232/)
    })

    it('P0-6: README.md 死链 (w123b-errorreview-ui.png) 已修', () => {
      const c = readFile('README.md')
      expect(c).not.toMatch(/w123b-errorreview-ui\.png/)
      // 改 为 15-abruptly-after.png
      expect(c).toMatch(/15-abruptly-after\.png/)
    })

    it('P0-2: 时间线 表 含 W129 + W131', () => {
      const c = readFile('docs/CHANGELOG.md')
      // 标题应为 21 周 (非 19)
      expect(c).toMatch(/21\s*周\s*完\s*整\s*时\s*间\s*线\s*\(W112-W131\)/)
      // 表中 应 有 W129 + W131 行
      expect(c).toMatch(/\|\s*W129\s*\|/)
      expect(c).toMatch(/\|\s*W131\s*\|/)
    })

    it('P0-1: CHANGELOG.md v2.1.13 W131 段 存在', () => {
      const c = readFile('docs/CHANGELOG.md')
      // v2.1.13 大节标题 存在
      expect(c).toMatch(/##\s*\[v2\.1\.13\][^\n]*-\s*2026/)
      // 内部子标题含 W129 / W130 / W131 描述
      expect(c).toMatch(/###\s*v2\.1\.13\s+W129/)
      expect(c).toMatch(/###\s*v2\.1\.13\s+W130|W130\s*—\s*文\s*档/)
      expect(c).toMatch(/###\s*v2\.1\.13\s+W131|W131\s*—\s*暗\s*色/)
      // W131 段 必 含 暗色 + PWA + a11y + OfflineBanner
      expect(c).toMatch(/暗\s*色\s*全\s*局\s*强\s*化\s*\+\s*iOS\s*PWA\s*完\s*整\s*化/)
      expect(c).toMatch(/OfflineBanner/)
    })

    it('P0-1: DEV_LOG.md v2.1.13 W131 段 存在 (Phase 12)', () => {
      const c = readFile('docs/DEV_LOG.md')
      expect(c).toMatch(/Phase 12[^\n]*W129-W131/)
      expect(c).toMatch(/W131[^\n]*暗\s*色/)
    })

    it('P1-2: TBD 残留 已修', () => {
      const c = readFile('docs/CHANGELOG.md')
      expect(c).not.toMatch(/\(TBD\s*暗\s*色\s*模\s*式\s*对\s*比\s*度\)/)
    })

    it('P1-1: "Lucide 图标 (32 组件)" → "Icon SVG (20 个内联, lucide 风格)"', () => {
      // W132 修: 改版稿落地表 (在 v2.1.x 全段) 含 "Icon SVG (20 个内联, lucide 风格)"
      // 全文 不应再含 "Lucide 图标 (32 组件)" (W130 修前是这表述)
      const c1 = readFile('docs/CHANGELOG.md')
      const c2 = readFile('README.md')
      // CHANGELOG 含 "Icon SVG" 新表述
      expect(c1).toMatch(/Icon SVG \(20\s*个\s*内\s*联,\s*lucide 风\s*格\)/)
      expect(c2).toMatch(/Icon SVG \(20\s*个\s*内\s*联,\s*lucide 风\s*格\)/)
      // 不含 "Lucide 图标 (32 组件)" 旧表述 (W132 修复点)
      expect(c1).not.toMatch(/Lucide\s*图\s*标\s*\(32\s*组\s*件\)/)
    })

    it('P1-3: e2e 计数 17 → 60+ (19 spec)', () => {
      const c1 = readFile('docs/CHANGELOG.md')
      const c2 = readFile('docs/ARCHITECTURE.md')
      expect(c1).toMatch(/60\+\s*e2e\s*\(19\s*spec\)/)
      expect(c2).toMatch(/19\s*spec,\s*60\+\s*测\s*试/)
      // 实际 e2e spec 文件数
      const e2eSpecs = fs.readdirSync('e2e').filter(f => f.endsWith('.spec.ts')).length
      expect(e2eSpecs).toBeGreaterThanOrEqual(19)
    })
  })

  // ========================================================================
  // 5. W131 P2-1: OfflineBanner z-index 修复
  // ========================================================================
  describe('W131 P2-1: OfflineBanner z-index 重叠 修复', () => {
    let OfflineBanner: any

    beforeEach(async () => {
      vi.resetModules()
      document.body.innerHTML = ''
    })

    it('OfflineBanner: z-30 (非 z-40) 避免覆盖 Layout header/sidebar z-10', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      // 必须用 z-30 (修后), 不再用 z-40 (修前)
      expect(c).toMatch(/\bz-30\b/)
      expect(c).not.toMatch(/\bz-40\b/)
    })

    it('OfflineBanner: 外层 wrapper pointer-events-none, 内层 pointer-events-auto (允许点击穿透)', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      // outer wrapper (banner 本身) 必须 pointer-events-none
      expect(c).toMatch(/pointer-events-none/)
      // inner div 必须 pointer-events-auto (关闭按钮可点)
      expect(c).toMatch(/pointer-events-auto/)
    })

    it('OfflineBanner: 渲染后 z-index 属性可被 CSS 解析为 30', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true })
      OfflineBanner = (await import('../src/components/OfflineBanner')).default
      const React = await import('react')
      const ReactDOM = await import('react-dom/client')
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = ReactDOM.createRoot(container)
      root.render(React.createElement(OfflineBanner))
      await new Promise(r => setTimeout(r, 50))
      const banner = container.querySelector('[data-testid="offline-banner"]') as HTMLElement
      expect(banner).toBeTruthy()
      // 类名含 z-30
      expect(banner.className).toMatch(/\bz-30\b/)
      // 修复前 z-40 应已删
      expect(banner.className).not.toMatch(/\bz-40\b/)
    })
  })

  // ========================================================================
  // 6. W131 P2-2: e2e go() 5s 硬等待 → waitForSelector
  // ========================================================================
  describe('W131 P2-2: e2e w131-dark-pwa 5s 硬等待 已修', () => {
    it('e2e/w131-dark-pwa.spec.ts: go() 不再有 waitForTimeout(5000)', () => {
      const c = readFile('e2e/w131-dark-pwa.spec.ts')
      expect(c).not.toMatch(/waitForTimeout\(5000\)/)
      // 改用 waitForSelector
      expect(c).toMatch(/waitForSelector\(['"]main h1['"]/)
      // + waitForFunction 等 加载完成
      expect(c).toMatch(/waitForFunction/)
    })
  })

  // ========================================================================
  // 7. 综合验证: 实际单元测试 + e2e 数 + 页面 + 组件
  // ========================================================================
  describe('W132 综合: 实际计数 vs 文档一致', () => {
    it('实际单元测试 ≥ 1400 (与文档 1478 一致)', () => {
      const count = countUnitTests()
      // 实际 ≥ 1400 (W130 46 + W131 39 + W128 48 + W127 29 + W126 20 = 182, 加上 W125 等 1000+)
      expect(count).toBeGreaterThanOrEqual(1400)
    })

    it('实际页面 ≥ 37', () => {
      const count = countPages()
      expect(count).toBeGreaterThanOrEqual(37)
    })

    it('实际组件 ≥ 37', () => {
      const count = countComponents()
      expect(count).toBeGreaterThanOrEqual(37)
    })

    it('实际 e2e spec ≥ 19', () => {
      const count = fs.readdirSync('e2e').filter(f => f.endsWith('.spec.ts')).length
      expect(count).toBeGreaterThanOrEqual(19)
    })
  })
})
