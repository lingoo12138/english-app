// 场景专题课列表页
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SCENES, type Scene, searchScenes, getSentenceId } from '../data/scenes'

export default function Scenes() {
  const [query, setQuery] = useState('')
  const [scenes, setScenes] = useState<Scene[]>(SCENES)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    setScenes(searchScenes(query))
  }, [query])

  // 加载完成的场景 + 监听 SceneDetail 学完事件
  useEffect(() => {
    const loadCompleted = async () => {
      const { db } = await import('../lib/db')
      // 一次拉所有 scene- 记录,内存中计算完成度
      const allRecords = await db.records
        .where('wordId').startsWith('scene-')
        .toArray()
      // 按场景分组
      const knownByScene = new Map<string, Set<string>>()
      for (const r of allRecords) {
        if (r.action !== 'known') continue
        // recId 格式: scene-{sceneId}-{sentenceEn20}
        const m = r.wordId.match(/^scene-([^-]+)-/)
        if (!m) continue
        const sceneId = m[1]
        if (!knownByScene.has(sceneId)) knownByScene.set(sceneId, new Set())
        knownByScene.get(sceneId)!.add(r.wordId)
      }
      // 判断每个场景是否所有句子都 known
      const completedSet = new Set<string>()
      for (const scene of SCENES) {
        const knownRecIds = knownByScene.get(scene.id)
        if (!knownRecIds) continue
        let allKnown = true
        for (let i = 0; i < scene.sentences.length; i++) {
          const recId = getSentenceId(scene.id, i)
          if (!knownRecIds.has(recId)) {
            allKnown = false
            break
          }
        }
        if (allKnown) completedSet.add(scene.id)
      }
      setCompleted(completedSet)
    }
    loadCompleted()
    // 监听 SceneDetail 完成的全局事件
    const handler = () => loadCompleted()
    window.addEventListener('scenes:updated', handler)
    return () => window.removeEventListener('scenes:updated', handler)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">场景专题课</h1>
        <p className="text-stone-500 text-sm">
          5 个真实场景 · 真实能用的高频表达
        </p>
      </div>

      {/* 搜索 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索场景或句子..."
        className="input"
      />

      {/* 场景卡片 */}
      <div className="grid grid-cols-1 gap-3">
        {scenes.map(scene => (
          <Link
            key={scene.id}
            to={`/scenes/${scene.id}`}
            className="card flex items-center gap-4 hover:shadow-md active:scale-[0.98] transition-all no-select"
          >
            <div className="text-4xl">{scene.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{scene.name}</h3>
                {completed.has(scene.id) && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    ✓ 已学完
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                {scene.description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                <span>📝 {scene.sentences.length} 句</span>
                <span>📚 {scene.vocabulary.length} 词</span>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3].map(d => (
                    <span
                      key={d}
                      className={d <= scene.difficulty ? 'text-amber-500' : 'text-stone-300'}
                    >
                      ★
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <div className="text-stone-400">→</div>
          </Link>
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="text-center py-12 text-stone-500">没有匹配的场景</div>
      )}

      <div className="card bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-brand-900 dark:text-brand-200 mb-1">学习建议</p>
            <p className="text-brand-700 dark:text-brand-300 text-xs">
              每个场景每天学 2-3 句,一周掌握一个完整场景,胜过背 100 个孤立单词
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
