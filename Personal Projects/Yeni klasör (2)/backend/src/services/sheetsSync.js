const { google } = require('googleapis');
const pool = require('../db/pool');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME     = 'memory-v2';

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });

  console.log('Sheet rows count:', response.data.values?.length || 0);
  return response.data.values || [];
}

const INTENT_MAP = {
  'approve': 'approve',
  'revise': 'revise',
  'scenario_other': 'scenario_other',
  'general_inquiry': 'general_inquiry',
  'parse_error': 'parse_error',
  'submit': 'general_inquiry',
  'request': 'general_inquiry',
  'payment_confirmation': 'general_inquiry',
  'pending_acknowledgement': 'general_inquiry',
  'info': 'general_inquiry',
  'cancel': 'general_inquiry',
  'update': 'revise',
};

function parseRow(row, rowIndex) {
  const [ticket, comment, intent, target, sentiment, confidence, human_feedback, reviewed] = row;

  if (!ticket || ticket === 'ticket') return null;

  const rawIntent = (intent || '').toLowerCase().trim();
  const isParseError = rawIntent === 'parse_error';
  const mappedIntent = INTENT_MAP[rawIntent] || 'unknown';

  return {
    ticket_id:       parseInt(ticket) || null,
    comment:         (comment || '').trim(),
    intent:          isParseError ? 'parse_error' : mappedIntent,
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

  for (let i = 1; i < rows.length; i++) {
    const parsed = parseRow(rows[i], i + 1);
    if (!parsed || !parsed.ticket_id) { stats.skipped++; continue; }

    try {
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

  await pool.query(`
    INSERT INTO sync_log (rows_added, rows_updated, rows_skipped, status)
    VALUES ($1, $2, $3, 'success')
  `, [stats.added, stats.updated, stats.skipped]);

  if (io) {
    io.emit('sync:complete', { ...stats, timestamp: new Date().toISOString() });
    if (stats.added > 0 || stats.updated > 0) {
      io.emit('tickets:updated', { count: stats.added + stats.updated });
    }
  }

  console.log('Sync complete:', stats);
  return stats;
}

let _io = null;

function init(io) {
  _io = io;
  const cron = require('node-cron');
  cron.schedule('*/2 * * * *', () => {
    console.log('Scheduled sync...');
    triggerSync(_io).catch(console.error);
  });
}

module.exports = { triggerSync, getSheetData, init };