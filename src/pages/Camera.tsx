// 拍照识物页 - 用 LLM 识别图片中的英文单词
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import { recognizeFile, type RecognizedWord } from '../lib/imageRecog'
import { addFavorite, isFavorite } from '../lib/db'
import { useStore } from '../store/useStore'

type Status = 'idle' | 'loading' | 'result' | 'error'

export default function Camera() {
  const navigate = useNavigate()
  const llmApiKey = useStore(s => s.llmApiKey)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [results, setResults] = useState<RecognizedWord[]>([])
  const [hint, setHint] = useState('')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!llmApiKey) {
      setError('请先在 设置 → 图片识别 中填入 OpenRouter API Key')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    setResults([])
    try {
      // 预览
      const url = URL.createObjectURL(file)
      setPreview(url)
      // 识别
      const words = await recognizeFile(file, hint || undefined)
      setResults(words)
      setStatus('result')
      // 查收藏状态
      const favs = new Set<string>()
      for (const w of words) {
        if (w.matchedWord && await isFavorite(w.matchedWord.id)) {
          favs.add(w.matchedWord.id)
        }
      }
      setFavSet(favs)
    } catch (e: any) {
      console.error(e)
      setError(e.message || '识别失败')
      setStatus('error')
    }
  }

  const handleToggleFav = async (w: RecognizedWord) => {
    if (!w.matchedWord) return
    const id = w.matchedWord.id
    if (favSet.has(id)) {
      // 取消收藏
      const { removeFavorite } = await import('../lib/db')
      await removeFavorite(id)
      setFavSet(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      await addFavorite(id)
      setFavSet(prev => new Set(prev).add(id))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">📷 拍照识物</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">拍照或上传图片,AI 帮你识别出英语单词</p>
      </div>

      {!llmApiKey && (
        <div className="card border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">需要先配置 API Key</p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mb-2">
                1. 去 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">openrouter.ai/keys</a> 注册并创建免费 Key<br />
                2. 在 <button onClick={() => navigate('/settings')} className="underline">设置 → 图片识别</button> 中填入
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                默认模型: google/gemini-2.5-flash:free(OpenRouter 免费层)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 提示输入 */}
      <div>
        <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">提示词(可选)</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="例如: 找食物 / 找动物 / 找办公用品"
          className="input"
          disabled={status === 'loading'}
        />
      </div>

      {/* 上传区 */}
      {!preview && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-8"
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="font-medium">拍照</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">或从相册选</div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-8"
          >
            <div className="text-4xl mb-2">🖼️</div>
            <div className="font-medium">上传图片</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">JPG / PNG, 4MB 以内</div>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {/* 预览 + 状态 */}
      {preview && (
        <div className="card">
          <img src={preview} alt="preview" className="w-full rounded-lg mb-3" />
          {status === 'loading' && (
            <div className="text-center py-6 text-stone-500 dark:text-stone-400">
              <div className="text-3xl mb-2">⏳</div>
              <div>AI 正在识别...(<span className="text-xs">约 5-10 秒</span>)</div>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="card border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* 识别结果 */}
      {status === 'result' && results.length === 0 && (
        <div className="card text-center text-stone-500 dark:text-stone-400 py-8">
          😅 没有识别到合适的英文单词
          <div className="text-xs mt-2">试试更明确的提示词,或换张图</div>
        </div>
      )}

      {status === 'result' && results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
            识别到 {results.length} 个单词
          </h2>
          {results.map((r, i) => (
            <WordCard
              key={i}
              word={r}
              isFav={r.matchedWord ? favSet.has(r.matchedWord.id) : false}
              onToggleFav={() => handleToggleFav(r)}
            />
          ))}
          <button
            onClick={() => {
              setPreview(null)
              setResults([])
              setStatus('idle')
              setError('')
            }}
            className="btn-ghost w-full text-sm"
          >
            🔄 换一张图
          </button>
        </div>
      )}
    </div>
  )
}

function WordCard({ word, isFav, onToggleFav }: {
  word: RecognizedWord
  isFav: boolean
  onToggleFav: () => void
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{word.word}</h3>
            {word.phonetic && (
              <span className="text-sm text-stone-400 dark:text-stone-300">{word.phonetic}</span>
            )}
          </div>
          <p className="text-stone-600 dark:text-stone-300 mt-1">
            {word.zh}
          </p>
          {word.scene && (
            <span className="inline-block text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded mt-2">
              {word.scene}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <TTSButton text={word.word} size="sm" />
          {word.matchedWord ? (
            <button
              onClick={onToggleFav}
              className="text-2xl"
              aria-label={isFav ? '取消收藏' : '收藏'}
            >
              {isFav ? '⭐' : '☆'}
            </button>
          ) : (
            <span className="text-xs text-stone-400 dark:text-stone-300">未收录</span>
          )}
        </div>
      </div>

      {word.matchedWord && (
        <p className="text-xs text-green-600 dark:text-green-400 mb-2">
          ✓ 已在我们 {word.matchedWord.examples?.length || 0} 句例句里
        </p>
      )}

      {word.matchedWord?.examples?.[0] && (
        <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-700">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            {word.matchedWord.examples[0].en}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {word.matchedWord.examples[0].zh}
          </p>
        </div>
      )}
    </div>
  )
}
