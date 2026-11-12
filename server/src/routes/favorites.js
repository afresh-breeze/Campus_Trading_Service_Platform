const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const {
  CARD_FIELDS,
  parsePagination,
  mapItemCard
} = require('../utils/item');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  const offset = (pagination.page - 1) * pagination.pageSize;

  try {
    const [[countRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?',
      [req.user.userId]
    );
    const [rows] = await pool.query(
      `SELECT ${CARD_FIELDS}, f.created_at AS favoritedAt
         FROM favorites f
         JOIN v_item_list v ON v.itemId = f.item_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC, f.item_id DESC
        LIMIT ? OFFSET ?`,
      [req.user.userId, pagination.pageSize, offset]
    );

    return ok(res, {
      list: rows.map((row) => ({
        ...mapItemCard(row),
        favoritedAt: row.favoritedAt
      })),
      total: countRow.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
