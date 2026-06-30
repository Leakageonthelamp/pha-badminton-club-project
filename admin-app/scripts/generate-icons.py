#!/usr/bin/env python3
"""Rasterize logo.svg into admin PNG icons for Clubhouse Admin."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "static"
LOGO = ROOT / "logo.svg"
MASKABLE = ROOT / "logo-maskable.svg"
RSVG = shutil.which("rsvg-convert")

# ponytail: 1024px master + 512 apple-touch — OS splash scales down, not up (stays sharp on mobile)
ICON_SIZES: tuple[tuple[int, str], ...] = (
	(192, "icon-192.png"),
	(512, "icon-512.png"),
	(1024, "icon-1024.png"),
	(512, "apple-touch-icon.png"),
)


def render(svg: Path, size: int, out: Path) -> None:
	if RSVG is None:
		raise SystemExit("rsvg-convert not found — install librsvg (e.g. brew install librsvg)")

	subprocess.run(
		[RSVG, "-w", str(size), "-h", str(size), "-o", str(out), str(svg)],
		check=True,
	)


def main() -> None:
	ROOT.mkdir(parents=True, exist_ok=True)

	for size, name in ICON_SIZES:
		render(LOGO, size, ROOT / name)

	render(LOGO, 32, ROOT / "favicon.png")
	render(MASKABLE, 512, ROOT / "icon-maskable-512.png")
	render(MASKABLE, 1024, ROOT / "icon-maskable-1024.png")
	print("Generated admin icons in static/")


if __name__ == "__main__":
	main()
