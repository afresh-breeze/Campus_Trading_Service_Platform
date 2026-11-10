const jwt = require('jsonwebtoken');
const pool = require('../db');
const { fail } = require('../utils/response');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return fail(res, 401, '请先登录');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return fail(res, 401, '登录已过期');
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id AS userId, student_no AS studentNo, nickname,
              avatar_url AS avatarUrl, campus, college, phone,
              credit_score AS creditScore, status, created_at AS createdAt
         FROM users
        WHERE user_id = ?`,
      [payload.userId]
    );
    if (!rows.length) {
      return fail(res, 401, '用户不存在，请重新登录');
    }
    if (rows[0].status === 'disabled') {
      return fail(res, 403, '账号已被禁用');
    }
    req.user = rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
};
