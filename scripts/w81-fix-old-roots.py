#!/usr/bin/env python3
"""
w81-fix-old-roots.py — 修 1539 旧 root 缺 type 字段

UI 在 r.type undefined 时 fallback 到 '词根' (不破), 但 schema 不一致
统一: 缺 type 的 root 加 type='root' (默认)
"""
import json
from pathlib import Path


def main():
    src = Path('public/data/words.json')
    words = json.loads(src.read_text())
    fixed = 0
    for w in words:
        if not w.get('roots'):
            continue
        new_roots = []
        for r in w['roots']:
            if 'type' not in r:
                r = {**r, 'type': 'root'}
                fixed += 1
            new_roots.append(r)
        w['roots'] = new_roots
    src.write_text(json.dumps(words, ensure_ascii=False, indent=2))
    print(f"✓ 修 {fixed} root 字段 (加 type='root')")


if __name__ == '__main__':
    main()
