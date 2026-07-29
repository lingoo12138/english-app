"""
W58 找剩余 543 词 roots - 严格 substring match
- wordroot.txt 中所有 root (key + example) >= 3 字符
- word 包含 root, word != root, root <= 2/3 word
"""
import json
import re
import ast
from pathlib import Path

# 1. Parse wordroot.txt
text = Path('data/external/wordroot.txt').read_text()
root_data = ast.literal_eval(text)

all_roots = set()
example_to_roots = {}
for root_key, info in root_data.items():
    keys = re.split(r'[\s,/]+', root_key.replace('-', '').lower())
    for k in keys:
        k = k.strip()
        if k and len(k) >= 3:
            all_roots.add(k)
    for ex in info.get('example', []):
        ex_low = ex.lower().strip()
        if ex_low and len(ex_low) >= 4 and ' ' not in ex_low and '-' not in ex_low:
            all_roots.add(ex_low)
    meaning = info.get('meaning', '')
    for ex in info.get('example', []):
        ex_low = ex.lower().strip()
        if ex_low:
            example_to_roots.setdefault(ex_low, []).append({
                'root': root_key, 'meaning': meaning
            })

print(f'所有 root (含 example): {len(all_roots)}')

# 2. 配 543 词
words = json.loads(Path('public/data/words.json').read_text())
no_roots = [w for w in words if not w.get('roots')]
print(f'无 roots: {len(no_roots)}')

def find_root_in_word(word):
    word_low = word.lower()
    matches = []
    for r in all_roots:
        if r in word_low and r != word_low and len(r) >= 3:
            if len(word_low) >= 4 and len(r) <= len(word_low) * 2 // 3:
                matches.append(r)
    return matches

matched = 0
for w in no_roots:
    roots_found = find_root_in_word(w['word'])
    if roots_found:
        roots_found.sort(key=lambda x: -len(x))
        w['roots'] = [{'root': r, 'meaning': f'含 {r} 词根'} for r in roots_found[:2]]
        matched += 1

Path('public/data/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2))
total = sum(1 for w in words if w.get('roots'))
print(f'✓ substring 匹配: {matched} / 543')
print(f'总 roots: {total} / {len(words)}')
unmatched = [w['word'] for w in words if not w.get('roots')]
print(f'剩余: {len(unmatched)}')
print('剩余抽样:')
for w in unmatched[:20]:
    print(f'  {w}')
