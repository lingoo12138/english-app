#!/usr/bin/env python3
"""
v0.26 全模块静态审查脚本
覆盖 19 页面 + 18 库 + 8 组件 + 9 Settings 子
P0/P1/P2 自动分类
"""
import re
import os
from pathlib import Path
from collections import defaultdict

ROOT = Path('/workspace/english-app/src')
results = []
def add(severity, file, line, msg):
    results.append((severity, file, line, msg))

P0 = 'P0'
P1 = 'P1'
P2 = 'P2'

# === P0 风险 ===
# 1. dangerouslySetInnerHTML (XSS 风险)
for p in ROOT.rglob('*.tsx'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if 'dangerouslySetInnerHTML' in line:
            add(P0, str(p.relative_to(ROOT.parent)), i, f'XSS 风险: {line.strip()[:80]}')

# 2. eval / Function 构造器
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r'\beval\s*\(|\bnew\s+Function\s*\(', line):
            add(P0, str(p.relative_to(ROOT.parent)), i, f'eval/Function: {line.strip()[:80]}')

# 3. localStorage XSS (用 user input 拼 key)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if 'localStorage.setItem' in line and ('+' in line or '`' in line):
            # 看 key 是否 user-controlled
            if 'prompt(' in line or 'userInput' in line:
                add(P0, str(p.relative_to(ROOT.parent)), i, f'localStorage XSS 风险: {line.strip()[:80]}')

# === P1 风险 ===
# 4. useEffect 依赖漏 (闭包陷阱)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        # useEffect(() => {...}, [])
        m = re.search(r'useEffect\s*\(\s*\(\s*\)\s*=>\s*\{', line)
        if m:
            # 看下一行的 deps
            for j in range(i, min(i+10, len(txt.split('\n')))):
                if '}, [' in txt.split('\n')[j] or '},[]' in txt.split('\n')[j]:
                    # 空依赖
                    body_start = i - 1  # 0-based
                    body_end = j  # 0-based
                    body = '\n'.join(txt.split('\n')[body_start:body_end])
                    # 检查 body 内是否用 store / state (闭包风险)
                    if re.search(r'useStore\([^)]+\)', body) and re.search(r'addEventListener|setTimeout', body):
                        add(P1, str(p.relative_to(ROOT.parent)), i, f'useEffect 空依赖 + listener/timeout + 闭包风险')
                    break

# 5. setTimeout/setInterval 漏清理
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    set_count = txt.count('setTimeout(') + txt.count('setInterval(')
    clear_count = txt.count('clearTimeout(') + txt.count('clearInterval(')
    if set_count > clear_count + 2:  # 容差 2 (useEffect 内部 + 外部)
        add(P1, str(p.relative_to(ROOT.parent)), 0, f'setTimeout/Interval {set_count} 个但 clear 只 {clear_count} 个,可能泄漏')

# 6. addEventListener 漏清理
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    add_count = len(re.findall(r'addEventListener\(', txt))
    remove_count = len(re.findall(r'removeEventListener\(', txt))
    if add_count > remove_count + 1:
        add(P1, str(p.relative_to(ROOT.parent)), 0, f'addEventListener {add_count} 个但 removeEventListener 只 {remove_count} 个')

# 7. try / catch 缺失 (await 单独使用)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    lines = txt.split('\n')
    for i, line in enumerate(lines, 1):
        if re.search(r'\bawait\s+\w', line) and 'Promise' not in line:
            # 上下 5 行有没有 try
            lookback = '\n'.join(lines[max(0, i-6):i])
            lookforward = '\n'.join(lines[i:min(len(lines), i+6)])
            if 'try {' not in lookback and 'try{' not in lookback and '.then(' not in lookback and '.catch' not in lookforward:
                if 'useEffect' not in line:  # useEffect 内的 await 可能 OK
                    add(P2, str(p.relative_to(ROOT.parent)), i, f'await 无 try/catch: {line.strip()[:60]}')

# 8. 错误吞掉 (catch {} 不 log)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r'catch\s*\(\s*\w*\s*\)\s*\{\s*\}', line):
            add(P2, str(p.relative_to(ROOT.parent)), i, f'catch 空块 (错误吞掉): {line.strip()[:60]}')

# 9. console.log 残留 (生产代码不应该有)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r'^\s*console\.log\(', line) and 'debug' not in line.lower():
            # console.error / console.warn OK
            add(P2, str(p.relative_to(ROOT.parent)), i, f'console.log 残留: {line.strip()[:60]}')

# 10. 列表渲染缺 key
for p in ROOT.rglob('*.tsx'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if '.map(' in line and '=>' in line:
            # 看 5 行内有无 key=
            next_lines = '\n'.join(txt.split('\n')[i:i+5])
            if 'key=' not in next_lines and 'React.Fragment' not in line and '<>' not in line and 'setState' not in next_lines and 'new Map' not in next_lines and 'new Set' not in next_lines and 'Array.from' not in next_lines:
                # 检查是否真渲染 (有 JSX 元素)
                if '<' in next_lines:
                    add(P2, str(p.relative_to(ROOT.parent)), i, f'.map 可能缺 key: {line.strip()[:60]}')

# 11. TypeScript any
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r':\s*any\b', line) and 'eslint' not in line and 'comment' not in line.lower():
            add(P2, str(p.relative_to(ROOT.parent)), i, f': any: {line.strip()[:60]}')

# 12. URL 参数未 encode
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r'\?text=|\?q=|\?query=|\?word=', line):
            if 'encodeURIComponent' not in line:
                add(P1, str(p.relative_to(ROOT.parent)), i, f'URL 参数未 encode: {line.strip()[:60]}')

# 13. IndexedDB 操作无错误处理
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if 'db.' in line and ('.put(' in line or '.add(' in line or '.delete(' in line or '.get(' in line or '.toArray(' in line or '.count(' in line):
            # 上一行 5 行有没有 try
            lookback = '\n'.join(txt.split('\n')[max(0, i-6):i])
            if 'try {' not in lookback and 'try{' not in lookback and 'await db.' in line:
                add(P2, str(p.relative_to(ROOT.parent)), i, f'IndexedDB 操作无 try: {line.strip()[:60]}')

# 14. input/textarea 无 maxLength / 无 placeholder
# (跳过,正常组件可能有)

# 15. async 函数没用 await (或 return 缺 await)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        m = re.search(r'async\s+function\s+\w+|async\s+\w+\s*=', line)
        if m:
            # 上下 10 行无 await
            block = '\n'.join(txt.split('\n')[i:i+10])
            if 'await' not in block and '.then(' not in block:
                add(P2, str(p.relative_to(ROOT.parent)), i, f'async 函数无 await: {line.strip()[:60]}')

# === 报告 ===
print(f'==== v0.26 全模块静态审查报告 ====')
print(f'扫描: {ROOT}')
p0 = [r for r in results if r[0] == P0]
p1 = [r for r in results if r[0] == P1]
p2 = [r for r in results if r[0] == P2]
print(f'P0: {len(p0)} 个')
for sev, file, line, msg in p0:
    print(f'  [{file}:{line}] {msg}')
print(f'P1: {len(p1)} 个')
for sev, file, line, msg in p1[:20]:  # 限 20
    print(f'  [{file}:{line}] {msg}')
if len(p1) > 20:
    print(f'  ... {len(p1) - 20} 个 P1 详见 markdown')
print(f'P2: {len(p2)} 个')

# 输出 markdown
md_path = '/workspace/english-app/.mavis/plans/v26-static-review.md'
md = ['# v0.26 全模块静态审查报告', '', f'扫描: 19 页面 + 18 库 + 8 组件', f'时间: 2026-07-23', '', '## P0 (必修)', '']
if not p0:
    md.append('未发现自动可检 P0')
for sev, file, line, msg in p0:
    md.append(f'### [{file}:{line}]')
    md.append(f'{msg}\n')
md.append('\n## P1 (应该修)\n')
if not p1:
    md.append('未发现自动可检 P1')
for sev, file, line, msg in p1:
    md.append(f'### [{file}:{line}]')
    md.append(f'{msg}\n')
md.append('\n## P2 (可选, 全部)\n')
md.append(f'共 {len(p2)} 个, 详见上面输出\n')
Path(md_path).parent.mkdir(parents=True, exist_ok=True)
Path(md_path).write_text('\n'.join(md))
print(f'\n报告写入: {md_path}')
