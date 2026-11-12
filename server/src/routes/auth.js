const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const USER_FIELDS = `user_id AS userId, student_no AS studentNo, nickname,
  avatar_url AS avatarUrl, campus, college, phone,
  credit_score AS creditScore, status, created_at AS createdAt`;

function signToken(userInfo) {
  return jwt.sign(
    { userId: userInfo.userId, studentNo: userInfo.studentNo },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRegister({ studentNo, password, nickname }) {
  if (!studentNo || !password || !nickname) {
    return '学号、密码、昵称不能为空';
  }
  if (!/^\d{6,20}$/.test(studentNo)) {
    return '学号应为 6-20 位数字';
  }
  if (!/^\S{6,20}$/.test(password)) {
    return '密码需 6-20 位且不能包含空格';
  }
  if (nickname.length < 2 || nickname.length > 12) {
    return '昵称需 2-12 个字符';
  }
  return '';
}

router.post('/register', async (req, res, next) => {
  const body = req.body || {};
  const studentNo = readString(body.studentNo);
  const password = typeof body.password === 'string' ? body.password : '';
  const nickname = readString(body.nickname);

  const message = validateRegister({ studentNo, password, nickname });
  if (message) {
    return fail(res, 400, message);
  }

  try {
    const [exists] = await pool.query(
      'SELECT user_id FROM users WHERE student_no = ?',
      [studentNo]
    );
    if (exists.length) {
      return fail(res, 409, '该学号已注册');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // MVP 仅覆盖北碚校区，注册不采集校区；campus 保留为可空预留字段
    const [result] = await pool.query(
      'INSERT INTO users (student_no, password_hash, nickname) VALUES (?, ?, ?)',
      [studentNo, passwordHash, nickname]
    );

    const [rows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`,
      [result.insertId]
    );
    const userInfo = rows[0];
    return ok(res, { token: signToken(userInfo), userInfo }, '注册成功');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 409, '该学号已注册');
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  const body = req.body || {};
  const studentNo = readString(body.studentNo);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!studentNo || !password) {
    return fail(res, 400, '请输入学号和密码');
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id AS userId, student_no AS studentNo,
              password_hash AS passwordHash, status
         FROM users
        WHERE student_no = ?`,
      [studentNo]
    );
    if (!rows.length) {
      return fail(res, 401, '学号或密码错误');
    }

    const user = rows[0];
    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return fail(res, 401, '学号或密码错误');
    }
    if (user.status === 'disabled') {
      return fail(res, 403, '账号已被禁用');
    }

    const [profileRows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`,
      [user.userId]
    );
    const userInfo = profileRows[0];
    return ok(res, { token: signToken(userInfo), userInfo }, '登录成功');
  } catch (err) {
    return next(err);
  }
});

router.get('/me', auth, (req, res) => {
  return ok(res, req.user);
});

module.exports = router;
