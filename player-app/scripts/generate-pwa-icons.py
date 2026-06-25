#!/usr/bin/env python3
"""Generate circular shuttlecock PWA icons for PH Badminton Club."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "static"
BRAND = (150, 74, 192)
WHITE = (255, 255, 255)


def draw_shuttlecock(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float) -> None:
    cork_r = scale * 0.14
    cork_y = cy - scale * 0.18
    draw.ellipse(
        (cx - cork_r, cork_y - cork_r, cx + cork_r, cork_y + cork_r),
        fill=WHITE,
    )

    skirt_w = scale * 0.28
    skirt_top = cork_y + cork_r * 0.55
    skirt_mid_y = cy + scale * 0.1
    skirt_tip_y = cy + scale * 0.36
    draw.polygon(
        [
            (cx, skirt_top),
            (cx - skirt_w, skirt_mid_y),
            (cx, skirt_tip_y),
            (cx + skirt_w, skirt_mid_y),
        ],
        fill=WHITE,
    )


def draw_icon(size: int, *, inset_ratio: float = 0.0) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    inset = size * inset_ratio
    draw.ellipse((inset, inset, size - inset - 1, size - inset - 1), fill=BRAND)

    center = size / 2
    icon_scale = size * (0.52 - inset_ratio * 0.35)
    draw_shuttlecock(draw, center, center, icon_scale)

    return img


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)

    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        draw_icon(size).save(ROOT / name, format="PNG")

    draw_icon(32).save(ROOT / "favicon.png", format="PNG")
    draw_icon(512, inset_ratio=0.08).save(ROOT / "icon-maskable-512.png", format="PNG")
    print("Generated PWA icons in static/")


if __name__ == "__main__":
    main()
