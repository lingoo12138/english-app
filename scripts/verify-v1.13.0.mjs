// scripts/verify-v1.13.0.mjs - v1.13.0 B3 多角色对话 静态验证
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // v1.13.0 角色系统
  { name: 'chatRoles.ts 存在', file: 'src/lib/chatRoles.ts' },
  { name: 'chatRoles.ts 5 角色', file: 'src/lib/chatRoles.ts', grep: 'CHAT_ROLES' },
  { name: 'chatRoles.ts interviewer', file: 'src/lib/chatRoles.ts', grep: 'interviewer' },
  { name: 'chatRoles.ts barista', file: 'src/lib/chatRoles.ts', grep: 'barista' },
  { name: 'chatRoles.ts receptionist', file: 'src/lib/chatRoles.ts', grep: 'receptionist' },
  { name: 'chatRoles.ts tour_guide', file: 'src/lib/chatRoles.ts', grep: 'tour_guide' },
  { name: 'chatRoles.ts waiter', file: 'src/lib/chatRoles.ts', grep: 'waiter' },
  { name: 'chatRoles.ts getRoleById', file: 'src/lib/chatRoles.ts', grep: 'getRoleById' },
  { name: 'chatRoles.ts getGreetingForRole', file: 'src/lib/chatRoles.ts', grep: 'getGreetingForRole' },
  { name: 'chatRoles.ts getFallbackReply', file: 'src/lib/chatRoles.ts', grep: 'getFallbackReply' },
  { name: 'chatRoles.ts getRoleSystemPrompt', file: 'src/lib/chatRoles.ts', grep: 'getRoleSystemPrompt' },

  // v1.13.0 组件
  { name: 'RoleSelector.tsx 存在', file: 'src/components/RoleSelector.tsx' },
  { name: 'RoleSelector 5 角色 + none', file: 'src/components/RoleSelector.tsx', grep: 'ALL_ROLES' },

  // v1.13.0 AIChat 集成
  { name: 'AIChat.tsx import RoleSelector', file: 'src/pages/AIChat.tsx', grep: "import RoleSelector" },
  { name: 'AIChat.tsx import chatRoles', file: 'src/pages/AIChat.tsx', grep: "from '../lib/chatRoles'" },
  { name: 'AIChat.tsx currentRoleId state', file: 'src/pages/AIChat.tsx', grep: 'currentRoleId' },
  { name: 'AIChat.tsx handleRoleChange', file: 'src/pages/AIChat.tsx', grep: 'handleRoleChange' },
  { name: 'AIChat.tsx role 注入', file: 'src/pages/AIChat.tsx', grep: 'role: currentRoleId' },

  // v1.13.0 aiChat 集成
  { name: 'aiChat.ts role 字段', file: 'src/lib/aiChat.ts', grep: 'role?: ChatRole' },
  { name: 'aiChat.ts 角色优先逻辑', file: 'src/lib/aiChat.ts', grep: '角色模式' },

  // 测试
  { name: 'chatRoles.test.ts 存在', file: 'tests/chatRoles.test.ts' },
  { name: 'roleIntegration.test.ts 存在', file: 'tests/roleIntegration.test.ts' },

  // 文档
  { name: 'v1.13.0 plan', file: 'docs/plans/v1.13.0-multi-role-chat.md' },
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

// 跑测试
console.log('=== 跑单元测试 (2 个新文件) ===')
try {
  const out = execSync('npx vitest run tests/chatRoles.test.ts tests/roleIntegration.test.ts 2>&1', {
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
