"""Build transparent palm favicon assets for browser tabs."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".skill-archive" / "logo-creator" / "2026-05-05-punta-norte" / "favicon-03.png"
FAVICON_PNG_TARGETS = [
    ROOT / "public" / "favicon.png",
    ROOT / "app" / "icon.png",
]
APPLE_PNG_TARGETS = [
    ROOT / "app" / "apple-icon.png",
    ROOT / "public" / "apple-touch-icon.png",
]
ICO_TARGET = ROOT / "app" / "favicon.ico"


def is_orange_pixel(r: int, g: int, b: int) -> bool:
    saturation = max(r, g, b) - min(r, g, b)
    return saturation >= 55 and r >= 160 and (r - b) >= 55


def clean_alpha(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    r, g, b, a = rgba.split()
    a = a.point(lambda value: 0 if value < 128 else 255)
    return Image.merge("RGBA", (r, g, b, a))


def make_transparent_favicon(source: Path, canvas_size: int = 512, padding: int = 2) -> Image.Image:
    rgba = Image.open(source).convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if not is_orange_pixel(r, g, b):
                pixels[x, y] = (r, g, b, 0)

    bbox = rgba.getbbox()
    if not bbox:
        raise RuntimeError("No visible pixels found in favicon source")

    cropped = clean_alpha(rgba.crop(bbox))
    max_side = canvas_size - padding * 2
    scale = max_side / max(cropped.width, cropped.height)
    new_size = (
        max(1, int(cropped.width * scale)),
        max(1, int(cropped.height * scale)),
    )
    cropped = cropped.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset_x = (canvas_size - cropped.width) // 2
    offset_y = (canvas_size - cropped.height) // 2
    canvas.paste(cropped, (offset_x, offset_y), cropped)
    return canvas


def save_png_atomic(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(suffix=".png", dir=path.parent)
    os.close(fd)
    tmp_path = Path(tmp_name)
    try:
        image.save(tmp_path, format="PNG", compress_level=6, optimize=False)
        with Image.open(tmp_path) as saved:
            saved.verify()
        os.replace(tmp_path, path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


def save_ico_atomic(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(suffix=".ico", dir=path.parent)
    os.close(fd)
    tmp_path = Path(tmp_name)
    try:
        image.save(tmp_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        os.replace(tmp_path, path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source favicon: {SOURCE}")

    favicon = make_transparent_favicon(SOURCE)
    apple_icon = favicon.resize((180, 180), Image.Resampling.LANCZOS)

    for path in FAVICON_PNG_TARGETS:
        save_png_atomic(path, favicon)
        print(f"saved png -> {path}")

    for path in APPLE_PNG_TARGETS:
        save_png_atomic(path, apple_icon)
        print(f"saved apple png -> {path}")

    save_ico_atomic(ICO_TARGET, favicon)
    print(f"saved ico -> {ICO_TARGET}")


if __name__ == "__main__":
    main()
