// translationFavCrossPage.test.ts - 释义收藏 跨页 集成 测试 (W102)
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import React from 'react'
import WordCard from '../src/components/WordCard'
import type { Word } from '../src/types'

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
    expect(container.textContent).toContain('⭐ 2 收藏')
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
