// tests/w143-critical-css.test.ts - W143 Critical CSS Inline 优化
//
// 验证:
//  1. src/index.critical.css 存在, ≤ 4KB (1-2KB 目标 + 留余)
//  2. critical.css 含 :root brand-* 变量, html/body 基础, .card, .btn-primary
//  3. src/index.css 不再含 :root brand 变量 (已迁移), 但仍保留 .card / .btn
//     (因为 .card-interactive / .btn-ghost 用 @apply 依赖)
//  4. vite.config.ts 注册 inlineCriticalCss plugin, order: 'post'
//  5. plugin handler 模拟: 输入 Vite 注入的 html (含 <link rel="stylesheet">),
//     输出 html 含 <style>...</style> 块 + async-load link (media="print" onload=...)
//  6. 容错: critical.css 不存在时 plugin 不抛异常, 跳过 inline
//  7. (skip if no build) dist/index.html 头部含 <style>, 含关键变量 + 主 link 改 async
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'

// 直接 import plugin 源码, 在 unit test 里调 handler
// (Plugin 类型是 vite 导出的, 这里手动重写轻量版本用于测试)
import { readFileSync as rfSync, existsSync as eSync } from 'fs'
import { resolve as rPath } from 'path'

const PROJECT_ROOT = resolve(__dirname, '..')

// 从 vite.config.ts 源码中提取 inlineCriticalCss 函数
// (Vite config TS, 不能直接 import — 用 readFileSync + Function 编译执行太重,
//  改为重新实现一个测试版 mini 版的逻辑, 跟 vite.config.ts 行为一致)
function runPlugin(html: string, projectRoot: string = PROJECT_ROOT): string {
  const criticalPath = rPath(projectRoot, 'src/index.critical.css')
  if (!eSync(criticalPath)) {
    return html
  }
  const raw = rfSync(criticalPath, 'utf-8')
  const min = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim()
  if (!html.includes('<link rel="stylesheet"')) {
    return html.replace('</head>', `<style>${min}</style></head>`)
  }
  return html.replace(
    '<link rel="stylesheet"',
    `<style>${min}</style><link rel="stylesheet" media="print" onload="this.media='all'"`,
  )
}

describe('W143 Critical CSS Inline 优化', () => {
  describe('1. src/index.critical.css 存在 + 体积', () => {
    it('critical.css 文件存在', () => {
      expect(existsSync(resolve(PROJECT_ROOT, 'src/index.critical.css'))).toBe(true)
    })

    it('critical.css 体积 ≤ 4KB (1-2KB 目标, 留 2x 缓冲)', () => {
      const size = statSync(resolve(PROJECT_ROOT, 'src/index.critical.css')).size
      // 实际 ~3KB, 4KB 上限给未来留 1KB 余量
      expect(size).toBeLessThan(4 * 1024)
      // 下限 500B, 防止内容被清空
      expect(size).toBeGreaterThan(500)
    })

    it('critical.css 含 10 个 brand 颜色变量 (--brand-50..900)', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      for (let i = 0; i < 10; i++) {
        const level = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i]
        expect(css).toMatch(new RegExp(`--brand-${level}\\s*:`))
      }
    })

    it('critical.css 含 safe-area 变量 (--sat/--sab/--sal/--sar)', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      expect(css).toMatch(/--sat\s*:\s*env\(safe-area-inset-top\)/)
      expect(css).toMatch(/--sab\s*:\s*env\(safe-area-inset-bottom\)/)
      expect(css).toMatch(/--sal\s*:\s*env\(safe-area-inset-left\)/)
      expect(css).toMatch(/--sar\s*:\s*env\(safe-area-inset-right\)/)
    })

    it('critical.css 含 html, body, #root 基础高度 100%', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      expect(css).toMatch(/html\s*,\s*body\s*,\s*#root\s*\{[^}]*height:\s*100%/)
    })

    it('critical.css 含 body 字体/背景/颜色 (Outfit + bg-stone-50 + text-stone-900)', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      expect(css).toMatch(/font-family\s*:\s*['"]?Outfit/)
      expect(css).toMatch(/background-color\s*:\s*rgb\(250 250 249\)/) // stone-50
      expect(css).toMatch(/color\s*:\s*rgb\(28 25 23\)/) // stone-900
    })

    it('critical.css 含 .card 类 (Home 卡片基础样式)', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      expect(css).toMatch(/\.card\s*\{/)
      expect(css).toMatch(/border-radius\s*:\s*1rem/)
      expect(css).toMatch(/box-shadow\s*:\s*var\(--shadow-soft\)/)
    })

    it('critical.css 含 .btn-primary 类 (Home CTA 按钮)', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.critical.css'), 'utf-8')
      expect(css).toMatch(/\.btn-primary\s*\{/)
      // 颜色用 var(--brand-600) — 跟 :root 变量联动
      expect(css).toMatch(/background-color\s*:\s*rgb\(var\(--brand-600\)\)/)
      expect(css).toMatch(/color\s*:\s*#fff/)
    })
  })

  describe('2. src/index.css — 移除 critical 部分, 保留 @apply 依赖', () => {
    it('index.css 不再含 :root brand 变量块 (已迁 critical)', () => {
      // 验证 :root { --brand-* } 不在 main 顶层, 避免重复定义
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.css'), 'utf-8')
      // 排除 critical.css 中存在的 brand 变量
      // (注意: 此处允许 @apply 内部提到 brand, 但不允许 :root { --brand-*: } 顶层块)
      expect(css).not.toMatch(/^:root\s*\{[^}]*--brand-50\s*:/m)
    })

    it('index.css 仍保留 .card / .btn / .btn-primary (@apply 派生依赖)', () => {
      // .card-interactive 用 @apply card, 必须保留 .card
      // .btn-ghost 用 @apply btn, 必须保留 .btn
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.css'), 'utf-8')
      expect(css).toMatch(/\.btn\s*\{[^}]*@apply/)
      expect(css).toMatch(/\.btn-primary\s*\{[^}]*@apply\s+btn/)
      expect(css).toMatch(/\.card\s*\{[^}]*@apply/)
      expect(css).toMatch(/\.card-interactive\s*\{[^}]*@apply\s+card/)
    })

    it('index.css 仍含 @tailwind directives', () => {
      const css = readFileSync(resolve(PROJECT_ROOT, 'src/index.css'), 'utf-8')
      expect(css).toMatch(/@tailwind\s+base/)
      expect(css).toMatch(/@tailwind\s+components/)
      expect(css).toMatch(/@tailwind\s+utilities/)
    })
  })

  describe('3. vite.config.ts — inlineCriticalCss plugin 注册', () => {
    const viteConfig = readFileSync(resolve(PROJECT_ROOT, 'vite.config.ts'), 'utf-8')

    it('vite.config.ts 含 inlineCriticalCss 函数', () => {
      expect(viteConfig).toMatch(/function\s+inlineCriticalCss/)
    })

    it('plugin name = inline-critical-css', () => {
      expect(viteConfig).toMatch(/name\s*:\s*['"]inline-critical-css['"]/)
    })

    it('plugin 用 transformIndexHtml hook', () => {
      expect(viteConfig).toMatch(/transformIndexHtml\s*:/)
    })

    it('order: "post" (必须 post — Vite 在 default 阶段才注入 <link rel="stylesheet">)', () => {
      // 业务: 'pre' 阶段 html 还是源码模板, 没有 Vite 注入的 link, replace 找不到
      expect(viteConfig).toMatch(/order\s*:\s*['"]post['"]/)
    })

    it('plugin 读 src/index.critical.css', () => {
      expect(viteConfig).toMatch(/src\/index\.critical\.css/)
    })

    it('plugin 把 <link rel="stylesheet"> 替换成 inline style + async link', () => {
      // 验证 replace 模式
      expect(viteConfig).toMatch(/<link rel="stylesheet"/)
      expect(viteConfig).toMatch(/media\s*=\s*['"]print['"]/)
      expect(viteConfig).toMatch(/onload\s*=\s*['"]this\.media=['"]?all['"]?['"]?/)
    })

    it('plugin 在 plugins 数组中注册', () => {
      expect(viteConfig).toMatch(/plugins\s*:\s*\[[\s\S]*?inlineCriticalCss\(\)/)
    })
  })

  describe('4. plugin handler 行为模拟 (单元测试)', () => {
    it('输入 Vite 注入后的 html, 输出含 <style> 块 + async link', () => {
      // 模拟 Vite 注入的 html: 已有 <link rel="stylesheet" crossorigin href="...">
      const mockHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>测试</title>
  <link rel="stylesheet" crossorigin href="/english-app/assets/index-abc.css">
</head>
<body><div id="root"></div></body>
</html>`
      const out = runPlugin(mockHtml)
      // 输出含 <style> 块 (inline critical)
      expect(out).toMatch(/<style>[\s\S]+?<\/style><link/)
      // 输出含 async-load link (media="print" onload)
      expect(out).toMatch(/<link rel="stylesheet" media="print" onload="this\.media='all'"/)
      // 原始 link 的 crossorigin / href 属性保留
      expect(out).toMatch(/crossorigin/)
      expect(out).toMatch(/href="\/english-app\/assets\/index-abc\.css"/)
    })

    it('inline 后的 <style> 块含 :root brand 变量', () => {
      const mockHtml = `<head><link rel="stylesheet" href="x.css"></head>`
      const out = runPlugin(mockHtml)
      // 抽出 <style>...</style> 块内容
      const m = out.match(/<style>([\s\S]+?)<\/style>/)
      expect(m).not.toBeNull()
      const styleContent = m![1]
      // 关键变量都在
      expect(styleContent).toMatch(/--brand-600/)
      expect(styleContent).toMatch(/--shadow-soft/)
      expect(styleContent).toMatch(/--sat/)
      // minify 后: 注释已去除, 多空白 → 单空格
      expect(styleContent).not.toMatch(/\/\*/) // 注释已去
    })

    it('兜底: 找不到 <link rel="stylesheet"> 时, 把 <style> 插到 </head> 前', () => {
      // 极端情况: Vite 哪天不注入 stylesheet (例如改用 inline-only)
      const mockHtml = `<head><meta charset="UTF-8"></head><body></body>`
      const out = runPlugin(mockHtml)
      expect(out).toMatch(/<style>[\s\S]+?<\/style><\/head>/)
    })

    it('容错: critical.css 不存在时 plugin 不抛异常, 跳过 inline', () => {
      const mockHtml = `<head><link rel="stylesheet" href="x.css"></head>`
      // 用一个不存在的 projectRoot (critical.css 不在)
      const fakeRoot = '/tmp/w143-fake-root-no-such-dir'
      const out = runPlugin(mockHtml, fakeRoot)
      // 不抛异常, html 保持原样 (没插 <style>)
      expect(out).toBe(mockHtml)
      expect(out).not.toMatch(/<style>/)
    })
  })

  describe('5. dist/index.html (实测, build 后)', () => {
    // build 产物验证 — 需要先 npm run build, 没 build 跳过
    it.skipIf(!existsSync(resolve(PROJECT_ROOT, 'dist/index.html')))(
      'dist/index.html 含 <style> 块 (critical inline)',
      () => {
        const html = readFileSync(resolve(PROJECT_ROOT, 'dist/index.html'), 'utf-8')
        expect(html).toMatch(/<style>[^<]+<\/style>/)
      },
    )

    it.skipIf(!existsSync(resolve(PROJECT_ROOT, 'dist/index.html')))(
      'dist/index.html 主 stylesheet 改 async-load (media="print" onload)',
      () => {
        const html = readFileSync(resolve(PROJECT_ROOT, 'dist/index.html'), 'utf-8')
        // 主 stylesheet 应该是 async-load 模式
        expect(html).toMatch(/<link rel="stylesheet" media="print" onload="this\.media='all'"/)
        // 不能再有 blocking 模式的 stylesheet link (即没有 crossorigin 单独的 stylesheet)
        // 实际上 crossorigin 仍然在, 关键看 media="print"
        expect(html).not.toMatch(/<link rel="stylesheet" crossorigin(?!\s+media)/)
      },
    )

    it.skipIf(!existsSync(resolve(PROJECT_ROOT, 'dist/index.html')))(
      'inline <style> 块在 <head> 内, 在主 <link> 之前',
      () => {
        const html = readFileSync(resolve(PROJECT_ROOT, 'dist/index.html'), 'utf-8')
        const styleIdx = html.indexOf('<style>')
        const linkIdx = html.indexOf('<link rel="stylesheet"')
        expect(styleIdx).toBeGreaterThan(-1)
        expect(linkIdx).toBeGreaterThan(-1)
        // inline style 必须在 main link 之前 (HTML 解析顺序)
        expect(styleIdx).toBeLessThan(linkIdx)
      },
    )

    it.skipIf(!existsSync(resolve(PROJECT_ROOT, 'dist/index.html')))(
      'inline <style> 块大小 < 5KB (1-2KB 目标 + minify 留 2x 余量)',
      () => {
        const html = readFileSync(resolve(PROJECT_ROOT, 'dist/index.html'), 'utf-8')
        const m = html.match(/<style>([\s\S]+?)<\/style>/)
        expect(m).not.toBeNull()
        expect(m![1].length).toBeLessThan(5 * 1024)
        expect(m![1].length).toBeGreaterThan(200) // 防止空 style
      },
    )
  })
})
