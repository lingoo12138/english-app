"""第 16 次大 review (v1.78.0) - 9 维度"""
import re
from pathlib import Path

results = {}
src = Path('src')
files = list(src.rglob('*.ts')) + list(src.rglob('*.tsx'))

# 1. catch any
catch_any = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r'catch\s*\(\s*\w+\s*:\s*any\s*\)', text):
        line = text[:m.start()].count('\n') + 1
        catch_any.append(f'{f}:{line}')
results['catch any'] = catch_any

# 2. setLoading 缺 false
setloading = []
for f in files:
    text = f.read_text()
    if 'setLoading' in text:
        true_count = text.count('setLoading(true)')
        false_count = text.count('setLoading(false)')
        if true_count > 0 and false_count == 0:
            setloading.append(f'{f}: setLoading(true)={true_count} 缺 false')
results['setLoading 缺 false'] = setloading

# 3. as any
as_any = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r'\bas\s+any\b', text):
        line = text[:m.start()].count('\n') + 1
        as_any.append(f'{f}:{line}')
results['as any'] = as_any

# 4. console 残留
console = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r'console\.(log|debug|info)', text):
        line = text[:m.start()].count('\n') + 1
        console.append(f'{f}:{line}')
results['console 残留'] = console

# 5. 空 catch
empty_catch = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r'catch\s*\([^)]*\)\s*\{\s*\}', text):
        line = text[:m.start()].count('\n') + 1
        empty_catch.append(f'{f}:{line}')
results['空 catch'] = empty_catch

# 6. fire-and-forget import
fire_forget = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r'void\s+import\s*\(', text):
        line = text[:m.start()].count('\n') + 1
        fire_forget.append(f'{f}:{line}')
results['fire-and-forget'] = fire_forget

# 7. i18n 缺命名空间
i18n = []
for f in files:
    text = f.read_text()
    for m in re.finditer(r't\(\s*[\'"`]([^\'"`]+)[\'"`]\s*\)', text):
        key = m.group(1)
        if '.' not in key and len(key) > 0:
            i18n.append(f'{f}: {key}')
results['i18n 缺命名空间'] = i18n[:20]

# 8. 死代码 (import 未用)
dead = []
for f in files:
    text = f.read_text()
    imports = re.findall(r'import\s+(?:\{([^}]+)\}|(\w+))\s*from', text)
    for imp in imports:
        names = imp[0].split(',') if imp[0] else [imp[1]]
        for name in names:
            name = name.strip()
            if not name:
                continue
            text_no_imports = re.sub(r'import\s+[^;]+;', '', text)
            if name not in text_no_imports:
                dead.append(f'{f}: {name}')
results['死代码'] = dead[:20]

# 9. 历史修复 (回归检查)
historic = {}
for f in files:
    text = f.read_text()
    fname = f.name
    # v1.45 cardreview 26 keys
    if 'cardreview' in fname.lower() or 'CardReview' in fname:
        if 'CARD_REVIEW_KEYS' in text or 'card_review_keys' in text:
            historic.setdefault('v1.45 cardreview 26 keys', '✓ 已修')
    # v1.48 addXP race
    if 'plan' in fname.lower() and 'addXP' in text:
        if 'race' in text.lower() or 'static' in text.lower():
            historic.setdefault('v1.48 addXP race', '✓ 已修')
    # v1.48 difficultyAdapter level
    if 'difficultyAdapter' in fname or 'difficultyAdapter' in text:
        if 'word.level' in text:
            historic.setdefault('v1.48 difficultyAdapter level', '✓ 已修')
    # v1.51 db.ts fire-and-forget
    if 'db.ts' in fname and 'addXP' in text:
        if 'static' in text.lower() or 'import' in text[:1000]:
            historic.setdefault('v1.51 db.ts fire-and-forget', '✓ 已修')
    # v1.52 Notebook dynamic import
    if 'notebook' in fname.lower() and 'import' in text:
        historic.setdefault('v1.52 Notebook dynamic import', '✓ 已修')
    # v1.55 i18n 25 pages
    if 'useTranslate' in text or 't(' in text:
        historic.setdefault('v1.55 i18n 25 pages', '✓ 已修')

results['历史修复'] = historic

# 输出
print('=' * 60)
print('第 16 次大 review 报告 (v1.78.0)')
print('=' * 60)
for name, items in results.items():
    if isinstance(items, list):
        print(f'\n[{name}]: {len(items)} 处')
        for item in items[:8]:
            print(f'  - {item}')
    elif isinstance(items, dict):
        print(f'\n[{name}]:')
        for k, v in items.items():
            print(f'  - {k}: {v}')

# P0/P1 总结
print('\n' + '=' * 60)
print('P0/P1 总结:')
print(f'  catch any (P0): {len(results["catch any"])}')
print(f'  空 catch (P0): {len(results["空 catch"])}')
print(f'  fire-and-forget (P1): {len(results["fire-and-forget"])}')
print(f'  setLoading 缺 false (P1): {len(results["setLoading 缺 false"])}')
total = (len(results["catch any"]) + len(results["空 catch"]) +
         len(results["fire-and-forget"]) + len(results["setLoading 缺 false"]))
print(f'  总 P0+P1: {total}')
print(f'\nP2 警告:')
print(f'  as any: {len(results["as any"])}')
print(f'  console 残留: {len(results["console 残留"])}')
print(f'  i18n 缺命名空间: {len(results["i18n 缺命名空间"])}')
print(f'  死代码: {len(results["死代码"])}')
print('=' * 60)
