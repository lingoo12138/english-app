// fillblank.ts - v1.85.0 C 填空练习
// 挖词练习: 短句 1 词 (4 选 1) + 长句 2-3 词 (拖拽/输入)
// 数据源: 复用 words.json 的 examples + phrases, 不造新句
import type { Word } from '../types'

/** 单个空 */
export interface Blank {
  /** 0-based 词在原句 tokens 中的位置 */
  position: number
  /** 正确答案 (lower-case, 原句中的形式) */
  answer: string
  /** 短句: 4 选 1 候选; 长句: [] 让用户输入/拖拽 */
  options: string[]
  /** 提示: 词根/翻译/近义 */
  hint: string
  /** 答题方式: 选择 or 输入 */
  type: 'choice' | 'input'
}

/** 一道题 */
export interface Question {
  id: string
  /** 含 ___ 占位符的展示句 */
  sentence: string
  /** 完整原句 (答案时回填) */
  fullSentence: string
  blanks: Blank[]
  level: Word['level']
  /** 短句 1 词 / 长句 2-3 词 */
  type: 'short' | 'long'
  /** 主词 ID (用于错题加 favorites) */
  wordId: string
  /** 主词 (展示) */
  word: string
  /** 中文翻译 (展示) */
  translation: string
}

/** 难度筛选 */
export type FillBlankLevel = 'all' | Word['level']

/** 配置项 */
export interface GenerateOptions {
  /** 题目数, 默认 20 */
  count?: number
  /** 难度, 默认 all */
  level?: FillBlankLevel
  /** 短句最少词数 (默认 10) */
  shortMin?: number
  /** 短句最多词数 (默认 15) */
  shortMax?: number
  /** 长句最少词数 (默认 15) */
  longMin?: number
  /** 长句最多词数 (默认 25) */
  longMax?: number
  /** 短长比 (0~1, 默认 0.5) */
  shortRatio?: number
}

// 简单 stop words, 挖空时跳过 (功能词太简单)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'and', 'or', 'but', 'so', 'if', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'as', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'than',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'may', 'might', 'must',
])

/** 词频 / 短语 / 介词 综合评分 (高 = 优先挖空) */
function tokenPriority(token: string, words: Word[]): number {
  const t = token.toLowerCase().replace(/[^a-z'-]/g, '')
  if (!t || STOP_WORDS.has(t)) return 0
  // 在 words.json 中查该词
  const w = words.find(x => x.word.toLowerCase() === t)
  if (!w) return 1  // 不在词库, 也算可挖
  let score = w.frequency || 1
  if (w.tags?.includes('高频')) score += 5
  // 短语动词: 该词 phrases 中含短语, 算短语动词
  if (w.phrases && w.phrases.length > 0) {
    for (const p of w.phrases) {
      if (p.phrase && p.phrase.toLowerCase().includes(' ')) {
        score += 2  // 多词短语
      }
    }
  }
  // 介词搭配: 短语以介词开头 (in/of/on/to/for/with/at/...)
  if (w.phrases) {
    for (const p of w.phrases) {
      const ph = (p.phrase || '').toLowerCase().trim()
      if (/^(in|of|on|to|for|with|at|by|from|under|over|about|into)\s/.test(ph)) {
        score += 1
      }
    }
  }
  return score
}

/** 简单分词: 保留标点为独立 token, 字母词 + 标点 */
export function tokenize(sentence: string): string[] {
  return sentence
    .replace(/([.,!?;:])/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean)
}

/** 重新组合 tokens 为句子 (保留空格) */
export function joinTokens(tokens: string[]): string {
  // 标点前不留空格
  return tokens
    .reduce((acc, t, i) => {
      if (i === 0) return t
      if (/^[.,!?;:)]/.test(t)) return acc + t
      if (/[(\[]$/.test(acc)) return acc + t
      return acc + ' ' + t
    }, '')
    .replace(/\s+([.,!?;:])/g, '$1')
}

/** 生成 4 选 1 选项: 正确答案 + 3 干扰项 (从其他词库抽) */
// v1.86 P1-填空-3: 长度匹配 (|len - answer| ≤ 3), 否则干扰项离谱
function generateOptions(
  answer: string,
  pool: Word[],
  excludeWordId: string,
  rng: () => number,
): string[] {
  const distractors = new Set<string>()
  const candidates = pool.filter(w => w.id !== excludeWordId)
  // v1.86: 长度匹配 (优选 |len - answer| ≤ 3)
  const aLen = answer.length
  const sorted = [...candidates].sort((a, b) => {
    const da = Math.abs(a.word.length - aLen)
    const db = Math.abs(b.word.length - aLen)
    return da - db
  })
  // 随机洗牌 (Fisher-Yates with rng)
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  }
  // v1.86: 答案去重 + 长度合理
  const MAX_DIST = Math.max(3, Math.ceil(aLen * 0.6))  // 60% 浮动
  for (const w of sorted) {
    if (distractors.size >= 3) break
    if (w.word.toLowerCase() === answer.toLowerCase()) continue
    if (Math.abs(w.word.length - aLen) > MAX_DIST) continue
    distractors.add(w.word)
  }
  // fallback: 用随机字符补足
  let i = 0
  while (distractors.size < 3) {
    distractors.add(`opt${i++}`)
  }
  const opts = [...distractors, answer]
  // 洗牌
  for (let k = opts.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    ;[opts[k], opts[j]] = [opts[j], opts[k]]
  }
  return opts
}

/** 简单可注入 RNG, 测试可复现 */
export type Rng = () => number

/** 给定主词和例句, 构建单道题 */
export function buildQuestion(
  source: Word,
  sentence: string,
  type: 'short' | 'long',
  pool: Word[],
  rng: Rng = Math.random,
): Question | null {
  const tokens = tokenize(sentence)
  if (tokens.length < 5) return null

  // 找出所有可挖位置 (非 stop word, 非纯标点)
  const candidatePositions: number[] = []
  // 短语动词副词/介词列表 (call up, get on, take off, put on, give up, look up, find out...)
  const PV_ADV = new Set(['up', 'down', 'in', 'out', 'on', 'off', 'away', 'back', 'over', 'along', 'through'])
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (/^[.,!?;:()\[\]"]+$/.test(t)) continue
    if (STOP_WORDS.has(t.toLowerCase().replace(/[^a-z'-]/g, ''))) continue
    // v1.86 P1-填空-2: 跳过短语动词位置 — 后面紧跟介副词的动词, 单独挖会破坏短语 (call → up)
    if (i + 1 < tokens.length && PV_ADV.has(tokens[i + 1].toLowerCase())) {
      continue
    }
    // 前面紧跟介副词的 (call up 整体被跳过, 但 call 也跳过只挖 up 也不对)
    // 只跳过前半 (call) 即可
    candidatePositions.push(i)
  }
  if (candidatePositions.length === 0) return null

  // 按 tokenPriority 排序, 选最关键的
  candidatePositions.sort((a, b) => {
    return tokenPriority(tokens[b], pool) - tokenPriority(tokens[a], pool)
  })

  const blankCount = type === 'short' ? 1 : (rng() < 0.5 ? 2 : 3)
  const pickedPositions = candidatePositions.slice(0, Math.min(blankCount, candidatePositions.length))

  // v1.86 P1-填空-1: 答案去重 (同一空句同一词不挖 2 次)
  const seenAnswers = new Set<string>()
  const dedupedPositions = pickedPositions.filter((pos) => {
    const t = tokens[pos].replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (seenAnswers.has(t)) return false
    seenAnswers.add(t)
    return true
  })

  // 构建 blanks (hint 应该是挖空的词/翻译, 不是主词)
  const blanks: Blank[] = []
  dedupedPositions.forEach((pos, idx) => {
    const answer = tokens[pos].replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (!answer) return  // 跳过无字母的
    const isChoice = type === 'short'
    // 找挖空词本身的翻译 (从 pool 查)
    const answerWord = pool.find(w => w.word.toLowerCase() === answer)
    const answerHint = answerWord?.translations?.[0] || answer
    if (isChoice) {
      blanks.push({
        position: pos,
        answer,
        options: generateOptions(answer, pool, source.id, rng),
        hint: answerHint,  // 挖空词的翻译, 不是主词
        type: 'choice',
      })
    } else {
      // 长句 input: 多个空, 第一个给翻译, 后面给 "第 N 个词"
      blanks.push({
        position: pos,
        answer,
        options: [],
        hint: idx === 0 ? answerHint : `第 ${idx + 1} 个词 (${answerHint})`,
        type: 'input',
      })
    }
  })

  if (blanks.length === 0) return null

  // 构建展示句: 用 ___ 替换
  const displayTokens = [...tokens]
  // 从后往前替换, 避免影响 position
  const sortedBlankPositions = [...blanks].sort((a, b) => b.position - a.position)
  for (const b of sortedBlankPositions) {
    displayTokens[b.position] = '___'
  }
  const displaySentence = joinTokens(displayTokens)

  return {
    id: `q-${source.id}-${Math.floor(rng() * 1e9)}`,
    sentence: displaySentence,
    fullSentence: sentence,
    blanks,
    level: source.level,
    type,
    wordId: source.id,
    word: source.word,
    translation: source.translations[0] || '',
  }
}

/** 挖空算分: 用户答案对比 (大小写不敏感, 去标点) */
export function checkAnswer(blank: Blank, userAnswer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9'-]/g, '')
  return norm(userAnswer) === norm(blank.answer)
}

/** 从词库挑 N 道题 */
export function generateQuestions(
  words: Word[],
  count: number = 20,
  options: GenerateOptions = {},
  rng: Rng = Math.random,
): Question[] {
  const {
    level = 'all',
    shortMin = 10,
    shortMax = 15,
    longMin = 15,
    longMax = 25,
    shortRatio = 0.5,
  } = options

  // 筛选 + 排序: 优先有 example, 高频, 高频 tag
  const filtered = words.filter(w => w.examples && w.examples.length > 0)
  const ranked = [...filtered].sort((a, b) => {
    const scoreA = (a.tags?.includes('高频') ? 10 : 0) + (a.frequency || 0) * 2 + a.examples.length
    const scoreB = (b.tags?.includes('高频') ? 10 : 0) + (b.frequency || 0) * 2 + b.examples.length
    return scoreB - scoreA
  })
  // 难度筛选
  const pool = (level === 'all' ? ranked : ranked.filter(w => w.level === level))
  if (pool.length === 0) return []

  const questions: Question[] = []
  const usedSentences = new Set<string>()
  const shortTarget = Math.round(count * shortRatio)
  const longTarget = count - shortTarget

  // 先收集每个词的可用例句 (按词数分类)
  for (const w of pool) {
    if (questions.length >= count) break
    for (const ex of w.examples || []) {
      if (questions.length >= count) break
      if (usedSentences.has(ex.en)) continue
      const wc = tokenize(ex.en).length
      let qType: 'short' | 'long' | null = null
      if (wc >= shortMin && wc <= shortMax) qType = 'short'
      else if (wc >= longMin && wc <= longMax) qType = 'long'
      if (!qType) continue
      // 短句配额已满则跳过
      if (qType === 'short' && questions.filter(q => q.type === 'short').length >= shortTarget) continue
      if (qType === 'long' && questions.filter(q => q.type === 'long').length >= longTarget) continue
      const q = buildQuestion(w, ex.en, qType, pool, rng)
      if (q) {
        questions.push(q)
        usedSentences.add(ex.en)
      }
    }
  }
  return questions
}
