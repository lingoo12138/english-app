// tests/customScenes.test.ts - v1.14.0 B4 自定义场景
import { describe, it, expect } from 'vitest'
import {
  MAX_TEXT_LEN,
  MAX_WORDS,
  MIN_WORDS,
  truncateText,
  mockExtractWords,
  parseExtractResult,
  extractWordsFromText,
  autoExtractTitle,
  type CustomWord,
} from '../src/lib/customScenes'

describe('customScenes (v1.14.0-B4)', () => {
  describe('常量', () => {
    it('MAX_TEXT_LEN = 10000', () => {
      expect(MAX_TEXT_LEN).toBe(10000)
    })

    it('MAX_WORDS = 30', () => {
      expect(MAX_WORDS).toBe(30)
    })

    it('MIN_WORDS = 5', () => {
      expect(MIN_WORDS).toBe(5)
    })
  })

  describe('truncateText', () => {
    it('不超限返原文', () => {
      expect(truncateText('hello')).toBe('hello')
    })

    it('空串返空', () => {
      expect(truncateText('')).toBe('')
    })

    it('超限截断 + 省略号', () => {
      const long = 'a'.repeat(200)
      const t = truncateText(long, 100)
      expect(t.length).toBe(101)  // 100 + …
      expect(t.endsWith('…')).toBe(true)
    })

    it('自定义 maxLen', () => {
      const t = truncateText('abcdef', 3)
      expect(t).toBe('abc…')
    })
  })

  describe('mockExtractWords', () => {
    it('空文本返空数组', () => {
      expect(mockExtractWords('')).toEqual([])
    })

    it('短文本返 1-2 词', () => {
      const words = mockExtractWords('The quick brown fox jumps over the lazy dog')
      expect(words.length).toBeGreaterThan(0)
      expect(words.length).toBeLessThanOrEqual(MAX_WORDS)
    })

    it('过滤常见停用词', () => {
      const words = mockExtractWords('the the the is is are a an')
      expect(words.length).toBe(0)
    })

    it('长文本返 ≤ MAX_WORDS 词', () => {
      const text = 'apple banana cherry date elephant fox grape house igloo jungle ' +
        'kite lemon mango night ocean pear queen rainbow star tree umbrella ' +
        'violet whale xenon yellow zebra apple banana cherry date elephant'
      const words = mockExtractWords(text, 10)
      expect(words.length).toBeLessThanOrEqual(10)
      expect(words.length).toBeGreaterThan(0)
    })

    it('每词都含 word/translation/example/difficulty', () => {
      const words = mockExtractWords('apple banana cherry dragon elephant fox grape house')
      for (const w of words) {
        expect(w.word).toBeTruthy()
        expect(w.translation).toBeTruthy()
        expect(w.example).toBeTruthy()
        expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(w.difficulty)
      }
    })

    it('按词频排序 (高频在前)', () => {
      // "computer" 出现 3 次, "phone" 1 次 → computer 应在前
      const text = 'computer computer computer phone'
      const words = mockExtractWords(text)
      expect(words[0].word).toBe('computer')
    })

    it('去重', () => {
      const words = mockExtractWords('apple apple apple banana banana')
      const seen = new Set(words.map(w => w.word))
      expect(seen.size).toBe(words.length)
    })
  })

  describe('parseExtractResult 严格 JSON', () => {
    it('正确 JSON 返词数组', () => {
      const json = JSON.stringify({
        words: [
          { word: 'hello', translation: '你好', example: 'Hello world.', difficulty: 'A1' },
          { word: 'world', translation: '世界', example: 'Hello world.', difficulty: 'A1' },
        ],
      })
      const words = parseExtractResult(json)
      expect(words.length).toBe(2)
      expect(words[0].word).toBe('hello')
    })

    it('无效 JSON 返空数组', () => {
      expect(parseExtractResult('not json')).toEqual([])
    })

    it('缺 words 字段返空', () => {
      expect(parseExtractResult('{}')).toEqual([])
    })

    it('words 非数组返空', () => {
      expect(parseExtractResult('{"words": "string"}')).toEqual([])
    })

    it('词无 word 字段被跳过', () => {
      const json = JSON.stringify({
        words: [
          { word: 'good', translation: '好' },
          { translation: 'no word' },  // 跳过
          { word: '   ', translation: 'empty' },  // 跳过 (trim 后空)
        ],
      })
      const words = parseExtractResult(json)
      expect(words.length).toBe(1)
      expect(words[0].word).toBe('good')
    })

    it('超 MAX_WORDS 截断', () => {
      const words = Array.from({ length: 50 }, (_, i) => ({
        word: `w${i}`, translation: 't', example: 'e', difficulty: 'B1',
      }))
      const json = JSON.stringify({ words })
      const result = parseExtractResult(json)
      expect(result.length).toBe(MAX_WORDS)
    })

    it('非法 difficulty 降级 B1', () => {
      const json = JSON.stringify({
        words: [{ word: 'test', translation: 't', example: 'e', difficulty: 'INVALID' }],
      })
      const words = parseExtractResult(json)
      expect(words[0].difficulty).toBe('B1')
    })

    it('缺 translation/example 用默认', () => {
      const json = JSON.stringify({
        words: [{ word: 'test' }],
      })
      const words = parseExtractResult(json)
      expect(words[0].translation).toContain('test')
      expect(words[0].example).toContain('test')
    })

    it('word 转小写 + trim', () => {
      const json = JSON.stringify({
        words: [{ word: '  Hello  ', translation: 't', example: 'e', difficulty: 'A1' }],
      })
      const words = parseExtractResult(json)
      expect(words[0].word).toBe('hello')
    })
  })

  describe('extractWordsFromText LLM 集成', () => {
    const mockProvider = {
      id: 'mock',
      name: 'Mock',
      type: 'mock' as const,
      apiKeyRequired: false,
      defaultModel: 'mock',
    }

    it('mock 渠道: 返非空数组', async () => {
      const words = await extractWordsFromText(
        'The quick brown fox jumps over the lazy dog and the cat',
        mockProvider,
        '',
        'mock',
      )
      expect(words.length).toBeGreaterThan(0)
    })

    it('空文本返空数组', async () => {
      const words = await extractWordsFromText('', mockProvider, '', 'mock')
      expect(words).toEqual([])
    })

    it('mock 渠道遵守 maxWords', async () => {
      const longText = 'apple banana cherry dragon elephant fox grape house igloo jungle ' +
        'kite lemon mango night ocean pear queen rainbow star tree umbrella ' +
        'violet whale xenon yellow zebra apple banana cherry dragon'
      const words = await extractWordsFromText(longText, mockProvider, '', 'mock', 5)
      expect(words.length).toBeLessThanOrEqual(5)
    })

    it('超长文本自动截断 (不报错)', async () => {
      const longText = 'apple '.repeat(5000)  // 30000 字符
      const words = await extractWordsFromText(longText, mockProvider, '', 'mock')
      expect(words).toBeDefined()
    })
  })

  describe('autoExtractTitle', () => {
    it('空文本返 "未命名场景"', () => {
      expect(autoExtractTitle('')).toBe('未命名场景')
    })

    it('取第 1 句', () => {
      expect(autoExtractTitle('Hello world. This is a test.')).toBe('Hello world')
    })

    it('问号/感叹号截断', () => {
      expect(autoExtractTitle('What is AI? It is a tool!')).toBe('What is AI')
    })

    it('超 30 字符截断 + 省略号', () => {
      const long = 'a'.repeat(60)
      const t = autoExtractTitle(long)
      expect(t.length).toBeLessThanOrEqual(31)  // 30 + …
      expect(t.endsWith('…')).toBe(true)
    })

    it('无标点取前 30 字符', () => {
      const t = autoExtractTitle('abcdefghijklmnopqrstuvwxyz1234567890')
      // 30 字符 + … = 31
      expect(t.length).toBeLessThanOrEqual(31)
      expect(t.endsWith('…')).toBe(true)
    })
  })
})
