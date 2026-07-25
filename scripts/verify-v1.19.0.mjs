// scripts/verify-v1.19.0.mjs - v1.19.0 B9 学习日历
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = [
  // learningCalendar
  { name: 'learningCalendar.ts 存在', file: 'src/lib/learningCalendar.ts' },
  { name: 'learningCalendar.ts getCalendarMonth', file: 'src/lib/learningCalendar.ts', grep: 'getCalendarMonth' },
  { name: 'learningCalendar.ts getHeatmapLevel', file: 'src/lib/learningCalendar.ts', grep: 'getHeatmapLevel' },
  { name: 'learningCalendar.ts adjustMonth', file: 'src/lib/learningCalendar.ts', grep: 'adjustMonth' },
  { name: 'learningCalendar.ts HEATMAP_COLORS', file: 'src/lib/learningCalendar.ts', grep: 'HEATMAP_COLORS' },
  { name: 'learningCalendar.ts getDailyReport 复用', file: 'src/lib/learningCalendar.ts', grep: 'getDailyReport' },

  // CalendarPage
  { name: 'CalendarPage.tsx 存在', file: 'src/pages/CalendarPage.tsx' },
  { name: 'CalendarPage 月份切换', file: 'src/pages/CalendarPage.tsx', grep: 'handlePrev' },
  { name: 'CalendarPage 热力图', file: 'src/pages/CalendarPage.tsx', grep: 'getHeatmapLevel' },
  { name: 'CalendarPage 周表头', file: 'src/pages/CalendarPage.tsx', grep: 'WEEKDAYS' },

  // 路由
  { name: 'App.tsx /calendar 路由', file: 'src/App.tsx', grep: 'calendar' },
  { name: 'App.tsx CalendarPage import', file: 'src/App.tsx', grep: 'CalendarPage' },

  // Home 入口
  { name: 'Home.tsx 学习日历入口', file: 'src/pages/Home.tsx', grep: '学习日历' },

  // 测试
  { name: 'learningCalendar.test.ts 存在', file: 'tests/learningCalendar.test.ts' },

  // 文档
  { name: 'v1.19.0 plan', file: 'docs/plans/v1.19.0-learning-calendar.md' },
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
  const out = execSync('npx vitest run tests/learningCalendar.test.ts 2>&1', {
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
