// tests/fillblank.test.ts - v1.85.0 C 填空练习
import { describe, it, expect } from 'vitest'
import {
  tokenize,
  joinTokens,
  checkAnswer,
  buildQuestion,
  generateQuestions,
  type Word,
} from '../src/lib/fillblank'

/** 测试用 sample words: 含 short + long examples */
const sampleWords: Word[] = [
  {
    id: 'w-take',
    word: 'take',
    translations: ['拿, 取'],
    pos: ['v'],
    tags: ['高频', 'CET4'],
    level: 'cet4',
    difficulty: 2,
    frequency: 5,
    examples: [
      { en: 'I always take a shower before breakfast in the morning.', zh: '我总是在早餐前洗澡。' },  // 11 words
      { en: 'Could you please take this important package to the post office for me right now?', zh: '你现在能帮我把这个重要包裹送到邮局吗?' },  // 17 words
    ],
    phrases: [
      { phrase: 'take a break', translation: '休息' },
      { phrase: 'take over', translation: '接管' },
    ],
  },
  {
    id: 'w-make',
    word: 'make',
    translations: ['做, 制作'],
    pos: ['v'],
    tags: ['高频', 'CET4'],
    level: 'cet4',
    difficulty: 2,
    frequency: 5,
    examples: [
      { en: 'She decided to make a cake for her birthday party tomorrow.', zh: '她决定为明天的生日派对做一个蛋糕。' },  // 12 words
      { en: 'We need to make sure that everyone in our team understands the importance of this project.', zh: '我们需要确保团队里每个人都理解这个项目的重要性。' },  // 18 words
    ],
  },
  {
    id: 'w-go',
    word: 'go',
    translations: ['去'],
    pos: ['v'],
    tags: ['高频'],
    level: 'junior',
    difficulty: 1,
    frequency: 5,
    examples: [
      { en: 'They decided to go to the cinema together last night.', zh: '他们决定昨晚一起去看电影。' },  // 12 words
      { en: 'I am planning to go on a long trip to the mountains with my family next month.', zh: '我计划下个月和家人一起去山里长途旅行。' },  // 19 words
    ],
  },
  {
    id: 'w-have',
    word: 'have',
    translations: ['有'],
    pos: ['v'],
    tags: ['高频'],
    level: 'junior',
    difficulty: 1,
    frequency: 5,
    examples: [
      { en: 'We have a small garden behind our house.', zh: '我们房子后面有一个小花园。' },  // 9 words → 短
      { en: 'She is going to have a baby next month.', zh: '她下个月要生宝宝了。' },  // 11 words
    ],
  },
  {
    id: 'w-rapid',
    word: 'rapid',
    translations: ['快速的'],
    pos: ['adj'],
    tags: ['CET6'],
    level: 'cet6',
    difficulty: 4,
    frequency: 3,
    examples: [
      { en: 'There has been rapid economic growth in the past five years.', zh: '过去五年经济快速增长。' },  // 12 words
    ],
  },
  {
    id: 'w-diligent',
    word: 'diligent',
    translations: ['勤奋的'],
    pos: ['adj'],
    tags: ['CET6'],
    level: 'cet6',
    difficulty: 4,
    frequency: 2,
    examples: [
      { en: 'She is a diligent student who always finishes her homework on time.', zh: '她是一个勤奋的学生, 总能按时完成作业。' },  // 15 words
    ],
  },
] as unknown as Word[]

/** 固定 RNG: 让测试可复现 */
function makeRng(seed = 42): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('fillblank (v1.85.0-C)', () => {
  describe('tokenize / joinTokens', () => {
    it('tokenize 拆句: 词与标点分开', () => {
      const tokens = tokenize('Hello, world!')
      expect(tokens).toEqual(['Hello', ',', 'world', '!'])
    })

    it('joinTokens 还原: 标点前无空格', () => {
      const out = joinTokens(['Hello', ',', 'world', '!'])
      expect(out).toBe('Hello, world!')
    })

    it('tokenize + joinTokens 循环等价', () => {
      const s = 'I always take a shower before breakfast.'
      expect(joinTokens(tokenize(s))).toBe(s)
    })
  })

  describe('checkAnswer', () => {
    it('正确: 严格匹配', () => {
      const b = { position: 0, answer: 'take', options: [], hint: '', type: 'choice' as const }
      expect(checkAnswer(b, 'take')).toBe(true)
    })

    it('正确: 大小写不敏感', () => {
      const b = { position: 0, answer: 'take', options: [], hint: '', type: 'choice' as const }
      expect(checkAnswer(b, 'TAKE')).toBe(true)
    })

    it('正确: 去标点', () => {
      const b = { position: 0, answer: 'take', options: [], hint: '', type: 'choice' as const }
      expect(checkAnswer(b, 'take.')).toBe(true)
    })

    it('错误: 不同词', () => {
      const b = { position: 0, answer: 'take', options: [], hint: '', type: 'choice' as const }
      expect(checkAnswer(b, 'make')).toBe(false)
    })

    it('错误: 空答案', () => {
      const b = { position: 0, answer: 'take', options: [], hint: '', type: 'choice' as const }
      expect(checkAnswer(b, '')).toBe(false)
    })
  })

  describe('buildQuestion', () => {
    it('短句: 1 词 4 选 1', () => {
      const w = sampleWords[0]  // take
      const sentence = 'I always take a shower before breakfast in the morning.'  // 11 词 (短句)
      const q = buildQuestion(w, sentence, 'short', sampleWords, makeRng(1))
      expect(q).not.toBeNull()
      expect(q!.type).toBe('short')
      expect(q!.blanks.length).toBe(1)
      expect(q!.blanks[0].type).toBe('choice')
      expect(q!.blanks[0].options.length).toBe(4)
      expect(q!.blanks[0].options).toContain(q!.blanks[0].answer)
    })

    it('长句: 2-3 词 input', () => {
      const w = sampleWords[0]  // take
      const sentence = 'Could you please take this important package to the post office for me right now?'  // 17 词
      const q = buildQuestion(w, sentence, 'long', sampleWords, makeRng(2))
      expect(q).not.toBeNull()
      expect(q!.type).toBe('long')
      expect(q!.blanks.length).toBeGreaterThanOrEqual(2)
      expect(q!.blanks.length).toBeLessThanOrEqual(3)
      expect(q!.blanks[0].type).toBe('input')
      expect(q!.blanks[0].options).toEqual([])
    })

    it('短句不挖 stop word (a / the / in)', () => {
      const w = sampleWords[3]  // have
      const sentence = 'We have a small garden behind our house.'
      const q = buildQuestion(w, sentence, 'short', sampleWords, makeRng(3))
      expect(q).not.toBeNull()
      // 验证挖的不是 'a', 'the', 'we' 等 stop word
      const answer = q!.blanks[0].answer
      expect(['a', 'the', 'we', 'have', 'our', 'in', 'on', 'to']).not.toContain(answer)
    })

    it('挖词优先级: 高频词优先 (take.frequency=5 优于 rapid.frequency=3)', () => {
      const w = sampleWords[0]  // take
      const sentence = 'I always take a shower before breakfast in the morning.'
      const q = buildQuestion(w, sentence, 'short', sampleWords, makeRng(4))
      expect(q).not.toBeNull()
      // 应该是 take, 不是 morning/shower 等
      expect(q!.blanks[0].answer).toBe('take')
    })

    it('Hint 不空 (短句给翻译, 长句给提示)', () => {
      const w = sampleWords[1]  // make
      const shortQ = buildQuestion(w, 'She decided to make a cake for her birthday party tomorrow.', 'short', sampleWords, makeRng(5))
      expect(shortQ!.blanks[0].hint).toBe('做, 制作')

      const longQ = buildQuestion(w, 'We need to make sure that everyone in our team understands the importance of this project.', 'long', sampleWords, makeRng(5))
      expect(longQ!.blanks[0].hint.length).toBeGreaterThan(0)
    })

    it('空句 / 全标点返回 null', () => {
      const w = sampleWords[0]
      expect(buildQuestion(w, '', 'short', sampleWords)).toBeNull()
      // 太短
      const tinyQ = buildQuestion(w, 'a b c', 'short', sampleWords)
      expect(tinyQ).toBeNull()
    })
  })

  describe('generateQuestions', () => {
    it('默认 20 题, 短长比 0.5', () => {
      const qs = generateQuestions(sampleWords, 20, {}, makeRng(10))
      expect(qs.length).toBeGreaterThan(0)
      expect(qs.length).toBeLessThanOrEqual(20)
      // 验证短长比
      const shortCount = qs.filter(q => q.type === 'short').length
      const longCount = qs.filter(q => q.type === 'long').length
      expect(shortCount).toBeGreaterThan(0)
      expect(longCount).toBeGreaterThan(0)
    })

    it('难度筛选: 只返指定 level', () => {
      const qs = generateQuestions(sampleWords, 10, { level: 'cet6' }, makeRng(11))
      // 我们的 sample 中只有 2 个 cet6
      expect(qs.every(q => q.level === 'cet6')).toBe(true)
    })

    it('空词库返空数组', () => {
      const qs = generateQuestions([], 20)
      expect(qs).toEqual([])
    })

    it('生成的题不重复句子', () => {
      const qs = generateQuestions(sampleWords, 20, {}, makeRng(12))
      const sentences = qs.map(q => q.fullSentence)
      const unique = new Set(sentences)
      expect(unique.size).toBe(sentences.length)
    })

    it('短句: options 含正确答案 + 3 干扰', () => {
      const qs = generateQuestions(sampleWords, 6, { shortRatio: 1.0 }, makeRng(13))
      const shortQs = qs.filter(q => q.type === 'short')
      for (const q of shortQs) {
        const opts = q.blanks[0].options
        expect(opts.length).toBe(4)
        expect(opts).toContain(q.blanks[0].answer)
        // 3 干扰都不等于答案
        const distractors = opts.filter(o => o !== q.blanks[0].answer)
        expect(distractors.length).toBe(3)
      }
    })

    it('长句: options 为空, 让用户输入', () => {
      const qs = generateQuestions(sampleWords, 6, { shortRatio: 0.0 }, makeRng(14))
      const longQs = qs.filter(q => q.type === 'long')
      for (const q of longQs) {
        for (const b of q.blanks) {
          expect(b.type).toBe('input')
          expect(b.options).toEqual([])
        }
      }
    })
  })
})
