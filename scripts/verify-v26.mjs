// 验证 v0.26 W4-A: 听力模式
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:4173/english-app'
const OUT = '/workspace/english-app/screenshots'
mkdirSync(OUT, { recursive: true })

const results = []
function log(name, ok, msg = '') {
  results.push({ name, ok, msg })
  console.log(`${ok ? '✅' : '❌'} ${name}${msg ? ' — ' + msg : ''}`)
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // 1. 进 /listen
  await page.goto(BASE + '/listen', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const h1 = await page.locator('h1:has-text("听力模式")').first().textContent()
  log('听力模式标题', h1?.includes('听力模式'), h1)
  await page.screenshot({ path: `${OUT}/v26-listen-overview.png`, fullPage: false })

  // 2. 看 5 篇短文列表
  const lessons = await page.locator('button:has-text("咖啡店"), button:has-text("机场"), button:has-text("酒店"), button:has-text("商店"), button:has-text("工作")').count()
  log('5 篇短文列表', lessons === 5, `count=${lessons}`)

  // 3. 点击"咖啡店点单"
  const cafeLesson = page.locator('button:has-text("咖啡店点单")')
  if (await cafeLesson.count() > 0) {
    await cafeLesson.click()
    await page.waitForTimeout(800)
    const playBtn = await page.locator('button:has-text("播放整篇")').count()
    log('LessonView 播放按钮', playBtn > 0, `count=${playBtn}`)
    await page.screenshot({ path: `${OUT}/v26-listen-lesson.png`, fullPage: false })

    // 4. 下一关:听写
    const nextBtn = page.locator('button:has-text("挖空听写")')
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      const dictationInputs = await page.locator('input[placeholder*="空"]').count()
      log('听写填空输入框', dictationInputs === 5, `count=${dictationInputs}`)
      await page.screenshot({ path: `${OUT}/v26-listen-dictation.png`, fullPage: false })

      // 5. 填错一个正确答案,看提交后状态
      const inputs = page.locator('input[placeholder*="空"]')
      await inputs.nth(0).fill('cappuccino')  // 对
      await inputs.nth(1).fill('WRONG')  // 错
      await inputs.nth(2).fill('chocolate')  // 对
      await inputs.nth(3).fill('gluten-free')  // 对
      await inputs.nth(4).fill('twelve')  // 对
      await page.waitForTimeout(300)

      const submitBtn = page.locator('button:has-text("提交答案")')
      if (await submitBtn.count() > 0) {
        await submitBtn.click()
        await page.waitForTimeout(800)
        const correct = await page.locator('.bg-emerald-50, .dark\\:bg-emerald-900\\/20').count()
        log('听写提交后有正确/错误标记', correct > 0, `count=${correct}`)
        await page.screenshot({ path: `${OUT}/v26-listen-dictation-graded.png`, fullPage: false })

        // 6. 下一关:理解题
        const qBtn = page.locator('button:has-text("理解题")')
        if (await qBtn.count() > 0) {
          await qBtn.click()
          await page.waitForTimeout(500)
          const questionCards = await page.locator('.card:has-text("1.")').count()
          log('理解题卡片', questionCards > 0, `count=${questionCards}`)
          await page.screenshot({ path: `${OUT}/v26-listen-questions.png`, fullPage: false })

          // 7. 答完提交
          const optBtns = page.locator('.card button:has-text("Large"), .card button:has-text("$12")')
          if (await optBtns.count() >= 2) {
            await optBtns.nth(0).click()  // Large
            await optBtns.nth(1).click()  // $12
            await page.waitForTimeout(300)
            const submitQ = page.locator('button:has-text("提交答案")')
            if (await submitQ.count() > 0) {
              await submitQ.click()
              await page.waitForTimeout(500)
              const correct = await page.locator('.bg-emerald-50, .dark\\:bg-emerald-900\\/20').count()
              log('理解题提交后有标记', correct > 0, `count=${correct}`)
            }
          }

          // 8. 结果页
          const resultBtn = page.locator('button:has-text("查看结果")')
          if (await resultBtn.count() > 0) {
            await resultBtn.click()
            await page.waitForTimeout(500)
            const completed = await page.locator('text=完成!').count()
            log('结果页"完成!"', completed > 0, `count=${completed}`)
            await page.screenshot({ path: `${OUT}/v26-listen-result.png`, fullPage: false })
          }
        }
      }
    }
  }

  // 9. Home 看 /listen 入口
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const listenLink = await page.locator('a[href*="listen"]').count()
  log('Home/nav 有听力入口', listenLink > 0, `count=${listenLink}`)

  await browser.close()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`)
  if (failed.length) {
    console.log('FAIL:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
