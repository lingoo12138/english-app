import { useRef, useEffect, useState } from 'react'
import { loadScrollPosMap, saveScrollPosMap } from '../lib/scrollPosStorage'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getPageTitle } from '../lib/utils'
import { ToastContainer } from './Toast'
import {
  IconHome, IconBook, IconVideo, IconSparkles, IconChat, IconCalendar,
  IconEdit, IconBookOpen, IconHeadphones, IconBarChart, IconSettings,
  IconFileText, IconStar, IconTrophy, IconUser,
} from './Icon'

// 桌面端侧边栏 — 22 项 (W118: emoji → Icon SVG 替)
const desktopNav = [
  { to: '/', label: '首页', Icon: IconHome },
  { to: '/words', label: '词库', Icon: IconBook },
  { to: '/scenes', label: '场景课', Icon: IconVideo },
  { to: '/daily', label: '每日一句', Icon: IconSparkles },
  { to: '/chat', label: 'AI', Icon: IconChat },
  { to: '/plan', label: '计划', Icon: IconCalendar },
  { to: '/write', label: '写作', Icon: IconEdit },
  { to: '/errors', label: '错题', Icon: IconBookOpen },
  { to: '/errors/history', label: '错题统计', Icon: IconBarChart },
  { to: '/listen', label: '听力', Icon: IconHeadphones },
  { to: '/report', label: '报告', Icon: IconBarChart },
  { to: '/translate', label: '翻译', Icon: IconChat },
  { to: '/notebook', label: '生词本', Icon: IconStar },
  { to: '/textbook', label: '课文', Icon: IconBookOpen },
  { to: '/fill-blank', label: '填空', Icon: IconEdit },
  { to: '/dictation', label: '听写', Icon: IconHeadphones },
  { to: '/spelling', label: '拼写', Icon: IconEdit },
  { to: '/translation-favs', label: '释义收藏', Icon: IconStar },
  { to: '/follow-read/progress', label: '跟读趋势', Icon: IconBarChart },
  { to: '/achievements', label: '成就', Icon: IconTrophy },
  { to: '/settings', label: '设置', Icon: IconSettings },
  { to: '/docs', label: '文档', Icon: IconFileText },
]

// 移动端底部 Tab — 5 项核心 (W112 UX bug 修: 之前 10 项, grid-cols-5 静默丢 6-10)
const mobileNav = [
  { to: '/', label: '首页', Icon: IconHome },
  { to: '/words', label: '词库', Icon: IconBook },
  { to: '/scenes', label: '场景', Icon: IconVideo },
  { to: '/chat', label: 'AI', Icon: IconChat },
  { to: '/settings', label: '我的', Icon: IconUser },
]

// 移动端顶部 Title — 路径感知
export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  // utils 里的 title 形如 "词库 - 句刻",这里只取短标题
  const fullTitle = getPageTitle(location.pathname)
  const shortTitle = isHome ? '句刻' : fullTitle.split(' - ')[0]

  // W104 修 v1: 桌面 侧边栏 滚 动 位置 持久化 (每 页 独 立, verifier B 修 P1)
  const navRef = useRef<HTMLElement>(null)
  const [scrollPosMap, setScrollPosMap] = useState<Map<string, number>>(() => loadScrollPosMap() as Map<string, number>)
  useEffect(() => {
    // 路由 变化 时: 保存 离 开页 位置, 持久 化
    const currentPath = location.pathname
    return () => {
      if (navRef.current) {
        const updated = new Map<string, number>(scrollPosMap)
        updated.set(currentPath, navRef.current.scrollTop)
        setScrollPosMap(updated)
        saveScrollPosMap(updated)
      }
    }
  }, [location.pathname])
  useEffect(() => {
    // 路由 进入 时: 恢复 该页 位置 (默认 0)
    if (navRef.current) {
      const saved = scrollPosMap.get(location.pathname) || 0
      navRef.current.scrollTop = saved
    }
  }, [location.pathname, scrollPosMap])

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* 修复: a11y skip-to-main 链接,屏幕阅读器和键盘用户可跳过导航 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-3 focus:py-1.5 focus:rounded"
      >
        跳到主内容
      </a>
      {/* 侧边栏 (桌面) - 修复: 22 项 nav 在小屏幕 可 滚, header 固定 */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 md:left-0 md:overflow-hidden bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-10">
        <div className="flex-shrink-0 px-6 py-6 border-b border-stone-200 dark:border-stone-800">
          <h1 className="text-2xl font-bold text-brand-600">句刻</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">即时英语学习</p>
        </div>
        <nav ref={navRef} className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {desktopNav.map((item) => {
            const Icon = item.Icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-[var(--t-fast)] ease-[var(--ease)] ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} className="flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* 顶部栏(手机) - 修复: 加路径感知 title,用户在哪个页面有视觉提示 */}
      <header
        className="md:hidden sticky top-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur border-b border-stone-200 dark:border-stone-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          {/* 返回按钮 - 修复: 不渲染时占位,避免在 home 页出现“隐形可点击”按钮 */}
          {isHome ? (
            <div className="w-6" />
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="text-stone-600 dark:text-stone-300 w-6 text-left"
              aria-label="返回上一页"
            >
              ←
            </button>
          )}
          <h1 className={`text-lg font-semibold ${isHome ? 'text-brand-600' : 'text-stone-700 dark:text-stone-200'}`}>
            {shortTitle}
          </h1>
          <div className="w-6" />
        </div>
      </header>

      {/* 主内容 */}
      <main id="main-content" tabIndex={-1} className="flex-1 md:ml-56 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Toast 通知 (顶部居中堆叠) */}
      <ToastContainer />

      {/* 底部导航 (手机) - W112 UX bug 修: 10 项 → 5 项, 避免 grid-cols-5 静默丢 6-10 */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const Icon = item.Icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2.5 text-xs transition-colors duration-[var(--t-fast)] ${
                    isActive
                      ? 'text-brand-600'
                      : 'text-stone-500 dark:text-stone-400'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} className="mb-0.5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
