#!/usr/bin/env python3
"""scripts/merge-wordlists.py - W56 合并 6 个开源词表 → words.json

数据源: kaCVanime/CEFR-VS-CN
- 小学 441 / 中考 1925 / 高中 3469 / CET4 4641 / CET6 2273 / 专四专八 8801

合并策略:
1. 解析每个文件, 提取唯一词
2. 优先级: 小学 < 中考 < 高中 < CET4 < CET6 < 专四专八 (低到高)
3. 已存在词保持原 difficulty/level, 新词按优先级给 level
4. 跳过单字母 / 非英文 / 重复
"""
import json
import re
from pathlib import Path

WORDS_PATH = Path('public/data/words.json')
WORDLISTS_DIR = Path('data/wordlists')

LEVEL_MAP = {
    '小学英语大纲词汇.txt': 'primary',
    '中考.txt': 'junior',
    '高中.txt': 'senior',
    '四级.txt': 'cet4',
    '六级.txt': 'cet6',
    '专四专八.txt': 'kaoyan',
}

# difficulty 映射 (跟 v1.61 一致)
DIFFICULTY_MAP = {
    'primary': 1,
    'junior': 2,
    'senior': 3,
    'gaozhong': 4,
    'cet4': 4,
    'cet6': 5,
    'kaoyan': 5,
    'daily': 5,
}

# tags
TAGS_MAP = {
    'primary': ['小学'],
    'junior': ['初中', '中考'],
    'senior': ['高中'],
    'gaozhong': ['高考'],
    'cet4': ['CET4'],
    'cet6': ['CET6'],
    'kaoyan': ['专四专八'],
    'daily': ['日常'],
}


def parse_wordlist(path: Path) -> list:
    """解析词表, 返回去重小写词列表"""
    words = set()
    for line in path.read_text(encoding='utf-8').split('\n'):
        word = line.strip().lower()
        # 过滤: 只字母, 长度 >= 2
        if not word or not re.match(r'^[a-z]+$', word):
            continue
        if len(word) < 2:
            continue
        words.add(word)
    return sorted(words)


def main():
    # 加载现有 words.json
    data = json.load(open(WORDS_PATH, encoding='utf-8'))
    print(f"现有 {len(data)} 词")

    # 现有 word id 集合
    existing_ids = {w.get('word', '').lower() for w in data if w.get('word')}

    # 按级别优先级加新词
    added = 0
    by_level = {}

    for filename, level in LEVEL_MAP.items():
        path = WORDLISTS_DIR / filename
        if not path.exists():
            print(f"  跳过 {filename} (不存在)")
            continue
        words = parse_wordlist(path)
        print(f"  {level}: 解析 {len(words)} 唯一词")

        for word in words:
            if word in existing_ids:
                continue  # 已存在, 跳过

            data.append({
                'id': word,
                'word': word,
                'translations': [word],  # 占位翻译, 用户能编辑
                'examples': [],
                'tags': TAGS_MAP.get(level, []),
                'level': level,
                'difficulty': DIFFICULTY_MAP.get(level, 3),
                'frequency': 3,
                'pos': [],
            })
            existing_ids.add(word)
            added += 1
            by_level[level] = by_level.get(level, 0) + 1

    print(f"\n新增 {added} 词:")
    for lvl, cnt in sorted(by_level.items()):
        print(f"  {lvl}: +{cnt}")

    # 保存 (按 word 排序)
    data.sort(key=lambda w: w.get('word', '').lower())
    with open(WORDS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\n总 {len(data)} 词")

    # 统计
    level_counts = {}
    for w in data:
        l = w.get('level')
        level_counts[l] = level_counts.get(l, 0) + 1
    print(f"\n8 档分布:")
    for l in ['primary', 'junior', 'senior', 'gaozhong', 'cet4', 'cet6', 'kaoyan', 'daily']:
        print(f"  {l}: {level_counts.get(l, 0)}")


if __name__ == '__main__':
    main()
