import { useRef, useEffect, useState } from 'react'
import { loadScrollPosMap, saveScrollPosMap } from '../lib/scrollPosStorage'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getPageTitle } from '../lib/utils'
import { ToastContainer } from './Toast'
// W131: 离线状态 banner
import OfflineBanner from './OfflineBanner'
// W146: 反馈回路 — FeedbackButton 浮动 + initTelemetry 启动 + NpsPrompt 7天弹
import FeedbackButton from './FeedbackButton'
import NpsPrompt from './NpsPrompt'
import { initTelemetry, track } from '../lib/telemetry'
import {
  IconHome, IconBook, IconVideo, IconSparkles, IconChat, IconCalendar,
  IconEdit, IconBookOpen, IconHeadphones, IconBarChart, IconSettings,
  IconFileText, IconStar, IconTrophy, IconUser, IconArrow,
} from './Icon'
// W148-A: 全局快捷键 + 快捷键面板
import {
  registerShortcuts,
  unregisterShortcuts,
  setEnabled as setShortcutsEnabled,
  getRouteForAction,
  SHORTCUT_EVENT,
  type ShortcutEventDetail,
} from '../lib/keyboardShortcuts'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'

// W121: 桌 面 端 22 项 → 4 大 组 折 叠 (12 项 主 入口 + 10 项 折 叠)
// 业务: 学 习 6 / 练 习 6 / 复 习 5 / 设 置 5 = 22 项, 收 敛 后 顶 部 12 + 4 组 折 叠
const desktopGroups: { label: string; items: { to: string; label: string; Icon: any }[] }[] = [
  {
    label: '学习',
    items: [
      { to: '/', label: '首页', Icon: IconHome },
      { to: '/words', label: '词库', Icon: IconBook },
      { to: '/scenes', label: '场景课', Icon: IconVideo },
      { to: '/daily', label: '每日一句', Icon: IconSparkles },
      { to: '/notebook', label: '生词本', Icon: IconStar },
      { to: '/textbook', label: '课文', Icon: IconBookOpen },
    ],
  },
  {
    label: '练习',
    items: [
      { to: '/chat', label: 'AI', Icon: IconChat },
      { to: '/listen', label: '听力', Icon: IconHeadphones },
      { to: '/plan', label: '计划', Icon: IconCalendar },
      { to: '/write', label: '写作', Icon: IconEdit },
      { to: '/translate', label: '翻译', Icon: IconChat },
      { to: '/follow-read/progress', label: '跟读趋势', Icon: IconBarChart },
    ],
  },
  {
    label: '复习',
    items: [
      { to: '/errors', label: '错题', Icon: IconBookOpen },
      { to: '/errors/history', label: '错题统计', Icon: IconBarChart },
      { to: '/translation-favs', label: '释义收藏', Icon: IconStar },
      { to: '/dictation', label: '听写', Icon: IconHeadphones },
      { to: '/spelling', label: '拼写', Icon: IconEdit },
    ],
  },
  {
    label: '设置',
    items: [
      { to: '/report', label: '报告', Icon: IconBarChart },
      { to: '/achievements', label: '成就', Icon: IconTrophy },
      { to: '/fill-blank', label: '填空', Icon: IconEdit },
      { to: '/settings', label: '设置', Icon: IconSettings },
      { to: '/docs', label: '文档', Icon: IconFileText },
    ],
  },
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollPosMap, setScrollPosMap] = useState<Map<string, number>>(() => loadScrollPosMap() as Map<string, number>)
  // W121: 4 大 组 折 叠 状 态 (学 习 默 认 展 开, 其 余 折 叠)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('layout-open-groups')
      return saved ? JSON.parse(saved) : { 学习: true, 练习: false, 复习: false, 设置: false }
    } catch {
      return { 学习: true, 练习: false, 复习: false, 设置: false }
    }
  })
  useEffect(() => {
    localStorage.setItem('layout-open-groups', JSON.stringify(openGroups))
  }, [openGroups])
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
  // W149 反馈 1: 切页面时主内容滚到顶部, 避免从底部跳 (老 page scroll 状态没清)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])
  // W149 反馈 1+2: 切页面触发 pageEnter 动效 — 用 class toggle (而非 key={pathname} 重 mount)
  // 原因: React 重 mount 会让 Suspense fallback (SkeletonPage) 闪一下, 即使 chunk 已 cache
  // 解法: 监听 pathname 变 → 移除/重加 .page-transition class, 强制重启动画 (不重 mount)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    // 触发 reflow → 重启动画
    el.classList.remove('page-transition')
    void el.offsetWidth
    el.classList.add('page-transition')
  }, [location.pathname])
  // W146: 启动时初始化 telemetry (App mount 一次)
  useEffect(() => {
    void initTelemetry()
  }, [])
  // W146: 路由变化时 track page_view
  useEffect(() => {
    track('page_view', { path: location.pathname })
  }, [location.pathname])

  // W148-A: 全局快捷键 mount / unmount
  useEffect(() => {
    registerShortcuts()
    return () => unregisterShortcuts()
  }, [])

  // W148-A: 快捷键面板开关状态 + 监听 w148-shortcut 事件
  const [showShortcuts, setShowShortcuts] = useState(false)
  useEffect(() => {
    const onShortcut = (e: Event) => {
      const detail = (e as CustomEvent<ShortcutEventDetail>).detail
      if (!detail) return
      // 路由跳转 (g h / g w / g a / g s / g e)
      const route = getRouteForAction(detail.action)
      if (route) {
        track('feature_used', { feature: 'shortcut_goto', to: route.to, combo: detail.combo })
        navigate(route.to)
        return
      }
      // 显示 / 关闭快捷键面板
      if (detail.action === 'show-shortcuts') {
        setShowShortcuts((prev) => !prev)
        return
      }
      // close-modal: 业务无关, 让 modal 自己监听 Esc (本组件的 modal 收到 onClose)
      // 这里不强制关闭, 保持 Layout 状态干净 (避免 'esc' 误关 NavLink 之类)
    }
    window.addEventListener(SHORTCUT_EVENT, onShortcut as EventListener)
    return () => window.removeEventListener(SHORTCUT_EVENT, onShortcut as EventListener)
  }, [navigate])

  // W148-A: 打开 modal 时禁用全局快捷键 (避免 g h 误触跳转; j/k/Enter 也暂停)
  //  Esc 仍由 modal 内部 Esc 监听 (复用 src/components/Modal.tsx 的现有逻辑, 不动)
  //  注意: 本组件用自渲染的 KeyboardShortcutsModal (不基于 Modal.tsx, 是 info-only)
  //  我们自己加 Esc 关闭 + backdrop 点击关闭
  useEffect(() => {
    if (showShortcuts) {
      setShortcutsEnabled(false)
      return () => setShortcutsEnabled(true)
    }
  }, [showShortcuts])

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
        <nav ref={navRef} className="flex-1 min-h-0 px-3 py-4 space-y-3 overflow-y-auto">
          {/* W121: 4 大 组 折 叠 (学 习/练 习/复 习/设 置) — 22 项 收 敛 */}
          {desktopGroups.map((group) => {
            // 折 叠 状 态: 默 认 学 习 展 开, 其 余 折 叠
            const groupKey = group.label
            const isOpen = openGroups[groupKey] ?? (groupKey === '学习')
            return (
              <div key={groupKey}>
                <button
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [groupKey]: !isOpen }))}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider hover:text-stone-700 dark:hover:text-stone-200 transition-colors duration-[var(--t-fast)]"
                  aria-expanded={isOpen}
                >
                  <span>{group.label}</span>
                  <span
                    className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
                    style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                  >
                    <IconArrow size={12} strokeWidth={2.5} />
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.Icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          aria-label={item.label}
                          className={({ isActive }) =>
                            `nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-[var(--t-fast)] ease-[var(--ease)] ${
                              isActive
                                ? 'active-nav bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                            }`
                          }
                        >
                          <Icon size={16} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
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
          <h1
            // W149 反馈 33: 路由切换时 sidebar 标题淡入 (key 触发重 mount → animation 重跑)
            key={shortTitle}
            className={`text-lg font-semibold sidebar-title-anim ${isHome ? 'text-brand-600' : 'text-stone-700 dark:text-stone-200'}`}
          >
            {shortTitle}
          </h1>
          <div className="w-6" />
        </div>
      </header>

      {/* W131: 离线状态 banner — 顶部, 跨页可见 */}
      <OfflineBanner />
      {/* 主内容 — W149 反馈 1: 切页面生硬 → pageEnter fade-up 240ms
       *                    W149 反馈 2: 骨架闪 → 改用 CSS class toggle 触发 (不依赖 React key 重 mount, 避免 Suspense fallback 闪) */}
      <main id="main-content" tabIndex={-1} className="flex-1 md:ml-56 pb-20 md:pb-0">
        <div ref={contentRef} className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Toast 通知 (顶部居中堆叠) */}
      <ToastContainer />
      {/* W146: 反馈回路 — 浮动反馈按钮 + 7天 NPS 提示 */}
      <FeedbackButton />
      <NpsPrompt />
      {/* W148-A: 全局快捷键面板 — '?' 触发, Esc / 再按 '?' / 点击背景 关闭 */}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

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
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2.5 text-xs transition-colors duration-[var(--t-fast)] ${
                    isActive
                      ? 'text-brand-600'
                      : 'text-stone-500 dark:text-stone-400'
                  }`
                }
              >
                <Icon size={22} strokeWidth={2} className="mb-0.5" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
