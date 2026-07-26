// tests/darkMode.test.ts - v1.39.0 W37-3 暗色模式优化
// v1.40.0 W40: isDarkMode/toggleDarkMode/initDarkMode 已删 (死路径), 仅测 applyContrastFix
import { describe, it, expect, beforeEach } from 'vitest'
import { applyContrastFix } from '../src/lib/themes'

describe('darkMode (v1.39.0-W37-3 + v1.40.0-W40)', () => {
  beforeEach(() => {
    const styleEl = document.getElementById('dark-contrast-fix')
    if (styleEl) styleEl.textContent = ''
  })

  describe('applyContrastFix', () => {
    it('暗色模式注入 style', () => {
      applyContrastFix(true)
      const el = document.getElementById('dark-contrast-fix')!
      expect(el.textContent).toContain('.dark')
    })
    it('浅色模式清空', () => {
      applyContrastFix(true)
      applyContrastFix(false)
      const el = document.getElementById('dark-contrast-fix')!
      expect(el.textContent).toBe('')
    })
    it('idempotent: 多次调用仅 1 个 style 标签', () => {
      applyContrastFix(true)
      applyContrastFix(false)
      applyContrastFix(true)
      const els = document.querySelectorAll('#dark-contrast-fix')
      expect(els.length).toBe(1)
    })
  })
})
