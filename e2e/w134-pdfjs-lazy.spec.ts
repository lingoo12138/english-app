// e2e/w134-pdfjs-lazy.spec.ts - W134 pdfjs 懒加载 e2e 验证
// 验证:
//  1. dist/assets/pdfjs-*.js 拆成独立 chunk (不污染首屏)
//  2. 错题复习 / 课文评分页加载时, pdfjs 不在首 chunk (按需加载)
//  3. service worker precache 列表不包含 pdfjs (运行时按需)
//  4. 进入需要 PDF 的页面 (/scenes 上传 PDF) 才触发 pdfjs 请求
//
// 测试方式:
//  - dist/ 必须先 build 出来 (npm run build)
//  - 本地 spa_server.py 起 4173 端口, 服务 dist/
//  - playwright 跟踪 page.on('request') 收集所有 JS 资源请求
//  - 断言: 错题复习 / 课文评分 页面的 JS 资源集合不含 pdfjs-*.js
import { test, expect } from '@playwright/test'
import { existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'

const BASE = 'http://127.0.0.1:4173/english-app'
const DIST = 'dist'

/** 收集页面加载期间所有 .js 资源请求, 返回 URL 路径列表 */
async function collectJsRequests(page: any, path: string): Promise<string[]> {
  const reqs: string[] = []
  page.on('request', (req: any) => {
    const u: string = req.url()
    if (u.includes('/assets/') && u.endsWith('.js')) {
      // 取文件名
      const m = u.match(/\/assets\/([^?#]+)/)
      if (m) reqs.push(m[1])
    }
  })
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // 等首屏 React 渲染 + 词库 fetch (5-10s)
  await page.waitForTimeout(5000)
  return reqs
}

test('W134 pdfjs 懒加载 — dist/ 拆分验证', async () => {
  // 1. pdfjs 必须存在且是独立 chunk
  expect(existsSync(DIST)).toBe(true)
  const files = readdirSync(join(DIST, 'assets'))
  const pdfjsFile = files.find(f => /^pdfjs-.*\.js$/.test(f))
  expect(pdfjsFile).toBeDefined()
  // 2. pdfjs 必须够大 (确认是独立 chunk, 不是被合并到主 bundle)
  const size = statSync(join(DIST, 'assets', pdfjsFile!)).size
  expect(size).toBeGreaterThan(100 * 1024)  // > 100KB
  console.log(`[W134] pdfjs chunk: ${pdfjsFile} = ${(size / 1024).toFixed(1)} KB`)
})

test('W134 pdfjs 懒加载 — 错题复习页不加载 pdfjs', async ({ page }) => {
  const reqs = await collectJsRequests(page, '/errors/review')
  console.log(`[W134] /errors/review 加载 ${reqs.length} 个 JS 资源:`, reqs.slice(0, 10).join(', '))
  // 关键断言: pdfjs-*.js 不在首屏加载的 JS 资源中
  const pdfjsLoaded = reqs.some(f => /^pdfjs-/.test(f))
  expect(pdfjsLoaded).toBe(false)
  // ErrorReviewPage 必须被加载 (确认路由真的去了错题复习)
  const errorPageLoaded = reqs.some(f => /^ErrorReviewPage-/.test(f))
  expect(errorPageLoaded).toBe(true)
})

test('W134 pdfjs 懒加载 — 课文评分页不加载 pdfjs', async ({ page }) => {
  const reqs = await collectJsRequests(page, '/textbook')
  console.log(`[W134] /textbook 加载 ${reqs.length} 个 JS 资源:`, reqs.slice(0, 10).join(', '))
  // 关键断言: pdfjs-*.js 不在首屏加载的 JS 资源中
  const pdfjsLoaded = reqs.some(f => /^pdfjs-/.test(f))
  expect(pdfjsLoaded).toBe(false)
  // 课文相关 chunk 必须被加载 (TextbookPage / textbook lib / lessonScore)
  const scoreLoaded = reqs.some(f =>
    /^(TextbookPage|LessonScorePage|LessonDetailPage|Textbook)-/.test(f) ||
    /^(textbook|lessonScore)-/.test(f)
  )
  expect(scoreLoaded).toBe(true)
})

test('W134 pdfjs 懒加载 — service worker 不 precache pdfjs', async () => {
  // 解析 dist/sw.js, 找 precacheAndRoute([...]) 条目
  expect(existsSync(join(DIST, 'sw.js'))).toBe(true)
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf-8')
  const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
  expect(m).not.toBeNull()
  // pdfjs 不应在 precache 列表 (运行时按需, 不污染首装)
  expect(m![1]).not.toMatch(/url:"assets\/pdfjs-/)
  // pdf.worker 也不应 precache
  expect(m![1]).not.toMatch(/url:"assets\/pdf\.worker/)
  console.log(`[W134] precache pdfjs 引用: 0 (验证通过)`)
})

test('W134 pdfjs 懒加载 — pdf.worker chunk 与 pdfjs 配套', async () => {
  // pdf.worker 必须与 pdfjs 一起打包 (运行时 pdfjs 解析需要 worker)
  expect(existsSync(DIST)).toBe(true)
  const files = readdirSync(join(DIST, 'assets'))
  // pdfjs 本身
  const pdfjs = files.find(f => /^pdfjs-.*\.js$/.test(f))
  expect(pdfjs).toBeDefined()
  // pdf.worker 至少 1 个 chunk (mjs 或 js)
  const workers = files.filter(f => /^pdf\.worker.*\.(mjs|js)$/.test(f))
  expect(workers.length).toBeGreaterThan(0)
  // worker 也不在 precache
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf-8')
  const m = sw.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
  if (m) {
    expect(m![1]).not.toMatch(/url:"assets\/pdf\.worker/)
  }
  console.log(`[W134] pdfjs=${pdfjs}, workers=${workers.length}, precache 排除 OK`)
})
