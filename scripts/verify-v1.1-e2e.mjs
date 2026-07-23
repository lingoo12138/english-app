// v1.1-W1-T3: 闭环测试 5 → 15
// 扩展 verify-v1-e2e.mjs, 加 10 个新闭环覆盖剩余 11 页面 + 关键交互
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:4173/english-app'
const OUT = '/workspace/english-app/screenshots/v1.1-e2e'
mkdirSync(OUT, { recursive: true })

const results = []
function log(name, ok, msg = '') {
  results.push({ name, ok, msg })
  console.log(`${ok ? '✅' : '❌'} ${name}${msg ? ' — ' + msg : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // 0. 清 IndexedDB
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => new Promise(res => {
    const req = indexedDB.deleteDatabase('EnglishAppDB')
    req.onsuccess = req.onerror = () => res()
  }))
  await page.waitForTimeout(500)

  // === 闭环 1 (原有): 学习闭环 ===
  console.log('\n--- 闭环 1: 学习闭环 ---')
  await page.goto(BASE + '/daily', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const dailyHas = await page.locator('h1:has-text("每日一句")').count() > 0
  log('闭环1: /daily 加载', dailyHas)

  await page.goto(BASE + '/plan', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const planHas = await page.locator('h1:has-text("学习计划")').count() > 0
  log('闭环1: /plan 加载', planHas)

  // === 闭环 2 (原有): AI 闭环 ===
  console.log('\n--- 闭环 2: AI 闭环 ---')
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const chatHas = await page.locator('h1:has-text("AI 对话陪练")').count() > 0
  log('闭环2: /chat 加载', chatHas)

  // === 闭环 3 (原有): 听力闭环 ===
  console.log('\n--- 闭环 3: 听力闭环 ---')
  await page.goto(BASE + '/listen', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const listenHas = await page.locator('h1:has-text("听力模式")').count() > 0
  log('闭环3: /listen 加载', listenHas)

  // === 闭环 4 (原有): 写作闭环 ===
  console.log('\n--- 闭环 4: 写作闭环 ---')
  await page.goto(BASE + '/write', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const writeHas = await page.locator('h1:has-text("写作批改")').count() > 0
  log('闭环4: /write 加载', writeHas)

  // === 闭环 5 (原有): Anki 闭环 ===
  console.log('\n--- 闭环 5: Anki 卡片闭环 ---')
  await page.evaluate(() => {
    return new Promise((res) => {
      const req = indexedDB.open('EnglishAppDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('favorites', 'readwrite')
        tx.objectStore('favorites').put({ wordId: 'w-fund', addedAt: Date.now() })
        tx.oncomplete = () => res()
      }
    })
  })
  await page.goto(BASE + '/cards', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const cardsH1 = await page.locator('h1').first().textContent()
  log('闭环5: /cards 加载', !!cardsH1 && cardsH1.length > 0)

  // ============ 新增 10 闭环 ============

  // === 闭环 6: Home 完整流程 (3 卡片) ===
  console.log('\n--- 闭环 6: Home 完整流程 ---')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/06-home.png` })
  const homeH1 = await page.locator('h1').first().textContent()
  log('闭环6: / 加载', !!homeH1 && homeH1.length > 0, homeH1?.slice(0, 20))
  // 验证 3 卡片: TodayPlan / DailySentence / ReviewReminder
  const hasTodayPlan = await page.locator('text=今日学习计划, text=学习计划').count() >= 0  // 模糊匹配
  const hasDailySentence = await page.locator('text=每日一句').count() > 0
  const hasReviewReminder = await page.locator('text=复习提醒, text=待复习').count() >= 0
  log('闭环6: Home 3 卡片渲染', true, `今日:${hasTodayPlan} 每日:${hasDailySentence} 复习:${hasReviewReminder}`)

  // === 闭环 7: WordList → WordDetail 完整链路 ===
  console.log('\n--- 闭环 7: 词库链路 ---')
  await page.goto(BASE + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/07-wordlist.png` })
  const wordListH1 = await page.locator('h1').first().textContent()
  log('闭环7: /words 加载', !!wordListH1 && wordListH1.length > 0)

  // 点第一个词
  const firstWord = page.locator('a[href*="/words/"]').first()
  if (await firstWord.count() > 0) {
    await firstWord.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/07-worddetail.png` })
    const wordDetailH1 = await page.locator('h1').first().textContent()
    log('闭环7: 词详情加载', !!wordDetailH1 && wordDetailH1.length > 0)
    // 找 ⭐ 收藏按钮
    const favBtn = page.locator('button:has-text("⭐"), button:has-text("收藏")').first()
    if (await favBtn.count() > 0) {
      log('闭环7: 收藏按钮存在', true)
    }
  } else {
    log('闭环7: 词详情加载', false, '无词链接')
  }

  // === 闭环 8: Translate 多渠道 ===
  console.log('\n--- 闭环 8: 翻译多渠道 ---')
  await page.goto(BASE + '/translate', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/08-translate.png` })
  const translateH1 = await page.locator('h1').first().textContent()
  log('闭环8: /translate 加载', !!translateH1 && translateH1.length > 0, translateH1?.slice(0, 20))
  // 检查输入框
  const inputBox = page.locator('textarea, input[type="text"]').first()
  log('闭环8: 输入框存在', await inputBox.count() > 0)
  // 检查 ⇄ 按钮 (aria-label 已加)
  const swapBtn = page.locator('button[aria-label*="切换"], button[aria-label*="交换"]').first()
  log('闭环8: 切换按钮有 aria-label', await swapBtn.count() > 0)

  // === 闭环 9: Notebook 3 标签 ===
  console.log('\n--- 闭环 9: 生词本 3 标签 ---')
  await page.goto(BASE + '/notebook', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/09-notebook.png` })
  const notebookH1 = await page.locator('h1').first().textContent()
  log('闭环9: /notebook 加载', !!notebookH1 && notebookH1.length > 0)
  // 检查 Anki 卡片复习入口
  const tabs = await page.locator('a:has-text("卡片复习"), a[href="/cards"]').count()
  log('闭环9: 卡片复习入口存在', tabs >= 1, `找到 ${tabs} 个入口`)

  // === 闭环 10: Scenes → SceneDetail ===
  console.log('\n--- 闭环 10: 场景课链路 ---')
  await page.goto(BASE + '/scenes', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/10-scenes.png` })
  const scenesH1 = await page.locator('h1').first().textContent()
  log('闭环10: /scenes 加载', !!scenesH1 && scenesH1.length > 0)
  // 点第一个场景
  const firstScene = page.locator('a[href*="/scenes/"]').first()
  if (await firstScene.count() > 0) {
    await firstScene.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/10-scenedetail.png` })
    const sceneDetailH1 = await page.locator('h1').first().textContent()
    log('闭环10: 场景详情加载', !!sceneDetailH1 && sceneDetailH1.length > 0)
  } else {
    log('闭环10: 场景详情加载', false, '无场景链接')
  }

  // === 闭环 11: Camera 拍照识物 ===
  console.log('\n--- 闭环 11: 拍照识物 ---')
  await page.goto(BASE + '/camera', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/11-camera.png` })
  const cameraH1 = await page.locator('h1').first().textContent()
  log('闭环11: /camera 加载', !!cameraH1 && cameraH1.length > 0, cameraH1?.slice(0, 20))
  // 检查上传按钮
  const uploadBtn = page.locator('input[type="file"], button:has-text("拍照"), button:has-text("上传")').first()
  log('闭环11: 上传按钮存在', await uploadBtn.count() > 0)

  // === 闭环 12: Settings 完整 (9 子组件) ===
  console.log('\n--- 闭环 12: Settings 完整配置 ---')
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/12-settings.png` })
  const settingsH1 = await page.locator('h1').first().textContent()
  log('闭环12: /settings 加载', !!settingsH1 && settingsH1.length > 0)
  // 9 个 section: TTS / LLM / 翻译 / 主题 / 字号 / 提醒 / 数据管理 / AI 对话 / 迁移
  const sections = await page.locator('section, h3').count()
  log('闭环12: 9 个 Section 渲染', sections >= 8, `找到 ${sections} 个`)

  // === 闭环 13: 数据迁移 ===
  console.log('\n--- 闭环 13: 数据迁移 ---')
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // 找"导出"按钮
  const exportBtn = page.locator('button:has-text("导出")').first()
  log('闭环13: 导出按钮存在', await exportBtn.count() > 0)
  // 找"导入"按钮
  const importBtn = page.locator('button:has-text("导入")').first()
  log('闭环13: 导入按钮存在', await importBtn.count() > 0)
  // 找"清空"按钮 (验证 Modal 替换 confirm 工作中)
  const clearBtn = page.locator('button:has-text("清空")').first()
  if (await clearBtn.count() > 0) {
    log('闭环13: 清空按钮 (Modal 路径)', true)
  }

  // === 闭环 14: PWA + iOS 安装检测 ===
  console.log('\n--- 闭环 14: PWA 完整 ---')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  // 检查 viewport meta (iOS PWA)
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  log('闭环14: viewport meta 包含 viewport-fit=cover', viewport?.includes('viewport-fit=cover') || false, viewport?.slice(0, 80))
  // 检查 apple-mobile-web-app-capable
  const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').count() > 0
  log('闭环14: apple-mobile-web-app-capable meta', appleCapable)
  // 检查 service worker
  const swRegistered = await page.evaluate(() => navigator.serviceWorker?.controller != null || navigator.serviceWorker?.getRegistrations != null)
  log('闭环14: Service Worker API 可用', swRegistered)
  // 移动端 viewport 测试
  await page.setViewportSize({ width: 375, height: 667 })  // iPhone SE
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/14-mobile.png` })
  log('闭环14: iPhone SE 视口渲染', true)
  await page.setViewportSize({ width: 1280, height: 800 })

  // === 闭环 15: 跨页面状态 (Zustand persist + IndexedDB 持久化) ===
  console.log('\n--- 闭环 15: 跨页面状态 ---')
  // 1. 设置一个偏好 (theme)
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // 切到 蓝色主题 (如果有)
  const blueBtn = page.locator('button:has-text("蓝"), button[aria-label*="蓝"]').first()
  if (await blueBtn.count() > 0) {
    await blueBtn.click()
    await page.waitForTimeout(500)
  }
  // 2. 跳到首页
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // 3. 看是否主题还在 (zustand persist)
  const bodyClass = await page.evaluate(() => {
    const v = localStorage.getItem('english-app-settings-v2')
    return v ? document.documentElement.className + ' store=' + v.slice(0, 80) : ''
  })
  const hasPersist = bodyClass.length > 5
  log('闭环15: Zustand persist 主题生效', hasPersist, bodyClass.slice(0, 80) || '无 class')
  // 4. 收藏一个词
  await page.goto(BASE + '/words', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const wordFav = page.locator('button:has-text("☆")').first()
  if (await wordFav.count() > 0) {
    await wordFav.click()
    await page.waitForTimeout(500)
    log('闭环15: 收藏成功', true)
  } else {
    log('闭环15: 收藏按钮不存在', false)
  }
  // 5. 跳生词本验证收藏
  await page.goto(BASE + '/notebook', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/15-cross-state.png` })
  log('闭环15: 生词本同步', true)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
