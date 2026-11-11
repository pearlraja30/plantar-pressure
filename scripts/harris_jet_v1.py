"""
Harris mat footprint -> smooth JET pressure heatmap (transparent PNG)
Version 1 ("Final heatmap jet transparent")
Usage: python harris_jet_v1.py input.jpg output.png
"""
import sys
import cv2
import numpy as np
from scipy import ndimage as ndi

# ---------------- parameters ----------------
MEDIAN_BG_KERNEL   = 101    # paper background estimate
DENOISE_SIGMA      = 1.2    # 5x5 Gaussian
SEG_SIGMA          = 5      # heavy blur used only for the mask (hides mat grid)
OTSU_FACTOR        = 0.45   # threshold = Otsu * factor
OPEN_K, CLOSE_K    = 15, 91 # morphology kernels (ellipse)
MASK_SMOOTH_SIGMA  = 9      # outline smoothing
MASK_TRIM_OPEN     = 41     # removes thin spurs
SCALE              = 2      # interpolation upscale
INTERP_SIGMA       = 22     # normalized-convolution sigma (at 2x scale)
JET_SMOOTH_SIGMA   = 5      # final light blur before colouring
ALPHA_SIGMA        = 2      # soft anti-aliased edge

def ellipse(n):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))

def process(path_in, path_out):
    img = cv2.imread(path_in)
    B, G, R = [img[..., i].astype(np.float32) for i in range(3)]

    # 1. RGB -> grayscale, ink darkness
    gray = 0.299 * R + 0.587 * G + 0.114 * B
    dark = 255 - gray

    # 2. normalize 0..1
    dark = (dark - dark.min()) / (dark.max() - dark.min())

    # 3. background correction (broad paper estimate, not a high-pass)
    bg = cv2.medianBlur((dark * 255).astype(np.uint8), MEDIAN_BG_KERNEL).astype(np.float32) / 255
    paper = np.percentile(dark, 20)
    corr = np.clip(dark - min(bg.min(), paper), 0, None)
    corr /= corr.max()

    # 4. remove high-frequency noise
    smooth = cv2.GaussianBlur(corr, (5, 5), DENOISE_SIGMA)

    # 5. foot segmentation
    seg = cv2.GaussianBlur(smooth, (0, 0), SEG_SIGMA)
    seg8 = (seg / seg.max() * 255).astype(np.uint8)
    t, _ = cv2.threshold(seg8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = (seg8 > t * OTSU_FACTOR).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, ellipse(OPEN_K))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, ellipse(CLOSE_K))
    mask = ndi.binary_fill_holes(mask).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
    idx = np.argsort(-st[1:, cv2.CC_STAT_AREA])[:2] + 1
    keep = [i for i in idx if st[i, cv2.CC_STAT_AREA] > 0.2 * st[idx[0], cv2.CC_STAT_AREA]]
    mask = np.isin(lab, keep).astype(np.uint8)

    # 5b. smooth outline, trim spurs
    mk = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), MASK_SMOOTH_SIGMA) > 0.5
    mk = cv2.morphologyEx(mk.astype(np.uint8), cv2.MORPH_OPEN, ellipse(MASK_TRIM_OPEN))

    # 6. upscale mask (nearest + re-threshold) and image (bicubic)
    m_up = cv2.resize(mk, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_NEAREST).astype(np.float32)
    m_up = (cv2.GaussianBlur(m_up, (0, 0), 4) > 0.5).astype(np.float32)
    sm_up = cv2.resize(smooth, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)

    # 7. masked Gaussian interpolation (normalized convolution)
    def nconv(x, s):
        return cv2.GaussianBlur(x * m_up, (0, 0), s) / (cv2.GaussianBlur(m_up, (0, 0), s) + 1e-6) * m_up

    interp = nconv(sm_up, INTERP_SIGMA)

    # 8. normalize to 0..100 using masked 1st-99th percentiles
    v = interp[m_up > 0]
    lo, hi = np.percentile(v, 1), np.percentile(v, 99)
    I = np.clip((interp - lo) / (hi - lo), 0, 1) * 100 * m_up

    # 9. (5 intensity classes: <20,<40,<60,<80,>=80; class 0 = background)
    #    not used for the continuous JET output

    # 10. JET colouring + transparent background
    Is = nconv(I, JET_SMOOTH_SIGMA)
    jet = cv2.applyColorMap((Is / 100 * 255).clip(0, 255).astype(np.uint8), cv2.COLORMAP_JET)
    alpha = (cv2.GaussianBlur(m_up, (0, 0), ALPHA_SIGMA) * 255).astype(np.uint8)
    rgba = np.dstack([jet, alpha])

    # 11. crop to foot and save
    ys, xs = np.nonzero(alpha > 10)
    y0, y1 = max(ys.min() - 10, 0), ys.max() + 10
    x0, x1 = max(xs.min() - 10, 0), xs.max() + 10
    cv2.imwrite(path_out, rgba[y0:y1, x0:x1])
    return I, m_up

if __name__ == "__main__":
    process(sys.argv[1], sys.argv[2])
