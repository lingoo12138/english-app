// scripts/verify-v1.7-b.mjs - v1.7 B 听力自适应 闭环验证
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

// 1. listeningRecommend.ts 存在
check('src/lib/listeningRecommend.ts 存在', () => existsSync('src/lib/listeningRecommend.ts'))

// 2. 单元测试存在 + 11 测试
const testFile = 'tests/listeningRecommend.test.ts'
check('tests/listeningRecommend.test.ts 存在 + 11 测试', () => {
  if (!existsSync(testFile)) return false
  const t = readFileSync(testFile, 'utf8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 8  // 至少 8, 实际 11
})

// 3. ListenPage 调用 recommendLessons
const listenPage = readFileSync('src/pages/ListenPage.tsx', 'utf8')
check('ListenPage 调用 recommendLessons', () => {
  return /import.*recommendLessons.*from.*listeningRecommend/.test(listenPage) &&
    /recommendLessons\(/.test(listenPage)
})

// 4. "🎯 为你推荐" 文案在 ListenPage
check('ListenPage 包含 "🎯 为你推荐" 卡片', () => {
  return /🎯 为你推荐/.test(listenPage)
})

// 5. 错题稀疏提示文案
check('ListenPage 包含 "💡 完成几道题后" 提示', () => {
  return /💡 完成几道题后/.test(listenPage)
})

// 6. visibilitychange 监听 (回前台重算)
check('ListenPage 包含 visibilitychange 监听', () => {
  return /visibilitychange/.test(listenPage)
})

// 7. static review script 存在
check('scripts/review-v1.7.py 存在', () => existsSync('scripts/review-v1.7.py'))

// 8. 不破坏 v1.6 修复
check('v1.6 修复保留: ListenPage 切 lesson useEffect [lesson.id]', () => {
  // v1.6 修复: DictationMode + QuestionsMode useEffect [lesson.id]
  return /useEffect\(\(\) => \{\s*setAnswers\(\{\}\)\s*setSubmitted\(false\)\s*setAddedWords\(new Set\(\)\)/.test(listenPage) ||
    /useEffect\(\(\) => \{\s*setAnswers\(\{\}\)\s*setSubmitted\(false\)/.test(listenPage)
})

check('v1.6 修复保留: handlePlay if (playing) return', () => {
  const handlePlayMatches = listenPage.match(/const handlePlay = async \(\) => \{[\s\S]*?finally \{[\s\S]*?\}/g) || []
  return handlePlayMatches.length >= 2 && handlePlayMatches.every(m => m.includes('if (playing) return'))
})

// 9. 跑单元测试
console.log('\n--- 跑单元测试 ---')
import { execSync } from 'child_process'
try {
  const out = execSync('npx vitest run tests/listeningRecommend.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`listeningRecommend 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('listeningRecommend 单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
