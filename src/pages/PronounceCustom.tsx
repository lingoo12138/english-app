import { useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import PronunciationPractice from '../components/PronunciationPractice'

/**
 * 跟读练习入口(自定义文本)
 * 用法: /pronounce-custom?text=...
 * - text 为空时引导用户返回每日一句
 * - text 通过 PronunciationPractice 的 customText prop 注入
 */
export default function PronounceCustom() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // 用 useMemo 避免每次渲染重新计算(虽然 decodeURIComponent 廉价,但 searchParams 对象稳定些)
  const text = useMemo(() => {
    const raw = params.get('text') || ''
    try { return decodeURIComponent(raw) } catch { return raw }
  }, [params])

  if (!text) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-ghost">← 返回</button>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3" aria-hidden="true">🤷</div>
          <p className="text-lg mb-1">没有可跟读的文本</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            请从「每日一句」点 🎤 跟读 按钮进入
          </p>
          <Link to="/daily" className="btn-primary inline-block">去每日一句</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost">← 返回</button>
        <Link to="/daily" className="btn-ghost text-sm">返回每日一句</Link>
      </div>

      {/* 顶部: 显示当前要跟读的文本 */}
      <div className="card bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg" aria-hidden="true">✨</span>
          <span className="text-xs px-2 py-0.5 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full">
            每日一句跟读
          </span>
        </div>
        <p className="text-xl font-medium leading-relaxed text-stone-800 dark:text-stone-100">
          {text}
        </p>
      </div>

      {/* 跟读组件(传入 customText) */}
      <PronunciationPractice key={text} word={text} customText={text} wordId={`daily-custom-${text.slice(0, 32)}`} />
    </div>
  )
}
