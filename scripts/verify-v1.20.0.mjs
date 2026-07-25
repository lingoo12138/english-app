// scripts/verify-v1.20.0.mjs - v1.20.0 B10 生词本批量操作
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // notebookBulk
  { name: 'notebookBulk.ts 存在', file: 'src/lib/notebookBulk.ts' },
  { name: 'notebookBulk.ts addFavoritesToReview', file: 'src/lib/notebookBulk.ts', grep: 'addFavoritesToReview' },
  { name: 'notebookBulk.ts removeFavorites', file: 'src/lib/notebookBulk.ts', grep: 'removeFavorites' },
  { name: 'notebookBulk.ts exportFavoritesAsCSV', file: 'src/lib/notebookBulk.ts', grep: 'exportFavoritesAsCSV' },
  { name: 'notebookBulk.ts downloadFavoritesCSV', file: 'src/lib/notebookBulk.ts', grep: 'downloadFavoritesCSV' },
  { name: 'notebookBulk.ts selectAll', file: 'src/lib/notebookBulk.ts', grep: 'selectAll' },
  { name: 'notebookBulk.ts invertSelection', file: 'src/lib/notebookBulk.ts', grep: 'invertSelection' },

  // Notebook 集成
  { name: 'Notebook.tsx import notebookBulk', file: 'src/pages/Notebook.tsx', grep: "from '../lib/notebookBulk'" },
  { name: 'Notebook.tsx handleBatchAddToReview', file: 'src/pages/Notebook.tsx', grep: 'handleBatchAddToReview' },
  { name: 'Notebook.tsx handleBatchExport', file: 'src/pages/Notebook.tsx', grep: 'handleBatchExport' },
  { name: 'Notebook.tsx handleSelectAll', file: 'src/pages/Notebook.tsx', grep: 'handleSelectAll' },
  { name: 'Notebook.tsx handleInvert', file: 'src/pages/Notebook.tsx', grep: 'handleInvert' },
  { name: 'Notebook.tsx 入复习按钮', file: 'src/pages/Notebook.tsx', grep: '入复习' },
  { name: 'Notebook.tsx 导出按钮', file: 'src/pages/Notebook.tsx', grep: '导出' },

  // 测试
  { name: 'notebookBulk.test.ts 存在', file: 'tests/notebookBulk.test.ts' },

  // 文档
  { name: 'v1.20.0 plan', file: 'docs/plans/v1.20.0-notebook-bulk.md' },
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
  const out = execSync('npx vitest run tests/notebookBulk.test.ts 2>&1', {
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
