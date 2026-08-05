# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional.spec.ts >> W99 业务 关键 路径 测 >> 主 业务 流: 主页 → 词库 → 词详情
- Location: e2e/functional.spec.ts:5:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /词|单/
Received string:  "
    加载中...····
"
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "跳到主内容" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - complementary [ref=f1e5]:
    - generic [ref=f1e6]:
      - heading "句刻" [level=1] [ref=f1e7]
      - paragraph [ref=f1e8]: 即时英语学习
    - navigation [ref=f1e9]:
      - link "🏠 首页" [ref=f1e10] [cursor=pointer]:
        - /url: /english-app
        - generic [ref=f1e11]: 🏠
        - generic [ref=f1e12]: 首页
      - link "📚 词库" [ref=f1e13] [cursor=pointer]:
        - /url: /english-app/words
        - generic [ref=f1e14]: 📚
        - generic [ref=f1e15]: 词库
      - link "🎬 场景课" [ref=f1e16] [cursor=pointer]:
        - /url: /english-app/scenes
        - generic [ref=f1e17]: 🎬
        - generic [ref=f1e18]: 场景课
      - link "✨ 每日一句" [ref=f1e19] [cursor=pointer]:
        - /url: /english-app/daily
        - generic [ref=f1e20]: ✨
        - generic [ref=f1e21]: 每日一句
      - link "💬 AI" [ref=f1e22] [cursor=pointer]:
        - /url: /english-app/chat
        - generic [ref=f1e23]: 💬
        - generic [ref=f1e24]: AI
      - link "📅 计划" [ref=f1e25] [cursor=pointer]:
        - /url: /english-app/plan
        - generic [ref=f1e26]: 📅
        - generic [ref=f1e27]: 计划
      - link "✍️ 写作" [ref=f1e28] [cursor=pointer]:
        - /url: /english-app/write
        - generic [ref=f1e29]: ✍️
        - generic [ref=f1e30]: 写作
      - link "📕 错题" [ref=f1e31] [cursor=pointer]:
        - /url: /english-app/errors
        - generic [ref=f1e32]: 📕
        - generic [ref=f1e33]: 错题
      - link "📊 错题统计" [ref=f1e34] [cursor=pointer]:
        - /url: /english-app/errors/history
        - generic [ref=f1e35]: 📊
        - generic [ref=f1e36]: 错题统计
      - link "🎧 听力" [ref=f1e37] [cursor=pointer]:
        - /url: /english-app/listen
        - generic [ref=f1e38]: 🎧
        - generic [ref=f1e39]: 听力
      - link "📊 报告" [ref=f1e40] [cursor=pointer]:
        - /url: /english-app/report
        - generic [ref=f1e41]: 📊
        - generic [ref=f1e42]: 报告
      - link "🔤 翻译" [ref=f1e43] [cursor=pointer]:
        - /url: /english-app/translate
        - generic [ref=f1e44]: 🔤
        - generic [ref=f1e45]: 翻译
      - link "⭐ 生词本" [ref=f1e46] [cursor=pointer]:
        - /url: /english-app/notebook
        - generic [ref=f1e47]: ⭐
        - generic [ref=f1e48]: 生词本
      - link "📖 课文" [ref=f1e49] [cursor=pointer]:
        - /url: /english-app/textbook
        - generic [ref=f1e50]: 📖
        - generic [ref=f1e51]: 课文
      - link "✏️ 填空" [ref=f1e52] [cursor=pointer]:
        - /url: /english-app/fill-blank
        - generic [ref=f1e53]: ✏️
        - generic [ref=f1e54]: 填空
      - link "🎧 听写" [ref=f1e55] [cursor=pointer]:
        - /url: /english-app/dictation
        - generic [ref=f1e56]: 🎧
        - generic [ref=f1e57]: 听写
      - link "✏️ 拼写" [ref=f1e58] [cursor=pointer]:
        - /url: /english-app/spelling
        - generic [ref=f1e59]: ✏️
        - generic [ref=f1e60]: 拼写
      - link "⭐ 释义收藏" [ref=f1e61] [cursor=pointer]:
        - /url: /english-app/translation-favs
        - generic [ref=f1e62]: ⭐
        - generic [ref=f1e63]: 释义收藏
      - link "📊 跟读趋势" [ref=f1e64] [cursor=pointer]:
        - /url: /english-app/follow-read/progress
        - generic [ref=f1e65]: 📊
        - generic [ref=f1e66]: 跟读趋势
      - link "🏆 成就" [ref=f1e67] [cursor=pointer]:
        - /url: /english-app/achievements
        - generic [ref=f1e68]: 🏆
        - generic [ref=f1e69]: 成就
      - link "⚙️ 设置" [ref=f1e70] [cursor=pointer]:
        - /url: /english-app/settings
        - generic [ref=f1e71]: ⚙️
        - generic [ref=f1e72]: 设置
      - link "📚 文档" [ref=f1e73] [cursor=pointer]:
        - /url: /english-app/docs
        - generic [ref=f1e74]: 📚
        - generic [ref=f1e75]: 文档
  - main [ref=f1e76]:
    - generic [ref=f1e78]:
      - generic [ref=f1e79]:
        - heading "词库" [level=1] [ref=f1e80]
        - paragraph [ref=f1e81]: 加载中...
      - textbox "搜索单词或中文..." [ref=f1e82]
      - generic [ref=f1e83]:
        - button "全部" [ref=f1e84] [cursor=pointer]
        - button "小学" [ref=f1e85] [cursor=pointer]
        - button "初中" [ref=f1e86] [cursor=pointer]
        - button "高中" [ref=f1e87] [cursor=pointer]
        - button "高考" [ref=f1e88] [cursor=pointer]
        - button "CET-4" [ref=f1e89] [cursor=pointer]
        - button "CET-6" [ref=f1e90] [cursor=pointer]
        - button "考研" [ref=f1e91] [cursor=pointer]
        - button "日常" [ref=f1e92] [cursor=pointer]
      - generic [ref=f1e93]: 加载中...
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
> 20 |     expect(words).toMatch(/词|单/)
     |                   ^ Error: expect(received).toMatch(expected)
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
  84 |     await page.goto('https://lingoo12138.github.io/english-app/follow-read', { waitUntil: 'domcontentloaded' })
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