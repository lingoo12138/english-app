// src/lib/exportErrors.ts - v1.92 W86-B 错题导出 CSV

import type { DictationError, WritingError } from './db'

/** 转义 CSV 字段 (引号/逗号/换行) */
export function escapeCSV(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return ''
  const s = String(field)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** 写作错题 → CSV 行 */
export function writingErrorToCSV(err: WritingError): string {
  const errs = err.errors.map(e => `${e.original}→${e.suggestion}(${e.type})`).join(' | ')
  return [
    escapeCSV(err.id),
    escapeCSV(err.source),
    escapeCSV(new Date(err.ts).toISOString()),
    escapeCSV(err.original),
    escapeCSV(err.corrected),
    escapeCSV(errs),
  ].join(',')
}

/** 听写/拼写/跟读 错题 → CSV 行 */
export function dictationErrorToCSV(err: DictationError): string {
  return [
    escapeCSV(err.id),
    escapeCSV(err.source || 'dictation'),
    escapeCSV(new Date(err.ts).toISOString()),
    escapeCSV(err.target),
    escapeCSV(err.transcript),
    escapeCSV(err.score),
    escapeCSV(err.difficulty),
  ].join(',')
}

/** 写作错题 CSV header + rows */
export function writingErrorsToCSV(errors: WritingError[]): string {
  const header = 'id,source,time,original,corrected,errors'
  const rows = errors.map(writingErrorToCSV)
  return [header, ...rows].join('\n')
}

/** 听写/拼写/跟读 错题 CSV header + rows */
export function dictationErrorsToCSV(errors: DictationError[]): string {
  const header = 'id,source,time,target,transcript,score,difficulty'
  const rows = errors.map(dictationErrorToCSV)
  return [header, ...rows].join('\n')
}

/** 全部错题合并 CSV (统一格式) */
export function allErrorsToCSV(
  writing: WritingError[],
  dictation: DictationError[],
): string {
  const header = 'id,source,time,source_text,user_text,extra'
  const wRows = writing.map(e => [
    escapeCSV(e.id),
    escapeCSV(e.source),
    escapeCSV(new Date(e.ts).toISOString()),
    escapeCSV(e.corrected),
    escapeCSV(e.original),
    escapeCSV(e.errors.map(x => `${x.original}→${x.suggestion}(${x.type})`).join(' | ')),
  ].join(','))
  const dRows = dictation.map(e => [
    escapeCSV(e.id),
    escapeCSV(e.source || 'dictation'),
    escapeCSV(new Date(e.ts).toISOString()),
    escapeCSV(e.target),
    escapeCSV(e.transcript),
    escapeCSV(`score=${e.score} difficulty=${e.difficulty}`),
  ].join(','))
  return [header, ...wRows, ...dRows].join('\n')
}

/** 触发浏览器下载 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
