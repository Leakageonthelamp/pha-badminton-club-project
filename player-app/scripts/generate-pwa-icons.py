#!/usr/bin/env python3
"""Rasterize logo.svg into PWA PNG icons for Clubhouse."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "static"
LOGO = ROOT / "logo.svg"
MASKABLE = ROOT / "logo-maskable.svg"
RSVG = shutil.which("rsvg-convert")


def render(svg: Path, size: int, out: Path) -> None:
    if RSVG is None:
        raise SystemExit("rsvg-convert not found — install librsvg (e.g. brew install librsvg)")

    subprocess.run(
        [RSVG, "-w", str(size), "-h", str(size), "-o", str(out), str(svg)],
        check=True,
    )


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)

    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        render(LOGO, size, ROOT / name)

    render(LOGO, 32, ROOT / "favicon.png")
    render(MASKABLE, 512, ROOT / "icon-maskable-512.png")
    print("Generated PWA icons in static/")


if __name__ == "__main__":
    main()
