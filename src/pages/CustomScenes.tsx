// CustomScenes.tsx - v1.14.0 B4 自定义场景列表 + 创建
// v1.18.0: 加文件上传 (TXT/MD)
// 粘贴文本 / 上传文件 → AI 提取生词 → 保存为场景
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import {
  MAX_TEXT_LEN,
  MAX_WORDS,
  truncateText,
  extractWordsFromText,
  autoExtractTitle,
  saveCustomScene,
  getAllCustomScenes,
  deleteCustomSceneById,
  type CustomWord,
  type CustomScene,
} from '../lib/customScenes'
import { getSceneInReviewCount } from '../lib/sceneReview'
import { validateFile, readAndTruncateFile, extractFileName, formatFileSize, SUPPORTED_EXTENSIONS } from '../lib/fileUpload'
import { isPdfFile, extractPdfText, isPdfEncryptedError } from '../lib/pdfUpload'
import { toast } from '../components/Toast'
import { recordLLMCall, getLimitExceededMessage } from '../lib/llmUsage'

export default function CustomScenes() {
  const navigate = useNavigate()
  const llmProviderId = useStore(s => s.llmProviderId)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const llmModels = useStore(s => s.llmModels)
  const llmProviders = useStore(s => s.llmProviders)

  const [text, setText] = useState('')
  const [extractedWords, setExtractedWords] = useState<CustomWord[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [scenes, setScenes] = useState<CustomScene[]>([])
  // v1.16.0: 场景复习数
  const [reviewCounts, setReviewCounts] = useState<Record<number, number>>({})
  // v1.18.0: 上传文件名
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const provider = llmProviders.find(p => p.id === llmProviderId)
  const apiKey = llmApiKeys[llmProviderId] || ''
  const model = llmModels[llmProviderId] || provider?.defaultModel || ''

  // 初始加载场景列表
  useEffect(() => {
    refreshScenes()
  }, [])

  const refreshScenes = async () => {
    const items = await getAllCustomScenes()
    setScenes(items)
    // v1.16.0: 加载每个场景的复习数
    const counts: Record<number, number> = {}
    for (const s of items) {
      if (s.id) {
        counts[s.id] = await getSceneInReviewCount(s.words)
      }
    }
    setReviewCounts(counts)
  }

  const handleExtract = async () => {
    if (!text.trim()) {
      toast.error('请先粘贴或输入英文文本')
      return
    }
    if (text.length > MAX_TEXT_LEN) {
      toast.error(`文本超过 ${MAX_TEXT_LEN} 字符,已自动截断`)
    }

    // v1.12.0-C: LLM 日限检查
    const limitMsg = getLimitExceededMessage('explain')
    if (limitMsg) {
      toast.error(limitMsg)
      return
    }

    setLoading(true)
    try {
      recordLLMCall('explain')
      const words = await extractWordsFromText(text, provider!, apiKey, model)
      if (words.length === 0) {
        toast.error('未能提取出生词, 试试更长的英文文本')
        return
      }
      setExtractedWords(words)
      // 自动提取标题
      if (!title) {
        setTitle(autoExtractTitle(text))
      }
      toast.success(`提取到 ${words.length} 个生词`)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error('提取生词失败:', err)
      toast.error(err.message || '提取失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入场景标题')
      return
    }
    if (extractedWords.length === 0) {
      toast.error('请先提取生词')
      return
    }
    setLoading(true)
    try {
      const id = await saveCustomScene({
        title: title.trim(),
        sourceText: truncateText(text),
        words: extractedWords,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      toast.success(`已保存场景 #${id}`)
      // 重置
      setText('')
      setTitle('')
      setExtractedWords([])
      refreshScenes()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error('保存失败:', err)
      toast.error(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个自定义场景吗?')) return
    try {
      await deleteCustomSceneById(id)
      toast.success('已删除')
      refreshScenes()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message || '删除失败')
    }
  }

  const removeWord = (idx: number) => {
    setExtractedWords(words => words.filter((_, i) => i !== idx))
  }

  // v1.18.0: 文件上传 handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error(validation.error || '文件验证失败')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      // v1.23.0: PDF 走不同解析路径
      if (isPdfFile(file)) {
        toast.info(`⏳ PDF 解析中... (${file.name})`)
        try {
          const { text: pdfText, pageCount, truncated } = await extractPdfText(file, MAX_TEXT_LEN)
          setText(pdfText)
          setUploadedFileName(file.name)
          if (!title) {
            setTitle(extractFileName(file.name))
          }
          if (truncated) {
            toast.success(`✓ PDF 解析完成 (${pageCount} 页), 截断到 ${MAX_TEXT_LEN} 字符`)
          } else {
            toast.success(`✓ PDF 解析完成 (${pageCount} 页)`)
          }
        } catch (pdfErr) {
          if (isPdfEncryptedError(pdfErr)) {
            toast.error('PDF 已加密, 请先解密')
          } else {
            const err = pdfErr instanceof Error ? pdfErr : new Error(String(pdfErr))
            toast.error(`PDF 解析失败: ${err.message || '未知错误'}`)
          }
        }
      } else {
        // TXT/MD 走原有路径
        const { text: fileText, truncated } = await readAndTruncateFile(file)
        setText(fileText)
        setUploadedFileName(file.name)
        if (!title) {
          setTitle(extractFileName(file.name))
        }
        if (truncated) {
          toast.success(`✓ 已上传并截断到 ${MAX_TEXT_LEN} 字符`)
        } else {
          toast.success(`✓ 已上传 ${file.name} (${formatFileSize(file.size)})`)
        }
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      console.error('文件读取失败:', e)
      toast.error(e.message || '文件读取失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📝 自定义场景</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          粘贴任意英文文本 (文章/对话/邮件), AI 自动提取生词, 保存为你的专属场景
        </p>
      </div>

      {/* 文本输入 + 提取 */}
      <section className="card">
        <h3 className="font-semibold mb-2">📄 粘贴英文文本 / 📁 上传文件</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_TEXT_LEN))}
          placeholder="粘贴英文文本... 例: 邮件 / 文章 / 对话 / 歌词"
          className="input w-full h-40 text-sm"
          aria-label="英文文本输入框"
        />
        {uploadedFileName && (
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            📁 已上传: {uploadedFileName}
            <button
              onClick={() => {
                setUploadedFileName('')
                setText('')
              }}
              className="ml-2 text-red-500 hover:underline"
              aria-label="清除上传文件"
            >
              ✕ 清除
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-stone-500 gap-2 flex-wrap">
          <span>{text.length} / {MAX_TEXT_LEN} 字符</span>
          <div className="flex items-center gap-2">
            {/* v1.18.0: 文件上传按钮 */}
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS.join(',')}
              onChange={handleFileUpload}
              className="hidden"
              aria-label="选择文件"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-ghost text-xs disabled:opacity-50"
              aria-label="上传 TXT 或 MD 文件"
            >
              {uploading ? '⏳ 上传中...' : '📁 上传文件'}
            </button>
            <button
              onClick={handleExtract}
              disabled={loading || !text.trim()}
              className="btn-primary text-sm disabled:opacity-50"
              aria-label="AI 提取生词"
            >
              {loading ? '⏳ 提取中...' : '✨ 提取生词'}
            </button>
          </div>
        </div>
      </section>

      {/* 提取结果 */}
      {extractedWords.length > 0 && (
        <section className="card">
          <h3 className="font-semibold mb-2">📋 提取结果 ({extractedWords.length} 词)</h3>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="场景标题"
            className="input w-full text-sm mb-3"
            aria-label="场景标题"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {extractedWords.map((w, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-2 bg-stone-50 dark:bg-stone-800 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-emerald-600 dark:text-emerald-400">{w.word}</strong>
                    <span className="text-xs px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded">
                      {w.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1">{w.translation}</div>
                  <div className="text-xs text-stone-400 mt-0.5 italic">"{w.example}"</div>
                </div>
                <button
                  onClick={() => removeWord(idx)}
                  className="text-red-500 hover:underline text-xs"
                  aria-label={`移除 ${w.word}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary text-sm disabled:opacity-50"
              aria-label="保存场景"
            >
              💾 保存场景
            </button>
            <button
              onClick={() => {
                setExtractedWords([])
                setTitle('')
              }}
              className="btn-ghost text-sm"
              aria-label="清空结果"
            >
              🗑️ 清空
            </button>
          </div>
        </section>
      )}

      {/* 已保存场景列表 */}
      <section className="card">
        <h3 className="font-semibold mb-2">📚 已保存场景 ({scenes.length})</h3>
        {scenes.length === 0 ? (
          <p className="text-sm text-stone-500 py-4 text-center">
            还没有自定义场景, 粘贴文本开始创建吧
          </p>
        ) : (
          <div className="space-y-2">
            {scenes.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded"
              >
                <button
                  onClick={() => navigate(`/custom-scenes/${s.id}`)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    {s.words.length} 词
                    {s.id && reviewCounts[s.id] ? (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        📚 {reviewCounts[s.id]} 复习中
                      </span>
                    ) : null}
                    {' · '}{new Date(s.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </button>
                <button
                  onClick={() => s.id && handleDelete(s.id)}
                  className="text-red-500 hover:underline text-xs ml-2"
                  aria-label={`删除 ${s.title}`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
