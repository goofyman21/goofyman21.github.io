#!/usr/bin/env python3
"""Generate Meridian icons and iPhone startup images.

Install Pillow, then run from the repository root:

    python3 -m pip install pillow
    python3 scripts/generate-pwa-assets.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "public" / "icons"
SPLASH_DIR = ROOT / "public" / "splash"
APP_DIR = ROOT / "app"

BG = (12, 14, 18, 255)
APP_BG = (7, 8, 12, 255)
GOLD = (214, 177, 122, 255)
IVORY = (244, 239, 230, 255)
MUTED = (196, 190, 180, 255)

SERIF = Path("/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf")
SANS = Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf")

# Logical CSS pixels must match the startup images declared in lib/startup-images.ts.
SPLASHES = [
    ("iphone-se", 750, 1334),
    ("iphone-11", 828, 1792),
    ("iphone-14", 1170, 2532),
    ("iphone-14-plus", 1284, 2778),
    ("iphone-14-pro", 1179, 2556),
    ("iphone-14-pro-max", 1290, 2796),
    ("iphone-16-pro", 1206, 2622),
    ("iphone-16-pro-max", 1320, 2868),
]


def draw_mark(size: int, height_ratio: float) -> Image.Image:
    """Opaque app mark. height_ratio is the ellipse height relative to the canvas."""
    scale = 4 if size <= 256 else 2
    canvas = size * scale
    image = Image.new("RGBA", (canvas, canvas), BG)
    glow = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    center = canvas / 2
    radius = canvas * 0.34
    glow_draw.ellipse(
        (center - radius, center - radius * 0.92, center + radius, center + radius * 0.92),
        fill=(214, 177, 122, 46),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=canvas * 0.045))
    image = Image.alpha_composite(image, glow)
    draw = ImageDraw.Draw(image)

    ellipse_h = canvas * height_ratio
    ellipse_w = ellipse_h * 0.48
    box = (
        center - ellipse_w / 2,
        center - ellipse_h / 2,
        center + ellipse_w / 2,
        center + ellipse_h / 2,
    )
    stroke = max(2, int(canvas * 0.028))
    draw.ellipse(box, outline=GOLD, width=stroke)

    arm = ellipse_w * 1.15
    draw.line(
        (center - arm, center, center + arm, center),
        fill=IVORY,
        width=max(2, int(stroke * 0.72)),
    )

    diamond = canvas * 0.028
    top = center - ellipse_h / 2
    draw.polygon(
        [
            (center, top - diamond * 1.15),
            (center + diamond, top),
            (center, top + diamond * 0.85),
            (center - diamond, top),
        ],
        fill=IVORY,
    )

    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    background = Image.new("RGBA", (size, size), BG)
    background.paste(resized, mask=resized.getchannel("A"))
    return background


def draw_splash(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height), APP_BG[:3])
    mark_size = max(180, int(min(width, height) * 0.24))
    mark = draw_mark(mark_size, 0.58)
    mark_x = (width - mark_size) // 2
    mark_y = int(height * 0.36) - mark_size // 2
    image.paste(mark, (mark_x, mark_y))

    draw = ImageDraw.Draw(image)
    title_size = max(54, int(width * 0.072))
    label_size = max(18, int(width * 0.026))
    title_font = ImageFont.truetype(str(SERIF), title_size)
    label_font = ImageFont.truetype(str(SANS), label_size)

    title = "Meridian"
    title_box = draw.textbbox((0, 0), title, font=title_font)
    title_w = title_box[2] - title_box[0]
    title_x = (width - title_w) / 2
    title_y = mark_y + mark_size + int(height * 0.03)
    draw.text((title_x, title_y), title, font=title_font, fill=IVORY[:3])

    line_w = int(width * 0.12)
    line_y = title_y + (title_box[3] - title_box[1]) + int(height * 0.018)
    draw.line(
        ((width - line_w) / 2, line_y, (width + line_w) / 2, line_y),
        fill=GOLD[:3],
        width=max(2, width // 400),
    )

    label = "HOLDINGS"
    label_box = draw.textbbox((0, 0), label, font=label_font)
    label_w = label_box[2] - label_box[0]
    # Pillow tracking is limited; draw glyphs one by one for a wider label.
    tracking = label_size * 0.42
    total = label_w + tracking * (len(label) - 1)
    cursor = (width - total) / 2
    label_y = line_y + int(height * 0.016)
    for glyph in label:
        draw.text((cursor, label_y), glyph, font=label_font, fill=MUTED[:3])
        glyph_w = draw.textbbox((0, 0), glyph, font=label_font)[2]
        cursor += glyph_w + tracking

    return image


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    SPLASH_DIR.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(parents=True, exist_ok=True)

    any_icon = {
        32: draw_mark(32, 0.62),
        180: draw_mark(180, 0.6),
        192: draw_mark(192, 0.6),
        512: draw_mark(512, 0.6),
    }
    maskable = {
        192: draw_mark(192, 0.42),
        512: draw_mark(512, 0.42),
    }

    any_icon[32].save(ICON_DIR / "favicon-32.png", optimize=True)
    any_icon[32].save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(32, 32)])
    any_icon[180].save(ICON_DIR / "apple-touch-icon.png", optimize=True)
    any_icon[192].save(ICON_DIR / "icon-192.png", optimize=True)
    any_icon[512].save(ICON_DIR / "icon-512.png", optimize=True)
    maskable[192].save(ICON_DIR / "icon-maskable-192.png", optimize=True)
    maskable[512].save(ICON_DIR / "icon-maskable-512.png", optimize=True)

    any_icon[180].save(APP_DIR / "apple-icon.png", optimize=True)
    any_icon[32].save(APP_DIR / "icon.png", optimize=True)

    for name, width, height in SPLASHES:
        splash = draw_splash(width, height)
        splash.save(SPLASH_DIR / f"{name}.png", optimize=True)
        print(f"splash {name} {width}x{height}")

    print("icons written")


if __name__ == "__main__":
    main()
