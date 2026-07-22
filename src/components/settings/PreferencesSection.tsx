// 学习偏好 - v0.22.2
import { useStore } from '../../store/useStore'

export default function PreferencesSection() {
  const targetLevel = useStore(s => s.targetLevel)
  const setTargetLevel = useStore(s => s.setTargetLevel)
  const dailyGoal = useStore(s => s.dailyGoal)
  const setDailyGoal = useStore(s => s.setDailyGoal)

  return (
    <section className="card">
      <h3 className="font-semibold mb-3">🎯 学习偏好</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">目标学段</label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value as any)}
            className="input"
          >
            <option value="all">全部</option>
            <option value="primary">小学</option>
            <option value="junior">初中</option>
            <option value="senior">高中</option>
            <option value="gaozhong">高考</option>
            <option value="cet4">CET-4</option>
            <option value="cet6">CET-6</option>
            <option value="kaoyan">考研</option>
            <option value="daily">日常</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
            每日目标: {dailyGoal} 个词
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}
