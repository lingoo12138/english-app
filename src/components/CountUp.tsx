// W149 反馈 11: 数字 count up 动效
// 业务: XP / streak / 进度变化时, 数字 smooth 滚动 (0 → target), 反馈成就感
// 用法: <CountUp value={xpState.level} duration={600} />

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  duration?: number  // ms
  decimals?: number  // 默认 0 (整数)
  className?: string
}

export function CountUp({ value, duration = 600, decimals = 0, className }: CountUpProps) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
        setDisplay(to)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className={className}>{display.toFixed(decimals)}</span>
}
