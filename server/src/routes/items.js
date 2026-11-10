const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const {
  CARD_FIELDS,
  ITEM_STATUSES,
  ITEM_TYPES,
  CONDITION_LEVELS,
  MAX_PRICE,
  STATUS_TRANSITIONS,
  readTrimmed,
  parsePositiveInt,
  parsePagination,
  toNumber,
  parseBoolean,
  escapeLike,
  mapItemCard
} = require('../utils/item');

const router = express.Router();

const SORTS = {
  latest: 'v.createdAt DESC, v.itemId DESC',
  price_asc: 'v.price ASC, v.itemId DESC',
  price_desc: 'v.price DESC, v.itemId DESC'
};

router.use(auth);

function readOptionalText(value, maxLength, label) {
  if (value === undefined || value === null) {
    return { value: null, error: '' };
  }
  if (typeof value !== 'string') {
    return { value: null, error: '参数错误' };
  }
  const text = value.trim();
  if (text.length > maxLength) {
    return { value: null, error: `${label}不能超过 ${maxLength} 字` };
  }
  return { value: text || null, error: '' };
}

function readPrice(value) {
  if (value === undefined || value === null || value === '') {
    return { provided: false, value: null };
  }
  const number = toNumber(value);
  if (number === null || number < 0) {
    return { provided: true, value: null };
  }
  return { provided: true, value: number };
}

function parseImages(value) {
  if (value === undefined || value === null) {
    return { images: [], error: '' };
  }
  if (!Array.isArray(value)) {
    return { images: [], error: '参数错误' };
  }
  if (value.length > 3) {
    return { images: [], error: '最多上传 3 张图片' };
  }

  const images = [];
  for (let i = 0; i < value.length; i += 1) {
    const image = value[i];
    if (!image || typeof image !== 'object' || typeof image.url !== 'string') {
      return { images: [], error: '图片地址不合法' };
    }
    const url = image.url.trim();
    if (!url.startsWith('/uploads/') || url.length > 255) {
      return { images: [], error: '图片地址不合法' };
    }
    images.push({
      url,
      sortNo: parsePositiveInt(image.sortNo) || i + 1
    });
  }

  images.sort((a, b) => a.sortNo - b.sortNo);
  return {
    images: images.map((image, index) => ({ url: image.url, sortNo: index + 1 })),
    error: ''
  };
}

router.get('/', async (req, res, next) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  const sort = req.query.sort === undefined || req.query.sort === ''
    ? 'latest'
    : req.query.sort;
  if (typeof sort !== 'string' || !SORTS[sort]) {
    return fail(res, 400, '排序方式不合法');
  }

  const where = ['v.status = ?'];
  const params = ['on_sale'];

  const keyword = readTrimmed(req.query.keyword);
  if (keyword) {
    if (keyword.length > 100) {
      return fail(res, 400, '搜索关键词过长');
    }
    const pattern = `%${escapeLike(keyword)}%`;
    where.push(`(v.title LIKE ? ESCAPE '!'
      OR v.description LIKE ? ESCAPE '!'
      OR v.bookTitle LIKE ? ESCAPE '!'
      OR v.bookAuthor LIKE ? ESCAPE '!')`);
    params.push(pattern, pattern, pattern, pattern);
  }

  if (req.query.bookId !== undefined && req.query.bookId !== '') {
    const bookId = parsePositiveInt(req.query.bookId);
    if (!bookId) {
      return fail(res, 400, '参数错误');
    }
    where.push('v.bookId = ?');
    params.push(bookId);
  }

  if (req.query.categoryId !== undefined && req.query.categoryId !== '') {
    const categoryId = parsePositiveInt(req.query.categoryId);
    if (!categoryId) {
      return fail(res, 400, '参数错误');
    }
    where.push('v.categoryId = ?');
    params.push(categoryId);
  }

  const minPrice = readPrice(req.query.minPrice);
  const maxPrice = readPrice(req.query.maxPrice);
  if ((minPrice.provided && minPrice.value === null)
    || (maxPrice.provided && maxPrice.value === null)
    || (minPrice.value !== null && maxPrice.value !== null && minPrice.value > maxPrice.value)) {
    return fail(res, 400, '价格区间不合法');
  }
  if (minPrice.value !== null) {
    where.push('v.price >= ?');
    params.push(minPrice.value);
  }
  if (maxPrice.value !== null) {
    where.push('v.price <= ?');
    params.push(maxPrice.value);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (pagination.page - 1) * pagination.pageSize;

  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM v_item_list v ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT ${CARD_FIELDS}
         FROM v_item_list v
         ${whereSql}
        ORDER BY ${SORTS[sort]}
        LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, offset]
    );

    return ok(res, {
      list: rows.map(mapItemCard),
      total: countRow.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/mine', async (req, res, next) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  const where = ['v.sellerId = ?'];
  const params = [req.user.userId];

  if (req.query.status !== undefined && req.query.status !== '') {
    const status = readTrimmed(req.query.status);
    if (!ITEM_STATUSES.includes(status)) {
      return fail(res, 400, '商品状态不合法');
    }
    where.push('v.status = ?');
    params.push(status);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (pagination.page - 1) * pagination.pageSize;

  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM v_item_list v ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT ${CARD_FIELDS}
         FROM v_item_list v
         ${whereSql}
        ORDER BY v.createdAt DESC, v.itemId DESC
        LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, offset]
    );

    return ok(res, {
      list: rows.map(mapItemCard),
      total: countRow.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const itemType = readTrimmed(body.itemType);
  if (!ITEM_TYPES.includes(itemType)) {
    return fail(res, 400, '商品类型不合法');
  }

  const categoryId = parsePositiveInt(body.categoryId);
  if (!categoryId) {
    return fail(res, 400, '分类不存在');
  }

  const title = readTrimmed(body.title);
  if (!title) {
    return fail(res, 400, '标题不能为空');
  }
  if (title.length > 100) {
    return fail(res, 400, '标题不能超过 100 字');
  }

  const description = readOptionalText(body.description, 2000, '描述');
  if (description.error) {
    return fail(res, 400, description.error);
  }

  const price = toNumber(body.price);
  if (price === null || price <= 0) {
    return fail(res, 400, '售价必须大于 0');
  }
  if (price > MAX_PRICE) {
    return fail(res, 400, '售价超出范围');
  }

  let originalPrice = null;
  if (body.originalPrice !== undefined && body.originalPrice !== null && body.originalPrice !== '') {
    originalPrice = toNumber(body.originalPrice);
    if (originalPrice === null) {
      return fail(res, 400, '原价格式不正确');
    }
    if (originalPrice < 0) {
      return fail(res, 400, '原价不能为负数');
    }
    if (originalPrice > MAX_PRICE) {
      return fail(res, 400, '原价超出范围');
    }
  }

  const conditionLevel = body.conditionLevel === undefined || body.conditionLevel === null
    ? 'good'
    : readTrimmed(body.conditionLevel);
  if (!CONDITION_LEVELS.includes(conditionLevel)) {
    return fail(res, 400, '成色不合法');
  }

  const negotiable = parseBoolean(body.negotiable);
  if (negotiable === null) {
    return fail(res, 400, '参数错误');
  }

  const location = readOptionalText(body.location, 100, '交易地点');
  if (location.error) {
    return fail(res, 400, location.error);
  }

  const parsedImages = parseImages(body.images);
  if (parsedImages.error) {
    return fail(res, 400, parsedImages.error);
  }

  let bookId = null;
  if (itemType === 'book') {
    bookId = parsePositiveInt(body.bookId);
    if (!bookId) {
      return fail(res, 400, '书籍商品必须选择书目');
    }
  }

  try {
    const [categoryRows] = await pool.query(
      'SELECT category_id FROM categories WHERE category_id = ?',
      [categoryId]
    );
    if (!categoryRows.length) {
      return fail(res, 400, '分类不存在');
    }

    if (bookId) {
      const [bookRows] = await pool.query(
        'SELECT book_id FROM books WHERE book_id = ?',
        [bookId]
      );
      if (!bookRows.length) {
        return fail(res, 400, '书目不存在');
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.query(
        'CALL sp_publish_item(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @item_id)',
        [
          req.user.userId,
          categoryId,
          bookId,
          itemType,
          title,
          description.value,
          price,
          originalPrice,
          conditionLevel,
          negotiable ? 1 : 0,
          location.value,
          JSON.stringify(parsedImages.images)
        ]
      );
      const [[row]] = await conn.query('SELECT @item_id AS itemId');
      const itemId = Number(row.itemId);
      if (!itemId) {
        throw new Error('发布商品失败');
      }
      return ok(res, { itemId }, '发布成功');
    } finally {
      conn.release();
    }
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const itemId = parsePositiveInt(req.params.id);
  if (!itemId) {
    return fail(res, 400, '商品 ID 不合法');
  }

  try {
    const [updateResult] = await pool.query(
      'UPDATE items SET view_count = view_count + 1 WHERE item_id = ?',
      [itemId]
    );
    if (updateResult.affectedRows === 0) {
      return fail(res, 404, '商品不存在');
    }

    const [rows] = await pool.query(
      `SELECT ${CARD_FIELDS}, updatedAt FROM v_item_list v WHERE v.itemId = ?`,
      [itemId]
    );
    if (!rows.length) {
      return fail(res, 404, '商品不存在');
    }

    const [images] = await pool.query(
      `SELECT image_id AS imageId, url, sort_no AS sortNo
         FROM item_images
        WHERE item_id = ?
        ORDER BY sort_no, image_id`,
      [itemId]
    );
    const [[favorite]] = await pool.query(
      'SELECT 1 AS favorited FROM favorites WHERE user_id = ? AND item_id = ?',
      [req.user.userId, itemId]
    );

    const row = rows[0];
    return ok(res, {
      ...mapItemCard(row),
      updatedAt: row.updatedAt,
      images,
      seller: {
        userId: row.sellerId,
        nickname: row.sellerNickname,
        avatarUrl: row.sellerAvatar,
        creditScore: row.sellerCreditScore
      },
      isFavorited: Boolean(favorite),
      isOwner: row.sellerId === req.user.userId
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id/status', async (req, res, next) => {
  const itemId = parsePositiveInt(req.params.id);
  if (!itemId) {
    return fail(res, 400, '商品 ID 不合法');
  }

  const status = readTrimmed((req.body || {}).status);
  if (!ITEM_STATUSES.includes(status)) {
    return fail(res, 400, '商品状态不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT seller_id AS sellerId, status FROM items WHERE item_id = ? FOR UPDATE',
      [itemId]
    );
    if (!rows.length) {
      await conn.rollback();
      return fail(res, 404, '商品不存在');
    }
    if (rows[0].sellerId !== req.user.userId) {
      await conn.rollback();
      return fail(res, 403, '只能操作自己发布的商品');
    }

    const allowed = STATUS_TRANSITIONS[rows[0].status] || [];
    if (!allowed.includes(status)) {
      await conn.rollback();
      return fail(res, 409, '当前状态不能变更为目标状态');
    }

    await conn.query('SET @current_user_id = ?', [req.user.userId]);
    await conn.query('UPDATE items SET status = ? WHERE item_id = ?', [status, itemId]);
    await conn.commit();

    return ok(res, { itemId, status });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      // ignore rollback error
    }
    return next(err);
  } finally {
    try {
      await conn.query('SET @current_user_id = NULL');
    } catch (resetErr) {
      // ignore reset error
    }
    conn.release();
  }
});

router.post('/:id/favorite', async (req, res, next) => {
  const itemId = parsePositiveInt(req.params.id);
  if (!itemId) {
    return fail(res, 400, '商品 ID 不合法');
  }

  try {
    const [items] = await pool.query('SELECT item_id FROM items WHERE item_id = ?', [itemId]);
    if (!items.length) {
      return fail(res, 404, '商品不存在');
    }

    await pool.query(
      'INSERT IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)',
      [req.user.userId, itemId]
    );
    const [[row]] = await pool.query(
      'SELECT favorite_count AS favoriteCount FROM items WHERE item_id = ?',
      [itemId]
    );
    return ok(res, { favorited: true, favoriteCount: row.favoriteCount });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id/favorite', async (req, res, next) => {
  const itemId = parsePositiveInt(req.params.id);
  if (!itemId) {
    return fail(res, 400, '商品 ID 不合法');
  }

  try {
    const [items] = await pool.query('SELECT item_id FROM items WHERE item_id = ?', [itemId]);
    if (!items.length) {
      return fail(res, 404, '商品不存在');
    }

    await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND item_id = ?',
      [req.user.userId, itemId]
    );
    const [[row]] = await pool.query(
      'SELECT favorite_count AS favoriteCount FROM items WHERE item_id = ?',
      [itemId]
    );
    return ok(res, { favorited: false, favoriteCount: row.favoriteCount });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
