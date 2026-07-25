#!/usr/bin/env python3
"""scripts/review-v1.13.0.py - v1.13.0 B3 P0/P1/P2 静态审查 + 修复点验证"""
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

# v1.13.0 修复点
V1130_CHECKS = [
    # chatRoles 5 角色
    ('src/lib/chatRoles.ts', r"CHAT_ROLES", '5 角色'),
    ('src/lib/chatRoles.ts', r"interviewer", '面试官'),
    ('src/lib/chatRoles.ts', r"barista", '咖啡师'),
    ('src/lib/chatRoles.ts', r"receptionist", '酒店前台'),
    ('src/lib/chatRoles.ts', r"tour_guide", '导游'),
    ('src/lib/chatRoles.ts', r"waiter", '餐厅服务员'),
    ('src/lib/chatRoles.ts', r"NONE_ROLE", '普通对话占位'),

    # 4 函数
    ('src/lib/chatRoles.ts', r"getRoleById", 'getRoleById'),
    ('src/lib/chatRoles.ts', r"getGreetingForRole", 'getGreetingForRole'),
    ('src/lib/chatRoles.ts', r"getFallbackReply", 'getFallbackReply'),
    ('src/lib/chatRoles.ts', r"getRoleSystemPrompt", 'getRoleSystemPrompt'),

    # RoleSelector
    ('src/components/RoleSelector.tsx', r"ALL_ROLES", 'ALL_ROLES 渲染'),
    ('src/components/RoleSelector.tsx', r"role=\"radio\"", 'a11y radio'),

    # AIChat 集成
    ('src/pages/AIChat.tsx', r"currentRoleId", '角色 state'),
    ('src/pages/AIChat.tsx', r"handleRoleChange", '角色切换 handler'),
    ('src/pages/AIChat.tsx', r"RoleSelector", 'RoleSelector 组件'),
    ('src/pages/AIChat.tsx', r"role: currentRoleId", 'role 注入 aiChat'),

    # aiChat 改造
    ('src/lib/aiChat.ts', r"role\?:\s*ChatRole", 'ChatContext role 字段'),
    ('src/lib/aiChat.ts', r"角色模式", '角色优先逻辑'),
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

    print(f"\n=== v1.13.0 修复点 ({len(V1130_CHECKS)} 项) ===")
    for filepath, pattern, label in V1130_CHECKS:
        ok, msg = check_file_grep(filepath, pattern, label)
        if ok:
            print(f"  {msg}")
            pass_count += 1
        else:
            print(f"  {msg}")
            fail += 1
            p1 += 1

    # 检查无 catch (e: any)
    print("\n=== 类型守卫检查 ===")
    type_files = ['src/pages/WritePage.tsx', 'src/pages/AIChat.tsx', 'src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx']
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
    for filepath in ['src/components/ErrorExplainButton.tsx', 'src/components/UsageButton.tsx']:
        if not os.path.exists(filepath):
            continue
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
        if "setLoading(true)" in content and "setLoading(false)" in content:
            print(f"  ✓ {os.path.basename(filepath)} setLoading 配对")
            pass_count += 1
        else:
            print(f"  ✗ {os.path.basename(filepath)} setLoading 缺失")
            fail += 1
            p2 += 1

    # AIChat MAX_INPUT 保护
    print("\n=== AIChat STT MAX_INPUT 保护 ===")
    with open('src/pages/AIChat.tsx', encoding='utf-8') as f:
        ai_chat = f.read()
    if 'MAX_INPUT' in ai_chat and '500' in ai_chat:
        print("  ✓ AIChat MAX_INPUT=500 保护")
        pass_count += 1
    else:
        print("  ✗ AIChat MAX_INPUT 保护失效")
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
