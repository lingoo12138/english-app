// 单词卡组件
import { Link } from 'react-router-dom'
import type { Word } from '../types'
import TTSButton from './TTSButton'
import { LEVELS } from '../lib/words'

interface Props {
  word: Word
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export default function WordCard({ word, isFavorite, onToggleFavorite }: Props) {
  const level = LEVELS.find(l => l.value === word.level)

  return (
    <Link
      to={`/words/${word.id}`}
      className="card flex items-center gap-3 hover:shadow-md active:scale-[0.98] transition-all no-select"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-lg font-semibold truncate">{word.word}</h3>
          <span className="text-xs text-stone-400 dark:text-stone-300 truncate">{word.phonetic}</span>
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
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-700"
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        )}
        {/* TTSButton 内部已在 useEffect cleanup 里 stopSpeak,但点击事件需要 stopPropagation */}
        <span onClick={(e) => e.stopPropagation()}>
          <TTSButton text={word.word} size="sm" />
        </span>
      </div>
    </Link>
  )
}
