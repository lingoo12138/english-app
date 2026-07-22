// 拍照识物页 - v0.11 多 LLM 渠道版本
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import { recognizeImage, type RecognizedItem } from '../lib/imageRecog'
import { addFavorite, isFavorite, removeFavorite } from '../lib/db'
import { useStore } from '../store/useStore'

type Status = 'idle' | 'loading' | 'result' | 'error'

export default function Camera() {
  const navigate = useNavigate()
  const llmProviders = useStore(s => s.llmProviders)
  const llmProviderId = useStore(s => s.llmProviderId)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const llmModels = useStore(s => s.llmModels)

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [results, setResults] = useState<RecognizedItem[]>([])
  const [hint, setHint] = useState('')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const provider = llmProviders.find(p => p.id === llmProviderId)
  const apiKey = llmApiKeys[llmProviderId] || ''
  const model = llmModels[llmProviderId] || provider?.defaultModel || ''

  const needKey = provider?.apiKeyRequired && !apiKey

  const handleFile = async (file: File) => {
    if (!provider) {
      setError('未选择 LLM 渠道')
      setStatus('error')
      return
    }
    if (needKey) {
      setError(`请先在 设置 → AI 渠道 中为 ${provider.name} 填入 API Key`)
      setStatus('error')
      return
    }
    if (!provider.supportsVision && provider.id !== 'mock') {
      setError(`${provider.name} 不支持图像识别, 请切换渠道`)
      setStatus('error')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('图片不能超过 4MB')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    setResults([])
    try {
      // 预览 + base64
      const url = URL.createObjectURL(file)
      setPreview(url)
      const dataUrl = await fileToDataURL(file)
      // 识别
      const result = await recognizeImage(dataUrl, provider, apiKey, model, hint)
      setResults(result.items)
      setStatus('result')
      // 查收藏状态
      const favs = new Set<string>()
      for (const item of result.items) {
        if (item.matched && await isFavorite(item.matched.id)) {
          favs.add(item.matched.id)
        }
      }
      setFavSet(favs)
    } catch (e: any) {
      console.error(e)
      setError(e.message || '识别失败')
      setStatus('error')
    }
  }

  const handleToggleFav = async (item: RecognizedItem) => {
    if (!item.matched) return
    const id = item.matched.id
    if (favSet.has(id)) {
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
        <p className="text-stone-500 dark:text-stone-400 text-sm">拍照或上传图片,AI 帮你识别出英语单词(每次识别 1-5 个)</p>
      </div>

      {/* 当前渠道状态 */}
      {provider && (
        <div className="card text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400">当前渠道</span>
            <span className="font-medium">{provider.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400">模型</span>
            <span className="font-mono text-xs">{model}</span>
          </div>
          {!provider.supportsVision && (
            <div className="text-amber-600 dark:text-amber-400 text-xs">⚠️ 此渠道不支持图像, 建议切换</div>
          )}
        </div>
      )}

      {needKey && (
        <div className="card border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">需要先配置 API Key</p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mb-2">
                在 <button onClick={() => navigate('/settings')} className="underline">设置 → AI 渠道</button> 中填入 {provider?.name} 的 API Key
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                选 <b>Mock 模拟</b> 渠道可零成本测试
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

      {status === 'result' && results.length === 0 && (
        <div className="card text-center text-stone-500 dark:text-stone-400 py-8">
          😅 没有识别到合适的英文单词
          <div className="text-xs mt-2">试试更明确的提示词,或换张图</div>
        </div>
      )}

      {status === 'result' && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              识别到 {results.length} 个单词
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {results.length >= 5 ? '已到上限 5 个' : `上限 5 个`}
            </span>
          </div>
          {results.map((item, i) => (
            <ItemCard
              key={i}
              item={item}
              isFav={item.matched ? favSet.has(item.matched.id) : false}
              onToggleFav={() => handleToggleFav(item)}
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

function ItemCard({ item, isFav, onToggleFav }: {
  item: RecognizedItem
  isFav: boolean
  onToggleFav: () => void
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{item.word}</h3>
            {item.matched?.phonetic && (
              <span className="text-sm text-stone-400 dark:text-stone-300">{item.matched.phonetic}</span>
            )}
            <span className="text-xs text-stone-400">置信 {Math.round(item.confidence * 100)}%</span>
          </div>
          {item.matched && (
            <p className="text-stone-600 dark:text-stone-300 mt-1">
              {item.matched.translations?.join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <TTSButton text={item.word} size="sm" />
          {item.matched ? (
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

      {item.matched && item.examples && item.examples.length > 0 && (
        <p className="text-xs text-green-600 dark:text-green-400 mb-2">
          ✓ 已在我们 {item.examples.length} 句例句里
        </p>
      )}

      {item.examples?.[0] && (
        <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-700">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            {item.examples[0]}
          </p>
        </div>
      )}
    </div>
  )
}

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
