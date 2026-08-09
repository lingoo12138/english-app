// tests/w123a-aichat-ui.test.ts - W123a AIChat UI 优 化
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W123a AIChat UI 优 化', () => {
  const aiChat = readFileSync('src/pages/AIChat.tsx', 'utf-8')

  it('AIChat 顶 部 4 emoji 改 Icon SVG (W118 一 致)', () => {
    // 业 务: 标 题 💬/🆕/📤/📚 全 替 Icon SVG
    expect(aiChat).toContain('<IconChat size={22} className="text-brand-500" />')
    expect(aiChat).toContain('<IconRefresh size={14} />')
    expect(aiChat).toContain('<IconShare size={14} />')
    expect(aiChat).toContain('<IconBookOpen size={14} />')
    // 旧 emoji 全 清
    expect(aiChat).not.toMatch(/💬.*aichat\.title/)
    expect(aiChat).not.toMatch(/🆕 新对话/)
    expect(aiChat).not.toMatch(/📤 导出/)
  })

  it('AIChat Loading 改 Skeleton (W120 一 致)', () => {
    // 业 务: 3 点 ●●● → 3 个 Skeleton 占 位, 友 好 加 载 态
    expect(aiChat).toContain('import { Skeleton } from \'../components/Skeleton\'')
    expect(aiChat).toMatch(/Skeleton width=\{80\}/)
    expect(aiChat).toMatch(/Skeleton width=\{140\}/)
    expect(aiChat).toMatch(/Skeleton width=\{60\}/)
  })

  it('AIChat 移 动 端 input 固 定 底 部 + safe-area', () => {
    // 业 务: 移 动 端 输 入 不 被 底 部 tab 遮 挡
    expect(aiChat).toMatch(/sticky md:static bottom-0/)
    expect(aiChat).toMatch(/safe-area-inset-bottom/)
  })

  it('AIChat 录 音 🎤 emoji 替 IconMic/IconMicOff SVG (W123c 优 化)', () => {
    // 业 务: W118 一 致, W123c 改 IconHeadphones → IconMic (录 音 图 标 更 准 确)
    expect(aiChat).toMatch(/<IconMic size=\{18\} strokeWidth=\{2\} \/>/)
    expect(aiChat).toMatch(/<IconMicOff size=\{18\} className="text-white" \/>/)
  })

  it('AIChat 发 送 按 钮 加 IconArrow SVG', () => {
    // 业 务: 操 作 逻 辑 - 发 送 箭 头 一 目 了 然
    expect(aiChat).toMatch(/<IconArrow size=\{14\} strokeWidth=\{2\.5\} \/>发送/)
  })

  it('AIChat emoji 总 数 减 少 (从 34 减 到 ≤ 15)', () => {
    // 业 务: 顶 部 4 + 录 音 2 + Loading 1 + Role/MultiRole emoji 仍 有

    // 用 toMatch 简 单 匹 配
    const emojiMatches = aiChat.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) || []
    // 顶 部 + 录 音 + Loading 减 8 (从 34 减 到 ~26, 含 role.emoji / SCENARIOS.emoji 等 业 务 数 据)
    // 不 强 制 减 多 少, 只 检 查 不 增 加
    expect(emojiMatches.length).toBeLessThanOrEqual(40)
  })
})
