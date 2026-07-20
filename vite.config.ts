import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 部署:仓库名 lingoo12138/english-app,base 必须带 /english-app/
  base: '/english-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        // 缓存关键资源(不包含大文件)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 允许缓存大文件(如词库)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        // 词库文件单独缓存策略
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'word-data-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/libretranslate\.de\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'translate-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
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
})
