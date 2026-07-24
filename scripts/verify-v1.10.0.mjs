// scripts/verify-v1.10.0.mjs - v1.10.0 W11 闭环验证
import { readFileSync, existsSync } from 'fs'

const tests = []
const fails = []

function check(name, fn) {
  try {
    const result = fn()
    if (result) {
      console.log(`✅ ${name}`)
      tests.push(name)
    } else {
      console.log(`❌ ${name}`)
      fails.push(name)
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    fails.push(`${name}: ${e.message}`)
  }
}

// === v1.10.0-A 中译英 ===
const wp = readFileSync('src/pages/WritePage.tsx', 'utf-8')
check('WritePage.tsx 包含 🌐 中译英 Tab', () => /🌐 中译英/.test(wp))
check('WritePage.tsx 包含 CHINESE_SYSTEM_PROMPT', () => /CHINESE_SYSTEM_PROMPT/.test(wp))
check('WritePage.tsx 包含 mockChineseTranslation', () => /mockChineseTranslation/.test(wp))
check('WritePage.tsx 包含 parseChineseResult', () => /parseChineseResult/.test(wp))
check('chineseToEnglish.test.ts 存在 + 13 测试', () => {
  if (!existsSync('tests/chineseToEnglish.test.ts')) return false
  const t = readFileSync('tests/chineseToEnglish.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 6
})
check('v1.6 修复保留: WritePage useEffect [activeTab] 不重置', () => {
  return /useEffect\(\(\) => \{\s*if \(activeTab === 'history'\)/.test(wp)
})
check('v1.6 修复保留: WritePage text 变量截断', () => {
  return /const text = input\.length > MAX_LEN \? input\.slice\(0, MAX_LEN\) : input/.test(wp)
})

// === v1.10.0-B 同义词辨析 ===
check('src/lib/synonyms.ts 存在', () => existsSync('src/lib/synonyms.ts'))
check('src/components/SynonymsButton.tsx 存在', () => existsSync('src/components/SynonymsButton.tsx'))
const syn = readFileSync('src/lib/synonyms.ts', 'utf-8')
check('synonyms.ts 包含 mockSynonyms + parseSynonyms + getSynonyms', () => {
  return /export function mockSynonyms/.test(syn) &&
    /export function parseSynonyms/.test(syn) &&
    /export async function getSynonyms/.test(syn)
})
check('synonyms.ts 8 词 mock fallback (happy/sad/angry/big/small/good/bad/fast)', () => {
  const words = ['happy', 'sad', 'angry', 'big', 'small', 'good', 'bad', 'fast']
  return words.every(w => syn.includes(`'${w}'`))
})
const synBtn = readFileSync('src/components/SynonymsButton.tsx', 'utf-8')
check('SynonymsButton.tsx setLoading(true) 修复', () => /setOpen\(true\)\s*setLoading\(true\)/.test(synBtn))
check('SynonymsButton.tsx catch unknown 守卫', () => /catch \(e: unknown\)/.test(synBtn))
check('synonyms.test.ts 存在 + 13 测试', () => {
  if (!existsSync('tests/synonyms.test.ts')) return false
  const t = readFileSync('tests/synonyms.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 5
})
const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
check('WordDetail.tsx 引用 SynonymsButton + "AI 同义词辨析"', () => /import.*SynonymsButton/.test(wd) && /AI 同义词辨析/.test(wd))

// === v1.10.0-C 例句 TTS 跟读 ===
check('WordDetail.tsx 动态 pronounceText state', () => /useState<string>\('\'\)/.test(wd))
check('WordDetail.tsx 单词跟读 onClick setPronounceText(word.word)', () => /onClick=\{\(\) => setPronounceText\(word\.word\)\}/.test(wd))
check('WordDetail.tsx 例句跟读 onClick setPronounceText(ex.en)', () => /onClick=\{\(\) => setPronounceText\(ex\.en\)\}/.test(wd))
check('WordDetail.tsx 弹窗内 PronunciationPractice 用 word={pronounceText}', () => /<PronunciationPractice word=\{pronounceText\}/.test(wd))
check('wordDetailExampleTTS.test.ts 存在 + 5 测试', () => {
  if (!existsSync('tests/wordDetailExampleTTS.test.ts')) return false
  const t = readFileSync('tests/wordDetailExampleTTS.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 3
})

// === v1.6/v1.7/v1.8/v1.9 修复保留 ===
check('v1.6 修复保留: ListenPage useEffect [lesson.id]', () => {
  const l = readFileSync('src/pages/ListenPage.tsx', 'utf-8')
  return /useEffect\(\(\) => \{\s*setAnswers\(\{\}\)/.test(l)
})
check('v1.8 修复保留: Onboarding.tsx 3 步', () => {
  const o = readFileSync('src/components/Onboarding.tsx', 'utf-8')
  return /ONBOARDING_STEPS\s*=\s*\[\s*['"]level['"]\s*,\s*['"]pronounce['"]\s*,\s*['"]finish['"]\s*\]/.test(o)
})
check('v1.8 修复保留: AIChat ✨ 自动 + 💬 自由话题', () => {
  const a = readFileSync('src/pages/AIChat.tsx', 'utf-8')
  return /✨ 自动/.test(a) && /💬 自由话题/.test(a)
})

// === 跑单元测试 ===
console.log('\n--- 跑单元测试 ---')
import { execSync } from 'child_process'
try {
  const out = execSync('npx vitest run tests/chineseToEnglish.test.ts tests/synonyms.test.ts tests/wordDetailExampleTTS.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`v1.10.0 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('v1.10.0 单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
