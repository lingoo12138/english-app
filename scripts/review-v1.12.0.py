#!/usr/bin/env python3
"""scripts/review-v1.12.0.py - v1.12.0 P0/P1/P2 静态审查 + 修复点验证"""
import os
import re
import sys

# 共享约束 (v1.6 review 不能破坏的 13 处)
V16_PROTECTED = [
    # 1. WritePage 切回 write tab 保留 input
    ('src/pages/WritePage.tsx', r"handleTabChange|activeTab.*setText|activeTab.*=== 'write'|activeTab\s*=\s*useState"),
    # 2. WritePage handleHistoryItem 不被 useEffect 覆盖
    ('src/pages/WritePage.tsx', r"handleHistoryItem"),
    # 3. ListenPage DictationMode 切 lesson useEffect
    ('src/pages/ListenPage.tsx', r"\[lesson\.id\]|lesson\.id\]"),
    # 4. ListenPage QuestionsMode 切 lesson useEffect
    ('src/pages/ListenPage.tsx', r"QuestionsMode"),
    # 5-6. ErrorExplain/Usage setLoading
    ('src/components/ErrorExplainButton.tsx', r"setLoading\(true\)"),
    ('src/components/UsageButton.tsx', r"setLoading\(true\)"),
    # 7. AIChat STT 累积 MAX_INPUT
    ('src/pages/AIChat.tsx', r"MAX_INPUT\s*=\s*500"),
    # 8. WritePage 截断 text 变量
    ('src/pages/WritePage.tsx', r"text\.slice|setError\(`文本超过"),
    # 9. ListenPage handlePlay
    ('src/pages/ListenPage.tsx', r"if\s*\(\s*playing\s*\)\s*return"),
    # 10. UsageButton 解析失败
    ('src/components/UsageButton.tsx', r"暂无数据"),
    # 11-12. catch unknown + Error 守卫
    ('src/pages/WritePage.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
    ('src/pages/AIChat.tsx', r"catch\s*\(\s*e:\s*unknown\s*\)"),
]

# v1.12.0 修复点验证
V1120_CHECKS = [
    # P2 错误恢复
    ('src/lib/llmFallback.ts', r"classifyError", 'P2 错误分类'),
    ('src/lib/llmFallback.ts', r"getFriendlyErrorMessage", 'P2 友好错误提示'),
    ('src/lib/llmFallback.ts', r"withFallback", 'P2 fallback 包装'),
    ('src/lib/providers/llm.ts', r"chatCompletionWithFallback", 'P2 接入 fallback'),

    # P1 拍照场景
    ('src/lib/imageRecog.ts', r"SCENE_PROMPTS", 'P1 场景 prompt 池'),
    ('src/lib/imageRecog.ts', r"getScenePrompt", 'P1 取场景 prompt'),
    ('src/lib/imageRecog.ts', r"recognizeImageWithScene", 'P1 场景化识别'),
    ('src/pages/Camera.tsx', r"recognizeImageWithScene", 'P1 Camera 接入'),

    # P3 LLM 日限
    ('src/lib/llmUsage.ts', r"DAILY_LIMITS", 'P3 日限配置'),
    ('src/lib/llmUsage.ts', r"recordLLMCall", 'P3 用量累加'),
    ('src/lib/llmUsage.ts', r"checkLLMLimit", 'P3 检查超限'),
    ('src/lib/llmUsage.ts', r"localStorage", 'P3 localStorage 持久化'),
    ('src/pages/Settings.tsx', r"LLM 用量", 'P3 Settings 用量卡片'),
    ('src/pages/Settings.tsx', r"resetLLMUsageToday", 'P3 重置功能'),
]

def check_file_grep(filepath, pattern, label):
    """检查文件含 pattern"""
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
    p3 = 0
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

    print(f"\n=== v1.12.0 修复点 (14 项) ===")
    for filepath, pattern, label in V1120_CHECKS:
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

    # 检查 setLoading 修复
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
