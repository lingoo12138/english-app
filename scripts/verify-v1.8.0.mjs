// scripts/verify-v1.8.0.mjs - v1.8.0 + v1.9.0 闭环验证
import { readFileSync, existsSync } from 'fs'

const tests = []
const fails = []

function check(name, fn) {
  try {
    const result = fn()
    if (result) {
      console.log(`✅ ${name}`)
      tests.push(name)
    } else {
      console.log(`❌ ${name}`)
      fails.push(name)
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    fails.push(`${name}: ${e.message}`)
  }
}

// === v1.8.0-A onboarding ===
check('Onboarding.tsx 存在', () => existsSync('src/components/Onboarding.tsx'))
check('onboarding.test.ts 存在', () => existsSync('tests/onboarding.test.ts'))
const onboarding = readFileSync('src/components/Onboarding.tsx', 'utf-8')
check('Onboarding 有 3 步 (level/pronounce/finish)', () => /ONBOARDING_STEPS\s*=\s*\[\s*['"]level['"]\s*,\s*['"]pronounce['"]\s*,\s*['"]finish['"]\s*\]/.test(onboarding))
check('Onboarding 接受 open + onClose props', () => /open: boolean[\s\S]*onClose: \(\) => void/.test(onboarding))
check('Onboarding 有 markOnboarded + clearOnboarded', () => /export function markOnboarded/.test(onboarding) && /export function clearOnboarded/.test(onboarding))
check('Home.tsx 引用 Onboarding + isOnboarded', () => /import Onboarding.*isOnboarded.*from.*Onboarding/.test(readFileSync('src/pages/Home.tsx', 'utf-8')))
check('Home.tsx 有 CTA 文案 "第一次来?"', () => /第一次来\?/.test(readFileSync('src/pages/Home.tsx', 'utf-8')))
check('Settings.tsx 有 "重新看引导" 按钮', () => /handleReplayOnboarding/.test(readFileSync('src/pages/Settings.tsx', 'utf-8')))

// === v1.9.0 难度自适应 + 自由话题 ===
const aiChat = readFileSync('src/lib/aiChat.ts', 'utf-8')
check('aiChat.ts 加 assessUserLevel', () => /export function assessUserLevel/.test(aiChat))
check('aiChat.ts 加 truncateCustomTopic', () => /export function truncateCustomTopic/.test(aiChat))
check('aiChat.ts ChatContext 加 dynamicLevel + customTopic', () => /dynamicLevel\?: CEFRLevel/.test(aiChat) && /customTopic\?: string/.test(aiChat))
check('aiChat.ts buildSystemPrompt 用 effectiveLevel', () => /effectiveLevel\s*=\s*ctx\.dynamicLevel\s*\|\|\s*ctx\.level/.test(aiChat))
const aiChatPage = readFileSync('src/pages/AIChat.tsx', 'utf-8')
check('AIChat.tsx 加 "✨ 自动" 切换', () => /✨ 自动/.test(aiChatPage))
check('AIChat.tsx 加 "💬 自由话题" 按钮', () => /💬 自由话题/.test(aiChatPage))
check('AIChat.tsx 加 showTopicModal + customTopic state', () => /showTopicModal/.test(aiChatPage) && /customTopic/.test(aiChatPage))
check('AIChat.tsx handleSend 用 dynamicLevel + customTopic', () => /effectiveDynamicLevel/.test(aiChatPage) && /customTopic:\s*customTopic\s*\|\|\s*undefined/.test(aiChatPage))

// === v1.8.0-C OpenRouter + Daily 100 + WordDetail 跟读 ===
check('OpenRouter defaultModel 是 google/gemini-2.5-flash:free', () => /defaultModel: 'google\/gemini-2.5-flash:free'/.test(readFileSync('src/lib/providers/llm.ts', 'utf-8')))
check('LLMSection.tsx 有 🆓 0 成本 标签', () => /🆓 0 成本/.test(readFileSync('src/components/settings/LLMSection.tsx', 'utf-8')))
const daily = JSON.parse(readFileSync('public/data/daily.json', 'utf-8'))
check('daily.json 100 句', () => daily.length === 100)
check('WordDetail.tsx 有 🎤 跟读 按钮', () => /🎤 跟读/.test(readFileSync('src/pages/WordDetail.tsx', 'utf-8')))
check('WordDetail.tsx 引用 PronunciationPractice', () => /import PronunciationPractice/.test(readFileSync('src/pages/WordDetail.tsx', 'utf-8')))

// === v1.6/v1.7 修复保留 ===
check('v1.6 修复保留: WritePage useEffect [activeTab] 不重置 input', () => {
  const w = readFileSync('src/pages/WritePage.tsx', 'utf-8')
  return /useEffect\(\(\) => \{\s*if \(activeTab === 'history'\)/.test(w)
})
check('v1.7 修复保留: ListenPage useEffect [lesson.id]', () => {
  const l = readFileSync('src/pages/ListenPage.tsx', 'utf-8')
  return /useEffect\(\(\) => \{\s*setAnswers\(\{\}\)/.test(l)
})
check('v1.6 修复保留: ErrorExplainButton setLoading(true)', () => {
  const e = readFileSync('src/components/ErrorExplainButton.tsx', 'utf-8')
  return /setOpen\(true\)\s*setLoading\(true\)/.test(e)
})

// === 跑单元测试 ===
console.log('\n--- 跑单元测试 ---')
import { execSync } from 'child_process'
try {
  const out = execSync('npx vitest run tests/onboarding.test.ts tests/aiChat.test.ts tests/v1.8.0Misc.test.ts 2>&1', { encoding: 'utf8' })
  const pass = out.match(/(\d+) passed/)
  check(`onboarding + aiChat + misc 单元测试 ${pass ? pass[0] : '?'}`, () => !!pass)
} catch (e) {
  check('单元测试', () => false)
  fails.push('vitest failed: ' + e.message.slice(0, 200))
}

console.log(`\n${tests.length}/${tests.length} 通过`)
if (fails.length > 0) {
  console.log('\n失败明细:')
  fails.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
process.exit(0)
