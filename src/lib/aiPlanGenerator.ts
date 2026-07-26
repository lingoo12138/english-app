// aiPlanGenerator.ts - v1.32.0 W30 AI 学习计划定制
// 根据用户水平/目标/可用天数, LLM 生成多日学习计划
import { chatCompletion } from './providers/llm'
import { getRemaining } from './llmUsage'
import { loadWords } from './words'

export interface AIPlanInput {
  /** 用户当前水平 (A1-C2 或 自评) */
  currentLevel: string
  /** 目标水平 */
  targetLevel: string
  /** 学习目的: 考试/工作/兴趣/留学 */
  goal: 'exam' | 'work' | 'travel' | 'study' | 'interest'
  /** 每日可用时间 (分钟) */
  dailyMinutes: number
  /** 总共几天 */
  totalDays: number
  /** 已知词数 */
  knownWordCount: number
}

export interface AIDailyTask {
  day: number
  theme: string  // 今日主题, e.g. "餐饮词汇"
  newWords: number  // 今日新词数
  reviewWords: number  // 今日复习数
  focusSkills: string[]  // ['词汇', '听力', '口语']
  tip: string  // 每日小贴士
}

export interface AIPlan {
  input: AIPlanInput
  tasks: AIDailyTask[]
  strategy: string  // 整体学习策略
  estimatedWords: number  // 预计总学词数
  createdAt: number
}

/** LLM 生成多日计划 */
export async function generateAIPlan(input: AIPlanInput, provider: any, apiKey: string, model: string): Promise<AIPlan> {
  // 检查 LLM 日限 (复用 explain 30)
  if (getRemaining('explain') <= 0) {
    throw new Error('LLM 今日 explain 额度用完, 请明天再试')
  }

  // 取总词数
  const allWords = await loadWords()
  const totalWords = allWords.length

  const prompt = `你是英语学习规划师. 根据用户情况, 设计 ${input.totalDays} 天的学习计划.

用户情况:
- 当前水平: ${input.currentLevel}
- 目标水平: ${input.targetLevel}
- 学习目的: ${input.goal}
- 每日可用时间: ${input.dailyMinutes} 分钟
- 已知词汇: ${input.knownWordCount} 词
- 词库总量: ${totalWords} 词 (5334 词 + 465 词根)

要求:
1. 每天 newWords + reviewWords 合理 (根据 ${input.dailyMinutes} 分钟估算: 1 词约 0.5min)
2. 主题按场景/词根/难度递进, 避免随机
3. focusSkills 包括 词汇/听力/口语/阅读 中 1-3 项
4. tip 给具体可操作建议 (不是空话)
5. 第 1 天和最后 1 天稍轻松, 中间加强

输出 JSON (严格格式):
{
  "strategy": "整体学习策略 (2-3 句)",
  "estimatedWords": 估算总学词数,
  "tasks": [
    { "day": 1, "theme": "主题", "newWords": 5, "reviewWords": 3, "focusSkills": ["词汇", "听力"], "tip": "具体建议" },
    ...
  ]
}

只输出 JSON, 不要其他说明.`

  try {
    const res = await chatCompletion({
      provider,
      apiKey,
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 2000,
    })

    return parseAIPlan(res.content, input)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    throw new Error(`AI 计划生成失败: ${err.message}`)
  }
}

/** 解析 LLM 输出 */
export function parseAIPlan(content: string, input: AIPlanInput): AIPlan {
  // 提取 JSON (可能含 markdown ```json ... ``` 包裹)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('LLM 未返回有效 JSON')
  }
  const json = JSON.parse(jsonMatch[0])

  // 校验 tasks 长度
  const tasks: AIDailyTask[] = (json.tasks || []).map((t: any) => ({
    day: t.day,
    theme: t.theme || '通用',
    newWords: Math.max(0, Number(t.newWords) || 0),
    reviewWords: Math.max(0, Number(t.reviewWords) || 0),
    focusSkills: Array.isArray(t.focusSkills) ? t.focusSkills : ['词汇'],
    tip: t.tip || '',
  }))

  return {
    input,
    tasks,
    strategy: json.strategy || '坚持每日学习',
    estimatedWords: Number(json.estimatedWords) || 0,
    createdAt: Date.now(),
  }
}

/** 估算总时长 */
export function estimatePlanMinutes(plan: AIPlan): number {
  return plan.tasks.reduce((sum, t) => sum + (t.newWords + t.reviewWords) * 0.5, 0)
}
