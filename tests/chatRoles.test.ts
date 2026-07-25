// tests/chatRoles.test.ts - v1.13.0 B3 多角色对话
import { describe, it, expect } from 'vitest'
import {
  CHAT_ROLES,
  ALL_ROLES,
  NONE_ROLE,
  getRoleById,
  getGreetingForRole,
  getFallbackReply,
  getRoleSystemPrompt,
  type ChatRole,
  type ChatRoleId,
} from '../src/lib/chatRoles'

describe('chatRoles (v1.13.0-B3 + v1.17.0-B7 + v1.26.0-W27)', () => {
  describe('CHAT_ROLES 11 角色 (v1.26.0 加 3)', () => {
    it('应有 11 个角色', () => {
      expect(CHAT_ROLES.length).toBe(11)
    })

    it('11 角色 id 正确', () => {
      const ids = CHAT_ROLES.map(r => r.id)
      expect(ids).toEqual(
        expect.arrayContaining([
          'interviewer', 'barista', 'receptionist', 'tour_guide', 'waiter',
          'doctor', 'banker', 'police',
          'teacher', 'lawyer', 'engineer',
        ]),
      )
    })

    it('ALL_ROLES 应为 12 (含 NONE_ROLE)', () => {
      expect(ALL_ROLES.length).toBe(12)
    })

    it('每角色都有完整字段', () => {
      for (const r of CHAT_ROLES) {
        expect(r.id).toBeTruthy()
        expect(r.name).toBeTruthy()
        expect(r.emoji).toBeTruthy()
        expect(r.description).toBeTruthy()
        expect(r.systemPrompt).toBeTruthy()
        expect(r.scenario).toBeTruthy()
        expect(r.greetings.length).toBeGreaterThanOrEqual(3)
        expect(r.fallbackReplies.length).toBeGreaterThanOrEqual(5)
      }
    })

    it('interviewer 角色含英文面试关键词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'interviewer')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/interview|introduce|professional/)
    })

    it('barista 角色含咖啡相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'barista')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/barista|coffee|drink|order/)
    })

    it('receptionist 角色含酒店相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'receptionist')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/receptionist|hotel|check.?in|room/)
    })

    it('tour_guide 角色含旅行相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'tour_guide')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/guide|travel|recommend|place|city/)
    })

    it('waiter 角色含餐厅相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'waiter')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/waiter|restaurant|order|menu|food/)
    })

    // v1.17.0 新增 3 角色验证
    it('doctor 角色含医生相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'doctor')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/doctor|medical|symptom|health/)
    })

    // v1.26.0 新增 3 角色验证 (W27)
    it('teacher 角色含教师相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'teacher')!
      expect(r.emoji).toBe('👩‍🏫')
      expect(r.systemPrompt.toLowerCase()).toMatch(/teacher|english|grammar|learn|student|practice/)
      expect(r.greetings.length).toBeGreaterThanOrEqual(3)
    })

    it('lawyer 角色含律师相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'lawyer')!
      expect(r.emoji).toBe('⚖️')
      expect(r.systemPrompt.toLowerCase()).toMatch(/lawyer|legal|attorney|client|advice|contract/)
      expect(r.fallbackReplies.length).toBeGreaterThanOrEqual(5)
    })

    it('engineer 角色含工程师相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'engineer')!
      expect(r.emoji).toBe('💻')
      expect(r.systemPrompt.toLowerCase()).toMatch(/engineer|technical|system|design|code|software/)
      expect(r.fallbackReplies.length).toBeGreaterThanOrEqual(5)
    })

    it('teacher 中文标签', () => {
      const r = CHAT_ROLES.find(r => r.id === 'teacher')!
      expect(r.name).toBe('英语教师')
    })

    it('lawyer 中文标签', () => {
      const r = CHAT_ROLES.find(r => r.id === 'lawyer')!
      expect(r.name).toBe('律师')
    })

    it('engineer 中文标签', () => {
      const r = CHAT_ROLES.find(r => r.id === 'engineer')!
      expect(r.name).toBe('软件工程师')
    })

    it('banker 角色含银行相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'banker')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/bank|teller|account|deposit|loan/)
    })

    it('police 角色含警察相关词', () => {
      const r = CHAT_ROLES.find(r => r.id === 'police')!
      expect(r.systemPrompt.toLowerCase()).toMatch(/police|officer|report|safety/)
    })

    it('doctor 角色中文标签正确', () => {
      const r = CHAT_ROLES.find(r => r.id === 'doctor')!
      expect(r.name).toBe('医生')
      expect(r.emoji).toBe('🏥')
    })

    it('banker 角色中文标签正确', () => {
      const r = CHAT_ROLES.find(r => r.id === 'banker')!
      expect(r.name).toBe('银行柜员')
      expect(r.emoji).toBe('🏦')
    })

    it('police 角色中文标签正确', () => {
      const r = CHAT_ROLES.find(r => r.id === 'police')!
      expect(r.name).toBe('警察')
      expect(r.emoji).toBe('👮')
    })
  })

  describe('NONE_ROLE 普通对话', () => {
    it('id 为 none', () => {
      expect(NONE_ROLE.id).toBe('none')
    })

    it('systemPrompt 为空字符串 (走原逻辑)', () => {
      expect(NONE_ROLE.systemPrompt).toBe('')
    })

    it('无 greetings / fallbackReplies', () => {
      expect(NONE_ROLE.greetings).toEqual([])
      expect(NONE_ROLE.fallbackReplies).toEqual([])
    })
  })

  describe('ALL_ROLES 完整角色表', () => {
    it('含 NONE_ROLE + 11 角色 = 12 项 (v1.26.0 加 3)', () => {
      expect(ALL_ROLES.length).toBe(12)
      expect(ALL_ROLES[0]).toBe(NONE_ROLE)
    })
  })

  describe('getRoleById', () => {
    it('有效 id 返对应角色 (8 角色)', () => {
      expect(getRoleById('interviewer').name).toBe('面试官')
      expect(getRoleById('barista').name).toBe('咖啡师')
      expect(getRoleById('waiter').name).toBe('餐厅服务员')
      // v1.17.0 新增
      expect(getRoleById('doctor').name).toBe('医生')
      expect(getRoleById('banker').name).toBe('银行柜员')
      expect(getRoleById('police').name).toBe('警察')
    })

    it('无效 id 返 NONE_ROLE', () => {
      const r = getRoleById('nonexistent')
      expect(r).toBe(NONE_ROLE)
    })

    it('undefined / null 返 NONE_ROLE', () => {
      expect(getRoleById(undefined)).toBe(NONE_ROLE)
      expect(getRoleById(null)).toBe(NONE_ROLE)
    })

    it('"none" 返 NONE_ROLE', () => {
      expect(getRoleById('none')).toBe(NONE_ROLE)
    })
  })

  describe('getGreetingForRole', () => {
    it('8 角色都返非空字符串', () => {
      for (const r of CHAT_ROLES) {
        const g = getGreetingForRole(r)
        expect(g).toBeTruthy()
        expect(g.length).toBeGreaterThan(10)
      }
    })

    it('NONE_ROLE 返空字符串', () => {
      expect(getGreetingForRole(NONE_ROLE)).toBe('')
    })

    it('随机性: 多次调用可能不同 (interviewer 5 条池)', () => {
      const r = getRoleById('interviewer')
      const greetings = new Set<string>()
      for (let i = 0; i < 30; i++) {
        greetings.add(getGreetingForRole(r))
      }
      // 30 次至少应 > 1 种 (实际随机可能命中 1 种, 但池 ≥ 3 应有变化)
      // 概率: 1/5^30 → 实际肯定 > 1
      expect(greetings.size).toBeGreaterThan(1)
    })
  })

  describe('getFallbackReply', () => {
    it('8 角色都返非空字符串', () => {
      for (const r of CHAT_ROLES) {
        const f = getFallbackReply(r)
        expect(f).toBeTruthy()
      }
    })

    it('NONE_ROLE 返空字符串', () => {
      expect(getFallbackReply(NONE_ROLE)).toBe('')
    })

    it('每次随机 (5 角色 fallback 池 ≥ 5)', () => {
      const r = getRoleById('barista')
      const replies = new Set<string>()
      for (let i = 0; i < 30; i++) {
        replies.add(getFallbackReply(r))
      }
      expect(replies.size).toBeGreaterThan(1)
    })
  })

  describe('getRoleSystemPrompt', () => {
    it('8 角色都返非空 system prompt', () => {
      for (const r of CHAT_ROLES) {
        const p = getRoleSystemPrompt(r)
        expect(p).toBeTruthy()
        expect(p).toBe(r.systemPrompt)
      }
    })

    it('NONE_ROLE 返空字符串', () => {
      expect(getRoleSystemPrompt(NONE_ROLE)).toBe('')
    })

    it('注入 A1 level 提示', () => {
      const p = getRoleSystemPrompt(getRoleById('interviewer'), 'A1')
      expect(p).toContain('A1')
      expect(p).toMatch(/simple|short/i)
    })

    it('注入 B1 level 提示', () => {
      const p = getRoleSystemPrompt(getRoleById('barista'), 'B1')
      expect(p).toContain('B1')
    })

    it('注入 C2 level 提示', () => {
      const p = getRoleSystemPrompt(getRoleById('waiter'), 'C2')
      expect(p).toContain('C2')
    })

    it('undefined level 不注入 level 提示', () => {
      const p = getRoleSystemPrompt(getRoleById('waiter'))
      expect(p).not.toContain('A1')
      expect(p).not.toContain('B1')
      expect(p).not.toContain('C1')
    })
  })

  describe('角色协议类型检查', () => {
    it('ChatRoleId 联合类型只含 8 + none', () => {
      const validIds: ChatRoleId[] = ['interviewer', 'barista', 'receptionist', 'tour_guide', 'waiter', 'doctor', 'banker', 'police']
      for (const id of validIds) {
        expect(CHAT_ROLES.find(r => r.id === id)).toBeDefined()
      }
    })

    it('每角色 fallback pool ≥ 5 (mock 池够用)', () => {
      for (const r of CHAT_ROLES) {
        expect(r.fallbackReplies.length).toBeGreaterThanOrEqual(5)
      }
    })

    it('每角色 greeting pool ≥ 3', () => {
      for (const r of CHAT_ROLES) {
        expect(r.greetings.length).toBeGreaterThanOrEqual(3)
      }
    })
  })
})
