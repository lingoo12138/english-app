// tests/multiRole.test.ts - v1.27.0 W28 多人对话
import { describe, it, expect } from 'vitest'
import {
  MULTI_ROLE_SCENARIOS,
  buildMultiRoleSystemPrompt,
  parseMultiRoleReply,
  ALL_ROLES,
} from '../src/lib/chatRoles'

describe('multiRole (v1.27.0-W28)', () => {
  describe('MULTI_ROLE_SCENARIOS 预设', () => {
    it('3 套场景', () => {
      expect(MULTI_ROLE_SCENARIOS.length).toBe(3)
    })
    it('每场景 3 角色', () => {
      for (const s of MULTI_ROLE_SCENARIOS) {
        expect(s.roleIds.length).toBe(3)
      }
    })
    it('角色 id 都在 ALL_ROLES 里', () => {
      const validIds = new Set(ALL_ROLES.map(r => r.id))
      for (const s of MULTI_ROLE_SCENARIOS) {
        for (const id of s.roleIds) {
          expect(validIds.has(id)).toBe(true)
        }
      }
    })
  })

  describe('buildMultiRoleSystemPrompt', () => {
    it('空数组返空', () => {
      expect(buildMultiRoleSystemPrompt([])).toBe('')
    })
    it('2 角色返 system prompt 含两人名', () => {
      const p = buildMultiRoleSystemPrompt(['interviewer', 'barista'], 'A2')
      expect(p).toContain('多人模式')
      expect(p).toContain('面试官')
      expect(p).toContain('咖啡师')
      expect(p).toContain('[Name]:')
    })
    it('3 角色返 system prompt 含三人名', () => {
      const p = buildMultiRoleSystemPrompt(['teacher', 'lawyer', 'engineer'], 'B1')
      expect(p).toContain('英语教师')
      expect(p).toContain('律师')
      expect(p).toContain('软件工程师')
    })
    it('含基础 prompt 拼接', () => {
      const p = buildMultiRoleSystemPrompt(['waiter', 'doctor'], 'A1')
      expect(p).toContain('--- 餐厅服务员 ---')
      expect(p).toContain('--- 医生 ---')
    })
  })

  describe('parseMultiRoleReply', () => {
    it('解析 [Name]: 格式', () => {
      const r = parseMultiRoleReply('[面试官]: 你好, 请介绍一下自己')
      expect(r?.name).toBe('面试官')
      expect(r?.content).toBe('你好, 请介绍一下自己')
    })
    it('找到 emoji (从 ALL_ROLES)', () => {
      const r = parseMultiRoleReply('[咖啡师]: Hi!')
      expect(r?.emoji).toBe('☕')
    })
    it('没匹配返 null', () => {
      expect(parseMultiRoleReply('Hi there!')).toBeNull()
      expect(parseMultiRoleReply('')).toBeNull()
    })
    it('支持多行内容', () => {
      const r = parseMultiRoleReply('[医生]: I see.\nHow long?')
      expect(r?.content).toBe('I see.\nHow long?')
    })
  })
})
