// 首启 onboarding 组件 (v1.8.0-A)
// 3 步引导: 1️⃣ 选学段  2️⃣ 体验跟读  3️⃣ 加生词本 + 跳首页
// 设计要点:
// 1. localStorage.onboarded=true 标记, 只显示一次
// 2. 右上角 ✕ 可跳过
// 3. Esc 退出 + focus trap (a11y)
// 4. 不引新依赖 (复用 PronunciationPractice / addFavorite / useStore)
// 5. 状态机逻辑 (step + isOpen) 抽成纯函数方便单测
// 6. 跟读不阻塞: 用户可跳过跟读点"跳过这一步"直接进第 3 步
// 7. 用 unknown + Error 守卫 (v1.6 规范)
import { useEffect, useRef, useState, useCallback } from 'react'
import PronunciationPractice from './PronunciationPractice'
import { loadWords } from '../lib/words'
import { addFavorite } from '../lib/db'
import { useStore } from '../store/useStore'
import type { Word } from '../types'

// === 状态机常量 (供单测直接 import) ===
export const ONBOARDED_KEY = 'onboarded'

export const ONBOARDING_STEPS = ['level', 'pronounce', 'finish'] as const
export type OnboardingStep = typeof ONBOARDING_STEPS[number]
export const TOTAL_STEPS = ONBOARDING_STEPS.length

export const STEP_TITLES: Record<OnboardingStep, string> = {
  level: '选学段',
  pronounce: '体验跟读',
  finish: '准备就绪',
}

// 学段选项 (A1 入门 / B1 中级 / C1 高级) — 简化版,跟主词库 LEVELS 区分
export const LEVEL_OPTIONS = [
  { value: 'primary', label: 'A1 入门', desc: '基础词汇 · 日常表达', emoji: '🌱' },
  { value: 'cet4', label: 'B1 中级', desc: '四六级 · 流畅对话', emoji: '🌿' },
  { value: 'cet6', label: 'C1 高级', desc: '考研 · 学术写作', emoji: '🌳' },
] as const

export type LevelOptionValue = typeof LEVEL_OPTIONS[number]['value']

// === localStorage 工具 (供单测) ===
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'true'
  } catch (e: unknown) {
    // localStorage 可能在隐私模式/无痕浏览下抛错,默认未 onboarding
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('[onboarding] localStorage 读取失败,默认未引导:', err.message)
    return false
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'true')
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('[onboarding] localStorage 写入失败:', err.message)
  }
}

export function clearOnboarded(): void {
  try {
    localStorage.removeItem(ONBOARDED_KEY)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('[onboarding] localStorage 清除失败:', err.message)
  }
}

// === 状态机纯函数 (供单测) ===
export function getInitialStep(): OnboardingStep {
  return ONBOARDING_STEPS[0]
}

export function nextStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current)
  if (idx < 0 || idx >= ONBOARDING_STEPS.length - 1) {
    return current
  }
  return ONBOARDING_STEPS[idx + 1]
}

export function prevStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current)
  if (idx <= 0) return current
  return ONBOARDING_STEPS[idx - 1]
}

export function stepIndex(current: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(current)
}

export function isFirstStep(current: OnboardingStep): boolean {
  return current === ONBOARDING_STEPS[0]
}

export function isLastStep(current: OnboardingStep): boolean {
  return current === ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]
}

// === 组件 Props ===
interface OnboardingProps {
  open: boolean
  onClose: () => void    // 跳过 / 完成时调用, 由父组件控制是否重渲染
  onComplete?: () => void  // 走完 3 步时调用(可选,区别于 onClose)
}

// === 组件 ===
export default function Onboarding({ open, onClose, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>(getInitialStep())
  const [selectedLevel, setSelectedLevel] = useState<LevelOptionValue | null>(null)
  const [sampleWord, setSampleWord] = useState<Word | null>(null)
  const [loadingWord, setLoadingWord] = useState(false)
  const [addedFav, setAddedFav] = useState(false)
  const [addingFav, setAddingFav] = useState(false)

  const setTargetLevel = useStore(s => s.setTargetLevel)

  // ref: 焦点管理 + 容器
  const containerRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // step 2 加载随机 1 词
  useEffect(() => {
    if (!open || step !== 'pronounce' || sampleWord) return
    let cancelled = false
    setLoadingWord(true)
    loadWords()
      .then((words) => {
        if (cancelled) return
        if (words.length === 0) {
          setSampleWord(null)
          return
        }
        // 选第 1 个常用词 (frequency 最高的) 当 sample
        const sorted = [...words].sort((a, b) => b.frequency - a.frequency)
        setSampleWord(sorted[0])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const err = e instanceof Error ? e : new Error(String(e))
        console.warn('[onboarding] 加载示例词失败:', err.message)
        setSampleWord(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingWord(false)
      })
    return () => { cancelled = true }
  }, [open, step, sampleWord])

  // open=false 时重置 (让下次 open 从头开始)
  useEffect(() => {
    if (!open) {
      // 延后重置,避免关时瞬间闪烁
      const t = window.setTimeout(() => {
        setStep(getInitialStep())
        setSelectedLevel(null)
        setSampleWord(null)
        setAddedFav(false)
        setAddingFav(false)
      }, 300)
      return () => window.clearTimeout(t)
    }
  }, [open])

  // a11y: open 时记录旧焦点 + 锁焦点 + Esc 退出
  useEffect(() => {
    if (!open) return

    prevFocusRef.current = document.activeElement as HTMLElement | null

    // body 滚动锁定
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 聚焦关闭按钮 (或第一个 focusable)
    const t = window.setTimeout(() => {
      closeBtnRef.current?.focus()
    }, 50)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key === 'Tab') {
        // focus trap
        const container = containerRef.current
        if (!container) return
        const focusables = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
      // 恢复焦点
      prevFocusRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = useCallback(() => {
    // 跳过/退出都标记为已 onboarding(避免反复弹)
    markOnboarded()
    onClose()
  }, [onClose])

  const handleNext = useCallback(() => {
    if (step === 'level') {
      if (selectedLevel) {
        setTargetLevel(selectedLevel)
      }
      setStep(nextStep(step))
    } else if (step === 'pronounce') {
      setStep(nextStep(step))
    } else if (step === 'finish') {
      // 完成 3 步
      markOnboarded()
      onComplete?.()
      onClose()
    }
  }, [step, selectedLevel, setTargetLevel, onClose, onComplete])

  const handlePrev = useCallback(() => {
    setStep(prevStep(step))
  }, [step])

  const handleAddFavorite = useCallback(async () => {
    if (!sampleWord || addedFav || addingFav) return
    setAddingFav(true)
    try {
      await addFavorite(sampleWord.id)
      setAddedFav(true)
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.warn('[onboarding] 加生词失败:', err.message)
    } finally {
      setAddingFav(false)
    }
  }, [sampleWord, addedFav, addingFav])

  if (!open) return null

  const stepNum = stepIndex(step) + 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-[fadeIn_0.2s_ease]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* 顶部条: 进度 + 关闭 */}
        <div className="sticky top-0 bg-white dark:bg-stone-800 z-10 px-5 pt-4 pb-2 flex items-center justify-between border-b border-stone-100 dark:border-stone-700">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            步骤 {stepNum} / {TOTAL_STEPS}
          </div>
          <button
            ref={closeBtnRef}
            onClick={handleClose}
            className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-stone-700"
            aria-label="跳过引导"
            title="跳过 (Esc)"
          >
            ✕
          </button>
        </div>

        {/* 进度条 */}
        <div className="px-5 pt-2" aria-hidden="true">
          <div className="h-1 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${(stepNum / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* 内容 */}
        <div className="p-5">
          <h2
            id="onboarding-title"
            className="text-xl font-bold mb-1"
          >
            {STEP_TITLES[step]}
          </h2>

          {step === 'level' && (
            <LevelStep
              selected={selectedLevel}
              onSelect={setSelectedLevel}
            />
          )}

          {step === 'pronounce' && (
            <PronounceStep
              word={sampleWord}
              loading={loadingWord}
            />
          )}

          {step === 'finish' && (
            <FinishStep
              word={sampleWord}
              addedFav={addedFav}
              addingFav={addingFav}
              onAddFavorite={handleAddFavorite}
            />
          )}
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white dark:bg-stone-800 border-t border-stone-100 dark:border-stone-700 p-4 flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={isFirstStep(step)}
            className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="上一步"
          >
            ← 上一步
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-2 py-1"
              aria-label="跳过引导"
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              disabled={step === 'level' && !selectedLevel}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isLastStep(step) ? '完成引导' : '下一步'}
            >
              {isLastStep(step) ? '🎉 开始使用' : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// === 子步骤组件 ===

function LevelStep({
  selected,
  onSelect,
}: {
  selected: LevelOptionValue | null
  onSelect: (v: LevelOptionValue) => void
}) {
  return (
    <div>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
        👋 先告诉我你的英语水平,我帮你匹配合适难度
      </p>
      <div className="space-y-2" role="radiogroup" aria-label="选择学段">
        {LEVEL_OPTIONS.map((opt) => {
          const isSel = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              role="radio"
              aria-checked={isSel}
              className={`w-full text-left p-3 rounded-xl border-2 transition ${
                isSel
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{opt.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    {opt.desc}
                  </div>
                </div>
                {isSel && (
                  <span className="text-brand-600 dark:text-brand-400" aria-hidden="true">✓</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PronounceStep({
  word,
  loading,
}: {
  word: Word | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2 animate-pulse">🎤</div>
        <p className="text-sm text-stone-500 dark:text-stone-400">准备跟读素材...</p>
      </div>
    )
  }
  if (!word) {
    return (
      <div>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
          🎤 跟读是练发音最快的办法 — 大声读出来,系统会给你打分
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          (词库加载失败,可以稍后在词库里体验)
        </p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
        🎤 试试跟读 — 读 <b className="text-brand-600 dark:text-brand-400">{word.word}</b>
        ({word.translations[0] || ''})
      </p>
      <PronunciationPractice word={word.word} wordId={word.id} />
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 text-center">
        不会用麦克风?直接点下一步
      </p>
    </div>
  )
}

function FinishStep({
  word,
  addedFav,
  addingFav,
  onAddFavorite,
}: {
  word: Word | null
  addedFav: boolean
  addingFav: boolean
  onAddFavorite: () => void
}) {
  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-5xl mb-2" aria-hidden="true">🎉</div>
        <p className="text-base text-stone-700 dark:text-stone-300">
          一切就绪!
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          收藏这个单词,以后在「生词本」复习
        </p>
      </div>

      {word ? (
        <div className="card bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{word.word}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {word.phonetic} · {word.translations.join(' · ')}
              </div>
            </div>
            {addedFav ? (
              <span className="text-2xl" aria-label="已加入生词本">⭐</span>
            ) : (
              <button
                onClick={onAddFavorite}
                disabled={addingFav}
                className="btn-primary text-sm disabled:opacity-50"
                aria-label="加入生词本"
              >
                {addingFav ? '加...' : '☆ 加生词'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500 dark:text-stone-400 text-center mb-3">
          可以在词库浏览单词并加生词
        </p>
      )}

      <div className="text-xs text-stone-500 dark:text-stone-400 text-center">
        接下来:每日 1 词 · 跟读练习 · 间隔复习
      </div>
    </div>
  )
}
