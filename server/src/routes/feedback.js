const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { readTrimmed } = require('../utils/item');

const router = express.Router();

router.use(auth);

router.post('/', async (req, res, next) => {
  const content = readTrimmed((req.body || {}).content);
  if (!content) {
    return fail(res, 400, '反馈内容不能为空');
  }
  if (content.length > 500) {
    return fail(res, 400, '反馈内容不能超过 500 字');
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, content) VALUES (?, ?)',
      [req.user.userId, content]
    );
    return ok(res, { feedbackId: result.insertId }, '感谢反馈');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
