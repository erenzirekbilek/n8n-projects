const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ticket_stats');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Stats calculation failed' });
  }
});

module.exports = router;