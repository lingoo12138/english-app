// scripts/verify-v1.24.0.mjs - v1.24.0 W25 学习提醒升级
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // reminderContent
  { name: 'reminderContent.ts 存在', file: 'src/lib/reminderContent.ts' },
  { name: 'reminderContent.ts buildReminderBody', file: 'src/lib/reminderContent.ts', grep: 'buildReminderBody' },
  { name: 'reminderContent.ts getReminderStats', file: 'src/lib/reminderContent.ts', grep: 'getReminderStats' },
  { name: 'reminderContent.ts getLastStudyTimestamp', file: 'src/lib/reminderContent.ts', grep: 'getLastStudyTimestamp' },
  { name: 'reminderContent.ts estimateMinutes', file: 'src/lib/reminderContent.ts', grep: 'estimateMinutes' },
  { name: 'reminderContent.ts 3 天未学', file: 'src/lib/reminderContent.ts', grep: 'daysInactive >= 3' },
  { name: 'reminderContent.ts daysInactive 字段', file: 'src/lib/reminderContent.ts', grep: 'daysInactive' },

  // reminder.ts 升级
  { name: 'reminder.ts 动态 body 集成', file: 'src/lib/reminder.ts', grep: 'reminderContent' },
  { name: 'reminder.ts 异步 fire', file: 'src/lib/reminder.ts', grep: 'async function fireReminderNotification' },
  { name: 'reminder.ts data.url', file: 'src/lib/reminder.ts', grep: "data: { url:" },
  { name: 'reminder.ts data.url review 路由', file: 'src/lib/reminder.ts', grep: '/review?from=reminder' },
  { name: 'reminder.ts catch (e: unknown)', file: 'src/lib/reminder.ts', grep: 'catch (e: unknown)' },

  // ReminderSection
  { name: 'ReminderSection import reminderContent', file: 'src/components/settings/ReminderSection.tsx', grep: "from '../../lib/reminderContent'" },
  { name: 'ReminderSection 动态预览', file: 'src/components/settings/ReminderSection.tsx', grep: '动态预览' },

  // 测试
  { name: 'reminderContent.test.ts 存在', file: 'tests/reminderContent.test.ts' },

  // 文档
  { name: 'v1.24.0 plan', file: 'docs/plans/v1.24.0-learning-reminder.md' },
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
  const out = execSync('npx vitest run tests/reminderContent.test.ts 2>&1', {
    encoding: 'utf-8',
    timeout: 60000,
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
