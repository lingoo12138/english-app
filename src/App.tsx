import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import { useStore, useStats } from './store/useStore'
import { getTodayCount, getTotalLearned, getAllFavorites } from './lib/db'
import { getTheme, applyTheme, applyFontSize } from './lib/themes'

function App() {
  const darkMode = useStore((s) => s.darkMode)
  const themeColor = useStore((s) => s.themeColor)
  const fontSize = useStore((s) => s.fontSize)
  const setStats = useStats((s) => s.setStats)

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
    return () => clearInterval(id)
  }, [setStats])

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
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
