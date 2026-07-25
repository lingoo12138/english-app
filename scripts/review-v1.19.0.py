#!/usr/bin/env python3
"""scripts/review-v1.19.0.py - v1.19.0 B9 P0/P1/P2 静态审查"""
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

V1190_CHECKS = [
    # learningCalendar
    ('src/lib/learningCalendar.ts', r"getCalendarMonth", '月历函数'),
    ('src/lib/learningCalendar.ts', r"getHeatmapLevel", '热力图等级'),
    ('src/lib/learningCalendar.ts', r"HEATMAP_COLORS", '热力图配色'),
    ('src/lib/learningCalendar.ts', r"adjustMonth", '月份调整'),
    ('src/lib/learningCalendar.ts', r"formatDateKey", '日期格式'),
    ('src/lib/learningCalendar.ts', r"getDailyReport", '复用 v1.11'),

    # CalendarPage
    ('src/pages/CalendarPage.tsx', r"getCalendarMonth", '数据加载'),
    ('src/pages/CalendarPage.tsx', r"getHeatmapLevel", '热力图渲染'),
    ('src/pages/CalendarPage.tsx', r"isCurrentMonth", '当月判断'),
    ('src/pages/CalendarPage.tsx', r"handleToday", '回今天'),

    # 路由 + Home
    ('src/App.tsx', r"path=\"calendar\"", '路由'),
    ('src/pages/Home.tsx', r"学习日历", '入口'),
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

    print(f"\n=== v1.19.0 修复点 ({len(V1190_CHECKS)} 项) ===")
    for filepath, pattern, label in V1190_CHECKS:
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
    type_files = ['src/pages/WritePage.tsx', 'src/pages/AIChat.tsx', 'src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx', 'src/pages/CalendarPage.tsx']
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

    # v1.11/14/15/16/17/18 保护
    print("\n=== v1.11/14/15/16/17/18 保护 ===")
    for filepath, pattern in [
        ('src/lib/learningReport.ts', r"getDailyReport"),
        ('src/lib/customScenes.ts', r"extractWordsFromText"),
        ('src/lib/sceneReview.ts', r"addSceneWordsToReview"),
        ('src/lib/chatRoles.ts', r"CHAT_ROLES"),
        ('src/lib/fileUpload.ts', r"readTextFile"),
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
