// src/components/home/DailyWordCard.tsx - W143 LCP 优化
// 拆出 Home 每日一词卡片, 初始 Skeleton 占位, 让 LCP element 立即 paint
// 真实数据异步替换 (loadWords 6.3MB JSON 解析完才 set)
import { Link } from 'react-router-dom'
import TTSButton from '../TTSButton'
import type { Word } from '../../types'

interface Props {
  word: Word | null
  isLoading: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function DailyWordCard({ word, isLoading, isFavorite, onToggleFavorite }: Props) {
  // W143: 初始 Skeleton 占位 (LCP element 立即 paint)
  // 重要: Skeleton 和 Real 两态布局完全一致 (高度/padding/字号), 防止 CLS
  if (isLoading || !word) {
    return (
      <div className="card" aria-busy="true" aria-label="每日一词加载中">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded-full">每日一词</span>
          <button
            disabled
            aria-label="收藏"
            className="text-xl text-stone-300 dark:text-stone-600 cursor-not-allowed w-6 h-6"
          >
            ☆
          </button>
        </div>
        <div className="block">
          {/* 词头行: 固定 h-9 (36px) 对应 text-3xl + line-height 2.25rem */}
          <div className="flex items-baseline gap-2 mb-2 min-h-[2.25rem]">
            <div className="h-7 bg-stone-200 dark:bg-stone-700 rounded animate-pulse w-1/3" />
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse w-16" />
          </div>
          {/* 翻译行: 固定 min-h 24px 对应 text-base */}
          <div className="h-5 bg-stone-200 dark:bg-stone-700 rounded animate-pulse w-2/3 mb-3" />
          {/* LCP element: 固定 min-h 40px (2.5rem) 对应 text-sm line-clamp-2 */}
          <p
            className="text-sm text-stone-300 dark:text-stone-600 line-clamp-2 min-h-[2.5rem]"
            data-testid="daily-word-skeleton-p"
          >
            加载每日一词例句中…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded-full">每日一词</span>
        <button
          onClick={onToggleFavorite}
          className="text-xl w-6 h-6"
          aria-label={isFavorite ? '取消收藏' : '收藏'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>
      </div>
      <Link to={`/words/${word.id}`} className="block">
        <div className="flex items-baseline gap-2 mb-2 min-h-[2.25rem]">
          <h2 className="text-3xl font-bold">{word.word}</h2>
          {/* W144 a11y: 音标 contrast 2.52:1 → 4.6:1 (text-stone-500 on #fff) / 11+:1 (text-stone-200 on #1c1917 dark) */}
          <span className="text-sm text-stone-500 dark:text-stone-200">{word.phonetic}</span>
        </div>
        <p className="text-base text-stone-700 dark:text-stone-300 mb-3 min-h-[1.25rem]">
          {word.translations.join(' · ')}
        </p>
        <p
          className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 min-h-[2.5rem]"
          data-testid="daily-word-real-p"
        >
          {word.examples[0]?.en}
        </p>
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <TTSButton text={word.word} />
        <TTSButton text={word.examples[0]?.en || ''} variant="text" />
      </div>
    </div>
  )
}

export default DailyWordCard
