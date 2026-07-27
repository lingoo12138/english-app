// tests/xpSystem.test.ts - v1.43.0 W43-B 学习游戏化 XP 体系
import { describe, it, expect, beforeEach } from 'vitest'
import {
  XP_REWARDS,
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
  getLevel,
  getXPState,
  computeStateFromXP,
  addXP,
  resetXP,
} from '../src/lib/xpSystem'

const STORAGE_KEY = 'xp-state-v1'

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

describe('xpSystem (v1.43.0 W43-B)', () => {
  describe('常量定义', () => {
    it('XP_REWARDS 5 项', () => {
      expect(XP_REWARDS.LEARN).toBe(5)
      expect(XP_REWARDS.REVIEW).toBe(3)
      expect(XP_REWARDS.STREAK).toBe(10)
      expect(XP_REWARDS.ANSWER).toBe(2)
      expect(XP_REWARDS.FAVORITE).toBe(1)
    })

    it('LEVEL_THRESHOLDS 10 级 (L1=0 ... L10=3000)', () => {
      expect(LEVEL_THRESHOLDS.length).toBe(10)
      expect(LEVEL_THRESHOLDS[0]).toBe(0)
      expect(LEVEL_THRESHOLDS[9]).toBe(3000)
      // 严格递增
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1])
      }
    })

    it('LEVEL_TITLES 10 个称号', () => {
      expect(LEVEL_TITLES.length).toBe(10)
      expect(LEVEL_TITLES[0]).toBe('新手')
      expect(LEVEL_TITLES[9]).toBe('学帝')
    })
  })

  describe('getLevel (纯函数)', () => {
    it('0 XP → L1', () => {
      expect(getLevel(0)).toBe(1)
    })

    it('49 XP → L1 (未达 L2)', () => {
      expect(getLevel(49)).toBe(1)
    })

    it('50 XP → L2', () => {
      expect(getLevel(50)).toBe(2)
    })

    it('极大 XP → L10 满级', () => {
      expect(getLevel(99999)).toBe(10)
    })

    it('3000 XP → L10 边界', () => {
      expect(getLevel(3000)).toBe(10)
    })
  })

  describe('computeStateFromXP (纯函数)', () => {
    it('初始 0 XP: level=1, progress=0, isMaxLevel=false', () => {
      const s = computeStateFromXP(0)
      expect(s.level).toBe(1)
      expect(s.levelTitle).toBe('新手')
      expect(s.progress).toBe(0)
      expect(s.isMaxLevel).toBe(false)
      expect(s.nextLevelThreshold).toBe(50)
      expect(s.nextLevelXP).toBe(50)
    })

    it('25 XP (L1 进度一半): progress ≈ 0.5', () => {
      const s = computeStateFromXP(25)
      expect(s.level).toBe(1)
      expect(s.progress).toBeCloseTo(0.5, 1)
    })

    it('3000+ XP 满级: isMaxLevel=true', () => {
      const s = computeStateFromXP(3000)
      expect(s.level).toBe(10)
      expect(s.levelTitle).toBe('学帝')
      expect(s.isMaxLevel).toBe(true)
      expect(s.progress).toBe(1)
    })
  })

  describe('addXP (持久化 + 升级检测)', () => {
    it('初次加 XP: leveledUp=false (L1 → L1)', async () => {
      const r = await addXP(5, 'LEARN')
      expect(r.totalXP).toBe(5)
      expect(r.level).toBe(1)
      expect(r.leveledUp).toBe(false)
      expect(r.prevLevel).toBe(1)
    })

    it('跨级升级: 一次加 60 XP → L2', async () => {
      const r = await addXP(60, 'STREAK')
      expect(r.totalXP).toBe(60)
      expect(r.level).toBe(2)
      expect(r.leveledUp).toBe(true)
      expect(r.prevLevel).toBe(1)
    })

    it('多次小步累加: 5+5+5+5+5+5 = 30 (未升级)', async () => {
      for (let i = 0; i < 6; i++) {
        await addXP(5, 'LEARN')
      }
      const s = getXPState()
      expect(s.totalXP).toBe(30)
      expect(s.level).toBe(1)
    })

    it('负数/0 XP: 不变, leveledUp=false', async () => {
      await addXP(50, 'LEARN')
      const before = getXPState().totalXP
      const r = await addXP(0, 'LEARN')
      expect(r.totalXP).toBe(before)
      expect(r.leveledUp).toBe(false)
    })
  })

  describe('getXPState (持久化读)', () => {
    it('初始空 storage → totalXP=0, level=1', () => {
      const s = getXPState()
      expect(s.totalXP).toBe(0)
      expect(s.level).toBe(1)
      expect(s.levelTitle).toBe('新手')
    })

    it('加 XP 后 getXPState 持久化生效', async () => {
      await addXP(100, 'STREAK')
      const s = getXPState()
      expect(s.totalXP).toBe(100)
      expect(s.level).toBe(2)  // 50 < 100 < 150 → L2
    })

    it('历史保留最近 200 条', async () => {
      for (let i = 0; i < 210; i++) {
        await addXP(1, 'FAVORITE')
      }
      const raw = localStorage.getItem(STORAGE_KEY)!
      const data = JSON.parse(raw)
      expect(data.history.length).toBe(200)
      expect(data.totalXP).toBe(210)
    })
  })

  describe('resetXP', () => {
    it('重置后 totalXP=0', async () => {
      await addXP(100, 'LEARN')
      resetXP()
      const s = getXPState()
      expect(s.totalXP).toBe(0)
      expect(s.level).toBe(1)
    })

    it('重置清空 localStorage key', async () => {
      await addXP(50, 'LEARN')
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
      resetXP()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('异常鲁棒性', () => {
    it('损坏 JSON → fallback 0 XP', () => {
      localStorage.setItem(STORAGE_KEY, '{broken json')
      const s = getXPState()
      expect(s.totalXP).toBe(0)
      expect(s.level).toBe(1)
    })

    it('缺失字段 → fallback 0 XP', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))
      const s = getXPState()
      expect(s.totalXP).toBe(0)
    })
  })
})
