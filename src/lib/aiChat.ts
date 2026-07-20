// AI 对话陪练
// 走 LLMProvider 多渠道
// 支持: 选定一个 LLM provider, 用其 chat 接口对话
import { chatCompletion, LLMProvider, LLMResponse } from './providers/llm'

export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  ts: number
}

export interface ChatContext {
  scenario?: string  // 场景: 'cafe' / 'airport' / ...
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'  // 难度
  topic?: string     // 话题
}

const SCENARIO_PROMPTS: Record<string, string> = {
  cafe: '你在咖啡店, 需要和店员点单、咨询、结账。',
  airport: '你在机场, 需要办理登机、过安检、找登机口。',
  shopping: '你在购物, 需要看价格、试穿、砍价、退换货。',
  hotel: '你在酒店, 需要办理入住、咨询设施、结账退房。',
  meeting: '你在工作场景, 需要自我介绍、汇报工作、讨论项目。',
}

const LEVEL_GUIDANCE: Record<string, string> = {
  A1: '使用最简单的词汇和句型, 一句话不超过 5 个单词。',
  A2: '使用基础日常词汇, 短句为主, 偶尔复合句。',
  B1: '使用日常和部分学术词汇, 中等长度句子, 自然对话。',
  B2: '使用丰富词汇, 长短.复杂句.自然流畅。',
  C1: '使用高级词汇, 长难句, 涵盖隐含意思和委婉表达。',
  C2: '使用母语级词汇, 复杂语法, 习语和文化典故。',
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
  if (ctx.topic) {
    parts.push(`\n话题: ${ctx.topic}`)
  }
  if (ctx.level) {
    parts.push(`\n用户水平: ${ctx.level}. 难度要求: ${LEVEL_GUIDANCE[ctx.level]}`)
  }
  return parts.join('\n')
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
