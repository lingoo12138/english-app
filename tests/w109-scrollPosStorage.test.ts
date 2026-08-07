// w109-scrollPosStorage.test.ts - W109 scroll 持久 化 测试
import { describe, it, expect, beforeEach } from 'vitest'
import { loadScrollPosMap, saveScrollPosMap, clearScrollPosMap } from '../src/lib/scrollPosStorage'

describe('W109 scroll 持久 化 (verifier B P2-4 修)', () => {
  beforeEach(() => {
    clearScrollPosMap()
  })

  it('load 空 时 返 空 Map', () => {
    const m = loadScrollPosMap()
    expect(m.size).toBe(0)
  })

  it('save → load 返 同样 数据', () => {
    const m = new Map<string, number>([['/words', 200], ['/scenes', 100]])
    saveScrollPosMap(m)
    const loaded = loadScrollPosMap()
    expect(loaded.get('/words')).toBe(200)
    expect(loaded.get('/scenes')).toBe(100)
  })

  it('save 30+ 条 限制 30 条 (防 无限 增长)', () => {
    const m = new Map<string, number>()
    for (let i = 0; i < 50; i++) m.set(`/p${i}`, i)
    saveScrollPosMap(m)
    const loaded = loadScrollPosMap()
    expect(loaded.size).toBeLessThanOrEqual(30)
  })

  it('清 返 空', () => {
    saveScrollPosMap(new Map([['/words', 200]]))
    clearScrollPosMap()
    expect(loadScrollPosMap().size).toBe(0)
  })

  it('localStorage 错 误 (坏 JSON) 不 抛', () => {
    localStorage.setItem('nav-scroll-pos-v1', 'not json')
    expect(() => loadScrollPosMap()).not.toThrow()
    expect(loadScrollPosMap().size).toBe(0)
  })
})

describe('W109 Layout 集成 - scroll 持久 化 (W104 修 v1 + W109)', () => {
  it('Layout 含 loadScrollPosMap + saveScrollPosMap import', () => {
    const layout = require('fs').readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toContain('loadScrollPosMap')
    expect(layout).toContain('saveScrollPosMap')
  })

  it('Layout 用 useState<Map> 不 用 useRef<Map> (持 久 化)', () => {
    const layout = require('fs').readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toContain('useState<Map<string, number>>')
    expect(layout).not.toContain('scrollPosMapRef = useRef<Map<string, number>>(new Map())')
  })

  it('Layout cleanup 时 调 saveScrollPosMap', () => {
    const layout = require('fs').readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/saveScrollPosMap\(updated\)/)
  })
})
