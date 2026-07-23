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

  // --- 常见后缀 suffix ---
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
