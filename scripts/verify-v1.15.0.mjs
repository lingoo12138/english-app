// scripts/verify-v1.15.0.mjs - v1.15.0 自定义场景学习流
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.15.0 主页面
  { name: 'CustomSceneLearn.tsx 存在', file: 'src/pages/CustomSceneLearn.tsx' },
  { name: 'CustomSceneLearn useParams', file: 'src/pages/CustomSceneLearn.tsx', grep: 'useParams' },
  { name: 'CustomSceneLearn getCustomSceneById', file: 'src/pages/CustomSceneLearn.tsx', grep: 'getCustomSceneById' },
  { name: 'CustomSceneLearn currentIdx state', file: 'src/pages/CustomSceneLearn.tsx', grep: 'currentIdx' },
  { name: 'CustomSceneLearn showAnswer state', file: 'src/pages/CustomSceneLearn.tsx', grep: 'showAnswer' },
  { name: 'CustomSceneLearn TTSButton', file: 'src/pages/CustomSceneLearn.tsx', grep: 'TTSButton' },
  { name: 'CustomSceneLearn 收藏 toggle', file: 'src/pages/CustomSceneLearn.tsx', grep: 'isFavorite' },
  { name: 'CustomSceneLearn 进度持久化', file: 'src/pages/CustomSceneLearn.tsx', grep: 'PROGRESS_KEY' },
  { name: 'CustomSceneLearn 键盘快捷键', file: 'src/pages/CustomSceneLearn.tsx', grep: 'keydown' },
  { name: 'CustomSceneLearn 完成态', file: 'src/pages/CustomSceneLearn.tsx', grep: '完成态 -' },

  // Detail 加按钮
  { name: 'CustomSceneDetail.tsx 开始学习按钮', file: 'src/pages/CustomSceneDetail.tsx', grep: '开始学习' },
  { name: 'CustomSceneDetail learn 路由', file: 'src/pages/CustomSceneDetail.tsx', grep: '/learn' },

  // 路由
  { name: 'App.tsx CustomSceneLearn import', file: 'src/App.tsx', grep: 'CustomSceneLearn' },
  { name: 'App.tsx /learn 路由', file: 'src/App.tsx', grep: ':id/learn' },

  // 测试
  { name: 'customSceneLearn.test.ts 存在', file: 'tests/customSceneLearn.test.ts' },

  // 文档
  { name: 'v1.15.0 plan', file: 'docs/plans/v1.15.0-custom-scene-learn.md' },
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
  const out = execSync('npx vitest run tests/customSceneLearn.test.ts 2>&1', {
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
