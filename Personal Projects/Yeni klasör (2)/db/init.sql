CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE intent_type AS ENUM (
  'approve', 'revise', 'scenario_other', 'general_inquiry', 'parse_error', 'unknown'
);

CREATE TYPE sentiment_type AS ENUM (
  'positive', 'neutral', 'negative'
);

CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  ticket_id         INTEGER NOT NULL,
  comment           TEXT,
  comment_clean     TEXT,
  intent            intent_type DEFAULT 'unknown',
  target            VARCHAR(100),
  sentiment         sentiment_type DEFAULT 'neutral',
  confidence        DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  human_feedback    TEXT,
  reviewed_by       VARCHAR(100),
  is_parse_error    BOOLEAN DEFAULT FALSE,
  is_reviewed       BOOLEAN GENERATED ALWAYS AS (human_feedback IS NOT NULL) STORED,
  sheets_row_index  INTEGER UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  synced_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX idx_tickets_intent ON tickets(intent);
CREATE INDEX idx_tickets_sentiment ON tickets(sentiment);
CREATE INDEX idx_tickets_target ON tickets(target);
CREATE INDEX idx_tickets_confidence ON tickets(confidence);
CREATE INDEX idx_tickets_is_reviewed ON tickets(is_reviewed);
CREATE INDEX idx_tickets_reviewed_by ON tickets(reviewed_by);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_updated_at ON tickets(updated_at DESC);

CREATE INDEX idx_tickets_comment_fts ON tickets
  USING gin(to_tsvector('turkish', coalesce(comment, '') || ' ' || coalesce(target, '')));

CREATE INDEX idx_tickets_comment_trgm ON tickets USING gin(comment gin_trgm_ops);
CREATE INDEX idx_tickets_target_trgm ON tickets USING gin(target gin_trgm_ops);

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

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  google_sub    VARCHAR(255) UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

CREATE TABLE sync_log (
  id            SERIAL PRIMARY KEY,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  rows_added    INTEGER DEFAULT 0,
  rows_updated  INTEGER DEFAULT 0,
  rows_skipped  INTEGER DEFAULT 0,
  error_message TEXT,
  status        VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error'))
);

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