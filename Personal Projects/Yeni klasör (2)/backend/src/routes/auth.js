const router = require('express').Router();
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

router.post('/google', async (req, res) => {
  const { email, name, google_sub } = req.body;

  try {
    let user = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR google_sub = $2',
      [email, google_sub]
    );

    if (!user.rows.length) {
      user = await pool.query(
        'INSERT INTO users (email, name, google_sub, last_login) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [email, name, google_sub]
      );
    } else {
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.rows[0].id]
      );
      user.rows[0].last_login = new Date();
    }

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;