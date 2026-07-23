// AIChat 数据管理 - v0.22.8 → v1.1-W1 升级: alert/confirm → Modal/Toast
import { useState } from 'react'
import { db } from '../../lib/db'
import { parseChatsJson, importChats, pickJsonFile } from '../../lib/exportChat'
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

export default function AIChatDataSection() {
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
      <h3 className="font-semibold mb-3">💬 AI 对话数据</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        AI 对话存于本地 IndexedDB。可导出备份,也可从 JSON 文件导入。
      </p>
      <button
        onClick={async () => {
          const text = await pickJsonFile()
          if (!text) return
          const result = await parseChatsJson(text)
          if (!result.ok) {
            toast.error(`❌ 解析失败\n\n${result.errors.slice(0, 3).join('\n')}`)
            return
          }
          if (result.chats.length === 0) {
            toast.warning('文件中没有有效的对话记录')
            return
          }
          ask({
            title: '导入对话',
            message: `导入 ${result.chats.length} 个对话?\n\n已存在的同 ID 对话会被覆盖。`,
            variant: 'info',
            onConfirm: async () => {
              closeAsk()
              const { imported } = await importChats(result)
              toast.success(`✅ 成功导入 ${imported} 个对话`)
              setTimeout(() => location.reload(), 500)
            },
          })
        }}
        className="btn border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 w-full"
      >
        📥 导入对话(从 JSON)
      </button>
      <button
        onClick={async () => {
          const count = await db.chats.count()
          if (count === 0) {
            toast.warning('没有对话可清空')
            return
          }
          ask({
            title: '清空所有 AI 对话',
            message: `⚠️ 危险:此操作会清空所有 ${count} 个 AI 对话记录,不可恢复。\n\n确定要清空吗?`,
            variant: 'danger',
            confirmText: '清空',
            onConfirm: async () => {
              closeAsk()
              await db.chats.clear()
              toast.success('所有 AI 对话已清空')
              location.reload()
            },
          })
        }}
        className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 w-full"
      >
        🗑 清空所有 AI 对话
      </button>

      <Modal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={closeAsk}
        confirmText={confirm.variant === 'danger' ? '清空' : '确定'}
      />
    </section>
  )
}
