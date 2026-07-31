#!/usr/bin/env python3
"""
w81-content-1to4.py — v1.87 W81-A 内容续补: 补 207 词 (1-4 字符) 的 roots

策略:
- 1 字符 (a, I): 标 "原始型"
- 2 字符 (29): 极简, 大部分 PIE *ne, *so 等或 "原始型"
- 3 字符 (59): Old English / Old Norse / Latin / 拟声
- 4 字符 (117): PIE / OE / ON / Latin / Greek / French 词源

每词标 1 个 root (高频词加 2 个, 如 do/PIE*de- + 古英语 don)
"""
import json
from pathlib import Path

# 207 词 root 字典 (手工标)
ROOT_DICT = {
    # 1 字符
    'a': [{'root': '原始型', 'meaning': '不定冠词, PIE 源', 'type': 'root'}],
    'I': [{'root': '原始型', 'meaning': '第一人称代词, PIE *eg- 我', 'type': 'root'}],

    # 2 字符 (29)
    'am': [{'root': 'PIE *es-', 'meaning': '是/存在, be 第一人称单数', 'type': 'root'}],
    'an': [{'root': '原始型', 'meaning': '不定冠词, OE ān 一个', 'type': 'root'}],
    'ax': [{'root': 'OE æx', 'meaning': '斧, PIE *ag- 切', 'type': 'root'}],
    'bc': [{'root': '原始型', 'meaning': 'before Christ 缩写', 'type': 'root'}],
    'CD': [{'root': '原始型', 'meaning': 'compact disc 缩写', 'type': 'root'}],
    'do': [{'root': 'PIE *dhe-', 'meaning': '做/放置, OE don 做', 'type': 'root'}],
    'Dr': [{'root': '原始型', 'meaning': 'doctor 缩写, L docere 教', 'type': 'root'}],
    'go': [{'root': 'PIE *ghē-', 'meaning': '走/去, OE gān 走', 'type': 'root'}],
    'ha': [{'root': '拟声', 'meaning': '感叹词, 古英语', 'type': 'root'}],
    'he': [{'root': 'PIE *ko-', 'meaning': '这/他, OE hē 他', 'type': 'root'}],
    'hi': [{'root': '拟声', 'meaning': '问候语, ME hei', 'type': 'root'}],
    'if': [{'root': 'OE gif', 'meaning': '如果, PIE *gh- 条件', 'type': 'root'}],
    'is': [{'root': 'PIE *es-', 'meaning': '是/存在, be 第三人称单数', 'type': 'root'}],
    'it': [{'root': 'PIE *ko-', 'meaning': '它/这, OE hit 它', 'type': 'root'}],
    'me': [{'root': 'PIE *me-', 'meaning': '我 (宾格), OE mē', 'type': 'root'}],
    'mm': [{'root': '拟声', 'meaning': '嗯, 表思考', 'type': 'root'}],
    'mr': [{'root': '原始型', 'meaning': 'mister 缩写, L magister 主人', 'type': 'root'}],
    'ms': [{'root': '原始型', 'meaning': 'miss/missus 缩写', 'type': 'root'}],
    'no': [{'root': 'PIE *ne-', 'meaning': '不/无, OE nā', 'type': 'root'}],
    'of': [{'root': 'OE of', 'meaning': '出自/从, PIE *apo- 离开', 'type': 'root'}],
    'oh': [{'root': '拟声', 'meaning': '感叹词, ME ō', 'type': 'root'}],
    'OK': [{'root': '原始型', 'meaning': 'okay 缩写, 19 世纪美式', 'type': 'root'}],
    'pc': [{'root': '原始型', 'meaning': 'personal computer 缩写', 'type': 'root'}],
    'pe': [{'root': '原始型', 'meaning': 'physical education 缩写', 'type': 'root'}],
    'PM': [{'root': '原始型', 'meaning': 'post meridiem 缩写, L', 'type': 'root'}],
    'so': [{'root': 'PIE *swe-', 'meaning': '如此/这, OE swā', 'type': 'root'}],
    'TV': [{'root': '原始型', 'meaning': 'television 缩写, Gk tele- 远 + L visio 看', 'type': 'root'}],
    'UK': [{'root': '原始型', 'meaning': 'United Kingdom 缩写', 'type': 'root'}],
    'us': [{'root': 'PIE *nes-', 'meaning': '我们 (宾格), OE ūs', 'type': 'root'}],

    # 13 词 case-sensitive (缩写 / 专有)
    'CD': [{'root': '原始型', 'meaning': 'compact disc 缩写', 'type': 'root'}],
    'Dr': [{'root': '原始型', 'meaning': 'doctor 缩写, L docere 教', 'type': 'root'}],
    'DVD': [{'root': '原始型', 'meaning': 'digital versatile disc 缩写', 'type': 'root'}],
    'God': [{'root': 'PIE *ghu-to-', 'meaning': '神, OE god 神', 'type': 'root'}],
    'June': [{'root': 'L Iunius', 'meaning': '六月, L Iuno 朱诺', 'type': 'root'}],
    'Lost': [{'root': 'OE losian', 'meaning': '丢失, PIE *lēu- 解/散', 'type': 'root'}],
    'Mom': [{'root': '拟声', 'meaning': '妈妈, 婴儿语', 'type': 'root'}],
    'PM': [{'root': '原始型', 'meaning': 'post meridiem 缩写, L', 'type': 'root'}],
    'TRUE': [{'root': 'OE trēowe', 'meaning': '真, PIE *deru- 坚实/树', 'type': 'root'}],

    # 3 字符 (59)
    'bun': [{'root': '拟声', 'meaning': '小圆面包, ME bunne', 'type': 'root'}],
    'bye': [{'root': '拟声', 'meaning': '再见, 缩自 goodbye', 'type': 'root'}],
    'cut': [{'root': 'PIE *sker-', 'meaning': '切, ME cutten', 'type': 'root'}],
    'dam': [{'root': 'OF dame', 'meaning': '水坝, MLG damm', 'type': 'root'}],
    'dim': [{'root': 'OE dimm', 'meaning': '暗淡, PIE *dhem- 烟/雾', 'type': 'root'}],
    'dip': [{'root': 'OE dyppan', 'meaning': '浸, PIE *dheub- 深', 'type': 'root'}],
    'dog': [{'root': 'OE docga', 'meaning': '狗, 词源不明, 可能 PIE *k̂u̯on- 狗', 'type': 'root'}],
    'DVD': [{'root': '原始型', 'meaning': 'digital versatile disc 缩写', 'type': 'root'}],
    'dye': [{'root': 'OE dēag', 'meaning': '染色, PIE *dhe- 染色', 'type': 'root'}],
    'era': [{'root': 'L aera', 'meaning': '时代, L aes 铜 (计数)', 'type': 'root'}],
    'eve': [{'root': 'OE ǣfen', 'meaning': '前夜/前夕, PIE *au- 远离', 'type': 'root'}],
    'fax': [{'root': 'L fac simile', 'meaning': '传真, L facere 做 + similis 类似', 'type': 'root'}],
    'fee': [{'root': 'OE feoh', 'meaning': '费/牛/财产, PIE *peku- 牛/财富', 'type': 'root'}],
    'flu': [{'root': 'It influenza', 'meaning': '流感, L influentia 影响', 'type': 'root'}],
    'fog': [{'root': 'Dan fog', 'meaning': '雾, 拟声', 'type': 'root'}],
    'God': [{'root': 'PIE *ghu-to-', 'meaning': '神, OE god 神', 'type': 'root'}],
    'ham': [{'root': 'OE hamm', 'meaning': '火腿/大腿, PIE *k̂onh₂- 弯曲', 'type': 'root'}],
    'has': [{'root': 'OE hæs', 'meaning': '有 (第三人称), PIE *k̂ez- 切/完成', 'type': 'root'}],
    'hat': [{'root': 'OE hætt', 'meaning': '帽子, 词源不明', 'type': 'root'}],
    'him': [{'root': 'OE him', 'meaning': '他 (宾格), PIE *ko- 这', 'type': 'root'}],
    'hit': [{'root': 'OE hittan', 'meaning': '击中, ON hitta 遇到', 'type': 'root'}],
    'hot': [{'root': 'OE hāt', 'meaning': '热, PIE *k̂ei- 热', 'type': 'root'}],
    'how': [{'root': 'OE hū', 'meaning': '如何, PIE *kwo- 谁/什么', 'type': 'root'}],
    'hub': [{'root': '拟声', 'meaning': '中心, 19 世纪美式', 'type': 'root'}],
    'lab': [{'root': 'L laboratorium', 'meaning': '实验室, L laborare 工作', 'type': 'root'}],
    'lag': [{'root': 'ON lag', 'meaning': '落后, PIE *leg- 悬挂/懒', 'type': 'root'}],
    'lap': [{'root': 'OE læppa', 'meaning': '膝/舐, PIE *leb- 悬挂', 'type': 'root'}],
    'law': [{'root': 'ON lagu', 'meaning': '法律, PIE *legh- 躺/法律', 'type': 'root'}],
    'leg': [{'root': 'ON leggr', 'meaning': '腿, PIE *lak- 弯曲', 'type': 'root'}],
    'let': [{'root': 'OE lǣtan', 'meaning': '让, PIE *lē- 放松/允许', 'type': 'root'}],
    'lie': [{'root': 'OE licgan', 'meaning': '躺/说谎, PIE *legh- 躺', 'type': 'root'}],
    'lip': [{'root': 'OE lippa', 'meaning': '唇, PIE *leb- 悬挂/下垂', 'type': 'root'}],
    'lot': [{'root': 'OE hlot', 'meaning': '签/许多, PIE *k̂leu- 抓/选', 'type': 'root'}],
    'low': [{'root': 'ON lágr', 'meaning': '低, PIE *legh- 躺', 'type': 'root'}],
    'mad': [{'root': 'OE gemǣded', 'meaning': '疯狂, PIE *mai- 切/击', 'type': 'root'}],
    'map': [{'root': 'L mappa', 'meaning': '地图, L mappa 餐巾/布', 'type': 'root'}],
    'men': [{'root': 'OE mann', 'meaning': '男人 (复数), PIE *mon- 人', 'type': 'root'}],
    'Mom': [{'root': '拟声', 'meaning': '妈妈, 婴儿语', 'type': 'root'}],
    'mop': [{'root': 'ME mappe', 'meaning': '拖把, L mappa 餐巾', 'type': 'root'}],
    'mrs': [{'root': '原始型', 'meaning': 'missus 缩写, L matrona 主妇', 'type': 'root'}],
    'mum': [{'root': '拟声', 'meaning': '妈妈, 婴儿语', 'type': 'root'}],
    'new': [{'root': 'OE nīwe', 'meaning': '新, PIE *newo- 新', 'type': 'root'}],
    'not': [{'root': 'OE nāt', 'meaning': '不, PIE *ne- 不', 'type': 'root'}],
    'now': [{'root': 'OE nū', 'meaning': '现在, PIE *nu 现在', 'type': 'root'}],
    'nut': [{'root': 'OE hnutu', 'meaning': '坚果, PIE *k̂nu- 球/关节', 'type': 'root'}],
    'off': [{'root': 'OE of', 'meaning': '离开, PIE *apo- 远离', 'type': 'root'}],
    'old': [{'root': 'OE eald', 'meaning': '老, PIE *al- 生长', 'type': 'root'}],
    'one': [{'root': 'OE ān', 'meaning': '一, PIE *oy-no- 一', 'type': 'root'}],
    'own': [{'root': 'OE āgen', 'meaning': '拥有, PIE *aik- 拥有', 'type': 'root'}],
    'rat': [{'root': 'OE ræt', 'meaning': '老鼠, PIE *reh₁d- 刮', 'type': 'root'}],
    'rot': [{'root': 'OE rotian', 'meaning': '腐烂, PIE *reud- 撕/腐烂', 'type': 'root'}],
    'run': [{'root': 'OE rinnan', 'meaning': '跑, PIE *ri-n- 流', 'type': 'root'}],
    'she': [{'root': 'OE sēo', 'meaning': '她, PIE *k̂e- 这', 'type': 'root'}],
    'sun': [{'root': 'OE sunne', 'meaning': '太阳, PIE *suh₂- 太阳', 'type': 'root'}],
    'tax': [{'root': 'L taxare', 'meaning': '税, L tangere 触', 'type': 'root'}],
    'vcd': [{'root': '原始型', 'meaning': 'video compact disc 缩写', 'type': 'root'}],
    'via': [{'root': 'L via', 'meaning': '经过/路, PIE *weĝh- 走/运', 'type': 'root'}],
    'wag': [{'root': 'OE wagian', 'meaning': '摇/摇摆, PIE *weĝh- 摇/运', 'type': 'root'}],
    'woo': [{'root': 'OE wōgian', 'meaning': '求爱, PIE *wō- 求爱', 'type': 'root'}],

    # 4 字符 (117)
    'brim': [{'root': 'ME brimme', 'meaning': '边缘, PIE *bhrem- 边缘/咆哮', 'type': 'root'}],
    'brow': [{'root': 'OE brū', 'meaning': '眉毛/额, PIE *bhrū- 眉毛', 'type': 'root'}],
    'bulb': [{'root': 'L bulbus', 'meaning': '球茎, Gk bolbos 球茎', 'type': 'root'}],
    'bulk': [{'root': 'ON bulki', 'meaning': '体积, 词源不明', 'type': 'root'}],
    'bull': [{'root': 'OE bula', 'meaning': '公牛, PIE *bheu- 膨胀/牛', 'type': 'root'}],
    'cafe': [{'root': 'F café', 'meaning': '咖啡馆, F café 咖啡', 'type': 'root'}],
    'cart': [{'root': 'ON kartr', 'meaning': '大车, PIE *k̂ers- 跑', 'type': 'root'}],
    'cave': [{'root': 'L cava', 'meaning': '洞穴, L cavus 空/中空', 'type': 'root'}],
    'chap': [{'root': 'OE cæp', 'meaning': '家伙/皲裂, ME chapman 商人', 'type': 'root'}],
    'chew': [{'root': 'OE cēowan', 'meaning': '嚼, PIE *gyeu- 嚼', 'type': 'root'}],
    'clap': [{'root': 'OE clæppan', 'meaning': '拍手, 拟声', 'type': 'root'}],
    'claw': [{'root': 'OE clawu', 'meaning': '爪, PIE *k̂el- 抓', 'type': 'root'}],
    'crow': [{'root': 'OE crawe', 'meaning': '乌鸦, 拟声', 'type': 'root'}],
    'damp': [{'root': 'ME damp', 'meaning': '潮湿, ON dampi 尘/蒸汽', 'type': 'root'}],
    'dash': [{'root': 'ME daschen', 'meaning': '猛冲, ON daska 溅', 'type': 'root'}],
    'dawn': [{'root': 'OE dagung', 'meaning': '黎明, PIE *dhē- 日/灼热', 'type': 'root'}],
    'dine': [{'root': 'OF disner', 'meaning': '用餐, L disjejunare 禁食后进食', 'type': 'root'}],
    'disc': [{'root': 'L discus', 'meaning': '圆盘, Gk diskos 圆盘', 'type': 'root'}],
    'dock': [{'root': 'MLG docke', 'meaning': '船坞, 词源不明', 'type': 'root'}],
    'doll': [{'root': 'OE dol', 'meaning': '玩偶, 拟声 Doll/Petronella', 'type': 'root'}],
    'drag': [{'root': 'OE dragan', 'meaning': '拖, PIE *dher- 抓', 'type': 'root'}],
    'draw': [{'root': 'OE dragan', 'meaning': '拉/画, PIE *dher- 抓', 'type': 'root'}],
    'drip': [{'root': 'OE dryppan', 'meaning': '滴, PIE *dhreu- 流', 'type': 'root'}],
    'drop': [{'root': 'OE dropa', 'meaning': '滴, PIE *dhreu- 流', 'type': 'root'}],
    'drug': [{'root': 'OF drogue', 'meaning': '药/毒品, MDu droge 干', 'type': 'root'}],
    'dull': [{'root': 'OE dol', 'meaning': '钝/迟钝, PIE *dhe- 暗/钝', 'type': 'root'}],
    'dumb': [{'root': 'OE dumb', 'meaning': '哑, PIE *dheu- 烟/雾', 'type': 'root'}],
    'dump': [{'root': 'MLG dumpen', 'meaning': '倾倒, 拟声', 'type': 'root'}],
    'dusk': [{'root': 'OE dox', 'meaning': '黄昏, PIE *dheu- 烟/暗', 'type': 'root'}],
    'each': [{'root': 'OE ǣlc', 'meaning': '每个, PIE *aiw- 永远 + *gel- 一起', 'type': 'root'}],
    'earn': [{'root': 'OE earnian', 'meaning': '赚, PIE *er- 移动/收获', 'type': 'root'}],
    'echo': [{'root': 'Gk ēkhō', 'meaning': '回声, Gk ēkhē 声音', 'type': 'root'}],
    'fall': [{'root': 'OE feallan', 'meaning': '落下, PIE *phōl- 落下', 'type': 'root'}],
    'farm': [{'root': 'OE feorm', 'meaning': '农场, L firma 固定 (租金)', 'type': 'root'}],
    'fast': [{'root': 'OE fæst', 'meaning': '快/紧, PIE *past- 坚固', 'type': 'root'}],
    'feel': [{'root': 'OE fēlan', 'meaning': '感觉, PIE *pai- 拍/打/触', 'type': 'root'}],
    'feet': [{'root': 'OE fēt', 'meaning': '脚 (复数), PIE *pṓds 脚', 'type': 'root'}],
    'fill': [{'root': 'OE fyllan', 'meaning': '填满, PIE *pleh₁- 满', 'type': 'root'}],
    'film': [{'root': 'OE filmen', 'meaning': '薄膜, PIE *pel- 皮/膜', 'type': 'root'}],
    'firm': [{'root': 'L firmus', 'meaning': '坚固, PIE *dher- 握/支持', 'type': 'root'}],
    'flag': [{'root': 'ON flaga', 'meaning': '旗, 词源不明', 'type': 'root'}],
    'flat': [{'root': 'ON flatr', 'meaning': '平坦, PIE *pleh₂- 平', 'type': 'root'}],
    'flee': [{'root': 'OE flēon', 'meaning': '逃跑, PIE *pleh₁- 飞/流', 'type': 'root'}],
    'fold': [{'root': 'OE fealdan', 'meaning': '折叠, PIE *pel- 折/弯', 'type': 'root'}],
    'folk': [{'root': 'OE folc', 'meaning': '人们, PIE *pel- 满/人群', 'type': 'root'}],
    'fond': [{'root': 'ME fonned', 'meaning': '喜爱, 拟声 愚蠢', 'type': 'root'}],
    'food': [{'root': 'OE fōda', 'meaning': '食物, PIE *pā- 喂/保护', 'type': 'root'}],
    'fool': [{'root': 'L follis', 'meaning': '愚人/风箱, L follis 袋', 'type': 'root'}],
    'foot': [{'root': 'OE fōt', 'meaning': '脚, PIE *pṓds 脚', 'type': 'root'}],
    'free': [{'root': 'OE frēo', 'meaning': '自由, PIE *prey- 爱/自由', 'type': 'root'}],
    'from': [{'root': 'OE fram', 'meaning': '从, PIE *pro- 向前/远', 'type': 'root'}],
    'fuel': [{'root': 'OF fouaille', 'meaning': '燃料, L focus 火/炉', 'type': 'root'}],
    'full': [{'root': 'OE full', 'meaning': '满, PIE *pleh₁- 满', 'type': 'root'}],
    'gang': [{'root': 'OE gang', 'meaning': '帮/走, PIE *ghengh- 走', 'type': 'root'}],
    'gasp': [{'root': 'ON geispa', 'meaning': '喘息, 拟声', 'type': 'root'}],
    'gaze': [{'root': 'ME gazen', 'meaning': '凝视, 词源不明', 'type': 'root'}],
    'germ': [{'root': 'L germen', 'meaning': '细菌/萌芽, L germen 芽', 'type': 'root'}],
    'girl': [{'root': 'ME gurle', 'meaning': '女孩, 词源不明', 'type': 'root'}],
    'glad': [{'root': 'OE glæd', 'meaning': '高兴, PIE *ghel- 光/亮', 'type': 'root'}],
    'goat': [{'root': 'OE gāt', 'meaning': '山羊, PIE *gʷaido- 山羊', 'type': 'root'}],
    'gold': [{'root': 'OE gold', 'meaning': '金, PIE *ǵʰel- 黄/金/亮', 'type': 'root'}],
    'golf': [{'root': 'MDu colf', 'meaning': '高尔夫, MDu colf 棍棒', 'type': 'root'}],
    'good': [{'root': 'OE gōd', 'meaning': '好, PIE *ghedh- 集合/好', 'type': 'root'}],
    'gram': [{'root': 'L gramma', 'meaning': '克/书写, Gk gramma 字母', 'type': 'root'}],
    'grow': [{'root': 'OE grōwan', 'meaning': '生长, PIE *ghreh₁- 生长/绿', 'type': 'root'}],
    'gulf': [{'root': 'Gk kolpos', 'meaning': '海湾, Gk kolpos 湾', 'type': 'root'}],
    'hair': [{'root': 'OE hǣr', 'meaning': '头发, PIE *ker- 头/粗糙', 'type': 'root'}],
    'half': [{'root': 'OE healf', 'meaning': '一半, PIE *skel- 切/分', 'type': 'root'}],
    'hall': [{'root': 'OE heall', 'meaning': '大厅, PIE *kel- 遮蔽/盖', 'type': 'root'}],
    'halt': [{'root': 'OE healt', 'meaning': '跛/停, PIE *kel- 倾斜', 'type': 'root'}],
    'hang': [{'root': 'OE hangian', 'meaning': '挂, PIE *konk- 悬挂', 'type': 'root'}],
    'hard': [{'root': 'OE heard', 'meaning': '硬, PIE *k̂er- 硬/粗糙', 'type': 'root'}],
    'have': [{'root': 'OE habban', 'meaning': '有, PIE *kap- 握/拿', 'type': 'root'}],
    'hawk': [{'root': 'OE heafoc', 'meaning': '鹰, PIE *kap- 抓/握', 'type': 'root'}],
    'head': [{'root': 'OE hēafod', 'meaning': '头, PIE *kaput- 头', 'type': 'root'}],
    'heap': [{'root': 'OE hēap', 'meaning': '堆, PIE *keu- 弯/堆', 'type': 'root'}],
    'heat': [{'root': 'OE hǣtu', 'meaning': '热, PIE *k̂ei- 热', 'type': 'root'}],
    'heir': [{'root': 'L heres', 'meaning': '继承人, PIE *gher- 抓/拿', 'type': 'root'}],
    'hell': [{'root': 'OE hel', 'meaning': '地狱, PIE *kel- 遮蔽/盖', 'type': 'root'}],
    'help': [{'root': 'OE helpan', 'meaning': '帮助, PIE *kel- 帮助/倾斜', 'type': 'root'}],
    'hero': [{'root': 'Gk hērōs', 'meaning': '英雄, PIE *ser- 保护/支持', 'type': 'root'}],
    'high': [{'root': 'OE hēah', 'meaning': '高, PIE *k̂ei- 倾斜/高', 'type': 'root'}],
    'hold': [{'root': 'OE healdan', 'meaning': '握, PIE *kel- 倾斜/握', 'type': 'root'}],
    'hope': [{'root': 'OE hopa', 'meaning': '希望, PIE *k̂eu- 弯/弯腰/期待', 'type': 'root'}],
    'howl': [{'root': 'ME houlen', 'meaning': '嚎叫, 拟声', 'type': 'root'}],
    'idea': [{'root': 'Gk idea', 'meaning': '观念, Gk idein 看', 'type': 'root'}],
    'jeep': [{'root': '原始型', 'meaning': '吉普车, GP (general purpose) 缩写', 'type': 'root'}],
    'June': [{'root': 'L Iunius', 'meaning': '六月, L Iuno 朱诺', 'type': 'root'}],
    'keep': [{'root': 'OE cēpan', 'meaning': '保持, PIE *kap- 握/拿', 'type': 'root'}],
    'kill': [{'root': 'ME killen', 'meaning': '杀, PIE *gʷel- 击/痛', 'type': 'root'}],
    'know': [{'root': 'OE cnāwan', 'meaning': '知道, PIE *gneh₃- 知道', 'type': 'root'}],
    'lack': [{'root': 'ON lakr', 'meaning': '缺乏, PIE *leg- 松/懒', 'type': 'root'}],
    'last': [{'root': 'OE lǣst', 'meaning': '最后, PIE *lei- 留下', 'type': 'root'}],
    'leaf': [{'root': 'OE lēaf', 'meaning': '叶, PIE *leubh- 剥/叶', 'type': 'root'}],
    'lest': [{'root': 'OE þy lǣs þe', 'meaning': '以免, PIE *lē- 少', 'type': 'root'}],
    'life': [{'root': 'OE līf', 'meaning': '生命, PIE *leyp- 留/活', 'type': 'root'}],
    'like': [{'root': 'OE līcian', 'meaning': '喜欢, PIE *līk- 形/像', 'type': 'root'}],
    'look': [{'root': 'OE lōcian', 'meaning': '看, PIE *lug- 闪/光', 'type': 'root'}],
    'loop': [{'root': 'ME loupe', 'meaning': '环, PIE *lēu- 弯/解', 'type': 'root'}],
    'Lost': [{'root': 'OE losian', 'meaning': '丢失, PIE *lēu- 解/散', 'type': 'root'}],
    'loud': [{'root': 'OE hlūd', 'meaning': '响, PIE *k̂leu- 听', 'type': 'root'}],
    'love': [{'root': 'OE lufu', 'meaning': '爱, PIE *lewbh- 爱', 'type': 'root'}],
    'make': [{'root': 'OE macian', 'meaning': '做, PIE *mag- 揉/捏', 'type': 'root'}],
    'math': [{'root': 'Gk manthanein', 'meaning': '数学, Gk manthanein 学', 'type': 'root'}],
    'meat': [{'root': 'OE mete', 'meaning': '肉, PIE *mad- 湿/流', 'type': 'root'}],
    'meet': [{'root': 'OE mētan', 'meaning': '遇见, PIE *mod- 遇/合适', 'type': 'root'}],
    'must': [{'root': 'OE mōste', 'meaning': '必须, PIE *mod- 遇/合适', 'type': 'root'}],
    'next': [{'root': 'OE nēhst', 'meaning': '下一个, PIE *ne- 近', 'type': 'root'}],
    'noun': [{'root': 'L nomen', 'meaning': '名词, L nomen 名字', 'type': 'root'}],
    'onto': [{'root': 'OE on + to', 'meaning': '到...上, OE on 在 + to 到', 'type': 'root'}],
    'ouch': [{'root': '拟声', 'meaning': '哎哟, 拟声疼痛', 'type': 'root'}],
    'past': [{'root': 'L pastus', 'meaning': '过去, L passus 步/经过', 'type': 'root'}],
    'pick': [{'root': 'ME piken', 'meaning': '挑选, F piquer 刺', 'type': 'root'}],
    'road': [{'root': 'OE rād', 'meaning': '路, PIE *reydh- 骑/路', 'type': 'root'}],
    'rock': [{'root': 'OE rocc', 'meaning': '岩石, MLG rock 岩石', 'type': 'root'}],
    'smog': [{'root': '拟声', 'meaning': '烟雾, smoke + fog 缩合', 'type': 'root'}],
    'TRUE': [{'root': 'OE trēowe', 'meaning': '真, PIE *deru- 坚实/树', 'type': 'root'}],
}


def main():
    src = Path('public/data/words.json')
    words = json.loads(src.read_text())
    filled = 0
    not_found = []
    for w in words:
        w_lower = w['word'].lower()
        if w_lower in ROOT_DICT:
            w['roots'] = ROOT_DICT[w_lower]
            filled += 1
        elif w['word'] in ROOT_DICT:
            w['roots'] = ROOT_DICT[w['word']]
            filled += 1
        elif w.get('roots') is None and len(w['word']) <= 4:
            not_found.append(w['word'])

    src.write_text(json.dumps(words, ensure_ascii=False, indent=2))
    print(f"✓ 补 {filled} 词 roots")
    if not_found:
        print(f"⚠ 仍缺 roots 的 1-4 字符词 ({len(not_found)}):")
        print(' '.join(not_found))


if __name__ == '__main__':
    main()
