# Ticket Intelligence Dashboard — Proje Dokümantasyonu

> **Stack:** Node.js + Express · PostgreSQL (Docker) · Redis · Socket.io · React · Recharts  
> **Veri kaynağı:** Google Sheets (n8n → Sheets → Webhook → Backend)  
> **Amaç:** Karmaşık ticket verilerini okunabilir, aranabilir, kategorize edilebilir hale getirmek

---

## İçindekiler

1. [Veri Yapısı & Sorunlar](#1-veri-yapısı--sorunlar)
2. [Docker & PostgreSQL Kurulumu](#2-docker--postgresql-kurulumu)
3. [Veritabanı Şeması](#3-veritabanı-şeması)
4. [Backend — Node.js / Express](#4-backend--nodejs--express)
5. [Google Sheets Senkronizasyonu](#5-google-sheets-senkronizasyonu)
6. [API Endpoint'leri](#6-api-endpointleri)
7. [Arama & Filtreleme Sistemi](#7-arama--filtreleme-sistemi)
8. [Real-time (Socket.io)](#8-real-time-socketio)
9. [Frontend — React Dashboard](#9-frontend--react-dashboard)
10. [Auth Sistemi](#10-auth-sistemi)
11. [Proje Klasör Yapısı](#11-proje-klasör-yapısı)
12. [Geliştirme Sırası](#12-geliştirme-sırası)

---

## 1. Veri Yapısı & Sorunlar

### Ham Sütunlar (Google Sheets)

| Sütun | Tip | Notlar |
|---|---|---|
| `ticket` | integer | Ticket ID (830269, 817266...) |
| `comment` | text | **Çok satırlı**, e-posta imzası içerebilir, çok uzun olabilir |
| `intent` | text | `approve`, `revise`, `scenario_other`, `general_inquiry`, `parse_error` |
| `target` | text | `draft`, `invoice`, `cancel_ectn_without_cost`, `null` |
| `sentiment` | text | `neutral`, `positive`, `negative` |
| `confidence` | float | 0.0 – 1.0 arası |
| `human_feedback` | text | Boş kalabilir, ekip tarafından doldurulur |
| `reviewed` | text | Kimin incelediği (`enver`, vb.) |

### Bilinen Kirli Veri Sorunları

```
1. parse_error intent'i → JSON parse hatası olan satırlar, özel işlem gerekir
2. comment sütunu → e-posta imzası, adres, telefon içerebilir (noise)
3. target = "null" (string) → gerçek NULL değil, temizlenmeli
4. confidence = 0 → parse_error satırlarında güvensiz veri
5. ticket ID birden fazla satırda olabilir → aynı ticket'a birden fazla yorum
6. human_feedback boş → henüz incelenmemiş demek
```

### Temizleme Kuralları (Backend'de uygulanacak)

```javascript
// Örnek temizleme fonksiyonu
function cleanTicketRow(row) {
  return {
    ticket_id:      parseInt(row.ticket) || null,
    comment:        (row.comment || '').trim(),
    intent:         row.intent === 'parse_error' ? null : (row.intent || null),
    is_parse_error: row.intent === 'parse_error',
    target:         row.target === 'null' ? null : (row.target || null),
    sentiment:      row.sentiment || null,
    confidence:     parseFloat(row.confidence) || 0,
    human_feedback: row.human_feedback?.trim() || null,
    reviewed_by:    row.reviewed?.trim() || null,
  };
}
```

---

## 2. Docker & PostgreSQL Kurulumu

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ticket_db
    restart: always
    environment:
      POSTGRES_USER: ticketadmin
      POSTGRES_PASSWORD: supersecret123
      POSTGRES_DB: ticketdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ticketadmin -d ticketdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ticket_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    container_name: ticket_backend
    restart: always
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://ticketadmin:supersecret123@postgres:5432/ticketdb
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

### Komutlar

```bash
# Başlat
docker-compose up -d

# Logları izle
docker-compose logs -f backend

# Sadece DB'yi başlat (geliştirme sırasında)
docker-compose up -d postgres redis

# DB'ye doğrudan bağlan
docker exec -it ticket_db psql -U ticketadmin -d ticketdb

# Tüm container'ları durdur + volume'ları sil (sıfırla)
docker-compose down -v
```

---

## 3. Veritabanı Şeması

### `db/init.sql`

```sql
-- Extension: tam metin arama için
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================
-- ENUM tipleri
-- =====================
CREATE TYPE intent_type AS ENUM (
  'approve', 'revise', 'scenario_other', 'general_inquiry', 'parse_error', 'unknown'
);

CREATE TYPE sentiment_type AS ENUM (
  'positive', 'neutral', 'negative'
);

-- =====================
-- ANA TABLO: tickets
-- =====================
CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  ticket_id         INTEGER NOT NULL,          -- Sheets'teki orijinal ID
  comment           TEXT,                       -- Ham yorum (e-posta dahil)
  comment_clean     TEXT,                       -- İmzadan arındırılmış kısa versiyon
  intent            intent_type DEFAULT 'unknown',
  target            VARCHAR(100),
  sentiment         sentiment_type DEFAULT 'neutral',
  confidence        DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  human_feedback    TEXT,                       -- Ekip yorumu
  reviewed_by       VARCHAR(100),               -- Kim inceledi
  is_parse_error    BOOLEAN DEFAULT FALSE,      -- parse_error satır mı?
  is_reviewed       BOOLEAN GENERATED ALWAYS AS (human_feedback IS NOT NULL) STORED,
  sheets_row_index  INTEGER,                    -- Sheets'teki satır numarası
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  synced_at         TIMESTAMPTZ DEFAULT NOW()   -- Son sheets sync zamanı
);

-- =====================
-- İNDEKSLER (arama hızı için kritik)
-- =====================

-- Ticket ID'ye göre hızlı erişim
CREATE INDEX idx_tickets_ticket_id ON tickets(ticket_id);

-- Intent ve sentiment filtreleme
CREATE INDEX idx_tickets_intent ON tickets(intent);
CREATE INDEX idx_tickets_sentiment ON tickets(sentiment);
CREATE INDEX idx_tickets_target ON tickets(target);

-- Confidence aralığı sorguları
CREATE INDEX idx_tickets_confidence ON tickets(confidence);

-- İncelenip incelenmediğine göre filtre
CREATE INDEX idx_tickets_is_reviewed ON tickets(is_reviewed);
CREATE INDEX idx_tickets_reviewed_by ON tickets(reviewed_by);

-- Tam metin arama indeksi (comment + target alanları)
CREATE INDEX idx_tickets_comment_fts ON tickets 
  USING gin(to_tsvector('turkish', coalesce(comment, '') || ' ' || coalesce(target, '')));

-- Trigram indeksi (LIKE aramaları için — ticket ID veya kelime içerme)
CREATE INDEX idx_tickets_comment_trgm ON tickets USING gin(comment gin_trgm_ops);
CREATE INDEX idx_tickets_target_trgm ON tickets USING gin(target gin_trgm_ops);

-- Tarih bazlı sıralama
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_updated_at ON tickets(updated_at DESC);

-- =====================
-- FEEDBACK LOG: değişiklik geçmişi
-- =====================
CREATE TABLE feedback_log (
  id              SERIAL PRIMARY KEY,
  ticket_id       INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by      VARCHAR(100) NOT NULL,
  old_feedback    TEXT,
  new_feedback    TEXT,
  old_reviewed_by VARCHAR(100),
  new_reviewed_by VARCHAR(100),
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_log_ticket ON feedback_log(ticket_id);

-- =====================
-- KULLANICILER
-- =====================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  google_sub    VARCHAR(255) UNIQUE,            -- Google OAuth subject ID
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- =====================
-- SYNC DURUMU
-- =====================
CREATE TABLE sync_log (
  id            SERIAL PRIMARY KEY,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  rows_added    INTEGER DEFAULT 0,
  rows_updated  INTEGER DEFAULT 0,
  rows_skipped  INTEGER DEFAULT 0,
  error_message TEXT,
  status        VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error'))
);

-- =====================
-- UPDATED_AT otomatik güncelleme
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- VİEW: dashboard için özet istatistikler
-- =====================
CREATE VIEW ticket_stats AS
SELECT
  COUNT(*)                                          AS total_tickets,
  COUNT(*) FILTER (WHERE is_reviewed)               AS reviewed_count,
  COUNT(*) FILTER (WHERE NOT is_reviewed)           AS pending_count,
  COUNT(*) FILTER (WHERE is_parse_error)            AS parse_error_count,
  ROUND(AVG(confidence)::NUMERIC, 3)               AS avg_confidence,
  COUNT(*) FILTER (WHERE confidence >= 0.8)         AS high_confidence_count,
  COUNT(*) FILTER (WHERE confidence < 0.5)          AS low_confidence_count,
  COUNT(*) FILTER (WHERE intent = 'approve')        AS intent_approve,
  COUNT(*) FILTER (WHERE intent = 'revise')         AS intent_revise,
  COUNT(*) FILTER (WHERE intent = 'scenario_other') AS intent_scenario,
  COUNT(*) FILTER (WHERE intent = 'general_inquiry')AS intent_inquiry,
  COUNT(*) FILTER (WHERE sentiment = 'positive')    AS sentiment_positive,
  COUNT(*) FILTER (WHERE sentiment = 'neutral')     AS sentiment_neutral,
  COUNT(*) FILTER (WHERE sentiment = 'negative')    AS sentiment_negative
FROM tickets;
```

---

## 4. Backend — Node.js / Express

### `backend/package.json` (temel paketler)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "socket.io": "^4.6.1",
    "googleapis": "^128.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-cron": "^3.0.3",
    "express-validator": "^7.0.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### `backend/src/db/pool.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

module.exports = pool;
```

### `backend/src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const ticketRoutes = require('./routes/tickets');
const statsRoutes  = require('./routes/stats');
const authRoutes   = require('./routes/auth');
const syncRoutes   = require('./routes/sync');

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

app.use(cors());
app.use(express.json());

// Socket.io instance'ı route'lara taşı
app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/tickets', ticketRoutes);
app.use('/api/stats',   statsRoutes);
app.use('/api/auth',    authRoutes);
app.use('/api/sync',    syncRoutes);

// Google Sheets webhook endpoint
app.post('/webhook/sheets', async (req, res) => {
  const { triggerSync } = require('./services/sheetsSync');
  await triggerSync(io);
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on :${PORT}`));
```

---

## 5. Google Sheets Senkronizasyonu

### `backend/src/services/sheetsSync.js`

```javascript
const { google } = require('googleapis');
const pool = require('../db/pool');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME     = 'memory-v2'; // Tab adı

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',  // Google Service Account JSON
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:H`,
  });

  return response.data.values || [];
}

function parseRow(row, rowIndex) {
  const [ticket, comment, intent, target, sentiment, confidence, human_feedback, reviewed] = row;

  if (!ticket || ticket === 'ticket') return null; // başlık satırını atla

  const isParseError = intent === 'parse_error';

  return {
    ticket_id:       parseInt(ticket) || null,
    comment:         (comment || '').trim(),
    intent:          isParseError ? 'parse_error' : (intent || 'unknown'),
    target:          target === 'null' ? null : (target || null),
    sentiment:       ['positive', 'neutral', 'negative'].includes(sentiment) ? sentiment : 'neutral',
    confidence:      parseFloat(confidence) || 0,
    human_feedback:  human_feedback?.trim() || null,
    reviewed_by:     reviewed?.trim() || null,
    is_parse_error:  isParseError,
    sheets_row_index: rowIndex,
  };
}

async function triggerSync(io) {
  const rows  = await getSheetData();
  const stats = { added: 0, updated: 0, skipped: 0, errors: 0 };

  for (let i = 1; i < rows.length; i++) {  // i=0 başlık
    const parsed = parseRow(rows[i], i + 1);
    if (!parsed || !parsed.ticket_id) { stats.skipped++; continue; }

    try {
      // UPSERT: aynı ticket_id + sheets_row_index varsa güncelle
      const result = await pool.query(`
        INSERT INTO tickets
          (ticket_id, comment, intent, target, sentiment, confidence,
           human_feedback, reviewed_by, is_parse_error, sheets_row_index, synced_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
        ON CONFLICT (sheets_row_index)
        DO UPDATE SET
          comment        = EXCLUDED.comment,
          intent         = EXCLUDED.intent,
          target         = EXCLUDED.target,
          sentiment      = EXCLUDED.sentiment,
          confidence     = EXCLUDED.confidence,
          human_feedback = EXCLUDED.human_feedback,
          reviewed_by    = EXCLUDED.reviewed_by,
          is_parse_error = EXCLUDED.is_parse_error,
          synced_at      = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        parsed.ticket_id, parsed.comment, parsed.intent, parsed.target,
        parsed.sentiment, parsed.confidence, parsed.human_feedback,
        parsed.reviewed_by, parsed.is_parse_error, parsed.sheets_row_index
      ]);

      if (result.rows[0].inserted) stats.added++;
      else stats.updated++;

    } catch (err) {
      console.error(`Row ${i} error:`, err.message);
      stats.errors++;
    }
  }

  // Sync log kaydet
  await pool.query(`
    INSERT INTO sync_log (rows_added, rows_updated, rows_skipped, status)
    VALUES ($1, $2, $3, 'success')
  `, [stats.added, stats.updated, stats.skipped]);

  // Real-time bildirim gönder
  if (io) {
    io.emit('sync:complete', { ...stats, timestamp: new Date().toISOString() });
    if (stats.added > 0 || stats.updated > 0) {
      io.emit('tickets:updated', { count: stats.added + stats.updated });
    }
  }

  console.log('Sync complete:', stats);
  return stats;
}

// Cron job: her 2 dakikada bir otomatik sync
const cron = require('node-cron');
cron.schedule('*/2 * * * *', () => {
  console.log('⏰ Scheduled sync...');
  triggerSync(null).catch(console.error);
});

module.exports = { triggerSync, getSheetData };
```

> **Not:** `sheets_row_index` üzerine UNIQUE constraint ekle:
> ```sql
> ALTER TABLE tickets ADD CONSTRAINT uq_sheets_row UNIQUE (sheets_row_index);
> ```

---

## 6. API Endpoint'leri

### `backend/src/routes/tickets.js`

```javascript
const router = require('express').Router();
const pool   = require('../db/pool');

// =====================
// GET /api/tickets
// Arama + Filtreleme + Sayfalama
// =====================
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,           // ticket ID veya comment içeriği
    ticket_id,        // tam eşleşme
    intent,           // approve | revise | scenario_other | general_inquiry | parse_error
    target,
    sentiment,
    confidence_min,   // 0.0 - 1.0
    confidence_max,
    is_reviewed,      // true | false
    reviewed_by,
    sort_by = 'created_at',
    sort_order = 'DESC',
    exclude_parse_errors = false,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where  = [];
  let   p      = 1; // parametre sayacı

  // --- Filtreler ---

  if (ticket_id) {
    where.push(`ticket_id = $${p++}`);
    params.push(parseInt(ticket_id));
  }

  if (search) {
    // ticket ID arama (sayıysa) VEYA tam metin comment araması
    if (/^\d+$/.test(search.trim())) {
      where.push(`(ticket_id = $${p} OR comment ILIKE $${p + 1})`);
      params.push(parseInt(search), `%${search}%`);
      p += 2;
    } else {
      // Hem trigram (kısmi eşleşme) hem de FTS kullan
      where.push(`(
        comment ILIKE $${p}
        OR target ILIKE $${p}
        OR to_tsvector('turkish', coalesce(comment,'') || ' ' || coalesce(target,''))
           @@ plainto_tsquery('turkish', $${p + 1})
      )`);
      params.push(`%${search}%`, search);
      p += 2;
    }
  }

  if (intent)    { where.push(`intent = $${p++}`);    params.push(intent); }
  if (target)    { where.push(`target ILIKE $${p++}`); params.push(`%${target}%`); }
  if (sentiment) { where.push(`sentiment = $${p++}`); params.push(sentiment); }

  if (confidence_min !== undefined) {
    where.push(`confidence >= $${p++}`);
    params.push(parseFloat(confidence_min));
  }
  if (confidence_max !== undefined) {
    where.push(`confidence <= $${p++}`);
    params.push(parseFloat(confidence_max));
  }

  if (is_reviewed === 'true')  where.push('is_reviewed = TRUE');
  if (is_reviewed === 'false') where.push('is_reviewed = FALSE');

  if (reviewed_by) { where.push(`reviewed_by ILIKE $${p++}`); params.push(`%${reviewed_by}%`); }

  if (exclude_parse_errors === 'true') where.push('is_parse_error = FALSE');

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = ['ticket_id','confidence','created_at','updated_at','intent','sentiment'];
  const orderBy     = allowedSort.includes(sort_by) ? sort_by : 'created_at';
  const order       = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Toplam kayıt sayısı (pagination için)
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM tickets ${whereClause}`, params
  );
  const total = parseInt(countResult.rows[0].count);

  // Veri sorgusu
  const dataResult = await pool.query(`
    SELECT
      id, ticket_id, comment,
      LEFT(comment, 200) AS comment_preview,  -- uzun yorumlar için kısa özet
      intent, target, sentiment, confidence,
      human_feedback, reviewed_by, is_reviewed,
      is_parse_error, sheets_row_index,
      created_at, updated_at, synced_at
    FROM tickets
    ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT $${p++} OFFSET $${p++}
  `, [...params, parseInt(limit), offset]);

  res.json({
    data:       dataResult.rows,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    }
  });
});

// =====================
// GET /api/tickets/:id
// Tek ticket detayı (tam comment dahil)
// =====================
router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, 
      json_agg(fl ORDER BY fl.changed_at DESC) FILTER (WHERE fl.id IS NOT NULL) AS feedback_history
     FROM tickets t
     LEFT JOIN feedback_log fl ON fl.ticket_id = t.id
     WHERE t.id = $1
     GROUP BY t.id`,
    [req.params.id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Ticket bulunamadı' });
  res.json(result.rows[0]);
});

// =====================
// PATCH /api/tickets/:id/feedback
// Human feedback güncelle
// =====================
router.patch('/:id/feedback', async (req, res) => {
  const { human_feedback, reviewed_by } = req.body;
  const { id } = req.params;

  // Eski değeri al (log için)
  const old = await pool.query('SELECT human_feedback, reviewed_by FROM tickets WHERE id=$1', [id]);
  if (!old.rows.length) return res.status(404).json({ error: 'Bulunamadı' });

  // Güncelle
  const updated = await pool.query(`
    UPDATE tickets
    SET human_feedback = $1, reviewed_by = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `, [human_feedback, reviewed_by, id]);

  // Değişiklik log'u
  await pool.query(`
    INSERT INTO feedback_log (ticket_id, changed_by, old_feedback, new_feedback, old_reviewed_by, new_reviewed_by)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, reviewed_by, old.rows[0].human_feedback, human_feedback, old.rows[0].reviewed_by, reviewed_by]);

  // Real-time bildirim
  req.io?.emit('ticket:feedback_updated', { id, ticket_id: updated.rows[0].ticket_id });

  res.json(updated.rows[0]);
});

module.exports = router;
```

---

## 7. Arama & Filtreleme Sistemi

### Desteklenen Arama Kombinasyonları

| Arama Tipi | Örnek | SQL Stratejisi |
|---|---|---|
| Ticket ID ile | `?ticket_id=830269` | Exact match |
| ID içeren arama | `?search=830` | Trigram ILIKE |
| Kelime araması | `?search=fatura` | FTS + ILIKE |
| Intent filtresi | `?intent=revise` | Enum eşleşme |
| Target filtresi | `?target=invoice` | ILIKE |
| Confidence aralığı | `?confidence_min=0.8` | Numeric range |
| İncelenmemiş | `?is_reviewed=false` | Boolean |
| Kimin incelediği | `?reviewed_by=enver` | ILIKE |
| Kombine | `?intent=revise&confidence_min=0.7&is_reviewed=false` | AND birleşimi |

### Örnek Sorgular

```bash
# Tüm "revise" intent'li, düşük confidence'lı, incelenmemiş ticketlar
GET /api/tickets?intent=revise&confidence_max=0.6&is_reviewed=false

# "fatura" kelimesini içeren yorumlar
GET /api/tickets?search=fatura&sort_by=confidence&sort_order=ASC

# Belirli ticket ID
GET /api/tickets?ticket_id=830269

# Parse error'ları hariç tut, en yüksek confidence önce
GET /api/tickets?exclude_parse_errors=true&sort_by=confidence&sort_order=DESC
```

---

## 8. Real-time (Socket.io)

### Backend'den yayınlanan event'ler

| Event | Ne zaman | Payload |
|---|---|---|
| `sync:complete` | Sheets sync tamamlandığında | `{ added, updated, skipped, timestamp }` |
| `tickets:updated` | Yeni/güncellenen satır geldiğinde | `{ count }` |
| `ticket:feedback_updated` | Human feedback değiştiğinde | `{ id, ticket_id }` |

### Frontend'de dinleme (React Hook)

```javascript
// hooks/useRealtime.js
import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL);

export function useRealtime({ onSyncComplete, onTicketsUpdated }) {
  useEffect(() => {
    socket.on('sync:complete', onSyncComplete);
    socket.on('tickets:updated', onTicketsUpdated);

    return () => {
      socket.off('sync:complete', onSyncComplete);
      socket.off('tickets:updated', onTicketsUpdated);
    };
  }, [onSyncComplete, onTicketsUpdated]);

  return { socket };
}
```

---

## 9. Frontend — React Dashboard

### Bileşen Yapısı

```
src/
├── pages/
│   ├── Dashboard.jsx       ← Ana sayfa (KPI + grafikler + tablo)
│   ├── TicketDetail.jsx    ← Ticket detay (tam comment + feedback history)
│   └── Login.jsx
├── components/
│   ├── KPICards.jsx        ← Toplam, reviewed, avg confidence
│   ├── IntentChart.jsx     ← Pie chart (Recharts)
│   ├── SentimentChart.jsx  ← Bar chart
│   ├── ConfidenceChart.jsx ← Histogram
│   ├── TicketTable.jsx     ← Ana tablo (TanStack Table)
│   ├── SearchBar.jsx       ← Unified arama
│   ├── FilterPanel.jsx     ← Yan panel filtreler
│   ├── FeedbackModal.jsx   ← Human feedback düzenleme
│   └── LiveBadge.jsx       ← "🟢 Canlı" göstergesi
├── hooks/
│   ├── useTickets.js       ← Veri çekme + filtreleme state
│   ├── useRealtime.js      ← Socket.io
│   └── useStats.js         ← KPI verileri
└── services/
    └── api.js              ← Axios instance
```

### `TicketTable.jsx` — Kritik Özellikler

```jsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

const columns = [
  { accessorKey: 'ticket_id',       header: 'Ticket ID', size: 100 },
  { accessorKey: 'comment_preview', header: 'Yorum',     size: 300,
    cell: ({ row }) => (
      <div className="truncate max-w-xs cursor-pointer"
           title={row.original.comment}
           onClick={() => openDetail(row.original.id)}>
        {row.original.comment_preview}
      </div>
    )
  },
  { accessorKey: 'intent',    header: 'Intent',
    cell: ({ getValue }) => <IntentBadge value={getValue()} /> },
  { accessorKey: 'target',    header: 'Target' },
  { accessorKey: 'sentiment', header: 'Sentiment',
    cell: ({ getValue }) => <SentimentBadge value={getValue()} /> },
  { accessorKey: 'confidence', header: 'Confidence',
    cell: ({ getValue }) => (
      <div className={`font-mono ${getValue() >= 0.8 ? 'text-green-600' : getValue() < 0.5 ? 'text-red-500' : 'text-amber-500'}`}>
        {(getValue() * 100).toFixed(0)}%
      </div>
    )
  },
  { accessorKey: 'human_feedback', header: 'Feedback',
    cell: ({ row }) => (
      <button onClick={() => openFeedbackModal(row.original)}
              className={row.original.human_feedback ? 'text-green-600' : 'text-gray-400'}>
        {row.original.human_feedback || '+ Ekle'}
      </button>
    )
  },
  { accessorKey: 'reviewed_by', header: 'İnceleyen' },
];
```

### Renk Kodlama Sistemi

```javascript
// Intent badge renkleri
const INTENT_COLORS = {
  approve:         'bg-green-100  text-green-800',
  revise:          'bg-amber-100  text-amber-800',
  scenario_other:  'bg-purple-100 text-purple-800',
  general_inquiry: 'bg-blue-100   text-blue-800',
  parse_error:     'bg-red-100    text-red-800',
  unknown:         'bg-gray-100   text-gray-600',
};

// Confidence renkleri
// >= 0.8 → yeşil (güvenilir)
// 0.5-0.8 → sarı (dikkat)
// < 0.5 → kırmızı (düşük güven / incelenmeli)
```

---

## 10. Auth Sistemi

### JWT + Google OAuth Akışı

```
Kullanıcı → Google Login → Backend Google doğrular
→ users tablosuna kaydet/güncelle
→ JWT token üret (8 saat)
→ Frontend localStorage'a yazar
→ Her API isteğinde Authorization: Bearer <token>
→ Backend middleware doğrular
```

### Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
  next();
}

module.exports = { authenticate, requireAdmin };
```

---

## 11. Proje Klasör Yapısı

```
ticket-dashboard/
├── docker-compose.yml
├── db/
│   └── init.sql                ← Tüm CREATE TABLE / INDEX / VIEW
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── service-account.json    ← Google Service Account (git ignore!)
│   ├── .env
│   └── src/
│       ├── app.js
│       ├── db/
│       │   └── pool.js
│       ├── routes/
│       │   ├── tickets.js
│       │   ├── stats.js
│       │   ├── auth.js
│       │   └── sync.js
│       ├── services/
│       │   └── sheetsSync.js
│       └── middleware/
│           └── auth.js
├── frontend/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── services/
└── .gitignore
```

### `.env` (backend)

```env
DATABASE_URL=postgresql://ticketadmin:supersecret123@localhost:5432/ticketdb
REDIS_URL=redis://localhost:6379
GOOGLE_SHEET_ID=1RAfTOI-nQQ9QrquG-btG0Y3PjNvC0jxuG78OdokIrx8
JWT_SECRET=cok-gizli-bir-key-buraya-yaz
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### `.gitignore`

```
service-account.json
.env
node_modules/
```

---

## 12. Geliştirme Sırası

### Hafta 1 — Temel Altyapı

```
Gün 1: docker-compose up → DB schema → init.sql çalıştır
Gün 2: Google Service Account oluştur → sheetsSync.js → ilk veri çekimi
Gün 3: GET /api/tickets → temel filtreleme çalışsın
Gün 4: PATCH /api/tickets/:id/feedback → feedback_log
Gün 5: GET /api/stats → KPI hesaplamaları
```

### Hafta 2 — Frontend

```
Gün 1-2: React projesi kur → API bağlantısı → TicketTable (ham veri görünsün)
Gün 3:   SearchBar + FilterPanel
Gün 4:   KPICards + grafikler (Recharts)
Gün 5:   FeedbackModal + Socket.io real-time
```

### Hafta 3 — Auth & Deploy

```
Gün 1-2: JWT auth + Google OAuth
Gün 3:   Docker ile full stack çalıştır
Gün 4:   Railway/Render deploy
Gün 5:   n8n webhook URL'ini production backend'e bağla
```

---

## Kritik Notlar

> ⚠️ `service-account.json` asla git'e commit edilmez — `.gitignore`'a ekle
>
> ⚠️ `parse_error` satırları dashboard'da kırmızı badge ile göster, filtrelenebilir olsun
>
> ⚠️ Comment sütunu çok uzun olabilir — tabloda `LEFT(comment, 200)` kullan, detay sayfasında tam göster
>
> ⚠️ Aynı `ticket_id`'ye birden fazla satır olabilir — `id` (serial) primary key, `ticket_id` değil
>
> ⚠️ Confidence = 0 olan `parse_error` satırları confidence filtresinde dikkat — bunları ayrı say

---

*Bu doküman projenin tam referans kaynağıdır. Her aşamada ilgili bölüme bakarak ilerleyebilirsin.*
