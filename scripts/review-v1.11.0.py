#!/usr/bin/env python3
"""scripts/review-v1.11.0.py - v1.11.0 W12 静态审查"""
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

p1_patterns = [
    (r'catch\s*\([^)]*\)\s*\{\s*\}', '空 catch 块'),
    (r'catch\s*\([^)]*\)\s*\{[^}]*console\.(warn|log)\([^)]*\)', 'catch 内仅 console'),
]

react_patterns = [
    (r'useEffect\([^,]+,\s*\[\]\)', 'useEffect 空依赖 (潜在闭包陷阱)'),
]

files = [
    ROOT / 'src' / 'lib' / 'fsrs.ts',
    ROOT / 'src' / 'lib' / 'plan.ts',
    ROOT / 'src' / 'lib' / 'reviewQueue.ts',
    ROOT / 'src' / 'pages' / 'ReviewCenter.tsx',
    ROOT / 'src' / 'lib' / 'learningReport.ts',
    ROOT / 'src' / 'pages' / 'ReportsPage.tsx',
    ROOT / 'src' / 'App.tsx',
    ROOT / 'src' / 'pages' / 'Home.tsx',
    ROOT / 'tests' / 'fsrs.test.ts',
    ROOT / 'tests' / 'reviewQueue.test.ts',
    ROOT / 'tests' / 'learningReport.test.ts',
]

print("🔍 v1.11.0 + W12 静态审查\n")
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

# 4. v1.11.0 修复点验证
print("\n--- 修复点验证 ---")
fixes = [
    ('src/lib/fsrs.ts', r'export function initFSRS', 'initFSRS 函数'),
    ('src/lib/fsrs.ts', r'export function reviewFSRS', 'reviewFSRS 函数'),
    ('src/lib/fsrs.ts', r'export function fromSM2', 'FSRS↔SM-2 转换'),
    ('src/lib/reviewQueue.ts', r'scoreReviewItem', 'scoreReviewItem 函数'),
    ('src/lib/reviewQueue.ts', r'sortReviewQueue', 'sortReviewQueue 函数'),
    ('src/pages/ReviewCenter.tsx', r'sortReviewQueue', 'ReviewCenter 引用 sortReviewQueue'),
    ('src/pages/ReviewCenter.tsx', r'smartSort', 'ReviewCenter smartSort 切换'),
    ('src/lib/learningReport.ts', r'getDailyReport', 'getDailyReport 函数'),
    ('src/lib/learningReport.ts', r'getWeeklyReport', 'getWeeklyReport 函数'),
    ('src/lib/learningReport.ts', r'getEncouragement', 'getEncouragement 函数'),
    ('src/pages/ReportsPage.tsx', r'今日日报', 'ReportsPage 日报 Tab'),
    ('src/pages/ReportsPage.tsx', r'本周周报', 'ReportsPage 周报 Tab'),
    ('src/App.tsx', r'ReportsPage', 'App.tsx ReportsPage 路由'),
    ('src/pages/Home.tsx', r'📊', 'Home.tsx 📊 日报入口'),
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
