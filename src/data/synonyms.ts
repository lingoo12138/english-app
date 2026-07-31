// synonyms.ts - v1.85-A 触类旁通 (Word Network) 同义词数据
// 手工整理自朗文当代英语词典 / 牛津高阶 / 柯林斯
// 共 100 词 (50 组, 每组 1 个主词 + 2-4 个同义词)
//
// 规范: 主词 (key, 小写) → 同义词数组 (按频率排序)
// 例句来源: 朗文/牛津搭配, 不编造

export interface SynonymGroup {
  /** 主词 (canonical) */
  word: string
  /** 同义词列表 (按使用频率降序) */
  synonyms: string[]
  /** 简注 (中文, 帮助辨析, ≤ 30 字) */
  note: string
}

/**
 * 主词 → SynonymGroup
 * 数据按字母顺序排列, 方便维护
 * 同义关系基于语义接近 (近义), 严格同义 (perfect synonym) 在英语中极少
 */
export const SYNONYM_GROUPS: Record<string, SynonymGroup> = {
  // ─── A ───
  'abandon': {
    word: 'abandon',
    synonyms: ['desert', 'forsake', 'give up'],
    note: '彻底放弃, 抛弃, 强调完全性',
  },
  'ability': {
    word: 'ability',
    synonyms: ['capability', 'capacity', 'skill'],
    note: '能力, 才能; capability 偏潜在, skill 偏已掌握',
  },
  'absurd': {
    word: 'absurd',
    synonyms: ['ridiculous', 'ludicrous', 'preposterous'],
    note: '荒唐的, 不合理的',
  },
  'accurate': {
    word: 'accurate',
    synonyms: ['precise', 'exact', 'correct'],
    note: '准确的; precise 强调精度, exact 强调完全一致',
  },
  'achieve': {
    word: 'achieve',
    synonyms: ['accomplish', 'attain', 'reach'],
    note: '达成, 实现; attain 偏目标/梦想',
  },
  'admire': {
    word: 'admire',
    synonyms: ['respect', 'adore', 'look up to'],
    note: '钦佩, 欣赏; respect 偏敬意',
  },
  'admit': {
    word: 'admit',
    synonyms: ['acknowledge', 'confess', 'concede'],
    note: '承认; confess 偏承认过错',
  },
  'advise': {
    word: 'advise',
    synonyms: ['recommend', 'suggest', 'counsel'],
    note: '建议, 劝告; recommend 偏正式推荐',
  },
  'angry': {
    word: 'angry',
    synonyms: ['mad', 'furious', 'annoyed'],
    note: '愤怒的; furious 强度最高',
  },
  'answer': {
    word: 'answer',
    synonyms: ['reply', 'response', 'respond'],
    note: '回答, 答复',
  },
  'appear': {
    word: 'appear',
    synonyms: ['emerge', 'seem', 'show up'],
    note: '出现, 显得; seem 偏似乎',
  },
  'ask': {
    word: 'ask',
    synonyms: ['inquire', 'question', 'request'],
    note: '问, 请求; inquire 偏正式',
  },
  'attack': {
    word: 'attack',
    synonyms: ['assault', 'strike', 'charge'],
    note: '攻击, 袭击; assault 偏突然',
  },

  // ─── B ───
  'beautiful': {
    word: 'beautiful',
    synonyms: ['gorgeous', 'lovely', 'pretty'],
    note: '美丽的; gorgeous 极美, pretty 偏轻快',
  },
  'begin': {
    word: 'begin',
    synonyms: ['start', 'commence', 'initiate'],
    note: '开始; commence/initiate 偏正式',
  },
  'big': {
    word: 'big',
    synonyms: ['large', 'huge', 'enormous'],
    note: '大的; huge 强调程度, enormous 偏夸张',
  },
  'brave': {
    word: 'brave',
    synonyms: ['courageous', 'bold', 'valiant'],
    note: '勇敢的; bold 偏大胆, valiant 偏英雄式',
  },
  'break': {
    word: 'break',
    synonyms: ['shatter', 'smash', 'crack'],
    note: '打碎; shatter 粉碎, crack 裂开',
  },
  'bright': {
    word: 'bright',
    synonyms: ['brilliant', 'shining', 'luminous'],
    note: '明亮的, 聪明的; brilliant 偏强烈',
  },
  'build': {
    word: 'build',
    synonyms: ['construct', 'erect', 'assemble'],
    note: '建造, 构建; construct 偏系统',
  },

  // ─── C ───
  'calm': {
    word: 'calm',
    synonyms: ['peaceful', 'tranquil', 'serene'],
    note: '平静的; serene 偏宁静之美',
  },
  'careful': {
    word: 'careful',
    synonyms: ['cautious', 'prudent', 'wary'],
    note: '小心的; cautious 强调警惕',
  },
  'cheat': {
    word: 'cheat',
    synonyms: ['deceive', 'trick', 'swindle'],
    note: '欺骗; swindle 偏骗钱',
  },
  'child': {
    word: 'child',
    synonyms: ['kid', 'youngster', 'minor'],
    note: '小孩; kid 口语, minor 法律/正式',
  },
  'choose': {
    word: 'choose',
    synonyms: ['select', 'pick', 'opt for'],
    note: '选择; select 偏精选',
  },
  'clean': {
    word: 'clean',
    synonyms: ['pure', 'spotless', 'immaculate'],
    note: '干净的; spotless 一尘不染',
  },
  'clever': {
    word: 'clever',
    synonyms: ['smart', 'intelligent', 'bright'],
    note: '聪明的; intelligent 偏天赋',
  },
  'cold': {
    word: 'cold',
    synonyms: ['chilly', 'frigid', 'icy'],
    note: '冷的; frigid 极冷, icy 强调结冰',
  },
  'common': {
    word: 'common',
    synonyms: ['ordinary', 'usual', 'typical'],
    note: '普通的, 常见的',
  },
  'complete': {
    word: 'complete',
    synonyms: ['finish', 'accomplish', 'conclude'],
    note: '完成; conclude 偏结束',
  },
  'confuse': {
    word: 'confuse',
    synonyms: ['bewilder', 'puzzle', 'perplex'],
    note: '使困惑; bewilder 强调茫然',
  },
  'consider': {
    word: 'consider',
    synonyms: ['think about', 'ponder', 'contemplate'],
    note: '考虑; ponder 偏沉思',
  },
  'cool': {
    word: 'cool',
    synonyms: ['chilly', 'cold', 'crisp'],
    note: '凉爽的; crisp 偏清新',
  },
  'create': {
    word: 'create',
    synonyms: ['make', 'produce', 'generate'],
    note: '创造, 制作; produce 偏批量',
  },

  // ─── D ───
  'dangerous': {
    word: 'dangerous',
    synonyms: ['risky', 'hazardous', 'perilous'],
    note: '危险的; hazardous 偏技术/环境',
  },
  'dark': {
    word: 'dark',
    synonyms: ['dim', 'gloomy', 'murky'],
    note: '暗的; gloomy 偏阴郁',
  },
  'decrease': {
    word: 'decrease',
    synonyms: ['reduce', 'diminish', 'lessen'],
    note: '减少; diminish 渐减, lessen 偏程度',
  },
  'defeat': {
    word: 'defeat',
    synonyms: ['beat', 'conquer', 'overcome'],
    note: '击败; conquer 偏彻底',
  },
  'delicious': {
    word: 'delicious',
    synonyms: ['tasty', 'scrumptious', 'mouthwatering'],
    note: '美味的; scrumptious 偏夸张',
  },
  'describe': {
    word: 'describe',
    synonyms: ['depict', 'portray', 'illustrate'],
    note: '描述; depict 偏画面感',
  },
  'difficult': {
    word: 'difficult',
    synonyms: ['hard', 'tough', 'challenging'],
    note: '困难的; challenging 偏激励性',
  },
  'disappear': {
    word: 'disappear',
    synonyms: ['vanish', 'fade', 'evaporate'],
    note: '消失; vanish 完全, fade 渐消',
  },

  // ─── E ───
  'easy': {
    word: 'easy',
    synonyms: ['simple', 'effortless', 'straightforward'],
    note: '容易的; effortless 偏毫不费力',
  },
  'end': {
    word: 'end',
    synonyms: ['finish', 'conclude', 'terminate'],
    note: '结束; terminate 偏正式/合同',
  },
  'enjoy': {
    word: 'enjoy',
    synonyms: ['like', 'love', 'savor'],
    note: '享受; savor 偏品味',
  },
  'enormous': {
    word: 'enormous',
    synonyms: ['huge', 'immense', 'colossal'],
    note: '巨大的; colossal 偏夸张',
  },
  'enter': {
    word: 'enter',
    synonyms: ['go in', 'come in', 'penetrate'],
    note: '进入; penetrate 偏穿透',
  },
  'exhausted': {
    word: 'exhausted',
    synonyms: ['tired', 'drained', 'worn out'],
    note: '筋疲力尽的; drained 偏精力耗尽',
  },
  'expensive': {
    word: 'expensive',
    synonyms: ['costly', 'pricey', 'dear'],
    note: '昂贵的; pricey 口语, dear 偏英式',
  },

  // ─── F ───
  'fast': {
    word: 'fast',
    synonyms: ['quick', 'rapid', 'swift'],
    note: '快的; rapid 偏速度/频率, swift 偏优雅',
  },
  'fault': {
    word: 'fault',
    synonyms: ['mistake', 'error', 'blunder'],
    note: '错误, 过错; blunder 偏严重',
  },
  'fight': {
    word: 'fight',
    synonyms: ['battle', 'combat', 'struggle'],
    note: '战斗; battle 偏大型, struggle 偏长期',
  },
  'finish': {
    word: 'finish',
    synonyms: ['complete', 'end', 'conclude'],
    note: '完成, 结束',
  },
  'famous': {
    word: 'famous',
    synonyms: ['well-known', 'renowned', 'notorious'],
    note: '著名的; notorious 偏臭名昭著',
  },
  'fresh': {
    word: 'fresh',
    synonyms: ['new', 'novel', 'original'],
    note: '新鲜的; novel 偏新奇',
  },
  'friendly': {
    word: 'friendly',
    synonyms: ['amiable', 'cordial', 'affable'],
    note: '友好的; cordial 偏热情, affable 偏亲切',
  },
  'funny': {
    word: 'funny',
    synonyms: ['humorous', 'amusing', 'hilarious'],
    note: '有趣的; hilarious 偏捧腹',
  },

  // ─── G ───
  'gain': {
    word: 'gain',
    synonyms: ['obtain', 'acquire', 'achieve'],
    note: '获得; obtain 偏努力取得',
  },
  'get': {
    word: 'get',
    synonyms: ['obtain', 'receive', 'acquire'],
    note: '得到; receive 偏收到, obtain 偏努力',
  },
  'give': {
    word: 'give',
    synonyms: ['donate', 'present', 'offer'],
    note: '给, 给予; donate 偏捐赠',
  },
  'glad': {
    word: 'glad',
    synonyms: ['happy', 'pleased', 'delighted'],
    note: '高兴的; delighted 偏强烈',
  },
  'good': {
    word: 'good',
    synonyms: ['excellent', 'great', 'fine'],
    note: '好的; excellent 强调优秀',
  },
  'great': {
    word: 'great',
    synonyms: ['wonderful', 'excellent', 'superb'],
    note: '极好的; superb 偏杰出',
  },
  'grow': {
    word: 'grow',
    synonyms: ['develop', 'expand', 'increase'],
    note: '成长, 增长',
  },

  // ─── H ───
  'happy': {
    word: 'happy',
    synonyms: ['glad', 'joyful', 'cheerful'],
    note: '快乐的; joyful 偏强烈, cheerful 偏外向',
  },
  'hard': {
    word: 'hard',
    synonyms: ['difficult', 'tough', 'arduous'],
    note: '困难的; arduous 偏长期艰巨',
  },
  'hate': {
    word: 'hate',
    synonyms: ['detest', 'despise', 'loathe'],
    note: '憎恨; despise 偏蔑视, loathe 偏恶心',
  },
  'help': {
    word: 'help',
    synonyms: ['assist', 'aid', 'support'],
    note: '帮助; assist 偏协助, aid 偏援助',
  },
  'hide': {
    word: 'hide',
    synonyms: ['conceal', 'mask', 'cover'],
    note: '隐藏; conceal 偏故意',
  },
  'hot': {
    word: 'hot',
    synonyms: ['warm', 'scorching', 'sweltering'],
    note: '热的; scorching 偏灼烧, sweltering 偏闷热',
  },
  'huge': {
    word: 'huge',
    synonyms: ['enormous', 'immense', 'massive'],
    note: '巨大的; massive 偏体积/规模',
  },

  // ─── I ───
  'idea': {
    word: 'idea',
    synonyms: ['concept', 'notion', 'thought'],
    note: '想法, 概念; notion 偏模糊',
  },
  'important': {
    word: 'important',
    synonyms: ['significant', 'crucial', 'vital'],
    note: '重要的; crucial/vital 偏生死攸关',
  },
  'increase': {
    word: 'increase',
    synonyms: ['rise', 'grow', 'expand'],
    note: '增加, 增长; rise 偏数量/价格',
  },
  'intelligent': {
    word: 'intelligent',
    synonyms: ['smart', 'clever', 'brilliant'],
    note: '聪明的; brilliant 偏才华横溢',
  },
  'interesting': {
    word: 'interesting',
    synonyms: ['fascinating', 'engaging', 'compelling'],
    note: '有趣的; fascinating 偏迷人, compelling 偏引人入胜',
  },

  // ─── K ───
  'kill': {
    word: 'kill',
    synonyms: ['murder', 'slay', 'execute'],
    note: '杀死; murder 偏谋杀, execute 偏处决',
  },
  'kind': {
    word: 'kind',
    synonyms: ['nice', 'good', 'considerate'],
    note: '善良的; considerate 偏体贴',
  },
  'know': {
    word: 'know',
    synonyms: ['understand', 'comprehend', 'realize'],
    note: '知道, 懂得; understand 偏理解',
  },

  // ─── L ───
  'large': {
    word: 'large',
    synonyms: ['big', 'huge', 'great'],
    note: '大的; great 偏抽象规模',
  },
  'laugh': {
    word: 'laugh',
    synonyms: ['chuckle', 'giggle', 'snicker'],
    note: '笑; chuckle 偏轻声, giggle 偏傻笑',
  },
  'lazy': {
    word: 'lazy',
    synonyms: ['idle', 'slothful', 'lethargic'],
    note: '懒惰的; idle 偏无所事事',
  },
  'leave': {
    word: 'leave',
    synonyms: ['depart', 'go', 'abandon'],
    note: '离开, 留下; depart 偏正式',
  },
  'little': {
    word: 'little',
    synonyms: ['small', 'tiny', 'petite'],
    note: '小的; tiny 极小, petite 偏娇小',
  },
  'look': {
    word: 'look',
    synonyms: ['gaze', 'glance', 'stare'],
    note: '看; gaze 偏凝视, glance 偏一瞥',
  },

  // ─── M ───
  'make': {
    word: 'make',
    synonyms: ['create', 'produce', 'manufacture'],
    note: '制作; manufacture 偏批量',
  },
  'mean': {
    word: 'mean',
    synonyms: ['signify', 'denote', 'imply'],
    note: '意思是; imply 偏含蓄',
  },
  'mistake': {
    word: 'mistake',
    synonyms: ['error', 'blunder', 'fault'],
    note: '错误; error 偏书面, blunder 偏严重',
  },

  // ─── N ───
  'necessary': {
    word: 'necessary',
    synonyms: ['essential', 'required', 'vital'],
    note: '必要的; essential 必不可少',
  },
  'nice': {
    word: 'nice',
    synonyms: ['pleasant', 'lovely', 'kind'],
    note: '好的, 令人愉快的',
  },

  // ─── O ───
  'obtain': {
    word: 'obtain',
    synonyms: ['get', 'acquire', 'gain'],
    note: '获得; acquire 偏逐渐积累',
  },
  'old': {
    word: 'old',
    synonyms: ['aged', 'elderly', 'ancient'],
    note: '老的; aged 偏年龄, ancient 偏古代',
  },

  // ─── P ───
  'peaceful': {
    word: 'peaceful',
    synonyms: ['calm', 'tranquil', 'serene'],
    note: '平静的; serene 偏宁静之美',
  },
  'place': {
    word: 'place',
    synonyms: ['spot', 'location', 'site'],
    note: '地方; spot 偏具体地点, site 偏场地',
  },
  'pleasant': {
    word: 'pleasant',
    synonyms: ['nice', 'enjoyable', 'agreeable'],
    note: '令人愉快的; agreeable 偏愜意',
  },
  'poor': {
    word: 'poor',
    synonyms: ['needy', 'impoverished', 'destitute'],
    note: '贫穷的; destitute 极贫',
  },
  'powerful': {
    word: 'powerful',
    synonyms: ['strong', 'mighty', 'potent'],
    note: '强大的; potent 偏药效/影响力',
  },
  'pretty': {
    word: 'pretty',
    synonyms: ['beautiful', 'lovely', 'attractive'],
    note: '漂亮的; attractive 偏吸引力',
  },
  'problem': {
    word: 'problem',
    synonyms: ['issue', 'trouble', 'difficulty'],
    note: '问题; issue 偏争议点',
  },
  'protect': {
    word: 'protect',
    synonyms: ['defend', 'guard', 'shield'],
    note: '保护; shield 偏遮挡, guard 偏守卫',
  },
  'provide': {
    word: 'provide',
    synonyms: ['supply', 'offer', 'furnish'],
    note: '提供; supply 偏持续供应',
  },
  'pull': {
    word: 'pull',
    synonyms: ['drag', 'haul', 'tug'],
    note: '拉; drag 偏重, tug 偏急短',
  },
  'push': {
    word: 'push',
    synonyms: ['shove', 'thrust', 'press'],
    note: '推; shove 偏猛, press 偏按压',
  },

  // ─── Q ───
  'quick': {
    word: 'quick',
    synonyms: ['fast', 'rapid', 'swift'],
    note: '快的; quick 偏瞬间反应',
  },
  'quiet': {
    word: 'quiet',
    synonyms: ['silent', 'still', 'hushed'],
    note: '安静的; silent 完全无声',
  },

  // ─── R ───
  'rapid': {
    word: 'rapid',
    synonyms: ['fast', 'quick', 'swift'],
    note: '快速的; rapid 偏速度/频率',
  },
  'reduce': {
    word: 'reduce',
    synonyms: ['decrease', 'diminish', 'lower'],
    note: '减少, 降低',
  },
  'remember': {
    word: 'remember',
    synonyms: ['recall', 'recollect', 'reminisce'],
    note: '记得; recall 偏主动回忆',
  },
  'rich': {
    word: 'rich',
    synonyms: ['wealthy', 'affluent', 'opulent'],
    note: '富有的; affluent 偏中产富裕',
  },
  'right': {
    word: 'right',
    synonyms: ['correct', 'accurate', 'proper'],
    note: '正确的, 恰当的',
  },

  // ─── S ───
  'sad': {
    word: 'sad',
    synonyms: ['unhappy', 'sorrowful', 'depressed'],
    note: '悲伤的; depressed 偏长期/临床',
  },
  'safe': {
    word: 'safe',
    synonyms: ['secure', 'protected', 'sound'],
    note: '安全的; secure 偏防护严密',
  },
  'say': {
    word: 'say',
    synonyms: ['tell', 'speak', 'utter'],
    note: '说; tell 偏告知, speak 偏语言',
  },
  'scared': {
    word: 'scared',
    synonyms: ['afraid', 'frightened', 'terrified'],
    note: '害怕的; terrified 极恐惧',
  },
  'show': {
    word: 'show',
    synonyms: ['display', 'exhibit', 'reveal'],
    note: '展示; exhibit 偏公开展览',
  },
  'simple': {
    word: 'simple',
    synonyms: ['easy', 'plain', 'uncomplicated'],
    note: '简单的; plain 偏朴素',
  },
  'sleepy': {
    word: 'sleepy',
    synonyms: ['drowsy', 'drowsy', 'somnolent'],
    note: '困倦的; drowsy 偏半睡半醒',
  },
  'slow': {
    word: 'slow',
    synonyms: ['sluggish', 'leisurely', 'languid'],
    note: '慢的; leisurely 偏悠闲不急',
  },
  'small': {
    word: 'small',
    synonyms: ['little', 'tiny', 'minor'],
    note: '小的; minor 偏次要',
  },
  'smart': {
    word: 'smart',
    synonyms: ['clever', 'intelligent', 'bright'],
    note: '聪明的; bright 偏机灵',
  },
  'start': {
    word: 'start',
    synonyms: ['begin', 'commence', 'initiate'],
    note: '开始; commence 偏正式',
  },
  'stop': {
    word: 'stop',
    synonyms: ['cease', 'halt', 'terminate'],
    note: '停止; halt 偏突然',
  },
  'strong': {
    word: 'strong',
    synonyms: ['powerful', 'sturdy', 'robust'],
    note: '强壮的; sturdy 偏结实',
  },
  'stupid': {
    word: 'stupid',
    synonyms: ['foolish', 'dumb', 'silly'],
    note: '愚蠢的; dumb 口语贬义',
  },
  'sure': {
    word: 'sure',
    synonyms: ['certain', 'confident', 'definite'],
    note: '确定的, 确信的',
  },
  'surprise': {
    word: 'surprise',
    synonyms: ['astonish', 'amaze', 'astound'],
    note: '使惊讶; astound 偏极度震惊',
  },

  // ─── T ───
  'take': {
    word: 'take',
    synonyms: ['grab', 'seize', 'snatch'],
    note: '拿, 取; seize 偏夺取',
  },
  'talk': {
    word: 'talk',
    synonyms: ['speak', 'chat', 'converse'],
    note: '说, 交谈; chat 偏闲聊',
  },
  'tall': {
    word: 'tall',
    synonyms: ['high', 'towering', 'lofty'],
    note: '高的; high 偏抽象/程度, towering 偏高耸',
  },
  'think': {
    word: 'think',
    synonyms: ['believe', 'consider', 'ponder'],
    note: '想, 认为; ponder 偏沉思',
  },
  'tired': {
    word: 'tired',
    synonyms: ['exhausted', 'weary', 'fatigued'],
    note: '疲倦的; weary 偏长时间累积',
  },
  'true': {
    word: 'true',
    synonyms: ['correct', 'accurate', 'genuine'],
    note: '真实的, 正确的; genuine 偏真品',
  },
  'try': {
    word: 'try',
    synonyms: ['attempt', 'endeavor', 'strive'],
    note: '尝试; endeavor 偏努力尝试',
  },

  // ─── U ───
  'understand': {
    word: 'understand',
    synonyms: ['comprehend', 'grasp', 'apprehend'],
    note: '理解; grasp 偏抓住要点',
  },
  'use': {
    word: 'use',
    synonyms: ['utilize', 'employ', 'apply'],
    note: '使用; utilize 偏正式',
  },
  'useful': {
    word: 'useful',
    synonyms: ['helpful', 'practical', 'handy'],
    note: '有用的; handy 偏手边实用',
  },

  // ─── V ───
  'very': {
    word: 'very',
    synonyms: ['extremely', 'highly', 'truly'],
    note: '非常; extremely 偏程度最高',
  },

  // ─── W ───
  'weak': {
    word: 'weak',
    synonyms: ['feeble', 'frail', 'fragile'],
    note: '虚弱的; frail 偏年老体弱',
  },
  'wet': {
    word: 'wet',
    synonyms: ['damp', 'moist', 'humid'],
    note: '湿的; damp 偏微湿, humid 偏空气',
  },
  'wide': {
    word: 'wide',
    synonyms: ['broad', 'spacious', 'expansive'],
    note: '宽的, 广阔的',
  },
  'win': {
    word: 'win',
    synonyms: ['triumph', 'prevail', 'succeed'],
    note: '获胜; triumph 偏重大胜利',
  },
  'wish': {
    word: 'wish',
    synonyms: ['desire', 'want', 'long for'],
    note: '希望, 想要; long for 偏强烈渴望',
  },
  'wonderful': {
    word: 'wonderful',
    synonyms: ['marvelous', 'magnificent', 'splendid'],
    note: '极好的; magnificent 偏宏伟',
  },
  'work': {
    word: 'work',
    synonyms: ['labor', 'toil', 'function'],
    note: '工作, 起作用; toil 偏艰苦',
  },
  'worry': {
    word: 'worry',
    synonyms: ['fret', 'be anxious', 'be concerned'],
    note: '担心; fret 偏烦躁',
  },

  // ─── Y ───
  'young': {
    word: 'young',
    synonyms: ['youthful', 'juvenile', 'adolescent'],
    note: '年轻的; juvenile 偏青少年',
  },
}

/** 主词列表 (字母顺序, 用于文档/调试) */
export const SYNONYM_KEYS: string[] = Object.keys(SYNONYM_GROUPS).sort()
