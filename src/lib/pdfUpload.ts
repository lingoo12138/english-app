// pdfUpload.ts - v1.23.0 W24 PDF 上传
// 懒加载 pdfjs-dist 解析 PDF, 复用 v1.18 fileUpload 框架
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

/** PDF 解析结果 */
export interface PdfParseResult {
  text: string
  pageCount: number
  truncated: boolean
}

/** PDF 最大页数 (防止恶意大文件) */
export const MAX_PDF_PAGES = 50

/** 懒加载的 pdfjs 模块缓存 */
let pdfjsModule: typeof import('pdfjs-dist') | null = null

/** 懒加载 pdfjs-dist (首次调用时下载) */
export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) return pdfjsModule
  // 动态 import 不增加初始 bundle
  const mod = await import('pdfjs-dist')
  // 设置 worker (Vite import 风格)
  if (typeof window !== 'undefined' && !mod.GlobalWorkerOptions.workerSrc) {
    // 用 Vite 的 ?url 后缀让 worker 文件可访问
    mod.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  }
  pdfjsModule = mod
  return mod
}

/** 检查 PDF 文件签名 (%PDF-) */
export function isPdfFile(file: File): boolean {
  // 后缀检查
  if (file.name.toLowerCase().endsWith('.pdf')) return true
  // MIME 检查
  if (file.type === 'application/pdf') return true
  return false
}

/** 检查是否是加密 PDF 错误 */
export function isPdfEncryptedError(e: unknown): boolean {
  const err = e instanceof Error ? e : new Error(String(e))
  const msg = err.message || ''
  return msg.includes('encrypted') || msg.includes('password') || msg.includes('Password')
}

/** 解析 PDF 文本 (懒加载 pdfjs) */
export async function extractPdfText(
  file: File,
  maxLen: number = 10000,
): Promise<PdfParseResult> {
  if (!isPdfFile(file)) {
    throw new Error('不是有效的 PDF 文件')
  }
  if (file.size === 0) {
    throw new Error('PDF 文件为空')
  }

  const pdfjs = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    // 禁用字体加载, 加快解析
    disableFontFace: true,
  })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  // 收集所有页文本
  const pageTexts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as TextItem).str : ''))
      .join(' ')
    pageTexts.push(pageText)
  }

  // 合并 + 去多余空白
  const raw = pageTexts.join('\n\n').replace(/\s+/g, ' ').trim()
  if (raw.length > maxLen) {
    return { text: raw.slice(0, maxLen) + '…', pageCount, truncated: true }
  }
  return { text: raw, pageCount, truncated: false }
}

/** 取 PDF 页数 (只读前 1 页) */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  return pdf.numPages
}
