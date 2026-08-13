// src/components/FeedbackButton.tsx — W146 反馈回路 (v3 plan E-1)
// 浮动右下角反馈按钮 — 0 emoji, Icon SVG
// 业务: 用户点 → 弹 modal → 写 IDB feedback 表 (本地, 不上传云)
//
// 设计原则:
//  - 0 emoji (用 IconChat SVG)
//  - 浮动 fixed bottom-right, z-40
//  - modal: 类型 (bug/feature/praise) + 200 字文本 + 邮箱 (可选)
//  - 写完后 toast "已记录, 谢谢"
//  - 失败 / disabled 静默
//  - 不破 hard 约束: 0 云, 0 付费, 0 emoji

import { useState, useEffect } from 'react'
import { db, type FeedbackEntry, type FeedbackType } from '../lib/db'
import { track } from '../lib/telemetry'
import { IconChat, IconClose, IconCheck } from './Icon'

interface Props {
  /** W146: 强制 disabled (e.g. user 在 Settings 关了) */
  disabled?: boolean
}

const MAX_TEXT_LENGTH = 200

export function FeedbackButton({ disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // W146: ESC 关闭 modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // W146: 监听 w146-open-feedback CustomEvent (Settings 链接触发)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('w146-open-feedback', onOpen as EventListener)
    return () => window.removeEventListener('w146-open-feedback', onOpen as EventListener)
  }, [])

  if (disabled) return null

  const handleSubmit = async () => {
    if (text.trim().length === 0 || submitting) return
    setSubmitting(true)
    try {
      const entry: FeedbackEntry = {
        type,
        text: text.trim().slice(0, MAX_TEXT_LENGTH),
        email: email.trim() || undefined,
        ts: Date.now(),
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        appVersion: '2.1.26+',
      }
      await db.feedback.add(entry)
      // 写埋点: 反馈提交
      track('feedback_submitted', { type })
      // 成功: 清表单 + 显示成功 1.5s
      setText('')
      setEmail('')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
      }, 1500)
    } catch (e) {
      if (import.meta.env?.DEV) console.debug('[FeedbackButton] submit failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-all duration-[var(--t-base)] ease-[var(--ease)] active:scale-95"
        aria-label="提交反馈"
        data-testid="feedback-button"
      >
        <IconChat size={22} aria-hidden="true" />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !submitting && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* 标题 + 关闭 */}
            <div className="flex items-center justify-between">
              <h2 id="feedback-title" className="text-lg font-semibold">
                提交反馈
              </h2>
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center"
                aria-label="关闭"
              >
                <IconClose size={16} aria-hidden="true" />
              </button>
            </div>

            {success ? (
              <div className="py-12 text-center space-y-2" data-testid="feedback-success">
                <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 items-center justify-center">
                  <IconCheck size={32} aria-hidden="true" />
                </div>
                <p className="text-stone-600 dark:text-stone-400">已记录, 谢谢!</p>
              </div>
            ) : (
              <>
                {/* 类型 */}
                <div>
                  <label className="text-sm font-medium block mb-2">类型</label>
                  <div className="flex gap-2">
                    {(['bug', 'feature', 'praise'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`flex-1 min-h-10 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          type === t
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                        }`}
                        aria-pressed={type === t}
                        data-testid={`feedback-type-${t}`}
                      >
                        {t === 'bug' ? '问题反馈' : t === 'feature' ? '功能建议' : '表白'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 文本 */}
                <div>
                  <label className="text-sm font-medium block mb-2" htmlFor="feedback-text">
                    详细描述 (最多 {MAX_TEXT_LENGTH} 字)
                  </label>
                  <textarea
                    id="feedback-text"
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                    placeholder="想说啥都行..."
                    rows={4}
                    className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-sm resize-none focus:outline-none focus:border-emerald-500"
                    data-testid="feedback-text"
                  />
                  <div className="text-xs text-stone-500 text-right mt-1">
                    {text.length} / {MAX_TEXT_LENGTH}
                  </div>
                </div>

                {/* 邮箱 (可选) */}
                <div>
                  <label className="text-sm font-medium block mb-2" htmlFor="feedback-email">
                    邮箱 (可选, 留空则匿名)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-sm focus:outline-none focus:border-emerald-500"
                    data-testid="feedback-email"
                  />
                </div>

                {/* 提示 */}
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  反馈仅保存在本地浏览器, 不会上传到云端。
                </p>

                {/* 按钮 */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="flex-1 min-h-10 px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || text.trim().length === 0}
                    className="flex-1 min-h-10 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    data-testid="feedback-submit"
                  >
                    {submitting ? '提交中...' : '提交'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackButton
