// scripts/verify-v1.12.0.mjs - v1.12.0 静态验证 + 单元测试
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.12.0-B 错误恢复
  { name: 'llmFallback.ts 存在', file: 'src/lib/llmFallback.ts' },
  { name: 'llmFallback.test.ts 存在', file: 'tests/llmFallback.test.ts' },
  { name: 'chatCompletionWithFallback 实现', file: 'src/lib/providers/llm.ts', grep: 'chatCompletionWithFallback' },

  // v1.12.0-A 拍照场景
  { name: 'imageRecog.ts SCENE_PROMPTS', file: 'src/lib/imageRecog.ts', grep: 'SCENE_PROMPTS' },
  { name: 'imageRecog.ts getScenePrompt', file: 'src/lib/imageRecog.ts', grep: 'getScenePrompt' },
  { name: 'imageRecog.ts recognizeImageWithScene', file: 'src/lib/imageRecog.ts', grep: 'recognizeImageWithScene' },
  { name: 'imageRecogScene.test.ts 存在', file: 'tests/imageRecogScene.test.ts' },
  { name: 'Camera.tsx scene state', file: 'src/pages/Camera.tsx', grep: 'scene' },
  { name: 'Camera.tsx 调 recognizeImageWithScene', file: 'src/pages/Camera.tsx', grep: 'recognizeImageWithScene' },

  // v1.12.0-C LLM 日限
  { name: 'llmUsage.ts 存在', file: 'src/lib/llmUsage.ts' },
  { name: 'llmUsage.ts DAILY_LIMITS', file: 'src/lib/llmUsage.ts', grep: 'DAILY_LIMITS' },
  { name: 'llmUsage.ts recordLLMCall', file: 'src/lib/llmUsage.ts', grep: 'recordLLMCall' },
  { name: 'llmUsage.ts checkLLMLimit', file: 'src/lib/llmUsage.ts', grep: 'checkLLMLimit' },
  { name: 'llmUsage.test.ts 存在', file: 'tests/llmUsage.test.ts' },
  { name: 'Settings.tsx 用量卡片', file: 'src/pages/Settings.tsx', grep: 'LLM 用量' },

  // 文档
  { name: 'v1.12.0 plan', file: 'docs/plans/v1.12.0-error-recovery-llm-limit.md' },
  { name: 'CHANGELOG v1.12.0 段', file: 'docs/CHANGELOG.md', grep: 'v1.12.0' },
]

let pass = 0
let fail = 0
for (const c of checks) {
  if (!existsSync(c.file)) {
    console.log(`✗ ${c.name}: ${c.file} 不存在`)
    fail++
    continue
  }
  if (c.grep) {
    const content = readFileSync(c.file, 'utf-8')
    if (content.includes(c.grep)) {
      console.log(`✓ ${c.name}`)
      pass++
    } else {
      console.log(`✗ ${c.name}: ${c.file} 不含 "${c.grep}"`)
      fail++
    }
  } else {
    console.log(`✓ ${c.name}`)
    pass++
  }
}

console.log(`\n静态检查: ${pass} 通过 / ${fail} 失败\n`)

// 跑测试
console.log('=== 跑单元测试 (3 个新文件) ===')
try {
  const out = execSync('npx vitest run tests/llmFallback.test.ts tests/imageRecogScene.test.ts tests/llmUsage.test.ts 2>&1', {
    encoding: 'utf-8',
    timeout: 90000,
  })
  const m = out.match(/Test Files\s+\S+\s+\((\d+)\)/)
  const t = out.match(/Tests\s+\S+\s+\((\d+)\)/)
  if (m && t) {
    console.log(`✓ 测试: ${m[1]} 文件 / ${t[1]} 测试`)
  } else {
    console.log('✓ 测试输出:')
    console.log(out.split('\n').slice(-5).join('\n'))
  }
} catch (e) {
  console.log('✗ 测试失败:')
  console.log((e.stdout && e.stdout.toString().split('\n').slice(-10).join('\n')) || e.message)
  fail++
}

console.log(`\n=== 总结: ${fail === 0 ? '✓ 全部通过' : `✗ ${fail} 项失败`} ===`)
process.exit(fail === 0 ? 0 : 1)
