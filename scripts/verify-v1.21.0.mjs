// scripts/verify-v1.21.0.mjs - v1.21.0 B11 生词本标签
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // db v6
  { name: 'db.ts version(6)', file: 'src/lib/db.ts', grep: 'version(6)' },
  { name: 'db.ts wordTags 表', file: 'src/lib/db.ts', grep: 'wordTags' },
  { name: 'db.ts WordTag type', file: 'src/lib/db.ts', grep: 'WordTag' },
  { name: 'db.ts addWordTag', file: 'src/lib/db.ts', grep: 'addWordTag' },
  { name: 'db.ts getWordsByTag', file: 'src/lib/db.ts', grep: 'getWordsByTag' },
  { name: 'db.ts removeAllTagsForWord', file: 'src/lib/db.ts', grep: 'removeAllTagsForWord' },

  // wordTags
  { name: 'wordTags.ts 存在', file: 'src/lib/wordTags.ts' },
  { name: 'wordTags.ts parseTagInput', file: 'src/lib/wordTags.ts', grep: 'parseTagInput' },
  { name: 'wordTags.ts addTagsToWord', file: 'src/lib/wordTags.ts', grep: 'addTagsToWord' },
  { name: 'wordTags.ts getAllTagsWithCount', file: 'src/lib/wordTags.ts', grep: 'getAllTagsWithCount' },
  { name: 'wordTags.ts suggestTagsFromWord', file: 'src/lib/wordTags.ts', grep: 'suggestTagsFromWord' },
  { name: 'wordTags.ts getTagColor', file: 'src/lib/wordTags.ts', grep: 'getTagColor' },
  { name: 'wordTags.ts MAX_TAG_LEN', file: 'src/lib/wordTags.ts', grep: 'MAX_TAG_LEN' },

  // Notebook 集成
  { name: 'Notebook.tsx import wordTags', file: 'src/pages/Notebook.tsx', grep: "from '../lib/wordTags'" },
  { name: 'Notebook.tsx filterTag state', file: 'src/pages/Notebook.tsx', grep: 'filterTag' },
  { name: 'Notebook.tsx handleAddTag', file: 'src/pages/Notebook.tsx', grep: 'handleAddTag' },
  { name: 'Notebook.tsx handleRemoveTag', file: 'src/pages/Notebook.tsx', grep: 'handleRemoveTag' },
  { name: 'Notebook.tsx tag 过滤 UI', file: 'src/pages/Notebook.tsx', grep: '按 tag 过滤' },

  // 测试
  { name: 'wordTags.test.ts 存在', file: 'tests/wordTags.test.ts' },

  // 文档
  { name: 'v1.21.0 plan', file: 'docs/plans/v1.21.0-word-tags.md' },
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
  const out = execSync('npx vitest run tests/wordTags.test.ts 2>&1', {
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
