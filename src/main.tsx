/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
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
  } catch (e) {}
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

// W4-B: PWA "新版本可用" 提示
import { registerSW } from 'virtual:pwa-register'
const updateSW = registerSW({
  onNeedRefresh() {
    // 弹个轻量提示,让用户刷新
    if (confirm('🚀 新版本可用,是否立即更新?\n(将清空当前页面缓存)')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('[PWA] 离线就绪,无网络也能用')
  },
})
