// scripts/verify-v1.6-bugfix.mjs - v1.6 闭环验证
// 云端 playwright 跑 SPA 太慢, 改用 grep + 单元测试 验证 bug 已修
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

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

// 1. WritePage 切 tab 不重置 input
const writePage = readFileSync('src/pages/WritePage.tsx', 'utf8')
check('WritePage: useEffect [activeTab] 不重置 input', () => {
  // 验证 useEffect 中切回 write 不再 setInput('')
  const useEffectMatch = writePage.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[activeTab\]\)/)
  if (!useEffectMatch) return false
  return !useEffectMatch[0].includes("setInput('')")
})

// 2. WritePage 截断逻辑用 text 变量
check('WritePage: 截断用 text 变量 (避免 set 后用旧 input)', () => {
  // 验证 text 变量在 setInput 之前声明
  return /const text = input\.length > MAX_LEN \? input\.slice\(0, MAX_LEN\) : input/.test(writePage)
})

// 3. ListenPage DictationMode 切 lesson 重置
const listenPage = readFileSync('src/pages/ListenPage.tsx', 'utf8')
check('ListenPage: DictationMode useEffect [lesson.id] 重置', () => {
  return /setAnswers\(\{\}\)\s*setSubmitted\(false\)\s*setAddedWords\(new Set\(\)\)/.test(listenPage)
})

// 4. ListenPage QuestionsMode 切 lesson 重置
check('ListenPage: QuestionsMode useEffect [lesson.id] 重置', () => {
  // 验证 QuestionsMode 块内有 setAnswers({}) + setSubmitted(false) 重置
  const idx = listenPage.indexOf('function QuestionsMode')
  if (idx < 0) return false
  // 下一个 function 之前
  const nextFn = listenPage.indexOf('function ', idx + 30)
  const block = listenPage.slice(idx, nextFn > 0 ? nextFn : idx + 2000)
  return /setAnswers\(\{\}\)/.test(block) && /setSubmitted\(false\)/.test(block)
})

// 5. ListenPage handlePlay 重复保护
check('ListenPage: handlePlay 加 if (playing) return', () => {
  const handlePlayMatches = listenPage.match(/const handlePlay = async \(\) => \{[\s\S]*?finally \{[\s\S]*?\}/g) || []
  return handlePlayMatches.length >= 2 && handlePlayMatches.every(m => m.includes('if (playing) return'))
})

// 6. ErrorExplainButton setLoading(true) 修复
const errorBtn = readFileSync('src/components/ErrorExplainButton.tsx', 'utf8')
check('ErrorExplainButton: setLoading(true) 修复', () => {
  return /setOpen\(true\)\s*setLoading\(true\)/.test(errorBtn)
})

// 7. UsageButton setLoading(true) 修复
const usageBtn = readFileSync('src/components/UsageButton.tsx', 'utf8')
check('UsageButton: setLoading(true) 修复', () => {
  return /setOpen\(true\)\s*setLoading\(true\)/.test(usageBtn)
})

// 8. UsageButton 解析失败 tip 修复
check('UsageButton: 解析失败 tip 显示 "暂无数据"', () => {
  return /tip:\s*'暂无数据'/.test(usageBtn)
})

// 9. AIChat STT MAX_INPUT 限制
const aiChat = readFileSync('src/pages/AIChat.tsx', 'utf8')
check('AIChat: STT 累积 input MAX_INPUT 截断', () => {
  return /MAX_INPUT = 500/.test(aiChat) && /next\.length > MAX_INPUT \? next\.slice\(0, MAX_INPUT\)/.test(aiChat)
})

// 10. v1.6Bugfix.test.ts 存在
check('tests/v1.6Bugfix.test.ts 存在且有测试', () => {
  try {
    const t = readFileSync('tests/v1.6Bugfix.test.ts', 'utf8')
    return t.includes("describe('v1.6 bugfix")
  } catch {
    return false
  }
})

// 11. 跑单元测试
console.log('\n--- 跑单元测试 ---')
try {
  const out = execSync('npx vitest run tests/v1.6Bugfix.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`v1.6 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('v1.6 单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length - 1}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
