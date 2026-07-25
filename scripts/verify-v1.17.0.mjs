// scripts/verify-v1.17.0.mjs - v1.17.0 B7 多角色扩展
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.17.0 加 3 角色
  { name: 'chatRoles.ts doctor', file: 'src/lib/chatRoles.ts', grep: "id: 'doctor'" },
  { name: 'chatRoles.ts banker', file: 'src/lib/chatRoles.ts', grep: "id: 'banker'" },
  { name: 'chatRoles.ts police', file: 'src/lib/chatRoles.ts', grep: "id: 'police'" },
  { name: 'chatRoles.ts ChatRoleId 加 3', file: 'src/lib/chatRoles.ts', grep: "| 'doctor'        // 医生" },
  { name: 'chatRoles.ts 8 角色结构完整', file: 'src/lib/chatRoles.ts', grep: 'greetings' },

  // AIChat 自动显示
  { name: 'AIChat.tsx RoleSelector 自动', file: 'src/pages/AIChat.tsx', grep: 'RoleSelector' },
  { name: 'RoleSelector ALL_ROLES', file: 'src/components/RoleSelector.tsx', grep: 'ALL_ROLES' },

  // 测试
  { name: 'chatRoles.test.ts 8 角色', file: 'tests/chatRoles.test.ts', grep: '8 个角色' },
  { name: 'chatRoles.test.ts doctor', file: 'tests/chatRoles.test.ts', grep: 'doctor' },
  { name: 'chatRoles.test.ts banker', file: 'tests/chatRoles.test.ts', grep: 'banker' },
  { name: 'chatRoles.test.ts police', file: 'tests/chatRoles.test.ts', grep: 'police' },

  // 文档
  { name: 'v1.17.0 plan', file: 'docs/plans/v1.17.0-more-roles.md' },
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

console.log('=== 跑单元测试 (chatRoles 8 角色) ===')
try {
  const out = execSync('npx vitest run tests/chatRoles.test.ts 2>&1', {
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
