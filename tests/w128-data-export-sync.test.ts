// tests/w128-data-export-sync.test.ts - W128 数据导出整合 + 跨 tab IDB 同步
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

// === dataExport 测试 ===
import {
  EXPORT_SCHEMA_VERSION,
  escapeCSVField,
  toCSV,
  toJSON,
  toMarkdownTable,
  toMarkdownList,
  toCSVWithBOM,
  downloadFile,
  exportByKey,
  exportAllData,
  importData,
  type FullExportBundle,
} from '../src/lib/dataExport'

// === idbSync 测试 ===
import {
  initIdbSync,
  notifyIdbWrite,
  isReceivingIdbSync,
  _flushForTest,
  _resetForTest,
} from '../src/lib/idbSync'

// === db helpers (for integration test) ===
import { db, addFavorite, getAllFavorites, addErrorReviewScore, getAllErrorReviewScores, saveChat, getAllChats } from '../src/lib/db'

// === BroadcastChannel mock (happy-dom 不内置) ===
class MockBroadcastChannel {
  static channels: MockBroadcastChannel[] = []
  name: string
  onmessage: ((e: MessageEvent) => void) | null = null
  posted: any[] = []
  closed = false

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.channels.push(this)
  }

  postMessage(data: any) {
    this.posted.push(data)
    // 不自动分发给本 tab (避免回环)
  }

  /** 模拟其他 tab 收到消息 */
  simulateIncoming(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }

  close() {
    this.closed = true
  }
}

beforeEach(async () => {
  // 装回 BroadcastChannel 模拟 (某些 describe 会重置成 undefined)
  ;(globalThis as any).BroadcastChannel = MockBroadcastChannel
  // 清空 mock channels
  MockBroadcastChannel.channels = []
  // 重置 idbSync 内部状态
  _resetForTest()
  // 清空 IDB 表 (不关 db, 因为 Dexie 句柄会被 cached; 用 clear 安全)
  try {
    await Promise.all([
      db.favorites.clear(),
      db.chats.clear(),
      db.writingErrors.clear(),
      db.dictationErrors.clear(),
      db.errorReviewHistory.clear(),
      db.favorites.clear(),
    ])
  } catch {
    // ignore
  }
  // 清理 localStorage
  if (typeof localStorage !== 'undefined') localStorage.clear()
  // 清理 sessionStorage
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
})

afterEach(() => {
  _resetForTest()
})

// =====================================================================
// 1. dataExport: 通用 CSV/JSON/MD 转换器
// =====================================================================

describe('W128 dataExport - CSV/JSON/MD 转换器', () => {
  it('escapeCSVField: 普通字符串原样', () => {
    expect(escapeCSVField('hello')).toBe('hello')
  })

  it('escapeCSVField: 含逗号加双引号', () => {
    expect(escapeCSVField('a,b')).toBe('"a,b"')
  })

  it('escapeCSVField: 含引号双写', () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""')
  })

  it('escapeCSVField: 含换行加双引号', () => {
    expect(escapeCSVField('a\nb')).toBe('"a\nb"')
  })

  it('escapeCSVField: CSV 注入防护 (=开头加 \')', () => {
    expect(escapeCSVField('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCSVField('+1+1')).toBe("'+1+1")
    expect(escapeCSVField('-cmd')).toBe("'-cmd")
    expect(escapeCSVField('@evil')).toBe("'@evil")
  })

  it('escapeCSVField: null/undefined 返空', () => {
    expect(escapeCSVField(null)).toBe('')
    expect(escapeCSVField(undefined)).toBe('')
    expect(escapeCSVField(0)).toBe('0')
  })

  it('toCSV: 通用 header + rows', () => {
    const fields = [
      { header: 'name', getter: (x: any) => x.name },
      { header: 'age', getter: (x: any) => x.age },
    ]
    const csv = toCSV([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }], fields)
    expect(csv).toBe('name,age\nAlice,30\nBob,25')
  })

  it('toCSV: 字段转义 (含逗号/引号)', () => {
    const fields = [{ header: 'text', getter: (x: any) => x.text }]
    const csv = toCSV([{ text: 'a,b' }, { text: 'say "hi"' }], fields)
    expect(csv).toContain('"a,b"')
    expect(csv).toContain('"say ""hi"""')
  })

  it('toCSVWithBOM: 加 UTF-8 BOM + \\r\\n 行分隔', () => {
    const csv = toCSVWithBOM([{ a: 1 }], [{ header: 'a', getter: (x: any) => x.a }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('a\r\n1')
  })

  it('toJSON: indent=2 可读', () => {
    const json = toJSON({ a: 1, b: [1, 2] })
    expect(json).toContain('\n  ')
    expect(JSON.parse(json)).toEqual({ a: 1, b: [1, 2] })
  })

  it('toMarkdownTable: 含 frontmatter + 表格', () => {
    const fields = [
      { header: 'id', getter: (x: any) => x.id },
      { header: 'name', getter: (x: any) => x.name },
    ]
    const md = toMarkdownTable([{ id: 1, name: 'foo' }], fields, 'Test Table', { author: 'me' })
    expect(md).toContain('---\n')
    expect(md).toContain('author: me')
    expect(md).toContain('# Test Table')
    expect(md).toContain('| id | name |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| 1 | foo |')
  })

  it('toMarkdownList: 含 frontmatter + list', () => {
    const md = toMarkdownList([{ k: 'v1' }, { k: 'v2' }], 'Test List', { ts: '2026-01-01' })
    expect(md).toContain('# Test List')
    expect(md).toContain('## Item 1')
    expect(md).toContain('**k**: v1')
    expect(md).toContain('## Item 2')
  })

  it('downloadFile: 用 Blob URL (大文件友好)', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadFile('test content', 'test.txt', 'text/plain')
    expect(createSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    createSpy.mockRestore()
    revokeSpy.mockRestore()
    clickSpy.mockRestore()
  })
})

// =====================================================================
// 2. dataExport: exportByKey / exportAllData
// =====================================================================

describe('W128 dataExport - exportByKey + exportAllData', () => {
  it('exportByKey("favorites", "json") 返 favorites 数组', async () => {
    await addFavorite('w-1')
    await addFavorite('w-2')
    const r = await exportByKey('favorites', 'json')
    expect(r.ext).toBe('json')
    expect(r.mime).toBe('application/json')
    const parsed = JSON.parse(r.content)
    expect(parsed.count).toBe(2)
    expect(parsed.favorites.length).toBe(2)
  })

  it('exportByKey("favorites", "csv") 返 BOM + header', async () => {
    await addFavorite('w-1')
    const r = await exportByKey('favorites', 'csv')
    expect(r.content.startsWith('\uFEFF')).toBe(true)
    expect(r.content).toContain('wordId,addedAt')
  })

  it('exportByKey("chats", "json") 返空数组 (无聊天)', async () => {
    const r = await exportByKey('chats', 'json')
    const parsed = JSON.parse(r.content)
    expect(parsed.chats).toEqual([])
    expect(parsed.count).toBe(0)
  })

  it('exportByKey("chats", "md") 返 frontmatter + table', async () => {
    const r = await exportByKey('chats', 'md')
    expect(r.content).toContain('format: list')  // 改用 list 模式
    expect(r.content).toContain('# AI Chats')
  })

  it('exportByKey("errors", "json") 合并 writing+dictation', async () => {
    const r = await exportByKey('errors', 'json')
    const parsed = JSON.parse(r.content)
    expect(parsed.writing).toEqual([])
    expect(parsed.dictation).toEqual([])
  })

  it('exportByKey("settings", "json") 含 main/xp/extras', async () => {
    localStorage.setItem('english-app-settings-v2', '{"state":{"darkMode":true}}')
    localStorage.setItem('xp-state-v1', '{"totalXP":100}')
    const r = await exportByKey('settings', 'json')
    const parsed = JSON.parse(r.content)
    expect(parsed.main).toContain('darkMode')
    expect(parsed.xp).toContain('totalXP')
  })

  it('exportAllData: 7 类全有 + schemaVersion', async () => {
    const r = await exportAllData()
    expect(r.bundle.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(r.bundle.exportedAt).toBeTruthy()
    expect(r.bundle.appName).toBe('english-app')
    expect(r.bundle.settings).toBeTruthy()
    expect(r.bundle.words).toBeTruthy()
    expect(r.bundle.chats).toEqual([])
    expect(r.bundle.errors.writing).toEqual([])
    expect(r.bundle.errors.dictation).toEqual([])
    expect(r.bundle.lessonScores).toBeTruthy()
    expect(r.bundle.achievements.status).toBeTruthy()
    expect(r.bundle.favorites).toEqual([])
  })

  it('exportAllData: 含 favorites (有数据时)', async () => {
    await addFavorite('w-1')
    const r = await exportAllData()
    expect(r.bundle.favorites.length).toBe(1)
    expect(r.bundle.favorites[0].wordId).toBe('w-1')
  })
})

// =====================================================================
// 3. dataExport: importData (统一导入 + 冲突策略)
// =====================================================================

describe('W128 dataExport - importData (统一导入)', () => {
  it('importData: 拒绝非 JSON', async () => {
    const r = await importData('not json at all')
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('JSON 解析失败'))).toBe(true)
  })

  it('importData: 拒绝缺 schemaVersion', async () => {
    const r = await importData('{"foo":"bar"}')
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('schemaVersion'))).toBe(true)
  })

  it('importData: 拒绝高版本 schema', async () => {
    const r = await importData(JSON.stringify({ schemaVersion: 999 }))
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toContain('schema 版本')
  })

  it('importData: 接受空 bundle (兜底字段)', async () => {
    const r = await importData(JSON.stringify({ schemaVersion: 1 }))
    expect(r.schemaVersion).toBe(1)
    expect(r.errors.length).toBe(0)
  })

  it('importData: 导入 favorites 成功', async () => {
    const bundle: FullExportBundle = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appName: 'english-app',
      settings: { main: null, xp: null, extras: {} },
      words: { total: 0, sampleIds: [] },
      chats: [],
      errors: { writing: [], dictation: [] },
      lessonScores: [],
      achievements: { stats: { streak: 0, totalDays: 0, words: 0, errors: 0, favorites: 0 }, status: [] },
      favorites: [{ wordId: 'w-imp-1', addedAt: Date.now() }],
    }
    const r = await importData(JSON.stringify(bundle))
    expect(r.imported.favorites).toBe(1)
    const favs = await getAllFavorites()
    expect(favs.length).toBe(1)
  })

  it('importData: 冲突策略 (后者覆盖, timestamp 比较)', async () => {
    // 现有: wordId=w-c1, addedAt=1000
    await db.favorites.put({ wordId: 'w-c1', addedAt: 1000 })
    // 导入: wordId=w-c1, addedAt=2000 (更新)
    const r1 = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      favorites: [{ wordId: 'w-c1', addedAt: 2000 }],
    }))
    expect(r1.imported.favorites).toBe(1)
    expect(r1.overwritten).toBe(1)
    const favs = await getAllFavorites()
    expect(favs[0].addedAt).toBe(2000)

    // 导入: wordId=w-c1, addedAt=500 (旧) -> 跳过
    const r2 = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      favorites: [{ wordId: 'w-c1', addedAt: 500 }],
    }))
    expect(r2.skipped.favorites).toBe(1)
    const favs2 = await getAllFavorites()
    expect(favs2[0].addedAt).toBe(2000)  // 仍为 2000
  })

  it('importData: 导入 chats 成功 (upsert)', async () => {
    const chat = {
      id: 999,
      scenario: 'test',
      level: 'B1',
      title: 'test chat',
      messages: [{ id: 'm1', role: 'user' as const, content: 'hi', ts: Date.now() }],
      createdAt: 1000,
      updatedAt: 2000,
    }
    const r = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      chats: [chat],
    }))
    expect(r.imported.chats).toBe(1)
    const chats = await getAllChats()
    expect(chats.find(c => c.id === 999)?.title).toBe('test chat')
  })

  it('importData: 导入 chats (后者覆盖)', async () => {
    // 直接 put, 跳过 saveChat (会强制覆盖 updatedAt)
    await db.chats.put({
      id: 888, scenario: 'old', level: 'A1', title: 'old title',
      messages: [{ id: 'm1', role: 'user', content: 'old', ts: 1000 }],
      createdAt: 1000, updatedAt: 1000,
    })
    // 导入 updatedAt=2000 (更新)
    const r1 = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      chats: [{
        id: 888, scenario: 'old', level: 'A1', title: 'new title',
        messages: [{ id: 'm1', role: 'user', content: 'new', ts: 2000 }],
        createdAt: 1000, updatedAt: 2000,
      }],
    }))
    expect(r1.imported.chats).toBe(1)
    expect(r1.overwritten).toBe(1)
    const chats = await getAllChats()
    expect(chats.find(c => c.id === 888)?.title).toBe('new title')

    // 导入 updatedAt=500 (旧) -> 跳过
    const r2 = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      chats: [{
        id: 888, scenario: 'old', level: 'A1', title: 'stale',
        messages: [{ id: 'm1', role: 'user', content: 'stale', ts: 500 }],
        createdAt: 500, updatedAt: 500,
      }],
    }))
    expect(r2.skipped.chats).toBe(1)
  })

  it('importData: 跳过缺字段的 chat (scenario/level/messages)', async () => {
    const r = await importData(JSON.stringify({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      chats: [
        { id: 1, scenario: 'ok', level: 'A1', title: 'ok', messages: [{ id: 'm', role: 'user', content: 'x', ts: 1 }], createdAt: 1, updatedAt: 1 },
        { id: 2, title: '缺 scenario' },  // 缺字段
        { id: 3, scenario: 'x', level: 'A1', title: '空 messages', messages: [], createdAt: 1, updatedAt: 1 },  // messages 空
      ],
    }))
    expect(r.imported.chats).toBe(1)
    expect(r.skipped.chats).toBe(2)
    expect(r.errors.length).toBe(2)
  })
})

// =====================================================================
// 4. idbSync: 跨 tab 同步
// =====================================================================

describe('W128 idbSync - 跨 tab IDB 同步', () => {
  it('initIdbSync: 注册 BroadcastChannel 回调', () => {
    const cb = vi.fn()
    const teardown = initIdbSync({ onChange: cb })
    expect(typeof teardown).toBe('function')
    expect(MockBroadcastChannel.channels.length).toBe(1)
    expect(MockBroadcastChannel.channels[0].name).toBe('english-app-idb-sync')
    teardown()
  })

  it('notifyIdbWrite: 200ms debounce 后才发', async () => {
    initIdbSync({})
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    // 立即查: 还没发
    expect(MockBroadcastChannel.channels[0]?.posted.length ?? 0).toBe(0)
    // 200ms 后
    await new Promise(r => setTimeout(r, 250))
    expect(MockBroadcastChannel.channels[0].posted.length).toBe(1)
  })

  it('notifyIdbWrite: 同 store+op+key 合并为最新', async () => {
    initIdbSync({})
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    await new Promise(r => setTimeout(r, 250))
    expect(MockBroadcastChannel.channels[0].posted.length).toBe(1)
  })

  it('notifyIdbWrite: 不同 key 不合并', async () => {
    initIdbSync({})
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-2' })
    await new Promise(r => setTimeout(r, 250))
    expect(MockBroadcastChannel.channels[0].posted.length).toBe(2)
  })

  it('副 tab 收到广播: 触发 onChange 回调', async () => {
    const cb = vi.fn()
    initIdbSync({ onChange: cb })
    const ch = MockBroadcastChannel.channels[0]
    ch.simulateIncoming({
      msgId: 'other-tab-msg',
      store: 'favorites',
      op: 'put',
      key: 'w-1',
      ts: Date.now(),
      sourceTab: 'other-tab',
    })
    // 等微任务
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0].store).toBe('favorites')
  })

  it('防回环: 自身 sourceTab 的消息不触发回调', async () => {
    const cb = vi.fn()
    initIdbSync({ onChange: cb })
    // 读取本 tab id (idbSync 模块级 getTabId() 第一次访问会写入)
    const ch = MockBroadcastChannel.channels[0]
    // 触发一次写入让 getTabId() 写入 sessionStorage
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'init' })
    await new Promise(r => setTimeout(r, 250))
    const myTabId = sessionStorage.getItem('__idb-sync-tab-id__')!
    expect(myTabId).toBeTruthy()  // tab id 已生成
    ch.simulateIncoming({
      msgId: 'self-msg',
      store: 'favorites',
      op: 'put',
      key: 'w-1',
      ts: Date.now(),
      sourceTab: myTabId,  // 本 tab
    })
    await Promise.resolve()
    expect(cb).not.toHaveBeenCalled()
  })

  it('防回环: 收到广播时 _receiving=true, 不再次 broadcast', async () => {
    initIdbSync({})
    const ch = MockBroadcastChannel.channels[0]
    // 模拟外部 tab 写入 -> 触发 _receiving
    ch.simulateIncoming({
      msgId: 'ext', store: 'favorites', op: 'put', key: 'w-1',
      ts: Date.now(), sourceTab: 'other',
    })
    // handleIncoming 是同步设置 _receiving=true (后续 Promise.resolve 清)
    expect(isReceivingIdbSync()).toBe(true)
    // 业务侧 setState (通常会调 db.put 触发 notifyIdbWrite) -> 此时应该被吞
    notifyIdbWrite({ store: 'favorites', op: 'put', key: 'w-1' })
    // 等 debounce: 期间 notifyIdbWrite 被吞, 不应有新消息
    await new Promise(r => setTimeout(r, 250))
    expect(ch.posted.length).toBe(0)
    // 等 _receiving 清
    await Promise.resolve()
    expect(isReceivingIdbSync()).toBe(false)
  })

  it('teardown: 清理 BroadcastChannel + 回调', () => {
    const cb = vi.fn()
    const teardown = initIdbSync({ onChange: cb })
    expect(MockBroadcastChannel.channels[0].closed).toBe(false)
    teardown()
    expect(MockBroadcastChannel.channels[0].closed).toBe(true)
  })

  it('storage event fallback: 无 BroadcastChannel 时降级到 storage', async () => {
    // 移除 BroadcastChannel (在当前作用域)
    const original = (globalThis as any).BroadcastChannel
    ;(globalThis as any).BroadcastChannel = undefined
    try {
      // 强制重新初始化 (因 _resetForTest 在 beforeEach 已清)
      const cb = vi.fn()
      const teardown = initIdbSync({ onChange: cb })
      // 模拟 storage event (W134: storage key 现在按 channelName 命名空间)
      const msg = { msgId: 'a', store: 'chats', op: 'put', key: 1, ts: 1, sourceTab: 'other' }
      const ev = new StorageEvent('storage', {
        key: '__idb-sync__:english-app-idb-sync',
        newValue: JSON.stringify(msg),
      })
      window.dispatchEvent(ev)
      await Promise.resolve()
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0][0].store).toBe('chats')
      teardown()
    } finally {
      ;(globalThis as any).BroadcastChannel = original
    }
  })

  it('频率限制: 1 次 / 200ms (RATE_LIMIT_MS)', async () => {
    initIdbSync({})
    const ch = MockBroadcastChannel.channels[0]
    // 第 1 次: 立即发
    notifyIdbWrite({ store: 'a', op: 'put', key: '1' })
    await new Promise(r => setTimeout(r, 250))
    expect(ch.posted.length).toBe(1)

    // 第 2 次 (200ms 内): 推迟
    notifyIdbWrite({ store: 'a', op: 'put', key: '2' })
    await new Promise(r => setTimeout(r, 50))  // 50ms 后查
    expect(ch.posted.length).toBe(1)  // 仍 1
    await new Promise(r => setTimeout(r, 250))  // 再 250ms
    expect(ch.posted.length).toBe(2)
  })
})

// =====================================================================
// 5. db.ts 集成: 写入触发广播
// =====================================================================

describe('W128 db.ts 集成 - 写入触发 notifyIdbWrite', () => {
  it('addFavorite 触发 broadcasts', async () => {
    initIdbSync({})
    await addFavorite('w-fav-1')
    // 等 debounce
    await new Promise(r => setTimeout(r, 250))
    const ch = MockBroadcastChannel.channels[0]
    const favMsgs = ch.posted.filter((m: any) => m.store === 'favorites' && m.op === 'put')
    expect(favMsgs.length).toBe(1)
    expect(favMsgs[0].key).toBe('w-fav-1')
  })

  it('saveChat 触发 broadcasts', async () => {
    initIdbSync({})
    await saveChat({
      id: 100, scenario: 'x', level: 'A1', title: 't',
      messages: [{ id: 'm', role: 'user', content: 'hi', ts: 1 }],
      createdAt: 1, updatedAt: 1,
    })
    await new Promise(r => setTimeout(r, 250))
    const ch = MockBroadcastChannel.channels[0]
    const chatMsgs = ch.posted.filter((m: any) => m.store === 'chats' && m.op === 'put')
    expect(chatMsgs.length).toBe(1)
  })

  it('addErrorReviewScore 触发 broadcasts', async () => {
    initIdbSync({})
    await addErrorReviewScore({
      cardId: 'w-1', source: 'write', score: 80, ts: Date.now(),
    })
    await new Promise(r => setTimeout(r, 250))
    const ch = MockBroadcastChannel.channels[0]
    const msgs = ch.posted.filter((m: any) => m.store === 'errorReviewHistory')
    expect(msgs.length).toBe(1)
  })
})

// =====================================================================
// 6. 旧 export 入口仍可用 (向后兼容)
// =====================================================================

describe('W128 向后兼容 - 旧 export 入口', () => {
  it('export.ts: exportToCSV() 仍可调', async () => {
    const { exportToCSV } = await import('../src/lib/export')
    const csv = await exportToCSV()
    expect(csv.startsWith('\uFEFF')).toBe(true)  // 仍带 BOM
  })

  it('export.ts: exportToJSON() 仍可调', async () => {
    const { exportToJSON } = await import('../src/lib/export')
    const json = await exportToJSON()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.words).toBeTruthy()
  })

  it('export.ts: exportFullBackup() 仍可调', async () => {
    const { exportFullBackup } = await import('../src/lib/export')
    const json = await exportFullBackup()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.favorites).toBeTruthy()
  })

  it('exportChat.ts: exportAllChats() 仍可调', async () => {
    const { exportAllChats } = await import('../src/lib/exportChat')
    const json = await exportAllChats()
    const parsed = JSON.parse(json)
    expect(parsed.type).toBe('all-chats')
    expect(parsed.chats).toEqual([])
  })

  it('exportErrors.ts: allErrorsToCSV() 仍可调', async () => {
    const { allErrorsToCSV } = await import('../src/lib/exportErrors')
    const csv = allErrorsToCSV([], [])
    expect(csv).toContain('id,source,time,source_text,user_text,extra')
  })
})
