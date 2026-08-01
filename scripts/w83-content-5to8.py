#!/usr/bin/env python3
"""
w83-content-5to8.py — v1.89 W83 内容续补: 29 词 (5-8 字符)

策略: PIE / Old English / Latin / Greek / French / Hebrew / Chinese 词源
"""
import json
from pathlib import Path

ROOT_DICT = {
    # 5 字符 (13)
    'blaze': [{'root': 'OE blæse', 'meaning': '火焰, PIE *bhel- 燃烧/闪光', 'type': 'root'}],
    'boast': [{'root': 'ME bosten', 'meaning': '吹嘘, 拟声', 'type': 'root'}],
    'boost': [{'root': 'ME bosten', 'meaning': '推/升, 拟声', 'type': 'root'}],
    'booth': [{'root': 'ON buð', 'meaning': '临时居所, PIE *bheu- 居住/存在', 'type': 'root'}],
    'bosom': [{'root': 'OE bōsm', 'meaning': '胸, PIE *bheu- 膨胀/鼓起', 'type': 'root'}],
    'bough': [{'root': 'OE bōg', 'meaning': '树枝, PIE *bheug- 弯/弓', 'type': 'root'}],
    'bound': [{'root': 'ON bunðinn', 'meaning': '准备好的, 拟声', 'type': 'root'}],
    'China': [{'root': 'Sanskrit Cīna', 'meaning': '中国, 梵语 秦', 'type': 'root'}],
    'ditch': [{'root': 'OE dīc', 'meaning': '沟, PIE *dheigw- 挖/堤', 'type': 'root'}],
    'Egypt': [{'root': 'Gk Aigyptos', 'meaning': '埃及, 希腊语', 'type': 'root'}],
    'Greek': [{'root': 'L Graecus', 'meaning': '希腊人, L Graecia 希腊', 'type': 'root'}],
    'Tibet': [{'root': 'Tibetan', 'meaning': '西藏, 藏语 bod', 'type': 'root'}],
    'Tokyo': [{'root': 'Japanese', 'meaning': '东京, 日语 とうきょう (东京都)', 'type': 'root'}],

    # 6 字符 (5)
    'Europe': [{'root': 'Gk Europe', 'meaning': '欧洲, 希腊神话 Europa 腓尼基公主', 'type': 'root'}],
    'Moscow': [{'root': 'Russian Moskva', 'meaning': '莫斯科, 俄语 (古斯拉夫)', 'type': 'root'}],
    'Moslem': [{'root': 'Arabic muslim', 'meaning': '穆斯林, 阿语 muslim 顺从者', 'type': 'root'}],
    'Ottawa': [{'root': 'Algonquian', 'meaning': '渥太华, 阿尔冈昆语 adawe 贸易', 'type': 'root'}],
    'Russia': [{'root': 'Russian Rus', 'meaning': '俄罗斯, 罗斯 维京人', 'type': 'root'}],

    # 7 字符 (6)
    'mailbox': [{'root': 'mail + box', 'meaning': '邮箱, OE mæl 袋 + OE box 盒', 'type': 'root'}],
    'olympic': [{'root': 'Gk Olympos', 'meaning': '奥林匹亚, 希腊山名', 'type': 'root'}],
    'oneself': [{'root': 'one + self', 'meaning': '自己, OE ān 一 + OE self 自身', 'type': 'root'}],
    'prairie': [{'root': 'F prairie', 'meaning': '大草原, L pratum 草地', 'type': 'root'}],
    'squeeze': [{'root': 'OE cwȳsan', 'meaning': '挤压, PIE *gweus- 压/拧', 'type': 'root'}],
    'twelfth': [{'root': 'OE twelfta', 'meaning': '第十二, OE twelf 十二 + -tha 序数', 'type': 'root'}],

    # 8 字符 (5)
    'oilfield': [{'root': 'oil + field', 'meaning': '油田, OE olie 油 + OE feld 田', 'type': 'root'}],
    'omelette': [{'root': 'F omelette', 'meaning': '煎蛋, L lamella 小薄片', 'type': 'root'}],
    'seashell': [{'root': 'sea + shell', 'meaning': '海贝, OE sǣ 海 + OE sciell 贝壳', 'type': 'root'}],
    'sunburnt': [{'root': 'sun + burnt', 'meaning': '晒伤, OE sunne 太阳 + OE byrnan 燃烧', 'type': 'root'}],
    'washroom': [{'root': 'wash + room', 'meaning': '洗手间, OE wascan 洗 + OE rūm 空间', 'type': 'root'}],

    # 9 字符 (5)
    'salesgirl': [{'root': 'sale + girl', 'meaning': '女售货员, OE sala 卖 + OE gyrl 女孩', 'type': 'root'}],
    'schoolbag': [{'root': 'school + bag', 'meaning': '书包, OE scōl 学校 + ON baggi 袋', 'type': 'root'}],
    'skyrocket': [{'root': 'sky + rocket', 'meaning': '冲天火箭, ON ský 云 + It rocchetta 线轴', 'type': 'root'}],
    'spaghetti': [{'root': 'It spago', 'meaning': '意大利面, It spago 绳/线', 'type': 'root'}],
    'stopwatch': [{'root': 'stop + watch', 'meaning': '秒表, ME stoppen 停 + OE wæcce 守夜', 'type': 'root'}],
}


def main():
    src = Path('public/data/words.json')
    words = json.loads(src.read_text())
    filled = 0
    not_found = []
    for w in words:
        w_key = w['word']  # case-sensitive (China, Egypt 等)
        if w_key in ROOT_DICT:
            w['roots'] = ROOT_DICT[w_key]
            filled += 1
        elif w.get('roots') is None and 5 <= len(w_key) <= 9:
            not_found.append(w_key)

    src.write_text(json.dumps(words, ensure_ascii=False, indent=2))
    print(f"✓ 补 {filled} 词 roots (5-8 字符)")
    if not_found:
        print(f"⚠ 仍缺 roots 的 5-8 字符词 ({len(not_found)}): {not_found}")


if __name__ == '__main__':
    main()
