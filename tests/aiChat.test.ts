// aiChat.ts reviewMessage 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import { reviewMessage, type ReviewResult, assessUserLevel, truncateCustomTopic, type ChatMessage } from '../src/lib/aiChat'

describe('aiChat.ts reviewMessage', () => {
  describe('输入校验', () => {
    it('空文本返回 no error', async () => {
      const result = await reviewMessage('', 'B1', { id: 'mock', type: 'openai' } as any, '', '')
      expect(result.hasError).toBe(false)
      expect(result.errors).toEqual([])
    })

    it('Mock 渠道跳过 (返回 no error)', async () => {
      const result = await reviewMessage('I go to school yesterday', 'B1', { id: 'mock', type: 'openai' } as any, '', '')
      expect(result.hasError).toBe(false)
    })
  })

  describe('JSON 解析容错', () => {
    it('reviewMessage 接收 LLM 输出含 markdown fence', () => {
      // 不能直接测内部 parseReview, 但可以测它能否处理典型输入
      // 通过构造一个 provider mock 测试
      // 这里只测 mock 渠道,实际 LLM 渠道需要 mock fetch
    })
  })

  // === v1.9.0: 难度自适应 + 自由话题 ===
  describe('assessUserLevel', () => {
    it('A1 用户 (≤3 词短句) → A1', () => {
      const msgs: ChatMessage[] = [
        { id: '1', role: 'user', content: 'I am', ts: 1 },
        { id: '2', role: 'user', content: 'Me hungry', ts: 2 },
        { id: '3', role: 'user', content: 'Yes ok', ts: 3 },
      ]
      expect(assessUserLevel(msgs)).toBe('A1')
    })

    it('B1 用户 (7-12 词句) → B1', () => {
      const msgs: ChatMessage[] = [
        { id: '1', role: 'user', content: 'I usually go to school by bus every morning with my friends', ts: 1 },
        { id: '2', role: 'user', content: 'Yesterday I went to the supermarket to buy some groceries and snacks', ts: 2 },
        { id: '3', role: 'user', content: 'Tomorrow we are planning to visit the museum tomorrow noon', ts: 3 },
      ]
      expect(assessUserLevel(msgs)).toBe('B1')
    })

    it('C1 用户 (19-25 词复杂句) → C1', () => {
      const msgs: ChatMessage[] = [
        { id: '1', role: 'user', content: 'The economic implications of artificial intelligence on global labor markets remain a subject of intense academic debate', ts: 1 },
        { id: '2', role: 'user', content: 'Contemporary philosophical discourse regarding consciousness and free will has been significantly influenced by recent developments in science', ts: 2 },
        { id: '3', role: 'user', content: 'The implementation of comprehensive environmental policies requires coordinated international cooperation across multiple governmental sectors', ts: 3 },
      ]
      expect(assessUserLevel(msgs)).toBe('C1')
    })

    it('<3 轮 user 消息 → 返回 undefined', () => {
      const msgs: ChatMessage[] = [
        { id: '1', role: 'user', content: 'hi', ts: 1 },
        { id: '2', role: 'user', content: 'hello', ts: 2 },
      ]
      expect(assessUserLevel(msgs)).toBeUndefined()
    })

    it('含从句 (because/although) 加 1 档', () => {
      // 基础 A2 (5 词) + because 加 1 档 → B1
      const msgs: ChatMessage[] = [
        { id: '1', role: 'user', content: 'I am happy because sun', ts: 1 },
        { id: '2', role: 'user', content: 'I go shop because food', ts: 2 },
        { id: '3', role: 'user', content: 'Yes ok because tired', ts: 3 },
      ]
      expect(assessUserLevel(msgs)).toBe('B1')
    })

    it('空数组 / 仅 assistant 消息 → undefined', () => {
      expect(assessUserLevel([])).toBeUndefined()
      const msgs: ChatMessage[] = [
        { id: '1', role: 'assistant', content: 'hi', ts: 1 },
        { id: '2', role: 'assistant', content: 'hello', ts: 2 },
      ]
      expect(assessUserLevel(msgs)).toBeUndefined()
    })
  })

  describe('truncateCustomTopic', () => {
    it('短 topic 不截断', () => {
      expect(truncateCustomTopic('和乔布斯聊创业')).toBe('和乔布斯聊创业')
    })

    it('超 200 字符截断 + 省略号', () => {
      const long = 'a'.repeat(300)
      const t = truncateCustomTopic(long)
      expect(t.length).toBeLessThanOrEqual(201)  // 200 + 1 unicode 省略号
      expect(t.endsWith('…')).toBe(true)
    })

    it('默认 maxLen=200', () => {
      const t = truncateCustomTopic('a'.repeat(250))
      expect(t.length).toBeLessThanOrEqual(201)
    })

    it('自定义 maxLen', () => {
      const t = truncateCustomTopic('a'.repeat(50), 30)
      expect(t.length).toBeLessThanOrEqual(31)
      expect(t.endsWith('…')).toBe(true)
    })
  })
})
