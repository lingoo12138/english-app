import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getPageTitle } from '../lib/utils'

// 桌面端侧边栏 — 7 个全量入口
const desktopNav = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/words', label: '词库', icon: '📚' },
  { to: '/scenes', label: '场景课', icon: '🎬' },
  { to: '/daily', label: '每日一句', icon: '✨' },
  { to: '/chat', label: 'AI', icon: '💬' },
  { to: '/report', label: '报告', icon: '📊' },
  { to: '/translate', label: '翻译', icon: '🔤' },
  { to: '/notebook', label: '生词本', icon: '⭐' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

// 移动端底部 Tab — 5 个核心(已加 每日一句 + 翻译,避免埋在首页快捷区)
const mobileNav = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/words', label: '词库', icon: '📚' },
  { to: '/scenes', label: '场景', icon: '🎬' },
  { to: '/chat', label: 'AI', icon: '💬' },
  { to: '/report', label: '报告', icon: '📊' },
  { to: '/notebook', label: '生词', icon: '⭐' },
]

// 移动端顶部 Title — 路径感知
export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  // utils 里的 title 形如 "词库 - 句刻",这里只取短标题
  const fullTitle = getPageTitle(location.pathname)
  const shortTitle = isHome ? '句刻' : fullTitle.split(' - ')[0]

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* 修复: a11y skip-to-main 链接,屏幕阅读器和键盘用户可跳过导航 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-3 focus:py-1.5 focus:rounded"
      >
        跳到主内容
      </a>
      {/* 侧边栏 (桌面) */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-10">
        <div className="px-6 py-6 border-b border-stone-200 dark:border-stone-800">
          <h1 className="text-2xl font-bold text-brand-600">句刻</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">即时英语学习</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {desktopNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
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
      <main id="main-content" className="flex-1 md:ml-56 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* 底部导航 (手机) - 修复: 加了 每日一句 tab(用户高频功能) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2.5 text-xs ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
