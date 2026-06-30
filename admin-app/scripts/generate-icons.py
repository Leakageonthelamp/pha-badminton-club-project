#!/usr/bin/env python3
"""Rasterize logo.svg into admin PNG icons for Clubhouse Admin."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "static"
LOGO = ROOT / "logo.svg"
RSVG = shutil.which("rsvg-convert")


def render(size: int, out: Path) -> None:
    if RSVG is None:
        raise SystemExit("rsvg-convert not found — install librsvg (e.g. brew install librsvg)")

    subprocess.run(
        [RSVG, "-w", str(size), "-h", str(size), "-o", str(out), str(LOGO)],
        check=True,
    )


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    render(32, ROOT / "favicon.png")
    render(180, ROOT / "apple-touch-icon.png")
    print("Generated admin icons in static/")


if __name__ == "__main__":
    main()
