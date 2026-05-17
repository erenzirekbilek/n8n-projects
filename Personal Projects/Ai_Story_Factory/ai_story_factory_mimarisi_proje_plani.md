# AI STORY FACTORY MİMARİSİ

## Proje Özeti

AI Story Factory; yapay zeka destekli hikaye üretimi, görsel üretimi, konuşma balonları, seslendirme ve otomatik kısa video üretimini uçtan uca yöneten bir içerik otomasyon sistemidir.

Sistem temel olarak n8n orchestration altyapısı ile çalışır ve farklı AI servislerini bir pipeline içerisinde birleştirir.

---

# Hedefler

## Ana Hedef

Tam otomatik şekilde:

- Hikaye üretmek
- Bölümlere ayırmak
- Sahnelere bölmek
- Görseller üretmek
- Karakter konuşmaları üretmek
- Fotoğraflara konuşma balonu eklemek
- Seslendirme yapmak
- Video oluşturmak
- Shorts/Reels/TikTok formatında çıktı vermek

---

# Sistem Mimarisi

```text
Idea Input
   ↓
Story Generator Agent
   ↓
Episode Splitter
   ↓
Scene Splitter
   ↓
Prompt Generator
   ↓
Image Generation
   ↓
Dialogue Generator
   ↓
Speech Bubble Renderer
   ↓
Voice Generator
   ↓
Video Composer
   ↓
Subtitle Generator
   ↓
Social Media Export
```

---

# Teknoloji Stack

## Orchestration

- n8n

## Backend Services

- Node.js
- Python

## Database

- PostgreSQL

## Queue System

- Redis
- BullMQ

## Storage

- Cloudflare R2
- Amazon S3

## Video Rendering

- Remotion

## AI Models

### LLM

- Gemini Flash
- Groq
- OpenRouter

### Image Generation

- Leonardo AI
- OpenAI Images
- Replicate
- Together AI

### Voice Generation

- ElevenLabs
- OpenAI TTS

---

# Modüler Workflow Yapısı

## 1. Story Agent

### Görev

Konu ve hikaye üretmek.

### Input

```json
{
  "theme": "Cyberpunk",
  "genre": "Drama",
  "target_platform": "TikTok"
}
```

### Output

```json
{
  "title": "The Last Robot",
  "summary": "...",
  "episodes": []
}
```

---

## 2. Episode Splitter

### Görev

Hikayeyi bölümlere ayırmak.

### Output

```json
[
  {
    "episode": 1,
    "summary": "..."
  }
]
```

---

## 3. Scene Splitter

### Görev

Her bölümü sahnelere ayırmak.

### Output

```json
[
  {
    "scene": 1,
    "description": "Robot walking in rainy Tokyo"
  }
]
```

---

## 4. Prompt Generator

### Görev

Cinematic image prompt üretmek.

### Örnek Prompt

```text
cinematic cyberpunk Tokyo street at night,
rain reflections,
neon lights,
anime movie style,
35mm lens,
ultra detailed
```

### Prompt İçeriği

- Camera angle
- Lighting
- Emotion
- Character appearance
- Art style
- Environment
- Color palette

---

## 5. Character Consistency Engine

### Amaç

Karakterlerin tüm sahnelerde aynı görünmesini sağlamak.

### Character Profile

```json
{
  "name": "Aiko",
  "hair": "short silver hair",
  "eyes": "blue eyes",
  "clothes": "black futuristic hoodie"
}
```

### Özellikler

- Seed system
- Character memory
- Style consistency
- Outfit persistence

---

## 6. Image Generation Service

### Görev

Sahne promptlarından görsel üretmek.

### Süreç

```text
Prompt
↓
AI Image API
↓
Image URL
↓
Storage Upload
```

### Çıktılar

- PNG
- JPG
- WEBP

---

## 7. Dialogue Generator

### Görev

Karakter konuşmalarını üretmek.

### Output

```json
{
  "speaker": "Aiko",
  "text": "We don't have much time."
}
```

---

## 8. Speech Bubble Renderer

### Görev

Görseller üzerine konuşma balonları yerleştirmek.

### Teknolojiler

- Python PIL
- OpenCV
- Cloudinary

### Özellikler

- Auto text wrap
- Manga style bubble
- Dynamic positioning
- Subtitle rendering

---

## 9. Voice Generator

### Görev

Karakter bazlı seslendirme yapmak.

### Özellikler

- Voice cloning
- Emotion support
- Character voice profiles

### Output

- MP3
- WAV

---

## 10. Video Composer

### Görev

Sahne görsellerini videoya dönüştürmek.

### Teknoloji

- Remotion

### Özellikler

- Zoom effects
- Camera pan
- Subtitle support
- Scene transitions
- Audio sync
- Shorts export

---

# Database Tasarımı

## stories

```sql
id
name
genre
status
created_at
```

## episodes

```sql
id
story_id
episode_number
summary
```

## scenes

```sql
id
episode_id
scene_number
description
prompt
image_url
voice_url
```

## characters

```sql
id
story_id
name
appearance
voice_profile
```

---

# Queue Sistemi

## Amaç

- API limitlerini yönetmek
- Retry mekanizması
- Paralel render işlemleri
- Timeout kontrolü

## Queue Yapısı

```text
story_queue
image_queue
voice_queue
render_queue
upload_queue
```

---

# n8n Workflow Yapısı

## Master Workflow

```text
Webhook Trigger
↓
Generate Story
↓
Split Episodes
↓
Split Scenes
↓
Loop Scenes
    ↓
    Generate Prompt
    ↓
    Generate Image
    ↓
    Generate Dialogue
    ↓
    Render Bubble
    ↓
    Generate Voice
↓
Merge Assets
↓
Render Video
↓
Upload Social Media
```

---

# Social Media Export

## Desteklenecek Platformlar

- TikTok
- YouTube Shorts
- Instagram Reels

## Export Özellikleri

- Auto caption
- Hashtag generation
- Thumbnail generation
- Scheduled posting

---

# MVP Planı

## V1

### Özellikler

- Story generation
- Scene splitting
- Prompt generation
- Image generation
- Basic video export

### Hariç Tutulacaklar

- Voice cloning
- Advanced effects
- Auto upload
- Multi-language

---

# V2 Roadmap

## Planlanan Özellikler

- Character memory system
- AI subtitle engine
- Automatic dubbing
- Viral title generator
- Thumbnail AI
- Multi-agent architecture
- Analytics dashboard

---

# Production Mimarisi

```text
n8n → orchestration
NodeJS → rendering services
Python → image processing
Redis → queues
PostgreSQL → state management
R2/S3 → storage
Remotion → video rendering
LLMs → intelligence layer
```

---

# Güvenlik ve Performans

## Gereksinimler

- Retry system
- Rate limit handling
- API key management
- Logging
- Error tracking
- Asset cleanup jobs
- Queue monitoring

---

# Gelecek Genişletmeler

## Olası Özellikler

- Interactive story generation
- AI generated music
- Real-time character animation
- Live avatar narration
- AI comic generation
- Multi-language auto translation
- AI thumbnail optimizer

---

# Sonuç

AI Story Factory sistemi; içerik üretimini büyük ölçüde otomatikleştiren, modüler ve ölçeklenebilir bir yapay zeka medya üretim platformudur.

n8n orchestration altyapısı sayesinde farklı AI servisleri tek bir üretim hattında birleşir.

Bu mimari gelecekte:

- otomatik TikTok kanalları
- AI anime hikayeleri
- otomatik shorts üretimi
- comic video generation
- AI media pipelines

oluşturmak için güçlü bir temel sağlar.

