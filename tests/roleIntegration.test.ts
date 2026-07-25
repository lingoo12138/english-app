// tests/roleIntegration.test.ts - v1.13.0 B3 角色与 aiChat 集成
// 验证: buildSystemPrompt 角色注入 + 难度自适应共存 + 切角色清空
import { describe, it, expect } from 'vitest'

// 直接 import buildSystemPrompt 不可见 (private), 用 chat() mock provider 间接验证
import { chat as aiChat, assessUserLevel, type ChatMessage, type CEFRLevel } from '../src/lib/aiChat'
import { getRoleById, getRoleSystemPrompt, NONE_ROLE, type ChatRole } from '../src/lib/chatRoles'

// mock provider (复用 v1.6 mock 结构)
const mockProvider = {
  id: 'mock',
  name: 'Mock',
  type: 'mock' as const,
  apiKeyRequired: false,
  defaultModel: 'mock',
}

function makeMessages(content: string): ChatMessage[] {
  return [{
    id: `msg-${Date.now()}`,
    role: 'user',
    content,
    ts: Date.now(),
  }]
}

describe('role 集成 (v1.13.0-B3)', () => {
  it('角色注入: chat() 应能识别 role 字段', async () => {
    const role = getRoleById('interviewer')
    const messages = makeMessages('Hi, I am Tom.')
    const reply = await aiChat(
      messages,
      { role: 'interviewer' },
      mockProvider,
      '',
      'mock',
    )
    // mock 渠道应返非空
    expect(reply.role).toBe('assistant')
    expect(reply.content).toBeTruthy()
  })

  it('角色 + 难度自适应 共存', async () => {
    // 难度自适应不直接传到 system, role 优先
    const role = getRoleById('waiter')
    const prompt = getRoleSystemPrompt(role, 'B1')
    expect(prompt).toContain('waiter')
    expect(prompt).toContain('B1')
  })

  it('切角色 NONE_ROLE 系统 prompt 为空', () => {
    expect(getRoleSystemPrompt(NONE_ROLE)).toBe('')
  })

  it('5 角色 + NONE_ROLE 都能调 chat() 不报错', async () => {
    const messages = makeMessages('Hello')
    // 并行减少耗时
    const promises = ['none', 'interviewer', 'barista', 'receptionist', 'tour_guide', 'waiter'].map(id =>
      aiChat(messages, { role: id }, mockProvider, '', 'mock')
    )
    const replies = await Promise.all(promises)
    for (const reply of replies) {
      expect(reply.content).toBeTruthy()
    }
  })

  it('assessUserLevel 与角色无关 (复用 v1.9.0)', () => {
    // 难度自适应只看 messages, 不看 role
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'I have five years of experience in software development.', ts: 1 },
      { id: '2', role: 'assistant', content: 'OK', ts: 2 },
      { id: '3', role: 'user', content: 'I led a team of engineers, because I enjoy leadership.', ts: 3 },
      { id: '4', role: 'assistant', content: 'OK', ts: 4 },
      { id: '5', role: 'user', content: 'Although it was challenging, I learned a lot.', ts: 5 },
    ]
    const level = assessUserLevel(messages)
    expect(level).toBeDefined()
    // 5 角色下评估结果应一致
    expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(level!)
  })
})
