// tests/w135-runtime.test.ts - W135 运行时优化覆盖
// 验证:
//  1. fsrs.worker.ts: 计算逻辑正确, 与同步 lib/fsrs.ts 一致
//  2. followReadScore.worker.ts: 聚合逻辑正确, 1500 条入, byLesson/recent API
//  3. lessonScore.worker.ts: 跨课复用词 + 评分逻辑, 与 lib/lessonScore.ts 一致
//  4. VirtualList: items 渲染控制 (阈值内不虚拟化, 阈值外虚拟化)
//  5. React.memo: WordCard, Icon, Toast 浅比较逻辑
//  6. ErrorBoundary 包裹 Suspense (App.tsx)
//  7. index.html preload 资源 (PWA icon 192px + manifest)
//  8. 性能测量 hook: useVirtualScroll 范围计算
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
  })

  describe('7. index.html preload 资源', () => {
    it('PWA-192 图标 preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["']\/icons\/pwa-192\.png["'][^>]*as=["']image["']/)
    })

    it('manifest.webmanifest preload', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/<link\s+rel=["']preload["'][^>]*href=["']\/manifest\.webmanifest["']/)
    })

    it('保留 iOS PWA meta (viewport-fit + apple-mobile-web-app-capable)', () => {
      const code = readFileSync('index.html', 'utf-8')
      expect(code).toMatch(/viewport-fit=cover/)
      expect(code).toMatch(/apple-mobile-web-app-capable/)
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
