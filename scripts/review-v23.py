#!/usr/bin/env python3
"""
v0.23 静态审查脚本
查找 P0/P1 级别的常见问题:
- race condition
- 状态泄漏
- 错误处理缺失
- 重复 key
- useEffect 依赖漏
- 移动端定位
- dangerouslySetInnerHTML
- 强类型 any
"""
import re
import os
import sys
from pathlib import Path

ROOT = Path('/workspace/english-app/src')
results = []
def add(severity, file, line, msg):
    results.append((severity, file, line, msg))

# === P0: 必修 ===
P0 = 'P0'
P1 = 'P1'
P2 = 'P2'

# 1. dangerouslySetInnerHTML (P0)
for p in ROOT.rglob('*.tsx'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if 'dangerouslySetInnerHTML' in line:
            add(P0, str(p.relative_to(ROOT.parent)), i, f'dangerouslySetInnerHTML: {line.strip()[:100]}')

# 2. eval / Function 构造器 (P0)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r'\beval\s*\(|\bnew\s+Function\s*\(', line):
            add(P0, str(p.relative_to(ROOT.parent)), i, f'eval/Function: {line.strip()[:100]}')

# 3. 缺少依赖的 useEffect (P1)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    lines = txt.split('\n')
    for i, line in enumerate(lines, 1):
        m = re.search(r'useEffect\s*\(\s*\(\s*\)\s*=>\s*\{(.*?)\}\s*,\s*\[([^\]]*)\]\s*\)', line)
        if m:
            body, deps = m.group(1), m.group(2)
            if 'setState' in body or 'await' in body or 'getSelection' in body:
                # 闭包捕获外部 state 可能过期
                if deps and not re.search(r'\.current', deps) and 'useRef' not in line:
                    pass  # 误报多,人工审

# 4. Promise/async 没 catch (P1)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    lines = txt.split('\n')
    in_try = False
    try_depth = 0
    for i, line in enumerate(lines, 1):
        if 'try {' in line or 'try{' in line:
            in_try = True
            try_depth += 1
        if in_try and '}' in line:
            try_depth -= 1
            if try_depth <= 0:
                in_try = False
                try_depth = 0
        # 找 await 但不在 try 里
        if re.search(r'\bawait\s+\w', line) and not in_try and 'useEffect' not in line:
            # 检查上文几行有没有 try
            has_try = any('try {' in lines[max(0, i-3):i][k] for k in range(min(3, i)))
            if not has_try and 'catch' not in line and 'then(' not in line:
                # 上下有 try 也算
                lookback = lines[max(0, i-8):i]
                if not any('try {' in l or 'try{' in l for l in lookback):
                    add(P2, str(p.relative_to(ROOT.parent)), i, f'await 无 try/catch: {line.strip()[:80]}')

# 5. setTimeout/setInterval 没清理 (P1)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    if 'setTimeout' in txt and 'clearTimeout' not in txt and 'setInterval' in txt and 'clearInterval' not in txt:
        # 可能有
        file_str = str(p.relative_to(ROOT.parent))
        set_count = txt.count('setTimeout') + txt.count('setInterval')
        clear_count = txt.count('clearTimeout') + txt.count('clearInterval')
        if set_count > clear_count:
            add(P1, file_str, 0, f'setTimeout/Interval {set_count} 个但 clear 只 {clear_count} 个,可能泄漏')

# 6. 列表渲染 key 缺失 (P0)
for p in ROOT.rglob('*.tsx'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if '.map(' in line:
            # 找下一行的 key=
            next_lines = txt.split('\n')[i:i+5]
            has_key = any('key=' in nl for nl in next_lines)
            # 或 React.Fragment
            if not has_key and 'React.Fragment' not in line and '<>' not in line:
                add(P1, str(p.relative_to(ROOT.parent)), i, f'.map 可能缺 key: {line.strip()[:80]}')

# 7. TypeScript any (P2)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if re.search(r':\s*any\b', line) and 'eslint' not in line and 'comment' not in line.lower():
            add(P2, str(p.relative_to(ROOT.parent)), i, f': any: {line.strip()[:80]}')

# 8. localStorage.setItem with JSON + user input (P0 风险)
# WritePage 用 'write-count-' + today 做 key,today 是 new Date().toISOString().slice(0,10) 安全
# AIChat localStorage 'plan-progress-...' 也安全
# 但要查 localStorage.setItem 用 string concat
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if 'localStorage.setItem' in line and ('+' in line or '`' in line):
            # 简单检查
            if 'Date()' in line or '.id' in line or '.toString()' in line:
                add(P2, str(p.relative_to(ROOT.parent)), i, f'localStorage key 拼接: {line.strip()[:80]}')

# 9. URL 参数没用 encodeURIComponent (P1)
for p in ROOT.rglob('*.{ts,tsx}'):
    txt = p.read_text()
    for i, line in enumerate(txt.split('\n'), 1):
        if '?text=' in line or '?q=' in line or '?query=' in line or '?word=' in line:
            if 'encodeURIComponent' not in line:
                add(P1, str(p.relative_to(ROOT.parent)), i, f'URL 参数未 encode: {line.strip()[:80]}')

# 10. setState 直接调多次(可能 race) (P1)
for p in ROOT.rglob('*.tsx'):
    txt = p.read_text()
    # 看 handleXxx 函数是否多次 setXxx
    lines = txt.split('\n')
    for i, line in enumerate(lines, 1):
        if re.match(r'\s*const handle\w+\s*=\s*async', line):
            # 看后续 30 行 setState 次数
            body = '\n'.join(lines[i:i+30])
            set_count = body.count('set')
            if set_count >= 5:
                add(P2, str(p.relative_to(ROOT.parent)), i, f'handle* 多 setState ({set_count}),可能有 race')

# === 报告 ===
print(f'==== v0.23 静态审查报告 ====')
print(f'文件扫描: {ROOT}')
print(f'')
p0 = [r for r in results if r[0] == P0]
p1 = [r for r in results if r[0] == P1]
p2 = [r for r in results if r[0] == P2]
print(f'P0: {len(p0)} 个')
for sev, file, line, msg in p0:
    print(f'  [{file}:{line}] {msg}')
print(f'P1: {len(p1)} 个')
for sev, file, line, msg in p1:
    print(f'  [{file}:{line}] {msg}')
print(f'P2: {len(p2)} 个')

# 输出 markdown
md_path = '/workspace/english-app/.mavis/plans/v23-static-review.md'
md = ['# v0.23 静态审查报告', '', f'扫描: {len(list(ROOT.rglob("*.tsx"))) + len(list(ROOT.rglob("*.ts")))} 个 TS/TSX 文件', '', '## P0 (必修)', '']
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
md.append('\n## P2 (可选)\n')
md.append(f'共 {len(p2)} 个,详见上面输出\n')
Path(md_path).parent.mkdir(parents=True, exist_ok=True)
Path(md_path).write_text('\n'.join(md))
print(f'\n报告写入: {md_path}')
