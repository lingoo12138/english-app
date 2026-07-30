// CustomSceneLearn.tsx - v1.15.0 自定义场景学习流
// 卡片翻页 + TTS + 释义/例句 + 收藏 toggle + 进度持久化
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslate } from '../lib/useTranslate'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCustomSceneById, type CustomScene } from '../lib/customScenes'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'
import { addSceneWordsToReview } from '../lib/sceneReview'
import { toast } from '../components/Toast'
import TTSButton from '../components/TTSButton'

const PROGRESS_KEY = (id: number) => `customScene-${id}-progress`

export default function CustomSceneLearn() {
  const { t } = useTranslate()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scene, setScene] = useState<CustomScene | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [favMap, setFavMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // 加载场景 + 恢复进度
  useEffect(() => {
    if (!id) return
    setLoading(true)
    const sceneId = parseInt(id, 10)
    getCustomSceneById(sceneId)
      .then(async (s) => {
        if (!s) {
          toast.error('场景不存在')
          navigate('/custom-scenes')
          return
        }
        setScene(s)
        // 恢复进度
        try {
          const saved = localStorage.getItem(PROGRESS_KEY(sceneId))
          if (saved) {
            const idx = parseInt(saved, 10)
            if (!isNaN(idx) && idx >= 0 && idx < s.words.length) {
              setCurrentIdx(idx)
            }
          }
        } catch (e) {
          // ignore
        }
        // 检查收藏状态
        const fav: Record<string, boolean> = {}
        for (const w of s.words) {
          fav[w.word] = await isFavorite(w.word)
        }
        setFavMap(fav)
      })
      .catch(e => console.error('[CustomSceneLearn] load failed:', e))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // 持久化进度
  useEffect(() => {
    if (!scene || !id) return
    try {
      localStorage.setItem(PROGRESS_KEY(parseInt(id, 10)), String(currentIdx))
    } catch (e) {
      // ignore
    }
  }, [currentIdx, scene, id])

  const currentWord = useMemo(() => {
    if (!scene) return null
    return scene.words[currentIdx] || null
  }, [scene, currentIdx])

  const isComplete = useMemo(() => {
    if (!scene) return false
    return currentIdx >= scene.words.length
  }, [scene, currentIdx])

  const handleNext = useCallback(() => {
    if (!scene) return
    if (currentIdx < scene.words.length) {
      setCurrentIdx(i => i + 1)
      setShowAnswer(false)
    }
  }, [scene, currentIdx])

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
      setShowAnswer(false)
    }
  }, [currentIdx])

  const handleFlip = useCallback(() => {
    setShowAnswer(s => !s)
  }, [])

  const handleToggleFav = useCallback(async (word: string) => {
    try {
      if (favMap[word]) {
        await removeFavorite(word)
        setFavMap(m => ({ ...m, [word]: false }))
      } else {
        await addFavorite(word)
        setFavMap(m => ({ ...m, [word]: true }))
        toast.success(`⭐ ${word} 已加入生词本`)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message || '操作失败')
    }
  }, [favMap])

  const handleReset = useCallback(() => {
    if (!scene || !id) return
    if (!confirm('重置学习进度, 从头开始?')) return
    setCurrentIdx(0)
    setShowAnswer(false)
    try {
      localStorage.removeItem(PROGRESS_KEY(parseInt(id, 10)))
    } catch (e) {
      // ignore
    }
  }, [scene, id])

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading || isComplete) return
      if (e.key === ' ') {
        e.preventDefault()
        handleFlip()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleFlip, handleNext, handlePrev, loading, isComplete])

  if (loading) {
    return <div className="text-center py-8 text-stone-500">⏳ 加载中...</div>
  }

  if (!scene) return null

  // 完成态 - v1.16.0: 入复习
  if (isComplete) {
    const handleFinishAndReview = async () => {
      try {
        const result = await addSceneWordsToReview(scene.words, scene.title)
        if (result.added > 0) {
          toast.success(`🎉 ${result.added} 词已加入复习队列`)
        } else if (result.skipped > 0) {
          toast.success(`已在复习中 (${result.skipped} 词)`)
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('入复习失败:', err)
        toast.error(err.message || '入复习失败')
      }
    }
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">{t('customlearn.done')}</h1>
          <p className="text-stone-500 dark:text-stone-400 mb-6">
            你已完成 <strong>{scene.title}</strong> 的 {scene.words.length} 个生词
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={handleFinishAndReview}
              className="btn-primary text-sm"
              aria-label="加入复习"
            >
              📚 加入复习队列
            </button>
            <button
              onClick={handleReset}
              className="btn-ghost text-sm"
              aria-label="重新学习"
            >
              🔄 再学一遍
            </button>
            <Link to={`/custom-scenes/${scene.id}`} className="btn-ghost text-sm">
              ← 返回详情
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!currentWord) return null

  const progress = ((currentIdx + 1) / scene.words.length) * 100
  const isFav = favMap[currentWord.word] || false

  return (
    <div className="space-y-4">
      {/* 顶部进度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold">📚 {scene.title}</h1>
            <p className="text-xs text-stone-500">
              {currentIdx + 1} / {scene.words.length}
            </p>
          </div>
          <Link to={`/custom-scenes/${scene.id}`} className="btn-ghost text-xs">
            ← 返回
          </Link>
        </div>
        <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 词卡 */}
      <button
        onClick={handleFlip}
        className="w-full card text-center py-12 cursor-pointer hover:shadow-md transition-shadow min-h-[280px] flex flex-col items-center justify-center"
        aria-label={showAnswer ? '隐藏释义' : '显示释义'}
      >
        <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
          {currentWord.word}
        </div>
        <div className="text-xs px-2 py-0.5 bg-stone-200 dark:bg-stone-700 rounded mb-4">
          {currentWord.difficulty}
        </div>
        {showAnswer ? (
          <div className="space-y-2 mt-2 max-w-md">
            <div className="text-base text-stone-700 dark:text-stone-300">
              {currentWord.translation}
            </div>
            <div className="text-sm text-stone-500 dark:text-stone-400 italic">
              "{currentWord.example}"
            </div>
            <div className="text-xs text-stone-400 mt-2">
              (点击或按空格翻面)
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone-400 mt-4">
            (点击或按空格查看释义)
          </div>
        )}
      </button>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="btn-ghost text-sm disabled:opacity-30"
          aria-label="上一词"
        >
          ← 上一词
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleFav(currentWord.word)}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label={isFav ? `取消收藏 ${currentWord.word}` : `收藏 ${currentWord.word}`}
          >
            {isFav ? '⭐' : '☆'}
          </button>
          <TTSButton text={currentWord.word} size="sm" />
        </div>
        <button
          onClick={handleNext}
          className="btn-primary text-sm"
          aria-label={currentIdx === scene.words.length - 1 ? '完成' : '下一词'}
        >
          {currentIdx === scene.words.length - 1 ? '✓ 完成' : '下一词 →'}
        </button>
      </div>

      {/* 重置 */}
      <div className="text-center">
        <button
          onClick={handleReset}
          className="text-xs text-stone-400 hover:underline"
          aria-label="重置进度"
        >
          🔄 重置进度
        </button>
      </div>
    </div>
  )
}
