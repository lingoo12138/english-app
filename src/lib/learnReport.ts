// 学习报告生成 - v0.21
// 从 AI 对话中提取用户用过的英文词汇,与词库匹配,生成统计
import type { ChatRecord } from './db'
import type { Word } from '../types'
import { loadWords } from './words'

export interface VocabUsage {
  word: string  // 小写
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  count: number  // 在对话中出现次数
  matched: Word | null  // 词库中的完整词
  firstUsed: number  // 首次使用时间
  lastUsed: number
  scenario: string
  perScenario: Record<string, number>  // 场景 -> 次数
}

export interface LearnReport {
  totalChats: number
  totalMessages: number
  totalUserMessages: number
  totalVocab: number  // 去重后的词数
  totalWordsUsed: number  // 含重复
  levelDistribution: Record<string, number>  // 难度 -> 词数
  scenarioDistribution: Record<string, number>  // 场景 -> 词数
  topWords: VocabUsage[]  // 高频词(按 count 降序)
  rareWords: VocabUsage[]  // B2/C1/C2 难词
  recentWords: VocabUsage[]  // 最近用的
  chatsByDay: Record<string, number>  // 日期 -> 对话数
  totalStudyTime: number  // 估算: 总消息数 * 30s
}

// 英文停用词(常见虚词,不算"使用过的词")
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
  'what', 'who', 'which', 'that', 'this', 'these', 'those', 'is', 'am', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall', 'i', 'me', 'my',
  'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
  'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'of', 'in', 'on',
  'at', 'to', 'from', 'by', 'for', 'with', 'about', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'against', 'up', 'down', 'off',
  'over', 'under', 'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'yeah',
  'yes', 'ok', 'okay', 'oh', 'ah', 'um', 'hmm', 'well', 'hi', 'hello', 'thanks', 'thank',
  'please', 'sorry', 'really', 'actually', 'think', 'know', 'like', 'want', 'need',
  'get', 'got', 'go', 'went', 'come', 'came', 'see', 'saw', 'say', 'said', 'tell',
  'told', 'ask', 'asked', 'make', 'made', 'take', 'took', 'give', 'gave', 'find',
  'found', 'let', 'put', 'mean', 'keep', 'help', 'start', 'show', 'hear', 'play',
  'run', 'move', 'live', 'believe', 'bring', 'happen', 'must', 'shall', 'go', 'one',
  'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
])

// 从文本中提取英文词
function extractEnglishWords(text: string): string[] {
  // 匹配连续 a-z 字母 (2+ 个字符)
  const matches = text.match(/[a-zA-Z]{2,}/g) || []
  return matches.map(w => w.toLowerCase()).filter(w => !STOP_WORDS.has(w) && w.length >= 2)
}

export async function generateLearnReport(chats: ChatRecord[]): Promise<LearnReport> {
  const words = await loadWords()
  const wordMap = new Map<string, Word>()
  for (const w of words) {
    wordMap.set(w.word.toLowerCase(), w)
  }

  // 词汇使用统计
  const usage = new Map<string, VocabUsage>()
  const levelDist: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, unknown: 0 }
  const scenarioDist: Record<string, number> = {}
  const chatsByDay: Record<string, number> = {}
  let totalUserMessages = 0
  let totalMessages = 0
  let totalWordsUsed = 0

  for (const chat of chats) {
    // 场景统计
    scenarioDist[chat.scenario] = (scenarioDist[chat.scenario] || 0) + 1
    // 日期统计
    const day = new Date(chat.createdAt).toISOString().slice(0, 10)
    chatsByDay[day] = (chatsByDay[day] || 0) + 1

    for (const m of chat.messages) {
      totalMessages++
      if (m.role !== 'user') continue
      totalUserMessages++

      const tokens = extractEnglishWords(m.content)
      for (const word of tokens) {
        totalWordsUsed++
        const existing = usage.get(word)
        if (existing) {
          existing.count++
          existing.lastUsed = Math.max(existing.lastUsed, m.ts)
          existing.perScenario[chat.scenario] = (existing.perScenario[chat.scenario] || 0) + 1
        } else {
          const matched = wordMap.get(word) || null
          usage.set(word, {
            word,
            level: matched?.level as any,
            count: 1,
            matched,
            firstUsed: m.ts,
            lastUsed: m.ts,
            scenario: chat.scenario,
            perScenario: { [chat.scenario]: 1 },
          })
        }
      }
    }
  }

  // 难度分布
  for (const u of usage.values()) {
    const lvl = u.level || 'unknown'
    levelDist[lvl] = (levelDist[lvl] || 0) + 1
  }

  const all = Array.from(usage.values())
  const topWords = [...all].sort((a, b) => b.count - a.count).slice(0, 30)
  const rareWords = all
    .filter(u => u.level && (u.level === 'B2' || u.level === 'C1' || u.level === 'C2'))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
  const recentWords = [...all].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 30)

  return {
    totalChats: chats.length,
    totalMessages,
    totalUserMessages,
    totalVocab: usage.size,
    totalWordsUsed,
    levelDistribution: levelDist,
    scenarioDistribution: scenarioDist,
    topWords,
    rareWords,
    recentWords,
    chatsByDay,
    totalStudyTime: totalUserMessages * 30,  // 估算: 每条消息 30s
  }
}

export function exportReportJSON(report: LearnReport): string {
  return JSON.stringify(report, null, 2)
}

export function levelLabel(level?: string): string {
  switch (level) {
    case 'A1': return '入门'
    case 'A2': return '基础'
    case 'B1': return '中级'
    case 'B2': return '中高级'
    case 'C1': return '高级'
    case 'C2': return '母语级'
    default: return '未匹配'
  }
}

export function levelColor(level?: string): string {
  switch (level) {
    case 'A1': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'A2': return 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300'
    case 'B1': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    case 'B2': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    case 'C1': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'C2': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    default: return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
  }
}
