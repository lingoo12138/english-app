// scripts/verify-v1.14.0.mjs - v1.14.0 B4 自定义场景 静态验证
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.14.0 核心库
  { name: 'customScenes.ts 存在', file: 'src/lib/customScenes.ts' },
  { name: 'customScenes.ts MAX_TEXT_LEN', file: 'src/lib/customScenes.ts', grep: 'MAX_TEXT_LEN' },
  { name: 'customScenes.ts MAX_WORDS', file: 'src/lib/customScenes.ts', grep: 'MAX_WORDS' },
  { name: 'customScenes.ts truncateText', file: 'src/lib/customScenes.ts', grep: 'truncateText' },
  { name: 'customScenes.ts mockExtractWords', file: 'src/lib/customScenes.ts', grep: 'mockExtractWords' },
  { name: 'customScenes.ts parseExtractResult', file: 'src/lib/customScenes.ts', grep: 'parseExtractResult' },
  { name: 'customScenes.ts extractWordsFromText', file: 'src/lib/customScenes.ts', grep: 'extractWordsFromText' },
  { name: 'customScenes.ts autoExtractTitle', file: 'src/lib/customScenes.ts', grep: 'autoExtractTitle' },
  { name: 'customScenes.ts saveCustomScene', file: 'src/lib/customScenes.ts', grep: 'saveCustomScene' },

  // db 集成
  { name: 'db.ts customScenes 表', file: 'src/lib/db.ts', grep: 'customScenes' },
  { name: 'db.ts addCustomScene', file: 'src/lib/db.ts', grep: 'addCustomScene' },
  { name: 'db.ts getAllCustomScenes', file: 'src/lib/db.ts', grep: 'getAllCustomScenes' },
  { name: 'db.ts CustomScene type', file: 'src/lib/db.ts', grep: 'CustomScene' },
  { name: 'db.ts version 5', file: 'src/lib/db.ts', grep: 'version(5)' },

  // UI 页面
  { name: 'CustomScenes.tsx 存在', file: 'src/pages/CustomScenes.tsx' },
  { name: 'CustomSceneDetail.tsx 存在', file: 'src/pages/CustomSceneDetail.tsx' },

  // 路由
  { name: 'App.tsx custom-scenes 路由', file: 'src/App.tsx', grep: 'custom-scenes' },
  { name: 'App.tsx CustomScenes import', file: 'src/App.tsx', grep: "import('./pages/CustomScenes')" },

  // Home 入口
  { name: 'Home.tsx 自定义场景入口', file: 'src/pages/Home.tsx', grep: '自定义场景' },

  // LLM 日限
  { name: 'CustomScenes recordLLMCall', file: 'src/pages/CustomScenes.tsx', grep: 'recordLLMCall' },
  { name: 'CustomScenes getLimitExceededMessage', file: 'src/pages/CustomScenes.tsx', grep: 'getLimitExceededMessage' },

  // 测试
  { name: 'customScenes.test.ts 存在', file: 'tests/customScenes.test.ts' },

  // 文档
  { name: 'v1.14.0 plan', file: 'docs/plans/v1.14.0-custom-scene.md' },
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

console.log('=== 跑单元测试 (新文件) ===')
try {
  const out = execSync('npx vitest run tests/customScenes.test.ts 2>&1', {
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
