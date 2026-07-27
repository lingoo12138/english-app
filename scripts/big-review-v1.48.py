#!/usr/bin/env python3
"""scripts/big-review-v1.48.py - W46 第 7 次大 review (v1.45-v1.48 累积 4 release + 3 P1 fix)"""
import os
import re
import sys
from collections import defaultdict

print("=" * 70)
print("大 review v1.48 — v1.45-v1.48 累积 4 release (第 7 次)")
print("=" * 70)

# v1.45-v1.48 新代码
V145_148_FILES = [
    'i18n', 'useTranslate', 'CardReview', 'ReportsPage', 'Home', 'PlanPage', 'Settings',
    'difficultyAdapter', 'xpSystem', 'markWordCompleted', 'addXP', 'XP_REWARDS',
    'i18nKeyCoverage', 'i18nMigration', 'WordLevel', 'getRecommendedWords', 'getAdaptiveLevel',
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
if not ca:
    print("✓ 0 残留 (v1.22 + v1.36 双 review 维持)")
else:
    print(f"✗ {len(ca)} 处:")
    for fp, ln, l in ca[:5]:
        print(f"  {fp}:{ln}: {l[:70]}")

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
new_as_any = [(fp, ln, l) for fp, ln, l in as_any if any(n in fp for n in V145_148_FILES)]
print(f"  总: {len(as_any)} (大多豁免)")
print(f"  v1.45-v1.48 新增: {len(new_as_any)}")

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
new_ce = [(fp, ln, l) for fp, ln, l in ce if any(n in fp for n in V145_148_FILES)]
print(f"  总: {len(ce)}, v1.45-v1.48 新增: {len(new_ce)}")

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

# 6. i18n 完整性 (新维度 7, W45 verifier1 触发)
print("\n## 6. i18n 完整性 (新维度)")
import re as re_mod
def scan_t_calls():
    result = set()
    pages = 'src/pages'
    for root, _, files in os.walk(pages):
        for f in files:
            if not (f.endswith('.tsx') or f.endswith('.ts')): continue
            full = os.path.join(root, f)
            content = open(full, encoding='utf-8').read()
            for m in re_mod.finditer(r'\bt\(\s*[\'"]([^\'"]+)[\'"]', content):
                result.add(m.group(1))
    return result

t_keys = scan_t_calls()
print(f"  扫到 t() 调用: {len(t_keys)} keys")
# 检查 DICT 是否覆盖
with open('src/lib/i18n.ts', encoding='utf-8') as f:
    i18n_content = f.read()
# 简单 grep DICT 找 key
dict_keys = set()
for m in re_mod.finditer(r"'([a-z._][a-z0-9._]*)'", i18n_content):
    # DICT 形式: 'key': 'value', 在 DICT 块内
    if f"'{m.group(1)}':" in i18n_content:
        dict_keys.add(m.group(1))
print(f"  DICT 中: {len(dict_keys)} keys")
missing = t_keys - dict_keys
if not missing:
    print(f"✓ 0 missing (DICT 完整)")
else:
    print(f"⚠ {len(missing)} missing: {list(missing)[:5]}")

# 7. 历史 review 修复 维持
print("\n## 7. 历史 review 修复 维持")
fixed = [
    ('src/lib/exportChat.ts', 'catch (e: unknown)', 'v1.36 #1'),
    ('src/lib/migrate.ts', 'catch (e: unknown)', 'v1.36 #2'),
    ('src/lib/plan.ts', 'addXP(XP_REWARDS.LEARN, \'LEARN\')', 'v1.48 addXP 同步'),
    ('src/pages/PlanPage.tsx', 'xpState.progress * 100', 'v1.48 XP 进度条 width 修'),
    ('src/lib/difficultyAdapter.ts', '学段 8 档', 'v1.48 difficultyAdapter 改学段'),
]
for fp, pattern, label in fixed:
    if os.path.exists(fp):
        if pattern in open(fp, encoding='utf-8').read():
            print(f"  ✓ {label}: 含 '{pattern[:30]}'")
        else:
            print(f"  ✗ {label}: 缺 '{pattern[:30]}'")

# 总结
print("\n" + "=" * 70)
p0 = len(ca) + len(empty_catch) + len(unmatched) + len(missing)
p1_new = len(new_as_any) + len(new_ce)
print(f"P0={p0} (含 i18n 完整性) 新 P1={p1_new}")
print("=" * 70)
sys.exit(0 if p0 == 0 else 1)
