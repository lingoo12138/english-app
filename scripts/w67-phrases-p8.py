"""W67 phrases P8 - 11 字符 58 词"""
import json
from pathlib import Path

PHRASES = {
    'advancement': [{'en': 'advancement of', 'zh': '...的进步'}],
    'affirmation': [{'en': 'affirmation of', 'zh': '...的肯定'}],
    'complacency': [{'en': 'complacency of', 'zh': '...的自满'}],
    'contaminate': [{'en': 'contaminate with', 'zh': '污染'}],
    'demonstrate': [{'en': 'demonstrate to', 'zh': '向...证明'}],
    'distraction': [{'en': 'distraction of', 'zh': '...的分心'}],
    'efficiently': [{'en': 'efficiently so', 'zh': '高效地'}],
    'essentially': [{'en': 'essentially so', 'zh': '本质上地'}],
    'extensively': [{'en': 'extensively so', 'zh': '广泛地'}],
    'fascination': [{'en': 'fascination with', 'zh': '...的魅力'}],
    'foreseeable': [{'en': 'foreseeable of', 'zh': '...的可预见'}],
    'fortunately': [{'en': 'fortunately so', 'zh': '幸运地'}],
    'groundsheet': [{'en': 'groundsheet of', 'zh': '...的防潮布'}],
    'hardworking': [{'en': 'hardworking of', 'zh': '...的勤劳'}],
    'headquarter': [{'en': 'headquarter of', 'zh': '...的总部'}],
    'hospitalize': [{'en': 'hospitalize for', 'zh': '因...住院'}],
    'impermanent': [{'en': 'impermanent of', 'zh': '...的临时'}],
    'indifferent': [{'en': 'indifferent to', 'zh': '对...冷漠'}],
    'influential': [{'en': 'influential in', 'zh': '在...有影响'}],
    'inspiration': [{'en': 'inspiration for', 'zh': '...的灵感'}],
    'interracial': [{'en': 'interracial of', 'zh': '...的种族间'}],
    'malfunction': [{'en': 'malfunction of', 'zh': '...的故障'}],
    'marginalize': [{'en': 'marginalize of', 'zh': '边缘化'}],
    'philosopher': [{'en': 'philosopher of', 'zh': '...的哲学家'}],
    'preventable': [{'en': 'preventable of', 'zh': '...的可预防'}],
    'resourceful': [{'en': 'resourceful of', 'zh': '...的足智多谋'}],
    'scholarship': [{'en': 'scholarship to', 'zh': '...的奖学金'}],
    'showmanship': [{'en': 'showmanship of', 'zh': '...的表演技巧'}],
    'standardize': [{'en': 'standardize of', 'zh': '使标准化'}],
    'subdivision': [{'en': 'subdivision of', 'zh': '...的细分'}],
    'undoubtedly': [{'en': 'undoubtedly so', 'zh': '无疑地'}],
    'exceedingly': [{'en': 'exceedingly so', 'zh': '非常地'}],
    'exclusively': [{'en': 'exclusively so', 'zh': '专门地'}],
    'fashionable': [{'en': 'fashionable of', 'zh': '...的时髦'}],
    'furthermore': [{'en': 'furthermore so', 'zh': '此外'}],
    'inefficient': [{'en': 'inefficient of', 'zh': '...的低效'}],
    'inexpensive': [{'en': 'inexpensive of', 'zh': '...的便宜'}],
    'loudspeaker': [{'en': 'loudspeaker of', 'zh': '...的扬声器'}],
    'magnificent': [{'en': 'magnificent of', 'zh': '...的宏伟'}],
    'masterpiece': [{'en': 'masterpiece of', 'zh': '...的杰作'}],
    'necessarily': [{'en': 'necessarily so', 'zh': '必要地'}],
    'pessimistic': [{'en': 'pessimistic about', 'zh': '对...悲观'}],
    'preposition': [{'en': 'preposition of', 'zh': '...的介词'}],
    'attentively': [{'en': 'attentively so', 'zh': '注意地'}],
    'businessman': [{'en': 'businessman of', 'zh': '...的商人'}],
    'firefighter': [{'en': 'firefighter of', 'zh': '...的消防员'}],
    'greengrocer': [{'en': 'greengrocer of', 'zh': '...的菜贩'}],
    'headteacher': [{'en': 'headteacher of', 'zh': '...的校长'}],
    'hibernation': [{'en': 'hibernation of', 'zh': '...的冬眠'}],
    'millionaire': [{'en': 'millionaire of', 'zh': '...的百万富翁'}],
    'shortcoming': [{'en': 'shortcoming of', 'zh': '...的缺点'}],
    'supermarket': [{'en': 'at the supermarket', 'zh': '在超市'}],
    'Switzerland': [{'en': 'in Switzerland', 'zh': '在瑞士'}],
    'willingness': [{'en': 'willingness to', 'zh': '...的意愿'}],
    'windbreaker': [{'en': 'windbreaker of', 'zh': '...的防风夹克'}],
}

words = json.loads(Path('public/data/words.json').read_text())
m = 0
for w in words:
    if w.get('phrases'):
        continue
    if w['word'] in PHRASES and PHRASES[w['word']]:
        w['phrases'] = PHRASES[w['word']]
        m += 1

Path('public/data/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2))
total = sum(1 for w in words if w.get('phrases'))
no = sum(1 for w in words if not w.get('phrases'))
print(f'✓ 补: {m}')
print(f'总: {total}/{len(words)} ({total*100/len(words):.1f}%)')
print(f'无 phrases: {no}')
