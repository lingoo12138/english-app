// W149 反馈 14: 错误页 (404) 插画淡入
import { useNavigate } from 'react-router-dom'
import { IconBook } from '../components/Icon'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="page-transition min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
      {/* 大数字 fade-up */}
      <div className="animate-[modalPopup_0.6s_var(--ease-spring)_both]">
        <div className="text-9xl font-bold text-brand-500 dark:text-brand-400 select-none">
          404
        </div>
      </div>
      {/* 标题 + 副标题 */}
      <div
        className="space-y-2"
        style={{ animation: 'pageEnter 0.4s var(--ease-spring) 0.15s both' }}
      >
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
          页面走丢了
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm">
          你访问的页面不存在, 可能是链接过期或者输入有误.
          <br />
          要不要回首页看看?
        </p>
      </div>
      {/* 按钮组 (fade-up 错落) */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition-all duration-[var(--t-fast)]"
          style={{ animation: 'pageEnter 0.4s var(--ease-spring) 0.25s both' }}
        >
          ← 返回
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all duration-[var(--t-fast)]"
          style={{ animation: 'pageEnter 0.4s var(--ease-spring) 0.30s both' }}
        >
          <IconBook size={14} className="inline-block mr-1 align-text-bottom" />
          回到首页
        </button>
      </div>
    </div>
  )
}
