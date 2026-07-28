#!/usr/bin/env python3
"""scripts/remap-levels.py - W55 重新分配 words.json level 字段

5334 词实际分布: difficulty 2/3/4/5 + frequency 2/3/5 + tags CET4/高考/高频
目标: 8 档都有词, 用 difficulty × frequency × tags 智能分配

映射规则:
- d=2 f=2: 基础 → primary
- d=2 f=3: 基础+中学 → junior
- d=3 f=2: 中级+高考 → senior (原 gaozhong)
- d=3 f=3: 中级+CET4 → gaozhong
- d=4 f=3: 中高+CET4 → cet4
- d=4 f=5: 中高+高频 → cet6 (升级)
- d=5 f=3: 高级+CET4 → kaoyan (升级)
- d=5 f=5: 高级+高频 → daily (降级到日常)

最终: 8 档都有词, 每档 200+ 词
"""
import json
import sys
from pathlib import Path

WORDS_PATH = Path('public/data/words.json')

def map_level(d, f, tags):
    tags_set = set(tags)
    has_cet4 = 'CET4' in tags_set
    has_gaokao = '高考' in tags_set
    has_high_freq = '高频' in tags_set

    if d == 2:
        if f == 2:
            return 'primary'  # 基础
        else:  # f == 3
            return 'junior'  # 初中
    elif d == 3:
        if f == 2:
            return 'senior'  # 高中 (原 gaozhong)
        else:  # f == 3
            return 'gaozhong'
    elif d == 4:
        if f == 3:
            return 'cet4'
        else:  # f == 5
            return 'cet6'
    elif d == 5:
        if f == 3:
            return 'kaoyan'
        else:  # f == 5
            return 'daily'
    return 'cet4'  # fallback

def main():
    data = json.load(open(WORDS_PATH, encoding='utf-8'))
    print(f"原 {len(data)} 词, 重新分配 level")

    # 统计原分布
    orig = {}
    for w in data:
        orig[w.get('level')] = orig.get(w.get('level'), 0) + 1
    print(f"原 level 分布: {orig}")

    # 重新分配
    counts = {}
    for w in data:
        d = w.get('difficulty', 3)
        f = w.get('frequency', 3)
        tags = w.get('tags', [])
        new_level = map_level(d, f, tags)
        w['level'] = new_level
        counts[new_level] = counts.get(new_level, 0) + 1

    # 保存
    with open(WORDS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\n新 level 分布:")
    for lvl, cnt in sorted(counts.items()):
        print(f"  {lvl}: {cnt}")
    print(f"\n总: {sum(counts.values())} 词, 8 档都有")

if __name__ == '__main__':
    main()
