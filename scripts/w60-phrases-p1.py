"""W60 phrases 补 - primary+junior 70 词"""
import json
from pathlib import Path

# 70 词 1-2 短语 (基础词用, 不编造)
PHRASES = {
    # 2 字符
    'an': [{'en': 'an apple', 'zh': '一个苹果'}, {'en': 'an hour', 'zh': '一小时'}],
    'gy': [],
    'mm': [],
    'my': [{'en': 'my friend', 'zh': '我的朋友'}, {'en': 'my family', 'zh': '我的家人'}],
    'ox': [{'en': 'strong as an ox', 'zh': '壮如牛'}],
    # 3 字符
    'ago': [{'en': 'long ago', 'zh': '很久以前'}, {'en': 'a while ago', 'zh': '刚才'}],
    'any': [{'en': 'any more', 'zh': '再；更'}, {'en': 'not any', 'zh': '一个也不'}],
    'ask': [{'en': 'ask for', 'zh': '请求；索要'}, {'en': 'ask about', 'zh': '询问'}],
    'far': [{'en': 'far away', 'zh': '远处'}, {'en': 'so far', 'zh': '到目前为止'}],
    'hen': [{'en': 'mother hen', 'zh': '母鸡；婆婆妈妈的人'}],
    'her': [{'en': 'with her', 'zh': '和她一起'}, {'en': 'for her', 'zh': '对她'}],
    'hey': [{'en': 'hey there', 'zh': '嘿；你好'}],
    'his': [{'en': 'his book', 'zh': '他的书'}],
    'hur': [],
    'hut': [{'en': 'wooden hut', 'zh': '小木屋'}],
    'jog': [{'en': 'go for a jog', 'zh': '去慢跑'}],
    'oar': [{'en': "row with oars", 'zh': '用桨划'}],
    'our': [{'en': 'our house', 'zh': '我们的家'}],
    'owe': [{'en': 'owe to', 'zh': '欠；感激'}],
    'paw': [{'en': "cat's paw", 'zh': '猫爪；爪牙'}],
    'pay': [{'en': 'pay for', 'zh': '付款'}, {'en': 'pay back', 'zh': '偿还；回报'}],
    'pub': [{'en': 'go to the pub', 'zh': '去酒吧'}],
    'ray': [{'en': 'a ray of', 'zh': '一线；一束'}],
    'rob': [{'en': 'rob of', 'zh': '抢夺'}],
    # 4 字符
    'acre': [{'en': '50 acres', 'zh': '50英亩'}],
    'bury': [{'en': 'bury in', 'zh': '埋在；沉浸于'}],
    'desk': [{'en': 'at the desk', 'zh': '在书桌前'}],
    'dorm': [{'en': 'live in a dorm', 'zh': '住宿舍'}],
    'emit': [{'en': 'emit light', 'zh': '发光'}],
    'kind': [{'en': 'kind of', 'zh': '有点；某种'}, {'en': 'a kind of', 'zh': '一种'}],
    'kilo': [{'en': 'a kilo of', 'zh': '一千克'}],
    'liar': [{'en': 'a good liar', 'zh': '善于说谎的人'}],
    'moan': [{'en': 'moan about', 'zh': '抱怨'}],
    'myth': [{'en': 'Greek myth', 'zh': '希腊神话'}],
    'none': [{'en': 'none of', 'zh': '没有一个'}, {'en': 'none but', 'zh': '只有'}],
    'numb': [{'en': 'numb with cold', 'zh': '冻僵了'}],
    'okay': [{'en': "it's okay", 'zh': '没关系'}, {'en': 'feel okay', 'zh': '感觉不错'}],
    'omit': [{'en': 'omit from', 'zh': '省略；删去'}],
    'once': [{'en': 'once a week', 'zh': '每周一次'}, {'en': 'once upon a time', 'zh': '从前'}],
    'ouch': [{'en': 'say ouch', 'zh': '喊痛'}],
    'ours': [{'en': 'a friend of ours', 'zh': '我们的一个朋友'}],
    'pale': [{'en': 'pale blue', 'zh': '淡蓝色'}, {'en': 'turn pale', 'zh': '脸色变白'}],
    'roar': [{'en': 'roar with laughter', 'zh': '放声大笑'}],
    'rude': [{'en': "it's rude", 'zh': '这不礼貌'}, {'en': 'rude to', 'zh': '对...粗鲁'}],
    'shed': [{'en': 'shed tears', 'zh': '流泪'}, {'en': 'shed light on', 'zh': '阐明'}],
    'soar': [{'en': 'soar above', 'zh': '高飞；飙升'}],
    'ours': [{'en': 'a friend of ours', 'zh': '我们的一个朋友'}],
    # 5+ 字符 primary
    'children': [{'en': "children's day", 'zh': '儿童节'}, {'en': "children's park", 'zh': '儿童公园'}],
    'email': [{'en': 'send an email', 'zh': '发邮件'}, {'en': 'by email', 'zh': '通过邮件'}],
    'favorite': [{'en': "my favorite", 'zh': '我最喜欢的'}, {'en': 'favorite color', 'zh': '最喜欢的颜色'}],
    'goodbye': [{'en': 'say goodbye', 'zh': '告别'}],
    # gaozhong
    'black': [{'en': 'black and white', 'zh': '黑白'}, {'en': 'black out', 'zh': '晕倒；断电'}],
    'blood': [{'en': 'blood type', 'zh': '血型'}, {'en': 'in cold blood', 'zh': '冷血地'}],
    'break': [{'en': 'take a break', 'zh': '休息'}, {'en': 'break down', 'zh': '出故障'}],
    # senior (国家缩写+少量)
    'bc': [{'en': '500 BC', 'zh': '公元前500年'}],
    'pc': [{'en': 'PC computer', 'zh': '个人电脑'}],
    'vcd': [{'en': 'VCD player', 'zh': 'VCD 播放机'}],
    'disc': [{'en': 'compact disc', 'zh': '光盘'}],
    'skilful': [{'en': 'skilful at', 'zh': '擅长'}],
    'olympic': [{'en': 'Olympic Games', 'zh': '奥运会'}],
    'Egypt': [{'en': 'ancient Egypt', 'zh': '古埃及'}],
    'Moscow': [{'en': 'in Moscow', 'zh': '在莫斯科'}],
    'Ottawa': [{'en': 'Ottawa city', 'zh': '渥太华市'}],
    'Russia': [{'en': 'in Russia', 'zh': '在俄罗斯'}],
    'Tibet': [{'en': 'Tibet Plateau', 'zh': '青藏高原'}],
    'Tokyo': [{'en': 'in Tokyo', 'zh': '在东京'}],
    'Moslem': [{'en': 'Moslem country', 'zh': '穆斯林国家'}],
    'guitar': [{'en': 'play guitar', 'zh': '弹吉他'}],
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
