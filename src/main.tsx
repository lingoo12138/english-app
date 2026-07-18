import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { loadVoices } from './lib/tts'

// 初始化
loadVoices()

// 暗色模式
const saved = localStorage.getItem('english-app-settings')
let dark = false
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    dark = parsed?.state?.darkMode || false
  } catch (e) {}
}
if (dark) document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
