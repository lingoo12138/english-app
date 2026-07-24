// synonyms.ts - v1.10.0-B 同义词辨析
// 复用 D2 (llmTutor) 模式 + errorExplanations 缓存
import { chatCompletion, type LLMProvider } from './providers/llm'
import { getOrCreateExplanation } from './db'

export interface Synonym {
  word: string         // 同义词
  nuance: string       // 细微差别 (中文)
  example: string      // 例句
}

export interface ConfusedWord {
  word: string         // 混淆词
  diff: string         // 与原词区别 (中文)
}

export interface SynonymExplanation {
  synonyms: Synonym[]        // 3-5 个同义词
  confused: ConfusedWord[]   // 2-3 个混淆词
  cached?: boolean
}

const SYSTEM_PROMPT = `你是一位耐心的英语老师。用户给出一个英文单词 (及中文释义), 请列出它的同义词和容易混淆的词。

严格用 JSON 格式输出, 不要 markdown 代码块:
{
  "synonyms": [
    {"word": "glad", "nuance": "更口语化, 短时满足", "example": "I am glad to see you."},
    {"word": "joyful", "nuance": "更强烈, 持续喜悦", "example": "a joyful occasion"}
  ],
  "confused": [
    {"word": "happy", "diff": "通用词, 任何场景都用"},
    {"word": "glad", "diff": "比 happy 更礼貌, 短时情绪"}
  ]
}

synonyms 3-5 个, confused 2-3 个, 总长 ≤ 400 字。`

export function synonymKey(word: string, pos: string): string {
  return `synonym::${word.trim().toLowerCase()}::${pos.trim().toLowerCase()}`.slice(0, 200)
}

export function parseSynonyms(content: string): SynonymExplanation {
  let c = content.trim()
  if (c.startsWith('```')) {
    c = c.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  const i = c.indexOf('{')
  const j = c.lastIndexOf('}')
  if (i >= 0 && j > i) {
    c = c.slice(i, j + 1)
  }
  try {
    const obj = JSON.parse(c)
    const synonyms = Array.isArray(obj.synonyms) ? obj.synonyms.map((s: unknown) => {
      const ss = (s && typeof s === 'object' ? s : {}) as { word?: unknown; nuance?: unknown; example?: unknown }
      return {
        word: String(ss.word || ''),
        nuance: String(ss.nuance || ''),
        example: String(ss.example || ''),
      }
    }).filter((s: Synonym) => s.word) : []
    const confused = Array.isArray(obj.confused) ? obj.confused.map((c: unknown) => {
      const cc = (c && typeof c === 'object' ? c : {}) as { word?: unknown; diff?: unknown }
      return {
        word: String(cc.word || ''),
        diff: String(cc.diff || ''),
      }
    }).filter((c: ConfusedWord) => c.word) : []
    return { synonyms, confused }
  } catch {
    return {
      synonyms: [],
      confused: [],
    }
  }
}

const MOCK_SYNONYMS: Record<string, SynonymExplanation> = {
  happy: {
    synonyms: [
      { word: 'glad', nuance: '更口语化, 短时满足', example: 'I am glad to see you.' },
      { word: 'joyful', nuance: '更强烈, 持续喜悦', example: 'a joyful occasion' },
      { word: 'cheerful', nuance: '更外向, 散发快乐', example: 'a cheerful smile' },
    ],
    confused: [
      { word: 'happy', diff: '通用词, 任何场景都用' },
      { word: 'glad', diff: '比 happy 更礼貌, 短时情绪' },
    ],
  },
  sad: {
    synonyms: [
      { word: 'unhappy', nuance: '否定式, 不高兴', example: 'an unhappy ending' },
      { word: 'gloomy', nuance: '更暗, 长期低落', example: 'a gloomy atmosphere' },
      { word: 'depressed', nuance: '医学/严重抑郁', example: 'feeling depressed' },
    ],
    confused: [
      { word: 'sad', diff: '通用, 短期情绪' },
      { word: 'depressed', diff: '长期, 临床诊断' },
    ],
  },
  angry: {
    synonyms: [
      { word: 'mad', nuance: '口语, 强烈愤怒', example: 'Don\'t be mad at me.' },
      { word: 'furious', nuance: '极端愤怒', example: 'a furious customer' },
      { word: 'annoyed', nuance: '轻微恼怒', example: 'I\'m a bit annoyed.' },
    ],
    confused: [
      { word: 'angry', diff: '中等强度' },
      { word: 'furious', diff: '强度最高' },
    ],
  },
  big: {
    synonyms: [
      { word: 'large', nuance: '更正式, 可测量', example: 'a large house' },
      { word: 'huge', nuance: '巨大, 强调', example: 'a huge success' },
      { word: 'enormous', nuance: '超出正常, 夸张', example: 'an enormous effort' },
    ],
    confused: [
      { word: 'big', diff: '通用口语' },
      { word: 'large', diff: '书面, 强调规模' },
    ],
  },
  small: {
    synonyms: [
      { word: 'little', nuance: '更亲切, 带感情', example: 'a little child' },
      { word: 'tiny', nuance: '极小', example: 'a tiny insect' },
      { word: 'minor', nuance: '次要, 轻微', example: 'a minor issue' },
    ],
    confused: [
      { word: 'small', diff: '通用' },
      { word: 'little', diff: '更主观/感情色彩' },
    ],
  },
  good: {
    synonyms: [
      { word: 'great', nuance: '更强烈, 优秀', example: 'a great achievement' },
      { word: 'excellent', nuance: '极好, 突出', example: 'excellent work' },
      { word: 'fine', nuance: '可接受, 不错', example: 'I\'m fine, thanks.' },
    ],
    confused: [
      { word: 'good', diff: '通用正面' },
      { word: 'well', diff: '副词用法 (do well)' },
    ],
  },
  bad: {
    synonyms: [
      { word: 'poor', nuance: '质量差 / 可怜', example: 'poor quality' },
      { word: 'terrible', nuance: '极差, 糟糕', example: 'a terrible mistake' },
      { word: 'awful', nuance: '可怕, 不愉快', example: 'an awful day' },
    ],
    confused: [
      { word: 'bad', diff: '通用负面' },
      { word: 'evil', diff: '道德邪恶 (非质量差)' },
    ],
  },
  fast: {
    synonyms: [
      { word: 'quick', nuance: '瞬间, 反应快', example: 'a quick response' },
      { word: 'rapid', nuance: '速度快, 持续', example: 'rapid growth' },
      { word: 'swift', nuance: '文学化, 优雅', example: 'a swift movement' },
    ],
    confused: [
      { word: 'fast', diff: '通用' },
      { word: 'rapid', diff: '更强调频率/速度' },
    ],
  },
}

export function mockSynonyms(word: string): SynonymExplanation {
  const lower = word.toLowerCase()
  // 查 mock 表
  for (const [key, value] of Object.entries(MOCK_SYNONYMS)) {
    if (lower.includes(key)) {
      return { ...value, cached: true }
    }
  }
  // fallback: 给通用同义词
  return {
    synonyms: [
      { word: `similar to ${word}`, nuance: '相关含义', example: `This is similar to ${word}.` },
      { word: `another ${word}`, nuance: '另一种说法', example: `Try another ${word}.` },
    ],
    confused: [
      { word, diff: '原词, 注意上下文' },
    ],
    cached: true,
  }
}

export async function getSynonyms(
  provider: LLMProvider,
  apiKey: string | undefined,
  model: string | undefined,
  word: string,
  pos: string,
): Promise<SynonymExplanation> {
  const key = synonymKey(word, pos)
  // Mock 渠道走 mock 路径
  if (provider.id === 'mock' || !apiKey) {
    return mockSynonyms(word)
  }
  const userMsg = `单词: ${word}\n词性: ${pos}\n\n请用 JSON 格式列出同义词和混淆词。`
  const resp = await chatCompletion({
    provider,
    apiKey,
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.3,
    maxTokens: 600,
  })
  return parseSynonyms(resp.content)
}
