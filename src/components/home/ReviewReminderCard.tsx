// W4-B: Home 拆组件 - 复习提醒
import { Link } from 'react-router-dom'

interface Props {
  dueCount: number
}

export default function ReviewReminderCard({ dueCount }: Props) {
  if (dueCount <= 0) return null
  return (
    <Link
      to="/review"
      className="card flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 hover:shadow-md active:scale-[0.98] transition-all no-select"
    >
      <div className="text-3xl">📝</div>
      <div className="flex-1">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">
          有 {dueCount} 个词该复习了
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-300">按记忆曲线,趁热打铁</p>
      </div>
      <div className="text-amber-600 dark:text-amber-400">→</div>
    </Link>
  )
}
