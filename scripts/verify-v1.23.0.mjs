// scripts/verify-v1.23.0.mjs - v1.23.0 W24 PDF 上传
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // pdfUpload
  { name: 'pdfUpload.ts 存在', file: 'src/lib/pdfUpload.ts' },
  { name: 'pdfUpload.ts loadPdfJs', file: 'src/lib/pdfUpload.ts', grep: 'loadPdfJs' },
  { name: 'pdfUpload.ts isPdfFile', file: 'src/lib/pdfUpload.ts', grep: 'isPdfFile' },
  { name: 'pdfUpload.ts extractPdfText', file: 'src/lib/pdfUpload.ts', grep: 'extractPdfText' },
  { name: 'pdfUpload.ts isPdfEncryptedError', file: 'src/lib/pdfUpload.ts', grep: 'isPdfEncryptedError' },
  { name: 'pdfUpload.ts MAX_PDF_PAGES', file: 'src/lib/pdfUpload.ts', grep: 'MAX_PDF_PAGES' },
  { name: 'pdfUpload.ts 懒加载', file: 'src/lib/pdfUpload.ts', grep: 'await import' },

  // fileUpload 扩展
  { name: 'fileUpload.ts .pdf 扩展', file: 'src/lib/fileUpload.ts', grep: ".pdf" },
  { name: 'fileUpload.ts application/pdf MIME', file: 'src/lib/fileUpload.ts', grep: 'application/pdf' },

  // CustomScenes 集成
  { name: 'CustomScenes.tsx import pdfUpload', file: 'src/pages/CustomScenes.tsx', grep: "from '../lib/pdfUpload'" },
  { name: 'CustomScenes.tsx isPdfFile', file: 'src/pages/CustomScenes.tsx', grep: 'isPdfFile' },
  { name: 'CustomScenes.tsx extractPdfText', file: 'src/pages/CustomScenes.tsx', grep: 'extractPdfText' },
  { name: 'CustomScenes.tsx 加密 PDF 检测', file: 'src/pages/CustomScenes.tsx', grep: 'isPdfEncryptedError' },

  // 依赖
  { name: 'package.json pdfjs-dist', file: 'package.json', grep: 'pdfjs-dist' },

  // 测试
  { name: 'pdfUpload.test.ts 存在', file: 'tests/pdfUpload.test.ts' },

  // 文档
  { name: 'v1.23.0 plan', file: 'docs/plans/v1.23.0-pdf-upload.md' },
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
  const out = execSync('npx vitest run tests/pdfUpload.test.ts 2>&1', {
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
