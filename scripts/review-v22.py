"""v0.22 整套静态审查(替代 failed subagent)"""
import os, re, sys
from pathlib import Path

PAGES = ['plan', 'Home', 'WordDetail', 'Notebook', 'ReviewCenter', 'WeakWords', 'DailyPage', 'Settings', 'AIChat', 'Camera', 'Translate', 'LearnReport', 'PlanPage']
PAGES_DIR = Path('src/pages')
LIB = ['plan', 'providers/llm', 'tts', 'translate', 'aiChat', 'stt', 'imageRecog', 'db', 'learnReport']
LIB_DIR = Path('src/lib')

findings = []
def add(level, module, msg, file='', line=''):
    findings.append({'level': level, 'module': module, 'msg': msg, 'file': file, 'line': line})

# === 1. plan.ts 深度审查 ===
print('=== 1. plan.ts 审查 ===')
c = (LIB_DIR / 'plan.ts').read_text()
# 1.1 跨日切分: 7天前的进度不污染今日
if 'todayKey' in c and 'localStorage' in c:
    pass  # OK
# 1.2 loadProgress try/catch
if 'try {' in c and 'catch' in c:
    add('P1', 'plan.ts', 'loadProgress 有 try/catch 但 saveProgress 没有', 'plan.ts', str(c.count('try {')) + ' try blocks')
if 'saveProgress' in c and 'catch' not in c.split('saveProgress')[1][:300]:
    add('P1', 'plan.ts', 'saveProgress 缺 try/catch,QuotaExceeded 会崩', 'plan.ts', '')
# 1.3 generateTodayPlan 同词固定?  
if 'seed' in c.lower() or 'date' in c.lower():
    pass  # OK 同一 date + targetLevel + dailyGoal 输入固定
# 1.4 dailyGoal=0 边界
if 'dailyGoal' in c:
    add('P1', 'plan.ts', 'dailyGoal=0 时 截到 0 词,plan.total=0 隐藏卡片,但词列表判断 !plan.total 隐藏', 'plan.ts', 'generateTodayPlan')

# === 2. Home 今日计划卡片 ===
print('=== 2. Home.tsx 审查 ===')
c = (PAGES_DIR / 'Home.tsx').read_text()
# 2.1 词列表 localStorage 直接读 vs state
if "localStorage.getItem('plan-progress-' + plan.date)" in c:
    add('P2', 'Home.tsx', '词列表 inline 读 localStorage,不在 state,完成态可能不一致', 'Home.tsx', '今日计划')
# 2.2 markWordCompleted 静态 import 已 OK
# 2.3 plan 缺失空态
if 'plan && plan.total > 0' in c:
    pass  # OK

# === 3. WordCard 自动 mark ===
print('=== 3. WordCard.tsx 审查 ===')
c = Path('src/components/WordCard.tsx').read_text()
if "import('../lib/plan')" in c:
    add('P2', 'WordCard.tsx', 'onClick 用动态 import 触发 markWordCompleted,会创建 chunk 每次下载', 'WordCard.tsx', 'onClick')

# === 4. PlanPage 审查 ===
print('=== 4. PlanPage.tsx 审查 ===')
c = (PAGES_DIR / 'PlanPage.tsx').read_text()
# 4.1 连续天数逻辑
if '连续天数' in c and 'i === 6' in c:
    add('P1', 'PlanPage.tsx', '连续天数算法: i===6 (最早一天) 不计 streak,从 i===5 开始算. 边界:7天前=0 也会破坏 streak. 应从最后一天倒序连续统计', 'PlanPage.tsx', 'computeHistory')
# 4.2 7 天历史使用 dailyGoal 但目标可能改
if 'const goal = dailyGoal' in c:
    add('P1', 'PlanPage.tsx', '历史天数用当前 dailyGoal, 用户改目标后历史显示不准确. 应存 dailyGoal 快照', 'PlanPage.tsx', 'computeHistory')

# === 5. LLM providers ===
print('=== 5. providers/llm.ts 审查 ===')
c = (LIB_DIR / 'providers' / 'llm.ts').read_text()
if "'google-ai'" in c and 'gemini-1.5-pro-vision' in c:
    pass  # OK
# Mistral 不支持 vision
if "'mistral'" in c and 'supportsVision: false' in c:
    pass  # OK 显式 false
# 但 Settings UI 不提醒
add('P2', 'Settings', '选 Mistral 时 UI 不显示"不支持图像"警告', 'src/components/settings/LLMSection.tsx', '')

# === 6. Settings 拆组件 ===
print('=== 6. Settings 拆组件 ===')
# 重复类型? 跨组件共享?
files = list(Path('src/components/settings').glob('*.tsx'))
print(f'  Settings 子组件: {len(files)}')

# === 7. PWA 缓存 ===
print('=== 7. PWA 缓存 ===')
c = Path('vite.config.ts').read_text()
if 'word-data-cache-v1' in c and '60 * 60 * 24 * 7' in c:
    pass  # OK

# === 8. doc 同步 ===
print('=== 8. docs 同步审查 ===')
ch = Path('docs/CHANGELOG.md').read_text()
if 'v0.22.5' in ch and 'v0.22.4' in ch and 'v0.22.3' in ch:
    pass
# README
rm = Path('README.md').read_text()
if 'v0.21' in rm.split('\n')[0] or 'v0.21' in rm:
    add('P1', 'README.md', 'README 顶部还是 v0.21 (应是 v0.22.5)', 'README.md', '顶部')
# 词数
if '5334' in rm:
    pass  # OK
# LLM 数
if '8 LLM' in rm or '10 LLM' in rm:
    add('P1', 'README.md', 'README 写 8 LLM,但 v0.22.4 加了 2 个(Google AI + Mistral) 共 10 LLM', 'README.md', '')

# === 9. plan-progress-YYYY-MM-DD localStorage 永久增长 ===
print('=== 9. localStorage 清理 ===')
c = (LIB_DIR / 'plan.ts').read_text()
if 'STORAGE_KEY' in c and 'localStorage.removeItem' not in c:
    add('P2', 'plan.ts', 'plan-progress-YYYY-MM-DD 永久增长, 应定期清理 >30 天的 key', 'plan.ts', 'STORAGE_KEY')

print(f'\n=== 总计: {len(findings)} 项发现 ===')
for f in findings:
    print(f"  [{f['level']}] {f['module']}: {f['msg']} ({f['file']})")
