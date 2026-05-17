const router = require('express').Router();
const pool   = require('../db/pool');
const { triggerSync } = require('../services/sheetsSync');

router.post('/', async (req, res) => {
  try {
    const stats = await triggerSync(req.io);
    res.json({ ok: true, stats });
  } catch (err) {
    console.error('Manual sync error:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 1'
    );
    res.json(result.rows[0] || { status: 'no_sync_yet' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

module.exports = router;
