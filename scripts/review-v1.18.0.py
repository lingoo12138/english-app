#!/usr/bin/env python3
"""scripts/review-v1.18.0.py - v1.18.0 B8 P0/P1/P2 静态审查"""
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

V1180_CHECKS = [
    # fileUpload 核心
    ('src/lib/fileUpload.ts', r"validateFile", 'validateFile 函数'),
    ('src/lib/fileUpload.ts', r"readTextFile", 'readTextFile 函数'),
    ('src/lib/fileUpload.ts', r"readAndTruncateFile", 'readAndTruncateFile'),
    ('src/lib/fileUpload.ts', r"extractFileName", 'extractFileName'),
    ('src/lib/fileUpload.ts', r"MAX_FILE_SIZE\s*=\s*1024\s*\*\s*1024", '1MB 限制'),
    ('src/lib/fileUpload.ts', r"SUPPORTED_EXTENSIONS", '支持类型'),
    ('src/lib/fileUpload.ts', r"FileReader", 'FileReader API'),

    # CustomScenes 集成
    ('src/pages/CustomScenes.tsx', r"from '../lib/fileUpload'", 'import'),
    ('src/pages/CustomScenes.tsx', r"handleFileUpload", 'handler'),
    ('src/pages/CustomScenes.tsx', r"fileInputRef", 'file input ref'),
    ('src/pages/CustomScenes.tsx', r"type=\"file\"", 'file input'),
    ('src/pages/CustomScenes.tsx', r"accept=", 'accept 属性'),
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

    print(f"\n=== v1.18.0 修复点 ({len(V1180_CHECKS)} 项) ===")
    for filepath, pattern, label in V1180_CHECKS:
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
    type_files = ['src/pages/WritePage.tsx', 'src/pages/AIChat.tsx', 'src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx', 'src/pages/CustomScenes.tsx']
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

    # v1.14/15/16/17 保护
    print("\n=== v1.14/15/16/17 保护 ===")
    for filepath, pattern in [
        ('src/lib/customScenes.ts', r"extractWordsFromText"),
        ('src/lib/sceneReview.ts', r"addSceneWordsToReview"),
        ('src/lib/chatRoles.ts', r"CHAT_ROLES"),
        ('src/lib/llmUsage.ts', r"checkLLMLimit"),
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
