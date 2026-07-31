// wordNetwork.ts - v1.85-A 触类旁通 (Word Network)
// 同根 / 同义 / 反义 / 搭配 网状图
//
// 数据源:
//   - 同根: words.json 中所有共享同一词根 (root) 的词
//   - 同义: src/data/synonyms.ts 手工 146 词 (朗文当代/牛津高阶)
//   - 反义: src/data/antonyms.ts 手工 81 对常见高频反义对
//   - 搭配: words.json 中共享同一短语 (phrase) 的其他词
//
// 设计: 全部纯静态数据 + 缓存, 零运行时依赖, 0 网络调用
// 缓存: Map<string, string[]>, key = `${type}::${word.toLowerCase()}`

import { loadWords } from './words'
import type { Word } from '../types'
import { SYNONYM_GROUPS } from '../data/synonyms'
import { ANTONYM_PAIRS, ANTONYM_REVERSE } from '../data/antonyms'

// ─── 类型 ──────────────────────────────────────────────────

export type NetworkType = 'root' | 'synonym' | 'antonym' | 'collocation'

/** NetworkType 校验 */
export function isNetworkType(s: string): s is NetworkType {
  return s === 'root' || s === 'synonym' || s === 'antonym' || s === 'collocation'
}

// ─── 缓存 ──────────────────────────────────────────────────

/** 全局缓存: key = `${type}::${word.toLowerCase()}` → 结果数组 */
const cache = new Map<string, string[]>()

function cacheKey(type: NetworkType, word: string): string {
  return `${type}::${word.trim().toLowerCase()}`
}

function getCached(type: NetworkType, word: string): string[] | undefined {
  return cache.get(cacheKey(type, word))
}

function setCached(type: NetworkType, word: string, result: string[]): void {
  cache.set(cacheKey(type, word), result)
}

/** 清空缓存 (测试用) */
export function clearNetworkCache(): void {
  cache.clear()
}

// ─── 工具: 短语字段归一化 ─────────────────────────────────
//
// words.json 短语字段不统一:
//   - 部分用 { phrase, translation }  (types.ts 规范)
//   - 部分用 { en, zh }              (朗文 csv 转换产物)
// 这里统一抽出 en 字段, 兼容两种格式

interface RawPhrase {
  phrase?: string
  translation?: string
  en?: string
  zh?: string
}

function getPhraseText(p: RawPhrase): string {
  return (p.phrase || p.en || '').trim()
}

function getPhraseTranslation(p: RawPhrase): string {
  return (p.translation || p.zh || '').trim()
}

// ─── 工具: 归一化主词 ────────────────────────────────────

function norm(word: string): string {
  return word.trim().toLowerCase()
}

// ─── 内部核心 (接受 words 参数, 可测试) ──────────────────

/** 找同根词 (内部实现, 接受 words 数组) */
function findRelatedByRoot(words: Word[], target: string): string[] {
  const targetWord = words.find(w => norm(w.word) === target)
  if (!targetWord || !targetWord.roots || targetWord.roots.length === 0) {
    return []
  }
  // 取出所有 root 字符串
  const targetRoots = new Set(targetWord.roots.map(r => r.root))
  // 找其他共享 root 的词
  const result: string[] = []
  const seen = new Set<string>()  // 去重
  for (const w of words) {
    if (norm(w.word) === target) continue  // 跳过自身
    if (!w.roots) continue
    const shared = w.roots.some(r => targetRoots.has(r.root))
    if (shared && !seen.has(norm(w.word))) {
      result.push(w.word)
      seen.add(norm(w.word))
    }
  }
  result.sort()
  return result
}

/** 找搭配 (内部实现, 接受 words 数组) */
function findRelatedCollocation(words: Word[], target: string): string[] {
  const targetWord = words.find(w => norm(w.word) === target)
  if (!targetWord || !targetWord.phrases || targetWord.phrases.length === 0) {
    return []
  }
  // 收集目标词的所有短语 (归一化)
  const targetPhrases = new Set<string>()
  for (const p of targetWord.phrases) {
    const text = getPhraseText(p as RawPhrase).toLowerCase()
    if (text) targetPhrases.add(text)
  }
  if (targetPhrases.size === 0) return []
  // 找其他词
  const result: string[] = []
  const seen = new Set<string>()
  for (const w of words) {
    if (norm(w.word) === target) continue
    if (!w.phrases) continue
    for (const p of w.phrases) {
      const text = getPhraseText(p as RawPhrase).toLowerCase()
      if (text && targetPhrases.has(text)) {
        if (!seen.has(norm(w.word))) {
          result.push(w.word)
          seen.add(norm(w.word))
        }
        break  // 找到一次就够了, 跳出短语循环
      }
    }
  }
  result.sort()
  return result
}

// ─── 1. 同根词 ──────────────────────────────────────────────

/**
 * 找同根词
 * 算法: 遍历 words.json, 找所有 roots 字段与目标词共享至少一个 root 的其他词
 *
 * @param word 单词 (大小写不敏感)
 * @param words 可选, 显式传入 words 数组 (测试用); 不传则自动 loadWords()
 * @returns 同根词列表 (按字母顺序, 不含自身)
 */
export async function getRelatedByRoot(word: string, words?: Word[]): Promise<string[]> {
  const cached = getCached('root', word)
  if (cached) return cached
  const target = norm(word)
  const wordList = words ?? await loadWords()
  const result = findRelatedByRoot(wordList, target)
  setCached('root', word, result)
  return result
}

// ─── 2. 同义词 ──────────────────────────────────────────────

/**
 * 找同义词
 * 数据源: src/data/synonyms.ts (朗文当代 + 牛津高阶)
 *
 * @param word 单词 (大小写不敏感)
 * @returns 同义词列表 (按使用频率降序)
 */
export async function getRelatedSynonym(word: string): Promise<string[]> {
  const cached = getCached('synonym', word)
  if (cached) return cached
  const target = norm(word)
  const group = SYNONYM_GROUPS[target]
  if (!group) {
    setCached('synonym', word, [])
    return []
  }
  // v1.86: 不过滤, 全部返 (同义词是"参考词"功能, 用户可看可学, UI 区分可点/不可点)
  const result = [...group.synonyms]
  setCached('synonym', word, result)
  return result
}

/** v1.86: 检查词是否在 words.json (用于 UI 区分可点/不可点) */
export async function isInWordList(word: string): Promise<boolean> {
  const allWords = await loadWords()
  return allWords.some(w => w.word.toLowerCase() === word.toLowerCase())
}

// ─── 3. 反义词 ──────────────────────────────────────────────

/**
 * 找反义词
 * 数据源: src/data/antonyms.ts (朗文当代 + 牛津高阶)
 *
 * @param word 单词 (大小写不敏感)
 * @returns 反义词列表 (通常 0 或 1 个, 严格反义)
 */
export async function getRelatedAntonym(word: string): Promise<string[]> {
  const cached = getCached('antonym', word)
  if (cached) return cached
  const target = norm(word)
  // 1. 直接查 (主词 → 反义词)
  const direct = ANTONYM_PAIRS[target]
  if (direct) {
    const result = [direct.antonym]
    setCached('antonym', word, result)
    return result
  }
  // 2. 反向查 (反义值 → 主词): 输入是"反义值"时, 主词本身就是反义
  const reverseWord = ANTONYM_REVERSE[target]
  if (reverseWord) {
    const result = [reverseWord]
    setCached('antonym', word, result)
    return result
  }
  setCached('antonym', word, [])
  return []
}

// ─── 4. 搭配 ────────────────────────────────────────────────

/**
 * 找搭配
 * 算法: 找 words.json 中与目标词共享至少一个短语的 其他词
 *
 * @param word 单词 (大小写不敏感)
 * @param words 可选, 显式传入 words 数组 (测试用); 不传则自动 loadWords()
 * @returns 共享短语的其他词列表 (按字母顺序, 不含自身)
 */
export async function getRelatedCollocation(word: string, words?: Word[]): Promise<string[]> {
  const cached = getCached('collocation', word)
  if (cached) return cached
  const target = norm(word)
  const wordList = words ?? await loadWords()
  const result = findRelatedCollocation(wordList, target)
  setCached('collocation', word, result)
  return result
}

// ─── 统一入口 ──────────────────────────────────────────────

/**
 * 统一入口: 根据 type 调度对应函数
 *
 * @param word 单词
 * @param type 网络类型 (root / synonym / antonym / collocation)
 * @returns 相关词列表
 */
export async function getRelatedWords(
  word: string,
  type: NetworkType,
): Promise<string[]> {
  switch (type) {
    case 'root': return getRelatedByRoot(word)
    case 'synonym': return getRelatedSynonym(word)
    case 'antonym': return getRelatedAntonym(word)
    case 'collocation': return getRelatedCollocation(word)
  }
}

// ─── 高级查询: 4 类一次性返回 ──────────────────────────────

/** 一次性返回 4 类相关词 (UI 展示用) */
export interface WordNetwork {
  root: string[]
  synonym: string[]
  antonym: string[]
  collocation: string[]
}

export async function getFullNetwork(word: string): Promise<WordNetwork> {
  const [root, synonym, antonym, collocation] = await Promise.all([
    getRelatedByRoot(word),
    getRelatedSynonym(word),
    getRelatedAntonym(word),
    getRelatedCollocation(word),
  ])
  return { root, synonym, antonym, collocation }
}

// ─── 工具: 检查词是否在词库中 ──────────────────────────────

/** 词是否在 words.json 中 (任何大小写都能查) */
export async function wordExists(word: string, words?: Word[]): Promise<boolean> {
  const wordList = words ?? await loadWords()
  return wordList.some(w => norm(w.word) === norm(word))
}

// ─── 工具: 在数据源中查 word (给 UI 跳转用) ──────────────

/** 在 words.json 中查 word 的完整记录 (用于跳转 /words/:id) */
export async function findWordByName(word: string, words?: Word[]): Promise<Word | undefined> {
  const wordList = words ?? await loadWords()
  return wordList.find(w => norm(w.word) === norm(word))
}
