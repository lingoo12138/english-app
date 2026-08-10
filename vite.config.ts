import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 部署:仓库名 lingoo12138/english-app,base 必须带 /english-app/
  base: '/english-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',  // W4-B P2 改: prompt 让用户主动选择更新
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
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
            src: '/english-app/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/english-app/pwa-512.png',
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
            // W135: 词库 JSON: CacheFirst + 后台 revalidate (原 SWR 7d)
            //  - 词库一旦缓存就优先用缓存 (省一次网络, 离线秒开)
            //  - 后台 revalidate 用 plugins 实现: ExpirationPlugin + 6h 后过期强制重拉
            //  - 用户重复打开 /words 提提速
            //  - 注意: 词库 6.2MB 仍走 runtimeCaching, 不会进 precache
            urlPattern: /\/data\/words\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'word-data-cache-v2',
              expiration: {
                maxEntries: 3,
                // W135: 6h 后过期, 比 SWR 7d 短, 但 CacheFirst 仍命中 (用户感知秒开)
                // 重新进入会拉新版, 保证词库新鲜
                maxAgeSeconds: 60 * 60 * 6, // 6 小时
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 其他 data json (daily, lesson 等): CacheFirst
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'word-data-cache-v2',
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
          {
            // W135: 用户导出数据 (dataExport 触发 data: URL 下载)
            //  - data: URL 不走网络, 但 workbox precache 排除, runtimeCaching 接住
            //  - CacheFirst 7d: 用户重导出用缓存
            urlPattern: /^data:.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'export-data-cache-v1',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
            },
          },
          {
            // W135: 设置/用户偏好相关 (zustand persist 走 localStorage 不走网络)
            //  - 这里接住用户 settings.json / profile.json 类小 JSON
            //  - NetworkFirst: 偏好像要最新 (主题/LLM 渠道)
            urlPattern: /\/(settings|profile|user)\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'user-settings-cache-v1',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24, // 1 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
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
