import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/words', label: '词库', icon: '📚' },
  { to: '/daily', label: '每日一句', icon: '✨' },
  { to: '/translate', label: '翻译', icon: '🔤' },
  { to: '/notebook', label: '生词本', icon: '⭐' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* 侧边栏 (桌面) / 底部导航 (手机) */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 z-10">
        <div className="px-6 py-6 border-b border-stone-200 dark:border-stone-800">
          <h1 className="text-2xl font-bold text-brand-600">句刻</h1>
          <p className="text-xs text-stone-500 mt-1">即时英语学习</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
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

      {/* 顶部栏(手机) */}
      <header className="md:hidden sticky top-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="text-stone-600 dark:text-stone-300"
          >
            {location.pathname !== '/' ? '←' : ''}
          </button>
          <h1 className="text-lg font-semibold text-brand-600">句刻</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* 底部导航 (手机) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-10">
        <div className="grid grid-cols-6">
          {navItems.map((item) => (
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
