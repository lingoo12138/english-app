// tests/textbook.test.ts - v1.85.0 课文 (Textbook)
// 7 单元测试覆盖 getAllLessons / getLessonById / getLessonVocabWords / findVocabInBody / lesson favorite helpers
import { describe, it, expect } from 'vitest'
import {
  getAllLessons,
  getLessonById,
  getLessonVocabWords,
  findVocabInBody,
  getLessonFavoriteId,
  getLessonIdFromFavorite,
  calcReadingProgress,
} from '../src/lib/textbook'
import type { Word } from '../src/types'
import { LESSONS } from '../src/data/textbook'

// 构造测试用的 Word 字典
function makeWord(id: string, w: string): Word {
  return {
    id,
    word: w,
    phonetic: `/test/`,
    pos: ['n.'],
    translations: [`测试-${w}`],
    examples: [],
    tags: ['CET4'],
    level: 'cet4',
    difficulty: 1,
    frequency: 1,
  }
}

describe('textbook lib', () => {
  describe('getAllLessons', () => {
    it('应返回 10+ 篇课文 (v1.85 5 篇 + v1.87 P2 7 篇)', () => {
      const lessons = getAllLessons()
      expect(lessons.length).toBeGreaterThanOrEqual(10)
    })

    it('每篇课文都应有 id / title / body / vocabulary / level', () => {
      for (const l of getAllLessons()) {
        expect(l.id).toBeTruthy()
        expect(l.title).toBeTruthy()
        expect(l.body.length).toBeGreaterThan(0)
        expect(Array.isArray(l.vocabulary)).toBe(true)
        expect(l.vocabulary.length).toBeGreaterThanOrEqual(5)
        expect(l.vocabulary.length).toBeLessThanOrEqual(12)
        expect(['primary', 'junior', 'senior', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'daily']).toContain(l.level)
      }
    })

    it('每篇 body 词数应在 80-150 之间', () => {
      for (const l of getAllLessons()) {
        const wc = l.body.trim().split(/\s+/).length
        expect(wc).toBeGreaterThanOrEqual(80)
        expect(wc).toBeLessThanOrEqual(150)
      }
    })
  })

  describe('getLessonById', () => {
    it('已知 id 应返回对应 lesson', () => {
      const l = getLessonById('travel-airport')
      expect(l).not.toBeNull()
      expect(l?.title).toContain('旅行')
    })

    it('未知 id 应返 null', () => {
      expect(getLessonById('not-exist')).toBeNull()
      expect(getLessonById('')).toBeNull()
    })
  })

  describe('getLessonVocabWords', () => {
    it('应按 lesson.vocabulary 顺序查 words.json 返 Word[]', () => {
      const lesson = getLessonById('travel-airport')!
      const words = [
        makeWord('w-airport', 'airport'),
        makeWord('w-hotel', 'hotel'),
        makeWord('w-ticket', 'ticket'),
        makeWord('w-trip', 'trip'),
        makeWord('w-zzz-not-in-lesson', 'zzznotused'),
      ]
      const result = getLessonVocabWords(lesson, words)
      // lesson.vocabulary 前 4 个命中
      expect(result.length).toBeGreaterThanOrEqual(4)
      expect(result[0].word).toBe('airport')
      expect(result[1].word).toBe('hotel')
    })

    it('查不到的词应跳过, 不阻塞', () => {
      const lesson = getLessonById('work-meeting')!
      const words = [makeWord('w-other', 'something')]
      const result = getLessonVocabWords(lesson, words)
      expect(result).toEqual([])
    })

    it('去重: lesson.vocabulary 重复词不返 2 次', () => {
      const lesson = { ...getLessonById('travel-airport')!, vocabulary: ['airport', 'airport', 'hotel'] }
      const words = [makeWord('w-airport', 'airport'), makeWord('w-hotel', 'hotel')]
      const result = getLessonVocabWords(lesson, words)
      expect(result.length).toBe(2)
    })
  })

  describe('findVocabInBody', () => {
    it('应找到 body 中所有 vocabulary 词 (不重叠, 按位置排序)', () => {
      const body = 'I went to the airport and the hotel. The hotel was clean.'
      const words = [makeWord('w-airport', 'airport'), makeWord('w-hotel', 'hotel')]
      const ranges = findVocabInBody(body, words)
      expect(ranges.length).toBe(3)  // airport 1 次 + hotel 2 次
      expect(ranges[0].word.word).toBe('airport')
      expect(ranges[1].word.word).toBe('hotel')
      expect(ranges[2].word.word).toBe('hotel')
      // 排序
      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].start).toBeGreaterThanOrEqual(ranges[i - 1].end)
      }
    })

    it('单词边界: "airport" 不应匹配 "airports" 部分', () => {
      // 注意: 我们是精确匹配, 不做 stem 处理
      // "airports" 中 "airport" 是 airport 后面有 's', 我们的 check 是 after != letter
      // 所以 "airports" 中 "airport" 后面是 's' (字母), 不应匹配
      const body = 'airports airport'
      const words = [makeWord('w-airport', 'airport')]
      const ranges = findVocabInBody(body, words)
      expect(ranges.length).toBe(1)
      expect(ranges[0].start).toBe(9)  // "airport" at index 9
    })

    it('大小写不敏感', () => {
      const body = 'Airport AIRPORT airport'
      const words = [makeWord('w-airport', 'airport')]
      const ranges = findVocabInBody(body, words)
      expect(ranges.length).toBe(3)
    })

    it('空 body / 空 vocab → 空结果', () => {
      expect(findVocabInBody('', [makeWord('w-x', 'x')])).toEqual([])
      expect(findVocabInBody('hello', [])).toEqual([])
    })
  })

  describe('lesson favorite id helpers', () => {
    it('getLessonFavoriteId 加 lesson: 前缀', () => {
      expect(getLessonFavoriteId('travel-airport')).toBe('lesson:travel-airport')
    })

    it('getLessonIdFromFavorite 反解', () => {
      expect(getLessonIdFromFavorite('lesson:travel-airport')).toBe('travel-airport')
    })

    it('非 lesson: 前缀应返 null', () => {
      expect(getLessonIdFromFavorite('w-airport')).toBeNull()
      expect(getLessonIdFromFavorite('daily-1')).toBeNull()
    })

    it('可逆: getLessonIdFromFavorite(getLessonFavoriteId(x)) === x', () => {
      for (const l of LESSONS) {
        const favId = getLessonFavoriteId(l.id)
        expect(getLessonIdFromFavorite(favId)).toBe(l.id)
      }
    })
  })

  describe('calcReadingProgress', () => {
    it('内容不足一屏应返 1', () => {
      expect(calcReadingProgress(0, 100, 500)).toBe(1)
      expect(calcReadingProgress(50, 100, 500)).toBe(1)
    })

    it('滚到底应返 1', () => {
      // scrollHeight=1000, clientHeight=500, max=500
      // scrollTop=500 → 1
      expect(calcReadingProgress(500, 1000, 500)).toBe(1)
    })

    it('滚到中间应返 ~0.5', () => {
      // scrollTop=250, max=500 → 0.5
      expect(calcReadingProgress(250, 1000, 500)).toBeCloseTo(0.5, 5)
    })

    it('scrollTop=0 应返 0', () => {
      expect(calcReadingProgress(0, 1000, 500)).toBe(0)
    })
  })
})
