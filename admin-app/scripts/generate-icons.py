#!/usr/bin/env python3
"""Generate rounded-square shield admin icons for PH Badminton Admin."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "static"
ADMIN = (125, 60, 163)
WHITE = (255, 255, 255)


def draw_admin_icon(draw: ImageDraw.ImageDraw, size: int) -> None:
    inset = size * 0.04
    radius = size * 0.22
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        fill=ADMIN,
    )

    cx = size / 2
    top = size * 0.22
    shield_w = size * 0.34
    mid_y = size * 0.52
    tip_y = size * 0.78

    draw.polygon(
        [
            (cx, top),
            (cx + shield_w, top + size * 0.08),
            (cx + shield_w, mid_y),
            (cx, tip_y),
            (cx - shield_w, mid_y),
            (cx - shield_w, top + size * 0.08),
        ],
        fill=WHITE,
    )

    cork_r = size * 0.045
    cork_y = size * 0.36
    draw.ellipse(
        (cx - cork_r, cork_y - cork_r, cx + cork_r, cork_y + cork_r),
        fill=ADMIN,
    )

    skirt_w = size * 0.09
    draw.polygon(
        [
            (cx, cork_y + cork_r * 0.4),
            (cx - skirt_w, mid_y - size * 0.02),
            (cx, mid_y + size * 0.08),
            (cx + skirt_w, mid_y - size * 0.02),
        ],
        fill=ADMIN,
    )


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_admin_icon(draw, size)
    return img


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    render(32).save(ROOT / "favicon.png", format="PNG")
    render(180).save(ROOT / "apple-touch-icon.png", format="PNG")
    print("Generated admin icons in static/")


if __name__ == "__main__":
    main()
