# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional.spec.ts >> W99 业务 关键 路径 测 >> 跟读 加载 (W85 新)
- Location: e2e/functional.spec.ts:83:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_RESET at https://lingoo12138.github.io/english-app/follow-read
Call log:
  - navigating to "https://lingoo12138.github.io/english-app/follow-read", waiting until "domcontentloaded"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]: The connection was reset.
    - generic [ref=e9]:
      - paragraph [ref=e10]: "Try:"
      - list [ref=e11]:
        - listitem [ref=e12]: Checking the connection
        - listitem [ref=e13]:
          - link "Checking the proxy and the firewall" [ref=e14] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e15]: ERR_CONNECTION_RESET
  - generic [ref=e16]:
    - button "Reload" [ref=e18] [cursor=pointer]
    - button "Details" [ref=e19] [cursor=pointer]
```

# Test source

```ts
  1  | // e2e/functional.spec.ts - 业务 关键 路径 测 (W99)
  2  | import { test, expect } from '@playwright/test'
  3  | 
  4  | test.describe('W99 业务 关键 路径 测', () => {
  5  |   test('主 业务 流: 主页 → 词库 → 词详情', async ({ page }) => {
  6  |     let loaded = false
  7  |     for (let i = 0; i < 3 && !loaded; i++) {
  8  |       try { await page.goto('https://lingoo12138.github.io/english-app/', { waitUntil: 'domcontentloaded', timeout: 20000 }); loaded = true }
  9  |       catch { await page.waitForTimeout(2000) }
  10 |     }
  11 |     expect(loaded).toBe(true)
  12 |     await page.waitForTimeout(5000)
  13 |     const home = await page.textContent('body')
  14 |     expect(home).toContain('句刻')
  15 | 
  16 |     // 业务: 主页 跳 词库
  17 |     await page.goto('https://lingoo12138.github.io/english-app/words', { waitUntil: 'domcontentloaded' })
  18 |     await page.waitForTimeout(5000)
  19 |     const words = await page.textContent('body')
  20 |     expect(words).toMatch(/词|单/)
  21 | 
  22 |     // 业务: 找 1 词 链接
  23 |     const linkCount = await page.locator('a[href*="/words/"]').count()
  24 |     expect(linkCount).toBeGreaterThan(0)
  25 |   })
  26 | 
  27 |   test('课文 流: 课文列表 → 课文详情 → 评分', async ({ page }) => {
  28 |     await page.goto('https://lingoo12138.github.io/english-app/textbook', { waitUntil: 'domcontentloaded' })
  29 |     await page.waitForTimeout(5000)
  30 |     const body = await page.textContent('body')
  31 |     expect(body).toContain('课文')
  32 |     // 业务: 应 至少 1 课文
  33 |     const lessonLinks = await page.locator('a[href*="/textbook/"]').count()
  34 |     expect(lessonLinks).toBeGreaterThan(0)
  35 |   })
  36 | 
  37 |   test('设置 加载 + 入口', async ({ page }) => {
  38 |     await page.goto('https://lingoo12138.github.io/english-app/settings', { waitUntil: 'domcontentloaded' })
  39 |     await page.waitForTimeout(5000)
  40 |     const body = await page.textContent('body')
  41 |     expect(body).toContain('设置')
  42 |   })
  43 | 
  44 |   test('AI 对话 加载', async ({ page }) => {
  45 |     await page.goto('https://lingoo12138.github.io/english-app/ai-chat', { waitUntil: 'domcontentloaded' })
  46 |     await page.waitForTimeout(5000)
  47 |     const body = await page.textContent('body')
  48 |     expect(body).toContain('AI')
  49 |   })
  50 | 
  51 |   test('学习计划 加载', async ({ page }) => {
  52 |     await page.goto('https://lingoo12138.github.io/english-app/plan', { waitUntil: 'domcontentloaded' })
  53 |     await page.waitForTimeout(5000)
  54 |     const body = await page.textContent('body')
  55 |     expect(body).toMatch(/计划|学习/)
  56 |   })
  57 | 
  58 |   test('释义收藏 加载 + 跨词 模式 toggle', async ({ page }) => {
  59 |     await page.goto('https://lingoo12138.github.io/english-app/translation-favs', { waitUntil: 'domcontentloaded' })
  60 |     await page.waitForTimeout(5000)
  61 |     const body = await page.textContent('body')
  62 |     expect(body).toContain('收藏')
  63 |     // 业务: 应 有 全词库 checkbox (W98 新)
  64 |     const cb = await page.locator('text=全词库').count()
  65 |     expect(cb).toBeGreaterThan(0)
  66 |   })
  67 | 
  68 |   test('课文评分 加载 (W97 新)', async ({ page }) => {
  69 |     await page.goto('https://lingoo12138.github.io/english-app/textbook/score', { waitUntil: 'domcontentloaded' })
  70 |     await page.waitForTimeout(8000)  // IDB 慢
  71 |     const body = await page.textContent('body')
  72 |     // 业务: 评分 屏 渲染
  73 |     expect(body).toMatch(/评分|课文|掌握/)
  74 |   })
  75 | 
  76 |   test('错题复习 加载 (W87 新)', async ({ page }) => {
  77 |     await page.goto('https://lingoo12138.github.io/english-app/error-review', { waitUntil: 'domcontentloaded' })
  78 |     await page.waitForTimeout(8000)
  79 |     const body = await page.textContent('body')
  80 |     expect(body).toMatch(/错题|复习/)
  81 |   })
  82 | 
  83 |   test('跟读 加载 (W85 新)', async ({ page }) => {
> 84 |     await page.goto('https://lingoo12138.github.io/english-app/follow-read', { waitUntil: 'domcontentloaded' })
     |                ^ Error: page.goto: net::ERR_CONNECTION_RESET at https://lingoo12138.github.io/english-app/follow-read
  85 |     await page.waitForTimeout(5000)
  86 |     const body = await page.textContent('body')
  87 |     expect(body).toMatch(/跟读|读|音/)
  88 |   })
  89 | 
  90 |   test('拼写 加载', async ({ page }) => {
  91 |     await page.goto('https://lingoo12138.github.io/english-app/spelling', { waitUntil: 'domcontentloaded' })
  92 |     await page.waitForTimeout(5000)
  93 |     const body = await page.textContent('body')
  94 |     expect(body).toMatch(/拼写|单词|拼/)
  95 |   })
  96 | })
  97 | 
```