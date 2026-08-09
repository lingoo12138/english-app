#!/usr/bin/env python3
"""scripts/gen-w131-icons.py — W131 占位 PWA icon 生成
为不引依赖, 用 Python stdlib zlib + struct 生成最小 PNG.
但实际我用 PIL 因为已可用, 失败 fallback 到纯 stdlib.
"""
import os
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).parent.parent
ICONS_DIR = ROOT / 'public' / 'icons'
ICONS_DIR.mkdir(parents=True, exist_ok=True)

# 品牌色 (RGB)
BRAND_RGB = (22, 163, 74)        # #16a34a
DARK_RGB = (12, 10, 9)          # #0c0a09 stone-950
LIGHT_RGB = (240, 253, 244)     # #f0fdf4 brand-50

SIZES = [72, 96, 128, 144, 152, 192, 512]
SPLASH_SIZES = [
    (1170, 2532, 'splash-1170x2532.png'),
    (1179, 2556, 'splash-1179x2556.png'),
    (1284, 2778, 'splash-1284x2778.png'),
    (1125, 2436, 'splash-1125x2436.png'),
    (1242, 2688, 'splash-1242x2688.png'),
    (750, 1334, 'splash-750x1334.png'),
    (2048, 2732, 'splash-2048x2732.png'),
]

def make_png(width, height, draw_fn):
    """生成 PNG (PIL 优先, 失败 fallback stdlib)"""
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (width, height), DARK_RGB)
        d = ImageDraw.Draw(img)
        draw_fn(d, width, height, ImageDraw)
        img.save(str(ICONS_DIR / 'tmp.png'), 'PNG')
        return (ICONS_DIR / 'tmp.png').read_bytes()
    except Exception as e:
        print(f'PIL 失败, fallback stdlib: {e}')
        return None

def draw_icon(d, w, h, ImageDraw):
    """占位 icon: 圆角方 + 中心 "JK" 字母 (句刻缩写)"""
    # 圆角背景 (绿色)
    radius = int(w * 0.22)
    d.rounded_rectangle([(0, 0), (w, h)], radius=radius, fill=BRAND_RGB)
    # 中心文字 "句" — 占位
    # PIL 默认 font 不可控中文, 用 ascii "JK" 更稳
    try:
        from PIL import ImageFont
        # 找最大可用的 font
        font = None
        for path in [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
        ]:
            if os.path.exists(path):
                font = ImageFont.truetype(path, int(w * 0.45))
                break
        if font is None:
            font = ImageFont.load_default()
        text = 'JK'
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((w - tw) / 2 - bbox[0], (h - th) / 2 - bbox[1] - int(w * 0.02)),
               text, fill=(255, 255, 255), font=font)
    except Exception as e:
        print(f'  text draw fail: {e}')

def draw_splash(d, w, h, ImageDraw):
    """Splash: 纯深色 + 中央 icon"""
    d.rectangle([(0, 0), (w, h)], fill=DARK_RGB)
    icon_size = min(w, h) // 3
    radius = int(icon_size * 0.22)
    d.rounded_rectangle(
        [(w - icon_size) // 2, (h - icon_size) // 2,
         (w + icon_size) // 2, (h + icon_size) // 2],
        radius=radius, fill=BRAND_RGB
    )
    try:
        from PIL import ImageFont
        font = None
        for path in [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        ]:
            if os.path.exists(path):
                font = ImageFont.truetype(path, int(icon_size * 0.45))
                break
        if font is None:
            font = ImageFont.load_default()
        text = 'JK'
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((w - tw) / 2 - bbox[0], (h - th) / 2 - bbox[1] - int(icon_size * 0.02)),
               text, fill=(255, 255, 255), font=font)
    except Exception:
        pass

def draw_apple(d, w, h, ImageDraw):
    """apple-touch-icon: 180x180 圆角"""
    draw_icon(d, w, h, ImageDraw)

def draw_svg_icon():
    """生成 SVG icon (高 DPI 场景)"""
    svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="0" y="0" width="512" height="512" rx="112" ry="112" fill="#16a34a"/>
  <text x="256" y="312" font-family="Helvetica, Arial, sans-serif" font-size="220" font-weight="700" fill="#ffffff" text-anchor="middle">JK</text>
</svg>'''
    (ICONS_DIR / 'pwa.svg').write_text(svg, encoding='utf-8')

def main():
    print(f'生成 PWA icons 到 {ICONS_DIR}/')
    # 主 icons
    for size in SIZES:
        out = ICONS_DIR / f'pwa-{size}.png'
        png = make_png(size, size, draw_icon)
        if png:
            out.write_bytes(png)
            print(f'  pwa-{size}.png OK ({size}x{size})')
    # apple-touch-icon
    out = ICONS_DIR / 'apple-touch-icon.png'
    png = make_png(180, 180, draw_apple)
    if png:
        out.write_bytes(png)
        print('  apple-touch-icon.png OK (180x180)')
    # favicon
    out = ICONS_DIR / 'favicon.png'
    png = make_png(32, 32, draw_icon)
    if png:
        out.write_bytes(png)
        print('  favicon.png OK (32x32)')
    # splash screens
    for w, h, name in SPLASH_SIZES:
        out = ICONS_DIR / name
        png = make_png(w, h, draw_splash)
        if png:
            out.write_bytes(png)
            print(f'  {name} OK ({w}x{h})')
    # svg
    draw_svg_icon()
    print('  pwa.svg OK')

    # 清理 tmp
    tmp = ICONS_DIR / 'tmp.png'
    if tmp.exists():
        tmp.unlink()
    print('Done.')

if __name__ == '__main__':
    main()
