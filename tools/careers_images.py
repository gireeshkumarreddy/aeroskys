"""Extract the Careers imagery from the client's reference screens (Aeroskys design document).

Only pixels from the 14 supplied screens are used. Each asset is cropped at the reference's native
resolution (never upscaled). Where a mock-up card or caption was drawn over a photo, that patch is
retouched (sky restored, background whitened or inpainted) so the rebuilt HTML components can sit on
top without doubling up. Output: public/careers/img/*.webp

Usage (optional tool, not needed to run the site):
    pip install pillow opencv-python-headless numpy
    # unzip Aeroskys_Client_Design_Reference_Document_Updated.docx somewhere, then:
    python tools/careers_images.py path/to/unzipped/word/media

The reference screens are image2.jpeg ... image14.jpeg in that folder (numbered as in the document).
Crop boxes below are in each screen's own pixel coordinates.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

if len(sys.argv) < 2:
    sys.exit('Usage: python tools/careers_images.py <unzipped-reference-docx>/word/media')
REF = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / 'public' / 'careers' / 'img'
OUT.mkdir(parents=True, exist_ok=True)


def ref(n):
    ext = 'png' if n == 1 else 'jpeg'
    return np.array(Image.open(REF / f'image{n}.{ext}').convert('RGB'))


def crop(a, box):
    x0, y0, x1, y1 = box
    return a[y0:y1, x0:x1].copy()


def local(rect, box):
    """Global reference rect -> rect local to a crop box (clamped)."""
    x0, y0, x1, y1 = rect
    bx, by, bx1, by1 = box
    return (max(0, x0 - bx), max(0, y0 - by), min(bx1 - bx, x1 - bx), min(by1 - by, y1 - by))


def inpaint(a, rects, radius=7):
    mask = np.zeros(a.shape[:2], np.uint8)
    for x0, y0, x1, y1 in rects:
        mask[y0:y1, x0:x1] = 255
    return cv2.cvtColor(cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), mask, radius, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)


def fill(a, rects, color):
    for x0, y0, x1, y1 in rects:
        a[y0:y1, x0:x1] = color
    return a


def fill_columns(a, x0, x1, y_top, y_bot):
    """Replace rows y_top..y_bot by a per-column blend of the rows just above and below (smooth sky)."""
    top = a[y_top - 1, x0:x1].astype(np.float32)
    bot = a[y_bot + 1, x0:x1].astype(np.float32)
    n = y_bot - y_top + 1
    for i in range(n):
        t = (i + 1) / (n + 1)
        a[y_top + i, x0:x1] = np.clip(top * (1 - t) + bot * t, 0, 255).astype(np.uint8)
    # soften the seam a touch
    band = a[y_top - 3:y_bot + 4, x0:x1]
    a[y_top - 3:y_bot + 4, x0:x1] = cv2.GaussianBlur(band, (1, 5), 0)
    return a


def fill_sky(a, x0, x1, y_top, y_bot, rows=4):
    """Like fill_columns, for a soft sky: average a few rows each side and smooth sideways so no streaks show."""
    top = a[y_top - rows:y_top, x0:x1].astype(np.float32).mean(axis=0)
    bot = a[y_bot + 1:y_bot + 1 + rows, x0:x1].astype(np.float32).mean(axis=0)
    top = cv2.GaussianBlur(top[None], (15, 1), 0)[0]
    bot = cv2.GaussianBlur(bot[None], (15, 1), 0)[0]
    n = y_bot - y_top + 1
    for i in range(n):
        t = (i + 1) / (n + 1)
        a[y_top + i, x0:x1] = np.clip(top * (1 - t) + bot * t, 0, 255).astype(np.uint8)
    return a


def whiten_background(a, tol=16, dots=()):
    """Flood-fill the near-white page background from the crop border to pure white."""
    h, w = a.shape[:2]
    bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    seeds = [(x, 0) for x in range(0, w, 7)] + [(x, h - 1) for x in range(0, w, 7)] + \
            [(0, y) for y in range(0, h, 7)] + [(w - 1, y) for y in range(0, h, 7)]
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8)
    for sx, sy in seeds:
        if mask[sy + 1, sx + 1] == 0 and bgr[sy, sx].min() > 200:
            cv2.floodFill(bgr, mask, (sx, sy), (255, 255, 255), (tol,) * 3, (tol,) * 3, flags)
    region = mask[1:-1, 1:-1] > 0
    a[region] = 255
    for x0, y0, x1, y1 in dots:
        a[y0:y1, x0:x1] = 255
    return a


def key_to_alpha(a, bg, zones, lo=14, hi=42):
    """Make pixels close to the page background transparent inside the given zones."""
    rgba = np.dstack([a, np.full(a.shape[:2], 255, np.uint8)])
    dist = np.sqrt(((a.astype(np.float32) - np.array(bg, np.float32)) ** 2).sum(axis=2))
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1) * 255
    for x0, y0, x1, y1 in zones:
        rgba[y0:y1, x0:x1, 3] = alpha[y0:y1, x0:x1].astype(np.uint8)
    return rgba


def bezier_points(path, steps=40):
    """Points along a path given as [start, (c1, c2, end), ...] of cubic segments."""
    pts = [path[0]]
    cur = np.array(path[0], np.float32)
    for c1, c2, end in path[1:]:
        c1, c2, end = map(lambda p: np.array(p, np.float32), (c1, c2, end))
        for i in range(1, steps + 1):
            t = i / steps
            p = (1 - t) ** 3 * cur + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * end
            pts.append(tuple(p))
        cur = end
    return pts


# Hero wave in hero-local pixels; the same curve is used by the SVG overlay in careers.html.
HERO_WAVE = [(0, 471), ((173, 446), (253, 431), (355, 438)), ((483, 446), (623, 536), (866, 626)),
             ((1000, 676), (1180, 660), (1294, 526))]


def whiten_below(a, path, color=(255, 255, 255)):
    h, w = a.shape[:2]
    pts = bezier_points(path) + [(w, h + 40), (0, h + 40)]
    cv2.fillPoly(a, [np.array(pts, np.int32)], color)
    return a


def fade_bottom(a, start, color=(253, 253, 253)):
    h = a.shape[0]
    t = np.clip((np.arange(h) - start) / max(1, h - start), 0, 1)[:, None, None]
    t = t * t * (3 - 2 * t)
    return (a * (1 - t) + np.array(color) * t).astype(np.uint8)


def save(a, name, q=92, sharpen=True):
    mode = 'RGBA' if a.shape[2] == 4 else 'RGB'
    im = Image.fromarray(a, mode)
    if sharpen and mode == 'RGB':
        im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=30, threshold=3))
    p = OUT / f'{name}.webp'
    im.save(p, 'WEBP', quality=q, method=6, alpha_quality=95)
    print(f'{name:18s} {im.width}x{im.height}  {p.stat().st_size // 1024} KB')


# 02 — Landing hero: sky, two professionals, jet and contrail, script lettering
r2 = ref(2)
HB = (77, 74, 1371, 680)
hero = crop(r2, HB)
hero = fill_columns(hero, 124 - 77, 1324 - 77, 94 - 74, 178 - 74)          # header capsule over the sky
hero = inpaint(hero, [local((122, 470, 440, 606), HB)], radius=9)            # "A Great Place to Grow" card
hero = whiten_below(hero, HERO_WAVE)                                          # the white wave (hides baked headline)
save(hero, 'hero')


def lift_lettering(a, box, lift=10):
    """Inpaint light lettering off the sky inside box. Returns the clean image and the stroke mask."""
    x0, y0, x1, y1 = box
    region = a[y0:y1, x0:x1]
    sky = cv2.medianBlur(region, 21)                                          # strokes are thin, so this is the sky
    strokes = (region[..., 0].astype(np.int16) - sky[..., 0].astype(np.int16) > lift).astype(np.uint8) * 255
    mask = np.zeros(a.shape[:2], np.uint8)
    mask[y0:y1, x0:x1] = cv2.dilate(strokes, np.ones((3, 3), np.uint8), iterations=2)
    clean = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), mask, 5, cv2.INPAINT_TELEA)
    return cv2.cvtColor(clean, cv2.COLOR_BGR2RGB), mask


# Full-screen desktop hero: the same photo with the script and the tagline lifted off the sky and the card's
# rounded top corners filled, so the page can crop it to any screen and set the script and tagline itself.
SCRIPT_BOX = (88, 170, 290, 344)                                              # "People Planes Possibilities"
hero_desk, script_mask = lift_lettering(hero, SCRIPT_BOX)
hero_desk, _ = lift_lettering(hero_desk, (1078, 150, 1212, 264))             # "A bigger tomorrow together"
corners = np.zeros(hero.shape[:2], np.uint8)
for cx0, cx1 in ((0, 12), (1274, 1294)):
    zone = hero_desk[0:20, cx0:cx1].astype(np.int16)
    corners[0:20, cx0:cx1] = ((zone[..., 0] > 150) & (zone[..., 2] - zone[..., 0] < 40)) * 255
corners = cv2.dilate(corners, np.ones((3, 3), np.uint8), iterations=2)
hero_desk = cv2.cvtColor(cv2.inpaint(cv2.cvtColor(hero_desk, cv2.COLOR_RGB2BGR), corners, 5, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)
save(hero_desk, 'hero-desktop')
# The script as white ink on transparency, keyed against the cleaned sky (red and green carry the contrast).
x0, y0, x1, y1 = SCRIPT_BOX
ink_in, sky_in = hero[y0:y1, x0:x1].astype(np.float32), hero_desk[y0:y1, x0:x1].astype(np.float32)
alpha = ((ink_in[..., :2] - sky_in[..., :2]) / np.maximum(255 - sky_in[..., :2], 1)).mean(axis=2)
alpha = np.clip((alpha - .04) / .8, 0, 1) * (cv2.dilate(script_mask, np.ones((3, 3), np.uint8))[y0:y1, x0:x1] > 0)
alpha[305 - y0:, 250 - x0:] = 0                                               # loose hair strands, not lettering
save(np.dstack([np.full(alpha.shape + (3,), 255, np.uint8), (alpha * 255).astype(np.uint8)]), 'hero-script')
save(hero[96:, 355:], 'hero-mobile')                                          # people-centred crop for phones
hero_m = Image.fromarray(hero[96:, 355:])                                   # a lighter copy for smaller phones
save(np.array(hero_m.resize((640, round(hero_m.height * 640 / hero_m.width)), Image.LANCZOS)), 'hero-mobile-640')
save(crop(r2, (962, 706, 1146, 762)), 'avatars')                              # avatar group from the reference card

# 03 — Role introduction portraits
r3 = ref(3)
MB = (858, 222, 1131, 530)
man = crop(r3, MB)
man = inpaint(man, [local((1086, 250, 1131, 362), MB), local((858, 403, 993, 497), MB),
                    local((1056, 465, 1131, 530), MB)], radius=7)
save(man, 'role-man')
WB = (1059, 432, 1393, 683)
woman = crop(r3, WB)
woman = inpaint(woman, [local((1124, 634, 1393, 683), WB), local((1059, 637, 1086, 683), WB)], radius=7)
woman = key_to_alpha(woman, (248, 248, 246), [(0, 0, woman.shape[1], 468 - 432 + 2),
                                              (0, 0, 18, 58), (woman.shape[1] - 18, 0, woman.shape[1], 58)])
save(woman, 'role-woman')

# 04 — Building the direction: airport card, cloud card, aircraft nose, aviation card
r4 = ref(4)
AB = (95, 249, 362, 555)
save(inpaint(crop(r4, AB), [local((66, 492, 260, 606), AB)], radius=7), 'dir-airport')
save(crop(r4, (292, 557, 448, 642)), 'dir-cloud')
PB = (1005, 115, 1536, 800)
plane = crop(r4, PB)
plane = inpaint(plane, [local((1185, 128, 1408, 240), PB), local((1043, 648, 1280, 765), PB),
                        local((1268, 442, 1495, 765), PB)], radius=11)
save(plane, 'dir-plane')
VB = (1273, 447, 1490, 760)
save(inpaint(crop(r4, VB), [local((1293, 468, 1445, 558), VB)], radius=7), 'dir-aviation')

# 05 — What the job is: wing above clouds (with the reference lettering) + script
r5 = ref(5)
JB = (822, 281, 1348, 562)                                                   # the whole photo card, lettering included
save(inpaint(crop(r5, JB), [local((822, 440, 954, 528), JB)], radius=9), 'role-wing')   # "Grow a stronger…" card
script = crop(r5, (1435, 55, 1522, 150)).astype(np.float32)             # light strokes on the navy panel:
alpha = np.clip((script.mean(axis=2) - 48) / (125 - 48), 0, 1) * 255      # key the navy out so the page's own
ink = np.zeros_like(script); ink[:] = (118, 150, 200)                       # gradient shows through, no box
save(np.dstack([ink, alpha]).astype(np.uint8), 'script-build-grow-perform')

# 06 — Performance pay: wing over clouds (left) and the ladder card wing
r6 = ref(6)
WGB = (0, 186, 291, 369)                     # below the "Performance driven growth" tile, left of "Go further", above the table
wing = crop(r6, WGB)
dash = np.zeros(wing.shape[:2], np.uint8)    # the dashed connector baked across the sky and the winglet
pts = np.array([(147, 165), (127, 180), (110, 197), (97, 217), (85, 237), (75, 257), (67, 277), (60, 293), (55, 307), (53, 314)], np.float32)
cv2.polylines(dash, [np.int32(pts - (0, WGB[1]))], False, 255, 7)
tile = np.zeros_like(dash)
x0, y0, x1, y1 = local((148, 194, 284, 316), WGB)  # "Higher earnings potential" tile
tile[y0:y1, x0:x1] = 255
wing = cv2.cvtColor(cv2.inpaint(cv2.cvtColor(wing, cv2.COLOR_RGB2BGR), dash | tile, 9, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)
save(wing, 'pay-wing')
LB = (714, 1084, 946, 1224)                  # lower half of the "From potential to leadership" card
ladder = crop(r6, LB)
ladder = fill_sky(ladder, 0, 908 - 714, 1090 - 1084, 1146 - 1084)   # card copy over the sky (rebuilt as HTML)
save(ladder, 'ladder-wing')

# 07 — Candidate profile portrait on white + script
r7 = ref(7)
PRB = (505, 75, 1020, 720)
profile = crop(r7, PRB)
profile = whiten_background(profile, tol=18, dots=[local((500, 228, 526, 254), PRB)])
profile[0:140, 446:] = 255                     # "Build Grow Belong" lettering (its own image on desktop)
save(profile, 'profile')
save(whiten_background(crop(r7, (945, 62, 1064, 220)), tol=10), 'script-build-grow-belong')

# 08 — HR & Recruitment portraits (reference order) + script
r8 = ref(8)
for i, box in enumerate([(239, 347, 398, 516), (418, 344, 623, 528), (639, 319, 893, 558),
                         (910, 344, 1117, 528), (1138, 344, 1297, 515)], start=1):
    p = crop(r8, box)
    if i == 3:
        p = inpaint(p, [local((650, 505, 890, 556), box)], radius=5)   # caption + button drawn on the photo
    save(p, f'hr-{i}')
save(whiten_background(crop(r8, (1248, 88, 1396, 222)), tol=10), 'script-people-planes')

# 09 — How we hire: cliffs, bridge and the two walkers
r9 = ref(9)
BB = (0, 400, 1536, 954)
bridge = crop(r9, BB)
white = (253, 253, 253)
bridge = fill(bridge, [local(r, BB) for r in [
    (240, 400, 1296, 583),                                              # step cards
    (350, 578, 365, 598), (618, 578, 633, 598), (902, 578, 917, 598), (1163, 578, 1178, 598),  # connectors
    (760, 640, 775, 706),                                               # centre rule
    (530, 715, 1010, 800), (660, 805, 875, 880),                        # text and button under the bridge
    (30, 405, 145, 482), (1405, 400, 1512, 432),                        # corner labels (rebuilt as text)
]], white)
bridge = inpaint(bridge, [local((48, 884, 392, 926), BB), local((1338, 848, 1482, 922), BB)], radius=9)
bridge = fade_bottom(bridge, 400)                                          # cliffs fade to white, as in the reference
save(bridge, 'bridge')

# 10–14 — Application artwork
save(crop(ref(10), (560, 0, 1023, 215)), 'app-wing')
save(crop(ref(12), (1255, 545, 1479, 765)), 'app-growth-wing')
r14 = ref(14)
save(crop(r14, (800, 85, 990, 345)), 'app-window')
save(crop(r14, (762, 739, 980, 893)), 'app-final-wing')
save(whiten_background(crop(r14, (664, 158, 798, 298)), tol=10), 'script-different-people')
print('done ->', OUT)
