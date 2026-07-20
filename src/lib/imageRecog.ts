// 图片识别: 调 LLM 提取图片中的英文单词
// 输入: 图片(base64) + 用户可选提示("找食物" / "找动物" 等)
// 输出: 1-3 个 {word, zh, phonetic?, scene?, examples?}
import { chat, fileToDataURL, type ChatMessage } from './llm'
import { loadWords } from './words'
import type { Word } from '../types'

export interface RecognizedWord {
  word: string       // 英文
  zh: string        // 中文翻译
  phonetic?: string // 音标(可选)
  scene?: string    // 场景分类
  examples?: { en: string; zh: string }[]
  /** 在我们词库里匹配到的完整词条(如果有) */
  matchedWord?: Word
}

const SYSTEM_PROMPT = `你是一个英语词汇教学助手。用户会给你一张图片,你要识别图片中的 1-3 个最有学习价值的英文单词(实物/概念,而不是颜色/形状/动作)。

要求:
1. 优先选 **能直接用英语日常表达** 的具体名词(apple / chair / mountain 等),避免太抽象的概念
2. 如果图片场景明显(餐厅/办公/旅行),可以选择 1-2 个该场景的常用表达
3. 每个词必须返回: word (英文), zh (中文翻译), phonetic (音标), scene (场景分类)
4. 返回 JSON,格式: {"words": [...]}

注意:
- 单词首字母小写,除非专有名词
- 中文翻译要准确、自然
- 如果图片里没人/物,返回空数组
- 返回纯 JSON,不要 markdown 代码块`

export interface RecognizeOptions {
  /** 用户提示,例如 "找食物"、"找动物" */
  hint?: string
  /** 图片是 base64 data URL 还是 https URL */
  imageData: string
}

export async function recognizeImage({ imageData, hint }: RecognizeOptions): Promise<RecognizedWord[]> {
  const userText = hint
    ? `识别图片中的"${hint}"相关的英文单词。`
    : '识别图片中最有学习价值的英文单词(1-3 个)。'

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: imageData } },
      ],
    },
  ]

  const res = await chat(messages, {
    temperature: 0.3,  // 低温度,识别更准
    maxTokens: 800,
    jsonMode: true,
  })

  // 解析 JSON
  const parsed = parseLLMJson(res.content)
  const rawWords = (parsed.words || []) as RecognizedWord[]

  // 尝试在我们 5334 词库里匹配
  let allWords: Word[] = []
  try {
    allWords = await loadWords()
  } catch (e) {
    console.warn('词库加载失败,跳过匹配', e)
  }
  const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w]))

  return rawWords.map(rw => {
    const matched = wordMap.get(rw.word.toLowerCase())
    return {
      ...rw,
      matchedWord: matched,
    }
  })
}

/** 解析 LLM 返回的 JSON(容错: 有时 LLM 会包 markdown ```json```) */
function parseLLMJson(text: string): any {
  // 尝试直接 parse
  try { return JSON.parse(text) } catch {}

  // 去掉 markdown 代码块
  const match = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (match) {
    try { return JSON.parse(match[1]) } catch {}
  }

  // 找 { ... } 子串
  const objMatch = text.match(/\{[\s\S]+\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch {}
  }

  console.error('LLM JSON 解析失败:', text)
  return { words: [] }
}

/** 用户上传图片 → 识别 */
export async function recognizeFile(file: File, hint?: string): Promise<RecognizedWord[]> {
  // 限制图片大小(> 4MB base64 太长)
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('图片太大(>4MB),请用更小的图片')
  }
  const dataUrl = await fileToDataURL(file)
  return recognizeImage({ imageData: dataUrl, hint })
}
