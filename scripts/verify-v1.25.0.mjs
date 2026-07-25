// scripts/verify-v1.25.0.mjs - v1.25.0 W26 tag 合并/重命名
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  { name: 'wordTags.ts renameTag', file: 'src/lib/wordTags.ts', grep: 'renameTag' },
  { name: 'wordTags.ts mergeTags', file: 'src/lib/wordTags.ts', grep: 'mergeTags' },
  { name: 'wordTags.ts findSimilarTags', file: 'src/lib/wordTags.ts', grep: 'findSimilarTags' },
  { name: 'Notebook import renameTag/mergeTags', file: 'src/pages/Notebook.tsx', grep: 'renameTag, mergeTags' },
  { name: 'Notebook modal', file: 'src/pages/Notebook.tsx', grep: 'showTagManager' },
  { name: 'Notebook handleTagAction', file: 'src/pages/Notebook.tsx', grep: 'handleTagAction' },
  { name: 'Notebook 管理按钮', file: 'src/pages/Notebook.tsx', grep: '🏷️ 管理' },
  { name: 'Notebook 重命名按钮', file: 'src/pages/Notebook.tsx', grep: "type: 'rename'" },
  { name: 'Notebook 合并按钮', file: 'src/pages/Notebook.tsx', grep: "type: 'merge'" },
  { name: 'Notebook catch (e: unknown)', file: 'src/pages/Notebook.tsx', grep: 'catch (e: unknown)' },
  { name: 'tagMerge.test.ts 存在', file: 'tests/tagMerge.test.ts', grep: 'tagMerge' },
]

let pass = 0, fail = 0
for (const c of checks) {
  if (!existsSync(c.file) || !readFileSync(c.file, 'utf-8').includes(c.grep)) {
    console.log(`✗ ${c.name}`)
    fail++
  } else { console.log(`✓ ${c.name}`); pass++ }
}
console.log(`\n静态: ${pass}/${pass + fail}\n`)

console.log('=== 跑新测试 ===')
try {
  const out = execSync('npx vitest run tests/tagMerge.test.ts 2>&1', { encoding: 'utf-8', timeout: 60000 })
  const t = out.match(/Tests\s+\S+\s+\((\d+)\)/)
  if (t) console.log(`✓ ${t[1]} 测试通过`)
  else console.log(out.split('\n').slice(-5).join('\n'))
} catch (e) { console.log('✗ 测试失败'); fail++ }

console.log(`\n=== ${fail === 0 ? '✓ 全部通过' : `✗ ${fail} 项失败`} ===`)
process.exit(fail === 0 ? 0 : 1)
