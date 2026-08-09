// tests/w123c-aichat-quick-replies.test.ts - W123c AIChat 操 作 逻 辑 优 化 (快 捷 建议 + IconMic)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W123c AIChat 操 作 逻 辑 优 化', () => {
  const aiChat = readFileSync('src/pages/AIChat.tsx', 'utf-8')
  const icon = readFileSync('src/components/Icon.tsx', 'utf-8')

  it('AIChat 添 加 4 个 快 捷 建议 (新 手 友 好)', () => {
    // 业 务: 空 输 入 + 消 息 ≤ 2 时 显 示, 帮 助 新 手 不 知 道 说 什 么
    expect(aiChat).toContain("'Hello!'")
    expect(aiChat).toContain("'How are you?'")
    expect(aiChat).toContain("'Can you speak slowly?'")
    // 4 个 含 'don't understand' (逃 逸 不 严)
    expect(aiChat).toMatch(/don.t understand/)
  })

  it('快 捷 建议 横 滚 (移 动 端 overflow-x-auto)', () => {
    // 业 务: 移 动 端 不 挤 压 input 区
    expect(aiChat).toMatch(/overflow-x-auto.*scrollbar-hide/s)
    expect(aiChat).toMatch(/flex-shrink-0 px-3 py-1\.5 text-xs/)
  })

  it('快 捷 建议 触 发 setInput (点 击 直 接 填 入)', () => {
    // 业 务: 操 作 逻 辑 - 点 击 = 填 入 input
    expect(aiChat).toMatch(/onClick=\{\(\) => setInput\(suggestion\)\}/)
  })

  it('快 捷 建议 仅 在 空 输 入 + 消 息 ≤ 2 + 不 加 载 时 显 示', () => {
    // 业 务: 避 免 干扰 正 在 输 入 或 消 息 多 时 拥 挤
    expect(aiChat).toMatch(/\{!input\.trim\(\) && messages\.length <= 2 && !loading &&/)
  })

  it('快 捷 建议 配 色 跟 motion token 一 致 (hover 切 换)', () => {
    // 业 务: 跟 W113 motion + W114 渐 变 收 敛 一 致
    expect(aiChat).toMatch(/hover:bg-brand-100 dark:hover:bg-brand-900\/30/)
    expect(aiChat).toMatch(/transition-colors duration-\[var\(--t-fast\)\]/)
  })

  it('Icon 库 加 IconMic + IconMicOff (录 音 图 标 改 良)', () => {
    // 业 务: IconHeadphones 太 抽 象, IconMic 录 音 图 标 更 直 观
    expect(icon).toMatch(/export const IconMic = makeIcon/)
    expect(icon).toMatch(/export const IconMicOff = makeIcon/)
  })

  it('AIChat 录 音 改 IconMic / IconMicOff (替 IconHeadphones)', () => {
    // 业 务: 录 音 状 态 一 目 了 然
    expect(aiChat).toContain('<IconMic size={18} strokeWidth={2} />')
    expect(aiChat).toContain('<IconMicOff size={18} className="text-white" />')
  })
})
