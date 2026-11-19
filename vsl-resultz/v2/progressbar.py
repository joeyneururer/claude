"""Thin progress bar along the bottom edge: RGBA raw stream, 1920x6 @25fps, fills left→right over the whole video."""
import numpy as np, sys
N = int(open("N.txt").read()); W, H = 1920, 6
x = np.arange(W)
c0, c1 = np.array([229, 64, 43]), np.array([236, 137, 70])           # RESULTZ accent gradient red → orange
grad = (c0[None] + (c1 - c0)[None] * (x / (W - 1))[:, None])          # W×3
track = np.array([243, 241, 236]); track_a = 0.18
out = open("bar.rgba", "wb")
for f in range(N):
    p = (f + 1) / N * W                                                  # filled width in px (fractional)
    cov = np.clip(p - x, 0, 1)                                           # anti-aliased leading edge
    head = np.exp(-((x - p) / 10.0) ** 2) * (cov > 0)                    # soft brighter head
    rgb = grad * cov[:, None] + track[None] * (1 - cov)[:, None]
    rgb = np.clip(rgb + head[:, None] * 60, 0, 255)
    a = cov * 1.0 + (1 - cov) * track_a
    row = np.dstack([rgb[None].repeat(H, 0), (a * 255)[None].repeat(H, 0)[..., None]]).astype(np.uint8)
    out.write(row.tobytes())
out.close()
print("frames", N)
