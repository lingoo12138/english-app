#!/usr/bin/env python3
"""scripts/review-v1.14.0.py - v1.14.0 B4 P0/P1/P2 静态审查"""
import os
import re
import sys

# v1.6 review 13 处保护
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

# v1.14.0 修复点
V1140_CHECKS = [
    # customScenes 核心
    ('src/lib/customScenes.ts', r"MAX_TEXT_LEN\s*=\s*10000", 'MAX_TEXT_LEN=10000'),
    ('src/lib/customScenes.ts', r"MAX_WORDS\s*=\s*30", 'MAX_WORDS=30'),
    ('src/lib/customScenes.ts', r"MIN_WORDS\s*=\s*5", 'MIN_WORDS=5'),
    ('src/lib/customScenes.ts', r"mockExtractWords", 'mock fallback 提取'),
    ('src/lib/customScenes.ts', r"parseExtractResult", 'JSON 严格解析'),
    ('src/lib/customScenes.ts', r"extractWordsFromText", 'LLM 集成'),
    ('src/lib/customScenes.ts', r"autoExtractTitle", '自动标题'),

    # db 集成
    ('src/lib/db.ts', r"version\(5\)", 'IDB version 5'),
    ('src/lib/db.ts', r"customScenes", 'customScenes 表'),
    ('src/lib/db.ts', r"addCustomScene", 'addCustomScene'),
    ('src/lib/db.ts', r"getAllCustomScenes", 'getAllCustomScenes'),
    ('src/lib/db.ts', r"deleteCustomScene", 'deleteCustomScene'),

    # UI 页面
    ('src/pages/CustomScenes.tsx', r"MAX_TEXT_LEN", 'CustomScenes 限长'),
    ('src/pages/CustomScenes.tsx', r"extractWordsFromText", '调提取'),
    ('src/pages/CustomScenes.tsx', r"saveCustomScene", '调保存'),
    ('src/pages/CustomSceneDetail.tsx', r"getCustomSceneById", '详情加载'),
    ('src/pages/CustomSceneDetail.tsx', r"isFavorite|addFavorite|removeFavorite", '收藏集成'),

    # 路由
    ('src/App.tsx', r"custom-scenes", '/custom-scenes 路由'),

    # LLM 日限
    ('src/pages/CustomScenes.tsx', r"recordLLMCall\('explain'\)", 'LLM 日限 explain'),
    ('src/pages/CustomScenes.tsx', r"getLimitExceededMessage", '超限提示'),

    # Home 入口
    ('src/pages/Home.tsx', r"/custom-scenes", 'Home 入口'),
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

    print(f"\n=== v1.14.0 修复点 ({len(V1140_CHECKS)} 项) ===")
    for filepath, pattern, label in V1140_CHECKS:
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
    type_files = ['src/pages/WritePage.tsx', 'src/pages/AIChat.tsx', 'src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx', 'src/pages/CustomScenes.tsx', 'src/pages/CustomSceneDetail.tsx']
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

    # setLoading 配对
    print("\n=== setLoading 修复检查 ===")
    for filepath in ['src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx', 'src/pages/CustomScenes.tsx']:
        if not os.path.exists(filepath):
            continue
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
        if "setLoading(true)" in content:
            if "setLoading(false)" in content:
                print(f"  ✓ {os.path.basename(filepath)} setLoading 配对")
                pass_count += 1
            else:
                print(f"  ✗ {os.path.basename(filepath)} setLoading 缺失 false")
                fail += 1
                p2 += 1

    # v1.13 保护: AIChat 角色
    print("\n=== v1.13 chatRoles 保护 ===")
    for filepath, pattern in [
        ('src/lib/chatRoles.ts', r"CHAT_ROLES"),
        ('src/lib/aiChat.ts', r"role\?:\s*ChatRole"),
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
