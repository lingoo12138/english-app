// 复习中心智能队列 - v1.11.0-B
// 把 ReviewCenter 从单纯按 due 时间排序, 改为按"价值"(due + 难 + 新)排序。
// 不重写 SM-2 算法, 仅在展示层做优先级重排。
// 规则:
//   - due 越早: 分数越高 (已过期 +50 / 今天 +40 / 明天 +30 / 一周内 +20 / 一周后 +10)
//   - 难词 (ease < 2.0): +20
//   - 新词 (reps < 3): +15
// 全部纯函数, 接受外部 now 参数, 便于测试。

/**
 * 复习队列条目 (与 db.reviews 的 ReviewItem 解耦, 便于复用)
 * - id:         词 id (等价 wordId)
 * - due:        下次复习时间戳 (ms)
 * - ease:       SM-2 ease factor
 * - reps:       连续正确次数
 * - lastReview: 上次复习时间戳 (ms), 推导自 due - interval*24h, 没记录则为 0
 * - isNew:      派生: reps < 3
 */
export interface ReviewQueueItem {
  id: string
  due: number
  ease: number
  reps: number
  lastReview: number
  isNew: boolean
}

export interface SortOptions {
  /** true: 按价值分数降序 (默认), false: 按 due 时间升序 (旧行为) */
  smartSort?: boolean
}

const MS_DAY = 24 * 60 * 60 * 1000

/** 判断是否为新词 (reps < 3) */
export function isNewItem(item: Pick<ReviewQueueItem, 'reps'>): boolean {
  return item.reps < 3
}

/**
 * 算单项优先级分数 (0-100)
 * - 已过期:  +50
 * - 今天到期: +40
 * - 明天到期: +30
 * - 一周内:  +20
 * - 一周后:  +10
 * - 难词 (ease < 2.0): +20
 * - 新词 (reps < 3):  +15
 */
export function scoreReviewItem(
  item: Pick<ReviewQueueItem, 'due' | 'ease' | 'reps'>,
  now: number,
): number {
  const due = item.due
  let dueScore: number
  if (due <= now) {
    // 已过期 (含当前这一刻)
    dueScore = 50
  } else if (due <= now + MS_DAY) {
    // 今天剩余时间
    dueScore = 40
  } else if (due <= now + 2 * MS_DAY) {
    // 明天
    dueScore = 30
  } else if (due <= now + 7 * MS_DAY) {
    // 一周内
    dueScore = 20
  } else {
    // 一周后
    dueScore = 10
  }

  // 难词 (SM-2 ease 越低越难): < 2.0 视为难
  const easeScore = item.ease < 2.0 ? 20 : 0

  // 新词前几次优先见到
  const newScore = item.reps < 3 ? 15 : 0

  return dueScore + easeScore + newScore
}

/**
 * 排序复习队列
 * - smartSort (默认 true): 按 scoreReviewItem 分数降序
 * - smartSort false:        按 due 时间升序 (旧行为)
 * 返回新数组, 不修改入参
 */
export function sortReviewQueue<T extends ReviewQueueItem>(
  items: T[],
  now: number,
  options: SortOptions = {},
): T[] {
  const { smartSort = true } = options
  const copy = items.slice()
  if (smartSort) {
    // 分数降序, 分数相同时按 due 升序, 再同时保持原序 (stable via index)
    copy.sort((a, b) => {
      const diff = scoreReviewItem(b, now) - scoreReviewItem(a, now)
      if (diff !== 0) return diff
      if (a.due !== b.due) return a.due - b.due
      return 0
    })
  } else {
    // 时间升序
    copy.sort((a, b) => a.due - b.due)
  }
  return copy
}

/**
 * 便捷转换: 把 db.reviews 的 ReviewItem 转成 ReviewQueueItem
 * - wordId    -> id
 * - nextReview -> due
 * - easeFactor -> ease
 * - repetitions -> reps
 * - lastReview = due - interval*24h (interval 可能为 0, 视为 0)
 */
export function toReviewQueueItem(r: {
  wordId: string
  nextReview: number
  interval: number
  easeFactor: number
  repetitions: number
}): ReviewQueueItem {
  const lastReview =
    r.interval > 0 ? r.nextReview - r.interval * MS_DAY : 0
  return {
    id: r.wordId,
    due: r.nextReview,
    ease: r.easeFactor,
    reps: r.repetitions,
    lastReview,
    isNew: r.repetitions < 3,
  }
}
