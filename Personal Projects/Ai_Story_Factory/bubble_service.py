"""
AI Story Factory — Speech Bubble Renderer
Flask servisi: base64 görsel + diyalog metni alır, manga balonu ekler, çıktı verir.

Kurulum:
  pip install flask pillow opencv-python numpy requests

Çalıştırma:
  python bubble_service.py
  # http://localhost:5001/render-bubble
"""

from flask import Flask, request, jsonify
import base64
import io
import math
import textwrap
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import logging
import os
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────

FONT_PATH = os.environ.get("FONT_PATH", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
FONT_FALLBACK = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
BUBBLE_FILL   = (255, 255, 255, 230)   # white, slightly transparent
BUBBLE_STROKE = (20, 20, 20, 255)
TEXT_COLOR    = (20, 20, 20, 255)
SPEAKER_COLOR = (60, 60, 180, 255)
MAX_WIDTH_RATIO = 0.80   # bubble max width = 80% of image width
FONT_SIZE_RATIO = 0.033  # font size = 3.3% of image width

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in [FONT_PATH, FONT_FALLBACK]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    logger.warning("No TTF font found, using default bitmap font")
    return ImageFont.load_default()


def draw_rounded_rect(draw: ImageDraw.ImageDraw, bbox: tuple, radius: int,
                      fill: tuple, outline: tuple, outline_width: int = 3):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                           outline=outline, width=outline_width)


def draw_tail(draw: ImageDraw.ImageDraw, bubble_bbox: tuple, target_x: int,
              target_y: int, fill: tuple, outline: tuple):
    """Draw a comic-style speech bubble tail."""
    x0, y0, x1, y1 = bubble_bbox
    cx = (x0 + x1) // 2

    # Tail base points on the bubble bottom edge
    base_left  = (cx - 20, y1 - 4)
    base_right = (cx + 20, y1 - 4)
    tip        = (target_x, target_y)

    # Fill first, then outline
    draw.polygon([base_left, base_right, tip], fill=fill)
    draw.line([base_left, tip, base_right], fill=outline, width=3)


def render_bubble(image: Image.Image, bubble_text: str,
                  speaker_name: str = "") -> Image.Image:
    """
    Overlay a manga-style speech bubble on the image.
    Bubble is placed in the upper-center area (top 40% of image).
    Tail points toward the lower-center (speaker area).
    """
    img = image.convert("RGBA")
    w, h = img.size

    font_size    = max(18, int(w * FONT_SIZE_RATIO))
    speaker_size = max(14, int(font_size * 0.75))

    try:
        font         = load_font(font_size)
        speaker_font = load_font(speaker_size)
    except Exception:
        font = speaker_font = ImageFont.load_default()

    # ── Text wrapping ──
    max_text_px = int(w * MAX_WIDTH_RATIO) - 40  # inner padding
    # Approximate chars per line (avg char width ~0.6 × font_size)
    avg_char_w  = font_size * 0.60
    chars_per_line = max(10, int(max_text_px / avg_char_w))
    wrapped_lines  = textwrap.wrap(bubble_text, width=chars_per_line)
    if not wrapped_lines:
        wrapped_lines = ["..."]

    # ── Measure text block ──
    overlay  = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw     = ImageDraw.Draw(overlay)

    line_heights = []
    line_widths  = []
    for line in wrapped_lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_widths.append(bbox[2] - bbox[0])
        line_heights.append(bbox[3] - bbox[1])

    line_spacing = int(font_size * 0.35)
    text_w = max(line_widths) if line_widths else 10
    text_h = sum(line_heights) + line_spacing * (len(wrapped_lines) - 1)

    # Speaker label dimensions
    spk_w, spk_h = 0, 0
    if speaker_name:
        spk_bbox = draw.textbbox((0, 0), speaker_name, font=speaker_font)
        spk_w    = spk_bbox[2] - spk_bbox[0]
        spk_h    = spk_bbox[3] - spk_bbox[1]

    # ── Bubble box ──
    pad_x    = 22
    pad_y    = 16
    spk_gap  = 8 if speaker_name else 0
    total_h  = pad_y + (spk_h + spk_gap if speaker_name else 0) + text_h + pad_y
    total_w  = max(text_w, spk_w) + pad_x * 2

    # Center horizontally, place at top 15% vertically
    bx0 = max(20, (w - total_w) // 2)
    by0 = max(20, int(h * 0.05))
    bx1 = bx0 + total_w
    by1 = by0 + total_h

    radius = min(24, total_h // 4)

    # ── Draw bubble shadow ──
    shadow_offset = 4
    draw.rounded_rectangle(
        [bx0 + shadow_offset, by0 + shadow_offset,
         bx1 + shadow_offset, by1 + shadow_offset],
        radius=radius,
        fill=(0, 0, 0, 80)
    )

    # ── Draw bubble ──
    draw_rounded_rect(draw, (bx0, by0, bx1, by1), radius,
                      BUBBLE_FILL, BUBBLE_STROKE, outline_width=3)

    # ── Draw tail ──
    tail_target_x = w // 2
    tail_target_y = int(h * 0.72)
    draw_tail(draw, (bx0, by0, bx1, by1),
              tail_target_x, tail_target_y,
              BUBBLE_FILL, BUBBLE_STROKE)

    # ── Draw speaker name ──
    text_cursor_y = by0 + pad_y
    if speaker_name:
        spk_x = bx0 + (total_w - spk_w) // 2
        draw.text((spk_x, text_cursor_y), speaker_name,
                  font=speaker_font, fill=SPEAKER_COLOR)
        text_cursor_y += spk_h + spk_gap

    # ── Draw wrapped text ──
    for i, line in enumerate(wrapped_lines):
        lw = line_widths[i]
        lx = bx0 + (total_w - lw) // 2
        draw.text((lx, text_cursor_y), line, font=font, fill=TEXT_COLOR)
        text_cursor_y += line_heights[i] + line_spacing

    # ── Composite ──
    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "bubble-renderer"})


@app.route("/render-bubble", methods=["POST"])
def render_bubble_route():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "Empty request body"}), 400

        image_b64   = data.get("image_base64")
        bubble_text = data.get("bubble_text", "").strip()
        speaker     = data.get("speaker_name", "").strip()
        asset_key   = data.get("asset_key", "unknown")

        if not image_b64:
            return jsonify({"success": False, "error": "image_base64 is required"}), 400

        if not bubble_text:
            # No dialogue — return original image unchanged
            return jsonify({
                "success": True,
                "asset_key": asset_key,
                "output_base64": image_b64,
                "output_url": None,
                "skipped": True,
                "reason": "No dialogue text"
            })

        # ── Decode image ──
        # Strip data URI prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_b64)
        image       = Image.open(io.BytesIO(image_bytes))

        logger.info(f"[{asset_key}] Rendering bubble: '{bubble_text[:40]}...' | size={image.size}")

        # ── Render ──
        result_image = render_bubble(image, bubble_text, speaker)

        # ── Encode output ──
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format="JPEG", quality=92)
        output_b64 = base64.b64encode(output_buffer.getvalue()).decode("utf-8")

        logger.info(f"[{asset_key}] Bubble rendered successfully")

        return jsonify({
            "success": True,
            "asset_key": asset_key,
            "output_base64": output_b64,
            "output_url": None,   # set this if you upload to R2/S3
            "skipped": False
        })

    except Exception as e:
        logger.error(f"Bubble render error: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info(f"Bubble Renderer starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
