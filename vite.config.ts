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
        // 限制单文件大小: > 2MB 不 precache (避免首装卡顿)
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB
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
        // runtimeCaching — 关键资源
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
            // 词库 JSON: StaleWhileRevalidate 7d
            // (P2-6 修: 7 天而非 30 天,发新词库频率比这高)
            urlPattern: /\/data\/words\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'word-data-cache-v2',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
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
            // AI/LLM 响应: NetworkFirst 1d (在线优先,离线 fallback)
            urlPattern: /^https?:\/\/.*\/(api|chat|llm|completion).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ai-response-cache-v1',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 天
              },
            },
          },
          {
            // libretranslate (W117 改: 之前是 NetworkFirst 5s,继续保留)
            urlPattern: /^https:\/\/libretranslate\.de\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'translate-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // terraprint translate
            urlPattern: /^https:\/\/translate\.terraprint\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'translate-cache',
              networkTimeoutSeconds: 5,
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心 + 路由
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // IndexedDB
          'db-vendor': ['dexie', 'dexie-react-hooks'],
          // 状态管理
          'state-vendor': ['zustand'],
          // 哈希 (用于笔记/导出等)
          'md-vendor': ['blueimp-md5'],
          // W127: pdfjs 单独拆, 异步 import (省首屏 ~468KB)
          // 关键路径: src/lib/pdfUpload.ts → import('pdfjs-dist')
          'pdfjs': ['pdfjs-dist'],
        },
      },
    },
    // 限制警告阈值(原 800KB,现在 pdfjs ~468KB, react-vendor ~164KB 都不该警告)
    chunkSizeWarningLimit: 800,
    // W127: Rollup 不再生成大 sourcemap 提升 build 速度
    sourcemap: false,
  },
})
