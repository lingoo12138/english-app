// W4-B: Home 拆组件 - 每日一句
import { Link } from 'react-router-dom'
import TTSButton from '../TTSButton'
import type { DailySentence } from '../../types'

interface Props {
  sentence: DailySentence
}

export default function DailySentenceCard({ sentence }: Props) {
  return (
    <Link
      to="/daily"
      className="block card bg-gradient-to-br from-brand-500 to-brand-600 text-white no-select"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">每日一句</span>
        <span className="text-xs opacity-80">{sentence.scene}</span>
      </div>
      <p className="text-xl font-medium mb-2 leading-relaxed">{sentence.en}</p>
      <p className="text-sm opacity-90">{sentence.zh}</p>
      <div className="mt-3 flex items-center gap-2">
        <TTSButton text={sentence.en} variant="text" />
        <span className="text-xs opacity-70">点击查看全部 →</span>
      </div>
    </Link>
  )
}
