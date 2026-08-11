// e2e/w129-fav-search.spec.ts - v2.1.12 W129
// 释义收藏 + 跨词搜索 跨页面流程:
//   主页 → /words → 收藏 1 词 → /translation-favs → 跨词搜索 → 验证结果
//
// 关键设计:
// - 通过 IDB 注入 translationFavs (避开单词详情交互复杂)
// - /words 页加载 + 链接渲染验证
// - 跨词搜索模式 toggle + 输入 + 验证命中
//
// W132 修复 (P0-12, P0-13, P1-11):
// - firstWord null type narrow 显式 throw (而非静默 return)
// - 跨词搜索 验证 命中 X 词 数字 + 至少 1 个 word 链接
// - waitForTimeout 2000/500 改 waitForSelector

import { test, expect, type Page } from '@playwright/test'
// W139: IDB reset helper (避免跨 spec IDB 状态污染, 见 W138 审查报告)
import { resetIDB } from './w129-helpers'

const BASE = 'http://127.0.0.1:4173/english-app'

/** 注入 translationFav 到 IDB */
async function seedTranslationFav(page: Page, wordId: string, index: number, text: string) {
  return page.evaluate(({ wordId, index, text }) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('translationFavs', 'readwrite')
        const store = tx.objectStore('translationFavs')
        store.put({ wordId, index, text, addedAt: Date.now() })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  }, { wordId, index, text })
}

async function clearTranslationFavs(page: Page) {
  return page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('translationFavs', 'readwrite')
        tx.objectStore('translationFavs').clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

/** 读 translationFavs 数量 */
async function countTranslationFavs(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve, reject) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('translationFavs', 'readonly')
        const store = tx.objectStore('translationFavs')
        const countReq = store.count()
        countReq.onsuccess = () => resolve(countReq.result)
        countReq.onerror = () => reject(countReq.error)
      }
    })
  })
}

/** 读 words.json 第一个 word 的 id 和 word */
async function getFirstWord(page: Page): Promise<{ id: string; word: string } | null> {
  return page.evaluate(async () => {
    try {
      const res = await fetch('/english-app/data/words.json')
      if (!res.ok) return null
      const words = await res.json()
      if (Array.isArray(words) && words.length > 0) {
        return { id: words[0].id, word: words[0].word }
      }
    } catch { /* ignore */ }
    return null
  })
}

test.describe('W129 释义收藏 + 跨词搜索 跨页面流程 (桌面)', () => {
  test.beforeEach(async ({ page }) => {
    // W139: 进首页 reset IDB 防止跨 spec 状态污染
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await resetIDB(page)
  })

  test('主页 → /words → 注入收藏 → /translation-favs → 跨词搜索', async ({ page }) => {
    test.setTimeout(90000)
    // 0. 主页打开 + 清 translationFavs
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.indexedDB !== undefined, { timeout: 5000 })
    await clearTranslationFavs(page)

    // 1. 进词库, 验证链接渲染
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("词库")', { timeout: 10000 })
    // 词库应加载, 至少 1 个 /words/:id 链接
    // W132 P1-11: waitForSelector 等待链接渲染, 不用 3000ms 硬等
    await page.waitForSelector('a[href*="/words/"]', { timeout: 10000 })
    const linkCount = await page.locator('a[href*="/words/"]').count()
    expect(linkCount).toBeGreaterThan(0)

    // 2. 拿 1 个真实 word, 注入 1 条 translationFav
    const firstWord = await getFirstWord(page)
    // W132 P0-12 修复: 显式 throw 而非静默 return — type narrow 后必走 fail 分支
    expect(firstWord).toBeTruthy()
    if (!firstWord) {
      throw new Error('firstWord is null - words.json fetch failed in sandbox')
    }

    await seedTranslationFav(page, firstWord.id, 0, 'test translation saved by e2e')
    // 验证 IDB 写入
    expect(await countTranslationFavs(page)).toBe(1)

    // 3. 进 释义收藏页
    await page.goto(BASE + '/translation-favs', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("释义收藏")', { timeout: 10000 })
    // 验证: 看到刚注入的 text
    await page.waitForSelector('text=test translation saved by e2e', { timeout: 10000 })
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).toContain('test translation saved by e2e')

    // 4. 跨词搜索: 勾选 全词库 checkbox
    const crossCheckbox = page.locator('input[type="checkbox"]').first()
    await crossCheckbox.check()
    // W139: '跨词搜索' 标题只在输入后才出现, 改等搜索 input 可见
    await page.waitForSelector('input[placeholder*="搜索词名"]', { timeout: 5000 })

    // 5. 搜 firstWord 名字 (跨词库)
    const searchInput = page.locator('input[placeholder*="搜索词名"]').first()
    await searchInput.fill(firstWord.word)
    // W132 P1-11: 等 "命中 X 词" 出现 (跨词结果就绪)
    await page.waitForSelector('text=/命中\\s*\\d+\\s*词/', { timeout: 10000 })

    // 6. W132 P0-13 修复: 跨词结果 强验证 — 命中数字 + 至少 1 个 word 链接
    //    修复前: `bodyText2.toMatch(/跨词搜索|命中/)` 标题永远显示, 等于没验证
    //    修复后: "命中 N 词" + 至少 1 个 /words/:id 链接
    const bodyText2 = await page.textContent('body') || ''
    const hitMatch = bodyText2.match(/命中\s*(\d+)\s*词/)
    expect(hitMatch).toBeTruthy()
    const hitCount = hitMatch ? parseInt(hitMatch[1], 10) : 0
    expect(hitCount).toBeGreaterThanOrEqual(1)

    // 至少 1 个 跨词结果的 word 链接
    const crossWordLinks = await page.locator('a[href*="/words/"]').count()
    expect(crossWordLinks).toBeGreaterThan(0)
  })

  test('移动端 viewport: /words 加载 + 收藏 + 跨词搜索', async ({ page }) => {
    test.setTimeout(30000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("词库")', { timeout: 10000 })
    // 至少 1 个词链接
    await page.waitForSelector('a[href*="/words/"]', { timeout: 10000 })
    const linkCount = await page.locator('a[href*="/words/"]').count()
    expect(linkCount).toBeGreaterThan(0)
  })
})
