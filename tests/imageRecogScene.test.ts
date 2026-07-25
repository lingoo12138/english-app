// tests/imageRecogScene.test.ts - v1.12.0-A 拍照识物多场景
import { describe, it, expect } from 'vitest'
import {
  getScenePrompt,
  SCENE_PROMPTS,
  SCENE_OPTIONS,
  recognizeImageWithScene,
  type ImageScene,
} from '../src/lib/imageRecog'

describe('imageRecog 场景 (v1.12.0-A)', () => {
  describe('SCENE_PROMPTS', () => {
    it('7 个场景都有 prompt', () => {
      const scenes: ImageScene[] = ['general', 'office', 'food', 'animal', 'plant', 'furniture', 'tool']
      for (const s of scenes) {
        expect(SCENE_PROMPTS[s]).toBeTruthy()
        expect(SCENE_PROMPTS[s].length).toBeGreaterThan(10)
      }
    })

    it('general 含 "通用" 或 fallback', () => {
      const p = SCENE_PROMPTS.general
      expect(p).toBeTruthy()
    })

    it('food 含食物相关词', () => {
      const p = SCENE_PROMPTS.food.toLowerCase()
      expect(p).toMatch(/food|食物|apple|banana/)
    })

    it('office 含办公相关词', () => {
      const p = SCENE_PROMPTS.office.toLowerCase()
      expect(p).toMatch(/office|办公|pen|paper/)
    })
  })

  describe('SCENE_OPTIONS', () => {
    it('应含 7 个选项', () => {
      expect(SCENE_OPTIONS.length).toBe(7)
    })

    it('每项有 value/label/emoji', () => {
      for (const opt of SCENE_OPTIONS) {
        expect(opt.value).toBeTruthy()
        expect(opt.label).toBeTruthy()
        expect(opt.emoji).toBeTruthy()
      }
    })
  })

  describe('getScenePrompt', () => {
    it('应返回对应场景的 prompt', () => {
      expect(getScenePrompt('food')).toBe(SCENE_PROMPTS.food)
      expect(getScenePrompt('tool')).toBe(SCENE_PROMPTS.tool)
    })

    it('未知场景返 general fallback', () => {
      // @ts-expect-error - 测试无效入参
      const p = getScenePrompt('nonexistent')
      expect(p).toBe(SCENE_PROMPTS.general)
    })

    it('默认参数 (无 scene) 返 general', () => {
      expect(getScenePrompt()).toBe(SCENE_PROMPTS.general)
    })
  })

  describe('recognizeImageWithScene 集成', () => {
    it('mock 渠道应返非空结果', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const result = await recognizeImageWithScene(
        'data:image/png;base64,iVBORw0KGgo=',
        mockProvider,
        '',
        'mock',
        'food',
        '找苹果',
      )
      // 至少返回结构
      expect(result).toHaveProperty('items')
      expect(Array.isArray(result.items)).toBe(true)
    })
  })
})
