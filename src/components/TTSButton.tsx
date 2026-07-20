// 通用 TTS 按钮组件
// 修复: setInterval 清理(useEffect) + 卸载时 cancel
// 修复: A.3 提取重复的 speak / 慢速切换 逻辑
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
  const isSlowRef = useRef(false)  // A.8: 解决 setIsSlow 闭包陷阱
  const checkIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      // 卸载时清理所有资源
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      stopSpeak()
    }
  }, [])

  // 提取: 实际播放(慢速 / 常速)
  const play = useCallback(() => {
    if (isSlowRef.current) speakSlow(text)
    else speak({ text })
  }, [text])

  const stop = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }
    stopSpeak()
  }, [])

  const handleClick = () => {
    // 修复: 检测 TTS 是否可用,不支持时提示
    if (!('speechSynthesis' in window)) {
      alert('当前浏览器不支持语音朗读,请换 Chrome/Edge/Safari')
      return
    }
    if (isPlaying) {
      setIsPlaying(false)
      stop()
      return
    }
    setIsPlaying(true)
    play()

    // 监听朗读结束
    checkIntervalRef.current = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsPlaying(false)
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
          checkIntervalRef.current = null
        }
      }
    }, 300)
  }

  const toggleSlow = () => {
    const next = !isSlow
    isSlowRef.current = next  // 同步 ref
    setIsSlow(next)
    if (isPlaying) {
      stop()
      if (next) speakSlow(text)
      else speak({ text })
    }
  }

  const sizeClass = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
  }[size]

  if (variant === 'text') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          className="btn-ghost flex items-center gap-1.5"
        >
          <span>{isPlaying ? '⏸' : '🔊'}</span>
          <span>朗读</span>
        </button>
        <button
          onClick={toggleSlow}
          className={`text-xs px-2 py-1 rounded ${isSlow ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-stone-500'}`}
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
    >
      {isPlaying ? '⏸' : '🔊'}
    </button>
  )
}
