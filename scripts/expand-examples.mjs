// 例句扩充 v2: 严格只接受包含目标词的例句
// 优先级: 含目标词 > 包含同根词 > 含同义词
import { readFileSync, writeFileSync } from 'fs'

const INPUT = 'public/data/words.json'
const OUTPUT = 'public/data/words.json'
const MIN_TARGET = 3
const MAX_TARGET = 5

const words = JSON.parse(readFileSync(INPUT, 'utf-8'))

// 1. 倒排索引: 含特定词的例句
// word -> [examples...]
const indexByWord = new Map()
for (const w of words) {
  for (const ex of (w.examples || [])) {
    const en = ex.en.toLowerCase()
    // 找例句里所有词
    const tokens = en.split(/[^a-z']+/).filter(t => t.length >= 3)
    for (const t of tokens) {
      if (!indexByWord.has(t)) indexByWord.set(t, [])
      indexByWord.get(t).push({ en: ex.en, zh: ex.zh, scene: ex.scene })
    }
  }
}

console.log(`例句倒排索引: ${indexByWord.size} 个不同的词`)

// 2. 为每个词补充
let addedCount = 0
let coverageFixed = 0
const origStats = { 0: 0, 1: 0, 2: 0, '3+': 0 }
const newStats = { 0: 0, 1: 0, 2: 0, '3+': 0 }

// 简单英文词干提取(去 s/es/ed/ing/ly)
function stem(w) {
  if (w.length <= 3) return w
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.endsWith('es')) return w.slice(0, -2)
  if (w.endsWith('ed')) return w.slice(0, -2)
  if (w.endsWith('ing')) return w.slice(0, -3)
  if (w.endsWith('ly')) return w.slice(0, -2)
  if (w.endsWith('s')) return w.slice(0, -1)
  return w
}

for (const w of words) {
  const n = (w.examples || []).length
  if (n === 0) origStats[0]++
  else if (n === 1) origStats[1]++
  else if (n === 2) origStats[2]++
  else origStats['3+']++

  if (n >= MAX_TARGET) {
    // 已经够,只统计
    const newN = w.examples.length
    if (newN === 0) newStats[0]++
    else if (newN === 1) newStats[1]++
    else if (newN === 2) newStats[2]++
    else newStats['3+']++
    continue
  }

  const ownKeys = new Set((w.examples || []).map(ex => ex.en.toLowerCase().trim()))

  // 候选 1: 包含原词
  const exact = (indexByWord.get(w.word.toLowerCase()) || [])
    .filter(ex => !ownKeys.has(ex.en.toLowerCase().trim()))

  // 候选 2: 包含原词的翻译关键词(中文)— 需要 inverted index of zh
  // 简化: 用翻译里的关键词去匹配 zh
  const translations = (w.translations || []).map(t => t.toLowerCase().trim())
  const translated = (w.examples || []).map(e => e.zh.toLowerCase())

  // 候选 3: 包含 stem 后的词
  const stemmed = stem(w.word.toLowerCase())
  const stemMatches = (indexByWord.get(stemmed) || [])
    .filter(ex => !ownKeys.has(ex.en.toLowerCase().trim()) && !exact.some(e => e.en === ex.en))

  // 合并,优先 exact > stem
  const candidates = [...shuffle(exact), ...shuffle(stemMatches)]

  const need = Math.max(0, MIN_TARGET - n)
  const picked = candidates.slice(0, need)
  w.examples = [...(w.examples || []), ...picked]
  addedCount += picked.length
  if (n === 0 && picked.length > 0) coverageFixed++

  const newN = w.examples.length
  if (newN === 0) newStats[0]++
  else if (newN === 1) newStats[1]++
  else if (newN === 2) newStats[2]++
  else newStats['3+']++
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

console.log('\n=== 原数据 ===')
console.log(`  0 句: ${origStats[0]}    1 句: ${origStats[1]}    2 句: ${origStats[2]}    3+ 句: ${origStats['3+']}`)
console.log('\n=== 补充后 ===')
console.log(`  0 句: ${newStats[0]}    1 句: ${newStats[1]}    2 句: ${newStats[2]}    3+ 句: ${newStats['3+']}`)
console.log(`\n新增例句: ${addedCount}`)
console.log(`从 0 句 → 3+ 句: ${coverageFixed} 个词`)

writeFileSync(OUTPUT, JSON.stringify(words, null, 2))
console.log(`\n✅ 写入 ${OUTPUT}`)
