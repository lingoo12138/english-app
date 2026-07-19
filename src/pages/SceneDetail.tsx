// 场景详情页 - 学习该场景的句子
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SCENES, type Scene } from '../data/scenes'
import TTSButton from '../components/TTSButton'
import { logAction, db } from '../lib/db'

export default function SceneDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scene, setScene] = useState<Scene | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [knownMap, setKnownMap] = useState<Map<number, 'known' | 'unknown'>>(new Map())

  useEffect(() => {
    const s = SCENES.find(x => x.id === id)
    setScene(s || null)
    if (s) {
      // 加载每句的已知状态
      const loadKnown = async () => {
        const map = new Map<number, 'known' | 'unknown'>()
        for (let i = 0; i < s.sentences.length; i++) {
          const sent = s.sentences[i]
          const recId = `scene-${s.id}-${sent.en.slice(0, 20)}`
          const last = await db.records
            .where('wordId').equals(recId)
            .reverse()
            .sortBy('timestamp')
          if (last[0]?.action === 'known') {
            map.set(i, 'known')
          } else if (last[0]?.action === 'unknown') {
            map.set(i, 'unknown')
          }
        }
        setKnownMap(map)
      }
      loadKnown()
    }
  }, [id])

  if (!scene) {
    return (
      <div className="text-center py-20 text-stone-500">
        场景不存在
        <div className="mt-4">
          <Link to="/scenes" className="btn-primary">返回场景列表</Link>
        </div>
      </div>
    )
  }

  const currentSentence = scene.sentences[currentIdx]
  const total = scene.sentences.length
  const progress = ((currentIdx + 1) / total) * 100
  const knownCount = knownMap.size
  const knownRatio = knownCount / total

  const handleRate = async (rate: 'known' | 'unknown') => {
    const recId = `scene-${scene.id}-${currentSentence.en.slice(0, 20)}`
    await logAction(recId, rate)
    setKnownMap(prev => {
      const next = new Map(prev)
      next.set(currentIdx, rate)
      return next
    })
    // 下一个
    if (currentIdx + 1 < total) {
      setTimeout(() => setCurrentIdx(i => i + 1), 300)
    }
  }

  return (
    <div className="space-y-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/scenes')} className="btn-ghost text-sm">
          ← 返回
        </button>
        <span className="text-sm text-stone-500">
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* 场景标题 */}
      <div className="card bg-gradient-to-br from-brand-500 to-emerald-600 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">{scene.emoji}</div>
          <div>
            <h1 className="text-2xl font-bold">{scene.name}</h1>
            <p className="text-sm opacity-90">{scene.description}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${knownRatio * 100}%` }}
          />
        </div>
        <div className="mt-1 text-xs opacity-80">
          已掌握 {knownCount} / {total}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 当前句子 */}
      <div className="card min-h-[220px] flex flex-col justify-center">
        {/* 场景使用提示 */}
        {currentSentence.usage && (
          <div className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded mb-3 inline-block self-start">
            💡 {currentSentence.usage}
          </div>
        )}

        {/* 英文 */}
        <div className="flex items-start gap-2 mb-3">
          <p className="flex-1 text-2xl font-medium leading-relaxed">
            {currentSentence.en}
          </p>
          <TTSButton text={currentSentence.en} />
        </div>

        {/* 中文翻译 */}
        <p className="text-base text-stone-600 dark:text-stone-400 mb-3">
          {currentSentence.zh}
        </p>

        {/* 关键词 */}
        {currentSentence.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-xs text-stone-500">关键词:</span>
            {currentSentence.keywords.map(kw => (
              <span
                key={kw}
                className="text-xs px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* 状态标记 */}
        {knownMap.has(currentIdx) && (
          <div className={`text-xs ${knownMap.get(currentIdx) === 'known' ? 'text-green-600' : 'text-orange-600'}`}>
            {knownMap.get(currentIdx) === 'known' ? '✓ 已掌握' : '✗ 待复习'}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleRate('unknown')}
          className="btn bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 py-4"
        >
          <div className="text-xl mb-1">😕</div>
          <div className="text-sm font-medium">不认识</div>
        </button>
        <button
          onClick={() => handleRate('known')}
          className="btn bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 py-4"
        >
          <div className="text-xl mb-1">😄</div>
          <div className="text-sm font-medium">认识</div>
        </button>
      </div>

      {/* 导航 */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          ← 上一句
        </button>
        <button
          onClick={() => setCurrentIdx(i => Math.min(total - 1, i + 1))}
          disabled={currentIdx >= total - 1}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          下一句 →
        </button>
      </div>

      {/* 场景词汇 */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📚</span>
          <span>本场景关键词汇({scene.vocabulary.length})</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {scene.vocabulary.map(w => (
            <div
              key={w}
              className="flex items-center gap-1 px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded text-sm"
            >
              <span>{w}</span>
              <TTSButton text={w} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* 小贴士 */}
      {scene.tips && (
        <div className="card bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="text-xl">💡</div>
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">小贴士</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {scene.tips}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
