// e2e/w129-helpers.ts - W139
// 共享 helper (不是 .spec 文件, 不会被 Playwright 当 test 加载)
import type { Page } from '@playwright/test'

/**
 * W139: IDB reset helper
 * 避免跨 spec IDB 状态污染 (W138 审查报告: 沙盒内 IDB 状态被前轮测试污染)
 *
 * 关键修复: 必须先关掉 app 的 Dexie IDB 连接, 否则 deleteDatabase 被 blocked
 * - 步骤 1: about:blank 导航 (无 IDB 连接, 干净起点)
 * - 步骤 2: 清 localStorage + sessionStorage
 * - 步骤 3: 删整个 IDB db (EnglishAppDB) — 此处无 open connection, 不会 blocked
 * - 步骤 4: 主页 goto — Dexie 重建 IDB (新 version 9)
 */
export async function resetIDB(page: Page) {
  // Step 1: 导航到 about:blank 关闭 app 的 Dexie IDB 连接
  // (前一个测试可能留下 v90 的 IDB, 必须先关才能 delete)
  await page.goto('about:blank')

  await page.evaluate(async () => {
    try { localStorage.clear() } catch {}
    try { sessionStorage.clear() } catch {}
    try {
      // 删整个 db — 现在没有 open connection, onsuccess 会触发
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('EnglishAppDB')
        let resolved = false
        const done = () => { if (!resolved) { resolved = true; resolve() } }
        req.onsuccess = () => done()
        req.onerror = () => done()
        req.onblocked = () => {
          // 仍有 connection 阻塞, 不应发生 (我们刚 nav 到 about:blank)
          console.warn('[resetIDB] deleteDatabase blocked, continuing...')
        }
        // 5s timeout 防 onblocked/未响应
        setTimeout(done, 5000)
      })
    } catch (e) {
      console.warn('[resetIDB] deleteDatabase err:', (e as Error).message)
    }
  })
}
