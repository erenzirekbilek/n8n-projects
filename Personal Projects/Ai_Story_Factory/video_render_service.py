"""
AI Story Factory — Video Render Service (Ücretsiz)
MoviePy ile görsellerden video oluşturur.

Kurulum:
  pip install moviepy flask pillow requests

Çalıştırma:
  python video_render_service.py
  # http://localhost:5003/render-video
"""

import os
import base64
import uuid
import logging
import json
import requests
from flask import Flask, request, jsonify
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from PIL import Image
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "output/videos")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def download_image(url: str) -> bytes:
    """URL'den görsel indir."""
    if url.startswith("data:"):
        base64_data = url.split(",")[1]
        return base64.b64decode(base64_data)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def resize_to_vertical(image_bytes: bytes, target_size=(1080, 1920)) -> bytes:
    """Görseli 9:16 aspect ratio'ya dönüştür."""
    img = Image.open(io.BytesIO(image_bytes))
    img = img.resize(target_size, Image.LANCZOS)
    output = io.BytesIO()
    img.save(output, format="PNG")
    return output.getvalue()


def create_scene_clip(image_bytes: bytes, duration: float, audio_bytes: bytes = None) -> object:
    """Tek sahne için video clip oluştur."""
    image_data = resize_to_vertical(image_bytes)

    clip = ImageClip(io.BytesIO(image_data)).set_duration(duration)

    if audio_bytes:
        audio_clip = AudioFileClip(io.BytesIO(audio_bytes))
        if audio_clip.duration > duration:
            audio_clip = audio_clip.subclip(0, duration)
        elif audio_clip.duration < duration:
            audio_clip = audio_clip.loop(duration=audio_clip.duration)
        clip = clip.set_audio(audio_clip)

    return clip


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "video-render"})


@app.route("/render-video", methods=["POST"])
def render_video():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "Empty request body"}), 400

        story_title = data.get("story_title", "Untitled")
        episodes = data.get("episodes", [])
        scene_duration = data.get("scene_duration", 5)
        fps = data.get("fps", 30)
        output_format = data.get("output_format", "mp4")

        if not episodes:
            return jsonify({"success": False, "error": "No episodes provided"}), 400

        logger.info(f"Video oluşturuluyor: {story_title}, {len(episodes)} episode")

        clips = []

        for ep_idx, episode in enumerate(episodes):
            scenes = episode.get("scenes", [])
            logger.info(f"Episode {ep_idx + 1}: {len(scenes)} sahne")

            for scene in scenes:
                try:
                    image_url = scene.get("image_url")
                    voice_url = scene.get("voice_url")

                    if not image_url:
                        continue

                    image_bytes = download_image(image_url)

                    audio_bytes = None
                    if voice_url and voice_url.startswith("data:"):
                        audio_bytes = base64.b64decode(voice_url.split(",")[1])

                    clip = create_scene_clip(image_bytes, scene_duration, audio_bytes)
                    clips.append(clip)

                except Exception as e:
                    logger.warning(f"Sahne atlandı: {str(e)}")
                    continue

        if not clips:
            raise ValueError("Hiç geçerli sahne bulunamadı")

        final_clip = concatenate_videoclips(clips, method="compose")

        output_filename = f"{story_title.replace(' ', '_')}_{uuid.uuid4().hex[:8]}.{output_format}"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        final_clip.write_videofile(
            output_path,
            fps=fps,
            codec="libx264",
            audio_codec="aac",
            verbose=False,
            logger=None
        )

        with open(output_path, "rb") as f:
            video_base64 = base64.b64encode(f.read()).decode("utf-8")

        logger.info(f"Video oluşturuldu: {output_path}")

        return jsonify({
            "success": True,
            "output_path": output_path,
            "video_base64": video_base64,
            "duration": final_clip.duration,
            "status": "completed",
            "scenes_rendered": len(clips)
        })

    except Exception as e:
        logger.error(f"Video render error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Video Render Service",
        "endpoints": {
            "health": "/health",
            "render": "/render-video"
        }
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5003))
    logger.info(f"Video Render Service başlıyor: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)