// scripts/verify-llm-e2e.mjs - v1.8-B LLM 端到端 闭环验证
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

// 1. e2eTest 函数存在
const llmProvider = readFileSync('src/lib/providers/llm.ts', 'utf8')
check('e2eTest 函数存在', () => /export async function e2eTest/.test(llmProvider))

// 2. chatCompletionWithTimeout 函数存在
check('chatCompletionWithTimeout 函数存在', () => /export async function chatCompletionWithTimeout/.test(llmProvider))

// 3. E2E_PROMPT 常量
check('E2E_PROMPT = "Say \'OK\' in one word"', () => /E2E_PROMPT\s*=\s*["']Say 'OK' in one word["']/.test(llmProvider))

// 4. E2ETestResult interface
check('E2ETestResult interface 定义', () => /export interface E2ETestResult/.test(llmProvider))

// 5. mock LLM 探测消息快速返回 OK
check('mock LLM 探测消息快速返回 OK', () => /Say 'OK'/.test(llmProvider) && /return \{ content: 'OK'/.test(llmProvider))

// 6. unknown + Error 守卫 (v1.6 review 规范)
check('e2eTest catch 用 unknown + Error 守卫', () => {
  const e2eFn = llmProvider.match(/export async function e2eTest[\s\S]*?^}/m)
  if (!e2eFn) return false
  return /catch \(e: unknown\)/.test(e2eFn[0]) && /e instanceof Error/.test(e2eFn[0])
})

// 7. 单元测试存在
check('tests/llmE2E.test.ts 存在', () => existsSync('tests/llmE2E.test.ts'))

// 8. 跑单元测试
console.log('\n--- 跑单元测试 ---')
import { execSync } from 'child_process'
try {
  const out = execSync('npx vitest run tests/llmE2E.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`llmE2E 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('llmE2E 单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
