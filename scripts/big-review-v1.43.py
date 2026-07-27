#!/usr/bin/env python3
"""scripts/big-review-v1.43.py - W44 第 6 次大 review (v1.23-v1.43 累积 21 release)"""
import os
import re
import sys
from collections import defaultdict

print("=" * 70)
print("大 review v1.43 — v1.23-v1.43 累积 21 release tag (第 6 次)")
print("=" * 70)

# v1.23-v1.43 新代码
V123_143_FILES = [
    'pdfUpload', 'reminderContent', 'chatRoles', 'learningReport',
    'wordTags', 'tagSuggest', 'writingTemplates', 'aiPlanGenerator',
    'inAppReminder', 'errorStats', 'phraseCards', 'i18n', 'useTranslate',
    'streak', 'STREAK_MILESTONES', 'MultiRoleSelector', 'InAppBanner',
    'MultiRoleContent', 'TTSSection', 'themes.ts', 'App.tsx',
    'ErrorsPage', 'WritePage', 'CardReview', 'PlanPage', 'Notebook',
    'levelTrend', 'getLevelTrend', 'difficultyToCEFR',
    'slideDown', 'dark-contrast-fix',
    # v1.43 新
    'difficultyAdapter', 'xpSystem', 'addXP', 'getXPState',
]

# 1. catch (e: any)
print("\n## 1. catch (e: any) 残留")
ca = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"catch\s*\(\s*e\s*:\s*any\s*\)", line):
                ca.append((fp, i, line.strip()))
new_ca = [(fp, ln, l) for fp, ln, l in ca if any(n in fp for n in V123_143_FILES)]
if not ca:
    print("✓ 0 残留 (v1.22 + v1.36 双 review 维持)")
else:
    print(f"✗ {len(ca)} 处:")
    for fp, ln, l in ca[:5]:
        print(f"  {fp}:{ln}: {l[:70]}")
    if new_ca: print(f"  其中 v1.23-v1.43 新增: {len(new_ca)} 处")

# 2. setLoading
print("\n## 2. setLoading 配对")
loading = defaultdict(lambda: [0, 0])
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for line in open(fp, encoding='utf-8').read().split('\n'):
            if line.strip().startswith(('//', '*')): continue
            if 'setLoading(true)' in line: loading[fp][0] += 1
            if 'setLoading(false)' in line: loading[fp][1] += 1
unmatched = [(fp, t, f) for fp, (t, f) in loading.items() if t > 0 and t != f]
new_unmatched = [(fp, t, f) for fp, t, f in unmatched if any(n in fp for n in V123_143_FILES)]
if not unmatched:
    print(f"✓ 全部 {sum(t for t, _ in loading.values())} 处配对正确")
else:
    print(f"⚠ {len(unmatched)} 个文件不平衡")

# 3. as any
print("\n## 3. as any 残留")
as_any = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"\s+as\s+any\b", line) and '//' not in line.split('as any')[0]:
                as_any.append((fp, i, line.strip()))
new_as_any = [(fp, ln, l) for fp, ln, l in as_any if any(n in fp for n in V123_143_FILES)]
print(f"  总: {len(as_any)} (大多豁免)")
print(f"  v1.23-v1.43 新增: {len(new_as_any)}")

# 4. console
print("\n## 4. console.error/warn")
ce = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"console\.(error|warn)", line) and 'useState' not in line and '//' not in line.split('console')[0]:
                ce.append((fp, i, line.strip()))
new_ce = [(fp, ln, l) for fp, ln, l in ce if any(n in fp for n in V123_143_FILES)]
print(f"  总: {len(ce)}, v1.23-v1.43 新增: {len(new_ce)}")

# 5. 空 catch
print("\n## 5. 空 catch {} 残留")
empty_catch = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"catch\s*\([^)]+\)\s*\{\s*\}", line):
                empty_catch.append((fp, i, line.strip()))
if not empty_catch:
    print("✓ 0 空 catch (v1.36 维持)")
else:
    print(f"⚠ {len(empty_catch)} 处")

# 6. 历史 review 修复 维持
print("\n## 6. 历史 review 修复 维持 (v1.22 + v1.36 + v1.40.1)")
fixed = [
    ('src/lib/exportChat.ts', 'catch (e: unknown)', 'v1.36 #1'),
    ('src/lib/migrate.ts', 'catch (e: unknown)', 'v1.36 #2'),
    ('src/lib/themes.ts', 'export function isDarkMode', 'v1.40.1 删 isDarkMode/toggleDarkMode/initDarkMode', True),
]
for fp, pattern, label, *rev in fixed:
    is_rev = len(rev) > 0 and rev[0]
    if os.path.exists(fp):
        if is_rev:
            if pattern in open(fp, encoding='utf-8').read():
                print(f"  ✗ {label}: {os.path.basename(fp)} 仍含 '{pattern}'")
            else:
                print(f"  ✓ {label}: {os.path.basename(fp)} 已删 '{pattern}'")
        else:
            if pattern in open(fp, encoding='utf-8').read():
                print(f"  ✓ {label}: {os.path.basename(fp)} 含 '{pattern}'")
            else:
                print(f"  ✗ {label}: {fp} 缺 '{pattern}'")

# 总结
print("\n" + "=" * 70)
p0 = len(ca) + len(empty_catch) + len(unmatched)
p1_new = len(new_ca) + len(new_unmatched) + len(new_as_any) + len(new_ce)
print(f"P0={p0} 新 P1={p1_new} (as any 豁免不计)")
print("=" * 70)
sys.exit(0 if p0 == 0 else 1)
