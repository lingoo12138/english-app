// tagSuggest.ts - v1.29.0 W30 tag AI 智能推荐
// 复用 v1.21 wordTags + v1.12 llmUsage + LLM, 给一批 word 推荐 tag
import { chatCompletion } from './providers/llm'
import { getRemaining } from './llmUsage'
import { isValidTag, MAX_TAGS_PER_WORD } from './wordTags'

/** 给一个 word + translation 建议 tag (本地启发式 + LLM 兜底) */
export interface TagSuggestion {
  wordId: string
  word: string
  translation?: string
  suggestedTags: string[]  // 1-3 个
}

/** LLM 建议 tag (轻量 prompt) */
export async function suggestTagsByLLM(
  words: Array<{ wordId: string; word: string; translation?: string }>,
  provider: any,
  apiKey: string,
  model: string,
): Promise<TagSuggestion[]> {
  if (words.length === 0) return []

  // 检查 LLM 日限
  if (getRemaining('explain') <= 0) {
    throw new Error('LLM 今日 explain 额度用完, 请明天再试')
  }

  // 构造 prompt (限制输入大小, 防超 token)
  const wordList = words
    .slice(0, 20)  // 一次最多 20 个
    .map(w => `${w.word} (${w.translation || '无翻译'})`)
    .join(', ')

  const prompt = `为以下英语单词推荐 1-2 个分类 tag (从: work/travel/food/study/tech/sport/health/other 中选, 小写, 简洁).
格式: 单词:tag1,tag2
示例:
apple (苹果):food
meeting (会议):work
running (跑步):sport

单词列表:
${wordList}

只输出结果,每行一个,不要其他说明.`

  try {
    const res = await chatCompletion({
      provider,
      apiKey,
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 200,
    })

    // 解析
    return parseTagSuggestions(res.content, words)
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    throw new Error(`LLM tag 推荐失败: ${err.message}`)
  }
}

/** 解析 LLM 输出 */
export function parseTagSuggestions(
  content: string,
  originalWords: Array<{ wordId: string; word: string; translation?: string }>,
): TagSuggestion[] {
  const lines = content.split('\n').filter(l => l.trim())
  const wordMap = new Map(originalWords.map(w => [w.word.toLowerCase(), w]))

  const suggestions: TagSuggestion[] = []
  for (const line of lines) {
    const m = line.match(/^([\w\s]+?)\s*\([^)]*\)\s*:\s*(.+)$/)
    if (!m) continue
    const wordKey = m[1].trim().toLowerCase()
    const tagsRaw = m[2].split(/[,，;；\s]+/).map(t => t.trim().toLowerCase()).filter(t => t && t !== '其他' && t !== 'other')
    const validTags = tagsRaw.filter(isValidTag).slice(0, MAX_TAGS_PER_WORD)
    const found = wordMap.get(wordKey)
    if (found && validTags.length > 0) {
      suggestions.push({
        wordId: found.wordId,
        word: found.word,
        translation: found.translation,
        suggestedTags: validTags,
      })
    }
  }
  return suggestions
}

/** 本地启发式 (无 LLM) — 复用 wordTags.suggestTagsFromWord */
export { suggestTagsFromWord } from './wordTags'
