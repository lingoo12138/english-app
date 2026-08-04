#!/usr/bin/env python3
"""W95: 补剩 93 词 examples → 100% 全覆盖 (W94 续)"""
import json
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / 'public' / 'data' / 'words.json'
DICT_FILE = Path(__file__).parent.parent / 'scripts' / 'w95-fill-examples.json'


def run():
    """W95 主逻辑"""
    with open(DICT_FILE) as f:
        DATA = json.load(f)

    filled = 0

    with open(DATA_FILE) as f:
        data = json.load(f)

    words = data['words'] if isinstance(data, dict) and 'words' in data else data

    for w in words:
        if not isinstance(w, dict):
            continue
        word = w.get('word', '')
        if word not in DATA:
            continue
        entry = DATA[word]
        # 补 examples (W94 经验: 修 v1 删死代码)
        if not w.get('examples') and entry.get('en'):
            w['examples'] = [{'en': entry['en'], 'zh': entry['zh'], 'scene': entry['scene']}]
            filled += 1

    print(f'W95 补 examples: {filled} 词')

    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 验证
    with open(DATA_FILE) as f:
        data2 = json.load(f)
    words2 = data2['words'] if isinstance(data2, dict) and 'words' in data2 else data2
    no_ex = sum(1 for w in words2 if isinstance(w, dict) and not w.get('examples'))
    total = len(words2)
    print(f'\n=== W95 完结 ===')
    print(f'总词: {total}')
    print(f'缺 examples: {no_ex} ({no_ex/total*100:.2f}%)')
    print(f'examples 覆盖: {(total-no_ex)/total*100:.2f}%')


if __name__ == '__main__':
    run()
