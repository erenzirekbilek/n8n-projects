"""
AI Story Factory — Edge TTS Service (Ücretsiz)
Microsoft Edge'in ücretsiz Text-to-Speech API'sini kullanır.

Kurulum:
  pip install edge-tts flask aiofiles

Çalıştırma:
  python edge_tts_service.py
  # http://localhost:5002/synthesize
"""

import asyncio
import os
import base64
import uuid
import logging
from flask import Flask, request, jsonify
import edge_tts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "output/voices")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VOICE_MAP = {
    "tr-TR-UmutNeural": "tr-TR-UmutNeural",
    "tr-TR-EmelNeural": "tr-TR-EmelNeural",
    "tr-TR-AhmetNeural": "tr-TR-AhmetNeural",
    "tr-TR-SertanNeural": "tr-TR-SertanNeural",
    "en-US-JennyNeural": "en-US-JennyNeural",
    "en-US-GuyNeural": "en-US-GuyNeural",
    "en-GB-SoniaNeural": "en-GB-SoniaNeural",
}


async def synthesize_speech(text: str, voice: str, output_file: str) -> str:
    """Edge TTS ile ses üretir ve dosya olarak kaydeder."""
    if voice not in VOICE_MAP:
        voice = "tr-TR-UmutNeural"

    communicate = edge_tts.Communicate(text, voice)
    output_path = os.path.join(OUTPUT_DIR, output_file)

    await communicate.save(output_path)
    logger.info(f"Ses dosyası kaydedildi: {output_path}")

    return output_path


def run_async_synthesize(text: str, voice: str, output_file: str) -> str:
    """Async fonksiyonu senkron olarak çalıştır."""
    return asyncio.run(synthesize_speech(text, voice, output_file))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "edge-tts"})


@app.route("/synthesize", methods=["POST"])
def synthesize():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "Empty request body"}), 400

        text = data.get("text", "").strip()
        voice = data.get("voice", "tr-TR-UmutNeural")
        output_file = data.get("output_file", f"voice_{uuid.uuid4().hex[:8]}.mp3")

        if not text:
            return jsonify({"success": False, "error": "Text is required"}), 400

        logger.info(f"TTS isteği: voice={voice}, text='{text[:50]}...'")

        output_path = run_async_synthesize(text, voice, output_file)

        with open(output_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode("utf-8")

        return jsonify({
            "success": True,
            "output_path": output_path,
            "audio_base64": audio_base64,
            "voice": voice
        })

    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/voices", methods=["GET"])
def list_voices():
    return jsonify({
        "voices": list(VOICE_MAP.keys())
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    logger.info(f"Edge TTS Service başlıyor: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)