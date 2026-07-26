#!/usr/bin/env python3
"""scripts/big-review-v1.39.py - 3 版本累积大 review (v1.37-v1.39)"""
import os
import re
import sys
from collections import defaultdict

print("=" * 70)
print("大 review v1.39 — v1.37-v1.39 累积 3 版本")
print("=" * 70)

V137_139_FILES = [
    'InAppBanner', 'MultiRoleContent', 'TTSSection',
    'darkMode', 'themes.ts', 'App.tsx',
    'ErrorsPage', 'WritePage', 'CardReview', 'PlanPage', 'Notebook',
    'aiPlanGenerator', 'phraseCards', 'tagSuggest', 'errorStats', 'writingTemplates',
    'slideDown',
]

# 1. catch (e: any) 残留
print("\n## 1. catch (e: any) 残留")
ca_files = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')):
            continue
        fp = os.path.join(root, f)
        content = open(fp, encoding='utf-8').read()
        for i, line in enumerate(content.split('\n'), 1):
            if re.search(r"catch\s*\(\s*e\s*:\s*any\s*\)", line):
                ca_files.append((fp, i, line.strip()))
new_ca = [(fp, ln, l) for fp, ln, l in ca_files if any(n in fp for n in V137_139_FILES)]
if not ca_files:
    print("✓ 0 残留 (v1.22 review 维持)")
else:
    print(f"✗ {len(ca_files)} 处:")
    for fp, ln, l in ca_files[:10]:
        print(f"  {fp}:{ln}: {l[:80]}")
    if new_ca:
        print(f"  其中 v1.37-v1.39 新增: {len(new_ca)} 处")

# 2. setLoading(true) 配对
print("\n## 2. setLoading(true) 配对")
loading_files = defaultdict(lambda: [0, 0])
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')):
            continue
        fp = os.path.join(root, f)
        content = open(fp, encoding='utf-8').read()
        for line in content.split('\n'):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            if 'setLoading(true)' in line:
                loading_files[fp][0] += 1
            if 'setLoading(false)' in line:
                loading_files[fp][1] += 1
unmatched = [(fp, t, f) for fp, (t, f) in loading_files.items() if t > 0 and t != f]
new_unmatched = [(fp, t, f) for fp, t, f in unmatched if any(n in fp for n in V137_139_FILES)]
if not unmatched:
    print(f"✓ 全部 {sum(t for t, _ in loading_files.values())} 处 setLoading(true) 配对正确")
else:
    print(f"⚠ {len(unmatched)} 个文件配对不平衡:")
    for fp, t, f in unmatched[:5]:
        print(f"  {os.path.basename(fp)}: true={t} false={f}")
    if new_unmatched:
        print(f"  其中 v1.37-v1.39 新增: {len(new_unmatched)} 处")

# 3. as any 残留
print("\n## 3. as any 残留")
as_any = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')):
            continue
        fp = os.path.join(root, f)
        content = open(fp, encoding='utf-8').read()
        for i, line in enumerate(content.split('\n'), 1):
            if re.search(r"\s+as\s+any\b", line) and '//' not in line.split('as any')[0]:
                as_any.append((fp, i, line.strip()))
new_as_any = [(fp, ln, l) for fp, ln, l in as_any if any(n in fp for n in V137_139_FILES)]
print(f"  总: {len(as_any)} 处 (大多豁免: type literal / 浏览器 API 兜底)")
print(f"  v1.37-v1.39 新增: {len(new_as_any)} 处")
if new_as_any:
    for fp, ln, l in new_as_any[:5]:
        print(f"    {os.path.basename(fp)}:{ln}: {l[:70]}")

# 4. console.error/warn 守卫
print("\n## 4. console.error/warn 总览")
ce = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')):
            continue
        fp = os.path.join(root, f)
        content = open(fp, encoding='utf-8').read()
        for i, line in enumerate(content.split('\n'), 1):
            if re.search(r"console\.(error|warn)", line) and 'useState' not in line and '//' not in line.split('console')[0]:
                ce.append((fp, i, line.strip()))
new_ce = [(fp, ln, l) for fp, ln, l in ce if any(n in fp for n in V137_139_FILES)]
print(f"  总: {len(ce)} 处")
print(f"  v1.37-v1.39 新增: {len(new_ce)} 处")

# 5. v1.36 修的 3 处 维持
print("\n## 5. v1.36 大 review 修复 3 处 维持")
fixed_3 = [
    ('src/lib/exportChat.ts', 'catch (e: unknown)', 'P1 #1 catch unknown'),
    ('src/lib/migrate.ts', 'catch (e: unknown)', 'P1 #2 catch unknown'),
    ('src/lib/learningReport.ts', 'e.original', 'P2 死代码 e.wordId 删'),
]
for fp, pattern, label in fixed_3:
    if os.path.exists(fp) and pattern in open(fp, encoding='utf-8').read():
        print(f"  ✓ {label}: {os.path.basename(fp)} 包含 '{pattern}'")
    else:
        print(f"  ✗ {label}: {fp} 缺失")

# 6. v1.6/22 review 维持
print("\n## 6. v1.6/v1.22 维持")
critical = [
    ('src/pages/WritePage.tsx', 'handleHistoryItem', 'v1.6-1'),
    ('src/pages/AIChat.tsx', 'MAX_INPUT = 500', 'v1.6-7'),
    ('src/components/UsageButton.tsx', '暂无数据', 'v1.6-10'),
    ('src/lib/learningReport.ts', 'catch { return default }', 'v1.22 静默返回'),
]
for fp, pattern, label in critical:
    if os.path.exists(fp) and pattern in open(fp, encoding='utf-8').read():
        print(f"  ✓ {label}: {os.path.basename(fp)}")
    else:
        print(f"  ✗ {label}: {fp} 缺失 '{pattern}'")

# 总结
print("\n" + "=" * 70)
print("总结:")
print(f"  catch (e: any): {len(ca_files)} 总 / {len(new_ca)} 新")
print(f"  setLoading 不平衡: {len(unmatched)} 总 / {len(new_unmatched)} 新")
print(f"  as any: {len(as_any)} 总 / {len(new_as_any)} 新")
print(f"  console: {len(ce)} 总 / {len(new_ce)} 新")
print("=" * 70)

p0 = len(ca_files) + len(unmatched)
p1_new = len(new_as_any) + len(new_ca) + len(new_unmatched)

if p0 == 0 and p1_new == 0:
    print("\n✓ 0 P0 + 0 新 P1 — 大 review 通过, 3 版本质量干净")
    sys.exit(0)
else:
    print(f"\n⚠ P0={p0} 新 P1={p1_new} — 需修")
    sys.exit(1)
