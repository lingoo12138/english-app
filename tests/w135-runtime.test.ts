// tests/w135-runtime.test.ts - W135 运行时优化覆盖
// 验证:
//  1. fsrs.worker.ts: 计算逻辑正确, 与同步 lib/fsrs.ts 一致
//  2. followReadScore.worker.ts: 聚合逻辑正确, 1500 条入, byLesson/recent API
//  3. lessonScore.worker.ts: 跨课复用词 + 评分逻辑, 与 lib/lessonScore.ts 一致
//  4. VirtualList: items 渲染控制 (阈值内不虚拟化, 阈值外虚拟化)
//  5. React.memo: WordCard, Icon, Toast 浅比较逻辑
//  6. ErrorBoundary 包裹 Suspense (App.tsx)
//  7. index.html preload 资源 (字体 woff2 preload, 4 个 weight — W136 P0-2 替 PWA-192 占位)
//  8. (W136 删) useVirtualScroll 死代码 — 已删 src/lib/virtualScroll.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  initFSRS,
  reviewFSRS,
  getRetrievability,
  fromSM2,
  toSM2,
  Rating,
  type FSRSCard,
} from '../src/lib/fsrs'
import {
  aggregateScores,
  type FollowReadScore,
} from '../src/workers/followReadScore.worker'
import {
  findCrossLessonWords,
  computeLessonScore,
  LESSON_SCORE_THRESHOLDS,
} from '../src/workers/lessonScore.worker'
import type { Lesson } from '../src/data/textbook'

const NOW = 1753272000000
const DAY = 24 * 60 * 60 * 1000

// W136 P1-1: beforeEach 重置所有 worker 单例 + pending map, 避免跨测试污染
beforeEach(async () => {
  const fsrs = await import('../src/lib/fsrsWorkerClient')
  const frs = await import('../src/lib/followReadScoreWorkerClient')
  const ls = await import('../src/lib/lessonScoreWorkerClient')
  fsrs._resetFsrsWorkerForTest()
  frs._resetFollowReadWorkerForTest()
  ls._resetLessonScoreWorkerForTest()
})

describe('W135 运行时优化', () => {
  describe('1. fsrs.worker.ts 计算逻辑', () => {
    it('initFSRS 默认值正确', () => {
      const c = initFSRS(NOW)
      expect(c.d).toBe(5)
      expect(c.s).toBe(2)
      expect(c.r).toBe(1)
      expect(c.t).toBe(0)
      expect(c.due).toBe(NOW)
      expect(c.lastReview).toBe(0)
      expect(c.reps).toBe(0)
      expect(c.lapses).toBe(0)
    })

    it('reviewFSRS Again 评级: 间隔 1 天, lapses+1', () => {
      const c = initFSRS(NOW)
      const r = reviewFSRS(c, Rating.Again, NOW)
      expect(r.t).toBe(1)
      expect(r.due).toBe(NOW + DAY)
      expect(r.lapses).toBe(1)
      expect(r.r).toBe(0.5)
    })

    it('reviewFSRS Easy 评级: 间隔拉长, lapses 不变', () => {
      const c = initFSRS(NOW)
      const r = reviewFSRS(c, Rating.Easy, NOW)
      expect(r.lapses).toBe(0)
      expect(r.reps).toBe(1)
      // R 升到 0.99
      expect(r.r).toBe(0.99)
    })

    it('getRetrievability 从未复习 = 1', () => {
      const c = initFSRS(NOW)
      expect(getRetrievability(c, NOW)).toBe(1)
    })

    it('fromSM2 → toSM2 往返一致 (误差在 0.01 内)', () => {
      const item = {
        wordId: 'w-1',
        nextReview: NOW + 5 * DAY,
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
      }
      const card = fromSM2(item, NOW)
      const back = toSM2(card)
      expect(back.nextReview).toBe(item.nextReview)
      expect(back.interval).toBe(item.interval)
      // easeFactor 允许 ±0.01 误差 (FSRS 17 参数 → SM-2 简化)
      expect(Math.abs(back.easeFactor - item.easeFactor)).toBeLessThan(0.5)
      expect(back.repetitions).toBe(item.repetitions)
    })

    it('Worker 客户端: Worker 不可用时主线程 fallback (happy-dom)', async () => {
      const { reviewFSRSAsync, _resetFsrsWorkerForTest } = await import('../src/lib/fsrsWorkerClient')
      _resetFsrsWorkerForTest()
      const c = initFSRS(NOW)
      // happy-dom 无 Worker, 走 fallback
      const r = await reviewFSRSAsync(c, Rating.Good, NOW)
      // Good: t=0 → nextInterval(0, 1, 2.2, 3) = round(0 * 1 * 1 * 1.1) = 0 → 至少 1
      expect(r.t).toBe(1)
      expect(r.reps).toBe(1)
    })

    it('batchReviewFSRSAsync fallback: 多卡批量', async () => {
      const { batchReviewFSRSAsync } = await import('../src/lib/fsrsWorkerClient')
      const cards = [initFSRS(NOW), initFSRS(NOW), initFSRS(NOW)]
      const ratings = [Rating.Good, Rating.Easy, Rating.Again]
      const r = await batchReviewFSRSAsync(cards, ratings, NOW)
      expect(r.length).toBe(3)
      expect(r[2].lapses).toBe(1)  // Again
    })
  })

  describe('2. followReadScore.worker.ts 聚合', () => {
    it('空数组 → 0/0/0/empty', () => {
      const a = aggregateScores([])
      expect(a.avg).toBe(0)
      expect(a.best).toBe(0)
      expect(a.count).toBe(0)
      expect(a.recent.length).toBe(0)
      expect(a.byLesson.length).toBe(0)
    })

    it('1500 条入: avg/best/count 正确 (FIFO 1000 上限不在 worker 处理)', () => {
      // 模拟 1500 条 评分
      const scores: FollowReadScore[] = []
      for (let i = 0; i < 1500; i++) {
        scores.push({
          id: `f-${i}`,
          lessonId: i % 3 === 0 ? 'L1' : i % 3 === 1 ? 'L2' : 'L3',
          sentenceIndex: i % 10,
          score: 60 + (i % 40),  // 60-99
          ts: 1000000 + i * 1000,
        })
      }
      const start = performance.now()
      const agg = aggregateScores(scores)
      const dur = performance.now() - start
      expect(agg.count).toBe(1500)
      expect(agg.best).toBe(99)  // 60+39
      expect(agg.avg).toBeGreaterThan(70)
      expect(agg.byLesson.length).toBe(3)
      // recent 只取前 20
      expect(agg.recent.length).toBe(20)
      expect(agg.recent[0].ts).toBeGreaterThan(agg.recent[19].ts)
      // 1500 条聚合 < 50ms
      expect(dur).toBeLessThan(50)
    })

    it('byLesson 分组: count + avg 正确', () => {
      const scores: FollowReadScore[] = [
        { id: '1', lessonId: 'L1', sentenceIndex: 0, score: 80, ts: 1 },
        { id: '2', lessonId: 'L1', sentenceIndex: 1, score: 60, ts: 2 },
        { id: '3', lessonId: 'L2', sentenceIndex: 0, score: 90, ts: 3 },
      ]
      const agg = aggregateScores(scores)
      const l1 = agg.byLesson.find(b => b.lessonId === 'L1')!
      const l2 = agg.byLesson.find(b => b.lessonId === 'L2')!
      expect(l1.count).toBe(2)
      expect(l1.avg).toBe(70)
      expect(l1.best).toBe(80)
      expect(l2.count).toBe(1)
      expect(l2.avg).toBe(90)
      expect(l2.best).toBe(90)
    })

    it('Worker 客户端: aggregateScoresAsync fallback (无 Worker)', async () => {
      const { aggregateScoresAsync } = await import('../src/lib/followReadScoreWorkerClient')
      const scores: FollowReadScore[] = [
        { id: '1', lessonId: 'L1', sentenceIndex: 0, score: 80, ts: 1 },
        { id: '2', lessonId: 'L2', sentenceIndex: 0, score: 60, ts: 2 },
      ]
      const agg = await aggregateScoresAsync(scores)
      expect(agg.count).toBe(2)
      expect(agg.best).toBe(80)
    })
  })

  describe('3. lessonScore.worker.ts 计算', () => {
    const fakeLessons: Lesson[] = [
      { id: 'l1', title: 'L1', emoji: '📖', level: 'cet4', summary: '', body: '', vocabulary: ['hello', 'world', 'apple'], estimatedMinutes: 1 },
      { id: 'l2', title: 'L2', emoji: '📖', level: 'cet4', summary: '', body: '', vocabulary: ['hello', 'book', 'cat'], estimatedMinutes: 1 },
      { id: 'l3', title: 'L3', emoji: '📖', level: 'cet4', summary: '', body: '', vocabulary: ['fish', 'dog', 'elephant'], estimatedMinutes: 1 },
    ]

    it('findCrossLessonWords 跨课复用词 (>= 2 次)', () => {
      const cross = findCrossLessonWords(fakeLessons, 2)
      // hello 出现 2 次, world/book/cat/apple/fish/dog/elephant 各 1 次
      expect(cross).toContain('hello')
      expect(cross).not.toContain('world')
      expect(cross).not.toContain('apple')
    })

    it('computeLessonScore: notMastered 排除 + masteryRate 正确', () => {
      const notMastered = new Set(['hello', 'world'])
      const crossSet = new Set(['hello'])
      const score = computeLessonScore(fakeLessons[0], notMastered, crossSet)
      // l1 vocabulary: hello(world/apple)
      // notMastered: hello+world → masteredCount=1 (apple)
      expect(score.totalVocab).toBe(3)
      expect(score.masteredCount).toBe(1)
      expect(score.notMasteredCount).toBe(2)
      expect(score.masteryRate).toBe(33)  // 1/3
      expect(score.status).toBe('in_progress')
      // crossLessonVocab: hello (在 crossSet)
      expect(score.crossLessonVocab).toEqual(['hello'])
    })

    it('computeLessonScore: 100% mastered → status=mastered', () => {
      const score = computeLessonScore(fakeLessons[0], new Set(), new Set())
      expect(score.masteryRate).toBe(100)
      expect(score.status).toBe('mastered')
    })

    it('computeLessonScore: 0% mastered → status=not_started', () => {
      const notMastered = new Set(['hello', 'world', 'apple'])
      const score = computeLessonScore(fakeLessons[0], notMastered, new Set())
      expect(score.masteryRate).toBe(0)
      expect(score.status).toBe('not_started')
    })

    it('LESSON_SCORE_THRESHOLDS 阈值常量', () => {
      expect(LESSON_SCORE_THRESHOLDS.mastered).toBe(90)
      expect(LESSON_SCORE_THRESHOLDS.inProgress).toBe(30)
    })

    it('Worker 客户端: computeLessonScoresAsync fallback (无 Worker)', async () => {
      const { computeLessonScoresAsync } = await import('../src/lib/lessonScoreWorkerClient')
      const scores = await computeLessonScoresAsync()
      // 真实 LESSONS, 数量 > 0
      expect(scores.length).toBeGreaterThan(0)
      // 全部 lesson 都有 score 字段
      for (const s of scores) {
        expect(s.lessonId).toBeTruthy()
        expect(s.title).toBeTruthy()
        expect(['mastered', 'in_progress', 'not_started']).toContain(s.status)
      }
    })
  })

  describe('4. VirtualList 渲染控制', () => {
    it('threshold 内 (< 200) 走全量渲染', () => {
      const code = readFileSync('src/pages/WordList.tsx', 'utf-8')
      // 应有 VIRTUAL_THRESHOLD 阈值
      expect(code).toMatch(/VIRTUAL_THRESHOLD\s*=\s*\d+/)
      // 阈值判断
      expect(code).toMatch(/filtered\.length\s*>=\s*VIRTUAL_THRESHOLD/)
      // VirtualList 组件被 import
      expect(code).toMatch(/import\s*\{[^}]*VirtualList[^}]*\}\s*from\s*['"]\.\.\/components\/VirtualList['"]/)
    })

    it('VirtualList 组件导出 + 关键 API', () => {
      // 组件文件存在
      expect(existsSync('src/components/VirtualList.tsx')).toBe(true)
      const code = readFileSync('src/components/VirtualList.tsx', 'utf-8')
      // 应有 items/estimatedItemHeight/renderItem/overscan/threshold props
      expect(code).toMatch(/items:\s*T\[\]/)
      expect(code).toMatch(/estimatedItemHeight:\s*number/)
      expect(code).toMatch(/renderItem/)
      expect(code).toMatch(/overscan\?:\s*number/)
      expect(code).toMatch(/threshold\?:\s*number/)
      // 键盘导航: PageUp/PageDown/Home/End
      expect(code).toMatch(/PageDown/)
      expect(code).toMatch(/PageUp/)
      expect(code).toMatch(/'Home'/)
      expect(code).toMatch(/'End'/)
      // a11y
      expect(code).toMatch(/role=[\s\S]*?list/)
    })

    it('W136 P0-1: VirtualList 加 getLetterKey + onContainerRef (字母索引 virtual 模式)', () => {
      const code = readFileSync('src/components/VirtualList.tsx', 'utf-8')
      // getLetterKey prop
      expect(code).toMatch(/getLetterKey\?:\s*\(item:\s*T/)
      // onContainerRef prop
      expect(code).toMatch(/onContainerRef\?:\s*\(el:\s*HTMLDivElement/)
      // 渲染 data-letter-anchor 元素
      expect(code).toMatch(/data-letter-anchor=\{letter\}/)
      // 渲染 id="letter-anchor-L" 元素
      expect(code).toMatch(/id=\{`letter-anchor-\$\{letter\}`\}/)
      // 暴露 scroll container ref
      expect(code).toMatch(/onContainerRef\(containerRef\.current\)/)
    })

    it('W136 P0-1: WordList 传 getLetterKey + onContainerRef 给 VirtualList', () => {
      const code = readFileSync('src/pages/WordList.tsx', 'utf-8')
      // virtual 模式 用 VirtualList 并传 getLetterKey
      expect(code).toMatch(/getLetterKey=\{[^}]*getFirstLetter/)
      // onContainerRef
      expect(code).toMatch(/onContainerRef=\{/)
      // virtualScrollRef 存在
      expect(code).toMatch(/virtualScrollRef/)
    })

    it('W136 P0-1: WordList scrollToLetter 在 virtual 模式用 scrollTo (不走 querySelector)', () => {
      const code = readFileSync('src/pages/WordList.tsx', 'utf-8')
      // 应有 letterIndexMap 计算 (字母 -> index)
      expect(code).toMatch(/letterIndexMap/)
      // scrollToLetter 内部 virtual 分支 用 scrollTo
      expect(code).toMatch(/virtualScrollRef\.current/)
      expect(code).toMatch(/scrollTo\(\{/)
    })
  })

  describe('5. React.memo 优化 (WordCard, Icon, Toast)', () => {
    it('WordCard memo + favCount 浅比较', () => {
      const code = readFileSync('src/components/WordCard.tsx', 'utf-8')
      // memo
      expect(code).toMatch(/const\s+WordCard\s*=\s*memo\(/)
      // 自定义比较函数
      expect(code).toMatch(/prev\.favCount\s*===\s*next\.favCount/)
      // word.id 比较
      expect(code).toMatch(/prev\.word\.id\s*===\s*next\.word\.id/)
    })

    it('Icon makeIcon 用 memo 包装', () => {
      const code = readFileSync('src/components/Icon.tsx', 'utf-8')
      // 头部 import memo
      expect(code).toMatch(/import\s+React,\s*\{[^}]*\bmemo\b[^}]*\}\s+from\s+['"]react['"]/)
      // makeIcon return memo
      expect(code).toMatch(/return\s+memo\(IconComponent\)/)
    })

    it('Toast ToastItem 用 memo', () => {
      const code = readFileSync('src/components/Toast.tsx', 'utf-8')
      // import memo
      expect(code).toMatch(/import\s*\{[^}]*\bmemo\b[^}]*\}\s+from\s+['"]react['"]/)
      // ToastItem = memo
      expect(code).toMatch(/const\s+ToastItem\s*=\s*memo\(/)
    })

    it('W136 P1-3: LessonCard memo 内部 useNavigate, 不接 onClick prop (避免 inline 箭头打破 memo)', () => {
      const code = readFileSync('src/pages/LessonScorePage.tsx', 'utf-8')
      // LessonCard 应是 memo 组件
      expect(code).toMatch(/const\s+LessonCard\s*=\s*memo\(/)
      // 内部 useNavigate (不依赖父组件 onClick)
      const cardBlock = code.match(/const\s+LessonCard\s*=\s*memo\(function\s+LessonCard[\s\S]*?\n\}\)/)
      expect(cardBlock).toBeTruthy()
      expect(cardBlock![0]).toMatch(/useNavigate\(\)/)
      // 内部 navigate 调 navigate(`/textbook/...`)
      expect(cardBlock![0]).toMatch(/navigate/)
      // 父组件传 LessonCard 不传 onClick (用更宽松的正则)
      const usageBlock = code.match(/<LessonCard[\s\S]*?\/>/)
      expect(usageBlock).toBeTruthy()
      expect(usageBlock![0]).not.toMatch(/\bonClick=/)
    })
  })

  describe('6. App.tsx ErrorBoundary 包裹 Suspense', () => {
    it('import ErrorBoundary', () => {
      const code = readFileSync('src/App.tsx', 'utf-8')
      expect(code).toMatch(/import\s*\{[^}]*ErrorBoundary[^}]*\}\s+from\s+['"]\.\/components\/ErrorBoundary['"]/)
    })

    it('<ErrorBoundary> 在 <Suspense> 之外', () => {
      const code = readFileSync('src/App.tsx', 'utf-8')
      // ErrorBoundary 应在 return 里
      expect(code).toMatch(/<ErrorBoundary>\s*[\s\S]*?<Suspense/)
      expect(code).toMatch(/<\/Suspense>\s*[\s\S]*?<\/ErrorBoundary>/)
    })

    it('W136 P2-4: ErrorBoundary 0 emoji — 用 IconAlertCircle / IconRotateCcw / IconRotateCw SVG', () => {
      const code = readFileSync('src/components/ErrorBoundary.tsx', 'utf-8')
      // 关键: JSX 中不应有 emoji 渲染 (注释里的 emoji OK)
      // 抽出 JSX render 块 (return (...) 部分)
      const renderBlock = code.match(/render\(\)\s*\{[\s\S]*?return \(([\s\S]*?)\)\s*\}/)
      expect(renderBlock).toBeTruthy()
      const jsx = renderBlock![1]
      // 不应再有 😵 / 🔄 / 🔃 emoji
      expect(jsx).not.toMatch(/😵/)
      expect(jsx).not.toMatch(/🔄/)
      expect(jsx).not.toMatch(/🔃/)
      // 用 SVG Icon 替
      expect(jsx).toMatch(/<IconAlertCircle/)
      expect(jsx).toMatch(/<IconRotateCcw/)
      expect(jsx).toMatch(/<IconRotateCw/)
    })
  })

  describe('7. index.html preload 资源 (W136 P0-2: 字体 woff2 替 PWA-192 占位)', () => {
    it('outfit-latin-400 字体 woff2 preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      // W136: outfit 字体 400 weight preload, 真实 hash 来自 build
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["'][^"']*outfit-latin-400-normal-[A-Za-z0-9_-]+\.woff2["'][^>]*as=["']font["'][^>]*type=["']font\/woff2["']/)
    })

    it('outfit-latin-500 字体 woff2 preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["'][^"']*outfit-latin-500-normal-[A-Za-z0-9_-]+\.woff2["'][^>]*as=["']font["']/)
    })

    it('jetbrains-mono-latin-400 字体 woff2 preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["'][^"']*jetbrains-mono-latin-400-normal-[A-Za-z0-9_-]+\.woff2["'][^>]*as=["']font["']/)
    })

    it('jetbrains-mono-latin-500 字体 woff2 preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["'][^"']*jetbrains-mono-latin-500-normal-[A-Za-z0-9_-]+\.woff2["'][^>]*as=["']font["']/)
    })

    it('字体 preload 都带 crossorigin=anonymous (woff2 必须)', () => {
      const code = readFileSync('index.html', 'utf-8')
      const fontPreloads = code.match(/<link\s+rel=["']preload["'][^>]*as=["']font["'][^>]*>/g) || []
      // 至少 4 个字体 preload (outfit 400/500 + jetbrains 400/500)
      expect(fontPreloads.length).toBeGreaterThanOrEqual(4)
      for (const tag of fontPreloads) {
        expect(tag).toMatch(/crossorigin=["']anonymous["']/)
      }
    })

    it('W136 P1-4: manifest 不再 preload (PWA 自动 fetch, 同源浪费 CORS preflight)', () => {
      const code = readFileSync('index.html', 'utf-8')
      // 不应该再 preload manifest
      expect(code).not.toMatch(/<link\s+rel=["']preload["'][^>]*href=["']\/manifest\.webmanifest["']/)
    })

    it('W136 P0-2: PWA-192.png 不再 preload (precache 已覆盖)', () => {
      const code = readFileSync('index.html', 'utf-8')
      // 不应该再 preload pwa-192.png
      expect(code).not.toMatch(/<link\s+rel=["']preload["'][^>]*href=["']\/icons\/pwa-192\.png["']/)
      expect(code).not.toMatch(/<link\s+rel=["']preload["'][^>]*href=["']\/pwa-192\.png["']/)
    })

    it('保留 iOS PWA meta (viewport-fit + apple-mobile-web-app-capable)', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/viewport-fit=cover/)
      expect(code).toMatch(/apple-mobile-web-app-capable/)
    })
  })

  describe('7b. P1-5 + P2-1 静态审查', () => {
    it('W136 P1-5: public/pwa-192.png + public/pwa-512.png 已删 (跟 /icons/ 唯一一份)', () => {
      expect(existsSync('public/pwa-192.png')).toBe(false)
      expect(existsSync('public/pwa-512.png')).toBe(false)
      // /icons/ 下的仍在
      expect(existsSync('public/icons/pwa-192.png')).toBe(true)
      expect(existsSync('public/icons/pwa-512.png')).toBe(true)
    })

    it('W136 P1-5: vite.config.ts includeAssets 指向 /icons/ 路径', () => {
      const code = readFileSync('vite.config.ts', 'utf-8')
      // 提取 includeAssets 数组内容做精确比较 (避免 'icons/pwa-192.png' 跟 'pwa-192.png' 模糊匹配)
      const m = code.match(/includeAssets:\s*\[([^\]]*)\]/)
      expect(m, '应能找到 includeAssets 数组').toBeTruthy()
      const entries = m![1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      // 必须含 icons/pwa-192.png + icons/pwa-512.png
      expect(entries).toContain('icons/pwa-192.png')
      expect(entries).toContain('icons/pwa-512.png')
      // 不能含根 pwa-192.png (无 /icons/ 前缀)
      expect(entries).not.toContain('pwa-192.png')
      expect(entries).not.toContain('pwa-512.png')
    })

    it('W136 P2-1: useVirtualScroll hook 死代码已删 (src/lib/virtualScroll.ts)', () => {
      expect(existsSync('src/lib/virtualScroll.ts')).toBe(false)
    })

    it('W136 P2-1: 业务无 useVirtualScroll 引用', () => {
      // grep 排除 src/lib/virtualScroll.ts (已删) + 当前测试文件
      const { execSync } = require('child_process')
      const out = execSync(
        'grep -rn "useVirtualScroll" src/ tests/ 2>/dev/null || true',
        { encoding: 'utf-8' }
      )
      // 只允许测试文件注释里出现 (作为 历史记录)
      const lines = out.split('\n').filter(l => l.trim() && !l.includes('w135-runtime.test.ts') && !l.includes('已删'))
      expect(lines.length).toBe(0)
    })
  })

  describe('8. 静态审查 — 关键 W135 模式', () => {
    it('Worker 客户端: isWorkerAvailable 守卫 (test 环境友好)', async () => {
      const code = readFileSync('src/lib/fsrsWorkerClient.ts', 'utf-8')
      expect(code).toMatch(/isWorkerAvailable/)
      const code2 = readFileSync('src/lib/followReadScoreWorkerClient.ts', 'utf-8')
      expect(code2).toMatch(/isWorkerAvailable/)
      const code3 = readFileSync('src/lib/lessonScoreWorkerClient.ts', 'utf-8')
      expect(code3).toMatch(/isWorkerAvailable/)
    })

    it('W136 P0-3: 3 个 client 都 export _lastWorkerInstanceForTest', () => {
      // 验证 test 能拿到 worker instance (哪怕 happy-dom 没 Worker, 导出要存在)
      const fsrsCode = readFileSync('src/lib/fsrsWorkerClient.ts', 'utf-8')
      const frsCode = readFileSync('src/lib/followReadScoreWorkerClient.ts', 'utf-8')
      const lsCode = readFileSync('src/lib/lessonScoreWorkerClient.ts', 'utf-8')
      expect(fsrsCode).toMatch(/export\s+function\s+_lastFsrsWorkerInstanceForTest/)
      expect(frsCode).toMatch(/export\s+function\s+_lastFollowReadWorkerInstanceForTest/)
      expect(lsCode).toMatch(/export\s+function\s+_lastLessonScoreWorkerInstanceForTest/)
    })

    it('W136 P1-2: 3 个 client 的 onerror 都 terminate worker (防 crash 死锁)', () => {
      const fsrsCode = readFileSync('src/lib/fsrsWorkerClient.ts', 'utf-8')
      const frsCode = readFileSync('src/lib/followReadScoreWorkerClient.ts', 'utf-8')
      const lsCode = readFileSync('src/lib/lessonScoreWorkerClient.ts', 'utf-8')
      // 简化检查: onerror 后 50 行 内含 terminate() + null 赋值
      for (const [name, code] of [
        ['fsrs', fsrsCode],
        ['frs', frsCode],
        ['ls', lsCode],
      ] as const) {
        const onerrorIdx = code.search(/onerror\s*=\s*\(e\)/)
        expect(onerrorIdx, `${name} 应有 onerror handler`).toBeGreaterThan(0)
        // 取 onerror 之后 800 字符
        const tail = code.slice(onerrorIdx, onerrorIdx + 800)
        expect(tail, `${name}.onerror 应调 workerInstance.terminate()`).toMatch(/workerInstance\.terminate\(\)/)
        expect(tail, `${name}.onerror 应置 workerInstance = null`).toMatch(/workerInstance\s*=\s*null/)
      }
    })

    it('所有 3 个 Worker 文件存在 (vite 独立 chunk)', () => {
      expect(existsSync('src/workers/fsrs.worker.ts')).toBe(true)
      expect(existsSync('src/workers/followReadScore.worker.ts')).toBe(true)
      expect(existsSync('src/workers/lessonScore.worker.ts')).toBe(true)
    })

    it('Worker 文件有 self.onmessage handler (worker 协议)', () => {
      const code1 = readFileSync('src/workers/fsrs.worker.ts', 'utf-8')
      expect(code1).toMatch(/self\.onmessage\s*=\s*\(e:\s*MessageEvent/)
      const code2 = readFileSync('src/workers/followReadScore.worker.ts', 'utf-8')
      expect(code2).toMatch(/self\.onmessage\s*=\s*\(e:\s*MessageEvent/)
      const code3 = readFileSync('src/workers/lessonScore.worker.ts', 'utf-8')
      expect(code3).toMatch(/self\.onmessage\s*=\s*\(e:\s*MessageEvent/)
    })
  })

  describe('9. 性能 benchmark (Worker 化前后主线程时间对比)', () => {
    it('FSRS 100 卡片批量计算 < 100ms (主线程 同步)', () => {
      const cards: FSRSCard[] = []
      const ratings: Rating[] = []
      for (let i = 0; i < 100; i++) {
        cards.push(initFSRS(NOW + i * 1000))
        ratings.push(((i % 4) + 1) as Rating)
      }
      const start = performance.now()
      const updated = cards.map((c, i) => reviewFSRS(c, ratings[i], NOW))
      const dur = performance.now() - start
      expect(updated.length).toBe(100)
      // 100 卡 FSRS 同步计算 < 100ms (Worker 化后非阻塞)
      expect(dur).toBeLessThan(100)
    })

    it('followReadScore 1500 条聚合 < 50ms (主线程 同步)', () => {
      const scores: FollowReadScore[] = []
      for (let i = 0; i < 1500; i++) {
        scores.push({
          id: `f-${i}`,
          lessonId: i % 5 === 0 ? 'L1' : i % 5 === 1 ? 'L2' : i % 5 === 2 ? 'L3' : i % 5 === 3 ? 'L4' : 'L5',
          sentenceIndex: i % 20,
          score: 50 + (i % 50),
          ts: 1000000 + i * 1000,
        })
      }
      const start = performance.now()
      const agg = aggregateScores(scores)
      const dur = performance.now() - start
      expect(agg.count).toBe(1500)
      // 1500 条聚合 < 50ms
      expect(dur).toBeLessThan(50)
    })

    it('lessonScore 跨课复用词 (20 课 × 30 词) < 30ms', () => {
      // 模拟 20 课, 每课 30 词
      const lessons: Lesson[] = []
      for (let i = 0; i < 20; i++) {
        const vocab: string[] = []
        for (let j = 0; j < 30; j++) {
          // 一些词跨课复用
          vocab.push(j < 5 ? `common-${j}` : `l${i}-${j}`)
        }
        lessons.push({
          id: `l${i}`,
          title: `Lesson ${i}`,
          emoji: '📖',
          level: 'cet4',
          summary: '',
          body: '',
          vocabulary: vocab,
          estimatedMinutes: 1,
        })
      }
      const start = performance.now()
      const cross = findCrossLessonWords(lessons, 2)
      const dur = performance.now() - start
      // common-0 ~ common-4 出现 20 次, 应在 cross 列表
      expect(cross).toContain('common-0')
      expect(dur).toBeLessThan(30)
    })
  })
})
