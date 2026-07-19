// 词条类型
export interface Word {
  id: string
  word: string
  phonetic: string                  // 主音标(默认美音)
  phonetic_us?: string              // 美音
  phonetic_uk?: string              // 英音
  pos: string[]                    // 词性
  translations: string[]            // 中文翻译
  examples: Example[]              // 例句
  phrases?: { phrase: string; translation: string }[]  // 常用短语
  roots?: { root: string; meaning: string; type?: 'prefix' | 'suffix' | 'root' }[]  // 词根词缀
  tags: string[]                   // 标签: CET4, 高考, 日常, 高频
  level: 'primary' | 'junior' | 'senior' | 'gaozhong' | 'cet4' | 'cet6' | 'kaoyan' | 'daily'
  difficulty: 1 | 2 | 3 | 4 | 5
  frequency: number
}

export interface Example {
  en: string
  zh: string
  scene?: string                    // 场景: travel / work / life / study
  source?: string
}

// 每日一句
export interface DailySentence {
  id: number
  date?: string                     // 实际使用时按日期取模
  en: string
  zh: string
  scene: string
  keyword?: string                  // 可点击的关键词
}

// 收藏(生词本)
export interface Favorite {
  wordId: string
  addedAt: number
}

// 学习记录
export interface LearnRecord {
  id?: number
  wordId: string
  action: 'view' | 'favorite' | 'unfavorite' | 'known' | 'unknown'
  timestamp: number
}

// 复习计划
export interface ReviewItem {
  wordId: string
  nextReview: number                // 时间戳
  interval: number                  // 当前间隔(天)
  easeFactor: number                // SM-2 难度因子
  repetitions: number               // 连续正确次数
}
