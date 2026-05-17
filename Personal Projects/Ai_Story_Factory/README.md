# AI Story Factory

AI destekli hikaye üretimi, görsel üretimi ve video oluşturma sistemi. **%100 Ücretsiz**

## Ücretsiz Teknoloji Stack

| Bileşen | Servis | Ücret |
|---------|--------|-------|
| Hikaye Üretimi | Groq (Llama-3.1) | Ücretsiz |
| Görsel Üretimi | HuggingFace (Stable Diffusion) | Ücretsiz |
| Seslendirme | Edge TTS (Microsoft) | Ücretsiz |
| Video Oluşturma | MoviePy | Ücretsiz |
| Orchestration | n8n | Ücretsiz (self-hosted) |

## Proje Yapısı

```
Ai_Story_Factory/
├── ai_story_factory_free_workflow.json  # n8n workflow
├── bubble_service.py                     # Konuşma balonu (Flask :5001)
├── edge_tts_service.py                   # Seslendirme (Flask :5002)
├── video_render_service.py               # Video oluşturma (Flask :5003)
└── README.md
```

## Kurulum

### 1. Python Ortamı

```bash
cd Ai_Story_Factory
python -m venv venv
venv\Scripts\activate
```

### 2. Bağımlılıkları Yükle

```bash
pip install flask pillow opencv-python numpy requests
pip install edge-tts aiofiles
pip install moviepy
```

### 3. Servisleri Çalıştır

3 ayrı terminalde:

```bash
# Terminal 1: Bubble Renderer
python bubble_service.py

# Terminal 2: Edge TTS
python edge_tts_service.py

# Terminal 3: Video Render
python video_render_service.py
```

### 4. n8n Workflow Import

1. n8n'ı aç
2. Import Workflow → `ai_story_factory_free_workflow.json`
3. Credential'ları ayarla:

| Credential | Değer |
|------------|-------|
| Groq API Key | https://console.groq.com/ |
| HuggingFace API Key | https://huggingface.co/settings/tokens |

## Kullanım

### Webhook

```
POST http://localhost:5678/webhook/ai-story-factory-free
```

### Örnek İstek

```json
{
  "theme": "Cyberpunk",
  "genre": "Drama",
  "target_platform": "TikTok",
  "story_length": "short",
  "num_episodes": 2,
  "num_scenes_per_episode": 3
}
```

### Yanıt

```json
{
  "success": true,
  "story_title": "The Last Neon",
  "total_scenes": 6,
  "total_episodes": 2,
  "video_url": "output/videos/...",
  "video_duration_seconds": 30,
  "status": "completed"
}
```

## Pipeline Akışı

```
Webhook
   ↓
Story Generator (Groq - Llama 3.1)
   ↓
Extract Scenes
   ↓
Loop: [Her sahne için]
   ├→ Image Prompt Generator
   ├→ Generate Image (HuggingFace)
   ├→ Render Speech Bubble (Python :5001)
   ├→ Generate Voice (Edge TTS :5002)
   ↓
Merge Assets
   ↓
Render Video (MoviePy :5003)
   ↓
Response
```

## Servis Endpoints

| Servis | Port | Endpoint |
|--------|------|----------|
| Bubble Renderer | 5001 | `/render-bubble` |
| Edge TTS | 5002 | `/synthesize` |
| Video Render | 5003 | `/render-video` |

## Edge TTS Sesleri

- `tr-TR-UmutNeural` (erkek)
- `tr-TR-EmelNeural` (kadın)
- `tr-TR-AhmetNeural` (erkek)
- `en-US-JennyNeural` (kadın)
- `en-US-GuyNeural` (erkek)

## Sorunlar

**Görsel üretimi başarısız olursa:**
- HuggingFace rate limit'i kontrol et
- Model'i `stabilityai/stable-diffusion-3.5-medium` yerine `black-forest-labs/FLUX.1-dev` dene

**Video render çok yavaş:**
- `scene_duration` değerini düşür
- `fps` değerini 24 veya 30 olarak tut

**n8n credential hatası:**
- n8n'da Generic HTTP Auth credential oluştur
- Header: `Authorization: Bearer <API_KEY>`