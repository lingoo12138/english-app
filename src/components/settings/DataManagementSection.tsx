// 数据管理 - v0.22.2 → v1.1-W1: alert/confirm → Modal/Toast
import { useState } from 'react'
import { db } from '../../lib/db'
import { Modal } from '../Modal'
import { toast } from '../Toast'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  variant: 'default' | 'danger' | 'info'
  confirmText?: string
  onConfirm: () => void | Promise<void>
}

export default function DataManagementSection() {
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    variant: 'default',
    onConfirm: () => {},
  })
  const ask = (cfg: Omit<ConfirmState, 'open'>) => setConfirm({ ...cfg, open: true })
  const closeAsk = () => setConfirm((s) => ({ ...s, open: false }))

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold mb-3">💾 数据管理</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        选择清空范围:场景课进度会独立保留,不会影响其他学习记录。
      </p>
      <button
        onClick={() => {
          ask({
            title: '清空生词本 + 错题本',
            message: '确定清空生词本/错题本?场景课进度会保留。',
            variant: 'default',
            onConfirm: async () => {
              closeAsk()
              await db.favorites.clear()
              await db.reviews.clear()
              toast.success('生词本和错题本已清空,场景课进度保留。')
            },
          })
        }}
        className="btn border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 w-full"
      >
        清空生词本 + 错题本
      </button>
      <button
        onClick={() => {
          ask({
            title: '清空所有数据',
            message: '⚠️ 危险:此操作会清空所有数据,包括生词本、错题本、跟读记录、场景课进度。\n\n真的要清空所有数据吗?',
            variant: 'danger',
            confirmText: '我已了解,清空',
            onConfirm: async () => {
              closeAsk()
              await db.favorites.clear()
              await db.records.clear()
              await db.reviews.clear()
              toast.success('所有数据已清空')
              location.reload()
            },
          })
        }}
        className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 w-full"
      >
        ⚠️ 清空所有数据(含场景课)
      </button>

      <Modal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={closeAsk}
        confirmText={confirm.variant === 'danger' ? '我已了解,清空' : '确定'}
      />
    </section>
  )
}
