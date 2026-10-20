"""
VocaStride — logo konseptleri (skill: logo-design, Faz 4)
256x256 tuval, siyah, doldurulmuş path (stroke yok). Geometri trigonometriyle.
"""
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
W = 256


def poly_path(pts):
    return "M " + " L ".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def center(pts, size=W, up=2.0):
    x0, y0, x1, y1 = bbox(pts)
    dx = (size - (x1 - x0)) / 2 - x0
    dy = (size - (y1 - y0)) / 2 - y0 - up
    return [(x + dx, y + dy) for x, y in pts]


def svg(body, title, path):
    doc = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}" '
        f'role="img" aria-labelledby="t">\n  <title id="t">{title}</title>\n{body}\n</svg>\n'
    )
    with open(os.path.join(OUT, path), "w", encoding="utf-8") as fh:
        fh.write(doc)
    return path


# --------------------------------------------------------------------- ortak V
def v_polygon(w=40, a_deg=30, apex_y=168, cut=56, foot=None):
    """V: bacaklar dikeyden 30°, uçlar yatay kesim, tepe miter (ya da yatay kesim)."""
    a = math.radians(a_deg)
    hw = (w / 2) / math.cos(a)
    t = math.tan(a)
    PL = (128 - t * (apex_y - cut), cut)
    PR = (128 + t * (apex_y - cut), cut)
    O = (128, apex_y + (w / 2) / math.sin(a))
    pts = [(PL[0] - hw, cut), (PL[0] + hw, cut), (128, apex_y), (PR[0] - hw, cut), (PR[0] + hw, cut)]
    if foot is None:
        pts.append(O)
    else:
        def x_at(p, q, y):
            return p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])
        pts.append((x_at((PR[0] + hw, cut), O, foot), foot))
        pts.append((x_at((PL[0] - hw, cut), O, foot), foot))
    return pts


# ------------------------------------------------------- A · Adım (letterform)
def mark_a():
    """Sade, ölçülü V: 30° bacaklar, yatay kesilmiş uçlar, sivri tepe."""
    p = center(v_polygon())
    return svg(f'  <path id="symbol" fill="#111" d="{poly_path(p)}"/>', "VocaStride — Adım", "concept-a.svg")


# ------------------------------------------------------- B · Basamak (abstract)
def mark_b():
    """
    Basamak: tek kalemde çizilmiş üç adım; son rıht yarım kalır — tırmanış sürüyor.
    Kalınlık 32, basamak 56, rıht 64. (Konsept aşaması: çizgi; üretimde kontura çevrilir.)
    """
    w = 40
    pts = [(52, 200), (128, 200), (128, 124), (204, 124), (204, 84)]
    d = "M " + " L ".join(f"{x} {y}" for x, y in pts)
    body = (
        f'  <path id="symbol" fill="none" stroke="#111" stroke-width="{w}" '
        f'stroke-linecap="round" stroke-linejoin="round" d="{d}"/>'
    )
    return svg(body, "VocaStride — Basamak", "concept-b.svg")


# -------------------------------------------------------- C · Kesik (negative space)
def clip_half(poly, y, keep_below):
    """Sutherland–Hodgman: poligonu yatay yarım düzlemle kes."""
    def inside(p):
        return p[1] >= y if keep_below else p[1] <= y

    out = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        ain, bin_ = inside(a), inside(b)
        if ain:
            out.append(a)
        if ain != bin_:
            t = (y - a[1]) / (b[1] - a[1])
            out.append((a[0] + t * (b[0] - a[0]), y))
    # ardışık tekrarları at
    clean = []
    for p_ in out:
        if not clean or abs(p_[0] - clean[-1][0]) > 0.05 or abs(p_[1] - clean[-1][1]) > 0.05:
            clean.append(p_)
    return clean


def mark_c():
    """Aynı V; ortasından yatay bir cetvel çizgisi geçiyor (defter çizgisi)."""
    v = center(v_polygon())
    y0, y1 = 118.0, 124.0
    top = clip_half(v, y0, keep_below=False)
    bottom = clip_half(v, y1, keep_below=True)
    d = poly_path(top) + " " + poly_path(bottom)
    return svg(
        f'  <path id="symbol" fill="#111" d="{d}"/>',
        "VocaStride — Kesik",
        "concept-c.svg",
    )


if __name__ == "__main__":
    for fn in (mark_a, mark_b, mark_c):
        print("yazıldı:", fn())
