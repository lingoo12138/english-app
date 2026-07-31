// antonyms.ts - v1.85-A 触类旁通 (Word Network) 反义词数据
// 手工整理自朗文当代英语词典 / 牛津高阶 / 柯林斯
// 共 60 组常见高频反义对
//
// 规范: 词 A → 词 B (严格反义, 一一对应)

export interface AntonymPair {
  /** 主词 (canonical, 小写) */
  word: string
  /** 反义词 */
  antonym: string
  /** 简注 (中文, 帮助辨析, ≤ 30 字) */
  note: string
}

/**
 * 主词 → AntonymPair
 * 数据按字母顺序排列
 * 严格反义: 一对一对立, 不模糊 (如 hot↔cold, win↔lose)
 */
export const ANTONYM_PAIRS: Record<string, AntonymPair> = {
  // ─── A ───
  'above': {
    word: 'above',
    antonym: 'below',
    note: '在...上面 ↔ 在...下面',
  },
  'accept': {
    word: 'accept',
    antonym: 'reject',
    note: '接受 ↔ 拒绝',
  },
  'active': {
    word: 'active',
    antonym: 'passive',
    note: '主动的 ↔ 被动的',
  },
  'alive': {
    word: 'alive',
    antonym: 'dead',
    note: '活着的 ↔ 死的',
  },
  'always': {
    word: 'always',
    antonym: 'never',
    note: '总是 ↔ 从不',
  },
  'ancient': {
    word: 'ancient',
    antonym: 'modern',
    note: '古代的 ↔ 现代的',
  },
  'answer': {
    word: 'answer',
    antonym: 'question',
    note: '答案 ↔ 问题',
  },
  'appear': {
    word: 'appear',
    antonym: 'disappear',
    note: '出现 ↔ 消失',
  },
  'arrive': {
    word: 'arrive',
    antonym: 'depart',
    note: '到达 ↔ 离开',
  },
  'ask': {
    word: 'ask',
    antonym: 'answer',
    note: '问 ↔ 答',
  },

  // ─── B ───
  'back': {
    word: 'back',
    antonym: 'front',
    note: '后面 ↔ 前面',
  },
  'bad': {
    word: 'bad',
    antonym: 'good',
    note: '坏的 ↔ 好的',
  },
  'beautiful': {
    word: 'beautiful',
    antonym: 'ugly',
    note: '美丽的 ↔ 丑陋的',
  },
  'before': {
    word: 'before',
    antonym: 'after',
    note: '在...之前 ↔ 在...之后',
  },
  'begin': {
    word: 'begin',
    antonym: 'end',
    note: '开始 ↔ 结束',
  },
  'big': {
    word: 'big',
    antonym: 'small',
    note: '大的 ↔ 小的',
  },
  'borrow': {
    word: 'borrow',
    antonym: 'lend',
    note: '借入 ↔ 借出',
  },
  'buy': {
    word: 'buy',
    antonym: 'sell',
    note: '买 ↔ 卖',
  },

  // ─── C ───
  'cheap': {
    word: 'cheap',
    antonym: 'expensive',
    note: '便宜的 ↔ 昂贵的',
  },
  'clean': {
    word: 'clean',
    antonym: 'dirty',
    note: '干净的 ↔ 脏的',
  },
  'close': {
    word: 'close',
    antonym: 'open',
    note: '关 ↔ 开',
  },
  'cold': {
    word: 'cold',
    antonym: 'hot',
    note: '冷的 ↔ 热的',
  },
  'come': {
    word: 'come',
    antonym: 'go',
    note: '来 ↔ 去',
  },
  'cool': {
    word: 'cool',
    antonym: 'warm',
    note: '凉爽的 ↔ 温暖的',
  },
  'courage': {
    word: 'courage',
    antonym: 'cowardice',
    note: '勇气 ↔ 懦弱',
  },

  // ─── D ───
  'dark': {
    word: 'dark',
    antonym: 'light',
    note: '黑暗 ↔ 光明',
  },
  'day': {
    word: 'day',
    antonym: 'night',
    note: '白天 ↔ 夜晚',
  },
  'deep': {
    word: 'deep',
    antonym: 'shallow',
    note: '深的 ↔ 浅的',
  },
  'difficult': {
    word: 'difficult',
    antonym: 'easy',
    note: '困难的 ↔ 容易的',
  },
  'down': {
    word: 'down',
    antonym: 'up',
    note: '向下 ↔ 向上',
  },
  'dry': {
    word: 'dry',
    antonym: 'wet',
    note: '干的 ↔ 湿的',
  },

  // ─── E ───
  'early': {
    word: 'early',
    antonym: 'late',
    note: '早的 ↔ 晚的',
  },
  'empty': {
    word: 'empty',
    antonym: 'full',
    note: '空的 ↔ 满的',
  },
  'enemy': {
    word: 'enemy',
    antonym: 'friend',
    note: '敌人 ↔ 朋友',
  },

  // ─── F ───
  'fail': {
    word: 'fail',
    antonym: 'succeed',
    note: '失败 ↔ 成功',
  },
  'fast': {
    word: 'fast',
    antonym: 'slow',
    note: '快的 ↔ 慢的',
  },
  'fat': {
    word: 'fat',
    antonym: 'thin',
    note: '胖的 ↔ 瘦的',
  },
  'first': {
    word: 'first',
    antonym: 'last',
    note: '第一个 ↔ 最后一个',
  },
  'forget': {
    word: 'forget',
    antonym: 'remember',
    note: '忘记 ↔ 记住',
  },

  // ─── G ───
  'gain': {
    word: 'gain',
    antonym: 'loss',
    note: '获得 ↔ 损失',
  },
  'give': {
    word: 'give',
    antonym: 'take',
    note: '给 ↔ 拿',
  },
  'good': {
    word: 'good',
    antonym: 'bad',
    note: '好的 ↔ 坏的',
  },
  'great': {
    word: 'great',
    antonym: 'terrible',
    note: '极好的 ↔ 极差的',
  },

  // ─── H ───
  'happy': {
    word: 'happy',
    antonym: 'sad',
    note: '快乐的 ↔ 悲伤的',
  },
  'hard': {
    word: 'hard',
    antonym: 'soft',
    note: '硬的 ↔ 软的',
  },
  'hate': {
    word: 'hate',
    antonym: 'love',
    note: '恨 ↔ 爱',
  },
  'high': {
    word: 'high',
    antonym: 'low',
    note: '高的 ↔ 低的',
  },
  'hot': {
    word: 'hot',
    antonym: 'cold',
    note: '热的 ↔ 冷的',
  },

  // ─── I ───
  'increase': {
    word: 'increase',
    antonym: 'decrease',
    note: '增加 ↔ 减少',
  },

  // ─── L ───
  'laugh': {
    word: 'laugh',
    antonym: 'cry',
    note: '笑 ↔ 哭',
  },
  'light': {
    word: 'light',
    antonym: 'dark',
    note: '光 ↔ 暗',
  },
  'lose': {
    word: 'lose',
    antonym: 'win',
    note: '输 ↔ 赢',
  },
  'loud': {
    word: 'loud',
    antonym: 'quiet',
    note: '大声的 ↔ 安静的',
  },
  'love': {
    word: 'love',
    antonym: 'hate',
    note: '爱 ↔ 恨',
  },

  // ─── M ───
  'many': {
    word: 'many',
    antonym: 'few',
    note: '多 ↔ 少',
  },
  'more': {
    word: 'more',
    antonym: 'less',
    note: '更多 ↔ 更少',
  },

  // ─── N ───
  'no': {
    word: 'no',
    antonym: 'yes',
    note: '不 ↔ 是',
  },

  // ─── O ───
  'old': {
    word: 'old',
    antonym: 'young',
    note: '老的 ↔ 年轻的',
  },
  'open': {
    word: 'open',
    antonym: 'close',
    note: '开 ↔ 关',
  },

  // ─── P ───
  'pull': {
    word: 'pull',
    antonym: 'push',
    note: '拉 ↔ 推',
  },
  'push': {
    word: 'push',
    antonym: 'pull',
    note: '推 ↔ 拉',
  },

  // ─── Q ───
  'quiet': {
    word: 'quiet',
    antonym: 'noisy',
    note: '安静的 ↔ 嘈杂的',
  },

  // ─── R ───
  'rich': {
    word: 'rich',
    antonym: 'poor',
    note: '富的 ↔ 穷的',
  },
  'right': {
    word: 'right',
    antonym: 'wrong',
    note: '对的 ↔ 错的',
  },

  // ─── S ───
  'safe': {
    word: 'safe',
    antonym: 'dangerous',
    note: '安全的 ↔ 危险的',
  },
  'sell': {
    word: 'sell',
    antonym: 'buy',
    note: '卖 ↔ 买',
  },
  'strong': {
    word: 'strong',
    antonym: 'weak',
    note: '强壮的 ↔ 虚弱的',
  },

  // ─── T ───
  'start': {
    word: 'start',
    antonym: 'stop',
    note: '开始 ↔ 停止',
  },
  'stop': {
    word: 'stop',
    antonym: 'start',
    note: '停止 ↔ 开始',
  },
  'success': {
    word: 'success',
    antonym: 'failure',
    note: '成功 ↔ 失败',
  },

  // ─── U ───
  'up': {
    word: 'up',
    antonym: 'down',
    note: '向上 ↔ 向下',
  },
  'ugly': {
    word: 'ugly',
    antonym: 'beautiful',
    note: '丑陋的 ↔ 美丽的',
  },

  // ─── W ───
  'war': {
    word: 'war',
    antonym: 'peace',
    note: '战争 ↔ 和平',
  },
  'weak': {
    word: 'weak',
    antonym: 'strong',
    note: '虚弱的 ↔ 强壮的',
  },
  'win': {
    word: 'win',
    antonym: 'lose',
    note: '赢 ↔ 输',
  },
  'wrong': {
    word: 'wrong',
    antonym: 'right',
    note: '错的 ↔ 对的',
  },

  // ─── Y ───
  'yes': {
    word: 'yes',
    antonym: 'no',
    note: '是 ↔ 不',
  },
  'young': {
    word: 'young',
    antonym: 'old',
    note: '年轻的 ↔ 年老的',
  },
}

/** 反向索引: 反义词 → 主词 (让查询双向都有效) */
export const ANTONYM_REVERSE: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [word, pair] of Object.entries(ANTONYM_PAIRS)) {
    map[pair.antonym] = word
  }
  return map
})()

/** 主词列表 (字母顺序) */
export const ANTONYM_KEYS: string[] = Object.keys(ANTONYM_PAIRS).sort()
