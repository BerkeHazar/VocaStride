#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VocaStride — Derleme Scripti (build.py)
Modüler kaynakları tek dosyaya (release/index.html) birleştirir ve
manifest, service worker ile PNG ikonlarını üretir.
Kullanım: python3 build.py
"""
import os, base64, io, re, urllib.parse
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'release')

CSS_ORDER = ['fonts.css', 'tokens.css', 'base.css', 'components.css', 'screens.css']
JS_ORDER = [
    'icons.js', 'storage.js', 'words.js', 'words-helpers.js', 'srs.js',
    'gamification.js', 'sounds.js', 'ui.js', 'wordinfo.js', 'stats.js',
    'panels.js', 'settings.js', 'session.js',
    'modes/quiz.js', 'modes/flashcards.js', 'modes/matching.js', 'modes/learn.js',
    'main.js'
]

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def build_css():
    parts = []
    for name in CSS_ORDER:
        p = os.path.join(SRC, 'css', name)
        if os.path.exists(p):
            parts.append('/* ===== ' + name + ' ===== */\n' + read(p))
    return '\n'.join(parts)

def build_js():
    parts = []
    for name in JS_ORDER:
        p = os.path.join(SRC, 'js', name)
        if os.path.exists(p):
            parts.append('/* ===== ' + name + ' ===== */\n' + read(p))
    return '\n'.join(parts)

LOGO_SVG = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23818cf8'/><stop offset='100%25' stop-color='%234338ca'/></linearGradient></defs><rect width='100' height='100' rx='26' fill='url(%23g)'/><g fill='white'><rect x='26' y='38' width='8' height='36' rx='4'/><rect x='36' y='50' width='8' height='24' rx='4'/><rect x='46' y='62' width='8' height='12' rx='4'/><rect x='56' y='50' width='8' height='24' rx='4'/><rect x='66' y='38' width='8' height='36' rx='4'/></g><circle cx='78' cy='27' r='5' fill='white'/></svg>"""

def favicon_datauri():
    return "data:image/svg+xml," + urllib.parse.quote(LOGO_SVG, safe="'()")

def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make_icon(size, path, maskable=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Arka plan (indigo gradyan)
    if maskable:
        bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        bgd = ImageDraw.Draw(bg)
        top, bot = hex2rgb('#818cf8'), hex2rgb('#4338ca')
        for y in range(size):
            bgd.line([(0, y), (size, y)], fill=lerp(top, bot, y / size))
        img = bg
        d = ImageDraw.Draw(img)
    else:
        r = int(size * 0.26)
        top, bot = hex2rgb('#818cf8'), hex2rgb('#4338ca')
        for y in range(size):
            d.line([(0, y), (size, y)], fill=lerp(top, bot, y / size))
        # Yuvarlatılmış köşeler: kenar şeffaflığı
        mask = Image.new('L', (size, size), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
        img.putalpha(mask)

    # Ses Dalgası V: karonun merkezinde simetrik V formu + ses noktası
    S = lambda v: v * size  # ölçekleme
    bars = [  # (merkez x, üst y, alt y) — simetrik V: kenarlar yüksek, orta alçak
        (0.30, 0.38, 0.74),
        (0.40, 0.50, 0.74),
        (0.50, 0.62, 0.74),
        (0.60, 0.50, 0.74),
        (0.70, 0.38, 0.74),
    ]
    bw = max(int(size * 0.08), 3)
    for (cx, ty, by) in bars:
        x0, x1 = S(cx) - bw / 2, S(cx) + bw / 2
        d.rounded_rectangle([x0, S(ty), x1, S(by)], radius=bw / 2, fill=(255, 255, 255, 255))

    # Ses noktası (sağ üstte, çubuklarla çakışmadan)
    dr = max(int(size * 0.05), 4)
    cx, cy = S(.78), S(.27)
    d.ellipse([cx - dr, cy - dr, cx + dr, cy + dr], fill=(255, 255, 255, 245))

    img.save(path, 'PNG')
    print('ikon üretildi:', path, size)

def main():
    os.makedirs(DIST, exist_ok=True)
    os.makedirs(os.path.join(DIST, 'icons'), exist_ok=True)

    html = read(os.path.join(SRC, 'index.html'))
    css = build_css()
    js = build_js()

    html = html.replace('/*__CSS__*/', css)
    html = html.replace('/*__JS__*/', js)
    html = html.replace('/*__FAVICON__*/', favicon_datauri())

    out = os.path.join(DIST, 'index.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('release/index.html:', round(os.path.getsize(out) / 1024, 1), 'KB')

    # manifest + sw kopyala
    import shutil
    for f in ['manifest.json', 'sw.js']:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(DIST, f))
            print('kopyalandı:', f)

    # İkonlar
    make_icon(192, os.path.join(DIST, 'icons', 'icon-192.png'))
    make_icon(512, os.path.join(DIST, 'icons', 'icon-512.png'))
    make_icon(512, os.path.join(DIST, 'icons', 'maskable-512.png'), maskable=True)
    make_icon(180, os.path.join(DIST, 'icons', 'apple-180.png'))
    print('\nDerleme tamam. Dosyalar:')
    for f in sorted(os.listdir(DIST)):
        print('  ', f)

if __name__ == '__main__':
    main()
