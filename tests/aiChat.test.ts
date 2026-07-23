// aiChat.ts reviewMessage 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import { reviewMessage, type ReviewResult } from '../src/lib/aiChat'

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
})
