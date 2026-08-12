// AI 对话导出/导入 - v0.22.8
// W128: 委托 dataExport.ts 统一实现 (toJSON + downloadFile)
// W141: 动态 import dataExport (782 行) — 仅导出/导入时加载
// 保留 parseChatsJson/importChats/pickJsonFile 给 AIChatDataSection 复用
import { db, getAllChats, saveChat, type ChatRecord } from './db'

/**
 * 导出单条对话为 JSON
 */
export async function exportChat(chat: ChatRecord): Promise<string> {
  const { toJSON } = await import('./dataExport')
  return toJSON({
    version: 1,
    type: 'single-chat',
    exportedAt: new Date().toISOString(),
    chat,
  })
}

/**
 * 导出全部对话为 JSON
 */
export async function exportAllChats(): Promise<string> {
  const chats = await getAllChats()
  const { toJSON } = await import('./dataExport')
  return toJSON({
    version: 1,
    type: 'all-chats',
    exportedAt: new Date().toISOString(),
    count: chats.length,
    chats,
  })
}

/**
 * 触发下载对话 JSON
 */
export async function downloadChatJson(content: string, filename: string): Promise<void> {
  const { downloadFile } = await import('./dataExport')
  downloadFile(content, filename, 'application/json')
}

/**
 * 解析导入的 JSON, 验证格式, 返回 ChatRecord[]
 */
export interface ImportResult {
  ok: boolean
  imported: number
  skipped: number
  errors: string[]
  chats: ChatRecord[]
}

export async function parseChatsJson(text: string): Promise<ImportResult> {
  const result: ImportResult = {
    ok: false,
    imported: 0,
    skipped: 0,
    errors: [],
    chats: [],
  }

  let data: any
  try {
    data = JSON.parse(text)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    result.errors.push('JSON 解析失败: ' + err.message)
    return result
  }

  // 兼容 2 种格式: {type: 'all-chats', chats: [...]} 或 {type: 'single-chat', chat: {...}}
  let rawChats: any[] = []
  if (data?.type === 'all-chats' && Array.isArray(data.chats)) {
    rawChats = data.chats
  } else if (data?.type === 'single-chat' && data.chat) {
    rawChats = [data.chat]
  } else if (Array.isArray(data)) {
    // 直接是数组
    rawChats = data
  } else {
    result.errors.push('格式错误: 需要 {type:"all-chats",chats:[]} 或 {type:"single-chat",chat:{}} 或 ChatRecord 数组')
    return result
  }

  // 验证 + 转换
  for (const raw of rawChats) {
    if (!raw || typeof raw !== 'object') {
      result.skipped++
      result.errors.push('跳过: 非对象')
      continue
    }
    if (!raw.scenario || !raw.level || !Array.isArray(raw.messages)) {
      result.skipped++
      result.errors.push(`跳过: 缺字段 (scenario/level/messages)`)
      continue
    }
    // 构造 ChatRecord
    const chat: ChatRecord = {
      id: raw.id,  // 保留 id, db.put 会覆盖
      scenario: String(raw.scenario),
      level: String(raw.level),
      title: String(raw.title || '导入的对话'),
      messages: raw.messages
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'system') && typeof m.content === 'string')
        .map((m: any) => ({
          id: String(m.id || `m-${Date.now()}-${Math.random()}`),
          role: m.role,
          content: m.content,
          ts: typeof m.ts === 'number' ? m.ts : Date.now(),
        })),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    }
    if (chat.messages.length === 0) {
      result.skipped++
      result.errors.push(`跳过: messages 为空`)
      continue
    }
    result.chats.push(chat)
  }

  result.ok = result.chats.length > 0
  return result
}

/**
 * 导入对话到 IndexedDB
 */
export async function importChats(result: ImportResult): Promise<{ imported: number }> {
  let imported = 0
  for (const chat of result.chats) {
    try {
      await saveChat(chat)  // upsert
      imported++
    } catch (e) {
      console.warn('导入对话失败:', e)
    }
  }
  return { imported }
}

/**
 * 文件选择器导入 (返回 file text)
 */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return resolve(null)
      try {
        const text = await file.text()
        resolve(text)
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('读文件失败:', err.message)
        resolve(null)
      }
    }
    input.click()
  })
}
