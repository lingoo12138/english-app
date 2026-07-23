// W7: 数据迁移 - 导出/导入所有学习数据 → v1.1-W1: confirm → Modal
import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import {
  exportAll,
  importAll,
  downloadMigrationJson,
  readMigrationFile,
  getDataStats,
  type MigrationData,
} from '../../lib/migrate'

export default function MigrationSection() {
  const [stats, setStats] = useState<{
    favorites: number
    pronunciationAttempts: number
    writingErrors: number
    chats: number
    localStorageKeys: number
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)

  useEffect(() => {
    refreshStats()
  }, [])

  const refreshStats = async () => {
    const s = await getDataStats()
    setStats(s)
  }

  const handleExport = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const data = await exportAll()
      const date = new Date().toISOString().slice(0, 10)
      downloadMigrationJson(data, `english-app-backup-${date}.json`)
      setMsg({ type: 'success', text: `✓ 已导出 (favorites: ${data.favorites.length}, 跟读: ${data.pronunciationAttempts.length}, 错题: ${data.writingErrors.length}, 对话: ${data.chats.length})` })
    } catch (e: any) {
      setMsg({ type: 'error', text: `导出失败: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async () => {
    setShowImportConfirm(true)
  }

  const doImport = async () => {
    setShowImportConfirm(false)
    setBusy(true)
    setMsg(null)
    try {
      const data: MigrationData = await readMigrationFile()
      const result = await importAll(data)
      setMsg({
        type: 'success',
        text: `✓ 已导入 (favorites: ${result.favorites}, 跟读: ${result.pronunciationAttempts}, 错题: ${result.writingErrors}, 对话: ${result.chats}, 配置: ${result.localStorage})`,
      })
      await refreshStats()
      setTimeout(() => location.reload(), 2000)
    } catch (e: any) {
      setMsg({ type: 'error', text: `导入失败: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold mb-2">📦 数据迁移</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        导出所有学习数据到 JSON 文件,可在新设备恢复或备份。导入会覆盖当前数据。
      </p>

      {/* 统计 */}
      {stats && (
        <div className="bg-stone-50 dark:bg-stone-800/50 rounded p-3 text-xs grid grid-cols-2 gap-1">
          <div>⭐ 生词: <strong>{stats.favorites}</strong></div>
          <div>🎤 跟读: <strong>{stats.pronunciationAttempts}</strong></div>
          <div>📕 错题: <strong>{stats.writingErrors}</strong></div>
          <div>💬 对话: <strong>{stats.chats}</strong></div>
          <div className="col-span-2">⚙️ 配置项: <strong>{stats.localStorageKeys}</strong></div>
        </div>
      )}

      {/* 操作 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExport}
          disabled={busy}
          className="btn-primary text-sm disabled:opacity-50"
          aria-label="导出所有学习数据"
        >
          📤 导出
        </button>
        <button
          onClick={handleImport}
          disabled={busy}
          className="btn-ghost text-sm disabled:opacity-50 border border-stone-300 dark:border-stone-600"
          aria-label="从 JSON 文件导入学习数据"
        >
          📥 导入
        </button>
      </div>

      {/* 反馈 */}
      {msg && (
        <div
          className={`text-xs p-2 rounded ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : msg.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'bg-stone-50 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300'
          }`}
          role="status"
        >
          {msg.text}
        </div>
      )}

      <p className="text-[10px] text-stone-400 dark:text-stone-500">
        ⚠️ 导入时会跳过 API keys 配置(避免跨设备密钥泄露)
      </p>

      <Modal
        open={showImportConfirm}
        title="导入数据"
        message="⚠️ 导入会覆盖当前所有数据!\n\n确定要继续吗?"
        variant="danger"
        confirmText="继续导入"
        onConfirm={doImport}
        onCancel={() => setShowImportConfirm(false)}
      />
    </section>
  )
}
