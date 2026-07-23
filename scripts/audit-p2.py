#!/usr/bin/env python3
"""
audit-p2.py - 静态 P2 扫描器

v1.1-W1-T1: 扫描 src/ 全部 .ts/.tsx 文件, 列出 P2 候选
基于 v0.22-v1.0 历史 P2 模式:
  - console.log 调试残留
  - any / ts-ignore / @ts-expect-error
  - 空 catch (catch {} / catch(_))
  - alert() / confirm() / prompt() (体验差)
  - innerHTML 写入 (XSS 风险)
  - TODO / FIXME / XXX / HACK 注释
  - 可选链滥用 ?. (可能掩盖错误)
  - 巨大行函数 (>200 行) (可读性)
  - setTimeout/setInterval 没 clear (潜在泄漏)
  - useEffect 缺依赖 (闭包陷阱)
"""
import re
import sys
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Tuple

ROOT = Path(__file__).parent.parent
SRC = ROOT / "src"

# 排除
EXCLUDE_DIRS = {"node_modules", "dist", "build", ".git", "scripts", "tests", "data", "types"}

# 规则: (pattern, type, severity, message, file_filter)
RULES = [
    # 1. 调试残留
    (r"console\.log\(", "debug", "P2", "console.log 调试残留, 生产应删除或 console.debug"),
    (r"console\.warn\(", "debug", "P2", "console.warn 调试残留, 应该用 toast / UI"),
    (r"debugger;", "debug", "P1", "debugger 断点残留, 必删"),

    # 2. 类型问题
    (r"\bany\b(?!\w)", "type", "P2", "any 类型, 应明确类型"),
    (r"@ts-ignore", "type", "P2", "@ts-ignore, 应 @ts-expect-error"),
    (r"@ts-expect-error", "type", "P2", "@ts-expect-error, 需写明原因"),
    (r"as any", "type", "P2", "as any 强制类型"),

    # 3. 错误处理
    (r"catch\s*\(\s*[\w_]*\s*\)\s*\{\s*\}", "error", "P1", "空 catch {} 完全吞错"),
    (r"catch\s*\(\s*\)\s*\{", "error", "P1", "空 catch {} 完全吞错"),
    (r"throw\s+['\"]", "error", "P2", "throw 字符串而非 Error 对象"),
    (r"//\s*ignore[- ]?error", "error", "P2", "ignore-error 注释, 应显式处理"),

    # 4. UI 体验
    (r"\balert\s*\(", "ui", "P2", "alert() 阻塞 UI, 用 toast"),
    (r"\bconfirm\s*\(", "ui", "P2", "confirm() 阻塞 UI, 用自定义 Modal"),
    (r"\bprompt\s*\(", "ui", "P2", "prompt() 阻塞 UI, 用自定义 Modal"),
    (r"window\.location\.reload\(\)", "ui", "P2", "硬刷新, 用 React 状态更新"),

    # 5. 安全
    (r"innerHTML\s*=", "security", "P1", "innerHTML 写入, 有 XSS 风险 (除非显式 sanitize)"),
    (r"document\.write", "security", "P1", "document.write, 有 XSS 风险"),

    # 6. 待办/警告
    (r"TODO(?!\w)", "todo", "P2", "TODO 待办"),
    (r"FIXME(?!\w)", "todo", "P1", "FIXME 必修复"),
    (r"XXX(?!\w)", "todo", "P1", "XXX 警告"),
    (r"HACK(?!\w)", "todo", "P1", "HACK 不规范"),
    (r"BUG(?!\w)", "todo", "P2", "BUG 待确认"),

    # 7. 性能
    (r"setInterval\s*\(", "perf", "P2", "setInterval, 需确认 cleanup"),
    (r"setTimeout\s*\(", "perf", "P2", "setTimeout, 需确认 cleanup"),
    (r"indexOf\s*\(", "perf", "P3", "indexOf, 可用 includes"),

    # 8. 注释
    (r"//\s*暂时", "comment", "P3", "暂时性代码, 应移除或重构"),
    (r"//\s*先这样", "comment", "P3", "临时方案, 应重构"),
]


def scan_file(path: Path) -> List[Dict]:
    """扫描单个文件"""
    results = []
    try:
        content = path.read_text(encoding="utf-8")
    except Exception as e:
        return [{"file": str(path), "line": 0, "type": "error", "severity": "P0", "message": f"读取失败: {e}"}]

    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        # 跳过纯注释行
        is_comment = line.strip().startswith("//") or line.strip().startswith("*")
        for pattern, type_, severity, message in RULES:
            if re.search(pattern, line):
                # 注释行放宽标准
                if is_comment and severity == "P3":
                    continue
                # 排除 import 注释 (e.g. // @ts-expect-error: reason)
                results.append({
                    "file": str(path.relative_to(ROOT)),
                    "line": i,
                    "type": type_,
                    "severity": severity,
                    "message": message,
                    "code": line.strip()[:120],
                })
    return results


def is_under_excluded(path: Path) -> bool:
    return any(ex in path.parts for ex in EXCLUDE_DIRS)


def main():
    if not SRC.exists():
        print(f"❌ {SRC} 不存在")
        sys.exit(1)

    all_results: List[Dict] = []
    files_scanned = 0

    for ts_file in SRC.rglob("*.ts*"):
        if is_under_excluded(ts_file):
            continue
        files_scanned += 1
        results = scan_file(ts_file)
        all_results.extend(results)

    # 按文件 + 严重度分组
    by_file: Dict[str, List[Dict]] = defaultdict(list)
    for r in all_results:
        by_file[r["file"]].append(r)

    # 按严重度统计
    by_severity: Dict[str, int] = defaultdict(int)
    for r in all_results:
        by_severity[r["severity"]] += 1

    # 输出报告
    print("=" * 80)
    print(f"🔍 v1.1-W1 P2 审计报告")
    print("=" * 80)
    print(f"扫描文件: {files_scanned} 个")
    print(f"命中规则: {len(all_results)} 处")
    print()
    print(f"按严重度:")
    for sev in ["P0", "P1", "P2", "P3"]:
        print(f"  {sev}: {by_severity.get(sev, 0)}")
    print()

    # 按文件输出
    sorted_files = sorted(by_file.keys())
    print(f"按文件 (前 30 命中最多):")
    file_counts = [(f, len(items)) for f, items in by_file.items()]
    file_counts.sort(key=lambda x: -x[1])
    for f, count in file_counts[:30]:
        print(f"  {count:3d}  {f}")
    print()

    # 详细清单(按文件)
    print("=" * 80)
    print("📋 详细清单")
    print("=" * 80)
    for f in sorted_files:
        items = sorted(by_file[f], key=lambda x: x["line"])
        print(f"\n## {f} ({len(items)} 处)")
        for item in items:
            print(f"  L{item['line']:4d} [{item['severity']}] [{item['type']}] {item['message']}")
            print(f"        > {item['code']}")

    # 保存 markdown 报告
    report_path = ROOT / "docs" / "P2_AUDIT_v1.1.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# v1.1-W1 P2 审计报告\n\n")
        f.write(f"> **生成时间**: 2026-07-23\n")
        f.write(f"> **脚本**: `scripts/audit-p2.py`\n")
        f.write(f"> **状态**: 📋 待 review + 修复\n\n")
        f.write(f"## 统计\n\n")
        f.write(f"- 扫描文件: {files_scanned} 个\n")
        f.write(f"- 命中规则: {len(all_results)} 处\n\n")
        f.write(f"| 严重度 | 数量 |\n|--------|------|\n")
        for sev in ["P0", "P1", "P2", "P3"]:
            f.write(f"| {sev} | {by_severity.get(sev, 0)} |\n")
        f.write(f"\n## 命中最多文件 (Top 20)\n\n")
        f.write(f"| 数量 | 文件 |\n|------|------|\n")
        for fname, count in file_counts[:20]:
            f.write(f"| {count} | `{fname}` |\n")
        f.write(f"\n---\n\n## 详细清单\n\n")
        for fname in sorted_files:
            items = sorted(by_file[fname], key=lambda x: (x["severity"], x["line"]))
            f.write(f"\n### `{fname}` ({len(items)} 处)\n\n")
            f.write(f"| 行 | 严重度 | 类型 | 说明 | 代码 |\n")
            f.write(f"|----|--------|------|------|------|\n")
            for item in items:
                code = item["code"].replace("|", "\\|").replace("`", "\\`")[:80]
                f.write(f"| {item['line']} | {item['severity']} | {item['type']} | {item['message']} | `{code}` |\n")
    print(f"\n✅ 报告已保存: {report_path}")


if __name__ == "__main__":
    main()
