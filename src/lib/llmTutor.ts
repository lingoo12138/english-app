// llmTutor.ts - v1.2-D2 LLM 错题讲解
// 核心理念: 用户点"📚 解释"按钮, LLM 用英语教学把错因讲透
// 协议: {rule, examples, mnemonic} JSON 输出
import { chatCompletion, type LLMProvider } from './providers/llm'
import { getOrCreateExplanation } from './db'

export interface ErrorExplanation {
  rule: string          // 语法规则 (中英混合)
  examples: string      // 例子 (2-3 个英文例句 + 简短翻译)
  mnemonic: string      // 记忆口诀 (一句话)
  cached?: boolean      // 来自缓存
}

const SYSTEM_PROMPT = `你是一位耐心的英语老师。用户给出一个英语错误, 请解释:
1. rule: 为什么错 (语法规则,1-2 句)
2. examples: 2-3 个正确例句 (英文 + 简短中文翻译)
3. mnemonic: 一句话记忆口诀

严格用 JSON 格式输出, 不要 markdown 代码块:
{"rule": "...", "examples": "...", "mnemonic": "..."}

examples 字段可换行分隔多个例句, 总长 ≤ 300 字。`

/**
 * 缓存 key: 标准化 (type + original + suggestion)
 */
export function explanationKey(type: string, original: string, suggestion: string): string {
  return `${type}::${original.trim().toLowerCase()}::${suggestion.trim().toLowerCase()}`.slice(0, 200)
}

/**
 * 解析 LLM 响应
 */
function parseExplanation(content: string): ErrorExplanation {
  // 移除 markdown fence
  let c = content.trim()
  if (c.startsWith('```')) {
    c = c.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  // 找 { 和 } 截取
  const i = c.indexOf('{')
  const j = c.lastIndexOf('}')
  if (i >= 0 && j > i) {
    c = c.slice(i, j + 1)
  }
  try {
    const obj = JSON.parse(c)
    return {
      rule: String(obj.rule || '暂无规则说明'),
      examples: String(obj.examples || '暂无例句'),
      mnemonic: String(obj.mnemonic || '暂无口诀'),
    }
  } catch {
    // fallback: 整段当 rule
    return {
      rule: c.slice(0, 200) || '解析失败',
      examples: '',
      mnemonic: '',
    }
  }
}

/**
 * Mock 解释 (无 API key 时用)
 */
export function mockExplanation(type: string, original: string, suggestion: string): ErrorExplanation {
  const MOCK: Record<string, Omit<ErrorExplanation, 'cached'>> = {
    grammar: {
      rule: '英语语法结构: 主谓宾/时态/语态等需严格匹配',
      examples: 'I go to school. / She went home. / They are playing.',
      mnemonic: '主谓一致, 时态呼应',
    },
    vocab: {
      rule: '用词不当: 选词需符合语境',
      examples: 'happy (开心) / glad (高兴) / joyful (喜悦)',
      mnemonic: '语境定词, 不混用',
    },
    spelling: {
      rule: '拼写错误: 注意字母顺序和双写',
      examples: 'receive (收到) / believe (相信) / achieve (实现)',
      mnemonic: 'i before e, except after c',
    },
    style: {
      rule: '表达风格: 书面/口语需分清',
      examples: 'I would like... (正式) / I want... (口语)',
      mnemonic: '看场合用词',
    },
    tense: {
      rule: '时态错误: 动作发生时间决定时态',
      examples: 'I played (过去) / I play (现在) / I will play (将来)',
      mnemonic: '看时间选时态',
    },
    preposition: {
      rule: '介词搭配: 固定搭配需记忆',
      examples: 'in the morning / on Monday / at night',
      mnemonic: '时间介词: in 月季, on 星期, at 时刻',
    },
    article: {
      rule: '冠词: a/an 看音标, the 表特指',
      examples: 'a book (一本书) / an apple (一个苹果) / the book (那本书)',
      mnemonic: 'a/an 元音开头, the 特指用',
    },
    other: {
      rule: '其他错误类型, 请参考上下文',
      examples: '请结合具体场景理解',
      mnemonic: '多读多练',
    },
  }
  return {
    ...(MOCK[type] || MOCK.other),
    cached: true,  // mock 也算"已缓存", 避免重复返回
  }
}

/**
 * 调 LLM 解释单个错
 * @param provider 当前 LLM 渠道
 * @param apiKey 当前 LLM key
 * @param model 当前 model (可选)
 * @param type 错误类型
 * @param original 原文
 * @param suggestion 建议改正
 * @returns 讲解
 */
export async function explainError(
  provider: LLMProvider,
  apiKey: string | undefined,
  model: string | undefined,
  type: string,
  original: string,
  suggestion: string,
): Promise<ErrorExplanation> {
  const key = explanationKey(type, original, suggestion)
  // Mock 渠道走 mock 路径 (不存缓存,避免 cache 命中误导)
  if (provider.id === 'mock' || !apiKey) {
    return mockExplanation(type, original, suggestion)
  }
  const userMsg = `错误类型: ${type}\n原文: ${original}\n建议改为: ${suggestion}\n\n请用 JSON 格式解释这个错误。`
  const resp = await chatCompletion({
    provider,
    apiKey,
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.3,
    maxTokens: 500,
  })
  // v1.2-D2: 缓存到 IndexedDB
  const parsed = parseExplanation(resp.content)
  await getOrCreateExplanation(key, async () => parsed).catch(console.error)
  return parsed
}
