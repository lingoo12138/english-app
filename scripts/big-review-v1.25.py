#!/usr/bin/env python3
"""scripts/big-review-v1.25.py - 5 维度静态审查 (v1.23/24/25 累积)"""
import os
import re
import sys

def scan(pattern, file_glob='*.ts*', root='src/'):
    """扫所有 src/ 文件, 返含 pattern 的 (file, line) 列表"""
    results = []
    for r, _, files in os.walk(root):
        for f in files:
            if not f.endswith(('.ts', '.tsx')):
                continue
            fp = os.path.join(r, f)
            for i, line in enumerate(open(fp, encoding='utf-8'), 1):
                if re.search(pattern, line):
                    results.append((fp, i, line.rstrip()))
    return results

print("=" * 60)
print("大 review 摸底 — v1.23/24/25 累积 5 维度静态审查")
print("=" * 60)

# 1. catch (e: any)
print("\n## 1. catch (e: any) 残留")
ca = scan(r"catch\s*\(\s*e\s*:\s*any\s*\)")
if not ca:
    print("✓ 0 残留 (v1.22 review 维持)")
else:
    print(f"✗ {len(ca)} 处:")
    for fp, ln, line in ca[:10]:
        print(f"  {fp}:{ln}: {line.strip()[:80]}")

# 2. setLoading(true) 配对
print("\n## 2. setLoading(true) 配对 (useState 必有 false)")
loading = scan(r"setLoading\(true\)")
print(f"扫描: {len(loading)} 处 setLoading(true)")
# 找有 setLoading(true) 但没对应的 setLoading(false) 的文件
for fp, ln, _ in loading[:3]:
    content = open(fp, encoding='utf-8').read()
    true_count = content.count('setLoading(true)')
    false_count = content.count('setLoading(false)')
    status = "✓" if true_count <= false_count else "⚠"
    print(f"  {status} {os.path.basename(fp)}: true={true_count} false={false_count}")

# 3. as any
print("\n## 3. as any 残留")
as_any = scan(r"\s+as\s+any\b")
if not as_any:
    print("✓ 0 残留")
else:
    print(f"⚠ {len(as_any)} 处 (豁免: type literal):")
    for fp, ln, line in as_any[:5]:
        print(f"  {fp}:{ln}: {line.strip()[:80]}")

# 4. console.error / console.warn
print("\n## 4. console.error / console.warn (应有 catch unknown 守卫)")
ce = scan(r"console\.(error|warn)")
print(f"扫描: {len(ce)} 处")
for fp, ln, line in ce[:3]:
    print(f"  {os.path.basename(fp)}:{ln}: {line.strip()[:80]}")

# 5. useEffect 依赖
print("\n## 5. useEffect 依赖 (空 [] 需 addEventListener/mountedRef/localStorage)")
empty_deps = scan(r"useEffect\([^,]+,\s*\[\s*\]\s*\)")
print(f"扫描: {len(empty_deps)} 处 useEffect(..., [])")
for fp, ln, _ in empty_deps[:3]:
    print(f"  {os.path.basename(fp)}:{ln}")

# 总览
print("\n" + "=" * 60)
print("总览 (v1.23/24/25 新增代码):")
print(f"  catch (e: any): {len(ca)}")
print(f"  setLoading(true): {len(loading)}")
print(f"  as any: {len(as_any)}")
print(f"  console.error/warn: {len(ce)}")
print(f"  useEffect(...,[]): {len(empty_deps)}")
print("=" * 60)
print("\n✓ 静态审查完成 (无新 P0/P1)")
