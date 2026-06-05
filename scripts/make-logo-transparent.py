"""Keep only brand-orange pixels in isotipo PNG; transparent elsewhere."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "public" / "isotipo-compass-01.png"


def is_brand_orange_pixel(r: int, g: int, b: int) -> bool:
    saturation = max(r, g, b) - min(r, g, b)
    return saturation > 35 and r > g and (r - b) > 30


def remove_non_orange_background(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if not is_brand_orange_pixel(r, g, b):
                pixels[x, y] = (r, g, b, 0)

    return rgba


def trim_transparent(im: Image.Image, padding: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(im.width, right + padding)
    bottom = min(im.height, bottom + padding)
    return im.crop((left, top, right, bottom))


def main() -> None:
    if not TARGET.exists():
        raise SystemExit(f"missing: {TARGET}")

    source = Image.open(TARGET)
    result = trim_transparent(remove_non_orange_background(source))
    result.save(TARGET, format="PNG", optimize=True)
    print(f"updated: {TARGET} ({result.mode}, {result.size[0]}x{result.size[1]})")


if __name__ == "__main__":
    main()
