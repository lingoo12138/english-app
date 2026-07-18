// 通用 TTS 按钮组件
import { useState } from 'react'
import { speak, speakSlow, stopSpeak } from '../lib/tts'

interface Props {
  text: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'text'
}

export default function TTSButton({ text, size = 'md', variant = 'icon' }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSlow, setIsSlow] = useState(false)

  const sizeClass = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg',
  }[size]

  const handleClick = () => {
    if (isPlaying) {
      stopSpeak()
      setIsPlaying(false)
      return
    }
    setIsPlaying(true)
    if (isSlow) speakSlow(text)
    else speak({ text })
    // 简易结束检测
    const id = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsPlaying(false)
        clearInterval(id)
      }
    }, 300)
  }

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
          onClick={() => {
            setIsSlow(!isSlow)
            if (isPlaying) {
              stopSpeak()
              if (!isSlow) speakSlow(text)
              else speak({ text })
            }
          }}
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
