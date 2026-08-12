// tests/w143-daily-skeleton.test.tsx - W143 LCP 优化: Home 每日一词 Skeleton 占位
// 业务: W142 Lighthouse baseline LCP 6.9s (fail ≤4s). LCP element 是 p 例句
//       仅在 loadWords() 解析 6.3MB JSON 后才出现, 导致 97% Render Delay.
//       W143 方案: 拆出 DailyWordCard, 初始 Skeleton, LCP element 立即 paint, 真实数据 async 替换.
// 注意: 文件用 .tsx (因 RTL 需要 JSX), 且不依赖 @testing-library/jest-dom (0 npm install 原则)
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import DailyWordCard from '../src/components/home/DailyWordCard'
import type { Word } from '../src/types'

// 构造测试用 word
const fakeWord: Word = {
  id: 'w-test',
  word: 'abandon',
  phonetic: '/əˈbændən/',
  pos: ['v'],
  translations: ['放弃', '抛弃'],
  examples: [
    { en: 'They had to abandon the car in the snow.', zh: '他们不得不在雪中弃车。' },
  ],
  tags: ['CET4'],
  level: 'cet4',
  difficulty: 2,
  frequency: 3,
}

describe('W143 DailyWordCard Skeleton 占位 (LCP 立即 paint)', () => {
  it('isLoading=true → 渲染 Skeleton 占位, 含 LCP element 占位 p', () => {
    // 业务: 初始 Skeleton, LCP element (p 固定高度) 立即 paint
    const { container } = render(
      <MemoryRouter>
        <DailyWordCard
          word={null}
          isLoading={true}
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    // 1. Skeleton 占位 p 渲染 (data-testid=daily-word-skeleton-p)
    const skeletonP = screen.getByTestId('daily-word-skeleton-p')
    expect(skeletonP).toBeTruthy()
    expect(skeletonP.tagName).toBe('P')
    // 2. 占位 p 有 min-h-[2.5rem] (固定高度, 立即 paint)
    expect(skeletonP.className).toContain('min-h-[2.5rem]')
    expect(skeletonP.className).toContain('line-clamp-2')
    // 3. 卡片 aria-busy=true
    const card = container.querySelector('[aria-busy="true"]')
    expect(card).toBeTruthy()
    // 4. 收藏按钮 disabled (Skeleton 状态)
    const favBtn = screen.getByLabelText('收藏') as HTMLButtonElement
    expect(favBtn.disabled).toBe(true)
    // 5. Skeleton 包含 animate-pulse (脉冲灰色)
    const pulseEl = container.querySelector('.animate-pulse')
    expect(pulseEl).toBeTruthy()
  })

  it('isLoading=false + word → 渲染真实数据, 替换 Skeleton', () => {
    // 业务: loadWords 完成 → setLoading(false) → 真实数据替换
    render(
      <MemoryRouter>
        <DailyWordCard
          word={fakeWord}
          isLoading={false}
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    // 1. 真实 p 例句渲染
    const realP = screen.getByTestId('daily-word-real-p')
    expect(realP).toBeTruthy()
    expect(realP.textContent).toBe('They had to abandon the car in the snow.')
    // 2. 真实 word 标题
    expect(screen.getByRole('heading', { name: 'abandon' })).toBeTruthy()
    // 3. Skeleton p 不存在 (已替换)
    expect(screen.queryByTestId('daily-word-skeleton-p')).toBeNull()
    // 4. 收藏按钮可点
    const favBtn = screen.getByLabelText('收藏') as HTMLButtonElement
    expect(favBtn.disabled).toBe(false)
  })

  it('isLoading=false 但 word=null → 仍渲染 Skeleton (无数据 fallback)', () => {
    // 业务: 防御性编程, word 为 null 时也走 Skeleton
    render(
      <MemoryRouter>
        <DailyWordCard
          word={null}
          isLoading={false}
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByTestId('daily-word-skeleton-p')).toBeTruthy()
    expect(screen.queryByTestId('daily-word-real-p')).toBeNull()
  })

  it('isFavorite=true → 渲染实心 ⭐ (而不是空心 ☆)', () => {
    // 业务: 收藏状态切换
    render(
      <MemoryRouter>
        <DailyWordCard
          word={fakeWord}
          isLoading={false}
          isFavorite={true}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('取消收藏')).toBeTruthy()
  })

  it('点击收藏按钮 → 触发 onToggleFavorite 回调', () => {
    // 业务: 收藏交互
    const onToggle = vi.fn()
    render(
      <MemoryRouter>
        <DailyWordCard
          word={fakeWord}
          isLoading={false}
          isFavorite={false}
          onToggleFavorite={onToggle}
        />
      </MemoryRouter>
    )
    const favBtn = screen.getByLabelText('收藏')
    favBtn.click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('切换 isLoading false → 真实数据替换 (无残留 Skeleton)', () => {
    // 业务: 状态切换的完整性 - 模拟 React rerender
    const { rerender } = render(
      <MemoryRouter>
        <DailyWordCard
          word={null}
          isLoading={true}
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    // 初始: Skeleton
    expect(screen.getByTestId('daily-word-skeleton-p')).toBeTruthy()

    // 切到真实数据 (不 cleanup, 直接 rerender)
    rerender(
      <MemoryRouter>
        <DailyWordCard
          word={fakeWord}
          isLoading={false}
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )
    // 验证: Skeleton 消失, 真实数据出现
    expect(screen.queryByTestId('daily-word-skeleton-p')).toBeNull()
    expect(screen.getByTestId('daily-word-real-p')).toBeTruthy()
  })
})

describe('W143 Home.tsx 集成 (Skeleton 状态机)', () => {
  const home = readFileSync('src/pages/Home.tsx', 'utf-8')

  it('Home 引入 DailyWordCard 子组件', () => {
    // 业务: Home.tsx 不再内联每日一词, 改用子组件
    expect(home).toMatch(/import\s+DailyWordCard\s+from\s+['"]\.\.\/components\/home\/DailyWordCard['"]/)
  })

  it('Home 加 wordLoading 状态 (默认 true)', () => {
    // 业务: 初始 Skeleton, 加载完 false
    expect(home).toMatch(/wordLoading/)
    expect(home).toMatch(/useState\(true\)/)
  })

  it('Home 在 loadWords().then() 末尾 setWordLoading(false)', () => {
    // 业务: 加载完 → 关闭 Skeleton
    expect(home).toMatch(/setWordLoading\(false\)/)
  })

  it('Home 不再内联每日一词的 wordOfDay 判断 ({wordOfDay && (...))', () => {
    // 业务: Home 不再自己判断 wordOfDay 渲染整块, 改交给 DailyWordCard 处理
    // 旧版: {wordOfDay && (<div className="card">...</div>)}
    // 新版: <DailyWordCard word={wordOfDay} ... />
    expect(home).not.toMatch(/\{wordOfDay\s*&&\s*\(\s*[\s\S]{0,40}?className="card"/)
  })

  it('Home 把 wordOfDay/wordLoading/fav 传给 DailyWordCard', () => {
    // 业务: 数据流 - word/loading/fav/onToggleFavorite 4 props
    expect(home).toMatch(/<DailyWordCard[\s\S]*?word=\{wordOfDay\}/)
    expect(home).toMatch(/isLoading=\{wordLoading\}/)
    expect(home).toMatch(/isFavorite=\{fav\}/)
    expect(home).toMatch(/onToggleFavorite=\{toggleFav\}/)
  })
})

describe('W143 DailyWordCard.tsx 源码 (Skeleton 实现)', () => {
  const card = readFileSync('src/components/home/DailyWordCard.tsx', 'utf-8')

  it('DailyWordCard 接受 isLoading prop 控制 Skeleton 切换', () => {
    // 业务: Skeleton 状态机
    expect(card).toMatch(/interface\s+Props[\s\S]*?isLoading:\s*boolean/)
  })

  it('DailyWordCard Skeleton 分支渲染固定高度 p (LCP element 立即 paint)', () => {
    // 业务: LCP element 关键 - 固定高度 p, 立即 paint
    expect(card).toMatch(/if\s*\(isLoading\s*\|\|\s*!word\)/)
    expect(card).toMatch(/min-h-\[2\.5rem\]/)
    expect(card).toMatch(/line-clamp-2/)
  })

  it('DailyWordCard 用 animate-pulse (Tailwind 内置, 0 额外依赖)', () => {
    // 业务: 0 额外依赖, 跟现有 Skeleton.tsx 风格一致
    expect(card).toContain('animate-pulse')
  })

  it('DailyWordCard aria-busy=true (a11y: 加载中状态)', () => {
    // 业务: 屏幕阅读器友好
    expect(card).toMatch(/aria-busy="true"/)
    expect(card).toMatch(/aria-label="每日一词加载中"/)
  })

  it('DailyWordCard Skeleton 分支收藏按钮 disabled (无数据不能交互)', () => {
    // 业务: 防御性 - Skeleton 状态下收藏按钮不可点
    expect(card).toMatch(/<button[\s\S]*?disabled[\s\S]*?aria-label="收藏"/)
  })
})
