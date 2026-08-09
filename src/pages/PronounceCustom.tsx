// src/pages/PronounceCustom.tsx - W126 改版稿 UI
// 顶 部: 标 题 居 中 + 3 圆 按 钮 (返 回/占位/日 常) (W123d 风 格)
// 0 emoji 操 作 装 饰, 全 Icon SVG (W118), 0 依 赖
// 用 法: /pronounce-custom?text=...  -  text 为 空 时 引 导 用 户 返 回
import { useMemo, useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import PronunciationPractice from '../components/PronunciationPractice'
import {
  IconArrow, IconSparkles, IconBook, IconWaving,
} from '../components/Icon'

export default function PronounceCustom() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // 用 useMemo 避免每次渲染重新计算(虽然 decodeURIComponent 廉价,但 searchParams 对象稳定些)
  const text = useMemo(() => {
    const raw = params.get('text') || ''
    try { return decodeURIComponent(raw) } catch { return raw }
  }, [params])

  // W126: openGroups 折 叠 状 态 + localStorage 持 久 化 (W121 风 格)
  const [openTip, setOpenTip] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('pronounce-custom-open-groups')
      return saved ? JSON.parse(saved) : { tip: true }
    } catch {
      return { tip: true }
    }
  })
  useEffect(() => {
    localStorage.setItem('pronounce-custom-open-groups', JSON.stringify(openTip))
  }, [openTip])

  if (!text) {
    return (
      <div className="space-y-4">
        {/* W123d 风 格 顶 部: 返 回 + 标 题 + 占 位 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
            aria-label="返回上一页"
          >
            <span className="inline-block rotate-180"><IconArrow size={16} /></span>
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <IconWaving size={20} className="text-brand-500" />
            跟读练习
          </h1>
          <div className="w-9" /> {/* spacer */}
        </div>

        <div className="card card-interactive text-center py-10">
          <IconWaving size={48} className="mx-auto mb-3 text-stone-400" aria-hidden="true" />
          <p className="text-lg mb-1">没有可跟读的文本</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            请从「每日一句」点 跟读 按钮进入
          </p>
          <Link to="/daily" className="btn-primary inline-block">
            去每日一句
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* W123d 风 格 顶 部: 返 回 + 标 题 + 入 口 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回上一页"
        >
          <span className="inline-block rotate-180"><IconArrow size={16} /></span>
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <IconSparkles size={20} className="text-brand-500" />
          跟读练习
        </h1>
        <Link
          to="/daily"
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回每日一句"
        >
          <IconBook size={16} />
        </Link>
      </div>

      {/* 顶部: 显示当前要跟读的文本 (W113 渐变 + 状态徽章) */}
      <div className="card card-interactive bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800">
        <div className="flex items-center gap-2 mb-2">
          <IconSparkles size={16} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <span className="text-xs px-2 py-0.5 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full border border-brand-200 dark:border-brand-800 font-medium">
            每日一句跟读
          </span>
        </div>
        <p className="text-xl font-medium leading-relaxed text-stone-800 dark:text-stone-100 font-mono tabular-nums">
          {text}
        </p>
      </div>

      {/* 跟读提示折 叠 (W121 风 格) */}
      <div className="card">
        <button
          onClick={() => setOpenTip((p) => ({ ...p, tip: !p.tip }))}
          className="w-full flex items-center justify-between text-sm font-medium text-stone-600 dark:text-stone-300 transition-colors duration-[var(--t-fast)]"
          aria-expanded={openTip.tip ?? true}
          aria-label="跟读提示"
        >
          <span className="flex items-center gap-2">
            <IconSparkles size={14} className="text-brand-500" />
            跟读小贴士
          </span>
          <span
            className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
            style={{ transform: (openTip.tip ?? true) ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <IconArrow size={14} strokeWidth={2.5} className="rotate-90" />
          </span>
        </button>
        {(openTip.tip ?? true) && (
          <ul className="mt-3 space-y-1 text-sm text-stone-600 dark:text-stone-400 pl-2">
            <li>· 找一个安静环境, 距离麦克风一拳距离</li>
            <li>· 先听 1-2 遍, 模仿语调和节奏</li>
            <li>· 录音时保持匀速, 不要抢读</li>
            <li>· 错也别紧张, 反复练就会进步</li>
          </ul>
        )}
      </div>

      {/* 跟读组件(传入 customText) */}
      <PronunciationPractice key={text} word={text} customText={text} wordId={`daily-custom-${text.slice(0, 32)}`} />
    </div>
  )
}
