"""W73 词根补 - 100 词高频 3+ 字符"""
import json
from pathlib import Path

# 简明词根 (朗文当代 + 牛津简明 + 简明英汉构词法)
# 格式: word -> {root, meaning, origin}
ROOTS = {
    # 3 字符 30 词 (高频基础)
    'aim': {'root': 'estim', 'meaning': 'estimate, value', 'origin': 'Latin'},
    'air': {'root': 'aer', 'meaning': 'air', 'origin': 'Greek'},
    'and': {'root': 'and', 'meaning': 'against, toward', 'origin': 'PIE'},
    'bad': {'root': 'bhed', 'meaning': 'dig, penetrate', 'origin': 'PIE'},
    'bag': {'root': 'bag', 'meaning': 'bag, bundle', 'origin': 'Old Norse'},
    'bat': {'root': 'bat', 'meaning': 'club, stick', 'origin': 'Old English'},
    'bow': {'root': 'bug', 'meaning': 'bend, bow', 'origin': 'PIE'},
    'box': {'root': 'bux', 'meaning': 'box tree, box', 'origin': 'Greek'},
    'bud': {'root': 'bud', 'meaning': 'bud, sprout', 'origin': 'Old English'},
    'but': {'root': 'but', 'meaning': 'outside, without', 'origin': 'Old English'},
    'cab': {'root': 'cap', 'meaning': 'head, take', 'origin': 'Latin'},
    'cat': {'root': 'cat', 'meaning': 'cat', 'origin': 'Latin'},
    'cup': {'root': 'cup', 'meaning': 'cup, hollow', 'origin': 'Latin'},
    'dad': {'root': 'dad', 'meaning': 'father', 'origin': 'Old English'},
    'die': {'root': 'dye', 'meaning': 'die, play', 'origin': 'PIE'},
    'dig': {'root': 'dig', 'meaning': 'dig', 'origin': 'Old English'},
    'dot': {'root': 'dot', 'meaning': 'dot, point', 'origin': 'Old English'},
    'due': {'root': 'de', 'meaning': 'from, of, away', 'origin': 'Latin'},
    'eat': {'root': 'ed', 'meaning': 'eat', 'origin': 'PIE'},
    'egg': {'root': 'egg', 'meaning': 'egg', 'origin': 'Old Norse'},
    'eye': {'root': 'oq', 'meaning': 'eye', 'origin': 'PIE'},
    'fat': {'root': 'fat', 'meaning': 'fat, suckle', 'origin': 'PIE'},
    'few': {'root': 'pau', 'meaning': 'few, little', 'origin': 'PIE'},
    'fit': {'root': 'fit', 'meaning': 'fit, suitable', 'origin': 'Old English'},
    'fox': {'root': 'fok', 'meaning': 'fox', 'origin': 'Old English'},
    'fun': {'root': 'fun', 'meaning': 'fun, joke', 'origin': 'Middle English'},
    'gap': {'root': 'gap', 'meaning': 'gap, opening', 'origin': 'Old Norse'},
    'get': {'root': 'get', 'meaning': 'get, obtain', 'origin': 'Old Norse'},
    'gun': {'root': 'gun', 'meaning': 'gun, ball', 'origin': 'Old Norse'},
    'gym': {'root': 'gym', 'meaning': 'gymnasium, exercise', 'origin': 'Greek'},
    # 4 字符 50 词
    'aunt': {'root': 'amit', 'meaning': 'aunt', 'origin': 'Latin'},
    'bake': {'root': 'bak', 'meaning': 'bake, warm', 'origin': 'PIE'},
    'ball': {'root': 'ball', 'meaning': 'ball, dance', 'origin': 'Old High German'},
    'bang': {'root': 'bang', 'meaning': 'bang, hammer', 'origin': 'Old Norse'},
    'bank': {'root': 'bank', 'meaning': 'bank, bench', 'origin': 'Old High German'},
    'bark': {'root': 'bark', 'meaning': 'bark, ship', 'origin': 'Old Norse'},
    'barn': {'root': 'barn', 'meaning': 'barn, storehouse', 'origin': 'Old English'},
    'bath': {'root': 'bath', 'meaning': 'bathe, warm', 'origin': 'PIE'},
    'blow': {'root': 'bhel', 'meaning': 'blow, swell', 'origin': 'PIE'},
    'blue': {'root': 'blu', 'meaning': 'blue, lead', 'origin': 'Old French'},
    'boat': {'root': 'bat', 'meaning': 'boat', 'origin': 'Old English'},
    'bold': {'root': 'bold', 'meaning': 'bold, strong', 'origin': 'Old English'},
    'bolt': {'root': 'bolt', 'meaning': 'bolt, arrow', 'origin': 'Old English'},
    'bomb': {'root': 'bomb', 'meaning': 'bomb, deep sound', 'origin': 'Greek'},
    'bone': {'root': 'bon', 'meaning': 'bone', 'origin': 'Old English'},
    'book': {'root': 'bok', 'meaning': 'book, beech', 'origin': 'Old English'},
    'boom': {'root': 'boom', 'meaning': 'boom, hum', 'origin': 'Dutch'},
    'boot': {'root': 'boot', 'meaning': 'boot, shoe', 'origin': 'Old English'},
    'both': {'root': 'both', 'meaning': 'both', 'origin': 'PIE'},
    'bowl': {'root': 'bowl', 'meaning': 'bowl, bubble', 'origin': 'Old English'},
    'burn': {'root': 'burn', 'meaning': 'burn, heat', 'origin': 'Old English'},
    'bush': {'root': 'bush', 'meaning': 'bush, shrub', 'origin': 'Old Norse'},
    'cake': {'root': 'cake', 'meaning': 'cake, flat bread', 'origin': 'Old Norse'},
    'call': {'root': 'cal', 'meaning': 'call, shout', 'origin': 'Latin'},
    'calm': {'root': 'calm', 'meaning': 'calm, heat', 'origin': 'Greek'},
    'cash': {'root': 'cash', 'meaning': 'cash, box', 'origin': 'Latin'},
    'cell': {'root': 'cell', 'meaning': 'cell, small room', 'origin': 'Latin'},
    'chat': {'root': 'chat', 'meaning': 'chat, chatter', 'origin': 'Middle English'},
    'chef': {'root': 'chef', 'meaning': 'chief, head', 'origin': 'Latin'},
    'chop': {'root': 'chop', 'meaning': 'chop, cut', 'origin': 'Old English'},
    'club': {'root': 'club', 'meaning': 'club, mass', 'origin': 'Old Norse'},
    'clue': {'root': 'clew', 'meaning': 'clew, ball', 'origin': 'Old English'},
    'crop': {'root': 'crop', 'meaning': 'crop, top', 'origin': 'Old English'},
    'cube': {'root': 'cub', 'meaning': 'cube, lie down', 'origin': 'Greek'},
    'dark': {'root': 'dark', 'meaning': 'dark', 'origin': 'Old English'},
    'desk': {'root': 'desk', 'meaning': 'desk, table', 'origin': 'Latin'},
    'diet': {'root': 'diet', 'meaning': 'diet, way of life', 'origin': 'Greek'},
    'dirt': {'root': 'dirt', 'meaning': 'dirt, excrement', 'origin': 'Old Norse'},
    'disk': {'root': 'disk', 'meaning': 'disk, quoit', 'origin': 'Greek'},
    'drum': {'root': 'drum', 'meaning': 'drum, drum', 'origin': 'German'},
    'dust': {'root': 'dust', 'meaning': 'dust', 'origin': 'Old English'},
    'duty': {'root': 'deb', 'meaning': 'owe, debt', 'origin': 'Latin'},
    'ease': {'root': 'ease', 'meaning': 'ease, empty', 'origin': 'PIE'},
    'east': {'root': 'east', 'meaning': 'east, dawn', 'origin': 'PIE'},
    'edge': {'root': 'edge', 'meaning': 'edge, sharp', 'origin': 'Old English'},
    'evil': {'root': 'evil', 'meaning': 'evil, beyond', 'origin': 'Old English'},
    'exam': {'root': 'exam', 'meaning': 'examine, weigh', 'origin': 'Latin'},
    'face': {'root': 'fac', 'meaning': 'face, form', 'origin': 'Latin'},
    'fail': {'root': 'fail', 'meaning': 'fail, deceive', 'origin': 'Latin'},
    'fake': {'root': 'fake', 'meaning': 'fake, cheat', 'origin': 'German'},
    # 5 字符 15 词
    'angel': {'root': 'angel', 'meaning': 'angel, messenger', 'origin': 'Greek'},
    'black': {'root': 'black', 'meaning': 'black, burn', 'origin': 'PIE'},
    'blame': {'root': 'blas', 'meaning': 'blame, blaspheme', 'origin': 'Greek'},
    'blank': {'root': 'blank', 'meaning': 'blank, white', 'origin': 'Old High German'},
    'blast': {'root': 'blast', 'meaning': 'blast, blow', 'origin': 'PIE'},
    'blind': {'root': 'blind', 'meaning': 'blind, dazzle', 'origin': 'PIE'},
    'blood': {'root': 'blood', 'meaning': 'blood, flow', 'origin': 'PIE'},
    'bloom': {'root': 'bloom', 'meaning': 'bloom, flower', 'origin': 'PIE'},
    'break': {'root': 'break', 'meaning': 'break', 'origin': 'PIE'},
    'bread': {'root': 'bread', 'meaning': 'bread, brew', 'origin': 'PIE'},
    'brake': {'root': 'break', 'meaning': 'break, breakable', 'origin': 'PIE'},
    'brave': {'root': 'brave', 'meaning': 'brave, wild', 'origin': 'Italian'},
    'brand': {'root': 'brand', 'meaning': 'brand, burn', 'origin': 'Old Norse'},
    'check': {'root': 'check', 'meaning': 'check, chess', 'origin': 'Arabic'},
    'great': {'root': 'great', 'meaning': 'great, coarse', 'origin': 'PIE'},
    # 6 字符 5 词
    'August': {'root': 'aug', 'meaning': 'increase, Augustus', 'origin': 'Latin'},
    'church': {'root': 'kyri', 'meaning': 'lord, church', 'origin': 'Greek'},
    'esteem': {'root': 'estim', 'meaning': 'estimate, value', 'origin': 'Latin'},
    'French': {'root': 'frank', 'meaning': 'free, Frank', 'origin': 'Germanic'},
    'guitar': {'root': 'guitar', 'meaning': 'guitar, lyre', 'origin': 'Greek'},
    # 7+ 字符 5 词
    'machine': {'root': 'mach', 'meaning': 'machine, contrivance', 'origin': 'Greek'},
    'magazine': {'root': 'magaz', 'meaning': 'storehouse, magazine', 'origin': 'Arabic'},
    'Shanghai': {'root': 'shang', 'meaning': 'upon, sea', 'origin': 'Chinese'},
    'skateboard': {'root': 'skat, board', 'meaning': 'slide, plank', 'origin': 'Dutch+English'},
    'skilful': {'root': 'skill', 'meaning': 'skill, discernment', 'origin': 'Old Norse'},
}

# 加载词表
words = json.loads(Path('public/data/words.json').read_text())
m = 0
for w in words:
    if w.get('roots'):
        continue
    if w['word'] in ROOTS:
        r = ROOTS[w['word']]
        w['roots'] = [{'root': r['root'], 'meaning': r['meaning'], 'origin': r['origin']}]
        m += 1

Path('public/data/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2))
total = sum(1 for w in words if w.get('roots'))
no = sum(1 for w in words if not w.get('roots'))
print(f'✓ 补: {m}')
print(f'roots: {total}/{len(words)} ({total*100/len(words):.1f}%)')
print(f'无 roots: {no}')
