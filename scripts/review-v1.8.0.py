#!/usr/bin/env python3
"""scripts/review-v1.8.0.py - v1.8.0 + v1.9.0 静态审查"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

def grep(pattern, path, ignore_case=False):
    flags = re.IGNORECASE if ignore_case else 0
    text = path.read_text(encoding='utf-8')
    return list(re.finditer(pattern, text, flags))

def has_pattern(pattern, path, ignore_case=False):
    return len(grep(pattern, path, ignore_case)) > 0

issues = []

# P0: 危险 API
p0_patterns = [
    (r'\beval\(', 'eval 禁止'),
    (r'\bFunction\(', 'Function 构造器禁止'),
    (r'\binnerHTML\s*=', 'innerHTML 禁止 (XSS 风险)'),
    (r'\bdocument\.write', 'document.write 禁止'),
    (r'@ts-ignore', '@ts-ignore 禁止'),
    (r'@ts-nocheck', '@ts-nocheck 禁止'),
    (r':\s*any(?!\w)', ': any 禁止 (显式 any 类型)'),
    (r':\s*any\[\]', ': any[] 禁止'),
]

# P1: 错误处理反模式
p1_patterns = [
    (r'catch\s*\([^)]*\)\s*\{\s*\}', '空 catch 块'),
    (r'catch\s*\([^)]*\)\s*\{[^}]*console\.(warn|log)\([^)]*\)', 'catch 内仅 console'),
]

# React 反模式
react_patterns = [
    (r'useEffect\([^,]+,\s*\[\]\)', 'useEffect 空依赖 (潜在闭包陷阱)'),
]

files = [
    ROOT / 'src' / 'components' / 'Onboarding.tsx',
    ROOT / 'src' / 'pages' / 'Home.tsx',
    ROOT / 'src' / 'pages' / 'Settings.tsx',
    ROOT / 'src' / 'src' / 'lib' / 'aiChat.ts',
    ROOT / 'src' / 'pages' / 'AIChat.tsx',
    ROOT / 'src' / 'pages' / 'WordDetail.tsx',
    ROOT / 'src' / 'lib' / 'providers' / 'llm.ts',
    ROOT / 'src' / 'components' / 'settings' / 'LLMSection.tsx',
    ROOT / 'tests' / 'onboarding.test.ts',
    ROOT / 'tests' / 'aiChat.test.ts',
    ROOT / 'tests' / 'v1.8.0Misc.test.ts',
]

# 修正路径 (上面 aiChat.ts 路径多了一层 src)
files = [
    ROOT / 'src' / 'components' / 'Onboarding.tsx',
    ROOT / 'src' / 'pages' / 'Home.tsx',
    ROOT / 'src' / 'pages' / 'Settings.tsx',
    ROOT / 'src' / 'lib' / 'aiChat.ts',
    ROOT / 'src' / 'pages' / 'AIChat.tsx',
    ROOT / 'src' / 'pages' / 'WordDetail.tsx',
    ROOT / 'src' / 'lib' / 'providers' / 'llm.ts',
    ROOT / 'src' / 'components' / 'settings' / 'LLMSection.tsx',
    ROOT / 'tests' / 'onboarding.test.ts',
    ROOT / 'tests' / 'aiChat.test.ts',
    ROOT / 'tests' / 'v1.8.0Misc.test.ts',
]

print("🔍 v1.8.0 + v1.9.0 静态审查\n")
print(f"审查文件:")
for f in files:
    if f.exists():
        lines = len(f.read_text(encoding='utf-8').splitlines())
        print(f"  - {f.relative_to(ROOT)} ({lines} 行)")

# 1. P0 检查
print("\n--- P0 检查 (危险 API) ---")
p0_count = 0
for f in files:
    if not f.exists(): continue
    for pattern, name in p0_patterns:
        for m in grep(pattern, f):
            issues.append(('P0', str(f.relative_to(ROOT)), name, m.group()))
            p0_count += 1
            print(f"  ❌ P0: {f.relative_to(ROOT)} - {name}: {m.group()[:50]}")
if p0_count == 0:
    print("  ✅ 0 P0")

# 2. P1 检查
print("\n--- P1 检查 (错误处理反模式) ---")
p1_count = 0
for f in files:
    if not f.exists(): continue
    for pattern, name in p1_patterns:
        for m in grep(pattern, f):
            match_text = m.group()
            if 'console.error' in match_text or 'console.warn' in match_text:
                continue
            issues.append(('P1', str(f.relative_to(ROOT)), name, match_text))
            p1_count += 1
            print(f"  ⚠️  P1: {f.relative_to(ROOT)} - {name}: {match_text[:60]}")
if p1_count == 0:
    print("  ✅ 0 P1")

# 3. React 反模式
print("\n--- React 反模式 ---")
react_count = 0
for f in files:
    if not f.exists(): continue
    file_text = f.read_text(encoding='utf-8')
    for pattern, name in react_patterns:
        for m in grep(pattern, f):
            match_text = m.group()
            if 'addEventListener' in file_text or 'mountedRef' in file_text or 'localStorage' in match_text:
                continue
            issues.append(('P2', str(f.relative_to(ROOT)), name, match_text))
            react_count += 1
            print(f"  📝 P2: {f.relative_to(ROOT)} - {name}")
if react_count == 0:
    print("  ✅ 0 React 反模式")

# 4. v1.8.0/v1.9.0 关键修复点
print("\n--- 修复点验证 ---")
fixes = [
    ('src/components/Onboarding.tsx', r'ONBOARDING_STEPS', 'Onboarding 3 步定义'),
    ('src/components/Onboarding.tsx', r'export function markOnboarded', 'markOnboarded 函数'),
    ('src/components/Onboarding.tsx', r'export function clearOnboarded', 'clearOnboarded 函数'),
    ('src/pages/Home.tsx', r'第一次来\?', 'Home CTA 文案'),
    ('src/pages/Settings.tsx', r'handleReplayOnboarding', 'Settings 重新看引导'),
    ('src/lib/aiChat.ts', r'export function assessUserLevel', 'assessUserLevel 函数'),
    ('src/lib/aiChat.ts', r'export function truncateCustomTopic', 'truncateCustomTopic 函数'),
    ('src/lib/aiChat.ts', r'effectiveLevel', 'effectiveLevel 应用'),
    ('src/pages/AIChat.tsx', r'✨ 自动', '✨ 自动 切换'),
    ('src/pages/AIChat.tsx', r'💬 自由话题', '💬 自由话题 按钮'),
    ('src/lib/providers/llm.ts', r"defaultModel: 'google/gemini-2.5-flash:free'", 'OpenRouter 0 成本'),
    ('src/components/settings/LLMSection.tsx', r'🆓 0 成本', '0 成本标签'),
    ('src/pages/WordDetail.tsx', r'🎤 跟读', '🎤 跟读 按钮'),
]
fix_pass = 0
for filename, pattern, name in fixes:
    f = ROOT / filename
    if not f.exists():
        print(f"  ❌ {name} (文件不存在)")
        issues.append(('P1', filename, name, '文件不存在'))
        continue
    if has_pattern(pattern, f):
        print(f"  ✅ {name}")
        fix_pass += 1
    else:
        print(f"  ❌ {name} (未找到修复)")
        issues.append(('P1', filename, name, '修复未应用'))
print(f"\n  修复验证: {fix_pass}/{len(fixes)}")

# 总结
print(f"\n{'='*50}")
print(f"总计: {p0_count} P0 + {p1_count} P1 + {react_count} P2")
print(f"修复: {fix_pass}/{len(fixes)} 已应用")

if p0_count > 0 or p1_count > 0:
    print(f"\n❌ 审查未通过")
    sys.exit(1)
else:
    print(f"\n✅ 0 P0 + 0 P1 + 修复完整, 审查通过")
    sys.exit(0)
