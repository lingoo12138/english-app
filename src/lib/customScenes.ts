// customScenes.ts - v1.14.0 B4 自定义场景课
// 用户粘贴文本 → LLM 提取生词 → 存 IDB → 复用场景学习
import { chatCompletion, LLMProvider } from './providers/llm'
import { addCustomScene, getAllCustomScenes as dbGetAll, getCustomScene as dbGet, deleteCustomScene as dbDelete } from './db'

/** 生词 */
export interface CustomWord {
  word: string
  translation: string
  example: string
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
}

/** 自定义场景 */
export interface CustomScene {
  id?: number
  title: string
  sourceText: string  // 用户原始文本 (截断 10000)
  words: CustomWord[]
  createdAt: number
  updatedAt: number
}

/** LLM 提取结果 schema */
interface ExtractResult {
  words: CustomWord[]
}

export const MAX_TEXT_LEN = 10000  // 文本上限
export const MAX_WORDS = 30        // 生词数上限
export const MIN_WORDS = 5         // 最少生词数

/** 截断文本 */
export function truncateText(text: string, maxLen = MAX_TEXT_LEN): string {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

/** 简单英文停用词 (mock 过滤用) */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of', 's', 't',
  'just', 'now', 'also', 'only', 'very', 'really', 'quite', 'get', 'got', 'go', 'went',
  'come', 'came', 'see', 'saw', 'know', 'knew', 'take', 'took', 'make', 'made',
])

/** mock 提取生词 (LLM 失败 fallback) */
export function mockExtractWords(text: string, maxWords: number = MAX_WORDS): CustomWord[] {
  if (!text) return []
  // 1. 简单分词
  const words = text.toLowerCase().match(/[a-z]+/g) || []
  // 2. 过滤停用词 + 长度 < 4
  const filtered = words.filter(w => !STOPWORDS.has(w) && w.length >= 4)
  // 3. 词频统计
  const freq = new Map<string, number>()
  filtered.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))
  // 4. 按频次排序, 去重, 取 top N
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(([w]) => w)
  // 5. 构造假释义 + 假例句
  return top.map((w, idx) => {
    const difficulty: CustomWord['difficulty'] =
      w.length <= 5 ? 'A2' : w.length <= 8 ? 'B1' : w.length <= 11 ? 'B2' : 'C1'
    return {
      word: w,
      translation: `${w} (释义占位 ${idx + 1})`,
      example: `The word "${w}" appears in this passage.`,
      difficulty,
    }
  })
}

/** 严格解析 LLM 返回的 JSON */
export function parseExtractResult(json: string): CustomWord[] {
  try {
    const data = JSON.parse(json) as ExtractResult
    if (!data || !Array.isArray(data.words)) {
      throw new Error('JSON 格式错误: 缺 words 数组')
    }
    const words: CustomWord[] = []
    for (const w of data.words) {
      if (!w || typeof w.word !== 'string' || !w.word.trim()) continue
      const difficulty: CustomWord['difficulty'] =
        ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(w.difficulty) ? w.difficulty : 'B1'
      words.push({
        word: w.word.trim().toLowerCase(),
        translation: typeof w.translation === 'string' ? w.translation : `${w.word} (释义占位)`,
        example: typeof w.example === 'string' ? w.example : `Example with ${w.word}.`,
        difficulty,
      })
      if (words.length >= MAX_WORDS) break
    }
    return words
  } catch (e) {
    console.warn('[customScenes] 解析 LLM 结果失败:', e)
    return []
  }
}

/** LLM 提取生词 (调 chatCompletion + JSON 模式) */
export async function extractWordsFromText(
  text: string,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  maxWords: number = MAX_WORDS,
): Promise<CustomWord[]> {
  if (!text || !text.trim()) return []
  const truncated = truncateText(text)

  // mock 渠道: 直接走 mockExtractWords
  if (provider.id === 'mock') {
    return mockExtractWords(truncated, maxWords)
  }

  const systemPrompt = `You are an English vocabulary extractor for Chinese learners at CEFR B1+ level.
Analyze the given English text and extract ${MIN_WORDS}-${maxWords} useful words/phrases for learning.
Return strict JSON: {"words": [{"word": "string", "translation": "Chinese translation", "example": "English example sentence", "difficulty": "A1|A2|B1|B2|C1|C2"}]}
Rules:
- Pick words that are NOT common (skip a/the/is/etc)
- Include varied difficulty (mix of B1, B2, C1)
- Example sentences should be natural and short
- Return ONLY the JSON, no explanation`

  const userPrompt = `Extract vocabulary from this text:\n\n${truncated}`

  try {
    const resp = await chatCompletion({
      provider,
      apiKey,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 1500,
      jsonMode: true,
    })
    const words = parseExtractResult(resp.content)
    if (words.length >= MIN_WORDS) {
      return words
    }
    // 解析后不够, 用 mock 补
    console.warn('[customScenes] LLM 返词数不足, mock 补')
    return mockExtractWords(truncated, maxWords)
  } catch (e) {
    console.warn('[customScenes] LLM 失败, 走 mock:', e)
    return mockExtractWords(truncated, maxWords)
  }
}

/** 从文本第 1 句提取标题 (≤ 30 字符) */
export function autoExtractTitle(text: string): string {
  if (!text) return '未命名场景'
  // 找第一个句号/问号/感叹号/换行
  const m = text.match(/^[^.!?\n]{1,60}/)
  const first = m ? m[0].trim() : text.slice(0, 30).trim()
  return first.length > 30 ? first.slice(0, 30) + '…' : first
}

/** 保存自定义场景 */
export async function saveCustomScene(scene: CustomScene): Promise<number> {
  const now = Date.now()
  return addCustomScene({
    ...scene,
    createdAt: scene.createdAt || now,
    updatedAt: now,
  })
}

/** 取所有自定义场景 */
export async function getAllCustomScenes(): Promise<CustomScene[]> {
  const items = await dbGetAll()
  return items.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** 取单个 */
export async function getCustomSceneById(id: number): Promise<CustomScene | undefined> {
  return dbGet(id)
}

/** 删除 */
export async function deleteCustomSceneById(id: number): Promise<void> {
  return dbDelete(id)
}
