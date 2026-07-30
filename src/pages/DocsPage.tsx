// src/pages/DocsPage.tsx - 项目文档浏览页
import { useEffect, useState } from 'react'
import { renderMd } from '../lib/md'

interface DocMeta {
  name: string
  title: string
  emoji: string
  desc: string
}

const DOCS: DocMeta[] = [
  { name: 'SUMMARY_v1.83.md', title: '收官总结', emoji: '🏁', desc: 'v0.1 → v1.83 全程复盘, 17 周 83 release' },
  { name: 'CHANGELOG.md', title: '更新日志', emoji: '📋', desc: '17 个 release entry' },
  { name: 'ROADMAP.md', title: '路线图', emoji: '🗺️', desc: '53 轮规划 + 已完成项' },
  { name: 'REVIEW_v1.80_verifierA.md', title: 'Verifier A: 静态代码 review', emoji: '🔍', desc: '0 P0 / 11 P1 / 26 死代码' },
  { name: 'REVIEW_v1.80_verifierB.md', title: 'Verifier B: E2E 闭环', emoji: '🔬', desc: '60 闭环 52 pass / 8 fail' },
  { name: 'REVIEW_v1.80_verifierC.md', title: 'Verifier C: 数据完整性', emoji: '📊', desc: 'schema/数字/IDB + 100 X so' },
]

export default function DocsPage() {
  const [active, setActive] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!active) {
      setContent('')
      return
    }
    setLoading(true)
    setErr('')
    fetch(`/docs/${active}`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))
      .then(text => setContent(renderMd(text)))
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [active])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📚 项目文档</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          v1.83.0 收官阶段产出 · 17 周 · 83 release
        </p>
      </div>

      {!active && (
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCS.map(d => (
            <button
              key={d.name}
              onClick={() => setActive(d.name)}
              className="card text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{d.emoji}</span>
                <span className="font-semibold">{d.title}</span>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400">{d.desc}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 font-mono">{d.name}</p>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActive(null)}
              className="text-sm text-brand-600 hover:underline"
            >
              ← 返回列表
            </button>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <span className="text-sm font-semibold">
              {DOCS.find(d => d.name === active)?.title}
            </span>
            <a
              href={`https://github.com/lingoo12138/english-app/blob/main/docs/${active}`}
              target="_blank"
              rel="noopener"
              className="text-xs text-stone-500 dark:text-stone-400 hover:underline ml-auto"
            >
              在 GitHub 查看 ↗
            </a>
          </div>

          {loading && (
            <div className="card text-center text-stone-500 dark:text-stone-400 py-12">
              加载中...
            </div>
          )}

          {err && (
            <div className="card bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              加载失败: {err}
            </div>
          )}

          {content && !loading && !err && (
            <article
              className="card max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      )}
    </div>
  )
}
