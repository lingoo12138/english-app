// 单词卡组件
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { markWordCompleted } from '../lib/plan'
import { useStore } from '../store/useStore'
import type { Word } from '../types'
import TTSButton from './TTSButton'
import { LEVELS } from '../lib/words'

interface Props {
  word: Word
  isFavorite?: boolean
  onToggleFavorite?: () => void
  favCount?: number  // W102: 跨页 集成
  onClickFavs?: () => void  // W102: 跳 释义收藏 跨词
}

// v2.1.0: 内联 SVG (0 依赖) 替 换 emoji, 跟 改版稿一致
function StarIcon({ filled, size = 16, className = '' }: { filled: boolean; size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// v2.1.0: React.memo 优 化, prop 不 变 跳 过 重 渲 (省 49 reconcile / 翻 页)
function WordCardInner({ word, isFavorite, onToggleFavorite, favCount, onClickFavs }: Props) {
  const dailyGoal = useStore(s => s.dailyGoal)
  const level = LEVELS.find(l => l.value === word.level)

  return (
    <Link
      to={`/words/${word.id}`}
      onClick={() => {
        // v0.22.5: 点击词卡跳转时, 标记今日计划完成
        // P2 修: 用静态 import,避免每次创建 chunk
        markWordCompleted(word.id, undefined, dailyGoal)
      }}
      className="card-interactive flex items-center gap-3 active:scale-[0.98] no-select"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-lg font-semibold truncate">{word.word}</h3>
          {/* W117: 音标用 mono + tabular-nums 等宽对齐 */}
          <span className="text-xs text-stone-400 dark:text-stone-300 truncate font-mono tabular-nums">{word.phonetic}</span>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
          {word.translations[0]}
          {word.translations.length > 1 && <span className="text-stone-400 dark:text-stone-300"> · +{word.translations.length - 1}</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {level && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${level.color}`}>
              {level.label}
            </span>
          )}
          {word.tags.slice(0, 1).map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 修复: stopPropagation 阻止 Link 导航(preventDefault 在 child 上不会阻止冒泡) */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors duration-[var(--t-fast)]"
            aria-label={isFavorite ? '取消收藏' : '收藏'}
          >
            {/* v2.1.0: 内联 SVG 替 换 emoji (0 依赖) */}
            {isFavorite
              ? <StarIcon filled size={16} className="text-amber-500" />
              : <StarIcon filled={false} size={16} className="text-stone-400" />}
          </button>
        )}
        {/* TTSButton 内部已在 useEffect cleanup 里 stopSpeak,但点击事件需要 stopPropagation */}
        <span onClick={(e) => e.stopPropagation()}>
          <TTSButton text={word.word} size="sm" />
        </span>
        {/* W102: 收藏 数量 跳 链接 */}
        {favCount !== undefined && favCount > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onClickFavs?.() }}
            className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors duration-[var(--t-fast)] flex items-center gap-1"
            title="跳 释义收藏 跨词 模式"
          >
            <StarIcon filled size={11} />{favCount} 收藏
          </button>
        )}
      </div>
    </Link>
  )
}

// v2.1.0: React.memo - 词 id/isFavorite 不 变 跳 过 重 渲
// W135: 加 favCount 浅比较 (收藏数变化时才重渲, 词内容不变就跳过)
const WordCard = memo(WordCardInner, (prev, next) => {
  return (
    prev.word.id === next.word.id &&
    prev.isFavorite === next.isFavorite &&
    prev.favCount === next.favCount
  )
})

export default WordCard
