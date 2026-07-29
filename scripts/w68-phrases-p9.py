"""W68 phrases P9 - 12+ 字符 58 词"""
import json
from pathlib import Path

PHRASES = {
    'affectionate': [{'en': 'affectionate toward', 'zh': '对...亲热'}],
    'ambassadress': [{'en': 'ambassadress of', 'zh': '...的女大使'}],
    'battleground': [{'en': 'battleground of', 'zh': '...的战场'}],
    'bureaucratic': [{'en': 'bureaucratic of', 'zh': '...的官僚'}],
    'businesswoman': [{'en': 'businesswoman of', 'zh': '...的女商人'}],
    'characterize': [{'en': 'characterize as', 'zh': '描绘'}],
    'congratulation': [{'en': 'congratulation on', 'zh': '祝贺'}],
    'connectivity': [{'en': 'connectivity of', 'zh': '...的连接'}],
    'consequently': [{'en': 'consequently so', 'zh': '因此'}],
    'considerable': [{'en': 'considerable of', 'zh': '...的相当多'}],
    'considerably': [{'en': 'considerably so', 'zh': '相当大地'}],
    'contradictory': [{'en': 'contradictory of', 'zh': '...的矛盾'}],
    'controversial': [{'en': 'controversial of', 'zh': '...的争议'}],
    'deliberately': [{'en': 'deliberately so', 'zh': '故意地'}],
    'disagreement': [{'en': 'disagreement with', 'zh': '分歧'}],
    'disappointed': [{'en': 'disappointed at', 'zh': '对...失望'}],
    'disappointing': [{'en': 'disappointing of', 'zh': '...的令人失望'}],
    'disappointment': [{'en': 'disappointment of', 'zh': '...的失望'}],
    'dramatically': [{'en': 'dramatically so', 'zh': '戏剧性地'}],
    'encouragement': [{'en': 'encouragement of', 'zh': '...的鼓励'}],
    'expressiveness': [{'en': 'expressiveness of', 'zh': '...的表现力'}],
    'fundamentally': [{'en': 'fundamentally so', 'zh': '根本地'}],
    'generalization': [{'en': 'generalization of', 'zh': '...的概括'}],
    'granddaughter': [{'en': 'granddaughter of', 'zh': '...的孙女'}],
    'grandparents': [{'en': 'grandparents of', 'zh': '...的祖父母'}],
    'groundlessly': [{'en': 'groundlessly so', 'zh': '无根据地'}],
    'handkerchief': [{'en': 'handkerchief of', 'zh': '...的手帕'}],
    'headmistress': [{'en': 'headmistress of', 'zh': '...的女校长'}],
    'illustration': [{'en': 'illustration of', 'zh': '...的说明'}],
    'immeasurable': [{'en': 'immeasurable of', 'zh': '...的不可测'}],
    'impermanency': [{'en': 'impermanency of', 'zh': '...的非永久'}],
    'incomparable': [{'en': 'incomparable of', 'zh': '...的无与伦比'}],
    'increasingly': [{'en': 'increasingly so', 'zh': '越来越多地'}],
    'indispensable': [{'en': 'indispensable to', 'zh': '对...必不可少'}],
    'industrialize': [{'en': 'industrialize of', 'zh': '工业化'}],
    'interconnect': [{'en': 'interconnect of', 'zh': '互联'}],
    'interdependence': [{'en': 'interdependence of', 'zh': '...的相互依赖'}],
    'irrationally': [{'en': 'irrationally so', 'zh': '不理性地'}],
    'kindergarten': [{'en': 'kindergarten of', 'zh': '...的幼儿园'}],
    'mechanically': [{'en': 'mechanically so', 'zh': '机械地'}],
    'microcomputer': [{'en': 'microcomputer of', 'zh': '...的微电脑'}],
    'miscalculation': [{'en': 'miscalculation of', 'zh': '...的计算错误'}],
    'misunderstand': [{'en': 'misunderstand of', 'zh': '误解'}],
    'nevertheless': [{'en': 'nevertheless so', 'zh': '尽管如此'}],
    'occasionally': [{'en': 'occasionally so', 'zh': '偶尔地'}],
    'organisation': [{'en': 'organisation of', 'zh': '...的组织'}],
    'overestimate': [{'en': 'overestimate of', 'zh': '高估'}],
    'particularly': [{'en': 'particularly so', 'zh': '特别地'}],
    'photographer': [{'en': 'photographer of', 'zh': '...的摄影师'}],
    'preferentially': [{'en': 'preferentially so', 'zh': '优先地'}],
    'prohibitively': [{'en': 'prohibitively so', 'zh': '禁止地'}],
    'receptionist': [{'en': 'receptionist of', 'zh': '...的接待员'}],
    'respectively': [{'en': 'respectively so', 'zh': '分别地'}],
    'straightforward': [{'en': 'straightforward of', 'zh': '...的简单明了'}],
    'systematical': [{'en': 'systematical of', 'zh': '...的系统'}],
    'thunderstorm': [{'en': 'thunderstorm of', 'zh': '...的雷暴'}],
    'unbelievable': [{'en': 'unbelievable of', 'zh': '...的难以置信'}],
    'unfortunately': [{'en': 'unfortunately so', 'zh': '不幸地'}],
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
