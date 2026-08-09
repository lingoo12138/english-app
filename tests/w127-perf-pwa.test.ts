// tests/w127-perf-pwa.test.ts - W127 性能 + PWA 优化
// 验证:
//  1. vite.config.ts manualChunks 拆 pdfjs + 关键 vendor
//  2. workbox precache 限 100 项 + 排除 pdfjs/json
//  3. workbox runtimeCaching: 字体 CacheFirst 1y, /data/words.json SWR 7d, AI NetworkFirst 1d
//  4. SPA navigation fallback 到 index.html
//  5. dist/ 实际产物大小: index.html < 5KB, index-*.js < 200KB
//  6. 关键 chunk 拆分正确
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'

describe('W127 性能 + PWA 优化', () => {
  const viteConfig = readFileSync('vite.config.ts', 'utf-8')
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

  describe('1. manualChunks — pdfjs + 关键 vendor 拆', () => {
    it('pdfjs 拆独立 chunk (manualChunks pdfjs)', () => {
      // 业务: pdfjs 1.7MB, 首屏不应加载, 错题/课文才用
      expect(viteConfig).toMatch(/manualChunks[\s\S]*pdfjs['"]\s*:\s*\[[\s\S]*['"]pdfjs-dist['"]/)
    })

    it('react-vendor 拆独立 chunk', () => {
      // 业务: react + react-dom + react-router 频繁复用
      expect(viteConfig).toMatch(/['"]react-vendor['"]\s*:\s*\[[\s\S]*['"]react['"]/)
    })

    it('db-vendor 拆独立 chunk (dexie)', () => {
      expect(viteConfig).toMatch(/['"]db-vendor['"]\s*:\s*\[[\s\S]*['"]dexie['"]/)
    })

    it('state-vendor 拆独立 chunk (zustand)', () => {
      expect(viteConfig).toMatch(/['"]state-vendor['"]\s*:\s*\[[\s\S]*['"]zustand['"]/)
    })

    it('pdfUpload.ts 用 dynamic import 懒加载 pdfjs (不污染首屏)', () => {
      // 业务: 静态 import 会让 pdfjs 进首屏, 必须用 await import()
      const pdfUpload = readFileSync('src/lib/pdfUpload.ts', 'utf-8')
      // 至少有 1 处 await import('pdfjs-dist')
      expect(pdfUpload).toMatch(/await\s+import\(['"]pdfjs-dist['"]\)/)
      // 不能有顶层 import 'pdfjs-dist' (除 type-only)
      const topImports = pdfUpload.split('\n').filter(l => /^import\s+.*from\s+['"]pdfjs-dist['"]/.test(l))
      const nonType = topImports.filter(l => !l.includes('import type'))
      expect(nonType.length).toBe(0)
    })
  })

  describe('2. workbox 缓存策略', () => {
    it('字体走 CacheFirst (1y)', () => {
      expect(viteConfig).toMatch(/urlPattern\s*:\s*\/\\\.\(\?:woff2\?\|ttf\|eot\)\$\/i/)
      expect(viteConfig).toMatch(/CacheFirst/)
      expect(viteConfig).toMatch(/font-cache-v\d+/)
    })

    it('/data/words.json 走 StaleWhileRevalidate (7d)', () => {
      // 业务: 词库偶尔更新, SWR 保证用户有缓存时秒开
      expect(viteConfig).toMatch(/urlPattern\s*:\s*\/\\\/data\\\/words\\\.json\$\//)
      expect(viteConfig).toMatch(/StaleWhileRevalidate/)
    })

    it('AI/LLM 响应走 NetworkFirst (1d)', () => {
      // 业务: 在线优先, 离线 fallback 1 天
      expect(viteConfig).toMatch(/urlPattern\s*:\s*\/\^https\?:\\\/\\\/.*\\\/api|chat|llm|completion/)
      expect(viteConfig).toMatch(/ai-response-cache-v\d+/)
      expect(viteConfig).toMatch(/maxAgeSeconds\s*:\s*60\s*\*\s*60\s*\*\s*24/) // 1 day
    })

    it('翻译 API 仍走 NetworkFirst (兼容 W117)', () => {
      // 业务: 保留原 libretranslate/terraprint 兜底
      expect(viteConfig).toMatch(/libretranslate/)
      expect(viteConfig).toMatch(/terraprint/)
    })
  })

  describe('3. precache 上限 + 排除大文件', () => {
    it('globPatterns 限 js/css/html/ico/png/svg/woff2 (排除 woff/json/pdf)', () => {
      // 业务: precache 装入秒开, woff 已淘汰, json 由 runtimeCaching 兜
      expect(viteConfig).toMatch(/globPatterns\s*:\s*\[[\s\S]*\*\.\{js,css,html,ico,png,svg,woff2\}/)
    })

    it('globIgnores 排除 pdfjs (1.7MB, 运行时按需)', () => {
      expect(viteConfig).toMatch(/globIgnores[\s\S]*pdfjs-\*\.js/)
    })

    it('globIgnores 排除 pdf.worker (运行时按需)', () => {
      expect(viteConfig).toMatch(/globIgnores[\s\S]*pdf\.worker\.\*/)
    })

    it('globIgnores 排除 data/word.json (6.2MB, runtimeCaching 兜)', () => {
      expect(viteConfig).toMatch(/globIgnores[\s\S]*data\/\*\*\/\*\.json/)
    })

    it('maximumFileSizeToCacheInBytes ≤ 2MB (避免单文件卡顿)', () => {
      // 业务: pdfjs/word.json > 2MB, 自动不被 precache
      const m = viteConfig.match(/maximumFileSizeToCacheInBytes\s*:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)
      expect(m).not.toBeNull()
      expect(Number(m![1])).toBeLessThanOrEqual(2)
    })

    it('cleanupOutdatedCaches: true (升级自动清旧 cache)', () => {
      expect(viteConfig).toMatch(/cleanupOutdatedCaches\s*:\s*true/)
    })
  })

  describe('4. SPA navigation fallback', () => {
    it('navigateFallback 设到 index.html (深链直达)', () => {
      // 业务: /words, /scenes, /aichat 等离线仍渲染
      expect(viteConfig).toMatch(/navigateFallback\s*:\s*['"]\/english-app\/index\.html['"]/)
    })

    it('navigateFallbackDenylist 排除 /api/* 和外部 URL', () => {
      // 源码中正则字面量是 /^\/api\//, 实际字符含反斜杠
      expect(viteConfig).toMatch(/navigateFallbackDenylist[\s\S]*?\\\/api\\\//)
      expect(viteConfig).toMatch(/navigateFallbackDenylist[\s\S]*?https\?:/)
    })
  })

  describe('5. dist/ 产物大小 (实测)', () => {
    it.skipIf(!existsSync('dist/index.html'))('dist/index.html < 5KB', () => {
      const size = statSync('dist/index.html').size
      expect(size).toBeLessThan(5 * 1024)
    })

    it.skipIf(!existsSync('dist/assets'))('dist/assets/index-*.js < 200KB', () => {
      // 找 index-*.js
      const indexJs = readdirSync('dist/assets').find(f => /^index-.*\.js$/.test(f))
      expect(indexJs).toBeDefined()
      const size = statSync(`dist/assets/${indexJs}`).size
      expect(size).toBeLessThan(200 * 1024)
    })

    it.skipIf(!existsSync('dist/assets'))('dist/assets/react-vendor-*.js < 200KB', () => {
      const reactVendor = readdirSync('dist/assets').find(f => /^react-vendor-.*\.js$/.test(f))
      expect(reactVendor).toBeDefined()
      const size = statSync(`dist/assets/${reactVendor}`).size
      expect(size).toBeLessThan(200 * 1024)
    })

    it.skipIf(!existsSync('dist/assets'))('dist/assets/pdfjs-*.js 拆成独立 chunk (> 200KB 但不污染首屏)', () => {
      const pdfjs = readdirSync('dist/assets').find(f => /^pdfjs-.*\.js$/.test(f))
      expect(pdfjs).toBeDefined()
      const size = statSync(`dist/assets/${pdfjs}`).size
      // pdfjs 应该 > 100KB (确认是单独 chunk, 不是被合并到主 bundle)
      expect(size).toBeGreaterThan(100 * 1024)
    })

    it.skipIf(!existsSync('dist/sw.js'))('dist/sw.js precache 列表 < 100 项 (避免 5MB+)', () => {
      // 解析 dist/sw.js 找 precacheAndRoute([...]) 的条目数
      const sw = readFileSync('dist/sw.js', 'utf-8')
      const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
      expect(m).not.toBeNull()
      const urls = m![1].match(/url:"/g) || []
      expect(urls.length).toBeLessThanOrEqual(100)
    })

    it.skipIf(!existsSync('dist/sw.js'))('dist/sw.js 不 precache pdfjs (运行时按需)', () => {
      const sw = readFileSync('dist/sw.js', 'utf-8')
      const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
      expect(m).not.toBeNull()
      expect(m![1]).not.toMatch(/url:"assets\/pdfjs-/)
    })

    it.skipIf(!existsSync('dist/sw.js'))('dist/sw.js 不 precache word.json (runtimeCaching 兜)', () => {
      const sw = readFileSync('dist/sw.js', 'utf-8')
      const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
      expect(m).not.toBeNull()
      expect(m![1]).not.toMatch(/url:"data\/.*\.json/)
    })

    it.skipIf(!existsSync('dist/sw.js'))('dist/sw.js 含 navigateFallback (SPA offline 渲染)', () => {
      const sw = readFileSync('dist/sw.js', 'utf-8')
      expect(sw).toMatch(/NavigationRoute/)
      expect(sw).toMatch(/createHandlerBoundToURL/)
    })
  })

  describe('6. main.tsx + PWA 注册', () => {
    it('main.tsx 用 virtual:pwa-register 注册 SW', () => {
      const main = readFileSync('src/main.tsx', 'utf-8')
      expect(main).toMatch(/virtual:pwa-register/)
      expect(main).toMatch(/registerSW/)
    })

    it('main.tsx 不直接 import pdfjs (避免污染首屏)', () => {
      const main = readFileSync('src/main.tsx', 'utf-8')
      expect(main).not.toMatch(/from\s+['"]pdfjs-dist['"]/)
    })

    it('package.json 仍含 vite-plugin-pwa (不引入新依赖)', () => {
      expect(pkg.devDependencies['vite-plugin-pwa']).toBeDefined()
    })

    it('未引入 framer-motion / 第三方动画库 (0 第三方 chunk 约束)', () => {
      // 不应新增动画库
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      expect(allDeps['framer-motion']).toBeUndefined()
      expect(allDeps['@react-spring/web']).toBeUndefined()
      expect(allDeps['lottie-react']).toBeUndefined()
    })
  })
})
