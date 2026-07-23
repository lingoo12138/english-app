#!/usr/bin/env python3
"""
review-v1.5.py - v1.5.0 静态审查
扫描 v1.1.0 ~ v1.5.0 新加代码的 P0/P1/P2 模式
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path('/workspace/english-app')
SRC = ROOT / 'src'

# v1.1-v1.5 新加文件
NEW_FILES = [
    'src/components/Modal.tsx',
    'src/components/Toast.tsx',
    'src/components/ShareCard.tsx',
    'src/components/ShareModal.tsx',
    'src/components/ErrorExplainButton.tsx',
    'src/components/UsageButton.tsx',
    'src/pages/Achievements.tsx',
    'src/lib/llmTutor.ts',
    'src/lib/errorReview.ts',
    'src/lib/achievements.ts',
]

# 规则: 模式 + 严重度 + 描述
RULES = [
    # P0: 安全/数据
    (r'innerHTML\s*=', 'P0', 'innerHTML 写入 (XSS 风险)'),
    (r'document\.write', 'P0', 'document.write (XSS)'),
    (r'\beval\s*\(', 'P0', 'eval 使用 (代码注入)'),
    (r'catch\s*\(\s*[\w_]*\s*\)\s*\{\s*\}', 'P1', '空 catch 完全吞错'),
    (r'catch\s*\(\s*\)\s*\{', 'P1', '空 catch 完全吞错'),

    # P1: 错误处理
    (r'@ts-ignore', 'P1', '@ts-ignore'),
    (r'\bany\b(?!\w)', 'P2', 'any 类型'),

    # P1: 性能
    (r'innerHTML', 'P0', 'innerHTML 引用'),

    # P2: UI
    (r'\balert\s*\(', 'P2', 'alert (阻塞 UI)'),
    (r'\bconfirm\s*\(', 'P2', 'confirm (阻塞 UI)'),
    (r'\bprompt\s*\(', 'P2', 'prompt (阻塞 UI)'),
]

results = []
files_scanned = 0

for fpath in NEW_FILES:
    f = ROOT / fpath
    if not f.exists():
        continue
    files_scanned += 1
    try:
        content = f.read_text(encoding='utf-8')
    except Exception as e:
        results.append((fpath, 0, 'error', f'读取失败: {e}'))
        continue
    for i, line in enumerate(content.split('\n'), 1):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        for pattern, sev, msg in RULES:
            if re.search(pattern, line):
                results.append((fpath, i, sev, msg, line.strip()[:100]))

# 统计
by_sev = defaultdict(int)
for r in results:
    by_sev[r[2]] += 1

print(f'扫描新文件: {files_scanned} 个')
print(f'命中: {len(results)} 处')
for s in ['P0', 'P1', 'P2']:
    print(f'  {s}: {by_sev.get(s, 0)}')
print()

# 详细
for fpath, line, sev, msg, code in sorted(results, key=lambda x: (x[2], x[0])):
    print(f'{sev} {fpath}:{line}  {msg}')
    print(f'    > {code}')

# 输出 markdown 报告
report = ROOT / 'docs' / 'REVIEW_v1.5.md'
with open(report, 'w') as f:
    f.write(f'# v1.5.0 静态审查报告\n\n')
    f.write(f'> **生成时间**: 2026-07-24\n')
    f.write(f'> **脚本**: `scripts/review-v1.5.py`\n')
    f.write(f'> **状态**: 📋 待 review\n\n')
    f.write(f'## 统计\n\n')
    f.write(f'- 扫描新文件: {files_scanned} 个\n')
    f.write(f'- 命中: {len(results)} 处\n\n')
    f.write(f'| 严重度 | 数量 |\n|--------|------|\n')
    for s in ['P0', 'P1', 'P2']:
        f.write(f'| {s} | {by_sev.get(s, 0)} |\n')
    f.write(f'\n---\n\n## 详细清单\n\n')
    for fpath, line, sev, msg, code in sorted(results, key=lambda x: (x[2], x[0])):
        f.write(f'### {sev} `{fpath}:{line}`\n\n')
        f.write(f'**{msg}**\n\n')
        f.write(f'```\n{code}\n```\n\n')
print(f'\n报告: {report}')
