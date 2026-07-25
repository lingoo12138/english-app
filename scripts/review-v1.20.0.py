#!/usr/bin/env python3
"""scripts/review-v1.20.0.py - v1.20.0 B10 P0/P1/P2 静态审查"""
import os
import re
import sys

V16_PROTECTED = [
    ('src/pages/WritePage.tsx', r"handleHistoryItem"),
    ('src/pages/WritePage.tsx', r"activeTab\s*=\s*useState|activeTab.*=== 'write'"),
    ('src/pages/ListenPage.tsx', r"\[lesson\.id\]|lesson\.id\]"),
    ('src/pages/ListenPage.tsx', r"QuestionsMode"),
    ('src/components/ErrorExplainButton.tsx', r"setLoading\(true\)"),
    ('src/components/UsageButton.tsx', r"setLoading\(true\)"),
    ('src/pages/AIChat.tsx', r"MAX_INPUT\s*=\s*500"),
    ('src/pages/WritePage.tsx', r"text\.slice|setError\(`文本超过"),
    ('src/pages/ListenPage.tsx', r"if\s*\(\s*playing\s*\)\s*return"),
    ('src/components/UsageButton.tsx', r"暂无数据"),
    ('src/pages/WritePage.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
    ('src/pages/AIChat.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
]

V1200_CHECKS = [
    # notebookBulk
    ('src/lib/notebookBulk.ts', r"addFavoritesToReview", '入复习函数'),
    ('src/lib/notebookBulk.ts', r"removeFavorites", '删除函数'),
    ('src/lib/notebookBulk.ts', r"exportFavoritesAsCSV", 'CSV 导出'),
    ('src/lib/notebookBulk.ts', r"downloadFavoritesCSV", '下载 CSV'),
    ('src/lib/notebookBulk.ts', r"selectAll", '全选辅助'),
    ('src/lib/notebookBulk.ts', r"invertSelection", '反选辅助'),
    ('src/lib/notebookBulk.ts', r"easeFactor:\s*2\.5", 'SM-2 初始值'),

    # Notebook 集成
    ('src/pages/Notebook.tsx', r"addFavoritesToReview", '入复习'),
    ('src/pages/Notebook.tsx', r"downloadFavoritesCSV", '下载'),
    ('src/pages/Notebook.tsx', r"selectAll|selectAllIds", '全选'),
    ('src/pages/Notebook.tsx', r"invertSelection", '反选'),
    ('src/pages/Notebook.tsx', r"handleBatchAddToReview", '入复习 handler'),
    ('src/pages/Notebook.tsx', r"handleBatchExport", '导出 handler'),
]

def check_file_grep(filepath, pattern, label):
    if not os.path.exists(filepath):
        return False, f"✗ {label}: {filepath} 不存在"
    with open(filepath, encoding='utf-8') as f:
        content = f.read()
    if re.search(pattern, content):
        return True, f"✓ {label}"
    return False, f"✗ {label}: {filepath} 不含 {pattern}"

def main():
    p0 = 0
    p1 = 0
    p2 = 0
    fail = 0
    pass_count = 0

    print("=== v1.6 review 13 处保护 ===")
    for filepath, pattern in V16_PROTECTED:
        ok, msg = check_file_grep(filepath, pattern, f"保护 {os.path.basename(filepath)}")
        if ok:
            print(f"  {msg}")
            pass_count += 1
        else:
            print(f"  {msg}")
            fail += 1
            p0 += 1

    print(f"\n=== v1.20.0 修复点 ({len(V1200_CHECKS)} 项) ===")
    for filepath, pattern, label in V1200_CHECKS:
        ok, msg = check_file_grep(filepath, pattern, label)
        if ok:
            print(f"  {msg}")
            pass_count += 1
        else:
            print(f"  {msg}")
            fail += 1
            p1 += 1

    # 类型守卫
    print("\n=== 类型守卫检查 ===")
    type_files = ['src/pages/WritePage.tsx', 'src/pages/AIChat.tsx', 'src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx', 'src/pages/Notebook.tsx']
    for filepath in type_files:
        if not os.path.exists(filepath):
            continue
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
        if re.search(r"catch\s*\(\s*e\s*:\s*any\s*\)", content):
            print(f"  ✗ {os.path.basename(filepath)} 仍有 catch (e: any)")
            fail += 1
            p2 += 1
        else:
            print(f"  ✓ {os.path.basename(filepath)} 无 catch (e: any)")

    # v1.11/16/19 保护
    print("\n=== v1.11/16/19 保护 ===")
    for filepath, pattern in [
        ('src/lib/reviewQueue.ts', r"sortReviewQueue"),
        ('src/lib/sceneReview.ts', r"addSceneWordsToReview"),
        ('src/lib/learningCalendar.ts', r"getCalendarMonth"),
    ]:
        ok, msg = check_file_grep(filepath, pattern, f"保护 {os.path.basename(filepath)}")
        if ok:
            print(f"  {msg}")
            pass_count += 1
        else:
            print(f"  {msg}")
            fail += 1
            p0 += 1

    print(f"\n=== 总结 ===")
    print(f"P0 (核心错误): {p0}")
    print(f"P1 (重要问题): {p1}")
    print(f"P2 (类型/状态): {p2}")
    print(f"通过/失败: {pass_count}/{pass_count + fail}")
    if fail == 0:
        print("✓ 全部通过 — 0 P0 + 0 P1 + 0 P2")
        return 0
    print(f"✗ {fail} 项失败")
    return 1

if __name__ == '__main__':
    sys.exit(main())
