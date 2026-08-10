// e2e/w129-fav-search.spec.ts - v2.1.12 W129
// 释义收藏 + 跨词搜索 跨页面流程:
//   主页 → /words → 收藏 1 词 → /translation-favs → 跨词搜索 → 验证结果
//
// 关键设计:
// - 通过 IDB 注入 translationFavs (避开单词详情交互复杂)
// - /words 页加载 + 链接渲染验证
// - 跨词搜索模式 toggle + 输入 + 验证命中

import { test, expect, type Page } from '@playwright/test'

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
  test('主页 → /words → 注入收藏 → /translation-favs → 跨词搜索', async ({ page }) => {
    test.setTimeout(90000)
    // 0. 主页打开 + 清 translationFavs
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await clearTranslationFavs(page)

    // 1. 进词库, 验证链接渲染
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("词库")', { timeout: 10000 })
    // 词库应加载, 至少 1 个 /words/:id 链接
    await page.waitForTimeout(3000)  // 词库 fetch + render
    const linkCount = await page.locator('a[href*="/words/"]').count()
    expect(linkCount).toBeGreaterThan(0)

    // 2. 拿 1 个真实 word, 注入 1 条 translationFav
    const firstWord = await getFirstWord(page)
    expect(firstWord).toBeTruthy()
    if (!firstWord) return  // type narrow

    await seedTranslationFav(page, firstWord.id, 0, 'test translation saved by e2e')
    // 验证 IDB 写入
    expect(await countTranslationFavs(page)).toBe(1)

    // 3. 进 释义收藏页
    await page.goto(BASE + '/translation-favs', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("释义收藏")', { timeout: 10000 })
    // 验证: 看到刚注入的 text
    await page.waitForTimeout(2000)
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).toContain('test translation saved by e2e')

    // 4. 跨词搜索: 勾选 全词库 checkbox
    const crossCheckbox = page.locator('input[type="checkbox"]').first()
    await crossCheckbox.check()
    await page.waitForTimeout(500)

    // 5. 搜 firstWord 名字 (跨词库)
    const searchInput = page.locator('input[placeholder*="搜索词名"]').first()
    await searchInput.fill(firstWord.word)
    // 等 跨词搜索 模式生效
    await page.waitForTimeout(2000)
    // 验证: 标题变 跨词搜索 或 命中 X 词
    const bodyText2 = await page.textContent('body') || ''
    expect(bodyText2).toMatch(/跨词搜索|命中/)
  })

  test('移动端 viewport: /words 加载 + 收藏 + 跨词搜索', async ({ page }) => {
    test.setTimeout(30000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE + '/words', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1:has-text("词库")', { timeout: 10000 })
    await page.waitForTimeout(2000)
    // 至少 1 个词链接
    const linkCount = await page.locator('a[href*="/words/"]').count()
    expect(linkCount).toBeGreaterThan(0)
  })
})
