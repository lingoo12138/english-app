// scripts/verify-v1.22.0.mjs - v1.22.0 B12 复习按 tag 过滤
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // taggedReviews
  { name: 'taggedReviews.ts 存在', file: 'src/lib/taggedReviews.ts' },
  { name: 'taggedReviews.ts getReviewsByTag', file: 'src/lib/taggedReviews.ts', grep: 'getReviewsByTag' },
  { name: 'taggedReviews.ts getReviewCountByTag', file: 'src/lib/taggedReviews.ts', grep: 'getReviewCountByTag' },
  { name: 'taggedReviews.ts getAllTagsWithReviewCount', file: 'src/lib/taggedReviews.ts', grep: 'getAllTagsWithReviewCount' },
  { name: 'taggedReviews.ts getReviewsByTagWithScore', file: 'src/lib/taggedReviews.ts', grep: 'getReviewsByTagWithScore' },
  { name: 'taggedReviews.ts isWordInTag', file: 'src/lib/taggedReviews.ts', grep: 'isWordInTag' },

  // ReviewCenter 集成
  { name: 'ReviewCenter.tsx import taggedReviews', file: 'src/pages/ReviewCenter.tsx', grep: "from '../lib/taggedReviews'" },
  { name: 'ReviewCenter.tsx filterTag state', file: 'src/pages/ReviewCenter.tsx', grep: 'filterTag' },
  { name: 'ReviewCenter.tsx tagStats', file: 'src/pages/ReviewCenter.tsx', grep: 'tagStats' },
  { name: 'ReviewCenter.tsx loadTagStats', file: 'src/pages/ReviewCenter.tsx', grep: 'loadTagStats' },
  { name: 'ReviewCenter.tsx tag 过滤 UI', file: 'src/pages/ReviewCenter.tsx', grep: 'setFilterTag' },

  // 测试
  { name: 'taggedReviews.test.ts 存在', file: 'tests/taggedReviews.test.ts' },

  // 文档
  { name: 'v1.22.0 plan', file: 'docs/plans/v1.22.0-review-by-tag.md' },
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
  const out = execSync('npx vitest run tests/taggedReviews.test.ts 2>&1', {
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
