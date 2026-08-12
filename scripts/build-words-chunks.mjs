// scripts/build-words-chunks.mjs — W145 LCP 优化
// 拆 public/data/words.json (6.3MB) → words-index.json (轻量级 metadata) + 26 个按字母 chunks
// 目的: LCP 根治 — 词库按需加载, DailyWordCard 只需 fetch 1 个 chunk (~240KB) 而非全量 6.3MB
//
// 业务:
//  - words.json: 5423 词 / 25 个字母 (无 x) / 6.3MB JSON
//  - 拆后: words-index.json (~200KB, 5423 行 {id, word, level, first_translation}) + 25 个 words-{letter}.json (平均 240KB/chunk)
//
// build 时机: vite build hook (在 public/data 复制前/后均可, 这里放 prebuild 阶段)
// 运行: `node scripts/build-words-chunks.mjs`
//   或在 package.json: "prebuild": "node scripts/build-words-chunks.mjs"

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DATA = resolve(__dirname, '../public/data')
const WORDS_JSON = resolve(PUBLIC_DATA, 'words.json')
const WORDS_INDEX = resolve(PUBLIC_DATA, 'words-index.json')

/** 单词按首字母分桶 (a-z 25 字母, 无 x) */
function bucketByLetter(words) {
  const buckets = {}
  for (const w of words) {
    const c = (w.word[0] || '').toLowerCase()
    if (!/^[a-z]$/.test(c)) {
      console.warn(`[build-words-chunks] 跳过非字母开头: ${w.id} = ${w.word}`)
      continue
    }
    if (!buckets[c]) buckets[c] = []
    buckets[c].push(w)
  }
  return buckets
}

/** 轻量级 index: 仅 {id, word, level, first_letter, first_translation}
 *  - id: 用于 getWord(id) 推 letter chunk
 *  - word: 搜索/列表显示
 *  - level: 等级筛选
 *  - first_letter: 直接定位 chunk, 不必再算 word[0]
 *  - first_translation: 列表/搜索预览 (搜索命中)
 * 估算: 5423 行 × ~80B = ~430KB (vs 6.3MB 全量, 降 93%)
 */
function buildIndex(words) {
  return words.map(w => ({
    id: w.id,
    word: w.word,
    level: w.level,
    first_letter: (w.word[0] || '').toLowerCase(),
    first_translation: (w.translations && w.translations[0]) || '',
  }))
}

async function main() {
  if (!existsSync(WORDS_JSON)) {
    console.error(`[build-words-chunks] ❌ 未找到 ${WORDS_JSON}`)
    process.exit(1)
  }

  const t0 = Date.now()
  const raw = readFileSync(WORDS_JSON, 'utf-8')
  const sizeSrc = statSync(WORDS_JSON).size
  console.log(`[build-words-chunks] 读取 ${WORDS_JSON} (${(sizeSrc / 1024 / 1024).toFixed(2)} MB)`)

  let words
  try {
    words = JSON.parse(raw)
  } catch (e) {
    console.error(`[build-words-chunks] ❌ JSON parse failed: ${e.message}`)
    process.exit(1)
  }

  if (!Array.isArray(words) || words.length === 0) {
    console.error(`[build-words-chunks] ❌ words.json 不是非空数组`)
    process.exit(1)
  }

  console.log(`[build-words-chunks] 解析 ${words.length} 词`)

  // 1. 写 index
  const index = buildIndex(words)
  writeFileSync(WORDS_INDEX, JSON.stringify(index), 'utf-8')
  const sizeIndex = statSync(WORDS_INDEX).size
  console.log(`[build-words-chunks] ✓ 写 ${WORDS_INDEX} (${(sizeIndex / 1024).toFixed(0)} KB, ${index.length} 行)`)

  // 2. 按字母分桶写 chunks
  const buckets = bucketByLetter(words)
  const letters = Object.keys(buckets).sort()
  let totalChunkSize = 0
  for (const letter of letters) {
    const chunkPath = resolve(PUBLIC_DATA, `words-${letter}.json`)
    const chunkData = buckets[letter]
    writeFileSync(chunkPath, JSON.stringify(chunkData), 'utf-8')
    const chunkSize = statSync(chunkPath).size
    totalChunkSize += chunkSize
    console.log(`[build-words-chunks] ✓ 写 words-${letter}.json (${(chunkSize / 1024).toFixed(0)} KB, ${chunkData.length} 词)`)
  }

  const t1 = Date.now()
  console.log(`[build-words-chunks] === 完成 ===`)
  console.log(`  - 源: ${(sizeSrc / 1024 / 1024).toFixed(2)} MB / ${words.length} 词`)
  console.log(`  - index: ${(sizeIndex / 1024).toFixed(0)} KB / ${index.length} 行`)
  console.log(`  - chunks: ${letters.length} 个 / 总 ${(totalChunkSize / 1024 / 1024).toFixed(2)} MB / 平均 ${(totalChunkSize / letters.length / 1024).toFixed(0)} KB/chunk`)
  console.log(`  - 总输出: ${((sizeIndex + totalChunkSize) / 1024 / 1024).toFixed(2)} MB (略增 due to JSON 重复 keys, 但单次 fetch 降 96%)`)
  console.log(`  - 耗时: ${t1 - t0} ms`)
}

main().catch(e => {
  console.error('[build-words-chunks] ❌ 异常:', e)
  process.exit(1)
})
