// W7: 数据迁移 - 导出/导入所有学习数据
// v1.0 关键功能: 跨设备恢复 + 备份
import { db, type FavoriteRecord, type PronunciationAttempt, type WritingError, type ChatRecord } from './db'

/** 迁移数据 schema */
export interface MigrationData {
  version: 1  // schema 版本
  appVersion: string  // 导出时的 app 版本
  exportedAt: number  // 时间戳
  // IndexedDB
  favorites: FavoriteRecord[]
  pronunciationAttempts: PronunciationAttempt[]
  writingErrors: WritingError[]
  chats: ChatRecord[]
  // localStorage
  localStorage: Record<string, string>
}

const SCHEMA_VERSION = 1
const APP_VERSION = '0.29.0'

/** 导出所有数据 */
export async function exportAll(): Promise<MigrationData> {
  const [favorites, pronunciationAttempts, writingErrors, chats] = await Promise.all([
    db.favorites.toArray(),
    db.pronunciationAttempts.toArray(),
    db.writingErrors.toArray(),
    db.chats.toArray(),
  ])

  // localStorage 全部
  const localStorageData: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      localStorageData[key] = localStorage.getItem(key) || ''
    }
  }

  return {
    version: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    favorites,
    pronunciationAttempts,
    writingErrors,
    chats,
    localStorage: localStorageData,
  }
}

/** 校验 schema */
export function validateSchema(data: unknown): { ok: true; data: MigrationData } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: '数据格式错误' }
  }
  const d = data as Record<string, unknown>
  if (d.version !== SCHEMA_VERSION) {
    return { ok: false, error: `不兼容的 schema 版本: ${d.version} (需要 ${SCHEMA_VERSION})` }
  }
  if (!Array.isArray(d.favorites)) return { ok: false, error: 'favorites 字段错误' }
  if (!Array.isArray(d.pronunciationAttempts)) return { ok: false, error: 'pronunciationAttempts 字段错误' }
  if (!Array.isArray(d.writingErrors)) return { ok: false, error: 'writingErrors 字段错误' }
  if (!Array.isArray(d.chats)) return { ok: false, error: 'chats 字段错误' }
  if (typeof d.localStorage !== 'object' || d.localStorage === null) {
    return { ok: false, error: 'localStorage 字段错误' }
  }
  return { ok: true, data: d as unknown as MigrationData }
}

/** 导入所有数据(覆盖现有) */
export async function importAll(data: MigrationData): Promise<{
  favorites: number
  pronunciationAttempts: number
  writingErrors: number
  chats: number
  localStorage: number
}> {
  // IndexedDB - 清空 + 批量 put
  await Promise.all([
    db.favorites.clear(),
    db.pronunciationAttempts.clear(),
    db.writingErrors.clear(),
    db.chats.clear(),
  ])

  await Promise.all([
    db.favorites.bulkPut(data.favorites),
    db.pronunciationAttempts.bulkPut(data.pronunciationAttempts),
    db.writingErrors.bulkPut(data.writingErrors),
    db.chats.bulkPut(data.chats),
  ])

  // localStorage - 清空 + 逐个 set
  localStorage.clear()
  let lsCount = 0
  for (const [key, value] of Object.entries(data.localStorage)) {
    // 不导入 settings 关键 key(避免 API key 覆盖)
    if (key.startsWith('english-app-settings-v')) {
      // 跳过, 让用户重新配置 (避免 API key 迁移泄漏风险)
      continue
    }
    localStorage.setItem(key, value)
    lsCount++
  }

  return {
    favorites: data.favorites.length,
    pronunciationAttempts: data.pronunciationAttempts.length,
    writingErrors: data.writingErrors.length,
    chats: data.chats.length,
    localStorage: lsCount,
  }
}

/** 触发下载 JSON */
export function downloadMigrationJson(data: MigrationData, filename?: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `english-app-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 读取用户选择的文件 */
export function readMigrationFile(): Promise<MigrationData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const validation = validateSchema(data)
        if (!validation.ok) {
          reject(new Error(validation.error))
          return
        }
        resolve(validation.data)
      } catch (err: any) {
        reject(new Error(`文件解析失败: ${err.message}`))
      }
    }
    input.click()
  })
}

/** 数据统计(用于 UI 显示) */
export async function getDataStats(): Promise<{
  favorites: number
  pronunciationAttempts: number
  writingErrors: number
  chats: number
  localStorageKeys: number
}> {
  const [favorites, pronunciationAttempts, writingErrors, chats] = await Promise.all([
    db.favorites.count(),
    db.pronunciationAttempts.count(),
    db.writingErrors.count(),
    db.chats.count(),
  ])
  return {
    favorites,
    pronunciationAttempts,
    writingErrors,
    chats,
    localStorageKeys: localStorage.length,
  }
}
