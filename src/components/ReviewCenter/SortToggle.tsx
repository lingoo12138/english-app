// v1.11.0-B: 复习中心智能排序切换
// 显示当前模式 (智能/时间), 点击切换
interface Props {
  smartSort: boolean
  onChange: (next: boolean) => void
}

export default function SortToggle({ smartSort, onChange }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!smartSort)}
      aria-pressed={smartSort}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] ${
        smartSort
          ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
      }`}
      title="切换复习排序: 智能 (按价值) / 时间 (按到期先后)"
    >
      <span className="text-sm leading-none">🎯</span>
      <span className="leading-none">
        智能排序: {smartSort ? '开' : '关'}
      </span>
      <span className="text-[10px] opacity-70 leading-none">
        ({smartSort ? '按价值' : '按时间'})
      </span>
    </button>
  )
}
