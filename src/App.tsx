import { useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import InstallPrompt from './components/InstallPrompt'
const Home = lazy(() => import('./pages/Home'))
const WordList = lazy(() => import('./pages/WordList'))
const WordDetail = lazy(() => import('./pages/WordDetail'))
const DailyPage = lazy(() => import('./pages/DailyPage'))
const Translate = lazy(() => import('./pages/Translate'))
const Notebook = lazy(() => import('./pages/Notebook'))
const Settings = lazy(() => import('./pages/Settings'))
const ReviewCenter = lazy(() => import('./pages/ReviewCenter'))
const CardReview = lazy(() => import('./pages/CardReview'))
const WeakWords = lazy(() => import('./pages/WeakWords'))
const Scenes = lazy(() => import('./pages/Scenes'))
const LearnReport = lazy(() => import('./pages/LearnReport'))
const PronounceCustom = lazy(() => import('./pages/PronounceCustom'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const WritePage = lazy(() => import('./pages/WritePage'))
const ErrorsPage = lazy(() => import('./pages/ErrorsPage'))
const ListenPage = lazy(() => import('./pages/ListenPage'))
const Achievements = lazy(() => import('./pages/Achievements'))
const SceneDetail = lazy(() => import('./pages/SceneDetail'))
const Camera = lazy(() => import('./pages/Camera'))
const AIChat = lazy(() => import('./pages/AIChat'))
import { useStore, useStats } from './store/useStore'
import { getTodayCount, getTotalLearned, getAllFavorites } from './lib/db'
import { getTheme, applyTheme, applyFontSize } from './lib/themes'
import { getPageTitle } from './lib/utils'
import { BUILTIN_LLM_PROVIDERS } from './lib/providers/llm'
import { BUILTIN_TRANSLATE_PROVIDERS } from './lib/translate'
import { BUILTIN_TTS_PROVIDERS } from './lib/tts'
import { cleanupOldProgress } from './lib/plan'
import { startReminderScheduler, stopReminderScheduler, isNotificationSupported } from './lib/reminder'

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

  // v0.22.7: 启动清理 30 天前的 plan-progress key
  useEffect(() => {
    const removed = cleanupOldProgress()
    if (removed > 0) console.debug(`[plan] cleaned ${removed} plan-progress`)
  }, [])

  // v0.22.9: 启动学习提醒调度(单例 setInterval,卸载时清)
  useEffect(() => {
    if (isNotificationSupported()) {
      startReminderScheduler()
    }
    return () => stopReminderScheduler()
  }, [])

  // 初始化内置渠道列表(只需设一次, zustand persist 会保存选中项)
  const setLlmProviders = useStore(s => s.setLlmProviders)
  const setTranslateProviders = useStore(s => s.setTranslateProviders)
  const setTtsProviders = useStore(s => s.setTtsProviders)
  useEffect(() => {
    setLlmProviders(BUILTIN_LLM_PROVIDERS)
    setTranslateProviders(BUILTIN_TRANSLATE_PROVIDERS)
    setTtsProviders(BUILTIN_TTS_PROVIDERS)
  }, [setLlmProviders, setTranslateProviders, setTtsProviders])

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
    <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="text-stone-500">加载中...</div></div>}>
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
        <Route path="cards" element={<CardReview />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="scenes/:id" element={<SceneDetail />} />
        <Route path="camera" element={<Camera />} />
        <Route path="chat" element={<AIChat />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="write" element={<WritePage />} />
        <Route path="errors" element={<ErrorsPage />} />
        <Route path="listen" element={<ListenPage />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="report" element={<LearnReport />} />
        <Route path="pronounce-custom" element={<PronounceCustom />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

export default App
