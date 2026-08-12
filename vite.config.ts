import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * W143 Critical CSS Inline Plugin
 *
 * 目的: 113KB 主 CSS 改异步加载, inline 1-2KB critical 进 <style> 块, 加速 LCP.
 *
 * 行为:
 *   1. build 时读 src/index.critical.css
 *   2. 简单 minify (去空白/注释)
 *   3. inline 进 <head> 的 <style> 块
 *   4. 把主 CSS <link> 改成 `media="print" onload="this.media='all'"` 异步加载
 *      (浏览器解析时不阻塞 render, 加载完成后切换 media 生效)
 *
 * 关键: order: 'post' — 必须等 Vite 把 <link rel="stylesheet"> 注入到 html 后再改,
 *   'pre' 阶段 Vite 还没注入, replace 找不到目标.
 */
function inlineCriticalCss(): import('vite').Plugin {
  return {
    name: 'inline-critical-css',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const criticalPath = resolve(__dirname, 'src/index.critical.css')
        if (!existsSync(criticalPath)) {
          // 容错: critical.css 不存在时跳过, 不破坏 build
          return html
        }
        const raw = readFileSync(criticalPath, 'utf-8')
        // 简单 minify: 多空白 → 单空格, 去掉 /* */ 注释
        // 不做复杂压缩 (生产环境由 gzip 处理, 重复规则代价 < 1KB)
        const min = raw
          .replace(/\/\*[\s\S]*?\*\//g, '') // 去注释
          .replace(/\s+/g, ' ') // 多空白 → 单空格
          .replace(/\s*([{}:;,])\s*/g, '$1') // 关键符号周围空白
          .replace(/;}/g, '}') // 末位分号
          .trim()
        // 把 Vite 注入的 <link rel="stylesheet" ...> 改成 async-load 模式
        // 前面插 <style>${min}</style> 提供首屏 paint
        // 只替换第一个匹配 (全站只有 1 个主 stylesheet)
        if (!html.includes('<link rel="stylesheet"')) {
          // 兜底: 如果没找到 link, 把 style 插到 </head> 前
          return html.replace('</head>', `<style>${min}</style></head>`)
        }
        return html.replace(
          '<link rel="stylesheet"',
          `<style>${min}</style><link rel="stylesheet" media="print" onload="this.media='all'"`,
        )
      },
    },
  }
}

export default defineConfig({
  // GitHub Pages 部署:仓库名 lingoo12138/english-app,base 必须带 /english-app/
  base: '/english-app/',
  plugins: [
    react(),
    // W143: 必须先于 VitePWA 注册, 让我们 inline 早于 PWA 的 injectRegister 处理
    //  PWA 内部也会用 transformIndexHtml, 但 order 不冲突 (默认 vs post 不会乱)
    inlineCriticalCss(),
    VitePWA({
      registerType: 'prompt',  // W4-B P2 改: prompt 让用户主动选择更新
      injectRegister: 'auto',
      // W136-Bundle P1-2: 统一用 /icons/ 下的图标, 跟 Runtime 删根 public/pwa-192.png 配套
      //  旧 includeAssets ['pwa-192.png', 'pwa-512.png'] 走的是 public/ 根, 同时 manifest.icons
      //  也写 /english-app/pwa-192.png (根), 跟 /icons/pwa-192.png 重复 precache ~13KB 浪费
      //  - 修法: includeAssets 改用 /icons/ 路径, manifest.icons 也改 /icons/
      //  - public/ 根的 pwa-192.png / pwa-512.png 由 Runtime producer 删, 跟 /icons/ 统一
      //  - public/manifest.webmanifest 已用 /icons/, 跟这里对齐
      includeAssets: ['favicon.svg', 'icons/pwa-192.png', 'icons/pwa-512.png'],
      manifest: {
        name: '句刻 - 即时英语学习',
        short_name: '句刻',
        description: '让英语在你想用的时候就能用上',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/english-app/',
        lang: 'zh-CN',
        icons: [
          {
            src: '/english-app/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/english-app/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // W127: 缓存关键资源,排除大文件(json 词库走 runtimeCaching,worker 不 precache)
        // 不再 precache woff(只留 woff2),json, pdf worker(运行时按需)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // W127: 排除 pdfjs chunk (1.7MB,只在 PDF 阅读时按需 import)
        // 排除 pdf.worker (1.2MB,运行时按需)
        // 排除词库 JSON (6.2MB,走 runtimeCaching)
        globIgnores: [
          '**/assets/pdfjs-*.js',
          '**/assets/pdf.worker.*',
          '**/data/**/*.json',
        ],
        // W135: 收紧单文件 precache 上限到 1MB (原 2MB)
        //  业务: 任何 > 1MB 的 chunk 都应走 runtimeCaching, 避免首次安装占带宽
        //  - react-vendor 164KB / pdfjs-vendor 0KB (按需) / 各 page chunk 30-50KB
        //  - splash/icon png 30-100KB 都安全
        //  - 大字体子集 woff2 通常 < 80KB
        maximumFileSizeToCacheInBytes: 1 * 1024 * 1024, // 1MB
        // W127: 关键 precache 上限 100 (避免 5MB+)
        // vite-plugin-pwa v1.x 默认无 limit,这里通过 globPatterns 收紧 + 后续 limit 字段
        // (workbox-build 内部 manifestTransform 可进一步收紧,但 PWA v1.3.0 默认即足)
        //
        // W136-Bundle P2-2 注释: cleanupOutdatedCaches 只清 precache, 不清 runtimeCaching
        //  - workbox-build 的 cleanupOutdatedCaches 仅删除旧 revision 缓存 (precache 部分)
        //  - runtimeCaching (font-cache-v1 / word-data-cache-v2 / data-misc-cache-v1 /
        //    ai-response-cache-v2 / translate-cache / google-fonts-cache-v1) 改名后
        //    (v1 → v2) 旧 cache 不会自动清, 需要在 SW 内手动 cache.keys() + cache.delete()
        //  - 当前策略: cacheName 加 -vN 后缀, 用户升级 SW 后旧 cache 留底, ExpirationPlugin
        //    maxAgeSeconds 触发后自然过期 (最长 1y 字体), 不会无限累积
        //  - cleanupOutdatedCaches: true 保留 — 删 precache 旧 revision 仍必要
        cleanupOutdatedCaches: true,
        // W127: SPA fallback — /words, /scenes, /aichat, /textbook, /settings 等
        // 深链直达时, 离线返回 index.html 让 SPA 自己渲染
        navigateFallback: '/english-app/index.html',
        // 排除 API/翻译/AI(这些走 runtimeCaching,不当 SPA 处理)
        navigateFallbackDenylist: [
          /^\/api\//,
          /^https?:\/\//,  // 外部 URL 不走 fallback
        ],
        // W135: skipWaiting + clientsClaim (新版生效后立即接管, 不需用户全部 tab 关闭)
        //  与 registerType:'prompt' 配合: 后台激活, 前台弹 toast 提示刷新
        //  skipWaiting 已默认启用 (vite-plugin-pwa v1.3.0 默认值)
        //  clientsClaim 显式开启, 让 SW 立即控制未受控的 tab
        clientsClaim: true,
        skipWaiting: true,
        // runtimeCaching — 关键资源 (W135 调优)
        runtimeCaching: [
          {
            // 字体: CacheFirst 1y (字体文件极少更新)
            urlPattern: /\.(?:woff2?|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache-v1',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // W136: 词库 JSON: StaleWhileRevalidate 7d (W135 CacheFirst 6h 改回)
            //  - 业务: 词库 6.2MB, 首次打开后缓存 7 天, 命中后秒开
            //  - SWR 优势: 命中返回 cache + 后台静默更新, 下次打开拿到新词
            //  - 抗审查 P1-1: W135 改 CacheFirst 6h 在断网回归测试中暴露
            //    (W135.5 e2e 模拟 offline 重新打开, 6h 已过期 -> 拉到旧 7d cache, 反而失败)
            //  - 关键: 词库 6.2MB 走 runtimeCaching, 不会进 precache
            urlPattern: /\/data\/words\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'word-data-cache-v2',
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // W136-Bundle P1-3: 其他 data json (daily, lesson, scene 等): 独立 cache
            //  旧: 跟词库共用 word-data-cache-v2, 但 workbox ExpirationPlugin 一个 cache
            //    一个 plugin 实例, 以先注册为准 -> 整个 cache 限 maxEntries: 3
            //    结果: 词库 + 5+ data JSON 总共只能缓存 3 条, 后面的永远被驱逐
            //  新: 拆 data-misc-cache-v1, maxEntries 10 (7d), 跟词库互不挤占
            //  - 词库 word-data-cache-v2 仍 3 entries / 7d (W136 抗审查 P1-1 改 SWR)
            //  - 数据 JSON (daily.json / lesson.json / scene.json 等) 走独立 cache
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'data-misc-cache-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // W135: AI/LLM 响应: StaleWhileRevalidate 1d (原 NetworkFirst 1d)
            //  业务: 同一 query 用户可能问多遍, 缓存命中直接返回 + 后台静默更新
            //  - 风险: AI 输出可能更新 (新版模型), 但 1d 缓存期内允许 stale
            //  - 老 NetworkFirst 每次必访问网络, 重复 query 慢 + 浪费流量
            urlPattern: /^https?:\/\/.*\/(api|chat|llm|completion).*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ai-response-cache-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // libretranslate (W117 改: NetworkFirst 5s)
            // W135 保持 NetworkFirst: 翻译结果不可过期 (用户要新结果)
            urlPattern: /^https:\/\/libretranslate\.de\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'translate-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // terraprint translate (NetworkFirst: 翻译不能过期)
            urlPattern: /^https:\/\/translate\.terraprint\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'translate-cache',
              networkTimeoutSeconds: 5,
            },
          },
          // W136: 删 data: URL 规则 (P0-2 修复) — 原 W135 注释写 "dataExport 触发 data: URL 下载",
          //  实际业务用 URL.createObjectURL(blob) 生成 blob: URL, 不是 data:.
          //  grep "data:" src/lib/dataExport.ts 0 业务命中.
          //  Workbox registerRoute 只接 HTTP/HTTPS fetch, data: / blob: / file: 根本不到 SW.
          // W136: 删 settings/profile.json NetworkFirst 1d 规则 (P2-3 修复) — 0 业务命中
          //  (zustand persist 走 localStorage, 不走网络; 注释提到的 settings.json 实际不存在).
          {
            // W135: Google Fonts 静态资源 (备用, 当前自托管, 留兜底)
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  // W127: manualChunks — 拆 vendor, 关键库异步 import
  // 关键: pdfjs-dist 只在 错题/课文 PDF 阅读时 import, 用 React.lazy
  // W135: 新增 llm-vendor 整合 LLM 相关 (6+ 页面共用 chatCompletion + 错误降级)
  // 首屏预算: index + react-vendor < 100KB gzip (W134 baseline 91KB)
  // db-vendor 不在首屏计数 (Home 渲染不依赖 IDB, 启动后台异步取 stats)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心 + 路由 (首屏: ~54KB gzip)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // IndexedDB (W127: 96KB, gzip 32KB; Home 后台 useEffect 调 getTodayCount 等)
          'db-vendor': ['dexie', 'dexie-react-hooks'],
          // 状态管理 (W127: 4KB / 1.6KB gzip — zustand 极轻)
          'state-vendor': ['zustand'],
          // 哈希 (用于笔记/导出等, 1.8KB gzip)
          'md-vendor': ['blueimp-md5'],
          // W127: pdfjs 单独拆, 异步 import (省首屏 ~142KB gzip)
          // 关键路径: src/lib/pdfUpload.ts → import('pdfjs-dist')
          'pdfjs': ['pdfjs-dist'],
          // W135 新增: LLM 共享代码合并 (5+ 页面共用)
          // 包含 providers/llm.ts (chatCompletion 等 OpenAI 协议入口),
          // llmFallback.ts (网络错误分类 + 友好降级), llmTutor (ErrorExplain/Grammar/Usage),
          // aiChat (AI 聊天角色), chatRoles (系统角色定义), llmUsage (每日配额).
          // 估算: 合并后 ~10-15KB gzip (vs. 散在 5 个 page chunks 各 2-3KB, 总 ~15-20KB).
          // 收益: 用户从 AIChat 跳到 Settings 时, LLM 通道已缓存, 不重复解析.
          //
          // W136-Bundle P1-1 注释: 名字 "llm-vendor" 实际含 LLM 生态共用 mini-vendor
          //  - Rollup shared dependency graph 把跟 LLM 共享依赖的库拽进来, 实际打包
          //    出来可能含: xpSystem (XP 等级, AIChat 奖励) / idbSync (跨 tab 广播,
          //    AIChat 状态同步) 等非纯 LLM 代码
          //  - 实测 llm-vendor chunk 56KB / 21KB gzip, 比纯 LLM 多 ~30KB
          //  - 决策: 不强拆 (会破坏 Rollup 共享图, page chunks 反而增大),
          //    文档说清楚"llm-vendor = LLM 生态共用 mini-vendor" 即可
          //  - 收益: 用户访问 2 个 LLM 页面后 (AIChat / 错题讲解 / 语法讲解) 整体收益
          'llm-vendor': [
            './src/lib/providers/llm.ts',
            './src/lib/llmFallback.ts',
            './src/lib/llmTutor.ts',
            './src/lib/aiChat.ts',
            './src/lib/chatRoles.ts',
            './src/lib/llmUsage.ts',
            './src/lib/aiPlanGenerator.ts',
          ],
        },
      },
    },
    // 限制警告阈值(原 800KB,现在 pdfjs ~468KB, react-vendor ~164KB 都不该警告)
    chunkSizeWarningLimit: 800,
    // W127: Rollup 不再生成大 sourcemap 提升 build 速度
    sourcemap: false,
  },
})
