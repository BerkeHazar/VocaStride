"""
VocaStride — marka dosyaları (tek kaynak).

Sembol: V, dikeyden 30°, yatay kesilmiş uçlar (Adım).
Wordmark: Bricolage Grotesque 700 / opsz 60, harf yolları çıkarılmış (metin değil).

Bu betik hem SVG'leri hem de `mark.json`'ı üretir. Uygulama, ikonlar, paylaşım
görseli ve açılış ekranı **yalnızca** `mark.json`'daki sayıları okur; ikinci bir
kopya tutulmaz. Oranlar burada tek yerde durur:

    TILE_MARK_W  V'nin karo genişliğine oranı        (0.55)
    TILE_MARK_CY V'nin karo içindeki optik merkezi   (131 / 256)
    LOCK_CAP     wordmark cap / karo                 (0.55)
    LOCK_GAP     karo ile wordmark arası boşluk      (0.38)

V'nin kütlesi üstte olduğu için geometrik merkez (126) değil, 131 kullanılır:
karo içinde V'nin üstünde kalan boşluk altındakinden biraz fazladır, böylece
göze ortalanmış görünür (ters yönde 2 birimlik kaydırma onu yukarıda bırakıyordu).
"""
import io, json, math, os, tempfile

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "public", "fonts", "bricolage-latin.woff2")
INK = "#1B3A63"      # --logo-mark (açık tema)
PAPER = "#F4F1E9"    # --bg

# ------------------------------------------------------------------ oranlar
TILE = 256.0
TILE_R = 56.0
TILE_MARK_W = 0.55       # V genişliği / karo genişliği
TILE_MARK_CY = 131.0     # V'nin optik merkezi (karo merkezi 128)
LOCK_CAP = 0.55          # wordmark cap / karo
LOCK_GAP = 0.38          # boşluk / karo
WM_CAP = 120.0           # wordmark.svg içindeki cap yüksekliği (birim)


# ------------------------------------------------------------------ sembol
def v_polygon(w=40.0, a_deg=30.0, apex_y=168.0, cut=56.0, apex_extra=0.0):
    a = math.radians(a_deg)
    hw = (w / 2) / math.cos(a)
    t = math.tan(a)
    pl = 128 - t * (apex_y - cut)
    pr = 128 + t * (apex_y - cut)
    outer = (128, apex_y + (w / 2) / math.sin(a) + apex_extra)
    return [
        (pl - hw, cut), (pl + hw, cut), (128, apex_y),
        (pr - hw, cut), (pr + hw, cut), outer,
    ]


def poly(pts, dx=0.0, dy=0.0):
    return "M " + " L ".join(f"{x + dx:.2f} {y + dy:.2f}" for x, y in pts) + " Z"


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def centered(pts, size=TILE):
    x0, y0, x1, y1 = bbox(pts)
    return [(x + (size - (x1 - x0)) / 2 - x0, y + (size - (y1 - y0)) / 2 - y0) for x, y in pts]


def tile_mark_scale(pts):
    """V'yi karo genişliğinin TILE_MARK_W katına ölçekle."""
    x0, _, x1, _ = bbox(pts)
    return (TILE_MARK_W * TILE) / (x1 - x0)


def num(v):
    """Gereksiz sıfırları at: -128.00 → -128 (brand/lockup.mjs ile aynı dize)."""
    return f"{v:.2f}".rstrip("0").rstrip(".")


def tile_mark_transform(pts, cx=TILE / 2, cy=TILE_MARK_CY):
    """Karo içindeki V: yolun bbox merkezi → (cx, cy)."""
    x0, y0, x1, y1 = bbox(pts)
    return (
        f"translate({num(cx)} {num(cy)}) scale({tile_mark_scale(pts):.4f}) "
        f"translate({num(-(x0 + x1) / 2)} {num(-(y0 + y1) / 2)})"
    )


# ---------------------------------------------------------------- wordmark
def _instance(wght, opsz):
    src = TTFont(FONT)
    inst = instantiateVariableFont(src, {"wght": wght, "opsz": opsz}, updateFontNames=False)
    inst.flavor = None  # woff2 kabuğunu at: harfbuzz düz ttf okur
    tmp = os.path.join(tempfile.gettempdir(), "vs-wordmark.ttf")
    inst.save(tmp)
    blob = hb.Blob.from_file_path(tmp)
    face = hb.Face(blob)
    return inst, face, hb.Font(face)


def cap_units(gs):
    """Font'un gerçek cap yüksekliği (H harfinin üst kenarı)."""
    pen = BoundsPen(gs)
    gs["H"].draw(pen)
    return pen.bounds[3]


def wordmark_flat(text="VocaStride", wght=700, opsz=60, tracking=-0.02, cap=WM_CAP):
    """
    Harf yollarını **tek** `d` dizesine indirger.

    Dönen yol: taban çizgisi y=0, cap tepesi y=-cap, sol kenar x=0.
    Böylece SVG'de, canvas'ta ve JSON'da aynı sayılar geçerli olur.
    """
    inst, face, font = _instance(wght, opsz)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})

    gs = inst.getGlyphSet()
    order = inst.getGlyphOrder()
    upem = face.upem
    s = cap / cap_units(gs)  # font birimi → çıktı birimi

    pen_x = 0.0
    d = ""
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gname = order[info.codepoint]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
        # y ekseni çevrilir: font yukarı, SVG aşağı
        tpen = TransformPen(pen, (s, 0, 0, -s, (pen_x + pos.x_offset) * s, 0))
        gs[gname].draw(tpen)
        d += pen.getCommands()
        pen_x += pos.x_advance + tracking * upem
    width = (pen_x - tracking * upem) * s
    return d, width


def write_svg(path, body, vb_w, vb_h, title):
    doc = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w:.0f} {vb_h:.0f}" '
        f'width="{vb_w:.0f}" height="{vb_h:.0f}" role="img" aria-labelledby="t">\n'
        f'  <title id="t">{title}</title>\n{body}\n</svg>\n'
    )
    io.open(os.path.join(HERE, path), "w", encoding="utf-8").write(doc)
    print("yazıldı:", path, f"({vb_w:.0f}×{vb_h:.0f})")


# ------------------------------------------------------------------- çıktı
def build():
    mark_pts = centered(v_polygon())
    mark_d = poly(mark_pts)
    mx0, my0, mx1, my1 = bbox(mark_pts)

    # 1) sembol (master, tek renk, kendi tuvalinde ortalanmış)
    write_svg(
        "symbol.svg",
        f'  <path id="symbol" fill="{INK}" d="{mark_d}"/>',
        TILE, TILE, "VocaStride symbol",
    )

    # 2) wordmark: harf yolları (taban y=0, cap -120), baseline 200'e taşınır
    wm_d, wm_w = wordmark_flat()
    body = (
        f'  <g id="wordmark" fill="{INK}" transform="translate(0 200)">\n'
        f'    <path d="{wm_d}"/>\n  </g>'
    )
    write_svg("wordmark.svg", body, wm_w + 8, 256, "VocaStride wordmark")
    print(f"   wordmark genişlik {wm_w:.1f}, cap {WM_CAP:.0f}")

    # 2b) slogan: harf yolları (og görseli ve sunum için)
    tag_d, tag_w = wordmark_flat(text="Kelimeler birer adım.", wght=460, tracking=-0.008, cap=64)
    body = (
        f'  <g id="tagline" fill="{INK}" transform="translate(0 200)">\n'
        f'    <path d="{tag_d}"/>\n  </g>'
    )
    write_svg("tagline.svg", body, tag_w + 8, 256, "VocaStride tagline")

    # 3) ikon karosu: logo mürekkebi zemin + kâğıt V (uygulama ikonu, favicon)
    tile_body = (
        f'  <rect width="256" height="256" rx="{TILE_R:.0f}" fill="{INK}"/>\n'
        f'  <g fill="{PAPER}" transform="{tile_mark_transform(mark_pts)}">'
        f'<path d="{mark_d}"/></g>'
    )
    write_svg("tile.svg", tile_body, TILE, TILE, "VocaStride icon")

    # 4) yatay lockup: karo + wordmark (tek oran: LOCK_CAP / LOCK_GAP)
    #    Dosya yalnızca 8 birim nefes payı taşır; asıl boş alan kullanım kuralıdır.
    pad = 8.0
    th = 152.0
    gap = th * LOCK_GAP
    cap = th * LOCK_CAP
    k = cap / WM_CAP
    baseline = pad + th / 2 + cap / 2
    body = (
        f'  <g id="icon" transform="translate({pad:.1f} {pad:.1f}) scale({th / TILE:.4f})">'
        f'<rect width="256" height="256" rx="{TILE_R:.0f}" fill="{INK}"/>'
        f'<g fill="{PAPER}" transform="{tile_mark_transform(mark_pts)}"><path d="{mark_d}"/></g></g>\n'
        f'  <g id="wordmark" fill="{INK}" transform="translate({pad + th + gap:.1f} {baseline:.1f}) '
        f'scale({k:.4f})">\n    <path d="{wm_d}"/>\n  </g>'
    )
    write_svg(
        "lockup-horizontal.svg", body,
        pad * 2 + th + gap + wm_w * k, th + pad * 2, "VocaStride lockup (horizontal)",
    )

    # 5) dikey lockup: karo üstte, wordmark altta
    pad = 20.0
    ts = 176.0
    wm_w_l = wm_w * (ts * LOCK_CAP / WM_CAP)
    total_w = max(ts, wm_w_l)
    body = (
        f'  <g id="icon" transform="translate({pad + (total_w - ts) / 2:.1f} {pad:.1f}) '
        f'scale({ts / TILE:.4f})">'
        f'<rect width="256" height="256" rx="{TILE_R:.0f}" fill="{INK}"/>'
        f'<g fill="{PAPER}" transform="{tile_mark_transform(mark_pts)}"><path d="{mark_d}"/></g></g>\n'
        f'  <g id="wordmark" fill="{INK}" transform="translate({pad + (total_w - wm_w_l) / 2:.1f} '
        f'{pad + ts + ts * LOCK_GAP + ts * LOCK_CAP:.1f}) scale({ts * LOCK_CAP / WM_CAP:.4f})">\n'
        f'    <path d="{wm_d}"/>\n  </g>'
    )
    write_svg(
        "lockup-stacked.svg", body,
        total_w + pad * 2, pad * 2 + ts + ts * LOCK_GAP + ts * LOCK_CAP,
        "VocaStride lockup (stacked)",
    )

    # 6) makine okunur tek kaynak
    data = {
        "_": "brand/build.py üretir — elle düzenlemeyin",
        "mark": {
            "d": mark_d,
            "w": round(mx1 - mx0, 2),
            "h": round(my1 - my0, 2),
            "cx": round((mx0 + mx1) / 2, 2),
            "cy": round((my0 + my1) / 2, 2),
        },
        "tile": {
            "size": TILE,
            "radius": TILE_R,
            "markWidth": TILE_MARK_W,
            "markCenterY": TILE_MARK_CY,
        },
        "wordmark": {"d": wm_d, "width": round(wm_w, 2), "cap": WM_CAP},
        "lockup": {"cap": LOCK_CAP, "gap": LOCK_GAP},
        # Uygulamadaki karo boyları: tek ölçek, tek yer.
        "ui": {"sidebar": 30, "onboarding": 28, "topbar": 26, "boot": 44},
        "colors": {"ink": INK, "paper": PAPER},
    }
    io.open(os.path.join(HERE, "mark.json"), "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    )
    print("yazıldı: mark.json")

    # 7) doğrulama tablosu
    s = tile_mark_scale(mark_pts)
    top = TILE_MARK_CY - (my1 - my0) / 2 * s
    bottom = TILE - (TILE_MARK_CY + (my1 - my0) / 2 * s)
    print(
        f"\n   karo {TILE:.0f} · V {TILE_MARK_W * 100:.0f}% genişlik, "
        f"{(my1 - my0) * s / TILE * 100:.1f}% yükseklik\n"
        f"   üst boşluk {top:.1f} · alt boşluk {bottom:.1f} · yan boşluk "
        f"{(TILE - (mx1 - mx0) * s) / 2:.1f}\n"
        f"   lockup: cap {LOCK_CAP * 100:.0f}% · boşluk {LOCK_GAP * 100:.0f}%"
    )


if __name__ == "__main__":
    build()
