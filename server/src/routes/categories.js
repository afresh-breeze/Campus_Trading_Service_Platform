const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok } = require('../utils/response');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT category_id AS categoryId, name, sort_no AS sortNo
         FROM categories
        ORDER BY sort_no, category_id`
    );
    return ok(res, { list: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
