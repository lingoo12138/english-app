"""
W59 给 17 词无 phrases 补 (主目标) + 给 42 词 4 字符以下也补
- 17 词: 全部手工 phrases (a/ax/bark/boat/brow/chop/dull/from/gym/he/him/I/June/lest/me/onto/via)
- 优先 level 频次, 按 learning value 配
"""
import json
from pathlib import Path

# 17 词手工 phrases (基础词 + 1-2 短语, 短而精)
PHRASES_17 = {
    'a': [
        {'en': 'a few', 'zh': '一些；几个'},
        {'en': 'a lot of', 'zh': '许多；大量'},
        {'en': 'a piece of', 'zh': '一片/块/张'},
    ],
    'ax': [
        {'en': 'an ax to grind', 'zh': '有个人打算/私心'},
        {'en': 'split with an ax', 'zh': '用斧头劈开'},
    ],
    'bark': [
        {'en': 'bark at', 'zh': '向...吠叫'},
        {'en': "dog's bark", 'zh': '狗叫声'},
    ],
    'boat': [
        {'en': 'by boat', 'zh': '乘船'},
        {'en': 'row a boat', 'zh': '划船'},
        {'en': 'fishing boat', 'zh': '渔船'},
    ],
    'brow': [
        {'en': 'knit one\'s brow', 'zh': '皱眉'},
        {'en': 'eyebrow', 'zh': '眉毛'},
    ],
    'chop': [
        {'en': 'chop down', 'zh': '砍倒'},
        {'en': 'chop up', 'zh': '切碎'},
        {'en': 'pork chop', 'zh': '猪排'},
    ],
    'dull': [
        {'en': 'dull pain', 'zh': '隐痛'},
        {'en': 'dull weather', 'zh': '阴沉的天气'},
        {'en': 'dull book', 'zh': '枯燥的书'},
    ],
    'from': [
        {'en': 'come from', 'zh': '来自'},
        {'en': 'far from', 'zh': '远非；远离'},
        {'en': 'from now on', 'zh': '从现在起'},
    ],
    'gym': [
        {'en': 'at the gym', 'zh': '在体育馆'},
        {'en': 'gym class', 'zh': '体育课'},
    ],
    'he': [
        {'en': 'he and she', 'zh': '他和她'},
    ],
    'him': [
        {'en': 'for him', 'zh': '对他来说'},
        {'en': 'with him', 'zh': '和他一起'},
    ],
    'I': [
        {'en': 'I see', 'zh': '我明白了'},
        {'en': 'I think', 'zh': '我认为'},
    ],
    'June': [
        {'en': 'in June', 'zh': '在六月'},
        {'en': 'June 1st', 'zh': '六月一日'},
    ],
    'lest': [
        {'en': 'lest we forget', 'zh': '以免我们忘记'},
    ],
    'me': [
        {'en': 'with me', 'zh': '和我'},
        {'en': 'for me', 'zh': '对我来说'},
    ],
    'onto': [
        {'en': 'jump onto', 'zh': '跳到...上'},
        {'en': 'hold onto', 'zh': '抓住；坚持'},
    ],
    'via': [
        {'en': 'via email', 'zh': '通过邮件'},
        {'en': 'via the Internet', 'zh': '通过互联网'},
    ],
}

# 18 词 4 字符以下简单词 (junior + 4 字符以下无 phrases) - 简化手工补 (避免编造)
PHRASES_OTHER = {
    # primary 53 词无 roots, 部分也需补
    'boom': [
        {'en': 'baby boom', 'zh': '婴儿潮'},
        {'en': 'boom out', 'zh': '轰鸣；迅速发展'},
    ],
    'bun': [
        {'en': 'hair bun', 'zh': '发髻'},
    ],
    'bye': [
        {'en': 'bye-bye', 'zh': '再见'},
    ],
    'cab': [
        {'en': 'take a cab', 'zh': '打车'},
        {'en': 'taxi cab', 'zh': '出租车'},
    ],
    'dad': [
        {'en': 'dad and mom', 'zh': '爸爸妈妈'},
    ],
    'diet': [
        {'en': 'be on a diet', 'zh': '在节食'},
        {'en': 'balanced diet', 'zh': '均衡饮食'},
    ],
    'doll': [
        {'en': 'paper doll', 'zh': '纸娃娃'},
        {'en': 'Chinese doll', 'zh': '中国娃娃'},
    ],
    'fat': [
        {'en': 'fat cat', 'zh': '大款；富猫'},
        {'en': 'low fat', 'zh': '低脂'},
    ],
    'fax': [
        {'en': 'send a fax', 'zh': '发传真'},
    ],
    'feet': [
        {'en': 'on foot (feet)', 'zh': '步行'},
        {'en': 'drag one\'s feet', 'zh': '拖延'},
    ],
    'flee': [
        {'en': 'flee from', 'zh': '逃离'},
    ],
    'gram': [
        {'en': 'kilo gram', 'zh': '千克'},
    ],
    'ham': [
        {'en': 'ham and eggs', 'zh': '火腿蛋'},
    ],
    'has': [
        {'en': 'has to', 'zh': '不得不'},
    ],
    'howl': [
        {'en': 'howl with laughter', 'zh': '狂笑'},
    ],
    'is': [
        {'en': 'is going to', 'zh': '将要'},
    ],
    'jeep': [
        {'en': 'by jeep', 'zh': '坐吉普车'},
    ],
    'math': [
        {'en': 'math class', 'zh': '数学课'},
        {'en': 'do math', 'zh': '做数学题'},
    ],
    'men': [
        {'en': 'men and women', 'zh': '男女'},
    ],
    'Mom': [
        {'en': 'Mom and Dad', 'zh': '爸爸妈妈'},
    ],
    'mop': [
        {'en': 'mop the floor', 'zh': '拖地'},
    ],
    'mum': [
        {'en': 'mum\'s the word', 'zh': '保守秘密'},
    ],
    'road': [
        {'en': 'on the road', 'zh': '在路上；旅途中'},
        {'en': 'road map', 'zh': '路线图'},
    ],
    'rock': [
        {'en': 'rock music', 'zh': '摇滚乐'},
        {'en': 'between a rock and a hard place', 'zh': '进退两难'},
    ],
    'rot': [
        {'en': 'rot away', 'zh': '腐烂'},
    ],
    'run': [
        {'en': 'run away', 'zh': '逃跑'},
        {'en': 'run out of', 'zh': '用完'},
    ],
    'she': [
        {'en': 'she and he', 'zh': '她和他'},
    ],
    'smog': [
        {'en': 'heavy smog', 'zh': '浓雾霾'},
    ],
    'sun': [
        {'en': 'in the sun', 'zh': '在阳光下'},
        {'en': 'sun bathe', 'zh': '晒太阳'},
    ],
    'tax': [
        {'en': 'pay tax', 'zh': '缴税'},
        {'en': 'income tax', 'zh': '所得税'},
    ],
    'TV': [
        {'en': 'watch TV', 'zh': '看电视'},
        {'en': 'TV show', 'zh': '电视节目'},
    ],
    'us': [
        {'en': 'with us', 'zh': '和我们一起'},
    ],
    'wag': [
        {'en': 'wag tail', 'zh': '摇尾巴'},
    ],
    'woo': [
        {'en': 'woo customers', 'zh': '招揽顾客'},
    ],
    'Dr': [
        {'en': 'Dr. Smith', 'zh': '史密斯医生'},
    ],
    'CD': [
        {'en': 'burn a CD', 'zh': '刻录 CD'},
    ],
    'DVD': [
        {'en': 'on DVD', 'zh': '在 DVD 上'},
    ],
    'UK': [
        {'en': 'the UK', 'zh': '英国'},
    ],
    'PM': [
        {'en': 'PM 5 o\'clock', 'zh': '下午 5 点'},
    ],
    'mr': [
        {'en': 'Mr. Smith', 'zh': '史密斯先生'},
    ],
    'mrs': [
        {'en': 'Mrs. Smith', 'zh': '史密斯夫人'},
    ],
    'ms': [
        {'en': 'Ms. Smith', 'zh': '史密斯女士'},
    ],
    'pe': [
        {'en': 'PE class', 'zh': '体育课'},
    ],
    'OK': [
        {'en': "it's OK", 'zh': '没关系'},
    ],
    'Lost': [
        {'en': 'get lost', 'zh': '迷路'},
    ],
    'TRUE': [
        {'en': 'come true', 'zh': '实现；成真'},
    ],
}

# 3-4 字符 junior 词补 phrases (选 20 真有用的高频词)
PHRASES_JUNIOR = {
    'and': [
        {'en': 'and so on', 'zh': '等等'},
        {'en': 'bread and butter', 'zh': '面包黄油；生计'},
    ],
    'but': [
        {'en': 'not only... but also', 'zh': '不仅...而且'},
    ],
    'if': [
        {'en': 'if you like', 'zh': '如果你愿意'},
        {'en': 'as if', 'zh': '好像'},
    ],
    'of': [
        {'en': 'of course', 'zh': '当然'},
        {'en': 'because of', 'zh': '因为'},
    ],
    'or': [
        {'en': 'either... or', 'zh': '或者...或者'},
    ],
    'to': [
        {'en': 'look forward to', 'zh': '期待'},
        {'en': 'used to', 'zh': '过去常常'},
    ],
    'in': [
        {'en': 'in fact', 'zh': '事实上'},
        {'en': 'take part in', 'zh': '参加'},
    ],
    'on': [
        {'en': 'on time', 'zh': '准时'},
        {'en': 'depend on', 'zh': '依赖'},
    ],
    'no': [
        {'en': 'no longer', 'zh': '不再'},
        {'en': 'no problem', 'zh': '没问题'},
    ],
    'not': [
        {'en': 'not at all', 'zh': '一点也不'},
    ],
    'so': [
        {'en': 'so far', 'zh': '到目前为止'},
        {'en': 'so that', 'zh': '为了；以便'},
    ],
    'do': [
        {'en': 'do homework', 'zh': '做作业'},
        {'en': 'how do you do', 'zh': '你好'},
    ],
    'go': [
        {'en': 'go to school', 'zh': '去上学'},
        {'en': 'let go', 'zh': '放手'},
    ],
    'get': [
        {'en': 'get up', 'zh': '起床'},
        {'en': 'get along with', 'zh': '与...相处'},
    ],
    'make': [
        {'en': 'make friends', 'zh': '交朋友'},
        {'en': 'make sure', 'zh': '确保'},
    ],
    'have': [
        {'en': 'have to', 'zh': '不得不'},
        {'en': 'have a look', 'zh': '看一看'},
    ],
    'take': [
        {'en': 'take a break', 'zh': '休息一下'},
        {'en': 'take care of', 'zh': '照顾'},
    ],
    'look': [
        {'en': 'look at', 'zh': '看'},
        {'en': 'look for', 'zh': '寻找'},
    ],
    'feel': [
        {'en': 'feel like', 'zh': '想要'},
    ],
    'know': [
        {'en': 'get to know', 'zh': '认识'},
    ],
}

ALL_PHRASES = {**PHRASES_17, **PHRASES_OTHER, **PHRASES_JUNIOR}

words = json.loads(Path('public/data/words.json').read_text())
m = 0
for w in words:
    if w.get('phrases'):
        continue
    if w['word'] in ALL_PHRASES:
        w['phrases'] = ALL_PHRASES[w['word']]
        m += 1

Path('public/data/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2))
total_phrases = sum(1 for w in words if w.get('phrases'))
no_phrases = sum(1 for w in words if not w.get('phrases'))
print(f'✓ 补 phrases: {m}')
print(f'总 words 有 phrases: {total_phrases} / {len(words)}')
print(f'无 phrases: {no_phrases}')

# 8 档 roots 覆盖
from collections import Counter
roots_count = Counter()
total_count = Counter()
for w in words:
    l = w.get('level', 'unknown')
    total_count[l] += 1
    if w.get('roots'):
        roots_count[l] += 1
print('\n8 档 roots 覆盖率:')
for l in ['primary','junior','senior','gaozhong','cet4','cet6','kaoyan','daily']:
    t = total_count[l]
    r = roots_count[l]
    print(f'  {l:8s}: {r:4d}/{t:4d} ({r*100/t:.0f}%)')
