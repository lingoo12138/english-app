#!/usr/bin/env python3
"""scripts/review-v1.23.0.py - v1.23.0 W24 P0/P1/P2 静态审查"""
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

V1230_CHECKS = [
    # pdfUpload
    ('src/lib/pdfUpload.ts', r"loadPdfJs", 'loadPdfJs 懒加载'),
    ('src/lib/pdfUpload.ts', r"isPdfFile", 'PDF 文件判断'),
    ('src/lib/pdfUpload.ts', r"extractPdfText", 'PDF 文本提取'),
    ('src/lib/pdfUpload.ts', r"isPdfEncryptedError", '加密 PDF 检测'),
    ('src/lib/pdfUpload.ts', r"MAX_PDF_PAGES", '页数限制'),
    ('src/lib/pdfUpload.ts', r"await import\(", '动态导入'),
    ('src/lib/pdfUpload.ts', r"disableFontFace", '性能优化'),

    # fileUpload 扩展
    ('src/lib/fileUpload.ts', r"'.pdf'", 'PDF 扩展名'),
    ('src/lib/fileUpload.ts', r"application/pdf", 'PDF MIME'),

    # CustomScenes 集成
    ('src/pages/CustomScenes.tsx', r"isPdfFile", 'PDF 判断'),
    ('src/pages/CustomScenes.tsx', r"extractPdfText", 'PDF 调用'),
    ('src/pages/CustomScenes.tsx', r"isPdfEncryptedError", '加密检测'),

    # catch (e: any) 0 残留
    # 测试
    ('package.json', r"pdfjs-dist", '依赖已加'),
    ('tests/pdfUpload.test.ts', r"isPdfFile", '测试存在'),
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

    # 检查无 catch (e: any)
    print("\n=== 类型守卫检查 (v1.22 review 维持) ===")
    catch_any = 0
    for root, dirs, files in os.walk('src/'):
        for f in files:
            if f.endswith(('.ts', '.tsx')):
                fp = os.path.join(root, f)
                with open(fp, encoding='utf-8') as fh:
                    if re.search(r"catch\s*\(\s*e\s*:\s*any\s*\)", fh.read()):
                        print(f"  ✗ {fp} 仍有 catch (e: any)")
                        catch_any += 1
                        fail += 1
                        p2 += 1
    if catch_any == 0:
        print("  ✓ 0 catch (e: any) 残留 (v1.22 review 维持)")

    print(f"\n=== v1.23.0 修复点 ({len(V1230_CHECKS)} 项) ===")
    for filepath, pattern, label in V1230_CHECKS:
        ok, msg = check_file_grep(filepath, pattern, label)
        if ok:
            print(f"  {msg}")
            pass_count += 1
        else:
            print(f"  {msg}")
            fail += 1
            p1 += 1

    # v1.14/18 保护
    print("\n=== v1.14/18 保护 ===")
    for filepath, pattern in [
        ('src/lib/customScenes.ts', r"extractWordsFromText"),
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
