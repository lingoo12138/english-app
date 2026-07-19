// 场景详情页 - 学习该场景的句子
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SCENES, type Scene } from '../data/scenes'
import TTSButton from '../components/TTSButton'
import { logAction, db } from '../lib/db'

export default function SceneDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [knownMap, setKnownMap] = useState<Map<number, 'known' | 'unknown'>>(new Map())
  const [isTransitioning, setIsTransitioning] = useState(false)  // 防止重复点击
  const knownMapRef = useRef(knownMap)
  knownMapRef.current = knownMap

  // 同步计算 scene,避免首屏闪'场景不存在'
  const scene = useMemo(() => SCENES.find(x => x.id === id) || null, [id])

  useEffect(() => {
    // 场景变化时重置所有状态
    setCurrentIdx(0)
    setKnownMap(new Map())
    setIsTransitioning(false)

    if (!scene) return

    // 加载每句的已知状态(用 race-safe 方式)
    let cancelled = false
    const loadKnown = async () => {
      try {
        // 一次拉全表,内存中过滤(避免 40 次串行查询)
        const allRecords = await db.records
          .where('wordId').startsWith(`scene-${scene.id}-`)
          .toArray()
        if (cancelled) return
        // 按 recId 分组,取每句最后一条
        const lastByRecId = new Map<string, string>()
        for (const r of allRecords) {
          const prev = lastByRecId.get(r.wordId)
          if (!prev) {
            lastByRecId.set(r.wordId, r.action)
          }
        }
        const map = new Map<number, 'known' | 'unknown'>()
        for (let i = 0; i < scene.sentences.length; i++) {
          const recId = `scene-${scene.id}-${scene.sentences[i].en.slice(0, 20)}`
          const action = lastByRecId.get(recId)
          if (action === 'known' || action === 'unknown') {
            map.set(i, action)
          }
        }
        if (!cancelled) setKnownMap(map)
      } catch (e) {
        console.error('加载场景学习记录失败', e)
      }
    }
    loadKnown()
    return () => { cancelled = true }
  }, [id, scene])

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
  // 修复: 只数'known'状态(之前错误地把 unknown 也计入)
  const knownCount = useMemo(
    () => Array.from(knownMap.values()).filter(v => v === 'known').length,
    [knownMap]
  )
  const knownRatio = knownCount / total
  const allKnown = knownCount === total && total > 0

  // 如果全部学完,通知其他页面(Scenes 列表会更新)
  useEffect(() => {
    if (allKnown) {
      // 触发全局事件让 Scenes 列表重载
      window.dispatchEvent(new CustomEvent('scenes:updated'))
    }
  }, [allKnown])

  const handleRate = async (rate: 'known' | 'unknown') => {
    if (isTransitioning) return  // 防止重复点击
    setIsTransitioning(true)
    const recId = `scene-${scene.id}-${currentSentence.en.slice(0, 20)}`
    try {
      await logAction(recId, rate)
      setKnownMap(prev => {
        const next = new Map(prev)
        next.set(currentIdx, rate)
        return next
      })
    } catch (e) {
      console.error('记录学习状态失败', e)
      // 不乐观更新,让用户重试
      setIsTransitioning(false)
      return
    }
    // 下一个
    if (currentIdx + 1 < total) {
      setTimeout(() => {
        setCurrentIdx(i => i + 1)
        setIsTransitioning(false)
      }, 300)
    } else {
      setIsTransitioning(false)
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
