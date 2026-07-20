import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import WordList from './pages/WordList'
import WordDetail from './pages/WordDetail'
import DailyPage from './pages/DailyPage'
import Translate from './pages/Translate'
import Notebook from './pages/Notebook'
import Settings from './pages/Settings'
import ReviewCenter from './pages/ReviewCenter'
import WeakWords from './pages/WeakWords'
import Scenes from './pages/Scenes'
import SceneDetail from './pages/SceneDetail'
import Camera from './pages/Camera'
import { useStore, useStats } from './store/useStore'
import { getTodayCount, getTotalLearned, getAllFavorites } from './lib/db'
import { getTheme, applyTheme, applyFontSize } from './lib/themes'
import { getPageTitle } from './lib/utils'

function App() {
  const darkMode = useStore((s) => s.darkMode)
  const themeColor = useStore((s) => s.themeColor)
  const fontSize = useStore((s) => s.fontSize)
  const setStats = useStats((s) => s.setStats)
  const location = useLocation()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    applyTheme(getTheme(themeColor))
  }, [themeColor])

  useEffect(() => {
    applyFontSize(fontSize)
  }, [fontSize])

  // 加载统计
  useEffect(() => {
    const loadStats = async () => {
      const [today, total, favs] = await Promise.all([
        getTodayCount(),
        getTotalLearned(),
        getAllFavorites(),
      ])
      setStats({ todayCount: today, totalLearned: total, favoriteCount: favs.length })
    }
    loadStats()
    // 每 30 秒刷新
    const id = setInterval(loadStats, 30000)
    // 修复: 页面可见性变化(tab 切回)时重载,保证数据新鲜
    const onVisible = () => { if (!document.hidden) loadStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [setStats])

  // 修复: 页面 title 根据路由变化
  useEffect(() => {
    document.title = getPageTitle(location.pathname)
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="words" element={<WordList />} />
        <Route path="words/:id" element={<WordDetail />} />
        <Route path="daily" element={<DailyPage />} />
        <Route path="translate" element={<Translate />} />
        <Route path="notebook" element={<Notebook />} />
        <Route path="weak" element={<WeakWords />} />
        <Route path="review" element={<ReviewCenter />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="scenes/:id" element={<SceneDetail />} />
        <Route path="camera" element={<Camera />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
