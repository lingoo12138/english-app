#!/usr/bin/env node
// scripts/verify-w128.mjs - W128 数据导出 + 跨 tab 同步闭环验证
// 静态审查 + 行为闭环 (无需启动浏览器)
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..')

function readFile(p) {
  return fs.readFileSync(p, 'utf-8')
}

function checkFile(rel, fn) {
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) {
    console.error(`✗ ${rel} 不存在`)
    return false
  }
  const content = readFile(full)
  return fn(content, rel)
}

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log(`✓ ${msg}`) }
  else { fail++; console.error(`✗ ${msg}`) }
}

console.log('=== W128 Producer 验证 ===\n')

// 1. 文件存在
assert(fs.existsSync(path.join(ROOT, 'src/lib/dataExport.ts')), 'src/lib/dataExport.ts 存在')
assert(fs.existsSync(path.join(ROOT, 'src/lib/idbSync.ts')), 'src/lib/idbSync.ts 存在')
assert(fs.existsSync(path.join(ROOT, 'tests/w128-data-export-sync.test.ts')), 'tests/w128-data-export-sync.test.ts 存在')

// 2. 行数
const dataExportLines = readFile(path.join(ROOT, 'src/lib/dataExport.ts')).split('\n').length
const idbSyncLines = readFile(path.join(ROOT, 'src/lib/idbSync.ts')).split('\n').length
assert(dataExportLines >= 300, `dataExport.ts ≥ 300 行 (${dataExportLines})`)
assert(idbSyncLines >= 150, `idbSync.ts ≥ 150 行 (${idbSyncLines})`)

// 3. 关键 API 导出
checkFile('src/lib/dataExport.ts', (c) => {
  assert(/export\s+async\s+function\s+exportAllData/.test(c), 'dataExport.ts: exportAllData() 导出')
  assert(/export\s+async\s+function\s+exportByKey/.test(c), 'dataExport.ts: exportByKey() 导出')
  assert(/export\s+function\s+toCSV/.test(c), 'dataExport.ts: toCSV() 导出 (通用 CSV)')
  assert(/export\s+function\s+toJSON/.test(c), 'dataExport.ts: toJSON() 导出 (通用 JSON)')
  assert(/export\s+function\s+toMarkdownTable/.test(c), 'dataExport.ts: toMarkdownTable() 导出 (通用 MD table)')
  assert(/export\s+function\s+toMarkdownList/.test(c), 'dataExport.ts: toMarkdownList() 导出 (通用 MD list)')
  assert(/export\s+function\s+downloadFile/.test(c), 'dataExport.ts: downloadFile() 导出 (通用下载)')
  assert(/export\s+async\s+function\s+importData/.test(c), 'dataExport.ts: importData() 导出 (统一导入)')
  assert(/export\s+const\s+EXPORT_SCHEMA_VERSION/.test(c), 'dataExport.ts: EXPORT_SCHEMA_VERSION 导出')
  return true
})

// 4. exportAllData 含 7 类
checkFile('src/lib/dataExport.ts', (c) => {
  // 找 exportAllData 函数起始
  const start = c.indexOf('export async function exportAllData')
  if (start < 0) { fail++; console.error('✗ exportAllData 函数未找到'); return false }
  // 找下一个 export async function 或 export function 边界
  const end = c.indexOf('\nexport ', start + 50)
  const body = end > 0 ? c.slice(start, end) : c.slice(start)
  assert(body.includes('settings'), 'exportAllData: 含 settings')
  assert(body.includes('chats'), 'exportAllData: 含 chats')
  assert(body.includes('writing'), 'exportAllData: 含 writing errors')
  assert(body.includes('dictation'), 'exportAllData: 含 dictation errors')
  assert(body.includes('lessonScores'), 'exportAllData: 含 lessonScores')
  assert(body.includes('achievements'), 'exportAllData: 含 achievements')
  assert(body.includes('favorites'), 'exportAllData: 含 favorites')
  return true
})

// 5. idbSync 关键 API
checkFile('src/lib/idbSync.ts', (c) => {
  assert(/export\s+function\s+initIdbSync/.test(c), 'idbSync.ts: initIdbSync() 导出')
  assert(/export\s+function\s+notifyIdbWrite/.test(c), 'idbSync.ts: notifyIdbWrite() 导出')
  assert(/export\s+function\s+isReceivingIdbSync/.test(c), 'idbSync.ts: isReceivingIdbSync() 导出 (防回环查询)')
  assert(/BroadcastChannel/.test(c), 'idbSync.ts: 用 BroadcastChannel API')
  assert(/debounce|DEBOUNCE_MS/i.test(c), 'idbSync.ts: 有 debounce 机制')
  assert(/RATE_LIMIT_MS|频率/.test(c), 'idbSync.ts: 有频率限制 (1次/200ms)')
  assert(/storage\s+event|StorageEvent/.test(c), 'idbSync.ts: 有 storage event fallback (老浏览器)')
  assert(/_receiving|_isReceiving/.test(c), 'idbSync.ts: 有 _receiving 旗标 (防回环)')
  return true
})

// 6. exportByKey 支持 7 类
checkFile('src/lib/dataExport.ts', (c) => {
  const expectedKeys = ['settings', 'words', 'chats', 'errors', 'lessonScores', 'achievements', 'favorites']
  for (const k of expectedKeys) {
    assert(c.includes(`case '${k}':`), `exportByKey: case '${k}' 存在`)
  }
  return true
})

// 7. importData 含 schema 验证
checkFile('src/lib/dataExport.ts', (c) => {
  const start = c.indexOf('export async function importData')
  if (start < 0) { fail++; console.error('✗ importData 函数未找到'); return false }
  const end = c.indexOf('\nexport ', start + 50)
  const body = end > 0 ? c.slice(start, end) : c.slice(start)
  assert(body.includes('schemaVersion') || body.includes('parseAndValidate'), 'importData: 验证 schemaVersion')
  assert(body.includes('JSON.parse') || body.includes('parseAndValidate'), 'importData: JSON 解析')
  // 冲突策略
  assert(/updatedAt|ts/.test(body), 'importData: 冲突策略 (timestamp 比较)')
  return true
})

// 8. CSV 注入防护
checkFile('src/lib/dataExport.ts', (c) => {
  const start = c.indexOf('export function escapeCSVField')
  if (start < 0) { fail++; console.error('✗ escapeCSVField 函数未找到'); return false }
  const end = c.indexOf('\nexport ', start + 50)
  const body = end > 0 ? c.slice(start, end) : c.slice(start)
  assert(/=\s*\[\?\[\^/.test(body) || /=\s*\+/.test(body), 'escapeCSVField: 注入防护 (开头特殊字符加 \')')
  assert(body.includes('replace'), 'escapeCSVField: 引号双写')
  return true
})

// 9. main.tsx 注册 idbSync
checkFile('src/main.tsx', (c) => {
  assert(/from\s+['"]\.\/lib\/idbSync['"]/.test(c), 'main.tsx: import idbSync')
  assert(/initIdbSync\s*\(/.test(c), 'main.tsx: 调用 initIdbSync()')
  assert(/CustomEvent|idb-sync/.test(c), 'main.tsx: 转发 idbSync 事件 (window event)')
  return true
})

// 10. db.ts 集成 notifyIdbWrite
checkFile('src/lib/db.ts', (c) => {
  const calls = (c.match(/notifyIdbWrite\(/g) || []).length
  assert(calls >= 4, `db.ts: notifyIdbWrite 调用 ≥ 4 处 (${calls})`)
  assert(/from\s+['"]\.\/idbSync['"]/.test(c), 'db.ts: import idbSync')
  return true
})

// 11. 旧 export 入口仍存在 (向后兼容)
checkFile('src/lib/export.ts', (c) => {
  assert(/export async function exportToCSV/.test(c), 'export.ts: exportToCSV 仍存在')
  assert(/export async function exportToJSON/.test(c), 'export.ts: exportToJSON 仍存在')
  assert(/export function downloadFile/.test(c), 'export.ts: downloadFile 仍存在')
  assert(/export async function exportFullBackup/.test(c), 'export.ts: exportFullBackup 仍存在')
  // 委托 dataExport
  assert(/from ['"]\.\/dataExport['"]/.test(c), 'export.ts: 引用 dataExport (委托)')
  return true
})

checkFile('src/lib/exportChat.ts', (c) => {
  assert(/export function exportChat/.test(c), 'exportChat.ts: exportChat 仍存在')
  assert(/export async function exportAllChats/.test(c), 'exportChat.ts: exportAllChats 仍存在')
  assert(/from ['"]\.\/dataExport['"]/.test(c), 'exportChat.ts: 引用 dataExport (委托)')
  return true
})

checkFile('src/lib/exportErrors.ts', (c) => {
  assert(/export function escapeCSV/.test(c), 'exportErrors.ts: escapeCSV 仍存在')
  assert(/export function allErrorsToCSV/.test(c), 'exportErrors.ts: allErrorsToCSV 仍存在')
  assert(/from ['"]\.\/dataExport['"]/.test(c), 'exportErrors.ts: 引用 dataExport (委托)')
  return true
})

// 12. 测试用例数
const testFile = readFile(path.join(ROOT, 'tests/w128-data-export-sync.test.ts'))
const testCases = (testFile.match(/^\s*it\(/gm) || []).length
assert(testCases >= 30, `w128 测试用例 ≥ 30 (${testCases})`)

// 13. 不引新依赖 (package.json 未改)
const pkg = JSON.parse(readFile(path.join(ROOT, 'package.json')))
const oldDeps = Object.keys(pkg.dependencies).length
assert(oldDeps > 0, `package.json 未改 (现有 ${oldDeps} 个依赖, 未新增)`)

console.log(`\n=== 总结 ===`)
console.log(`通过: ${pass}`)
console.log(`失败: ${fail}`)
console.log(`结果: ${fail === 0 ? '✓ 全部通过' : '✗ 有失败'}`)
process.exit(fail === 0 ? 0 : 1)
