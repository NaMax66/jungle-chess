"""Generate transparent WebP display assets; retain the original PNG artwork.

Run with Python and Pillow after adding or replacing an animal PNG.
The generated files are committed, so the website build needs no image tools.
"""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parent.parent / "public" / "assets"
original_bytes = 0
totals = {128: 0, 256: 0, 768: 0}
for source in sorted(assets.glob("*-v1.png")):
    original_bytes += source.stat().st_size
    with Image.open(source) as original:
        for size, quality in ((128, 82), (256, 85), (768, 86)):
            image = original.convert("RGBA")
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            output = source.with_name(f"{source.stem}-{size}.webp")
            image.save(output, "WEBP", quality=quality, method=6, alpha_quality=100)
            totals[size] += output.stat().st_size
            print(f"{output.name}: {output.stat().st_size:,} bytes")
print(f"Original PNG set: {original_bytes:,} bytes")
for size, total in totals.items():
    print(f"{size}px WebP set: {total:,} bytes ({original_bytes / total:.0f}x smaller)")
