// src/lib/exportErrors.ts - v1.92 W86-B 错题导出 CSV
// W128: 委托 dataExport.ts 统一实现 (escapeCSVField + downloadFile)
// 保留旧签名给测试/调用方继续用

import type { DictationError, WritingError } from './db'
import { escapeCSVField as _escapeCSV, downloadFile as _downloadFile } from './dataExport'

/** 转义 CSV 字段 (引号/逗号/换行) - W128 委托 dataExport */
export function escapeCSV(field: string | number | undefined | null): string {
  return _escapeCSV(field)
}

/** 写作错题 → CSV 行 */
export function writingErrorToCSV(err: WritingError): string {
  const errs = err.errors.map(e => `${e.original}→${e.suggestion}(${e.type})`).join(' | ')
  return [
    _escapeCSV(err.id),
    _escapeCSV(err.source),
    _escapeCSV(new Date(err.ts).toISOString()),
    _escapeCSV(err.original),
    _escapeCSV(err.corrected),
    _escapeCSV(errs),
  ].join(',')
}

/** 听写/拼写/跟读 错题 → CSV 行 */
export function dictationErrorToCSV(err: DictationError): string {
  return [
    _escapeCSV(err.id),
    _escapeCSV(err.source || 'dictation'),
    _escapeCSV(new Date(err.ts).toISOString()),
    _escapeCSV(err.target),
    _escapeCSV(err.transcript),
    _escapeCSV(err.score),
    _escapeCSV(err.difficulty),
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
    _escapeCSV(e.id),
    _escapeCSV(e.source),
    _escapeCSV(new Date(e.ts).toISOString()),
    _escapeCSV(e.corrected),
    _escapeCSV(e.original),
    _escapeCSV(e.errors.map(x => `${x.original}→${x.suggestion}(${x.type})`).join(' | ')),
  ].join(','))
  const dRows = dictation.map(e => [
    _escapeCSV(e.id),
    _escapeCSV(e.source || 'dictation'),
    _escapeCSV(new Date(e.ts).toISOString()),
    _escapeCSV(e.target),
    _escapeCSV(e.transcript),
    _escapeCSV(`score=${e.score} difficulty=${e.difficulty}`),
  ].join(','))
  return [header, ...wRows, ...dRows].join('\n')
}

/** 触发浏览器下载 - W128 委托 dataExport (统一加 UTF-8 BOM + Blob URL) */
export function downloadCSV(filename: string, content: string): void {
  _downloadFile(content, filename, 'text/csv')
}
