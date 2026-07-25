// CustomSceneDetail.tsx - v1.14.0 B4 自定义场景详情
// 显示场景元数据 + 词列表 + 收藏/不收藏
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCustomSceneById, type CustomScene } from '../lib/customScenes'
import { addFavorite, removeFavorite, isFavorite } from '../lib/db'
import { toast } from '../components/Toast'

export default function CustomSceneDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scene, setScene] = useState<CustomScene | null>(null)
  const [favMap, setFavMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCustomSceneById(parseInt(id, 10)).then(async (s) => {
      if (!s) {
        toast.error('场景不存在')
        navigate('/custom-scenes')
        return
      }
      setScene(s)
      // 检查每个词的收藏状态
      const fav: Record<string, boolean> = {}
      for (const w of s.words) {
        fav[w.word] = await isFavorite(w.word)
      }
      setFavMap(fav)
      setLoading(false)
    })
  }, [id, navigate])

  const toggleFav = async (word: string) => {
    try {
      if (favMap[word]) {
        await removeFavorite(word)
        setFavMap(m => ({ ...m, [word]: false }))
        toast.success('已取消收藏')
      } else {
        await addFavorite(word)
        setFavMap(m => ({ ...m, [word]: true }))
        toast.success('已加入生词本')
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message || '操作失败')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-stone-500">⏳ 加载中...</div>
    )
  }

  if (!scene) {
    return (
      <div className="text-center py-8">
        <p>场景不存在</p>
        <Link to="/custom-scenes" className="btn-ghost text-sm mt-4 inline-block">
          ← 返回列表
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📝 {scene.title}</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {scene.words.length} 词 · 创建于 {new Date(scene.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/custom-scenes/${scene.id}/learn`}
            className="btn-primary text-sm"
            aria-label="开始学习"
          >
            📚 开始学习
          </Link>
          <Link to="/custom-scenes" className="btn-ghost text-sm">
            ← 返回
          </Link>
        </div>
      </div>

      {/* 原文 */}
      <section className="card">
        <h3 className="font-semibold mb-2">📄 原文</h3>
        <div className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
          {scene.sourceText}
        </div>
      </section>

      {/* 生词列表 */}
      <section className="card">
        <h3 className="font-semibold mb-2">📚 生词列表</h3>
        <div className="space-y-3">
          {scene.words.map((w, idx) => (
            <div
              key={idx}
              className="p-3 bg-stone-50 dark:bg-stone-800 rounded"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <strong className="text-lg text-emerald-600 dark:text-emerald-400">
                    {w.word}
                  </strong>
                  <span className="text-xs px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded">
                    {w.difficulty}
                  </span>
                </div>
                <button
                  onClick={() => toggleFav(w.word)}
                  className="text-sm hover:scale-110 transition-transform"
                  aria-label={favMap[w.word] ? `取消收藏 ${w.word}` : `收藏 ${w.word}`}
                >
                  {favMap[w.word] ? '⭐' : '☆'}
                </button>
              </div>
              <div className="text-sm text-stone-600 dark:text-stone-400">
                {w.translation}
              </div>
              <div className="text-xs text-stone-500 mt-1 italic">
                "{w.example}"
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
