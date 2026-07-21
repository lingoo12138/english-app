// 图片识别业务逻辑
// v0.14: JSON 解析鲁棒性 + 物体 1-5 + 置信度过滤 + 场景分类 + 批量识别
import { chatCompletionVision, LLMProvider, type LLMResponse } from './providers/llm'
import { loadWords } from './words'
import type { Word } from '../types'

export type ImageCategory = 'food' | 'animal' | 'tool' | 'furniture' | 'nature' | 'place' | 'people' | 'clothing' | 'transport' | 'other'

export interface RecognizedItem {
  word: string
  confidence: number
  /** 匹配的本地词条 */
  matched?: Word
  /** 来自该词的 3 句例句 */
  examples?: string[]
  /** 自动分类 */
  category?: ImageCategory
}

export interface RecognizeResult {
  raw: LLMResponse
  items: RecognizedItem[]
  /** 自动识别的整体场景 */
  category?: ImageCategory
}

const SYSTEM_PROMPT = `你是一个英语学习助手。用户会上传一张图片,请识别图片中能直接对应到日常英语单词的具体物体(1-5 个)。

规则:
1. 优先识别具体名词: 物品/动物/食物/工具/家具/植物/地点/服装/交通工具等
2. 避免抽象概念(情绪/关系等)
3. 单词用最常用的小写形式(单数)
4. confidence 是 0-1 之间的浮点数,代表识别可信度
5. 必须以 JSON 格式输出,不要有其他内容`

const USER_TEMPLATE = (hint: string) => `请识别图片中的 1-5 个物体,按 confidence 降序排列,返回 JSON 格式:
{
  "objects": [
    { "word": "apple", "confidence": 0.95 },
    { "word": "tree", "confidence": 0.7 }
  ]
}
${hint ? `用户提示: ${hint}` : ''}`

// 鲁棒 JSON 提取: 1) 试 markdown code fence, 2) 大括号计数
export function extractJSON(text: string): any {
  if (!text) throw new Error('LLM 返回为空')
  // 1. markdown code fence ```json ... ```
  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (fence) return JSON.parse(fence[1])
  // 2. 大括号计数找配对
  const start = text.indexOf('{')
  if (start === -1) throw new Error('LLM 未返回 JSON 对象')
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('LLM JSON 未闭合')
}

// 自动分类
const CATEGORY_PATTERNS: Record<ImageCategory, RegExp> = {
  food: /\b(apple|banana|food|drink|coffee|tea|water|meat|rice|bread|cheese|cake|fish|chocolate|wine|beer|juice|sugar|salt|oil|noodle|soup|salad|fruit|vegetable|sandwich|pizza|burger|cookie|egg|milk|honey|butter|flour)\b/i,
  animal: /\b(cat|dog|fish|bird|tiger|elephant|animal|horse|cow|pig|sheep|rabbit|monkey|lion|bear|wolf|fox|deer|mouse|snake|butterfly|bee|ant|spider|whale|shark|dolphin)\b/i,
  tool: /\b(phone|laptop|computer|keyboard|pen|hammer|screw|wrench|knife|scissors|key|lock|tool|drill|saw|axe|rope|chain|battery|cable|wire|plug|bulb|clock|watch)\b/i,
  furniture: /\b(chair|table|bed|desk|sofa|cabinet|shelf|drawer|wardrobe|mirror|lamp|stool|couch|bench|counter)\b/i,
  nature: /\b(tree|flower|grass|sky|mountain|river|leaf|forest|sea|ocean|beach|sun|moon|star|cloud|rock|stone|plant|garden|park|valley|hill|island|pond|lake|fire|ice|rain|snow|wind)\b/i,
  place: /\b(house|home|room|kitchen|bedroom|bathroom|office|school|hospital|hotel|restaurant|shop|store|bank|airport|station|street|road|bridge|building|church|temple|castle|factory|farm|field|town|city|country)\b/i,
  people: /\b(person|man|woman|boy|girl|child|baby|friend|family|parent|father|mother|brother|sister|son|daughter|king|queen|doctor|teacher|student|worker|chef|artist|musician)\b/i,
  clothing: /\b(shirt|pants|dress|shoe|hat|cap|coat|jacket|skirt|sock|gloves|scarf|glasses|ring|necklace|belt|bag|backpack|umbrella|boots|sweater|jeans|tie|swimsuit)\b/i,
  transport: /\b(car|bus|train|plane|bike|bicycle|motorcycle|ship|boat|truck|taxi|subway|metro|helicopter|rocket|ship|sailboat|carriage|sled|scooter)\b/i,
  other: /.*/,
}

export function classifyItem(word: string): ImageCategory {
  for (const [cat, re] of Object.entries(CATEGORY_PATTERNS) as [ImageCategory, RegExp][]) {
    if (cat === 'other') continue
    if (re.test(word)) return cat
  }
  return 'other'
}

export function classifyOverall(items: RecognizedItem[]): ImageCategory | undefined {
  if (items.length === 0) return undefined
  // 取最高 confidence 的分类
  return items[0]?.category
}

const CONFIDENCE_THRESHOLD = 0.5

/** 图片识别主入口 */
export async function recognizeImage(
  imageDataUrl: string,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  hint: string = '',
): Promise<RecognizeResult> {
  const resp = await chatCompletionVision({
    provider,
    apiKey,
    model,
    prompt: USER_TEMPLATE(hint),
    imageDataUrl,
    jsonMode: provider.type === 'openai' || provider.id === 'mock',
    temperature: 0.3,
    maxTokens: 800,
  })

  // 鲁棒 JSON 解析
  const parsed = extractJSON(resp.content)
  const rawItems: { word: string; confidence: number }[] = parsed.objects || []

  // 过滤无效 + 置信度阈值
  const validItems = rawItems
    .filter(it => it && it.word && /^[a-z]+$/.test(it.word))
    .filter(it => it.confidence >= CONFIDENCE_THRESHOLD)
    .slice(0, 5)  // 最多 5 个

  // 在本地词库匹配
  const allWords = await loadWords()
  const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w]))

  const items: RecognizedItem[] = validItems
    .map(it => {
      const matched = wordMap.get(it.word.toLowerCase())
      return {
        word: it.word.toLowerCase(),
        confidence: it.confidence,
        matched,
        examples: matched?.examples?.slice(0, 3).map(e => e.en),
        category: classifyItem(it.word),
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  return { raw: resp, items, category: classifyOverall(items) }
}

/** 批量识别(多张图) */
export async function recognizeImages(
  imageDataUrls: string[],
  provider: LLMProvider,
  apiKey: string,
  model: string,
  hint: string = '',
): Promise<RecognizeResult[]> {
  // 串行处理(避免同时多个 LLM 调用造成 rate limit)
  const results: RecognizeResult[] = []
  for (const url of imageDataUrls) {
    try {
      const r = await recognizeImage(url, provider, apiKey, model, hint)
      results.push(r)
    } catch (e) {
      // 单张失败不阻塞整体
      console.error('识别单张图片失败', e)
    }
  }
  return results
}
