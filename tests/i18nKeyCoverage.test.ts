// tests/i18nKeyCoverage.test.ts - v1.45.0 W45 静态扫 t() 调用, 验证 DICT 完整
// 防止 v1.43 W43-C 漏修的 P1-1 (CardReview 26 key 但 DICT 只 5 个) 复现
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { t, setLocale } from '../src/lib/i18n'

/** 扫 src/pages 全 tsx 找所有 t 函数 'xxx' / "xxx" 调用 */
function scanTCalls(): Set<string> {
  const result = new Set<string>()
  const pagesDir = 'src/pages'
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const s = statSync(full)
      if (s.isDirectory()) walk(full)
      else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
        const content = readFileSync(full, 'utf-8')
        // 匹配 t 函数 'xxx' 和 t 函数 "xxx"
        const matches = content.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)
        for (const m of matches) result.add(m[1])
      }
    }
  }
  walk(pagesDir)
  return result
}

describe('i18nKeyCoverage (v1.45.0-W45)', () => {
  it('所有 t() 调用的 key 在 zh DICT 都能找到', () => {
    const keys = scanTCalls()
    expect(keys.size).toBeGreaterThan(20)  // 至少 20 个 key

    setLocale('zh')
    const missing: string[] = []
    for (const k of keys) {
      // t() 返 key 本身 = 找不到
      if (t(k, 'zh') === k) missing.push(k)
    }
    expect(missing, `DICT zh 缺 ${missing.length} key: ${missing.slice(0, 5).join(', ')}`).toEqual([])
  })

  it('所有 t() 调用的 key 在 en DICT 都能找到', () => {
    const keys = scanTCalls()

    setLocale('en')
    const missing: string[] = []
    for (const k of keys) {
      if (t(k, 'en') === k) missing.push(k)
    }
    expect(missing, `DICT en 缺 ${missing.length} key: ${missing.slice(0, 5).join(', ')}`).toEqual([])
  })

  it('扫到 20+ key (sanity)', () => {
    const keys = scanTCalls()
    expect(keys.size).toBeGreaterThanOrEqual(20)
  })

  it('zh/en 同 key 数量一致 (防漏翻)', () => {
    const keys = scanTCalls()
    // 间接: 通过 t() 返 key 自身, 验证
    setLocale('zh')
    const zhMiss = [...keys].filter(k => t(k, 'zh') === k).length
    setLocale('en')
    const enMiss = [...keys].filter(k => t(k, 'en') === k).length
    expect(zhMiss).toBe(enMiss)  // 漏翻应当一致
  })
})
