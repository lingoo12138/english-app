// e2e/w129-aichat-flow.spec.ts - v2.1.12 W129
// AI 对话陪练 跨页面流程:
//   /chat → 输入消息 → Mock AI 响应 → 检查消息列表 + IDB 持久化
//
// 关键设计:
// - 默认 llmProviderId='mock' (无需 API key)
// - Mock 渠道走 mockResponse, 不打真实网络
// - 验证 IDB chats 表写入 + messages 列表
// - network.route 双保险: 拦 LLM API, 强制 mock JSON
//
// W132 修复 (P0-8, P0-9, P0-10, P1-14):
// - waitForTimeout 8000ms → waitForSelector 等输入框可输入 (loading 结束)
// - IDB 软验证 `>= 0` 改成 `>= 1` 真验证
// - 监听器移到 test 顶部, BEFORE navigation
// - 验证 mock AI 响应内容 (5 个 mock 之一)

import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'

/** Mock 所有外网 LLM API 响应 (兜底, 沙盒网络不稳) */
async function setupNetworkMocks(page: Page) {
  // 只 mock 真实外网 LLM 域 (api.openai.com 等), 不要拦本地 /assets/*.js
  await page.route('**/v1/chat/completions', async (route) => {
    const url = route.request().url()
    // 跳过本地 /english-app/assets/* (vite JS 走 /english-app/assets/*, 但 LLM 不可能匹配)
    if (url.includes('/english-app/')) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [
          {
            message: { role: 'assistant', content: 'Hello! This is a mock reply from test.' },
            finish_reason: 'stop',
          },
        ],
      }),
    })
  })
  // 拦 openai /v1/chat/completions 各种 host
  await page.route('**/chat/completions', async (route) => {
    const url = route.request().url()
    if (url.includes('/english-app/')) {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Mocked AI response' }, finish_reason: 'stop' }],
      }),
    })
  })
}

async function clearChats(page: Page) {
  return page.evaluate(() => {
    return new Promise<void>((resolve) => {
      try {
        // 用 Dexie 已知最新 version 9, 否则 IDB 会用 v1 创建 (无 chats store)
        const req = indexedDB.open('EnglishAppDB', 9)
        req.onerror = () => { console.error('open err', req.error); resolve() /* 继续, 不阻塞 test */ }
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('chats')) {
            db.close()
            resolve()
            return
          }
          try {
            const tx = db.transaction('chats', 'readwrite')
            tx.objectStore('chats').clear()
            tx.oncomplete = () => { db.close(); resolve() }
            tx.onerror = () => { db.close(); resolve() }
            tx.onabort = () => { db.close(); resolve() }
          } catch (e) {
            console.error('tx fail', e)
            db.close()
            resolve()
          }
        }
        req.onupgradeneeded = () => { /* 让 app 自己 upgrade, 不干预 */ }
        setTimeout(() => { console.warn('clearChats timeout, continuing'); resolve() }, 5000)
      } catch (e) {
        console.error('clearChats outer fail', e)
        resolve()
      }
    })
  })
}

async function readChats(page: Page) {
  return page.evaluate(() => {
    return new Promise<Array<{ id: number; title: string; messages: Array<{ role: string; content: string }>; scenario: string; level: string }>>((resolve) => {
      try {
        const req = indexedDB.open('EnglishAppDB', 9)
        req.onerror = () => resolve([])
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('chats')) {
            db.close()
            resolve([])
            return
          }
          const tx = db.transaction('chats', 'readonly')
          const store = tx.objectStore('chats')
          const all: Array<{ id: number; title: string; messages: Array<{ role: string; content: string }>; scenario: string; level: string }> = []
          store.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBCursor).value
            if (cursor) {
              all.push({
                id: cursor.id,
                title: cursor.title,
                messages: cursor.messages,
                scenario: cursor.scenario,
                level: cursor.level,
              })
              cursor.continue()
            } else {
              db.close()
              resolve(all)
            }
          }
        }
        setTimeout(() => resolve([]), 5000)
      } catch (e) {
        resolve([])
      }
    })
  })
}

test.describe('W129 AI 对话 跨页面流程 (桌面)', () => {
  test('/chat → 输入消息 → Mock AI 响应 → 消息列表 + IDB', async ({ page }) => {
    test.setTimeout(60000)
    // W132 P0-10 修复: 监听器 BEFORE any navigation
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text())
    })
    page.on('requestfailed', (req) => console.log('REQ FAILED:', req.url(), req.failure()?.errorText))
    page.on('response', (res) => {
      if (res.status() >= 400) console.log('HTTP', res.status(), res.url())
    })

    // 网络 mock (兜底) — 移到 test 顶部
    await setupNetworkMocks(page)

    // 0. 主页打开 + 清 chats
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.indexedDB !== undefined, { timeout: 5000 })
    try {
      await clearChats(page)
    } catch (e) {
      console.warn('clearChats warn (ignoring):', (e as Error).message)
    }

    // 1. 进 AI 对话
    await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
    // 等 React 渲染 + provider 列表
    await page.waitForSelector('main h1:has-text("AI 对话陪练")', { timeout: 15000 })
    // W132 P1-9: 改 waitForSelector 而非 waitForTimeout 2000ms
    await page.waitForSelector('input[placeholder*="输入英文"], input[placeholder*="Enter"]', { timeout: 10000 })

    // 2. 找输入框 (placeholder 含 "输入英文" 或 "Enter")
    const input = page.locator('input[placeholder*="输入英文"], input[placeholder*="Enter"]').first()
    await input.waitFor({ state: 'visible', timeout: 10000 })

    // 3. 输消息
    const userMessage = 'Hello, can you help me learn English?'
    await input.fill(userMessage)
    // 按 Enter 发送
    await input.press('Enter')

    // 4. W132 P0-8 修复: 等 AI 响应完成 (loading 状态结束, 输入框重新可用)
    // loading 期间输入框 disabled — 用 waitForSelector 等 input 可输入
    await expect(input).toBeEnabled({ timeout: 15000 })

    // 5. 验证: 输入框已清空
    const inputValue = await input.inputValue()
    expect(inputValue).toBe('')

    // 6. 验证: 消息列表包含用户消息
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).toContain('Hello, can you help me learn English')

    // W132 P1-14 修复: 验证 mock AI 响应内容 (5 个 mock 之一, 或 mock 兜底)
    // mockResponse 5 个: 'Got it!', 'I see!', 'Great point!', 'That is interesting', 'I understand'
    // network.route 兜底: 'Mocked AI response' / 'Hello! This is a mock reply from test.'
    const aiReplyVisible = await page.locator('main').textContent()
    expect(aiReplyVisible || '').toMatch(/Got it!|I see!|Great point!|interesting|understand|Mocked|mock reply/i)

    // 7. W132 P0-9 修复: IDB chats 表 强验证 — 至少 1 条记录, 包含 user + assistant messages
    // 给 IDB 异步写入 200ms 缓冲
    await page.waitForTimeout(300)
    const chats = await readChats(page)
    // debug: 详细检查
    if (chats.length === 0) {
      const debugInfo = await page.evaluate(() => {
        return new Promise<string>((resolve) => {
          const req = indexedDB.open('EnglishAppDB')
          req.onsuccess = () => {
            const db = req.result
            const stores = Array.from(db.objectStoreNames)
            // 尝试列 chats 表内容
            try {
              const tx = db.transaction('chats', 'readonly')
              const store = tx.objectStore('chats')
              const all: any[] = []
              store.openCursor().onsuccess = (e) => {
                const cursor = (e.target as IDBCursor).value
                if (cursor) {
                  all.push({ id: cursor.id, title: cursor.title, msgCount: cursor.messages?.length })
                  cursor.continue()
                } else {
                  db.close()
                  resolve(`v=${db.version}, stores=[${stores.join(',')}], chatsCount=${all.length}, sample=${JSON.stringify(all.slice(0,2))}`)
                }
              }
            } catch (e) {
              db.close()
              resolve(`v=${db.version}, stores=[${stores.join(',')}], no chats access: ${(e as Error).message}`)
            }
          }
        })
      })
      console.log('IDB debug:', debugInfo)
    }
    expect(chats.length).toBeGreaterThanOrEqual(1)
    // 至少 1 个 chat 含 user + assistant messages
    const chatWithMessages = chats.find(c => Array.isArray(c.messages) && c.messages.length >= 2)
    expect(chatWithMessages).toBeTruthy()
    if (chatWithMessages) {
      expect(chatWithMessages.messages.some(m => m.role === 'user')).toBe(true)
      expect(chatWithMessages.messages.some(m => m.role === 'assistant')).toBe(true)
    }
    // 用户消息输入成功 (UI 兜底)
    const userMsg = page.locator(`text="${userMessage}"`).first()
    await expect(userMsg).toBeVisible({ timeout: 5000 })
  })

  test('移动端 viewport: /chat 加载 + 输入框可见', async ({ page }) => {
    test.setTimeout(30000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("AI 对话陪练")', { timeout: 15000 })
    // 输入框 应 在 viewport 内
    const input = page.locator('input[placeholder*="输入英文"], input[placeholder*="Enter"]').first()
    await input.waitFor({ state: 'visible', timeout: 10000 })
    await expect(input).toBeVisible()
  })
})
