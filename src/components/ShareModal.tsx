// ShareModal.tsx - v1.1-F1 分享 Modal (3 步: 选风格 → 预览 → 下载)
import { useState, useRef } from 'react'
import { Modal } from './Modal'
import { ShareCard, useShareCardData, type ShareCardStyle } from './ShareCard'
import { toast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
}

const STYLES: { value: ShareCardStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'simple', label: '简洁', emoji: '⚪', desc: '极简白底,适合纯文字' },
  { value: 'gradient', label: '渐变', emoji: '🌈', desc: '绿渐变,主推' },
  { value: 'retro', label: '复古', emoji: '🟠', desc: '暖色调, 小红书风' },
]

export function ShareModal({ open, onClose }: Props) {
  const [style, setStyle] = useState<ShareCardStyle>('gradient')
  const { data, loading } = useShareCardData()
  const cardRef = useRef<HTMLDivElement>(null)

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
      title="📤 分享我的学习"
      message="选择风格 → 预览 → 长按或右键保存图片分享给朋友"
      variant="default"
      showCancel={false}
      confirmText="关闭"
      onConfirm={onClose}
      onCancel={onClose}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* 风格选择 */}
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
              >
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
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
