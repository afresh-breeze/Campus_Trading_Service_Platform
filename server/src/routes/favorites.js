const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const {
  CARD_FIELDS,
  ITEM_STATUSES,
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

  const rawStatus = req.query.status;
  let status = '';
  if (rawStatus !== undefined && rawStatus !== '') {
    if (typeof rawStatus !== 'string') {
      return fail(res, 400, '商品状态不合法');
    }
    status = rawStatus.trim();
    if (!ITEM_STATUSES.includes(status)) {
      return fail(res, 400, '商品状态不合法');
    }
  }
  const where = ['f.user_id = ?'];
  const params = [req.user.userId];
  if (status) {
    where.push('v.status = ?');
    params.push(status);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM favorites f
         JOIN v_item_list v ON v.itemId = f.item_id
         ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT ${CARD_FIELDS}, f.created_at AS favoritedAt
         FROM favorites f
         JOIN v_item_list v ON v.itemId = f.item_id
         ${whereSql}
        ORDER BY f.created_at DESC, f.item_id DESC
        LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, offset]
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
