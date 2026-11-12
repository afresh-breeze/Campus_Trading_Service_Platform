const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { readTrimmed, toNumber, escapeLike } = require('../utils/item');

const router = express.Router();

const BOOK_FIELDS = `book_id AS bookId, isbn, title, author, publisher, edition,
  price_ref AS priceRef, cover_url AS coverUrl`;

router.use(auth);

router.get('/search', async (req, res, next) => {
  const keyword = readTrimmed(req.query.keyword);
  if (!keyword) {
    return fail(res, 400, '搜索关键词不能为空');
  }
  if (keyword.length > 100) {
    return fail(res, 400, '搜索关键词过长');
  }

  const pattern = `%${escapeLike(keyword)}%`;

  try {
    const [rows] = await pool.query(
      `SELECT ${BOOK_FIELDS}
         FROM books
        WHERE title LIKE ? ESCAPE '!'
           OR isbn LIKE ? ESCAPE '!'
           OR author LIKE ? ESCAPE '!'
        ORDER BY book_id DESC
        LIMIT 10`,
      [pattern, pattern, pattern]
    );
    return ok(res, { list: rows });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const title = readTrimmed(body.title);
  if (!title) {
    return fail(res, 400, '书名不能为空');
  }
  if (title.length > 200) {
    return fail(res, 400, '书名不能超过 200 字');
  }

  let isbn = null;
  if (body.isbn !== undefined && body.isbn !== null && body.isbn !== '') {
    if (typeof body.isbn !== 'string') {
      return fail(res, 400, '参数错误');
    }
    isbn = body.isbn.trim() || null;
    if (isbn && isbn.length > 20) {
      return fail(res, 400, 'ISBN 不能超过 20 位');
    }
  }

  const textFields = [
    ['author', 100, '作者'],
    ['publisher', 100, '出版社'],
    ['edition', 50, '版次'],
    ['coverUrl', 255, '封面地址']
  ];
  const values = {};
  for (const [field, maxLength, label] of textFields) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      values[field] = null;
      continue;
    }
    if (typeof value !== 'string') {
      return fail(res, 400, '参数错误');
    }
    const text = value.trim();
    if (text.length > maxLength) {
      return fail(res, 400, `${label}不能超过 ${maxLength} 字`);
    }
    values[field] = text || null;
  }

  let priceRef = null;
  if (body.priceRef !== undefined && body.priceRef !== null && body.priceRef !== '') {
    priceRef = toNumber(body.priceRef);
    if (priceRef === null) {
      return fail(res, 400, '参考价格式不正确');
    }
    if (priceRef < 0) {
      return fail(res, 400, '参考价不能为负数');
    }
  }

  try {
    if (isbn) {
      const [existing] = await pool.query(
        `SELECT ${BOOK_FIELDS} FROM books WHERE isbn = ?`,
        [isbn]
      );
      if (existing.length) {
        return ok(res, { ...existing[0], created: false });
      }
    }

    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO books (isbn, title, author, publisher, edition, price_ref, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [isbn, title, values.author, values.publisher, values.edition, priceRef, values.coverUrl]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && isbn) {
        const [existing] = await pool.query(
          `SELECT ${BOOK_FIELDS} FROM books WHERE isbn = ?`,
          [isbn]
        );
        if (existing.length) {
          return ok(res, { ...existing[0], created: false });
        }
      }
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT ${BOOK_FIELDS} FROM books WHERE book_id = ?`,
      [result.insertId]
    );
    return ok(res, { ...rows[0], created: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
