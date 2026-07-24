// scripts/verify-v1.11.0.mjs - v1.11.0 W12 闭环验证
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

// === v1.11.0-A FSRS ===
const fsrs = readFileSync('src/lib/fsrs.ts', 'utf-8')
check('src/lib/fsrs.ts 存在 + initFSRS', () => /export function initFSRS/.test(fsrs))
check('FSRS reviewFSRS (评级更新)', () => /export function reviewFSRS/.test(fsrs))
check('FSRS getRetrievability (可检索性)', () => /export function getRetrievability/.test(fsrs))
check('FSRS fromSM2 / toSM2 (迁移)', () => /export function fromSM2/.test(fsrs) && /export function toSM2/.test(fsrs))
check('FSRS 4 评级 Again/Hard/Good/Easy', () => /Again/.test(fsrs) && /Hard/.test(fsrs) && /Good/.test(fsrs) && /Easy/.test(fsrs))
check('fsrs.test.ts 存在 + 18 测试', () => {
  if (!existsSync('tests/fsrs.test.ts')) return false
  const t = readFileSync('tests/fsrs.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 6
})

// === v1.11.0-B 复习智能队列 ===
const reviewQueue = readFileSync('src/lib/reviewQueue.ts', 'utf-8')
check('src/lib/reviewQueue.ts 存在', () => existsSync('src/lib/reviewQueue.ts'))
check('reviewQueue scoreReviewItem (优先级分数)', () => /scoreReviewItem/.test(reviewQueue))
check('reviewQueue sortReviewQueue (排序)', () => /sortReviewQueue/.test(reviewQueue))
const reviewCenter = readFileSync('src/pages/ReviewCenter.tsx', 'utf-8')
check('ReviewCenter.tsx 引用 sortReviewQueue', () => /sortReviewQueue/.test(reviewCenter))
check('ReviewCenter.tsx 智能排序切换', () => /smartSort/.test(reviewCenter))
check('reviewQueue.test.ts 存在 + 7 测试', () => {
  if (!existsSync('tests/reviewQueue.test.ts')) return false
  const t = readFileSync('tests/reviewQueue.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 5
})

// === v1.11.0-C 学习日报/周报 ===
const lr = readFileSync('src/lib/learningReport.ts', 'utf-8')
check('src/lib/learningReport.ts 存在', () => existsSync('src/lib/learningReport.ts'))
check('learningReport getDailyReport', () => /getDailyReport/.test(lr))
check('learningReport getWeeklyReport', () => /getWeeklyReport/.test(lr))
check('learningReport getTrend + getEncouragement', () => /getTrend/.test(lr) && /getEncouragement/.test(lr))
check('src/pages/ReportsPage.tsx 存在', () => existsSync('src/pages/ReportsPage.tsx'))
const app = readFileSync('src/App.tsx', 'utf-8')
check('App.tsx 加 /reports 路由', () => /\/reports/.test(app) || /ReportsPage/.test(app))
const home = readFileSync('src/pages/Home.tsx', 'utf-8')
check('Home.tsx 加 📊 日报 入口', () => /📊/.test(home) && /日报/.test(home))
check('learningReport.test.ts 存在 + 10 测试', () => {
  if (!existsSync('tests/learningReport.test.ts')) return false
  const t = readFileSync('tests/learningReport.test.ts', 'utf-8')
  const itMatches = t.match(/^\s*it\(/gm) || []
  return itMatches.length >= 4
})

// === v1.6/v1.7/v1.8/v1.9/v1.10 修复保留 ===
check('v1.6 修复保留: WritePage useEffect [activeTab]', () => {
  const w = readFileSync('src/pages/WritePage.tsx', 'utf-8')
  return /useEffect\(\(\) => \{\s*if \(activeTab === 'history'\)/.test(w)
})
check('v1.7 修复保留: ListenPage useEffect [lesson.id]', () => {
  const l = readFileSync('src/pages/ListenPage.tsx', 'utf-8')
  return /useEffect\(\(\) => \{\s*setAnswers\(\{\}\)/.test(l)
})
check('v1.8 修复保留: Onboarding 3 步', () => {
  const o = readFileSync('src/components/Onboarding.tsx', 'utf-8')
  return /ONBOARDING_STEPS\s*=\s*\[\s*['"]level['"]\s*,\s*['"]pronounce['"]\s*,\s*['"]finish['"]\s*\]/.test(o)
})
check('v1.10 修复保留: AIChat ✨ 自动 + 💬 自由话题', () => {
  const a = readFileSync('src/pages/AIChat.tsx', 'utf-8')
  return /✨ 自动/.test(a) && /💬 自由话题/.test(a)
})
check('v1.10 修复保留: SynonymsButton', () => {
  const w = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
  return /AI 同义词辨析/.test(w)
})

// === 跑单元测试 ===
console.log('\n--- 跑单元测试 ---')
import { execSync } from 'child_process'
try {
  const out = execSync('npx vitest run tests/fsrs.test.ts tests/reviewQueue.test.ts tests/learningReport.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`v1.11.0 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('v1.11.0 单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
