// tests/llmE2E.test.ts - v1.8-B LLM 端到端测试
// 验证 e2eTest + chatCompletionWithTimeout 全链路正常
import { describe, it, expect } from 'vitest'
import { e2eTest, chatCompletionWithTimeout, BUILTIN_LLM_PROVIDERS } from '../src/lib/providers/llm'

describe('v1.8-B LLM 端到端测试', () => {
  describe('e2eTest - mock 渠道', () => {
    it('mock 渠道 e2eTest 应 ok=true', async () => {
      const mockProvider = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'mock')
      if (!mockProvider) {
        // mock 渠道不在 BUILTIN_LLM_PROVIDERS, 用 0 id 替代
        const result = await e2eTest(
          { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' },
          '',
          'mock',
        )
        expect(result.ok).toBe(true)
        return
      }
      const result = await e2eTest(mockProvider, '', 'mock')
      expect(result.ok).toBe(true)
    }, 15000)

    it('mock 渠道 e2eTest 应 < 1s (有 OK 快速返回)', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const result = await e2eTest(mockProvider, '', 'mock')
      expect(result.ok).toBe(true)
      expect(result.latencyMs).toBeLessThan(1000)
    }, 15000)

    it('e2eTest 应返回 latencyMs', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const result = await e2eTest(mockProvider, '', 'mock')
      expect(typeof result.latencyMs).toBe('number')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    }, 15000)
  })

  describe('e2eTest - 错误处理', () => {
    it('无效 provider 应 ok=false', async () => {
      const result = await e2eTest(
        { id: '', name: 'Empty', type: 'openai' as any, apiKeyRequired: false, defaultModel: '' },
        '',
        '',
      )
      expect(result.ok).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('需要 apiKey 但没提供 应 ok=false', async () => {
      const result = await e2eTest(
        { id: 'openai', name: 'OpenAI', type: 'openai' as any, apiKeyRequired: true, defaultModel: 'gpt-4o-mini' },
        '',
        'gpt-4o-mini',
      )
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/API key/i)
    })
  })

  describe('chatCompletionWithTimeout', () => {
    it('mock 渠道 chatCompletionWithTimeout 应不超时', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const result = await chatCompletionWithTimeout({
        provider: mockProvider,
        apiKey: '',
        model: 'mock',
        messages: [{ role: 'user', content: 'Hello' }],
      })
      expect(result.content).toBeTruthy()
    }, 15000)

    it('chatCompletionWithTimeout 返回的 result 应有 content 字段', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const result = await chatCompletionWithTimeout({
        provider: mockProvider,
        apiKey: '',
        model: 'mock',
        messages: [{ role: 'user', content: 'Test' }],
      })
      expect(typeof result.content).toBe('string')
    }, 15000)
  })
})
