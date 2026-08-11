// e2e W137 — UpdateToast 24h dismiss-until (P1-7) — 真测
// 验证完整 用户流程: SW 触发 → toast 弹 → 用户点稍后 → 24h 内不再弹
//
// W137 修: 之前是 localStorage roundtrip 假 e2e, 现用 UpdateToast 暴露的
//  window.__w136_test_updateToast.triggerNeedRefresh() 真实调用 onNeedRefresh 路径
//  (含 dismiss 检查), 然后实际点击 [data-testid="update-toast-dismiss"] 按钮.
//
// 业务背景 (W135 抗审查 P1-7):
//  - SW 检测到新版本会持续触发 onNeedRefresh
//  - 用户每天看 N 次 toast 很烦
//  - 解决: 用户点"稍后" → localStorage 记 24h dismiss-until → 24h 内静默
//  - 24h 后自动恢复提示 (用户主动刷新 / 重启浏览器仍能拿到新 SW, 因 skipWaiting 已开)
import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:4173/english-app'
const VIEWPORT_DESKTOP = { width: 1280, height: 800 }
const DISMISS_KEY = 'w136-update-dismiss-until'

async function go(page: any) {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { timeout: 10000 })
  // 等 UpdateToast 挂载 + test hook 可用
  await page.waitForFunction(
    () => typeof (window as any).__w136_test_updateToast?.triggerNeedRefresh === 'function',
    { timeout: 10000 },
  )
}

test('W137 — 初次访问无 update toast / indicator', async ({ page }) => {
  await go(page)
  await page.evaluate((k) => localStorage.removeItem(k), DISMISS_KEY)
  // reset hook 状态
  await page.evaluate(() => (window as any).__w136_test_updateToast?.reset?.())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await go(page)
  await page.waitForTimeout(300)
  await expect(page.locator('[data-testid="update-toast"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="update-indicator"]')).toHaveCount(0)
})

test('W137 — 真测完整流程: trigger → toast 弹 → 点稍后 → 24h 内不再弹', async ({ page }) => {
  await go(page)
  // 干净状态
  await page.evaluate((k) => localStorage.removeItem(k), DISMISS_KEY)
  await page.evaluate(() => (window as any).__w136_test_updateToast?.reset?.())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await go(page)

  // Step 1: trigger onNeedRefresh (走真实 setState 路径, 含 dismiss 检查)
  const triggered = await page.evaluate(() =>
    (window as any).__w136_test_updateToast.triggerNeedRefresh(),
  )
  expect(triggered, 'dismiss 期外 trigger 应返回 true').toBe(true)

  // Step 2: toast 真的弹出来
  await expect(page.locator('[data-testid="update-toast"]')).toBeVisible({ timeout: 3000 })
  // dismiss 按钮 也可见
  const dismissBtn = page.locator('[data-testid="update-toast-dismiss"]')
  await expect(dismissBtn).toBeVisible()

  // Step 3: 用户点稍后
  await dismissBtn.click()

  // Step 4: toast 立即消失
  await expect(page.locator('[data-testid="update-toast"]')).toHaveCount(0)
  // indicator 也消失
  await expect(page.locator('[data-testid="update-indicator"]')).toHaveCount(0)

  // Step 5: localStorage 写了 dismiss-until (24h 内)
  const dismissUntil = await page.evaluate((k) => Number(localStorage.getItem(k)), DISMISS_KEY)
  const now = Date.now()
  const diff = dismissUntil - now
  expect(diff, 'dismiss-until 应在 24h 内 (now + 24h ± 1min)').toBeGreaterThan(24 * 60 * 60 * 1000 - 60_000)
  expect(diff, 'dismiss-until 应在 24h 内 (now + 24h + 1min)').toBeLessThan(24 * 60 * 60 * 1000 + 60_000)

  // Step 6: 重新 trigger (模拟 SW 又检测到新版) — 应被 dismiss 拦截
  // reset 状态 但 保留 localStorage dismiss
  await page.evaluate(() => (window as any).__w136_test_updateToast?.reset?.())
  const retriggered = await page.evaluate(() =>
    (window as any).__w136_test_updateToast.triggerNeedRefresh(),
  )
  // trigger 在 dismiss 期应返回 false, toast 不出现
  expect(retriggered, 'dismiss 期内 trigger 应返回 false').toBe(false)
  await expect(page.locator('[data-testid="update-toast"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="update-indicator"]')).toHaveCount(0)
})

test('W137 — dismiss 期已过期 → trigger 应弹 toast (周期恢复)', async ({ page }) => {
  await go(page)
  // 写一个已过期的 dismiss-until (1s 前)
  await page.evaluate((k) => localStorage.setItem(k, String(Date.now() - 1000)), DISMISS_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await go(page)

  // 验证 hook isDismissed=false
  const isDismissed = await page.evaluate(
    () => (window as any).__w136_test_updateToast.isDismissed(),
  )
  expect(isDismissed, '过期 dismiss-until 应让 hook 视作 not dismissed').toBe(false)

  // trigger 应成功
  const triggered = await page.evaluate(() =>
    (window as any).__w136_test_updateToast.triggerNeedRefresh(),
  )
  expect(triggered, '过期后 trigger 应返回 true').toBe(true)
  await expect(page.locator('[data-testid="update-toast"]')).toBeVisible({ timeout: 3000 })
})

test('W137 — 完整闭环: dismiss → reload → SW 再 trigger 仍不弹 (持久化生效)', async ({ page }) => {
  await go(page)
  // Step 1: 清状态 + trigger + dismiss
  await page.evaluate((k) => localStorage.removeItem(k), DISMISS_KEY)
  await page.evaluate(() => (window as any).__w136_test_updateToast?.reset?.())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await go(page)
  await page.evaluate(() => (window as any).__w136_test_updateToast.triggerNeedRefresh())
  await page.locator('[data-testid="update-toast-dismiss"]').click()

  // Step 2: reload 整个页面 (模拟用户关闭重开)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await go(page)

  // Step 3: SW 后台再次 trigger — 应不弹
  const retriggered = await page.evaluate(() =>
    (window as any).__w136_test_updateToast.triggerNeedRefresh(),
  )
  expect(retriggered, 'reload 后重 trigger 应被 dismiss 拦截').toBe(false)
  await expect(page.locator('[data-testid="update-toast"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="update-indicator"]')).toHaveCount(0)

  // Step 4: 清理
  await page.evaluate((k) => localStorage.removeItem(k), DISMISS_KEY)
})
