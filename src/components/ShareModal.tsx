// ShareModal.tsx - v1.1-F1 分享 Modal (3 步: 选风格 → 预览 → 下载)
// W147: 加 2 个新风格 (streak / vocab) + 加 "生成周报" 入口
import { useState, useRef } from 'react'
import { Modal } from './Modal'
import { ShareCard, useShareCardData, type ShareCardStyle } from './ShareCard'
import { toast } from './Toast'
import { generateWeeklyReport, copyReportAsMarkdown, downloadReportAsHtml, shareReport } from '../lib/weeklyReport'

interface Props {
  open: boolean
  onClose: () => void
}

const STYLES: { value: ShareCardStyle; label: string; desc: string }[] = [
  // 注: W147 去掉 emoji (硬约束), 用文字标签
  { value: 'simple', label: '简洁', desc: '极简白底,适合纯文字' },
  { value: 'gradient', label: '渐变', desc: '绿渐变,主推' },
  { value: 'retro', label: '复古', desc: '暖色调, 小红书风' },
  // W147: 2 个新风格
  { value: 'streak', label: '连续天数', desc: '单大数字, 冲击力强' },
  { value: 'vocab', label: '词汇量', desc: '已掌握词数' },
]

export function ShareModal({ open, onClose }: Props) {
  const [style, setStyle] = useState<ShareCardStyle>('gradient')
  const { data, loading } = useShareCardData()
  const cardRef = useRef<HTMLDivElement>(null)
  // W147: 周报生成中
  const [weeklyGenerating, setWeeklyGenerating] = useState(false)

  // W147: 生成 + 复制周报 Markdown
  const handleWeeklyCopy = async () => {
    setWeeklyGenerating(true)
    try {
      const report = await generateWeeklyReport()
      const ok = await copyReportAsMarkdown(report)
      if (ok) toast.success(`已复制本周学习报告 (学 ${report.wordsLearned} 词)`)
      else toast.error('复制失败')
    } catch (e) {
      toast.error('生成周报失败')
    } finally {
      setWeeklyGenerating(false)
    }
  }

  // W147: 下载周报 HTML
  const handleWeeklyDownload = async () => {
    setWeeklyGenerating(true)
    try {
      const report = await generateWeeklyReport()
      downloadReportAsHtml(report)
      toast.success('已下载本周学习报告 HTML')
    } catch (e) {
      toast.error('生成周报失败')
    } finally {
      setWeeklyGenerating(false)
    }
  }

  // W147: Web Share API (移动端)
  const handleWeeklyShare = async () => {
    setWeeklyGenerating(true)
    try {
      const report = await generateWeeklyReport()
      const ok = await shareReport(report)
      if (!ok) {
        // 浏览器不支持, 降级到 copy
        const copyOk = await copyReportAsMarkdown(report)
        if (copyOk) toast.success('已复制 (浏览器不支持原生分享)')
        else toast.error('分享失败')
      }
    } catch (e) {
      toast.error('分享失败')
    } finally {
      setWeeklyGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!data) return
    const text = [
      '📚 我的句刻学习 📚',
      '',
      `🔥 连续学习: ${data.streak} 天`,
      `📅 累计天数: ${data.totalDays} 天`,
      `📖 学过词数: ${data.totalLearned} 词`,
      `⭐ 收藏: ${data.favoriteCount} 个`,
      `✏️ 错题: ${data.errorCount} 个`,
      '',
      '让英语在你想用的时候就能用上',
      'https://lingoo12138.github.io/english-app/',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制分享文本,粘贴到朋友圈/小红书')
    } catch (e) {
      toast.error('复制失败,请手动复制')
    }
  }

  return (
    <Modal
      open={open}
      title="分享我的学习"
      message="选择风格 → 预览 → 长按或右键保存图片分享给朋友"
      variant="default"
      showCancel={false}
      confirmText="关闭"
      onConfirm={onClose}
      onCancel={onClose}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* 风格选择 — W147 加 2 个新风格 (streak / vocab), 5 风格 grid-cols-3 */}
        <div>
          <div className="text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">选风格</div>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  style === s.value
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
                data-testid={`share-style-${s.value}`}
              >
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* W147: 本周学习报告 (新功能) — 复制/下载/分享 3 按钮 */}
        <div className="border-t border-stone-200 dark:border-stone-700 pt-4">
          <div className="text-sm font-medium mb-2 text-stone-600 dark:text-stone-400 flex items-center justify-between">
            <span>本周学习报告</span>
            <span className="text-xs text-stone-500">基于真实 7 天数据</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleWeeklyCopy}
              disabled={weeklyGenerating}
              className="p-2 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 disabled:opacity-50"
              data-testid="share-weekly-copy"
            >
              复制 Markdown
            </button>
            <button
              onClick={handleWeeklyDownload}
              disabled={weeklyGenerating}
              className="p-2 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 disabled:opacity-50"
              data-testid="share-weekly-download"
            >
              下载 HTML
            </button>
            <button
              onClick={handleWeeklyShare}
              disabled={weeklyGenerating}
              className="p-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              data-testid="share-weekly-share"
            >
              {typeof navigator !== 'undefined' && 'share' in navigator ? '原生分享' : '复制'}
            </button>
          </div>
        </div>

        {/* 预览 */}
        <div>
          <div className="text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">预览</div>
          <div className="flex justify-center" ref={cardRef}>
            {loading || !data ? (
              <div className="w-full max-w-md aspect-[4/5] rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse flex items-center justify-center">
                <span className="text-stone-400">加载中...</span>
              </div>
            ) : (
              <ShareCard data={data} style={style} />
            )}
          </div>
        </div>

        {/* 提示 */}
        <div className="text-xs text-stone-500 dark:text-stone-400 text-center space-y-1">
          <p>📱 手机端: 长按图片 → 保存到相册</p>
          <p>💻 电脑端: 右键图片 → 图片另存为</p>
        </div>

        {/* 复制文本 */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!data}
            className="btn-primary flex-1 text-sm disabled:opacity-50"
          >
            📋 复制分享文本
          </button>
        </div>
      </div>
    </Modal>
  )
}
