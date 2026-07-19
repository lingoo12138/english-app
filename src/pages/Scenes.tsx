// 场景专题课列表页
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SCENES, type Scene, searchScenes } from '../data/scenes'
import { logAction } from '../lib/db'

export default function Scenes() {
  const [query, setQuery] = useState('')
  const [scenes, setScenes] = useState<Scene[]>(SCENES)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    setScenes(searchScenes(query))
  }, [query])

  // 加载完成的场景(用 review 状态模拟)
  useEffect(() => {
    const loadCompleted = async () => {
      const { db } = await import('../lib/db')
      // 检查每个场景是否所有句子都"认识"过
      const completedSet = new Set<string>()
      for (const scene of SCENES) {
        let allKnown = true
        for (const sent of scene.sentences) {
          const id = `scene-${scene.id}-${sent.en.slice(0, 20)}`
          const known = await db.records
            .where('wordId').equals(id)
            .and(r => r.action === 'known')
            .first()
          if (!known) {
            allKnown = false
            break
          }
        }
        if (allKnown && scene.sentences.length > 0) {
          completedSet.add(scene.id)
        }
      }
      setCompleted(completedSet)
    }
    loadCompleted()
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
            onClick={() => logAction(`scene-${scene.id}`, 'view')}
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
