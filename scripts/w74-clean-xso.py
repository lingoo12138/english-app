"""W74 清 103 条 X so 无意义短语 (verifier C 找的 bug)"""
import json
import re
from pathlib import Path

words = json.loads(Path('public/data/words.json').read_text())

# X so 模式: 副词 + "so" 构成的无意义 collocation
# 来源: w64-phrases-p5.py / w65-phrases-p6.py 等批量补齐脚本
PATTERN = re.compile(r'^[a-z]+\s+so$', re.IGNORECASE)

removed = 0
for w in words:
    phrases = w.get('phrases', [])
    if not phrases:
        continue
    new_phrases = []
    for p in phrases:
        en = p.get('en', '').strip()
        # 过滤 "X so" 模式 (where X is 1 word)
        if PATTERN.match(en) and len(en.split()) == 2 and en.split()[1] == 'so':
            removed += 1
            continue
        new_phrases.append(p)
    w['phrases'] = new_phrases

Path('public/data/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2))
print(f'✓ 清 X so: {removed} 条')
total = sum(1 for w in words if w.get('phrases'))
no = sum(1 for w in words if not w.get('phrases'))
print(f'phrases: {total}/{len(words)} ({total*100/len(words):.1f}%)')
print(f'无 phrases: {no}')
