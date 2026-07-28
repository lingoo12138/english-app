#!/usr/bin/env python3
"""scripts/big-review-v1.59.py - W52 第 15 次大 review + 9 维度 (死代码扫描)
累积 5 release tag (v1.52-v1.59)"""
import os
import re
import sys
from collections import defaultdict

print("=" * 70)
print("大 review v1.59 — v1.52-v1.59 累积 5 release (第 15 次, 9 维度)")
print("=" * 70)

V152_157_FILES = [
    'i18n', 'useTranslate', 'Notebook', 'WordList', 'ErrorsPage', 'DailyPage', 'CalendarPage',
    'WordDetail', 'AIChat', 'WritePage', 'Translate', 'CustomScenes', 'CustomSceneDetail',
    'CustomSceneLearn', 'ReviewCenter', 'LearnReport', 'Scenes', 'Achievements',
    'difficultyAdapter', 'xpSystem', 'addXP', 'markWordCompleted', 'errorStats',
    'plan', 'i18nKeyCoverage', 'big-review',
]

# 1-8 维度同 v1.56
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
    print("✓ 0 残留")
else:
    print(f"✗ {len(ca)} 处")

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
    print(f"✓ 全部 {sum(t for t, _ in loading.values())} 处配对")
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
print(f"  总: {len(as_any)} (大多豁免)")

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
print(f"  总: {len(ce)}")

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
    print("✓ 0 空 catch")
else:
    print(f"⚠ {len(empty_catch)} 处")

# 6. i18n 完整性
print("\n## 6. i18n 完整性")
def scan_t_calls():
    result = set()
    for root, _, files in os.walk('src/pages'):
        for f in files:
            if not (f.endswith('.tsx') or f.endswith('.ts')): continue
            content = open(os.path.join(root, f), encoding='utf-8').read()
            for m in re.finditer(r'\bt\(\s*[\'"]([^\'"]+)[\'"]', content):
                result.add(m.group(1))
    return result
t_keys = scan_t_calls()
with open('src/lib/i18n.ts', encoding='utf-8') as f:
    i18n_content = f.read()
dict_keys = set()
for m in re.finditer(r"'([a-z._][a-z0-9._]*)'", i18n_content):
    if f"'{m.group(1)}':" in i18n_content:
        dict_keys.add(m.group(1))
print(f"  扫到 t() 调用: {len(t_keys)} keys")
print(f"  DICT 中: {len(dict_keys)} keys")
missing = t_keys - dict_keys
if not missing:
    print(f"✓ 0 missing")
else:
    print(f"⚠ {len(missing)} missing: {list(missing)[:5]}")

# 7. fire-and-forget
print("\n## 7. fire-and-forget dynamic import (防 verifier4 P1-B 回归)")
ff = []
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"await import\(.*\)\.then\(", line):
                ff.append((fp, i, line.strip()))
if not ff:
    print("✓ 0 fire-and-forget")
else:
    print(f"⚠ {len(ff)} 处")

# 8. 历史 review 修复
print("\n## 8. 历史 review 修复 维持")
fixed = [
    ('src/lib/exportChat.ts', 'catch (e: unknown)', 'v1.36 #1'),
    ('src/lib/migrate.ts', 'catch (e: unknown)', 'v1.36 #2'),
    ('src/lib/plan.ts', 'addXP(XP_REWARDS.LEARN', 'v1.48 addXP 同步'),
    ('src/lib/db.ts', 'await addXP(XP_REWARDS.FAVORITE', 'v1.51 db.ts 静态'),
    ('src/pages/PlanPage.tsx', 'xpState.progress * 100', 'v1.48 XP width'),
]
for fp, pattern, label in fixed:
    if os.path.exists(fp):
        if pattern in open(fp, encoding='utf-8').read():
            print(f"  ✓ {label}")
        else:
            print(f"  ✗ {label}: 缺 '{pattern[:30]}'")

# 9. 死代码扫描 (新维度)
print("\n## 9. 死代码扫描 (新维度, W52 加)")
# 扫 import 但 0 调用的变量 (简单 grep, 不严格)
# 扫 export 但 0 import (跨文件)
exports = defaultdict(list)  # name -> [file]
imports = defaultdict(list)  # name -> [file]
for root, _, files in os.walk('src/'):
    for f in files:
        if not (f.endswith('.ts') or f.endswith('.tsx')): continue
        fp = os.path.join(root, f)
        if '/data/' in fp: continue
        content = open(fp, encoding='utf-8').read()
        # 找 export function/const
        for m in re.finditer(r'export\s+(?:async\s+)?function\s+(\w+)', content):
            exports[m.group(1)].append(fp)
        for m in re.finditer(r'export\s+const\s+(\w+)', content):
            exports[m.group(1)].append(fp)
        # 找 import { name }
        for m in re.finditer(r'import\s*\{([^}]+)\}\s*from', content):
            for name in m.group(1).split(','):
                name = name.strip().split(' as ')[0].strip()
                if name and name != 'type':
                    imports[name].append(fp)

# 找 export 但 0 跨文件 import (排除 type, 排除 react-hook 等系统)
dead_exports = []
system_names = {'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'createContext', 'useContext', 'Component'}
for name, files in exports.items():
    if name in system_names: continue
    if name not in imports:
        # 排除自身
        other = [f for f in files if f not in imports.get(name, [])]
        if other:
            dead_exports.append((name, files))

if not dead_exports:
    print("✓ 0 死 export (跨文件未引用)")
else:
    # 误报多: 组件 export 是默认的 (JSX 用 <Name />), utils 子函数也误报
    # 提示信息而不是 fail, 需手动分析
    real_dead = [(n, fs) for n, fs in dead_exports if not n[0].isupper() and not n.startswith('use')]
    if not real_dead:
        print(f"⚠ {len(dead_exports)} 候选 (多为组件/hook, 正常, 跳过)")
    else:
        print(f"⚠ {len(real_dead)} 真候选死 export (utils 函数):")
        for name, files in real_dead[:5]:
            print(f"  {name} in {os.path.basename(files[0])}")
        if len(real_dead) > 5:
            print(f"  ... +{len(real_dead) - 5} more")

# 总结
print("\n" + "=" * 70)
p0 = len(ca) + len(empty_catch) + len(unmatched) + len(missing) + len(ff)
p1 = 0  # 死代码是警告不报 P1, 需手动分析
print(f"P0={p0} (死 export {len(dead_exports)} 提示, 不计入 P1)")
print("=" * 70)
sys.exit(0 if p0 == 0 else 1)
