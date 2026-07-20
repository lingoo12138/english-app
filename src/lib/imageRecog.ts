// 图片识别业务逻辑
// 改造: 走 LLMProvider 多渠道
import { chatCompletionVision, LLMProvider, type LLMResponse } from './providers/llm'
import { loadWords } from './words'
import type { Word } from '../types'

export interface RecognizedItem {
  word: string
  confidence: number
  /** 匹配的本地词条 */
  matched?: Word
  /** 来自该词的 3 句例句 */
  examples?: string[]
}

export interface RecognizeResult {
  raw: LLMResponse
  items: RecognizedItem[]
}

const SYSTEM_PROMPT = `你是一个英语学习助手。用户会上传一张图片,请识别图片中能直接对应到日常英语单词的具体物体(1-3 个)。

规则:
1. 优先识别具体名词: 物品/动物/食物/工具/家具等
2. 避免抽象概念(情绪/关系等)
3. 单词用最常用的小写形式
4. confidence 是 0-1 之间的浮点数,代表识别可信度
5. 必须以 JSON 格式输出,不要有其他内容`

const USER_TEMPLATE = (hint: string) => `请识别图片中的物体,返回 JSON 格式:
{
  "objects": [
    { "word": "apple", "confidence": 0.95 },
    { "word": "tree", "confidence": 0.7 }
  ]
}
${hint ? `用户提示: ${hint}` : ''}`

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
    maxTokens: 500,
  })

  // 解析 JSON 响应
  const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('LLM 返回的不是 JSON 格式')
  }
  const parsed = JSON.parse(jsonMatch[0])
  const rawItems: { word: string; confidence: number }[] = parsed.objects || []

  // 在本地词库匹配
  const allWords = await loadWords()
  const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w]))

  const items: RecognizedItem[] = rawItems
    .filter(it => it.word && /^[a-z]+$/.test(it.word))
    .map(it => {
      const matched = wordMap.get(it.word.toLowerCase())
      return {
        word: it.word.toLowerCase(),
        confidence: it.confidence,
        matched,
        examples: matched?.examples?.slice(0, 3).map(e => e.en),
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  return { raw: resp, items }
}
