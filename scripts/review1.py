"""Reviewer 1: 核心学习模块静态审查"""
import os, re, sys
from pathlib import Path

PAGES = ['WordList', 'WordDetail', 'Notebook', 'ReviewCenter', 'WeakWords', 'DailyPage', 'Home']
PAGES_DIR = Path('src/pages')

findings = []

def add(level, module, msg, file='', line=''):
    findings.append({'level': level, 'module': module, 'msg': msg, 'file': file, 'line': line})

# === 通用: 错误处理 ===
print('=== 1. 错误处理审查 ===')
for p in PAGES:
    f = PAGES_DIR / f'{p}.tsx'
    if not f.exists(): continue
    c = f.read_text()
    # 1.1 async 函数没有 try-catch
    for m in re.finditer(r'async\s+(\w+)\s*\(', c):
        name = m.group(1)
        # 找函数体是否在 200 行内有 try/catch
        start = m.start()
        end = min(start + 600, len(c))
        body = c[start:end]
        if 'try {' not in body and 'catch' not in body and name not in ('refresh', 'loadChat', 'handleDeleteChat'):
            # 看是不是 event handler
            if 'onClick' in c[max(0,start-100):start] or 'onChange' in c[max(0,start-100):start]:
                continue
            add('P1', p, f'async 函数 {name}() 无 try-catch 错误处理', f.name, c[:start].count('\n')+1)

# === WordList ===
print('=== 2. WordList 审查 ===')
c = (PAGES_DIR / 'WordList.tsx').read_text()
# 2.1 搜索 debounce
if 'debounce' in c or 'setTimeout' in c and 'search' in c:
    pass  # OK
else:
    add('P2', 'WordList', '搜索框可能没 debounce,输入频繁触发')
# 2.2 字母索引
if 'alphabet' not in c.lower() and 'letter' not in c.lower() and 'A-Z' not in c:
    add('P2', 'WordList', '可能缺字母索引')
# 2.3 URL search params 处理
if 'useSearchParams' in c and 'parseInt' in c:
    pass  # OK

# === WordDetail ===
print('=== 3. WordDetail 审查 ===')
c = (PAGES_DIR / 'WordDetail.tsx').read_text()
# 3.1 词不存在处理
if 'word not found' in c.lower() or 'word' in c and '?.id' in c or 'word ==' in c or 'word?' in c:
    pass
else:
    add('P1', 'WordDetail', '可能没处理 word 不存在的边界情况')
# 3.2 切词 reset
if 'useEffect' in c and 'id' in c:
    pass
# 3.3 相邻词导航
if 'prev' in c.lower() and 'next' in c.lower():
    pass
else:
    add('P2', 'WordDetail', '可能缺相邻词导航')

# === Notebook ===
print('=== 4. Notebook 审查 ===')
c = (PAGES_DIR / 'Notebook.tsx').read_text()
# 4.1 空状态
if '还没有' in c or '空' in c or 'empty' in c.lower():
    pass
else:
    add('P2', 'Notebook', '可能缺空状态')
# 4.2 删除确认
if 'confirm' in c:
    pass
else:
    add('P2', 'Notebook', '删除生词可能没确认对话框')

# === ReviewCenter ===
print('=== 5. ReviewCenter 审查 ===')
c = (PAGES_DIR / 'ReviewCenter.tsx').read_text()
# 5.1 当前词索引
if 'currentIndex' in c:
    pass
# 5.2 完成状态
if '完成' in c or 'complete' in c.lower() or 'done' in c.lower():
    pass
else:
    add('P2', 'ReviewCenter', '可能缺复习完成提示')

# === WeakWords ===
print('=== 6. WeakWords 审查 ===')
c = (PAGES_DIR / 'WeakWords.tsx').read_text()
# 6.1 empty state
if '没有' in c or 'empty' in c.lower():
    pass
else:
    add('P2', 'WeakWords', '可能缺空状态(没错题时)')

# === Home ===
print('=== 7. Home 审查 ===')
c = (PAGES_DIR / 'Home.tsx').read_text()
# 7.1 学习统计
if 'stats' in c or 'count' in c:
    pass
# 7.2 每日一句
if 'daily' in c.lower():
    pass

print(f'\n=== Reviewer 1 完成: {len(findings)} 项发现 ===')
for f in findings:
    print(f"  [{f['level']}] {f['module']}: {f['msg']} ({f['file']}:{f['line']})")
