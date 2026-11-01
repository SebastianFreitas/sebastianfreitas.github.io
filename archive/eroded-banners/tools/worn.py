"""RECIPE (the name plate's, found in the agreed "sheet 10" mask, grain_mask in dp-pass/bar-sheet10/sheet10.py, and
measured on plate-l.png: soft alpha on about 15% of its pixels, a fine grain along the torn edge, the deepest bite
about 43% of the cap, bites unevenly spaced). The plate's grain: three noise layers (cells 7 px and 3 px resampled
smooth, plus per-pixel white), normalised to 0..1, set against an erase field and turned into alpha as
clip((field - noise) * 5 + .5, 0, 1). Here the erase field is the polygon bites below, blurred a hair (about
0.35 px), and the noise only jitters the edge by less than the blur, so the edge is soft and grained but never
leaves a speck: the cap is solid where no bite is, clear inside a bite, nothing is added. Caps are drawn at
S = 5 times density, so a cap stretched to a percent of the box width (css: max(40px, 7.5%) and the like, the
deepest bite about 70% of the cap = 5.3% of the box) does not blur.

Makes the worn-end caps l1-5 and r1-5 (big boxes) and s1-5 and t1-5 (small boxes) in css/art/worn/,
sized in CSS px and never rescaled. The marks only ever erase: the box's straight end is the edge line
(x = 0, the file's outer column), most of it stays there, and every mark is a polygon bite cut inward
from it, so nothing is ever added past the end. What stays between two bites is a blunt shoulder on the
edge line (at least SHOULDER px of it, bites tilted at most 35 degrees off the inward normal so the
corners stay at 55 degrees or more): no splinters, no spikes, no thin fingers, no floating islands.
Four kinds of bite, mixed: nicks (tiny), stepped notches (a staircase down and a diagonal back out),
cuts (bigger angular wedges with the tip off centre) and, rarely, a long thin slit at its own angle.
A few small chips start at a bite tip, with about 1 px hairline cracks running in from other tips
and a couple of tiny erased chips loose in the body. All polygons, no noise.

Each cap is its own authored run from its own seed (the random module, seeded, runs here at build time
only; nothing is random at runtime); nothing is mirrored or tiled. The left cap hangs from the top
left, the right cap is drawn the same way then turned half a way round, so it hangs from the bottom
right. Big caps are 40 x 512 px, small caps 12 x 60 px, both at 5x pixel density. The big caps reach
at most DEPTH px in (the gate's text starts 40 px from its end, the footer's 32 px, and marks stay 12 px
clear of text: l3 and r3, which the footer uses, reach 20). The small caps take the same language
scaled to their size. The 3 px frame caps of the CONTINUE button squeeze the small caps' art.
plate-l.png and plate-r.png (the agreed name plate) are not touched.

Tall tiles el1-5 and er1-5 (240 x 1920, aspect 1:8, seamless top to bottom) are for the big boxes: css scales
them uniformly (width = the cap, height auto) and repeats them down the box, so the bite's height grows with
its depth. Same recipe, but the erase field is broad chewed mouths (2 to 3 lobes per cap width of height,
unevenly spaced, as tall as deep or taller), the noise wraps, and a deepest bite (72 to 78% of the width)
comes at least once in every 1.2 cap widths of height.

    py -3 tools/worn.py
"""
import math
import os
import random
import numpy as np
from PIL import Image, ImageDraw

ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "css", "art", "worn")
S = 5          # pixel density of the files
LEFT = [21, 22, 23, 24, 25]
RIGHT = [31, 32, 33, 34, 35]
SMALL_L = [41, 42, 43, 44, 45]
SMALL_R = [51, 56, 53, 54, 55]
MAXTILT = math.radians(35)
CHUNK_D = {21: 28, 32: 36}   # chunk depth by seed: l1 stays 12 px clear of the gate's text (40 px in), r2 is deepened


def bite(rnd, kind, y, k, dmax, wide=False):
    """One bite as polygon points (x in from the edge line, y down), starting at y. Returns (points, tip, bottom y)."""
    o = -2.0   # starts a little outside the edge line so the cut is clean
    if kind == "nick":
        w, d = rnd.uniform(1.4, 3) * k, rnd.uniform(1, 3) * k
        t = rnd.uniform(.2, .8)
        pts = [(o, y), (d, y + w * t), (d * .8, y + w * t + .3 * k), (o, y + w)]
        tip = (d, y + w * t)
    elif kind == "notch":
        n = rnd.choice([2, 3, 3])
        ds = sorted(rnd.uniform(2.5, 8) * k for _ in range(n))
        ws = [rnd.uniform(1.2, 3.2) * k for _ in range(n)]
        pts = [(o, y)]
        yy = y
        for d, w in zip(ds, ws):
            pts += [(d, yy), (d, yy + w)]
            yy += w
        back = max(ds[-1] * rnd.uniform(.9, 1.4), 2.5 * k)   # the diagonal back out stays 45 degrees or gentler
        pts += [(o, yy + back)]
        tip = (ds[-1], yy)
        if rnd.random() < .5:   # run the staircase the other way
            top = pts[-1][1] + y
            pts = [(px, top - py) for px, py in pts][::-1]
            tip = (tip[0], top - tip[1])
    elif kind == "cut":
        w = rnd.uniform(6, 14) * k
        d = min(rnd.uniform(.35, 1.0) * dmax, dmax) if k >= 1 else rnd.uniform(3, 7)
        t = rnd.uniform(.15, .85)
        a, c = rnd.uniform(.1, .4) * w, rnd.uniform(.55, .9) * w
        pts = [(o, y), (d * rnd.uniform(.25, .5), y + a), (d, y + t * w), (d * rnd.uniform(.4, .7), y + c), (o, y + w)]
        tip = (d, y + t * w)
    else:   # slit: thin wedge, tilted, rare and long
        d = rnd.uniform(.55, 1.0) * dmax
        w = rnd.uniform(4, 6) if wide else rnd.uniform(1.6, 3) * max(k, .8)   # big caps: real width at the mouth, tapering to the tip
        ang = rnd.choice([-1, 1]) * rnd.uniform(5, 35) * math.pi / 180
        ex = y + d * math.tan(ang)   # where the tip lands, along the edge
        pts = [(o, y), (d, ex + w * .15), (o, y + w)]
        if ex < y:   # leaning up: shift the start so the bite begins at y
            sh = y - ex
            pts = [(px, py + sh) for px, py in pts]
            tip = (d, ex + sh + w * .15)
        else:
            tip = (d, ex + w * .15)
    ys = [p[1] for p in pts]
    return pts, tip, max(ys)


def chunk(rnd, y, h, D, lo=.72):
    """A big angular chunk: walls tilted at most 35 degrees off the inward normal, a zigzag inner face."""
    o = -2.0
    d1, d2, d3, d4 = (rnd.uniform(lo, 1.0) * D for _ in range(4))
    return [(o, y), (d1, y + .6 * (d1 - o)), (d2, y + h * rnd.uniform(.3, .4)), (d3, y + h * rnd.uniform(.58, .68)),
            (d4, y + h - .6 * (d4 - o)), (o, y + h)]


def draw_cap(seed, CW, CH, k, dmax, small=False, chunks=False):
    rnd = random.Random(seed)
    W, H = CW * S, CH * S
    im = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(im)
    P = lambda pts: [(x * S, y * S) for x, y in pts]
    shoulder = 5.0 * k if k >= 1 else 3.0
    y = rnd.uniform(3, 9) * k
    tips = []
    lastgap = 1000.0
    taken = []   # y spans of the big chunks, kept clear of the other bites
    if chunks:
        for _ in range(rnd.choice([1, 2, 2])):
            for _try in range(40):
                h, cy = rnd.uniform(100, 130), 0
                cy = rnd.uniform(25, CH - 25 - h)
                if all(cy > b + 30 or cy + h < a - 30 for a, b in taken):
                    dd = rnd.uniform(30, 34)
                    d.polygon(P(chunk(rnd, cy, h, CHUNK_D.get(seed, dd), .85 if seed == 32 else .72)), fill=0)
                    taken.append((cy, cy + h))
                    break
    while y < CH - 20 * k:
        r = rnd.random()
        kind = "nick" if r < .34 else "notch" if r < .62 else "cut" if r < .88 else "slit"
        if kind == "slit" and k < 1:
            kind = "notch"
        if chunks:   # calm flat edge broken by a few long tapering cuts
            kind = "slit" if r < .85 else "nick"
        pts, tip, yb = bite(rnd, kind, y, k, min(dmax + 8, CHUNK_D.get(seed, 99)) if chunks else dmax, chunks)
        hit = [b for a, b in taken if y < b + shoulder and yb > a - shoulder]
        if hit:
            y = max(hit) + shoulder + rnd.uniform(2, 9)
            continue
        d.polygon(P(pts), fill=0)
        tips.append((tip, kind, pts))
        gap = shoulder + (rnd.expovariate(1 / (9 * k)) if rnd.random() < .85 else rnd.uniform(40, 90) * k)
        if chunks:   # never two near-equal gaps in a row, so no regular run
            while True:
                gap = rnd.uniform(18, 40) if rnd.random() < .4 else rnd.uniform(60, 150)
                if abs(gap - lastgap) > .25 * lastgap:
                    break
            lastgap = gap
        y = yb + gap
    # chips and hairline cracks start at a bite tip and go into the body
    deep = [t for t in tips if t[0][0] >= 3 * k]
    rnd.shuffle(deep)
    nc = 1 if small else 5
    for (tx, ty), kind, _ in deep[:nc]:
        room = dmax - tx
        if room < 3 * k:
            continue
        a = rnd.choice([-1, 1]) * math.radians(rnd.uniform(4, 40))
        if rnd.random() < .6 or small:   # hairline, 1 px, not forked, one bend
            L = min(rnd.uniform(.4, 1.0) * room / max(math.cos(a), .5), room / max(math.cos(a), .5))
            if L < 2.5 * k:
                continue
            a2 = a + math.radians(rnd.uniform(-14, 14))
            m = (tx + math.cos(a) * L * .55, ty + math.sin(a) * L * .55)
            e = (m[0] + math.cos(a2) * L * .45, m[1] + math.sin(a2) * L * .45)
            if e[0] > dmax:
                continue
            d.line(P([(tx - .3, ty), m, e]), fill=0, width=max(1, round(S * (1 if not small else .8))))
        else:   # a small erased chip: a slim quad from the tip
            L = min(rnd.uniform(3, 7), room)
            w = rnd.uniform(1.2, 2.6)
            ca, sa = math.cos(a), math.sin(a)
            d.polygon(P([(tx - .4, ty - w * .4), (tx + ca * L - sa * w * .3, ty + sa * L - ca * w * .3),
                         (tx + ca * L * .7 + sa * w * .5, ty + sa * L * .7 + ca * w * .5), (tx - .4, ty + w * .6)]), fill=0)
    # a couple of tiny erased chips loose in the body, clear of the edge line and the inner end
    if not small:
        for _ in range(3):
            cx, cy = rnd.uniform(5, dmax - 2), rnd.uniform(15, CH - 25)
            r0 = rnd.uniform(.9, 1.7)
            d.polygon(P([(cx - r0, cy - r0 * .3), (cx + r0 * .2, cy - r0), (cx + r0, cy + r0 * .3), (cx - r0 * .3, cy + r0 * .8)]), fill=0)
    if chunks:   # a crack may cut off a speck: erase it, so the cap stays one piece
        seed_pt = (W - 1, H // 2)
        ImageDraw.floodfill(im, seed_pt, 254)
        im = im.point(lambda v: 255 if v == 254 else 0)
    return im


def fit_depth(im, frac=.75):
    """Stretch the polygons inward from the edge line so the deepest bite is frac of the cap's width."""
    W, H = im.size
    a = np.asarray(im)
    cols = np.where((a < 128).any(axis=0))[0]
    if not len(cols):
        return im
    f = frac * W / (cols.max() + 1)
    out = im.resize((max(1, round(W * f)), H), Image.NEAREST)
    canvas = Image.new("L", (W, H), 255)
    canvas.paste(out.crop((0, 0, min(W, out.size[0]), H)), (0, 0))
    return canvas


def reach(a):
    """How far in the deepest visible bite of a grained cap goes, as a share of the cap's width."""
    cols = np.where((np.asarray(a) < 128).any(axis=0))[0]
    return (cols.max() + 1) / a.size[0]


def worn_cap(raw, seed):
    """Grained cap whose deepest visible bite is 75% of its width (fit on the result, so blur and grain are counted)."""
    frac = .75
    for _ in range(6):
        im = grain(fit_depth(raw, frac), seed)
        r = reach(im)
        if abs(r - .75) < .01:
            break
        frac *= .75 / r
    return im


def grain(im, seed):
    """The plate's grain on the polygon cap: blurred erase field against three noise layers, soft alpha."""
    from PIL import ImageFilter
    W, H = im.size
    rng = np.random.default_rng(seed)
    field = np.asarray(im.filter(ImageFilter.GaussianBlur(.35 * S)), dtype="float32") / 255

    def lay(cell):
        g = rng.random((max(2, H // int(cell * S) + 2), max(2, W // int(cell * S) + 2))).astype("float32")
        return np.asarray(Image.fromarray((g * 255).astype("uint8")).resize((W, H), Image.BICUBIC), dtype="float32") / 255
    n = .42 * lay(7) + .28 * lay(3) + .30 * rng.random((H, W)).astype("float32")
    n = (n - n.min()) / (n.max() - n.min())
    a = np.clip((field - .5 + (n - .5) * .8) * 6 + .5, 0, 1)
    return Image.fromarray((a * 255).astype("uint8"))


def to_rgba(im, right):
    if right:
        im = im.rotate(180)
    img = np.zeros((im.size[1], im.size[0], 4), np.uint8)
    img[..., :3] = 255
    img[..., 3] = np.asarray(im)
    return Image.fromarray(img, "RGBA")


def tall_tile(seed, W=240, H=1920):
    """Seamless tall tile: the erase field is broad chewed mouths, set against the plate's wrapped noise."""
    from PIL import ImageFilter
    rnd = random.Random(seed)
    big = []
    n = 8
    gaps = [rnd.uniform(.8, 1.1) for _ in range(n)]
    gaps = [g * H / sum(gaps) for g in gaps]   # 205 to 270 px, so a deepest bite sits in every 288 px
    c = rnd.uniform(0, H)
    for g in gaps:
        big.append((c % H, rnd.uniform(.72, .78) * W, rnd.uniform(.68, .85)))
        c += g
    lobes = []
    for cy, d, hk in big:
        lobes.append((cy, d, d * hk, rnd.uniform(.38, .62)))
    for i in range(n):   # one or two lesser mouths in each gap between deepest bites
        a, b = big[i][0], big[(i + 1) % n][0]
        span = (b - a) % H
        for _ in range(rnd.choice([1, 1, 2])):
            d = rnd.uniform(.2, .5) * W
            h = d * rnd.uniform(.9, 1.3) + 16
            cy = (a + rnd.uniform(.4, .6) * span) % H
            ok = True
            for ly, ld, lh, lu in lobes:
                dy = abs((cy - ly + H / 2) % H - H / 2)
                if dy < (lh + h) / 2 * .6:
                    ok = False
            if ok:
                lobes.append((cy, d, h, rnd.uniform(.38, .62)))
    y = np.arange(H, dtype="float32")
    depth = np.zeros(H, "float32")
    for cy, d, h, u in lobes:
        dy = (y - cy + H / 2) % H - H / 2
        t = np.where(dy < 0, -dy / (h * u), dy / (h * (1 - u)))
        depth = np.maximum(depth, d * np.clip(1 - np.clip(t, 0, 1) ** 2.6, 0, 1))
    rough = np.zeros(H, "float32")   # wrapped wobble along the edge: broad and fine
    for k, a in ((17, .05), (29, .04), (53, .03), (97, .025), (151, .02)):
        rough += a * np.sin(2 * np.pi * (k * y / H + rnd.random()))
    depth = depth * (1 + .6 * rough) + W * .02 * rough * np.clip(depth / 20, 0, 1) * 8
    for cy, d, hk in big:   # each deepest bite lands on its own target, wobble counted, so every one reaches 72 to 78%
        h = d * hk
        dy = (y - cy + H / 2) % H - H / 2
        near = np.abs(dy) < h * .5
        f = (d - 2) / depth[near].max()
        depth = depth * (1 + (f - 1) * np.clip(1 - np.abs(dy) / (h * .6), 0, 1))
    depth = np.where(depth > 1.5, depth, 0)
    x = np.arange(W, dtype="float32")[None, :]
    im = np.where(x < depth[:, None], 0, 255).astype("uint8")
    im = np.tile(im, (3, 1))
    f = np.asarray(Image.fromarray(im).filter(ImageFilter.GaussianBlur(.35 * 6)), dtype="float32")[H:2 * H] / 255
    rng = np.random.default_rng(seed)

    def lay(cell):
        gh, gw = max(2, round(H / (cell * 6))), max(2, W // int(cell * 6) + 2)
        g = np.tile(rng.random((gh, gw)).astype("float32"), (3, 1))
        r = np.asarray(Image.fromarray((g * 255).astype("uint8")).resize((W, 3 * H), Image.BICUBIC), dtype="float32") / 255
        return r[H:2 * H]
    nz = .42 * lay(7) + .28 * lay(3) + .30 * rng.random((H, W)).astype("float32")
    nz = (nz - nz.min()) / (nz.max() - nz.min())
    a = np.clip((f - .5 + (nz - .5) * .8) * 6 + .5, 0, 1)
    return Image.fromarray((a * 255).astype("uint8"))


def make():
    for side, seeds in (("el", LEFT), ("er", RIGHT)):
        for i, seed in enumerate(seeds, 1):
            im = tall_tile(seed + 100)
            to_rgba(im, side == "er").save(os.path.join(ART, "%s%d.png" % (side, i)), optimize=True)
    for side, seeds in (("l", LEFT), ("r", RIGHT)):
        for i, seed in enumerate(seeds, 1):
            dmax = 20 if i == 3 else 28
            im = worn_cap(draw_cap(seed, 40, 512, 1.0, dmax, chunks=i != 3), seed)
            to_rgba(im, side == "r").save(os.path.join(ART, "%s%d.png" % (side, i)), optimize=True)
    for side, seeds in (("s", SMALL_L), ("t", SMALL_R)):
        for i, seed in enumerate(seeds, 1):
            im = worn_cap(draw_cap(seed, 12, 60, .38, 8.5, small=True), seed)
            to_rgba(im, side == "t").save(os.path.join(ART, "%s%d.png" % (side, i)), optimize=True)


if __name__ == "__main__":
    make()
