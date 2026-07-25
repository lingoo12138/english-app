// scripts/verify-v1.18.0.mjs - v1.18.0 B8 文件上传
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // fileUpload 核心
  { name: 'fileUpload.ts 存在', file: 'src/lib/fileUpload.ts' },
  { name: 'fileUpload.ts validateFile', file: 'src/lib/fileUpload.ts', grep: 'validateFile' },
  { name: 'fileUpload.ts readTextFile', file: 'src/lib/fileUpload.ts', grep: 'readTextFile' },
  { name: 'fileUpload.ts readAndTruncateFile', file: 'src/lib/fileUpload.ts', grep: 'readAndTruncateFile' },
  { name: 'fileUpload.ts extractFileName', file: 'src/lib/fileUpload.ts', grep: 'extractFileName' },
  { name: 'fileUpload.ts MAX_FILE_SIZE', file: 'src/lib/fileUpload.ts', grep: 'MAX_FILE_SIZE' },
  { name: 'fileUpload.ts SUPPORTED_EXTENSIONS', file: 'src/lib/fileUpload.ts', grep: 'SUPPORTED_EXTENSIONS' },
  { name: 'fileUpload.ts FileReader', file: 'src/lib/fileUpload.ts', grep: 'FileReader' },

  // CustomScenes 集成
  { name: 'CustomScenes.tsx import fileUpload', file: 'src/pages/CustomScenes.tsx', grep: "from '../lib/fileUpload'" },
  { name: 'CustomScenes.tsx handleFileUpload', file: 'src/pages/CustomScenes.tsx', grep: 'handleFileUpload' },
  { name: 'CustomScenes.tsx fileInputRef', file: 'src/pages/CustomScenes.tsx', grep: 'fileInputRef' },
  { name: 'CustomScenes.tsx 上传按钮', file: 'src/pages/CustomScenes.tsx', grep: '上传文件' },
  { name: 'CustomScenes.tsx file input', file: 'src/pages/CustomScenes.tsx', grep: "type=\"file\"" },

  // 测试
  { name: 'fileUpload.test.ts 存在', file: 'tests/fileUpload.test.ts' },

  // 文档
  { name: 'v1.18.0 plan', file: 'docs/plans/v1.18.0-file-upload.md' },
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
  const out = execSync('npx vitest run tests/fileUpload.test.ts 2>&1', {
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
