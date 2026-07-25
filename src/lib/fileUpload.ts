// fileUpload.ts - v1.18.0 B8 文件上传
// 用户上传 TXT/MD 文件 → 文本 → 走 v1.14 customScenes.extractWordsFromText
// 用浏览器内置 FileReader API, 不引依赖

/** 支持的文件扩展名 */
export const SUPPORTED_EXTENSIONS = ['.txt', '.md']

/** 支持的 MIME 类型 */
export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/octet-stream',  // 某些 .md 文件无标准 MIME
]

/** 文件大小上限 (1MB) */
export const MAX_FILE_SIZE = 1024 * 1024  // 1MB

/** 文本上限 (与 customScenes.MAX_TEXT_LEN 保持一致) */
export const MAX_TEXT_LEN = 10000

/** 验证结果 */
export interface FileValidationResult {
  valid: boolean
  error?: string
}

/** 验证文件 (类型 + 大小) */
export function validateFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: '文件为空' }
  }
  // 扩展名检查
  const name = file.name.toLowerCase()
  const hasValidExt = SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext))
  if (!hasValidExt && !SUPPORTED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `不支持的文件类型 (仅支持 ${SUPPORTED_EXTENSIONS.join(', ')})` }
  }
  // 大小检查
  if (file.size === 0) {
    return { valid: false, error: '文件为空' }
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
    return { valid: false, error: `文件过大 (${sizeMB}MB > 1MB)` }
  }
  return { valid: true }
}

/** 读文本文件 (Promise 包装 FileReader) */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('文件读取失败: 结果非字符串'))
      }
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败: ' + (reader.error?.message || '未知错误')))
    }
    reader.readAsText(file, 'UTF-8')
  })
}

/** 读文件 + 截断到 MAX_TEXT_LEN */
export async function readAndTruncateFile(file: File): Promise<{
  text: string
  truncated: boolean
}> {
  const raw = await readTextFile(file)
  if (raw.length > MAX_TEXT_LEN) {
    return { text: raw.slice(0, MAX_TEXT_LEN) + '…', truncated: true }
  }
  return { text: raw, truncated: false }
}

/** 从文件名提取场景标题 (去扩展名 + 截断) */
export function extractFileName(filename: string, maxLen = 30): string {
  if (!filename) return '未命名场景'
  // 去扩展名
  let name = filename
  for (const ext of SUPPORTED_EXTENSIONS) {
    if (name.toLowerCase().endsWith(ext)) {
      name = name.slice(0, -ext.length)
      break
    }
  }
  // 替换特殊字符
  name = name.replace(/[_-]+/g, ' ').trim()
  // 截断
  if (name.length > maxLen) {
    return name.slice(0, maxLen) + '…'
  }
  return name || '未命名场景'
}

/** 格式化文件大小 (人类可读) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
