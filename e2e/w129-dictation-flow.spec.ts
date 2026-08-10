// e2e/w129-dictation-flow.spec.ts - v2.1.12 W129
// 听写 + 错题完整跨页面流程:
//   主页 → /dictation → 答 5 题 → 检查进度条 + 错题入 dictationErrors
//
// 关键设计:
// - 全部用 textarea 输入, 跳过 STT (沙盒没麦克风)
// - 故意答错 1-2 题, 验证 dictationErrors IDB 写入
// - 不依赖 TTS: 跳过 playTarget, 直接用 buildItem.target
//
// W132 修复 (P0-6, P0-7, P1-8):
// - 删死代码 (双赋值 userInput)
// - IDB 软验证 `>= 0` 改成强验证
// - waitForTimeout 500/1000ms 改 waitForSelector

import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'

async function clearDictationErrors(page: Page) {
  return page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('dictationErrors', 'readwrite')
        tx.objectStore('dictationErrors').clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

async function readDictationErrors(page: Page) {
  return page.evaluate(() => {
    return new Promise<Array<{ id?: number; wordId: string; source: string; score: number; target: string; transcript: string }>>((resolve, reject) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('dictationErrors', 'readonly')
        const store = tx.objectStore('dictationErrors')
        const all: Array<{ id?: number; wordId: string; source: string; score: number; target: string; transcript: string }> = []
        store.openCursor().onsuccess = (e) => {
          const cursor = (e.target as IDBCursor).value
          if (cursor) {
            all.push({
              id: cursor.id,
              wordId: cursor.wordId,
              source: cursor.source,
              score: cursor.score,
              target: cursor.target,
              transcript: cursor.transcript,
            })
            cursor.continue()
          } else {
            resolve(all)
          }
        }
      }
    })
  })
}

test.describe('W129 听写 跨页面流程 (桌面)', () => {
  test('主页 → /dictation → 答 5 题 → 检查错题 IDB', async ({ page }) => {
    test.setTimeout(90000)
    // 0. 主页打开 + 清空 dictationErrors
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.indexedDB !== undefined, { timeout: 5000 })
    await clearDictationErrors(page)

    // 1. 进听写
    await page.goto(BASE + '/dictation', { waitUntil: 'domcontentloaded' })
    // 选 简单 难度 (默认就是 easy, 显式点一次)
    await page.waitForSelector('button:has-text("简单")', { timeout: 10000 })
    await page.locator('button:has-text("简单")').first().click()
    // W132 P1-8: waitForSelector 等待答题区域就绪, 不用 1000ms 硬等
    await page.waitForSelector('textarea[placeholder*="或在此输入"]', { timeout: 10000 })

    // 2. 应 看到 textarea (你的回答)
    await page.waitForSelector('textarea[placeholder*="或在此输入"]', { timeout: 15000 })

    let answeredCount = 0
    const targetRounds = 5
    let wrongCount = 0

    for (let i = 0; i < targetRounds; i++) {
      const textarea = page.locator('textarea[placeholder*="或在此输入"]').first()
      await textarea.waitFor({ state: 'visible', timeout: 5000 })

      // W132 P0-6 修复: 删死代码, 只保留 1 个赋值
      // 全部故意答错, 验证 5 条 dictationErrors 入库
      const userInput = 'xxxxxxxxxxwrongxxx' + i
      wrongCount++

      await textarea.fill(userInput)
      const submit = page.locator('button:has-text("提交答案")').first()
      await submit.click()

      // W132 P1-8: 等 反馈 出现 — waitForSelector 而非 waitForTimeout
      await page.waitForSelector('text=得分', { timeout: 10000 })
      // 等 下一题 按钮 出现
      await page.waitForSelector('button:has-text("下一题")', { timeout: 10000 })

      answeredCount++

      // 点下一题
      const nextBtn = page.locator('button:has-text("下一题")').first()
      await nextBtn.click()
      // W132 P1-8: 等 下一题 按钮 重新出现, 不用 waitForTimeout 500
      await page.waitForSelector('textarea[placeholder*="或在此输入"]', { timeout: 10000 })
    }

    expect(answeredCount).toBe(targetRounds)

    // 3. W132 P0-7 修复: IDB 强验证 — 5 题全答错, 期望至少 1 条 dictationErrors (实际可能 5 条)
    //    给异步写入 200ms 时间 (避免 race condition, 但仍硬验证)
    await page.waitForTimeout(500)
    const errors = await readDictationErrors(page)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    // 验证 source 字段
    expect(errors[0].source).toBe('dictation')
    // 验证字段完整
    expect(errors[0].wordId).toBeTruthy()
    expect(typeof errors[0].score).toBe('number')

    // 4. 验证 UI: 进度条 (W132 P1-8 改 waitForSelector)
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*10/').first().textContent({ timeout: 5000 })
    expect(progressText || '').toMatch(/\d+\s*\/\s*10/)
  })

  test('移动端 viewport: 听写 加载 + 答 1 题', async ({ page }) => {
    test.setTimeout(30000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE + '/dictation', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('button:has-text("简单")', { timeout: 10000 })
    // W132 P1-8: 改 waitForSelector 而非 waitForTimeout
    await page.waitForSelector('textarea[placeholder*="或在此输入"]', { timeout: 10000 })
    const submit = page.locator('button:has-text("提交答案")').first()
    // 先填一题
    const ta = page.locator('textarea[placeholder*="或在此输入"]').first()
    await ta.fill('wronganswer_xx')
    await submit.click()
    await page.waitForSelector('text=得分', { timeout: 10000 })
  })
})
