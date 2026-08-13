// src/components/NpsPrompt.tsx — W146 反馈回路 (v3 plan E-1)
// NPS 主动询问 — 用户使用 7 天后弹 1 次, 评完 / 关闭后永不再弹
// 业务: 19 周产品 0 真实用户反馈, NPS 给"用户愿不愿意推荐" 信号
//
// 设计原则:
//  - 触发: 首次使用 + 7 天 + 没评过
//  - 0-10 滑块 + 1 段"为什么" 文本
//  - 写 IDB nps 表 (本地, 不上传)
//  - 弹 1 次, 关闭 / 评分后不再弹
//  - 不阻塞, 用户可 X 关闭
//  - 0 emoji (用 Icon SVG)

import { useState, useEffect } from 'react'
import { db, type NpsEntry } from '../lib/db'
import { track, daysSinceFirstUse, isNpsDone, markNpsDone } from '../lib/telemetry'
import { IconClose, IconCheck } from './Icon'

/** W146: NPS 触发天数 (v3 plan: "7 天后弹 1 次") */
const NPS_TRIGGER_DAYS = 7

export function NpsPrompt() {
  const [show, setShow] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [why, setWhy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // W146: 启动时检查是否触发 NPS
  useEffect(() => {
    // 已评过 → 不弹
    if (isNpsDone()) return
    // 首次使用 + 7 天 → 弹
    if (daysSinceFirstUse() >= NPS_TRIGGER_DAYS) {
      setShow(true)
    }
  }, [])

  // ESC 关闭
  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setShow(false)
        markNpsDone() // 关闭也算"完成" (避免下次再弹)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, submitting])

  const handleSubmit = async () => {
    if (score === null || submitting) return
    setSubmitting(true)
    try {
      const entry: NpsEntry = {
        score,
        why: why.trim() || undefined,
        ts: Date.now(),
        daysSinceFirstUse: daysSinceFirstUse(),
      }
      await db.nps.add(entry)
      track('nps_score', { score })
      markNpsDone()
      setSubmitted(true)
      setTimeout(() => setShow(false), 1500)
    } catch (e) {
      if (import.meta.env?.DEV) console.debug('[NpsPrompt] submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    markNpsDone() // 关闭算完成, 永不再弹
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-title"
    >
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
        {submitted ? (
          <div className="py-12 text-center space-y-2" data-testid="nps-success">
            <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 items-center justify-center">
              <IconCheck size={32} aria-hidden="true" />
            </div>
            <p className="text-stone-600 dark:text-stone-400">谢谢你的反馈!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 id="nps-title" className="text-lg font-semibold">
                愿意推荐句刻给朋友吗?
              </h2>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center"
                aria-label="关闭"
              >
                <IconClose size={16} aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-400">
              你使用句刻有 {daysSinceFirstUse()} 天了, 感觉怎么样?
            </p>

            {/* 0-10 滑块 */}
            <div>
              <label className="text-sm font-medium block mb-2" id="nps-score-label">
                评分 (0 = 不会推荐, 10 = 强烈推荐)
              </label>
              <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-labelledby="nps-score-label">
                {Array.from({ length: 11 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className={`min-h-10 px-1 rounded text-sm font-medium border transition-colors ${
                      score === i
                        ? i >= 9
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : i >= 7
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-rose-500 text-white border-rose-500'
                        : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                    }`}
                    aria-checked={score === i}
                    role="radio"
                    data-testid={`nps-score-${i}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* 为什么 */}
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="nps-why">
                为什么这个分? (可选)
              </label>
              <textarea
                id="nps-why"
                value={why}
                onChange={e => setWhy(e.target.value.slice(0, 500))}
                placeholder="说说你的感受..."
                rows={3}
                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-sm resize-none focus:outline-none focus:border-emerald-500"
                data-testid="nps-why"
              />
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              NPS 评分仅保存在本地, 不会上传到云端。
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 min-h-10 px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200"
              >
                下次再说
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || score === null}
                className="flex-1 min-h-10 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                data-testid="nps-submit"
              >
                {submitting ? '提交中...' : '提交'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NpsPrompt
