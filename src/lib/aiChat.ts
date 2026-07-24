// AI 对话陪练
// 走 LLMProvider 多渠道
// 支持: 选定一个 LLM provider, 用其 chat 接口对话
// v1.9.0: 难度自适应 (assessUserLevel) + 自由话题 (customTopic)
import { chatCompletion, LLMProvider, LLMResponse } from './providers/llm'

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  ts: number
}

export interface ChatContext {
  scenario?: string  // 场景: 'cafe' / 'airport' / ...
  level?: CEFRLevel  // 难度 (默认)
  /** v1.9.0: 动态评估的难度 (高于 level 时使用), 由 assessUserLevel 产生 */
  dynamicLevel?: CEFRLevel
  topic?: string     // 话题
  /** v1.9.0: 自由话题 (200 字符内), 与 topic 二选一, customTopic 优先 */
  customTopic?: string
}

const SCENARIO_PROMPTS: Record<string, string> = {
  cafe: '你在咖啡店, 需要和店员点单、咨询、结账。',
  airport: '你在机场, 需要办理登机、过安检、找登机口。',
  shopping: '你在购物, 需要看价格、试穿、砍价、退换货。',
  hotel: '你在酒店, 需要办理入住、咨询设施、结账退房。',
  meeting: '你在工作场景, 需要自我介绍、汇报工作、讨论项目。',
}

const LEVEL_GUIDANCE: Record<CEFRLevel, string> = {
  A1: '使用最简单的词汇和句型, 一句话不超过 5 个单词。',
  A2: '使用基础日常词汇, 短句为主, 偶尔复合句。',
  B1: '使用日常和部分学术词汇, 中等长度句子, 自然对话。',
  B2: '使用丰富词汇, 长短.复杂句.自然流畅。',
  C1: '使用高级词汇, 长难句, 涵盖隐含意思和委婉表达。',
  C2: '使用母语级词汇, 复杂语法, 习语和文化典故。',
}

const TOPIC_MAX_LEN = 200

/**
 * v1.9.0: 截断 customTopic 到 200 字符
 * - 截断后追加省略号, 提示用户
 * - 静默截断, 不抛错
 */
export function truncateCustomTopic(topic: string, maxLen = TOPIC_MAX_LEN): string {
  if (!topic) return ''
  if (topic.length <= maxLen) return topic
  return topic.slice(0, maxLen) + '…'
}

function buildSystemPrompt(ctx: ChatContext): string {
  const parts: string[] = []
  parts.push('你是一个英语陪练老师, 用纯英文对话, 帮助用户练习英语口语。')
  parts.push('规则:')
  parts.push('1. 每次回复 1-3 句话, 保持自然对话节奏')
  parts.push('2. 用户表达有错时, 先自然回应再委婉纠正')
  parts.push('3. 根据用户水平调整词汇和句式难度')
  parts.push('4. 如果用户说中文, 引导用户用英文表达')
  parts.push('5. 偶尔给出小贴士 (用括号标注 Tips: ...)')

  if (ctx.scenario && SCENARIO_PROMPTS[ctx.scenario]) {
    parts.push(`\n场景设定: ${SCENARIO_PROMPTS[ctx.scenario]}`)
  }
  // v1.9.0: customTopic 优先 topic
  if (ctx.customTopic) {
    const t = truncateCustomTopic(ctx.customTopic)
    parts.push(`\n话题: ${t}`)
  } else if (ctx.topic) {
    parts.push(`\n话题: ${ctx.topic}`)
  }
  // v1.9.0: dynamicLevel 优先 level
  const effectiveLevel = ctx.dynamicLevel || ctx.level
  if (effectiveLevel) {
    parts.push(`\n用户水平: ${effectiveLevel}. 难度要求: ${LEVEL_GUIDANCE[effectiveLevel]}`)
  }
  return parts.join('\n')
}

/**
 * v1.9.0: 难度自适应 — 评估用户最近消息的语言水平
 * - 取最近 5 轮 user 消息
 * - 至少 3 轮才评估, 不够返回 undefined
 * - 词数评估:
 *   A1: ≤3, A2: 4-6, B1: 7-12, B2: 13-18, C1: 19-25, C2: >25
 * - 句法复杂度加分: 含 if/because/although 等从属连词 +1 档
 * - 不持久化, 每次调用重新评估
 */
const SUBORDINATING_CONJUNCTIONS = [
  'if', 'because', 'although', 'though', 'while', 'when', 'since', 'unless',
  'after', 'before', 'until', 'whereas', 'whether', 'as', 'so that',
  'even though', 'provided that', 'as long as', 'in case',
]

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function levelToIndex(l: CEFRLevel): number {
  return LEVEL_ORDER.indexOf(l)
}
function indexToLevel(i: number): CEFRLevel {
  return LEVEL_ORDER[Math.max(0, Math.min(LEVEL_ORDER.length - 1, i))]
}

function countWords(text: string): number {
  // 简单按空格切, 过滤空字符串
  return text.trim().split(/\s+/).filter(Boolean).length
}

function hasComplexClause(text: string): boolean {
  const lower = text.toLowerCase()
  return SUBORDINATING_CONJUNCTIONS.some(c => lower.includes(c))
}

export function assessUserLevel(messages: ChatMessage[]): CEFRLevel | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined
  // 取最近 5 轮 user 消息
  const userMsgs = messages.filter(m => m.role === 'user').slice(-5)
  if (userMsgs.length < 3) return undefined

  const avgWords = userMsgs.reduce((s, m) => s + countWords(m.content), 0) / userMsgs.length

  // 基础档位
  let base: CEFRLevel
  if (avgWords <= 3) base = 'A1'
  else if (avgWords <= 6) base = 'A2'
  else if (avgWords <= 12) base = 'B1'
  else if (avgWords <= 18) base = 'B2'
  else if (avgWords <= 25) base = 'C1'
  else base = 'C2'

  // 句法复杂度加分: 至少一条 user 消息含从属连词
  const anyComplex = userMsgs.some(m => hasComplexClause(m.content))
  if (anyComplex) {
    base = indexToLevel(levelToIndex(base) + 1)
  }

  return base
}

export async function chat(
  messages: ChatMessage[],
  context: ChatContext,
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<ChatMessage> {
  const llmMessages = [
    { role: 'system' as const, content: buildSystemPrompt(context) },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const resp: LLMResponse = await chatCompletion({
    provider,
    apiKey,
    model,
    messages: llmMessages,
    temperature: 0.8,
    maxTokens: 300,
  })

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content: resp.content.trim(),
    ts: Date.now(),
  }
}

export interface ReviewError {
  original: string
  fixed: string
  type: 'grammar' | 'vocab' | 'spelling' | 'style' | 'tense' | 'preposition' | 'article' | 'other'
  why: string
  severity: number  // 0-1
}

export interface ReviewResult {
  hasError: boolean
  errors: ReviewError[]
}

/**
 * AI 对话实时纠错 (W2-A)
 * - 在主对话不阻塞的情况下, 后台并行调 LLM 标错
 * - 输出严格 JSON: {hasError, errors:[{original, fixed, type, why, severity}]}
 * - 避免在 Mock 渠道上调用
 */
export async function reviewMessage(
  text: string,
  level: string,
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<ReviewResult> {
  if (!text.trim()) return { hasError: false, errors: [] }
  if (provider.id === 'mock') {
    return { hasError: false, errors: [] }  // Mock 跳过
  }

  const systemPrompt = `You are an English grammar checker for Chinese learners at ${level} level.
Analyze the user's message and return strict JSON:
{
  "hasError": <true|false>,
  "errors": [
    {
      "original": "<exact wrong phrase from user message>",
      "fixed": "<correct phrase>",
      "type": "grammar|vocab|spelling|style|tense|preposition|article|other",
      "why": "<1 sentence Chinese explanation>",
      "severity": <0.0-1.0>
    }
  ]
}
Only flag meaningful errors (severity >= 0.4). If no errors, return {"hasError": false, "errors": []}.
Do NOT add explanations outside JSON. Only return valid JSON.`

  const resp = await chatCompletion({
    provider,
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
    maxTokens: 800,
  })

  return parseReview(resp.content)
}

function parseReview(content: string): ReviewResult {
  const trimmed = content.trim()
  let jsonStr = trimmed
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenceMatch) jsonStr = fenceMatch[1].trim()
  const first = jsonStr.indexOf('{')
  const last = jsonStr.lastIndexOf('}')
  if (first >= 0 && last > first) {
    jsonStr = jsonStr.slice(first, last + 1)
  }
  try {
    const obj = JSON.parse(jsonStr)
    const validTypes = ['grammar', 'vocab', 'spelling', 'style', 'tense', 'preposition', 'article', 'other'] as const
    return {
      hasError: Boolean(obj.hasError) && Array.isArray(obj.errors) && obj.errors.length > 0,
      errors: (Array.isArray(obj.errors) ? obj.errors : []).map((e: unknown) => {
        const err = e as Record<string, unknown>
        const t = String(err.type || 'other')
        return {
          original: String(err.original || ''),
          fixed: String(err.fixed || ''),
          type: (validTypes as readonly string[]).includes(t) ? t : 'other',
          why: String(err.why || ''),
          severity: typeof err.severity === 'number' ? err.severity : 0.5,
        }
      }).filter((e: ReviewError) => e.severity >= 0.4),
    }
  } catch {
    return { hasError: false, errors: [] }
  }
}
