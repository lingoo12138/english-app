// 通用 TTS 按钮组件
// 修复: 用 onend 事件代替 300ms 轮询(更准且省 CPU)
// 修复: Chrome cancel+speak bug 加 setTimeout 1ms
// 修复: 快速连点用 isStartingRef 互斥,避免 race
import { useState, useEffect, useRef, useCallback } from 'react'
import { speak, speakSlow, stopSpeak } from '../lib/tts'

interface Props {
  text: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'text'
}

export default function TTSButton({ text, size = 'md', variant = 'icon' }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const isSlowRef = useRef(false)
  const isStartingRef = useRef(false)  // 修复: 互斥锁,避免快速连点
  const textRef = useRef(text)
  textRef.current = text

  // 卸载时清理
  useEffect(() => {
    return () => {
      stopSpeak()
    }
  }, [])

  // 提取: 实际播放(慢速 / 常速)
  const play = useCallback(() => {
    // 修复: Chrome 上连续 cancel + speak 会卡死,加 1ms 延迟
    setTimeout(() => {
      if (isSlowRef.current) speakSlow(textRef.current)
      else speak({ text: textRef.current })
    }, 1)
  }, [])

  const stop = useCallback(() => {
    stopSpeak()
  }, [])

  // 修复 P0-4: 监听 tts-end / tts-error 事件,支持所有 TTS 渠道(浏览器 + Edge/Azure/ElevenLabs)
  useEffect(() => {
    if (!isPlaying) return
    const onEnd = () => setIsPlaying(false)
    const onErr = (e: Event) => {
      setIsPlaying(false)
      const detail = (e as CustomEvent).detail
      // 友好提示, 不用 alert 打断
      const msg = detail ? `TTS 错误: ${detail}` : 'TTS 错误'
      // eslint-disable-next-line no-console
      console.error(msg)
    }
    window.addEventListener('tts-end', onEnd)
    window.addEventListener('tts-error', onErr)
    // 浏览器 polling fallback(只对 browser 渠道有用)
    const interval = window.setInterval(() => {
      if (!('speechSynthesis' in window)) return
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        setIsPlaying(false)
        clearInterval(interval)
      }
    }, 200)
    return () => {
      window.removeEventListener('tts-end', onEnd)
      window.removeEventListener('tts-error', onErr)
      clearInterval(interval)
    }
  }, [isPlaying])

  const handleClick = () => {
    if (!('speechSynthesis' in window) && typeof (window as any).Audio === 'undefined') {
      alert('当前浏览器不支持语音朗读,请换 Chrome/Edge/Safari')
      return
    }
    if (isStartingRef.current) return  // 修复: 正在启动中,忽略后续点击
    if (isPlaying) {
      setIsPlaying(false)
      stop()
      return
    }
    isStartingRef.current = true
    setIsPlaying(true)
    play()
    // 短延迟后释放锁(让 start 完成)
    setTimeout(() => { isStartingRef.current = false }, 100)
  }

  const toggleSlow = () => {
    const next = !isSlow
    isSlowRef.current = next
    setIsSlow(next)
    if (isPlaying) {
      stop()
      // 修复: 等 stop 完成再 speak
      setTimeout(() => {
        if (next) speakSlow(textRef.current)
        else speak({ text: textRef.current })
      }, 50)
    }
  }

  const sizeClass = (
    size === 'sm' ? 'w-7 h-7 text-sm' :
    size === 'lg' ? 'w-11 h-11 text-lg' :
    'w-9 h-9 text-base'
  )

  if (variant === 'text') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          className="btn-ghost flex items-center gap-1.5"
          aria-label={isPlaying ? '停止朗读' : '朗读'}
        >
          <span>{isPlaying ? '⏸' : '🔊'}</span>
          <span>朗读</span>
        </button>
        <button
          onClick={toggleSlow}
          className={`text-xs px-2 py-1 rounded ${isSlow ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-stone-500 dark:text-stone-400'}`}
          aria-label={isSlow ? '关闭慢速' : '开启慢速'}
          aria-pressed={isSlow}
        >
          慢速
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`${sizeClass} rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors no-select`}
      aria-label={isPlaying ? '停止' : '朗读'}
      aria-pressed={isPlaying}
    >
      {isPlaying ? '⏸' : '🔊'}
    </button>
  )
}
