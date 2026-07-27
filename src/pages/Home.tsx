import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import Onboarding, { isOnboarded } from '../components/Onboarding'
import TodayPlanCard from '../components/home/TodayPlanCard'
import DailySentenceCard from '../components/home/DailySentenceCard'
import ReviewReminderCard from '../components/home/ReviewReminderCard'
import StudyCalendar from '../components/StudyCalendar'
import { ShareModal } from '../components/ShareModal'
import { loadAchievementStats, getUnlockedCount, getNextAchievement } from '../lib/achievements'
import { getTodaySentence } from '../lib/daily'
import { loadWords, LEVELS } from '../lib/words'
import type { Word, DailySentence } from '../types'
import { useStats, useStore } from '../store/useStore'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'
import { getDueReviews, logAction } from '../lib/db'
import { generateTodayPlan, markWordCompleted, type TodayPlan } from '../lib/plan'
// v1.42.0 W42: streak UI 集成
import { getStreakWithMilestones, getStreakMessage, type StreakMilestone } from '../lib/streak'
// v1.43.0 W43-B: XP/level 游戏化
import { getXPState, type XPCurrentState } from '../lib/xpSystem'
import { toast } from '../components/Toast'

export default function Home() {
  const [sentence, setSentence] = useState<DailySentence | null>(null)
  const [wordOfDay, setWordOfDay] = useState<Word | null>(null)
  const [fav, setFav] = useState(false)
  // v1.42.0 W42: streak 状态
  const [streakState, setStreakState] = useState<{
    current: number
    longest: number
    milestones: StreakMilestone[]
    nextMilestone: StreakMilestone | null
    daysToNext: number
  } | null>(null)
  const [dueReviewCount, setDueReviewCount] = useState(0)
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean>(() => isOnboarded())
  const [achievementStats, setAchievementStats] = useState<Awaited<ReturnType<typeof loadAchievementStats>> | null>(null)
  // v1.43.0 W43-B: XP/level 状态
  const [xpState, setXpState] = useState<XPCurrentState>(() => getXPState())
  const dailyGoal = useStore(s => s.dailyGoal)
  const stats = useStats()
  const targetLevel = useStore(s => s.targetLevel)

  useEffect(() => {
    setSentence(getTodaySentence())
    loadWords().then((words) => {
      // 修复: 每日一词用日期 + targetLevel 确定性选择(同一天同一个词)
      const filtered = targetLevel === 'all' ? words : words.filter(w => w.level === targetLevel)
      const candidates = filtered.length > 0 ? filtered : words
      const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
      const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const idx = seed % candidates.length
      setWordOfDay(candidates[idx])
    })
    // 获取待复习数量
    getDueReviews().then(reviews => setDueReviewCount(reviews.length))
    // v0.22.3: 加载今日学习计划
    generateTodayPlan(dailyGoal, targetLevel).then(setPlan)
  }, [targetLevel, dailyGoal])

  useEffect(() => {
    if (wordOfDay) {
      isFavorite(wordOfDay.id).then(setFav)
    }
  }, [wordOfDay])

  // v1.42.0 W42: 加载 streak
  useEffect(() => {
    getStreakWithMilestones().then(setStreakState).catch(() => setStreakState(null))
  }, [])

  // v0.22.3: 标记 plan 词为已完成
  const handleMarkPlanWord = async (wordId: string) => {
    markWordCompleted(wordId, undefined, dailyGoal)
    await logAction(wordId, 'view')
    const newPlan = await generateTodayPlan(dailyGoal, targetLevel)
    setPlan(newPlan)
    // v1.43.0 W43-B: 刷新 XP 状态 (addXP 由 plan.ts markWordCompleted 内部触发)
    setXpState(getXPState())
  }

  // v1.43.0 W43-B: 升级检测 — xpState.level 变化时弹 toast
  const prevLevelRef = useRef<number>(xpState.level)
  useEffect(() => {
    if (xpState.level > prevLevelRef.current) {
      toast.success(`🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!`)
    }
    prevLevelRef.current = xpState.level
  }, [xpState.level, xpState.levelTitle])

  const toggleFav = async () => {
    if (!wordOfDay) return
    if (fav) {
      await removeFavorite(wordOfDay.id)
      setFav(false)
    } else {
      await addFavorite(wordOfDay.id)
      setFav(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部欢迎 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">你好 👋</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">今天来学点新东西吧</p>
        </div>
        {/* v1.1-F1: 分享按钮 */}
        <button
          onClick={() => setShowShare(true)}
          className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm hover:shadow-md active:scale-95 transition"
        >
          📤 分享
        </button>
      </div>

      {/* v1.8.0-A: 首启 onboarding CTA (仅未引导用户可见) */}
      {!onboarded && (
        <button
          onClick={() => setShowOnboarding(true)}
          className="w-full card bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/30 dark:to-emerald-900/30 border-2 border-brand-300 dark:border-brand-700 hover:shadow-md active:scale-[0.98] transition-all text-left"
          aria-label="打开首启引导"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl" aria-hidden="true">👋</div>
            <div className="flex-1">
              <div className="font-semibold text-base">第一次来? 跟我 5 分钟了解</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                选学段 · 体验跟读 · 收个生词 — 3 步上手
              </div>
            </div>
            <div className="text-brand-600 dark:text-brand-400 text-xl" aria-hidden="true">→</div>
          </div>
        </button>
      )}

      {/* v1.43.0 W43-B: XP/level 进度卡 */}
      <div className="card bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 dark:from-violet-900/20 dark:via-fuchsia-900/20 dark:to-pink-900/20 border border-violet-200 dark:border-violet-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">Lv.{xpState.level}</div>
            <div>
              <div className="text-sm font-semibold">{xpState.levelTitle}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">
                {xpState.isMaxLevel ? '已满级' : `再 ${xpState.nextLevelXP} XP 升级`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 dark:text-stone-400">总 XP</div>
            <div className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">{xpState.totalXP}</div>
          </div>
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${Math.round(xpState.progress * 100)}%` }}
          />
        </div>
      </div>

      {/* v1.3-F2: 成就卡 */}
      {achievementStats && (
        <Link
          to="/achievements"
          className="card bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-3 hover:shadow-md transition"
        >
          <div className="text-3xl">🏆</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">成就</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              已解锁 <b className="text-amber-600 dark:text-amber-400">{getUnlockedCount(achievementStats)}</b> / 19
              {(() => {
                const next = getNextAchievement(achievementStats)
                return next ? ` · 下一: ${next.achievement.emoji} ${next.achievement.title}` : ''
              })()}
            </div>
          </div>
          <div className="text-stone-400">→</div>
        </Link>
      )}

      {/* v1.11.0-C: 日报/周报入口 */}
      <Link
        to="/reports"
        className="card bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 flex items-center gap-3 hover:shadow-md transition"
      >
        <div className="text-3xl">📊</div>
        <div className="flex-1">
          <div className="font-semibold text-sm">日报 / 周报</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">今日数据 · 7 天汇总 · 同周对比</div>
        </div>
        <div className="text-stone-400">→</div>
      </Link>

      {/* v1.14.0: 自定义场景入口 */}
      <Link
        to="/custom-scenes"
        className="card bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 flex items-center gap-3 hover:shadow-md transition"
      >
        <div className="text-3xl">📝</div>
        <div className="flex-1">
          <div className="font-semibold text-sm">自定义场景</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">粘贴文本 · AI 提取生词 · 专属场景</div>
        </div>
        <div className="text-stone-400">→</div>
      </Link>

      {/* v1.19.0: 学习日历入口 */}
      <Link
        to="/calendar"
        className="card bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3 hover:shadow-md transition"
      >
        <div className="text-3xl">📅</div>
        <div className="flex-1">
          <div className="font-semibold text-sm">学习日历</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">月度学习可视化 · 热力图</div>
        </div>
        <div className="text-stone-400">→</div>
      </Link>

      {/* 学习数据卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.todayCount}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">今日学词</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.totalLearned}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">累计学词</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.favoriteCount}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">生词</div>
        </div>
      </div>

      {/* v0.22.3: 今日学习计划 */}
      {plan && plan.total > 0 && (
        <TodayPlanCard plan={plan} onMarkWord={handleMarkPlanWord} />
      )}

      {/* 每日一句 */}
      {sentence && (
        <DailySentenceCard sentence={sentence} />
      )}

      {/* 每日一词 */}
      {wordOfDay && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded-full">每日一词</span>
            <button
              onClick={toggleFav}
              className="text-xl"
            >
              {fav ? '⭐' : '☆'}
            </button>
          </div>
          <Link to={`/words/${wordOfDay.id}`} className="block">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-3xl font-bold">{wordOfDay.word}</h2>
              <span className="text-sm text-stone-400 dark:text-stone-300">{wordOfDay.phonetic}</span>
            </div>
            <p className="text-base text-stone-700 dark:text-stone-300 mb-3">
              {wordOfDay.translations.join(' · ')}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
              {wordOfDay.examples[0]?.en}
            </p>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <TTSButton text={wordOfDay.word} />
            <TTSButton text={wordOfDay.examples[0]?.en || ''} variant="text" />
          </div>
        </div>
      )}

      {/* 复习提醒 */}
      <ReviewReminderCard dueCount={dueReviewCount} />

      {/* v1.42.0 W42: streak 里程碑 */}
      {streakState && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">🏆 连续学习</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {getStreakMessage(streakState.current).message}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {getStreakMessage(streakState.current).emoji} {streakState.current}
              </div>
              <div className="text-[10px] text-stone-500">
                天 (最长 {streakState.longest})
              </div>
            </div>
          </div>

          {/* 下一里程碑 */}
          {streakState.nextMilestone && (
            <div className="text-xs text-stone-600 dark:text-stone-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded mb-3">
              下一里程碑: {streakState.nextMilestone.emoji} {streakState.nextMilestone.label} ({streakState.nextMilestone.days} 天) — 还有 {streakState.daysToNext} 天
            </div>
          )}

          {/* 7 里程碑进度 */}
          <div className="flex justify-between items-center gap-1">
            {streakState.milestones.map(m => (
              <div
                key={m.days}
                className={`flex-1 text-center text-xs py-1.5 rounded ${
                  m.reached
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                }`}
                title={`${m.label} (${m.days} 天)${m.reached ? ' ✓' : ''}`}
              >
                <div className="text-base">{m.emoji}</div>
                <div className="text-[9px]">{m.days}d</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 学习日历 */}
      <div className="card">
        <StudyCalendar days={84} compact />
      </div>

      {/* 快捷入口 - 修复: 4 个一组,场景课作为独立大卡 (避免 col-span-2 破坏网格) */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-3">快捷入口</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/words" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-medium">浏览词库</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">5000+ 高频词</div>
          </Link>
          <Link to="/review" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-medium">复习中心</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">智能间隔重复</div>
          </Link>
          <Link to="/translate" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">🔤</div>
            <div className="font-medium">中英翻译</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">即时查询</div>
          </Link>
          <Link to="/notebook" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">⭐</div>
            <div className="font-medium">我的生词</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{stats.favoriteCount} 个</div>
          </Link>
        </div>
        {/* 场景专题课 / 拍照识物 / 每日一句作为独立推荐区 */}
        <div className="mt-3 grid grid-cols-1 gap-3">
          <Link to="/scenes" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 no-select">
            <div className="text-3xl">🎬</div>
            <div className="flex-1">
              <div className="font-medium">场景专题课</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">5 个真实场景 · 真实能用</div>
            </div>
            <div className="text-stone-400 dark:text-stone-300">→</div>
          </Link>
          <Link to="/camera" key="camera" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 no-select">
            <div className="text-3xl">📷</div>
            <div className="flex-1">
              <div className="font-medium">拍照识物</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">AI 识别图片,返回英文 + 例句</div>
            </div>
            <div className="text-stone-400 dark:text-stone-300">→</div>
          </Link>
          <Link to="/chat" key="chat" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 no-select">
            <div className="text-3xl">💬</div>
            <div className="flex-1">
              <div className="font-medium">AI 对话陪练</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">5 个场景 · 6 个难度 · Mock 零成本测试</div>
            </div>
            <div className="text-stone-400 dark:text-stone-300">→</div>
          </Link>
          <Link to="/plan" key="plan" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 no-select">
            <div className="text-3xl">📅</div>
            <div className="flex-1">
              <div className="font-medium">学习计划</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">7 天曲线 · 连续天数 · 今日详情</div>
            </div>
            <div className="text-stone-400 dark:text-stone-300">→</div>
          </Link>
          <Link to="/write" key="write" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 no-select">
            <div className="text-3xl">✍️</div>
            <div className="flex-1">
              <div className="font-medium">写作批改</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">AI 改错 + 标色 diff + 一键收藏生词</div>
            </div>
            <div className="text-stone-400 dark:text-stone-300">→</div>
          </Link>
        </div>
      </div>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} />
      {/* v1.8.0-A: 首启 onboarding (受控) */}
      <Onboarding
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false)
          setOnboarded(true)  // 同步状态,不需刷新
        }}
      />
    </div>
  )
}
