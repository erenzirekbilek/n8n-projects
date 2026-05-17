const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    ticket_id,
    intent,
    target,
    sentiment,
    confidence_min,
    confidence_max,
    is_reviewed,
    reviewed_by,
    sort_by = 'created_at',
    sort_order = 'DESC',
    exclude_parse_errors = false,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where  = [];
  let   p      = 1;

  if (ticket_id) {
    where.push(`ticket_id = $${p++}`);
    params.push(parseInt(ticket_id));
  }

  if (search) {
    if (/^\d+$/.test(search.trim())) {
      where.push(`(ticket_id = $${p} OR comment ILIKE $${p + 1})`);
      params.push(parseInt(search), `%${search}%`);
      p += 2;
    } else {
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

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM tickets ${whereClause}`, params
  );
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await pool.query(`
    SELECT
      id, ticket_id, comment,
      LEFT(comment, 200) AS comment_preview,
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

router.patch('/:id/feedback', async (req, res) => {
  const { human_feedback, reviewed_by } = req.body;
  const { id } = req.params;

  const old = await pool.query('SELECT human_feedback, reviewed_by FROM tickets WHERE id=$1', [id]);
  if (!old.rows.length) return res.status(404).json({ error: 'Bulunamadı' });

  const updated = await pool.query(`
    UPDATE tickets
    SET human_feedback = $1, reviewed_by = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `, [human_feedback, reviewed_by, id]);

  await pool.query(`
    INSERT INTO feedback_log (ticket_id, changed_by, old_feedback, new_feedback, old_reviewed_by, new_reviewed_by)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, reviewed_by, old.rows[0].human_feedback, human_feedback, old.rows[0].reviewed_by, reviewed_by]);

  req.io?.emit('ticket:feedback_updated', { id, ticket_id: updated.rows[0].ticket_id });

  res.json(updated.rows[0]);
});

module.exports = router;