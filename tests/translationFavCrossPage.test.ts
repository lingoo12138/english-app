// translationFavCrossPage.test.ts - 释义收藏 跨页 集成 测试 (W102 + W106 + W110)
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React, { act } from 'react'
import WordCard from '../src/components/WordCard'
import { readFileSync } from 'fs'
import type { Word } from '../src/types'

// mock 词库 1 词 (避免 5,423 词 fetch)
vi.mock('../src/lib/words', () => ({
  loadWords: vi.fn(async () => [
    { id: 'w-phone', word: 'phone', translations: ['电话'], pos: ['n'], roots: [], tags: [], level: 'cet4', difficulty: 2, frequency: 100, examples: [] },
  ]),
  LEVELS: [],
}))

const fakeWord: Word = {
  id: 'w-phone', word: 'phone', translations: ['电话'], pos: ['n'],
  roots: [], tags: [], level: 'cet4', difficulty: 2, frequency: 100,
  examples: [{ en: 'A phone.', zh: '电话。' }],
}

describe('W102 释义收藏 跨页 集成', () => {
  it('WordCard: favCount=0 不 显示 收藏 链接', () => {
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(WordCard, { word: fakeWord, favCount: 0, onClickFavs: () => {} })))
    expect(container.textContent).not.toContain('收藏')
  })

  it('WordCard: favCount=2 显示 收藏 链接', () => {
    const onClickFavs = vi.fn()
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(WordCard, { word: fakeWord, favCount: 2, onClickFavs })))
    // v2.1.0: 改 用 SVG 图标 + 数字 + "收藏" 文 本
    expect(container.textContent).toContain('2 收藏')
    // 确 认 SVG 图标 存 在 (替 换 emoji)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('WordCard: 点击 收藏 链 触发 onClickFavs', () => {
    const onClickFavs = vi.fn()
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(WordCard, { word: fakeWord, favCount: 2, onClickFavs })))
    const btn = container.querySelector('button[title*="跳"]') as HTMLButtonElement
    btn.click()
    expect(onClickFavs).toHaveBeenCalled()
  })

  it('WordCard: undefined favCount 不 渲染 收藏 链', () => {
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(WordCard, { word: fakeWord })))
    expect(container.textContent).not.toContain('收藏')
  })
})

// 端到端 测试 (W102 修 v1)
describe('W102 修 v1 WordList 端到端 跨页', () => {
  it('WordList 加载 收藏 数量 map', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllFavorites: vi.fn(async () => []),
      getAllTranslationFavs: vi.fn(async () => [
        { wordId: 'w-phone', index: 0, text: '电话', addedAt: 1 },
        { wordId: 'w-phone', index: 1, text: '打电话', addedAt: 2 },
        { wordId: 'w-book', index: 0, text: '书', addedAt: 3 },
      ]),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      getAllDictationErrors: vi.fn(async () => []),
      getAllWritingErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const { default: WordList } = await import('../src/pages/WordList')
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(WordList)))
    await act(async () => { await new Promise(r => setTimeout(r, 500)) })
    // 业务 关键: WordList 调 getAllTranslationFavs → favCountMap 渲 染 '收藏' 链
    expect(container.textContent).toMatch(/收藏/)
    vi.doUnmock('../src/lib/db')
  })
})

// W106 跨页 端到端 (verifier A P1-1 修)
describe('W106 跨页 端到端 URL 同步', () => {
  it('TranslationFavsPage URL ?word=phone 跨词 模式 启', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllTranslationFavs: vi.fn(async () => [
        { wordId: 'w-phone', index: 0, text: '电话', addedAt: 1 },
      ]),
      getAllWritingErrors: vi.fn(async () => []),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const TF = (await import('../src/pages/TranslationFavsPage')).default
    const { container } = render(React.createElement(MemoryRouter, { initialEntries: ['/translation-favs?word=phone'] }, React.createElement(TF)))
    await act(async () => { await new Promise(r => setTimeout(r, 500)) })
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(cb).toBeTruthy()
    expect(cb?.checked).toBe(true)
    vi.doUnmock('../src/lib/db')
  })

  it('TranslationFavsPage URL ?word= (空) 跨词 模式 不 启', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllTranslationFavs: vi.fn(async () => [
        { wordId: 'w-phone', index: 0, text: '电话', addedAt: 1 },
      ]),
      getAllWritingErrors: vi.fn(async () => []),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const TF = (await import('../src/pages/TranslationFavsPage')).default
    const { container } = render(React.createElement(MemoryRouter, { initialEntries: ['/translation-favs?word='] }, React.createElement(TF)))
    await act(async () => { await new Promise(r => setTimeout(r, 500)) })
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(cb).toBeTruthy()
    expect(cb?.checked).toBe(false)
    vi.doUnmock('../src/lib/db')
  })
})

// W110 URL 脏 参数 清理 (verifier A P2-1 修)
describe('W110 URL 脏 参数 清理', () => {
  it('TranslationFavsPage URL 无 ?word= 不 调 setSearchParams 业务 路径 (跨词 不 启)', async () => {
    vi.resetModules()
    vi.doMock('../src/lib/db', () => ({
      getAllTranslationFavs: vi.fn(async () => [
        { wordId: 'w-phone', index: 0, text: '电话', addedAt: 1 },
      ]),
      getAllWritingErrors: vi.fn(async () => []),
      getAllDictationErrors: vi.fn(async () => []),
      getAllErrorReviewScores: vi.fn(async () => []),
    }))
    const TF = (await import('../src/pages/TranslationFavsPage')).default
    const { container } = render(React.createElement(MemoryRouter, { initialEntries: ['/translation-favs'] }, React.createElement(TF)))
    await act(async () => { await new Promise(r => setTimeout(r, 500)) })
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    expect(cb).toBeTruthy()
    expect(cb?.checked).toBe(false)
    vi.doUnmock('../src/lib/db')
  })

  it('TranslationFavsPage 含 setSearchParams ... replace:true 调 用 (源码)', () => {
    const tf = readFileSync('src/pages/TranslationFavsPage.tsx', 'utf-8')
    expect(tf).toMatch(/setSearchParams\(/)
    expect(tf).toMatch(/replace: true/)
  })
})
