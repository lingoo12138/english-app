// tests/wordDetailExampleTTS.test.ts - v1.10.0-C 例句 TTS 跟读
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('WordDetail 例句 TTS 跟读 (v1.10.0-C)', () => {
  it('WordDetail.tsx 应引用 PronunciationPractice', () => {
    const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
    expect(wd).toMatch(/import PronunciationPractice/)
  })

  it('WordDetail.tsx 应有动态 pronounceText state', () => {
    const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
    expect(wd).toMatch(/useState<string>\('\'\)/)
    expect(wd).toMatch(/setPronounceText/)
  })

  it('WordDetail.tsx 单词跟读按钮 onClick 应 setPronounceText(word.word)', () => {
    const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
    expect(wd).toMatch(/onClick=\{\(\) => setPronounceText\(word\.word\)\}/)
  })

  it('WordDetail.tsx 例句跟读按钮 onClick 应 setPronounceText(ex.en)', () => {
    const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
    expect(wd).toMatch(/onClick=\{\(\) => setPronounceText\(ex\.en\)\}/)
  })

  it('WordDetail.tsx 弹窗内 PronunciationPractice 用 word={pronounceText}', () => {
    const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
    expect(wd).toMatch(/<PronunciationPractice word=\{pronounceText\}/)
  })
})
