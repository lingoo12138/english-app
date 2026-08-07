// src/lib/dataConsistency.ts - 数据 一致性 校验 (W101)
import type { Word } from '../types'

export interface ConsistencyIssue {
  wordId: string
  word: string
  type: 'pos_format' | 'missing_translation' | 'empty_examples' | 'empty_phrases' | 'empty_roots'
  message: string
}

// 业务: 兼容 牛津/朗文 词性 + 旧 W94 格式
// - n/v/adj/adv: 主 词性
// - art/prep/pron/int/abbr/aux/conj/num: 辅 词性
// - vt/vi: 旧 格式 (W94 兼容)
// - det: 限定词 (this/that 牛津 标 det)
// - pl: 复数 标记
// - &: 旧 格式 分隔符
const VALID_POS = new Set(['n', 'v', 'adj', 'adv', 'art', 'prep', 'pron', 'int', 'abbr', 'aux', 'conj', 'num', 'vt', 'vi', 'det', 'pl', '&'])

/** 校验 1 词 */
export function checkWordConsistency(word: Word): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  // 1. 词性 短形式
  // 业务: 'n & v' 拆分 后 ['n', '&', 'v'] 业务 OK
  for (const p of word.pos || []) {
    const parts = p.toLowerCase().split(/[&,\/]\s*/).map(s => s.trim()).filter(x => x)
    for (const pn of parts) {
      if (pn && !VALID_POS.has(pn)) {
        issues.push({
          wordId: word.id,
          word: word.word,
          type: 'pos_format',
          message: `词性 '${p}' 拆分 后 '${pn}' 不 在 短形式 白名单 (n/v/adj/adv/...)`,
        })
      }
    }
  }
  // 2. 释义 不空
  if (!word.translations || word.translations.length === 0) {
    issues.push({ wordId: word.id, word: word.word, type: 'missing_translation', message: '无 中文释义' })
  }
  // 3. 例句 不空 (W95 已 100% 覆盖)
  if (!word.examples || word.examples.length === 0) {
    issues.push({ wordId: word.id, word: word.word, type: 'empty_examples', message: '无 例句' })
  }
  // 4. 短语 不空 (W93 已 100% 覆盖)
  if (!word.phrases || word.phrases.length === 0) {
    issues.push({ wordId: word.id, word: word.word, type: 'empty_phrases', message: '无 短语' })
  }
  // 5. 词根 不空 (W94 业务 允许空)
  // 业务: 短 词 派生 词 词根 可 空, 不 算 issue
  return issues
}

/** 批量 校验 */
export function checkAllWords(words: Word[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  for (const w of words) {
    issues.push(...checkWordConsistency(w))
  }
  return issues
}

/** 统计 按 type */
export function summarizeIssues(issues: ConsistencyIssue[]): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const i of issues) {
    summary[i.type] = (summary[i.type] || 0) + 1
  }
  return summary
}
