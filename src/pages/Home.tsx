import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import Onboarding, { isOnboarded } from '../components/Onboarding'
import TodayPlanCard from '../components/home/TodayPlanCard'
import DailySentenceCard from '../components/home/DailySentenceCard'
// W143: 拆出每日一词子组件, 初始 Skeleton 占位, LCP 立即 paint
import DailyWordCard from '../components/home/DailyWordCard'
import ReviewReminderCard from '../components/home/ReviewReminderCard'
import { ShareModal } from '../components/ShareModal'
import { IconWaving, IconTrophy, IconBarChart, IconEdit, IconCalendar, IconVideo, IconChat, IconHeadphones, IconStar } from '../components/Icon'
import { loadAchievementStats, getUnlockedCount, getNextAchievement } from '../lib/achievements'
import { getTodaySentence } from '../lib/daily'
import { loadWords, loadWordsByLetter } from '../lib/words'
import type { Word, DailySentence } from '../types'
import { useStats, useStore } from '../store/useStore'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'
import { getDueReviews, logAction } from '../lib/db'
import { generateTodayPlan, markWordCompleted, type TodayPlan } from '../lib/plan'
// v1.42.0 W42: streak UI 集成
import { getStreakWithMilestones, getStreakMessage, type StreakMilestone } from '../lib/streak'
// v1.43.0 W43-B: XP/level 游戏化
import { getXPState, type XPCurrentState } from '../lib/xpSystem'
import { useTranslate } from '../lib/useTranslate'
import { toast } from '../components/Toast'
import { CountUp } from '../components/CountUp'

export default function Home() {
  const [sentence, setSentence] = useState<DailySentence | null>(null)
  // W143: wordLoading 默认 true, 初始 Skeleton 占位, LCP element 立即 paint
  const [wordOfDay, setWordOfDay] = useState<Word | null>(null)
  const [wordLoading, setWordLoading] = useState(true)
  const [fav, setFav] = useState(false)
  // v1.42.0 W42: streak 状态
  const [streakState, setStreakState] = useState<{
    current: number
    longest: number
    milestones: StreakMilestone[]
    nextMilestone: StreakMilestone | null
    daysToNext: number
  } | null>(null)
  const { t } = useTranslate()
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
    // W143: 加载开始时重置 wordLoading=true (targetLevel 切换时重新走 Skeleton)
    setWordLoading(true)
    // W145: 每日一词改按需加载 — 1 fetch ~196KB (单 chunk) vs 6.3MB 全量
    // 1. 用 date + targetLevel seed 选 1 个 first_letter
    // 2. fetch 那个 letter 的 chunk (~196KB)
    // 3. chunk 内按 seed 选 1 个 word
    const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
    const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    // 25 个字母 (a-z 不含 x), seed 选 1 个
    const letters = 'abcdefghijklmnopqrstuvwyz'
    const letter = letters[seed % letters.length]
    loadWordsByLetter(letter).then((chunk) => {
      // 按 targetLevel 筛 (chunk 通常是同字母全 level, 可能 0 命中)
      const filtered = targetLevel === 'all' ? chunk : chunk.filter(w => w.level === targetLevel)
      const candidates = filtered.length > 0 ? filtered : chunk
      if (candidates.length > 0) {
        const idx = seed % candidates.length
        setWordOfDay(candidates[idx])
      }
      // W143: loadWordsByLetter 完成 → 关闭 Skeleton, 真实数据替换
      // 注意: 即使 chunk 为空也要关闭 loading, 否则永远 skeleton
      setWordLoading(false)
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
      {/* W148: 桌面 1280px+ 两栏 (主 + 右侧快捷面板: 今日计划 + 复习提醒)
        * - 0-1279px 保持单栏原样
        * - xl 断点: 主列 flex-1 + 右侧 240px (sticky)
        * - 移动端优先: 用 CSS class 切换, 不破坏现有 stack
      */}
      <div className="xl:flex xl:gap-6 xl:items-start">
        <div className="space-y-6 xl:flex-1 xl:min-w-0">
      {/* W115 MainCTA: 合 并 欢 迎 + 分享 + onboarding CTA + 今 日 学 (改 良 稿 第 3 步) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white p-5 shadow-[0_4px_16px_rgba(34,197,94,0.25)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight"><IconWaving size={22} className="inline-block mr-1" /> {t('home.welcome')}</h1>
            <p className="text-sm opacity-90 mt-1">今天来学点新东西吧</p>
          </div>
          {/* W144 a11y: text-xs px-3 py-1.5 → min-h-6 m-1 (24px 高度 + 间距, WCAG 2.5.8 target-size) */}
          <button
            onClick={() => setShowShare(true)}
            className="text-xs px-3 min-h-6 m-1 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 active:scale-95 transition-all duration-[var(--t-base)] ease-[var(--ease)] flex items-center"
            aria-label="分享学习进度"
          >
            📤 分享
          </button>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/15">
          <div className="flex-1">
            <div className="text-base font-semibold">今日学 5 词</div>
            <div className="text-xs opacity-85 mt-0.5">3 步上手 · 5 分钟</div>
          </div>
          <Link
            to="/words"
            className="bg-white/25 backdrop-blur text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/35 active:scale-95 transition-all duration-[var(--t-base)] ease-[var(--ease)]"
          >
            开始 →
          </Link>
        </div>
        {/* W144 a11y: text-[10px] px-2 py-0.5 → min-h-6 min-w-6 (24x24 WCAG 2.5.8) + aria-label 含 visible "NEW" 关键词 (label-content-name-mismatch 修) */}
        {!onboarded && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="absolute top-3 right-3 text-[10px] px-2 min-h-6 min-w-6 rounded-full bg-amber-300 text-amber-900 font-semibold hover:bg-amber-200 transition-colors duration-[var(--t-fast)] flex items-center justify-center"
            aria-label="打开首启引导 NEW 5 分钟了解"
          >
            NEW
          </button>
        )}
      </div>

      {/* W115 Bento Grid: Lv./XP (大) + 3 统计 (横 排) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Lv./XP (Bento 大, span 2) */}
        <div className="md:col-span-2 card-interactive bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">Lv.{xpState.level}</div>
              <div>
                <div className="text-sm font-semibold">{xpState.levelTitle}</div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400">
                  {xpState.isMaxLevel ? '已满级' : `再 ${xpState.nextLevelXP} XP 升级`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500 dark:text-stone-400">总 XP</div>
              <div className="text-lg font-bold text-accent-600 dark:text-accent-400 tabular-nums">
                <CountUp value={xpState.totalXP} />
              </div>
            </div>
          </div>
          <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 transition-all duration-700 ease-[var(--ease)] progress-fill"
              style={{ width: `${Math.round(xpState.progress * 100)}%` }}
            />
          </div>
        </div>
        {/* 3 统计 (Bento 1 行) */}
        <div className="card text-center">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xl font-bold text-brand-600 tabular-nums">
                <CountUp value={stats.todayCount} />
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">今日</div>
            </div>
            <div>
              <div className="text-xl font-bold text-brand-600 tabular-nums">
                <CountUp value={stats.totalLearned} />
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">累计</div>
            </div>
            <div>
              <div className="text-xl font-bold text-brand-600 tabular-nums">
                <CountUp value={stats.favoriteCount} />
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">生词</div>
            </div>
          </div>
        </div>
      </div>

      {/* W115 Bento Grid: 4 状态 2x2 (成就/日报/自定义/日历) */}
      <div className="grid grid-cols-2 gap-3">
        {achievementStats && (
          <Link
            to="/achievements"
            className="card-interactive bg-[var(--state-warning)]/10 dark:bg-[var(--state-warning)]/20 border border-[var(--state-warning)]/30 flex items-center gap-3"
          >
            <IconTrophy size={22} className="text-amber-500" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">成就</div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                <b className="text-amber-600 dark:text-amber-400">{getUnlockedCount(achievementStats)}</b> / 19
              </div>
            </div>
            <div className="text-stone-400">→</div>
          </Link>
        )}
        <Link
          to="/reports"
          className="card-interactive bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 flex items-center gap-3"
        >
          <IconBarChart size={22} className="text-accent-500" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">日报</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 truncate">{t('home.today_summary')}</div>
          </div>
          <div className="text-stone-400">→</div>
        </Link>
        <Link
          to="/custom-scenes"
          className="card-interactive bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 flex items-center gap-3"
        >
          <IconEdit size={22} className="text-accent-500" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">自定义场景</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 truncate">粘贴文本 · AI 提词</div>
          </div>
          <div className="text-stone-400">→</div>
        </Link>
        <Link
          to="/calendar"
          className="card-interactive bg-[var(--state-warning)]/10 dark:bg-[var(--state-warning)]/20 border border-[var(--state-warning)]/30 flex items-center gap-3"
        >
          <IconCalendar size={22} className="text-amber-500" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">学习日历</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 truncate">热力图可视化</div>
          </div>
          <div className="text-stone-400">→</div>
        </Link>
      </div>

      {/* v0.22.3: 今日学习计划 — W148 桌面 1280px+ 移到右侧 sticky 面板 */}
      {plan && plan.total > 0 && (
        <div className="xl:hidden">
          <TodayPlanCard plan={plan} onMarkWord={handleMarkPlanWord} />
        </div>
      )}

      {/* 每日一句 */}
      {sentence && (
        <DailySentenceCard sentence={sentence} />
      )}

      {/* W143: 每日一词改子组件, 初始 Skeleton 占位, LCP element 立即 paint */}
      <DailyWordCard
        word={wordOfDay}
        isLoading={wordLoading}
        isFavorite={fav}
        onToggleFavorite={toggleFav}
      />

      {/* 复习提醒 — W148 桌面 1280px+ 移到右侧 sticky 面板 */}
      {dueReviewCount > 0 && (
        <div className="xl:hidden">
          <ReviewReminderCard dueCount={dueReviewCount} />
        </div>
      )}

      {/* v1.42.0 W42: streak 里程碑 */}
      {streakState && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold flex items-center gap-1"><IconTrophy size={14} className="text-amber-500" />{t('home.streak_title')}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t('home.streak_subtitle').replace('N', String(streakState?.current || 0))}</div>
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
                {/* W144 a11y: 字号 9→10px + 文字 stone-600/dark:stone-300 (contrast 4.6:1 light / 7:1 dark, WCAG AA pass) */}
                <div className="text-[10px] text-stone-600 dark:text-stone-300 font-medium">{m.days}d</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* W115: 移 除 重 复 StudyCalendar (streak 已 含 周/月 进度), 7 卡 减 6 = 减 1 */}

      {/* W115 快捷入口 - 横 向 滚 动 quick-bar (5 项 一 行) */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-3">快捷入口</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/words" className="card-interactive text-center py-6">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-medium">浏览词库</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">5000+ 高频词</div>
          </Link>
          <Link to="/review" className="card-interactive text-center py-6">
            <IconEdit size={28} className="mx-auto mb-2 text-stone-400" />
            <div className="font-medium">{t('home.review_center')}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">智能间隔重复</div>
          </Link>
          <Link to="/translate" className="card-interactive text-center py-6">
            <div className="text-3xl mb-2">🔤</div>
            <div className="font-medium">中英翻译</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">即时查询</div>
          </Link>
          <Link to="/notebook" className="card-interactive text-center py-6">
            <div className="text-3xl mb-2">⭐</div>
            <div className="font-medium">我的生词</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{stats.favoriteCount} 个</div>
          </Link>
        </div>
      </div>

      {/* W115 5 推荐: 场 景 课 / 拍 照 / AI / 计 划 / 写 作 (横 向 滚 动 quick-bar) */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-3">推荐</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Link to="/scenes" className="flex-shrink-0 w-44 card-interactive bg-brand-50 dark:bg-brand-900/20">
            <IconVideo size={22} className="mb-1 text-brand-500" />
            <div className="font-medium text-sm">场景专题课</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">5 个真实场景</div>
          </Link>
          <Link to="/camera" className="flex-shrink-0 w-44 card-interactive bg-accent-50 dark:bg-accent-900/20">
            <IconHeadphones size={22} className="mb-1 text-accent-500" />
            <div className="font-medium text-sm">拍照识物</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">AI 识图 + 例句</div>
          </Link>
          <Link to="/chat" className="flex-shrink-0 w-44 card-interactive bg-accent-50 dark:bg-accent-900/20">
            <IconChat size={22} className="mb-1 text-accent-500" />
            <div className="font-medium text-sm">AI 对话</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">5 场景 · 6 难度</div>
          </Link>
          <Link to="/plan" className="flex-shrink-0 w-44 card-interactive bg-brand-50 dark:bg-brand-900/20">
            <IconCalendar size={22} className="mb-1 text-brand-500" />
            <div className="font-medium text-sm">学习计划</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">{t('home.plan_summary')}</div>
          </Link>
          <Link to="/write" className="flex-shrink-0 w-44 card-interactive bg-[var(--state-error)]/10 dark:bg-[var(--state-error)]/20">
            <IconEdit size={22} className="mb-1 text-rose-500" />
            <div className="font-medium text-sm">写作批改</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">AI 改错 + 标色</div>
          </Link>
        </div>
      </div>
        </div>{/* end xl:flex-1 main col */}

        {/* W148: 桌面 1280px+ 右侧快捷面板 (今日计划 + 复习提醒, sticky 跟随滚动) */}
        <aside className="hidden xl:block xl:w-60 xl:flex-shrink-0 xl:sticky xl:top-6 space-y-3" data-testid="home-quick-panel">
          {plan && plan.total > 0 && (
            <TodayPlanCard plan={plan} onMarkWord={handleMarkPlanWord} />
          )}
          {dueReviewCount > 0 && (
            <ReviewReminderCard dueCount={dueReviewCount} />
          )}
          {/* 占位: 至少 1 张卡 (避免右侧空荡) */}
          {(!plan || plan.total === 0) && dueReviewCount === 0 && (
            <div className="card text-center text-xs text-stone-500 dark:text-stone-400 py-6">
              暂无待办
            </div>
          )}
        </aside>
      </div>{/* end xl:flex wrapper */}

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
