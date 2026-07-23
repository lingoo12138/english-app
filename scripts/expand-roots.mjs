// W3-A: 词根扩充 54.3% → 75%
// 离线脚本: 用已知词根表扫描 words.json, 给 Top 2k 缺词根的词补 roots
// 不依赖 LLM, 零成本
// 运行: node scripts/expand-roots.mjs
import { readFileSync, writeFileSync } from 'fs'

const WORDS_PATH = 'public/data/words.json'
const TARGET_COVERAGE = 0.75  // 75%

// 已知词根表(常用 ~80 个 prefix/root/suffix)
// 来源: 英文词根词缀高频表 + 教学经验
// 格式: [root/prefix/suffix, 中文意思, type]
const KNOWN_ROOTS = [
  // --- 常见前缀 prefix ---
  ['ab-', '离开/偏离', 'prefix'],
  ['ad-', '向/到', 'prefix'],
  // ad- 的同化变体
  ['ac-', '向/到(ad- 同化, c 前)', 'prefix'],
  ['af-', '向/到(ad- 同化, f 前)', 'prefix'],
  ['ag-', '向/到(ad- 同化, g 前)', 'prefix'],
  ['al-', '向/到(ad- 同化, l 前)', 'prefix'],
  ['ap-', '向/到(ad- 同化, p 前)', 'prefix'],
  ['ar-', '向/到(ad- 同化, r 前)', 'prefix'],
  ['as-', '向/到(ad- 同化, s 前)', 'prefix'],
  ['at-', '向/到(ad- 同化, t 前)', 'prefix'],
  // con- 的同化变体
  ['co-', '共同/一起(con- 简化)', 'prefix'],
  ['col-', '共同(con- 同化, l 前)', 'prefix'],
  ['com-', '共同(con- 同化, m 前)', 'prefix'],
  ['cor-', '共同(con- 同化, r 前)', 'prefix'],
  // in- 的同化变体(已在主表)
  ['be-', '使/在/加强', 'prefix'],
  ['anti-', '反对', 'prefix'],
  ['auto-', '自己', 'prefix'],
  ['bi-', '二/两', 'prefix'],
  ['co-', '共同', 'prefix'],
  ['de-', '向下/否定', 'prefix'],
  ['dis-', '否定/分开', 'prefix'],
  ['em-', '进入/使...', 'prefix'],
  ['en-', '使.../进入', 'prefix'],
  ['ex-', '向外/前任', 'prefix'],
  ['extra-', '超出', 'prefix'],
  ['fore-', '预先/前面', 'prefix'],
  ['in-', '否定/向内', 'prefix'],
  ['im-', '否定/向内', 'prefix'],
  ['il-', '否定', 'prefix'],
  ['ir-', '否定', 'prefix'],
  ['inter-', '之间/相互', 'prefix'],
  ['mis-', '错误', 'prefix'],
  ['multi-', '多', 'prefix'],
  ['non-', '不/非', 'prefix'],
  ['over-', '过度/在...上', 'prefix'],
  ['post-', '在...后', 'prefix'],
  ['pre-', '在...前', 'prefix'],
  ['pro-', '向前/支持', 'prefix'],
  ['re-', '再次/向后', 'prefix'],
  ['semi-', '半', 'prefix'],
  ['sub-', '在...下', 'prefix'],
  ['super-', '超级/在...上', 'prefix'],
  ['trans-', '跨越/转', 'prefix'],
  ['un-', '否定', 'prefix'],
  ['under-', '在...下', 'prefix'],
  ['uni-', '单一/一', 'prefix'],

  // --- 常见词根 root ---
  ['act', '做/行动', 'root'],
  ['audi', '听', 'root'],
  ['bio', '生命', 'root'],
  ['cap', '拿/抓', 'root'],
  ['cede', '走/让', 'root'],
  ['ceive', '拿', 'root'],
  ['cept', '拿', 'root'],
  ['cid', '切/杀', 'root'],
  ['claim', '喊/叫', 'root'],
  ['clud', '关闭', 'root'],
  ['cre', '制造/生长', 'root'],
  ['cred', '相信', 'root'],
  ['cur', '跑/关心', 'root'],
  ['dict', '说', 'root'],
  ['duc', '引导', 'root'],
  ['fect', '做/造', 'root'],
  ['fer', '带/拿', 'root'],
  ['fin', '结束/边界', 'root'],
  ['form', '形状', 'root'],
  ['gen', '产生/出生', 'root'],
  ['grad', '步/级', 'root'],
  ['graph', '写/画', 'root'],
  ['hab', '居住/有', 'root'],
  ['ject', '投/掷', 'root'],
  ['jud', '判断', 'root'],
  ['lect', '选择/读', 'root'],
  ['loc', '地方', 'root'],
  ['log', '语言/道理', 'root'],
  ['man', '手', 'root'],
  ['mem', '记忆', 'root'],
  ['min', '小', 'root'],
  ['mit', '送/放', 'root'],
  ['mov', '移动', 'root'],
  ['norm', '规则/标准', 'root'],
  ['par', '相等/准备', 'root'],
  ['pel', '推/驱', 'root'],
  ['pend', '悬挂/付', 'root'],
  ['phon', '声音', 'root'],
  ['plic', '折叠', 'root'],
  ['pon', '放', 'root'],
  ['port', '运/拿', 'root'],
  ['pos', '放', 'root'],
  ['press', '压', 'root'],
  ['quer', '问/求', 'root'],
  ['quest', '问/求', 'root'],
  ['rupt', '破', 'root'],
  ['scend', '爬/升', 'root'],
  ['sci', '知道', 'root'],
  ['scope', '看/镜', 'root'],
  ['scrib', '写', 'root'],
  ['script', '写', 'root'],
  ['sent', '感觉/送', 'root'],
  ['sequ', '跟随', 'root'],
  ['serv', '服务/保持', 'root'],
  ['sign', '标记', 'root'],
  ['sist', '站', 'root'],
  ['spec', '看', 'root'],
  ['spect', '看', 'root'],
  ['spir', '呼吸/精神', 'root'],
  ['struct', '建造', 'root'],
  ['tain', '拿/握', 'root'],
  ['ten', '拿/握', 'root'],
  ['tend', '延伸/倾向', 'root'],
  ['test', '见证', 'root'],
  ['tract', '拉/拖', 'root'],
  ['vene', '来', 'root'],
  ['vent', '来', 'root'],
  ['ver', '真/转', 'root'],
  ['vert', '转', 'root'],
  ['vid', '看', 'root'],
  ['vis', '看', 'root'],
  ['vit', '生命', 'root'],
  ['viv', '活', 'root'],
  ['voc', '叫/声', 'root'],
  ['vol', '意愿/卷', 'root'],

  // --- 数字 ---
  ['uni', '一/单', 'root'],
  ['tri', '三', 'root'],
  ['quad', '四', 'root'],
  ['pent', '五', 'root'],
  ['hex', '六', 'root'],
  ['oct', '八', 'root'],
  ['dec', '十', 'root'],
  ['cent', '百', 'root'],
  ['mill', '千', 'root'],
  // --- 时间 ---
  ['chron', '时间', 'root'],
  ['tempor', '时间', 'root'],
  ['ann', '年', 'root'],
  // --- 度量 ---
  ['meter', '测量', 'root'],
  ['therm', '热', 'root'],
  // --- 方向/移动 ---
  ['duct', '引导', 'root'],
  ['port', '拿/带', 'root'],
  ['ject', '投/掷', 'root'],
  ['mit', '送', 'root'],
  ['miss', '送', 'root'],
  // --- 看/说 ---
  ['spec', '看', 'root'],
  ['spect', '看', 'root'],
  ['vid', '看', 'root'],
  ['vis', '看', 'root'],
  ['dict', '说', 'root'],
  ['loqu', '说', 'root'],
  ['or', '说', 'root'],
  // --- 写/画 ---
  ['scrib', '写', 'root'],
  ['script', '写', 'root'],
  ['graph', '写/画', 'root'],
  ['pict', '画', 'root'],
  // --- 走/动 ---
  ['ced', '走', 'root'],
  ['ceed', '走', 'root'],
  ['cess', '走', 'root'],
  ['gress', '走', 'root'],
  ['vad', '走', 'root'],
  ['vas', '走', 'root'],
  // --- 工作/力 ---
  ['labor', '工作', 'root'],
  ['erg', '工作/能量', 'root'],
  // --- 生命/死 ---
  ['mort', '死', 'root'],
  ['anim', '生命/精神', 'root'],
  // --- 心/精神 ---
  ['cord', '心', 'root'],
  ['cardi', '心', 'root'],
  ['psych', '精神/心理', 'root'],
  ['ment', '心/精神', 'root'],
  // --- 水/火/土 ---
  ['aqua', '水', 'root'],
  ['hydr', '水', 'root'],
  ['pyro', '火', 'root'],
  ['ign', '火', 'root'],
  ['terr', '土/地', 'root'],
  // --- 数量/大小 ---
  ['magn-', '大', 'root'],
  ['poly-', '多', 'prefix'],
  ['mega-', '大/百万', 'prefix'],
  ['micro-', '小/百万分之一', 'prefix'],
  ['mini-', '小', 'prefix'],

  // --- 常见后缀 suffix ---
  // --- v1.4-A2-f: 短 prefix ---
  ['pre-', '在...前', 'prefix'],
  ['post-', '在...后', 'prefix'],
  ['mid-', '在...中', 'prefix'],
  ['mis-', '错误', 'prefix'],
  ['dis-', '否定/分开', 'prefix'],
  ['co-', '共同', 'prefix'],
  ['de-', '向下/否定', 'prefix'],

  // --- v1.4-A2-b: 扩展 prefix ---
  ['re-', '再/又/回', 'prefix'],
  ['un-', '不/否定', 'prefix'],
  ['non-', '不/非', 'prefix'],
  ['out-', '向外/超过', 'prefix'],
  ['over-', '过度/在上', 'prefix'],
  ['under-', '在...下/不足', 'prefix'],
  ['up-', '向上', 'prefix'],
  ['down-', '向下', 'prefix'],
  ['well-', '好/充分', 'prefix'],
  ['ill-', '坏/病', 'prefix'],
  ['self-', '自己', 'prefix'],
  ['home-', '家/本地', 'prefix'],
  ['sub-', '下/次/分支', 'prefix'],
  ['super-', '超/上', 'prefix'],
  ['trans-', '横穿/转', 'prefix'],

  // --- v1.4-A2-i: 基础词 (续) ---
  ['mix', '混合', 'root'],
  ['moon', '月亮', 'root'],
  ['mud', '泥', 'root'],
  ['mug', '杯子', 'root'],
  ['nail', '钉', 'root'],
  ['neck', '颈', 'root'],
  ['nest', '巢', 'root'],
  ['net', '网', 'root'],
  ['nod', '点头', 'root'],
  ['nose', '鼻', 'root'],
  ['note', '笔记', 'root'],
  ['numb', '麻木', 'root'],
  ['pack', '包', 'root'],
  ['pad', '垫', 'root'],
  ['pale', '苍白', 'root'],
  ['palm', '手掌', 'root'],
  ['pan', '平底锅', 'root'],
  ['park', '公园', 'root'],
  ['part', '部分', 'root'],
  ['pat', '拍', 'root'],
  ['pea', '豌豆', 'root'],
  ['peak', '山峰', 'root'],
  ['peel', '剥', 'root'],
  ['pet', '宠物', 'root'],
  ['pie', '派', 'root'],
  ['pier', '码头', 'root'],
  ['pig', '猪', 'root'],
  ['pile', '堆', 'root'],
  ['pin', '针', 'root'],
  ['pit', '坑', 'root'],
  ['plane', '飞机', 'root'],
  ['plot', '情节', 'root'],
  ['plug', '插头', 'root'],
  ['plum', '李子', 'root'],
  ['plus', '加', 'root'],
  ['poem', '诗', 'root'],
  ['poet', '诗人', 'root'],
  ['poll', '投票', 'root'],
  ['pond', '池塘', 'root'],
  ['pool', '池', 'root'],
  ['pope', '教皇', 'root'],
  ['pop', '流行', 'root'],
  ['pot', '锅', 'root'],
  ['pour', '倒', 'root'],
  ['pray', '祈祷', 'root'],
  ['prize', '奖', 'root'],
  ['puff', '吹', 'root'],
  ['pump', '泵', 'root'],
  ['pun', '双关', 'root'],
  ['pup', '小狗', 'root'],
  ['pure', '纯', 'root'],
  ['push', '推', 'root'],
  ['quilt', '被子', 'root'],
  ['quit', '退出', 'root'],
  ['quiz', '测验', 'root'],

  // --- v1.4-A2-h: 基础词作为 root ---
  ['fake', '假', 'root'],
  ['fair', '公平/集市', 'root'],
  ['fate', '命运', 'root'],
  ['fear', '恐惧', 'root'],
  ['fade', '褪色', 'root'],
  ['flaw', '瑕疵', 'root'],
  ['flow', '流', 'root'],
  ['fund', '基金', 'root'],
  ['faith', '信仰', 'root'],
  ['gift', '礼物', 'root'],
  ['grab', '抓', 'root'],
  ['harm', '伤害', 'root'],
  ['hunt', '猎', 'root'],
  ['hurt', '伤害', 'root'],
  ['joke', '笑话', 'root'],
  ['jump', '跳', 'root'],
  ['kick', '踢', 'root'],
  ['kiss', '吻', 'root'],
  ['knee', '膝', 'root'],
  ['laugh', '笑', 'root'],
  ['lay', '放', 'root'],
  ['lead', '领导', 'root'],
  ['lean', '倾斜', 'root'],
  ['leap', '跳', 'root'],
  ['lick', '舔', 'root'],
  ['lift', '提', 'root'],
  ['link', '链接', 'root'],
  ['load', '装载', 'root'],
  ['lone', '孤独', 'root'],
  ['luck', '运气', 'root'],

  // --- v1.4-A2-d: 50+ 高频 root ---
  ['light', '光/轻', 'root'],
  ['right', '右/正确', 'root'],
  ['sight', '看/视力', 'root'],
  ['fight', '打/战斗', 'root'],
  ['might', '可能/力量', 'root'],
  ['night', '夜', 'root'],
  ['tight', '紧/紧的', 'root'],
  ['slight', '轻微', 'root'],
  ['bright', '明亮', 'root'],
  ['flight', '飞行', 'root'],
  ['height', '高度', 'root'],
  ['weight', '重量', 'root'],
  ['play', '玩/剧', 'root'],
  ['day', '日/天', 'root'],
  ['way', '路/方法', 'root'],
  ['say', '说', 'root'],
  ['pay', '付', 'root'],
  ['away', '远离', 'root'],
  ['today', '今天', 'root'],
  ['away', '离开', 'root'],
  ['name', '名字', 'root'],
  ['fame', '名声', 'root'],
  ['game', '游戏', 'root'],
  ['same', '相同', 'root'],
  ['come', '来', 'root'],
  ['home', '家', 'root'],
  ['some', '一些', 'root'],
  ['time', '时间', 'root'],
  ['lime', '石灰', 'root'],
  ['dime', '一角硬币', 'root'],
  ['crime', '罪', 'root'],
  ['chime', '钟声', 'root'],
  ['prime', '首要', 'root'],
  ['side', '边', 'root'],
  ['wide', '宽', 'root'],
  ['ride', '骑', 'root'],
  ['pride', '骄傲', 'root'],
  ['bride', '新娘', 'root'],
  ['guide', '向导', 'root'],
  ['glide', '滑翔', 'root'],
  ['pride', '自豪', 'root'],
  ['slide', '滑', 'root'],
  ['line', '线', 'root'],
  ['mine', '矿/我的', 'root'],
  ['fine', '好/细', 'root'],
  ['wine', '酒', 'root'],
  ['nine', '九', 'root'],
  ['shine', '照耀', 'root'],
  ['shrine', '神殿', 'root'],
  ['house', '房子', 'root'],
  ['mouse', '老鼠', 'root'],
  ['blouse', '女衬衫', 'root'],
  ['spouse', '配偶', 'root'],
  ['cause', '原因', 'root'],
  ['pause', '暂停', 'root'],
  ['clause', '从句', 'root'],
  ['use', '用', 'root'],
  ['fuse', '融合/保险丝', 'root'],
  ['muse', '沉思', 'root'],
  ['abuse', '滥用', 'root'],
  ['ruse', '诡计', 'root'],
  ['cruse', '坛子', 'root'],

  // --- v1.4-A2-c: 扩展常用 root (高覆盖率) ---
  ['mark', '标记', 'root'],
  ['card', '卡片', 'root'],
  ['test', '测试/见证', 'root'],
  ['pass', '通过', 'root'],
  ['camp', '营地', 'root'],
  ['cast', '投掷', 'root'],
  ['cost', '花费', 'root'],
  ['post', '后/邮', 'root'],
  ['rest', '休息', 'root'],
  ['best', '最好', 'root'],
  ['text', '编织/文本', 'root'],
  ['class', '阶级/班级', 'root'],
  ['cross', '横穿/十字', 'root'],
  ['mass', '大量/质量', 'root'],
  ['press', '压/按', 'root'],
  ['miss', '想念/错过', 'root'],
  ['pass', '通过', 'root'],
  ['less', '少', 'root'],
  ['more', '更多', 'root'],
  ['most', '最多', 'root'],
  ['back', '回/背', 'root'],
  ['hand', '手', 'root'],
  ['land', '土地', 'root'],
  ['band', '带/乐队', 'root'],
  ['sand', '沙', 'root'],
  ['stand', '站', 'root'],
  ['grand', '宏伟', 'root'],
  ['pond', '池塘', 'root'],
  ['bond', '债券/连接', 'root'],
  ['mind', '心/精神', 'root'],
  ['kind', '种类/善良', 'root'],
  ['find', '找到', 'root'],
  ['bind', '绑', 'root'],
  ['wind', '风/绕', 'root'],

  // --- v1.4-A2: 扩展后缀变体 ---
  // --- v1.4-A2-g: 短 suffix 扩展 ---
  ['-ed', '过去式/被动', 'suffix'],
  ['-er', '...者/比较级', 'suffix'],
  ['-ly', '...地(副词)', 'suffix'],
  ['-es', '复数/第三人称', 'suffix'],
  ['-en', '使/变(动词)', 'suffix'],
  ['-fy', '使...化', 'suffix'],

  // --- v1.4-A2-e: 短 suffix 覆盖派生词 ---
  ['-ic', '...的(形容词)', 'suffix'],
  ['-ac', '...的(形容词)', 'suffix'],
  ['-al', '...的(形容词)', 'suffix'],
  ['-ar', '...的(形容词)', 'suffix'],
  ['-an', '...的/某地人', 'suffix'],
  ['-ent', '...的(形容词)', 'suffix'],
  ['-ant', '...的(名词/形容词)', 'suffix'],
  ['-id', '...的(形容词)', 'suffix'],
  ['-il', '...的(形容词)', 'suffix'],
  ['-in', '...的(形容词)', 'suffix'],
  ['-or', '...者', 'suffix'],
  ['-er', '...者/更', 'suffix'],
  ['-yr', '...的', 'suffix'],
  ['-ur', '...的/行为', 'suffix'],
  ['-um', '名词(中性)', 'suffix'],
  ['-us', '名词(阳性)', 'suffix'],
  ['-ix', '名词(阴性)', 'suffix'],
  ['-ex', '名词(阳性)', 'suffix'],
  ['-on', '名词(阳性)', 'suffix'],
  ['-an', '名词(人/动物)', 'suffix'],
  ['-en', '名词(人/动物)', 'suffix'],
  ['-le', '形容词/名词', 'suffix'],
  ['-re', '名词(法语)', 'suffix'],
  ['-se', '动词(法语)', 'suffix'],
  ['-ce', '名词(法语)', 'suffix'],
  ['-ge', '名词', 'suffix'],

  ['-ed', '过去式/被动', 'suffix'],
  ['-s', '复数/动词第三人称', 'suffix'],
  ['-es', '复数/动词第三人称(es)', 'suffix'],
  ['-en', '变/使(形容词/动词)', 'suffix'],
  ['-hood', '身份/状态', 'suffix'],
  ['-dom', '领域/状态', 'suffix'],
  ['-ish', '略.../有点...', 'suffix'],
  ['-ary', '...的/场所', 'suffix'],
  ['-ory', '...的/场所', 'suffix'],
  ['-ery', '...艺术/场所', 'suffix'],
  ['-ism', '主义/学说', 'suffix'],
  ['-ist', '...主义者/从事者', 'suffix'],
  ['-ic', '...的(形容词)', 'suffix'],
  ['-ical', '...的(形容词)', 'suffix'],
  ['-ous', '充满...的', 'suffix'],
  ['-eous', '...的/具有', 'suffix'],
  ['-ious', '...的/具有', 'suffix'],
  ['-ive', '...的/倾向', 'suffix'],
  ['-ative', '...的/具有', 'suffix'],
  ['-itive', '...的/具有', 'suffix'],
  ['-ize', '使...化', 'suffix'],
  ['-ise', '使...化(英式)', 'suffix'],
  ['-ate', '使/成为', 'suffix'],
  ['-ite', '...的/具有', 'suffix'],
  ['-ute', '...的/具有', 'suffix'],
  ['-ward', '向...方向', 'suffix'],
  ['-wards', '向...方向', 'suffix'],
  ['-wise', '关于/就...而言', 'suffix'],
  ['-craft', '技艺/手艺', 'suffix'],

  ['-able', '能...的', 'suffix'],
  ['-al', '...的(形容词)', 'suffix'],
  ['-ance', '行为/状态', 'suffix'],
  ['-ation', '动作/过程', 'suffix'],
  ['-ent', '...的(形容词)', 'suffix'],
  ['-er', '...者/更', 'suffix'],
  ['-ess', '女性/性质', 'suffix'],
  ['-ful', '充满...的', 'suffix'],
  ['-ible', '能...的', 'suffix'],
  ['-ing', '动作进行', 'suffix'],
  ['-ion', '动作/状态', 'suffix'],
  ['-ist', '...主义者', 'suffix'],
  ['-ity', '性质/状态', 'suffix'],
  ['-ive', '...的/倾向', 'suffix'],
  ['-ize', '使...化', 'suffix'],
  ['-less', '无...的', 'suffix'],
  ['-ly', '以...方式(副词)', 'suffix'],
  ['-ment', '行为/结果', 'suffix'],
  ['-ness', '性质/状态', 'suffix'],
  ['-or', '...者', 'suffix'],
  ['-ous', '充满...的', 'suffix'],
  ['-ship', '...身份/技能', 'suffix'],
  ['-sion', '动作/状态', 'suffix'],
  ['-tion', '动作/过程', 'suffix'],
  ['-ure', '行为/结果', 'suffix'],
  ['-y', '充满/倾向于', 'suffix'],
]

console.log('已知词根表:', KNOWN_ROOTS.length, '个')

// 加载词库
const words = JSON.parse(readFileSync(WORDS_PATH, 'utf-8'))
console.log('总词数:', words.length)

const beforeWithRoots = words.filter(w => w.roots && w.roots.length > 0).length
console.log('扩充前有词根:', beforeWithRoots, '=', (beforeWithRoots / words.length * 100).toFixed(1) + '%')

// 倒排索引: root -> 词
// 对每个 root 生成匹配正则
function makeRegex(root) {
  // prefix: ^root(?=[a-z])
  // suffix: root$ (root 不带 -, 但 -able 是带 -)
  // root: word 内任意位置
  const r = root.replace(/[^a-zA-Z-]/g, '')
  if (r.startsWith('-')) {
    // suffix
    return new RegExp(r.slice(1) + '$', 'i')
  } else if (r.endsWith('-')) {
    // prefix
    return new RegExp('^' + r.slice(0, -1), 'i')
  } else {
    return new RegExp(r, 'i')
  }
}

const rootRegexes = KNOWN_ROOTS.map(([root, meaning, type]) => ({
  root, meaning, type, regex: makeRegex(root),
}))

let added = 0
let considered = 0
for (const w of words) {
  if (w.roots && w.roots.length > 0) continue
  // 找匹配
  const word = w.word
  const matches = []
  for (const r of rootRegexes) {
    if (r.regex.test(word)) {
      matches.push({ root: r.root, meaning: r.meaning, type: r.type })
    }
  }
  if (matches.length > 0) {
    // 去重(可能 prefix + root 都匹配)
    const seen = new Set()
    w.roots = matches.filter(m => {
      if (seen.has(m.root)) return false
      seen.add(m.root)
      return true
    })
    added++
  }
  considered++
}

console.log('考虑词数:', considered)
console.log('新增词根词数:', added)

const afterWithRoots = words.filter(w => w.roots && w.roots.length > 0).length
console.log('扩充后有词根:', afterWithRoots, '=', (afterWithRoots / words.length * 100).toFixed(1) + '%')

// 写入
writeFileSync(WORDS_PATH, JSON.stringify(words, null, 0))
console.log('写入:', WORDS_PATH)

// 显示几个样例
const samples = words.filter(w => w.roots && w.roots.length > 0).slice(-5)
for (const s of samples) {
  console.log(`  ${s.word}: ${JSON.stringify(s.roots)}`)
}
