#!/usr/bin/env python3
"""scripts/review-w131.py — W131 静态审查 (P0/P1/P2 分类)"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

def read(p): return Path(ROOT, p).read_text(encoding='utf-8')
def exists(p): return (ROOT / p).exists()

issues = {'P0': [], 'P1': [], 'P2': []}

def P0(file, line, desc, fix):
    issues['P0'].append(f'P0 | {file}:{line} | {desc} | fix: {fix}')
def P1(file, line, desc, fix):
    issues['P1'].append(f'P1 | {file}:{line} | {desc} | fix: {fix}')
def P2(file, line, desc, fix):
    issues['P2'].append(f'P2 | {file}:{line} | {desc} | fix: {fix}')

# 1. manifest.webmanifest — P0: 必须有 name/short_name/icons/display/start_url/theme_color/background_color/orientation/scope
m_path = 'public/manifest.webmanifest'
m = read(m_path)
required = ['name', 'short_name', 'icons', 'display', 'start_url', 'theme_color', 'background_color', 'orientation', 'scope']
for f in required:
    if f not in m:
        P0(m_path, 0, f'manifest 缺 {f} 字段', f'补 {f} 字段')

# icons sizes 校验
import json
m_json = json.loads(m)
icon_sizes = [i.get('sizes') for i in m_json.get('icons', [])]
expected_sizes = ['72x72', '96x96', '128x128', '144x144', '192x192', '512x512']
for s in expected_sizes:
    if s not in icon_sizes:
        P0(m_path, 0, f'icons 缺 {s}', f'补 {s}')

# 2. index.html — P0: 必须有 viewport-fit=cover + apple-mobile-web-app-capable
h = read('index.html')
if 'viewport-fit=cover' not in h:
    P0('index.html', 0, 'viewport-fit=cover 缺失', '加 viewport-fit=cover')
if 'apple-mobile-web-app-capable' not in h:
    P0('index.html', 0, 'apple-mobile-web-app-capable 缺失', '加 yes')
if 'apple-mobile-web-app-status-bar-style' not in h:
    P0('index.html', 0, 'apple-mobile-web-app-status-bar-style 缺失', '加 black-translucent')

# apple-touch-icon 180x180
if 'apple-touch-icon" sizes="180x180"' not in h:
    P0('index.html', 0, 'apple-touch-icon 180x180 缺失', '加 <link rel="apple-touch-icon" sizes="180x180"')

# 3. P1: 暗色强化 (CSS) — 关键类必 须 重 写
css = read('src/index.css')
dark_requirements = [
    (r'\.dark \.bg-stone-50 \{ background-color: rgb\(23 23 23\)', '暗色 bg-stone-50 重写'),
    (r'\.dark \.bg-white \{ background-color: rgb\(23 23 23\)', '暗色 bg-white 重写'),
    (r'\.dark input, \.dark textarea, \.dark select', '暗色 input 重写'),
    (r'@media \(max-width: 640px\)', '移动端 16px 媒体查询'),
]
for pattern, desc in dark_requirements:
    if not re.search(pattern, css):
        P1('src/index.css', 0, f'暗色强化缺 {desc}', f'补 {desc}')

# 4. P1: Icon 按钮 aria-label (抽查关键组件)
icon_aria_files = [
    'src/components/Layout.tsx',
]
for f in icon_aria_files:
    txt = read(f)
    if 'aria-label=' not in txt and 'aria-labelledby' not in txt:
        P1(f, 0, f'{f} 缺 aria-label', '加 aria-label')

# 5. P1: 折 叠 头 aria-expanded
if 'aria-expanded=' not in read('src/components/Layout.tsx'):
    P1('src/components/Layout.tsx', 0, '折叠头缺 aria-expanded', '加 aria-expanded={isOpen}')

# 6. P1: Skip to content 链接
if 'href="#main-content"' not in read('src/components/Layout.tsx'):
    P1('src/components/Layout.tsx', 0, 'Skip to content 链接缺', '加 <a href="#main-content">')

# 7. P1: OfflineBanner — 必 须 存 在
if not exists('src/components/OfflineBanner.tsx'):
    P0('src/components/', 0, 'OfflineBanner.tsx 缺失', '创建组件')

ob = read('src/components/OfflineBanner.tsx')
if 'navigator.onLine' not in ob:
    P0('src/components/OfflineBanner.tsx', 0, '未读 navigator.onLine', '加 navigator.onLine 初始')
if "addEventListener('offline'" not in ob:
    P0('src/components/OfflineBanner.tsx', 0, '未监 听 offline 事件', '加 listener')
if "addEventListener('online'" not in ob:
    P0('src/components/OfflineBanner.tsx', 0, '未监 听 online 事件', '加 listener')
if 'data-testid="offline-banner"' not in ob:
    P1('src/components/OfflineBanner.tsx', 0, 'OfflineBanner 缺 testid', '加 data-testid')

# 8. P2: 0 emoji 装 饰 (新 文 件)
for f in ['src/components/OfflineBanner.tsx']:
    txt = read(f)
    emoji_re = r'[\U0001F300-\U0001F9FF]|[\u2600-\u26FF]|[\u2700-\u27BF]'
    if re.search(emoji_re, txt):
        P2(f, 0, 'OfflineBanner 含 emoji', '替 Icon SVG')

# 9. 公共 icons 校验
icons_dir = ROOT / 'public' / 'icons'
for s in expected_sizes:
    # expected_sizes 是 '72x72' 等, 文件名是 pwa-72.png
    short = s.split('x')[0]
    fname = f'pwa-{short}.png'
    if not (icons_dir / fname).exists():
        P0('public/icons/', 0, f'icon 缺 {fname}', f'生 成 {fname}')
if not (icons_dir / 'apple-touch-icon.png').exists():
    P0('public/icons/', 0, 'icon 缺 apple-touch-icon.png', '生 成 apple-touch-icon.png')
if not (icons_dir / 'pwa.svg').exists():
    P2('public/icons/', 0, 'icon 缺 pwa.svg (可 选)', '生 成 pwa.svg')

# 输出
total = sum(len(v) for v in issues.values())
print(f'\n=== W131 静 态 审 查 ===\n')
print(f'P0: {len(issues["P0"])}')
print(f'P1: {len(issues["P1"])}')
print(f'P2: {len(issues["P2"])}')
print(f'总计: {total}\n')
for sev in ['P0', 'P1', 'P2']:
    for i in issues[sev]:
        print(i)
    if issues[sev]:
        print()
if total == 0:
    print('全部通过!')
sys.exit(0 if total == 0 else 1)
