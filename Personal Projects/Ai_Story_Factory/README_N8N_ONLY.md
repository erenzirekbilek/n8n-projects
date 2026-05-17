# AI Story Factory - %100 n8n Çözümü

> Tüm işlemler n8n içinde! Harici servis yok.

## Pipeline Akışı

```
┌─────────────────────────────────────────────────────────────────┐
│                    NODE AKIŞI ŞEMASI                           │
└─────────────────────────────────────────────────────────────────┘

Webhook → Parse Input
                ↓
         [Groq API] → Hikaye Üret
                ↓
         [Code] → JSON Parse
                ↓
         [Code] → Sahneleri Çıkar
                ↓
         [Split in Batches] → Loop Başla
                ↓
    ┌────────────────────────────────────────────────────────┐
    │  HER SAHNE İÇİN:                                       │
    │                                                         │
    │  5. Code: Image Prompt Oluştur                        │
    │          ↓                                             │
    │  6. HTTP: HuggingFace (Stable Diffusion/FLUX)        │
    │          ↓                                             │
    │  7. Code: Base64 Al                                   │
    │          ↓                                             │
    │  8. Code: Bubble Hazırla (geçici - görsel üstünde)    │
    │          ↓                                             │
    │  9. HTTP: Edge TTS (Direct API)                      │
    │          ↓                                             │
    │  10. Code: Sahne Tamamla                              │
    └────────────────────────────────────────────────────────┘
                ↓
         [Merge] → Tüm Assetleri Birleştir
                ↓
         [Code] → Video Hazırlık
                ↓
         [Respond] → Sonuç Dön
```

## Node Detayları

| # | Node Adı | İşlev | Teknoloji |
|---|----------|-------|-----------|
| 1 | Webhook Trigger | İstek al | n8n |
| 2 | Parse Input | Input parametreler | Code (JS) |
| 3 | Hikaye Üret | Story generation | Groq API (HTTP) |
| 4 | Story Parse | JSON parse | Code (JS) |
| 5 | Sahneleri Çıkar | Flatten scenes | Code (JS) |
| 6 | Loop Over Scenes | Iteration | Split in Batches |
| 7 | Image Prompt | Prompt oluştur | Code (JS) |
| 8 | Görsel Üret | AI image | HuggingFace (HTTP) |
| 9 | Base64 Al | Image data | Code (JS) |
| 10 | Bubble Hazırla | Metadata hazırla | Code (JS) |
| 11 | Ses Üret | TTS | Edge TTS (HTTP) |
| 12 | Sahne Tamam | Asset birleştir | Code (JS) |
| 13 | Birleştir | Tüm sahneler | Code (JS) |
| 14 | Video Hazırla | FFmpeg hazırlık | Code (JS) |

## n8n Sınırlamaları

### ❌ Speech Bubble Rendering
n8n'da görsel üzerine text eklemek için:
- **Çözüm 1**: Code node'da base64 manipulation (sınırlı)
- **Çözüm 2**: Harici Python servis (bubble_service.py)
- **Önerilen**: Bubble service'i kullan

### ❌ Video Rendering
n8n'da video oluşturma için:
- **Çözüm 1**: Execute Command node → FFmpeg
- **Çözüm 2**: Harici servis (video_render_service.py)
- **Önerilen**: Video service'i kullan

## Kurulum (Tam n8n)

### 1. Credentials Oluştur (n8n'da)

| Credential | Değer |
|------------|-------|
| **Groq API Key** | https://console.groq.com/ |
| **HuggingFace API** | https://huggingface.co/settings/tokens |

### 2. Workflow Import
- n8n → Import → `ai_story_factory_n8n_only.json`
- Credentials'ları bağla

### 3. Test Et

```json
POST /webhook/ai-story-factory
{
  "theme": "Cyberpunk",
  "genre": "Drama",
  "target_platform": "TikTok",
  "story_length": "short",
  "num_episodes": 2,
  "num_scenes_per_episode": 3
}
```

## Alternatif: Hybrid Çözüm

Eğer bubble + video için harici servis kullanmak istersen:

```
┌─────────────────────────────────────────────┐
│  n8n Workflow                                │
│                                             │
│  Story → Image → Voice → Response           │
│         ↓         ↓                         │
│    bubble.py   video.py (opsiyonel)        │
└─────────────────────────────────────────────┘
```

Bu durumda `ai_story_factory_free_workflow.json` kullan.

## Edge TTS Alternatif (Direct API yoksa)

Eğer Edge TTS direct API çalışmazsa:

```javascript
// Code node'da Microsoft Edge TTS WebSocket
// veya alternatif: OpenAI TTS (ücretli)
```

## Özet

| Modül | n8n'da? | Harici? |
|-------|---------|---------|
| Story Generation | ✅ HTTP | - |
| Image Generation | ✅ HTTP | - |
| Voice Generation | ✅ HTTP | Opsiyonel |
| Bubble Rendering | ⚠️ Sınırlı | ✅ Python |
| Video Rendering | ⚠️ FFmpeg | ✅ Python |

**Karar**: Bubble ve Video için Python servisleri önerilir, aksi halde sadece image + voice + story üretimi yapılabilir.