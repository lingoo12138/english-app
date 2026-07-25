#!/usr/bin/env python3
"""scripts/review-v1.25.0.py - v1.25.0 W26 P0/P1/P2 审查"""
import os
import re
import sys

V16 = [
    ('src/pages/WritePage.tsx', r"handleHistoryItem"),
    ('src/pages/AIChat.tsx', r"MAX_INPUT\s*=\s*500"),
    ('src/components/UsageButton.tsx', r"暂无数据"),
    ('src/pages/WritePage.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
    ('src/pages/AIChat.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
]

V125 = [
    ('src/lib/wordTags.ts', r"renameTag", 'renameTag'),
    ('src/lib/wordTags.ts', r"mergeTags", 'mergeTags'),
    ('src/lib/wordTags.ts', r"findSimilarTags", 'findSimilarTags'),
    ('src/pages/Notebook.tsx', r"renameTag, mergeTags", 'import'),
    ('src/pages/Notebook.tsx', r"showTagManager", 'modal state'),
    ('src/pages/Notebook.tsx', r"handleTagAction", 'handler'),
    ('src/pages/Notebook.tsx', r"catch \(e: unknown\)", 'catch unknown'),
    ('tests/tagMerge.test.ts', r"renameTag", '测试存在'),
]

def chk(fp, p, l):
    if not os.path.exists(fp): return False, f"✗ {l}: 文件不存在"
    if re.search(p, open(fp, encoding='utf-8').read()): return True, f"✓ {l}"
    return False, f"✗ {l}: 不含 {p}"

def main():
    p0, p1, p2, fail, passed = 0, 0, 0, 0, 0
    print("=== v1.6 review 5 处保护 ===")
    for fp, p in V16:
        ok, m = chk(fp, p, os.path.basename(fp))
        print(f"  {m}"); passed += 1 if ok else 0; fail += 0 if ok else 1
        if not ok: p0 += 1
    print("\n=== catch (e: any) 检查 ===")
    ca = 0
    for root, _, files in os.walk('src/'):
        for f in files:
            if f.endswith(('.ts', '.tsx')):
                fp = os.path.join(root, f)
                if re.search(r"catch\s*\(\s*e\s*:\s*any\s*\)", open(fp, encoding='utf-8').read()):
                    print(f"  ✗ {fp}"); ca += 1
    if ca == 0: print("  ✓ 0 残留")
    print(f"\n=== v1.25.0 修复点 ({len(V125)} 项) ===")
    for fp, p, l in V125:
        ok, m = chk(fp, p, l)
        print(f"  {m}"); passed += 1 if ok else 0; fail += 0 if ok else 1
        if not ok: p1 += 1
    print(f"\nP0={p0} P1={p1} P2={p2}  通过={passed}/{passed+fail}")
    return 0 if fail == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
