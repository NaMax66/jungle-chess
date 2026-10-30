"""Generate winter artwork WebPs, preserving original transparent PNGs."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parent.parent / 'public/assets/themes/winter'
for source in sorted(assets.glob('*.png')):
    name = source.stem
    with Image.open(source) as original:
        # Trim only transparent padding; preserve all painted content and shadow.
        original = original.convert('RGBA')
        # Animal framing matches its approved portrait; trim terrain only.
        if name in ('den-v2', 'trap-v2'):
            original = original.crop(original.getchannel('A').getbbox())
        for size in (128, 256, 768):
            image = original.copy()
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
            output = assets / f'{name}-{size}.webp'
            image.save(output, 'WEBP', quality=86, method=6, alpha_quality=100)
            print(f'{output.name}: {output.stat().st_size:,} bytes')
