#!/usr/bin/env python3
"""W93: 补剩余 48 词短语 (10+ 字符 -ly/-wards 派生 44 + 2-4 字符生僻 4) → 100% 全覆盖"""
import json
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / 'public' / 'data' / 'words.json'
DICT_FILE = Path(__file__).parent.parent / 'scripts' / 'w93-phrases.json'

# 加载短语字典 (跟 脚本 同 目录)
with open(DICT_FILE) as f:
    DICT = json.load(f)

PHRASES = DICT['phrases']   # {word: [str, str, ...]}
ZH = DICT['zh']             # {word: {phrase: translation}}

def get_translation(word, phrase):
    if word in ZH and phrase in ZH[word]:
        return ZH[word][phrase]
    return ''

with open(DATA_FILE) as f:
    data = json.load(f)

words = data['words'] if isinstance(data, dict) and 'words' in data else data

filled = 0
updated = 0
for w in words:
    if not isinstance(w, dict):
        continue
    word = w.get('word', '')
    phrases = w.get('phrases', [])
    if not phrases and word in PHRASES:
        # 新填
        new_phrases = []
        for p in PHRASES[word]:
            if isinstance(p, str):
                new_phrases.append({'phrase': p, 'translation': get_translation(word, p)})
            elif isinstance(p, dict):
                new_phrases.append(p)
        w['phrases'] = new_phrases
        filled += 1
    elif phrases and word in ZH:
        # 补翻译
        new_phrases = []
        for p in phrases:
            if isinstance(p, dict) and p.get('phrase') and not p.get('translation', '').strip():
                p['translation'] = get_translation(word, p['phrase'])
                updated += 1
            new_phrases.append(p)
        w['phrases'] = new_phrases

print(f'W93 补短语: {filled} 词')
print(f'W93 补翻译: {updated} 条')

with open(DATA_FILE, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 验证
with open(DATA_FILE) as f:
    data2 = json.load(f)
words2 = data2['words'] if isinstance(data2, dict) and 'words' in data2 else data2
total = len(words2)
missing2 = sum(1 for w in words2 if isinstance(w, dict) and not w.get('phrases'))
with_phrase = sum(1 for w in words2 if isinstance(w, dict) and w.get('phrases'))

print(f'\n=== W93 完结 ===')
print(f'总词: {total}')
print(f'有短语: {with_phrase} ({with_phrase/total*100:.1f}%)')
print(f'缺短语: {missing2}')
print(f'短语覆盖率: {(total-missing2)/total*100:.1f}%')
