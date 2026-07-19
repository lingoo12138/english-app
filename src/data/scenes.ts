// 场景专题课 - 5 个真实场景的高频英语表达
// 每个场景 8-10 句,覆盖该场景下的核心表达

export interface SceneSentence {
  en: string
  zh: string
  /** 关键词(可点查) */
  keywords: string[]
  /** 这个句子在场景里怎么用 */
  usage?: string
}

export interface Scene {
  id: string
  name: string
  emoji: string
  description: string
  difficulty: 1 | 2 | 3
  sentences: SceneSentence[]
  vocabulary: string[]            // 这个场景的关键词
  tips?: string                    // 学习小贴士
}

export const SCENES: Scene[] = [
  {
    id: 'restaurant',
    name: '餐厅点餐',
    emoji: '🍽️',
    description: '在餐厅从入座到结账的完整对话,实用口语',
    difficulty: 1,
    sentences: [
      {
        en: 'Could I see the menu, please?',
        zh: '请给我看一下菜单。',
        keywords: ['menu', 'see'],
        usage: '坐下后,服务员来时的第一句话',
      },
      {
        en: 'What do you recommend?',
        zh: '你推荐什么?',
        keywords: ['recommend'],
        usage: '不知道点什么时问服务员',
      },
      {
        en: "I'll have the steak, medium rare.",
        zh: '我要牛排,五分熟。',
        keywords: ['steak', 'medium rare'],
        usage: '点牛排时,medium rare 是五分熟',
      },
      {
        en: 'For here or to go?',
        zh: '堂食还是外带?',
        keywords: ['for here', 'to go'],
        usage: '服务员问你在这里吃还是带走',
      },
      {
        en: 'Could I have some more water, please?',
        zh: '能再给我一些水吗?',
        keywords: ['water', 'more'],
        usage: '需要加水时的礼貌说法',
      },
      {
        en: 'Is service included?',
        zh: '服务费包含了吗?',
        keywords: ['service', 'included'],
        usage: '结账前问小费问题',
      },
      {
        en: 'Can I pay by credit card?',
        zh: '能刷卡吗?',
        keywords: ['pay', 'credit card'],
        usage: '结账时的支付方式',
      },
      {
        en: 'Keep the change, thanks.',
        zh: '零钱不用找了,谢谢。',
        keywords: ['change', 'keep'],
        usage: '把小费当零钱给服务员',
      },
    ],
    vocabulary: ['menu', 'recommend', 'steak', 'medium rare', 'service', 'tip', 'change', 'bill', 'waiter', 'order'],
    tips: '国外餐厅 service 通常不包含小费,小费一般是账单 15-20%',
  },

  {
    id: 'directions',
    name: '问路',
    emoji: '🗺️',
    description: '迷路时怎么问路、听懂方向',
    difficulty: 1,
    sentences: [
      {
        en: 'Excuse me, could you help me?',
        zh: '不好意思,能帮个忙吗?',
        keywords: ['excuse me', 'help'],
        usage: '问路前先礼貌开口',
      },
      {
        en: "I'm looking for the subway station.",
        zh: '我在找地铁站。',
        keywords: ['looking for', 'subway'],
        usage: '说出你要找的地方',
      },
      {
        en: "It's about a 10-minute walk from here.",
        zh: '从这里走过去大概 10 分钟。',
        keywords: ['walk', 'minute'],
        usage: '对方告诉你距离',
      },
      {
        en: 'Go straight for two blocks.',
        zh: '直走两个街区。',
        keywords: ['straight', 'block'],
        usage: '方向 + 距离',
      },
      {
        en: 'Turn left at the traffic light.',
        zh: '在红绿灯处左转。',
        keywords: ['turn left', 'traffic light'],
        usage: '在标志物处转向',
      },
      {
        en: "It's next to the bank.",
        zh: '就在银行旁边。',
        keywords: ['next to', 'bank'],
        usage: '用附近地标定位',
      },
      {
        en: "I'm lost. Can you show me on the map?",
        zh: '我迷路了,能在地图上指给我看吗?',
        keywords: ['lost', 'map'],
        usage: '实在找不到时求助',
      },
      {
        en: 'Thanks for your help!',
        zh: '谢谢你的帮助!',
        keywords: ['thanks', 'help'],
        usage: '结束时的礼貌致谢',
      },
    ],
    vocabulary: ['straight', 'block', 'traffic light', 'turn left', 'turn right', 'lost', 'map', 'subway', 'station', 'bank'],
    tips: '"block" 是国外常用距离单位,1 个 block 约 100-200 米',
  },

  {
    id: 'shopping',
    name: '购物',
    emoji: '🛍️',
    description: '从询价到结账,搞定整个购物流程',
    difficulty: 1,
    sentences: [
      {
        en: "I'm just looking, thanks.",
        zh: '我就看看,谢谢。',
        keywords: ['just looking'],
        usage: '不想被打扰时的礼貌拒绝',
      },
      {
        en: 'Do you have this in a smaller size?',
        zh: '这个有小一号的吗?',
        keywords: ['smaller', 'size'],
        usage: '试衣后问其他尺码',
      },
      {
        en: 'How much is this?',
        zh: '这个多少钱?',
        keywords: ['how much'],
        usage: '最常见的询价',
      },
      {
        en: "Is there a discount on this?",
        zh: '这个有折扣吗?',
        keywords: ['discount'],
        usage: '杀价前的礼貌询问',
      },
      {
        en: 'Can I try it on?',
        zh: '我能试一下吗?',
        keywords: ['try on'],
        usage: '试衣/试鞋',
      },
      {
        en: "It doesn't fit. Do you have other colors?",
        zh: '不合适,还有其他颜色吗?',
        keywords: ['fit', 'color'],
        usage: '不合适时换颜色',
      },
      {
        en: "I'll take it.",
        zh: '我要了。',
        keywords: ['take'],
        usage: '决定购买',
      },
      {
        en: 'Do you take credit cards?',
        zh: '你们收信用卡吗?',
        keywords: ['credit card', 'take'],
        usage: '结账时确认支付方式',
      },
    ],
    vocabulary: ['size', 'discount', 'try on', 'fit', 'color', 'take', 'cash', 'credit card', 'receipt', 'refund'],
    tips: '国外购物记得问 "Do you take credit cards?",小店可能只收现金',
  },

  {
    id: 'workplace',
    name: '办公职场',
    emoji: '💼',
    description: '职场沟通必备:会议、邮件、汇报',
    difficulty: 2,
    sentences: [
      {
        en: "Let's touch base on this tomorrow.",
        zh: '明天我们再碰一下。',
        keywords: ['touch base'],
        usage: '约时间继续讨论',
      },
      {
        en: "Could you walk me through this?",
        zh: '能跟我过一遍吗?',
        keywords: ['walk through'],
        usage: '请对方解释细节',
      },
      {
        en: "I'll get back to you on that.",
        zh: '这件事我回头答复你。',
        keywords: ['get back to'],
        usage: '需要时间考虑时',
      },
      {
        en: "Let's table this for now.",
        zh: '这个先放一放。',
        keywords: ['table'],
        usage: '暂时搁置话题',
      },
      {
        en: "I don't have the bandwidth right now.",
        zh: '我手头没空。',
        keywords: ['bandwidth'],
        usage: '委婉拒绝额外任务',
      },
      {
        en: "I'm swamped with work.",
        zh: '我忙得不可开交。',
        keywords: ['swamped'],
        usage: '表示很忙',
      },
      {
        en: "Does that make sense?",
        zh: '这样讲清楚了吗?',
        keywords: ['make sense'],
        usage: '解释完后确认对方理解',
      },
      {
        en: "Let's circle back on this next week.",
        zh: '下周我们再回头讨论。',
        keywords: ['circle back'],
        usage: '约时间重提话题',
      },
      {
        en: "Could I pick your brain on something?",
        zh: '能请教你点事吗?',
        keywords: ['pick your brain'],
        usage: '向有经验的人请教',
      },
      {
        en: "Thanks for looping me in.",
        zh: '谢谢你把我加进来。',
        keywords: ['loop in'],
        usage: '感谢被通知/被加入',
      },
    ],
    vocabulary: ['touch base', 'bandwidth', 'swamped', 'circle back', 'loop in', 'agenda', 'deck', 'stakeholder', 'deliverable', 'sync'],
    tips: '国外职场俚语多,bandwidth 指时间精力,swamped 指忙得不行',
  },

  {
    id: 'self-intro',
    name: '自我介绍',
    emoji: '👋',
    description: '第一次见面 / 派对 / 工作的开场白',
    difficulty: 1,
    sentences: [
      {
        en: "Hi, I'm [name]. Nice to meet you.",
        zh: '你好,我是 [名字],很高兴认识你。',
        keywords: ['nice to meet you'],
        usage: '最常见的开场白',
      },
      {
        en: "I work in marketing / as a teacher.",
        zh: '我在市场部工作 / 我是老师。',
        keywords: ['work in', 'work as'],
        usage: '介绍职业',
      },
      {
        en: "I'm from Beijing, but I live in Shanghai now.",
        zh: '我来自北京,但现在住在上海。',
        keywords: ['from', 'live in'],
        usage: '介绍家乡和现居地',
      },
      {
        en: "I've been here for about 2 years.",
        zh: '我来这里大概 2 年了。',
        keywords: ['been here'],
        usage: '说明停留时间',
      },
      {
        en: "What do you do?",
        zh: '你做什么工作?',
        keywords: ['what do you do'],
        usage: '反问对方,开启对话',
      },
      {
        en: "In my free time, I enjoy reading.",
        zh: '空闲时我喜欢看书。',
        keywords: ['free time', 'enjoy'],
        usage: '谈兴趣爱好',
      },
      {
        en: "How do you know [host name]?",
        zh: '你怎么认识 [主人名字]?',
        keywords: ['how do you know'],
        usage: '派对上找共同话题',
      },
      {
        en: "It was great meeting you. Let's keep in touch!",
        zh: '很高兴认识你,保持联系!',
        keywords: ['keep in touch'],
        usage: '结束时的得体告别',
      },
    ],
    vocabulary: ['nice to meet you', 'free time', 'enjoy', 'keep in touch', 'married', 'kids', 'hobby', 'experience', 'background', 'passion'],
    tips: '自我介绍不超过 60 秒,讲完问对方问题把话筒转过去',
  },
]

// 简单搜索
export function searchScenes(query: string): Scene[] {
  if (!query.trim()) return SCENES
  const q = query.toLowerCase()
  return SCENES.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.sentences.some(sent =>
      sent.en.toLowerCase().includes(q) || sent.zh.includes(q)
    )
  )
}
