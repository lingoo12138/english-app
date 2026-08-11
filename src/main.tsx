/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// W117: 字 体 升 级 - Outfit (主) + JetBrains Mono (辅, 音标) 自 托 管 (PWA 缓存)
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import { loadVoices } from './lib/tts'
import { getTheme, applyTheme, applyFontSize } from './lib/themes'

// 初始化
loadVoices()

// 暗色模式 + 主题色 + 字号
const saved = localStorage.getItem('english-app-settings-v2')
let dark = false
let themeColor = 'green'
let fontSize = 'md'
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    dark = parsed?.state?.darkMode || false
    themeColor = parsed?.state?.themeColor || 'green'
    fontSize = parsed?.state?.fontSize || 'md'
  } catch (e) {
    // 启动期不能弹 UI, 默认值已就位, 仅诊断
    console.warn('[init] 解析 localStorage 失败, 使用默认主题/字号', e)
  }
}
if (dark) document.documentElement.classList.add('dark')
applyTheme(getTheme(themeColor))
applyFontSize(fontSize)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 修复: 部署到子路径(如 GitHub Pages)时需告诉 React Router base path */}
    <BrowserRouter basename="/english-app">
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// W136-PWA: 删 main.tsx 的 registerSW, 完全交给 UpdateToast 组件 (P1-4: 修复双 registerSW)
//  原 W4-B registerSW 已在 W135 改造, 这里仅保留 console.debug 引导, 不再注册第二个
//  - UpdateToast 唯一入口注册 registerSW, UI 提示 (toast / indicator) 集中
//  - offlineReady / needRefresh 都在 UpdateToast 内处理

// W128: 跨 tab IDB 同步 (主 tab 写 -> 副 tab 收到 -> 刷新 store)
// 启动期: 拿不到 store hook, 用 dynamic import + window event 通知应用层
import { initIdbSync } from './lib/idbSync'
initIdbSync({
  onChange: (msg) => {
    // 抛 window event, 业务 store 可订阅
    // P1: 任何 store (favorites/chats/errors 等) 想跨 tab 刷新, 监听 'idb-sync' 事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('idb-sync', { detail: msg }))
    }
    if (import.meta.env.DEV) {
      console.debug('[idbSync] 收到副 tab 写入:', msg.store, msg.op, msg.key)
    }
  },
})

// W136-PWA: 删 syncManager 整个抽象 (P0-1: 业务侧 0 调用, 死代码)
//  - Dexie 本地 IDB 写不需要网络, 离线写入 0 损失
//  - 跨 tab 锁问题 (P0-3) 和 SW sync handler 缺失 (P0-4) 随 syncManager 删除自动消解
//  - 在线时不需要 sync 语义, 业务直写 IDB 即可

// W135: 路由 chunk 注册 + idle 预取 + 上次访问预热
//  - 注册 5 个最常访问的 chunk 供 prefetchRoute() 拉
//  - 浏览器 idle 时预拉 (提速 200-500ms)
//  - 重启时预热 sessionStorage 记录的上次访问页面
import {
  registerPrefetchRoute,
  scheduleIdlePrefetch,
  warmRecentVisits,
} from './lib/prefetch'

// 注册 chunk 映射 (业务可后续扩展)
registerPrefetchRoute('/', () => import('./pages/Home'))
registerPrefetchRoute('/words', () => import('./pages/WordList'))
registerPrefetchRoute('/scenes', () => import('./pages/Scenes'))
registerPrefetchRoute('/chat', () => import('./pages/AIChat'))
registerPrefetchRoute('/settings', () => import('./pages/Settings'))
registerPrefetchRoute('/daily', () => import('./pages/DailyPage'))
registerPrefetchRoute('/textbook', () => import('./pages/TextbookPage'))

// 启动时: idle 预取最热的几个页面
scheduleIdlePrefetch(['/words', '/scenes', '/chat'], 2000)
// 重启时: 预热上次访问
warmRecentVisits()
