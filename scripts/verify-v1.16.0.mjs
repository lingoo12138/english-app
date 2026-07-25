// scripts/verify-v1.16.0.mjs - v1.16.0 B6 多场景关联
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.16.0 核心
  { name: 'sceneReview.ts 存在', file: 'src/lib/sceneReview.ts' },
  { name: 'sceneReview.ts addSceneWordsToReview', file: 'src/lib/sceneReview.ts', grep: 'addSceneWordsToReview' },
  { name: 'sceneReview.ts getSceneReviewStatus', file: 'src/lib/sceneReview.ts', grep: 'getSceneReviewStatus' },
  { name: 'sceneReview.ts removeSceneWordsFromReview', file: 'src/lib/sceneReview.ts', grep: 'removeSceneWordsFromReview' },
  { name: 'sceneReview.ts customScene: 前缀', file: 'src/lib/sceneReview.ts', grep: 'customScene:' },

  // v1.15 CustomSceneLearn 集成
  { name: 'CustomSceneLearn.tsx addSceneWordsToReview', file: 'src/pages/CustomSceneLearn.tsx', grep: 'addSceneWordsToReview' },
  { name: 'CustomSceneLearn.tsx 加入复习按钮', file: 'src/pages/CustomSceneLearn.tsx', grep: '加入复习队列' },

  // Detail 加复习状态
  { name: 'CustomSceneDetail.tsx getSceneReviewStatus', file: 'src/pages/CustomSceneDetail.tsx', grep: 'getSceneReviewStatus' },
  { name: 'CustomSceneDetail.tsx 复习状态卡片', file: 'src/pages/CustomSceneDetail.tsx', grep: '复习状态' },

  // 列表标签
  { name: 'CustomScenes.tsx getSceneInReviewCount', file: 'src/pages/CustomScenes.tsx', grep: 'getSceneInReviewCount' },
  { name: 'CustomScenes.tsx 复习中标签', file: 'src/pages/CustomScenes.tsx', grep: '复习中' },

  // 测试
  { name: 'sceneReview.test.ts 存在', file: 'tests/sceneReview.test.ts' },

  // 文档
  { name: 'v1.16.0 plan', file: 'docs/plans/v1.16.0-scene-to-review.md' },
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
  const out = execSync('npx vitest run tests/sceneReview.test.ts 2>&1', {
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
