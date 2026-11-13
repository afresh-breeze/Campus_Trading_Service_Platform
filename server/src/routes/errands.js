const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { isValidZone, isValidPlace, zoneOfPlace } = require('../utils/campus');
const { ITEM_SIZES, parseDateTime } = require('../utils/runner');
const {
  readTrimmed,
  parsePositiveInt,
  parsePagination,
  toNumber
} = require('../utils/item');

const router = express.Router();

const ERRAND_STATUSES = ['pending', 'taken', 'completed', 'cancelled'];
const ERRAND_VISIBILITIES = ['private', 'hall'];
const TIME_TYPES = ['asap', 'deadline', 'range'];
const ROLES = ['publisher', 'runner'];
const MAX_REWARD = 99999999.99;
const SORT_ORDERS = {
  latest: 'e.created_at DESC, e.order_id DESC',
  reward_desc: 'e.reward DESC, e.order_id DESC',
  reward_asc: 'e.reward ASC, e.order_id DESC'
};

const BASE_FIELDS = `
  e.order_id           AS orderId,
  e.publisher_id       AS publisherId,
  p.nickname           AS publisherNickname,
  p.avatar_url         AS publisherAvatar,
  p.credit_score       AS publisherCreditScore,
  e.pickup_area        AS pickupArea,
  e.pickup_place       AS pickupPlace,
  e.delivery_location  AS deliveryLocation,
  e.item_size          AS itemSize,
  e.item_desc          AS itemDesc,
  e.remark             AS remark,
  e.reward             AS reward,
  e.time_type          AS timeType,
  e.time_start         AS timeStart,
  e.deadline           AS deadline,
  e.status             AS status,
  e.visibility         AS visibility,
  e.created_at         AS createdAt`;

const DETAIL_FIELDS = `${BASE_FIELDS},
  e.runner_id          AS runnerId,
  r.nickname           AS runnerNickname,
  r.avatar_url         AS runnerAvatar,
  e.taken_at           AS takenAt,
  e.completed_at       AS completedAt`;

const BASE_JOIN = `
  FROM errand_orders e
  JOIN users p ON p.user_id = e.publisher_id`;

const DETAIL_JOIN = `
  FROM errand_orders e
  JOIN users p ON p.user_id = e.publisher_id
  LEFT JOIN users r ON r.user_id = e.runner_id`;

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

function readTime(value) {
  const text = readTrimmed(value);
  if (!text) {
    return { text: '', date: null, empty: true };
  }
  return { text, date: parseDateTime(text), empty: false };
}

function readStatusFilter(value) {
  if (value === undefined || value === '') {
    return { status: '', error: '' };
  }
  const status = readTrimmed(value);
  if (!ERRAND_STATUSES.includes(status)) {
    return { status: '', error: '订单状态不合法' };
  }
  return { status, error: '' };
}

function readCommaList(value) {
  if (value === undefined || value === null || value === '') {
    return { list: [], error: '' };
  }
  const values = [];
  const parts = Array.isArray(value) ? value : [value];
  for (const part of parts) {
    if (typeof part !== 'string') {
      return { list: [], error: '参数错误' };
    }
    for (const token of part.split(',')) {
      const text = token.trim();
      if (text) values.push(text);
    }
  }
  return { list: Array.from(new Set(values)), error: '' };
}

function readAreaFilter(value) {
  const parsed = readCommaList(value);
  if (parsed.error) return parsed;
  for (const area of parsed.list) {
    if (!isValidZone(area)) {
      return { list: [], error: '取件片区不在可选范围内' };
    }
  }
  return parsed;
}

function readItemSizeFilter(value) {
  const parsed = readCommaList(value);
  if (parsed.error) return parsed;
  for (const size of parsed.list) {
    if (!ITEM_SIZES.includes(size)) {
      return { list: [], error: '物品规格不合法' };
    }
  }
  return parsed;
}

function readTimeTypeFilter(value) {
  const parsed = readCommaList(value);
  if (parsed.error) return parsed;
  for (const type of parsed.list) {
    if (!TIME_TYPES.includes(type)) {
      return { list: [], error: '时间类型不合法' };
    }
  }
  return parsed;
}

function readSort(value) {
  if (value === undefined || value === null || value === '') {
    return { sort: 'latest', error: '' };
  }
  if (typeof value !== 'string') {
    return { sort: 'latest', error: '排序方式不合法' };
  }
  const sort = value.trim() || 'latest';
  if (!Object.prototype.hasOwnProperty.call(SORT_ORDERS, sort)) {
    return { sort: 'latest', error: '排序方式不合法' };
  }
  return { sort, error: '' };
}

function parseErrandPayload(body) {
  const pickupArea = readTrimmed(body.pickupArea);
  if (!pickupArea) {
    return { error: '取件片区不能为空' };
  }
  if (!isValidZone(pickupArea)) {
    return { error: '取件片区不在可选范围内' };
  }

  const pickupPlace = readTrimmed(body.pickupPlace);
  if (!pickupPlace) {
    return { error: '取件地标不能为空' };
  }
  if (!isValidPlace(pickupPlace) || zoneOfPlace(pickupPlace) !== pickupArea) {
    return { error: '地标与片区不匹配' };
  }

  const deliveryLocation = readTrimmed(body.deliveryLocation);
  if (!deliveryLocation) {
    return { error: '送达地点不能为空' };
  }
  if (deliveryLocation.length > 100) {
    return { error: '送达地点不能超过 100 字' };
  }

  const itemSize = readTrimmed(body.itemSize);
  if (!ITEM_SIZES.includes(itemSize)) {
    return { error: '物品规格不合法' };
  }

  const itemDesc = readOptionalText(body.itemDesc, 500, '物品描述');
  if (itemDesc.error) {
    return { error: itemDesc.error };
  }

  const remark = readOptionalText(body.remark, 255, '备注');
  if (remark.error) {
    return { error: remark.error };
  }

  if (body.reward === undefined || body.reward === null || body.reward === '') {
    return { error: '报酬不能为空' };
  }
  const reward = toNumber(body.reward);
  if (reward === null) {
    return { error: '报酬格式不正确' };
  }
  if (reward < 0) {
    return { error: '报酬不能为负数' };
  }
  if (reward > MAX_REWARD) {
    return { error: '报酬超出范围' };
  }

  const timeType = readTrimmed(body.timeType);
  if (!TIME_TYPES.includes(timeType)) {
    return { error: '时间类型不合法' };
  }

  const timeStart = readTime(body.timeStart);
  const deadline = readTime(body.deadline);
  let timeStartValue = null;
  let deadlineValue = null;

  if (timeType === 'asap') {
    if (!timeStart.empty || !deadline.empty) {
      return { error: '时间参数不完整' };
    }
  } else if (timeType === 'deadline') {
    if (!timeStart.empty || deadline.empty || !deadline.date) {
      return { error: '时间参数不完整' };
    }
    deadlineValue = deadline.text;
  } else {
    if (timeStart.empty || deadline.empty || !timeStart.date || !deadline.date) {
      return { error: '时间参数不完整' };
    }
    if (timeStart.date >= deadline.date) {
      return { error: '时间参数不完整' };
    }
    timeStartValue = timeStart.text;
    deadlineValue = deadline.text;
  }

  return {
    error: '',
    data: {
      pickupArea,
      pickupPlace,
      deliveryLocation,
      itemSize,
      itemDesc: itemDesc.value,
      remark: remark.value,
      reward,
      timeType,
      timeStart: timeStartValue,
      deadline: deadlineValue
    }
  };
}

async function isErrandChatPeer(conn, orderId, publisherId, userId) {
  const [rows] = await conn.query(
    `SELECT 1
       FROM conversations
      WHERE biz_type = 'errand'
        AND biz_id = ?
        AND user_a_id = LEAST(?, ?)
        AND user_b_id = GREATEST(?, ?)
      LIMIT 1`,
    [orderId, publisherId, userId, publisherId, userId]
  );
  return rows.length > 0;
}

router.get('/', async (req, res, next) => {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  const statusFilter = readStatusFilter(req.query.status);
  if (statusFilter.error) {
    return fail(res, 400, statusFilter.error);
  }
  const status = statusFilter.status || 'pending';

  const areaFilter = readAreaFilter(req.query.area);
  if (areaFilter.error) {
    return fail(res, 400, areaFilter.error);
  }
  const itemSizeFilter = readItemSizeFilter(req.query.itemSize);
  if (itemSizeFilter.error) {
    return fail(res, 400, itemSizeFilter.error);
  }
  const timeTypeFilter = readTimeTypeFilter(req.query.timeType);
  if (timeTypeFilter.error) {
    return fail(res, 400, timeTypeFilter.error);
  }
  const sortFilter = readSort(req.query.sort);
  if (sortFilter.error) {
    return fail(res, 400, sortFilter.error);
  }

  const where = ["e.status = ?", "e.visibility = 'hall'"];
  const params = [status];
  if (areaFilter.list.length) {
    where.push('e.pickup_area IN (?)');
    params.push(areaFilter.list);
  }
  if (itemSizeFilter.list.length) {
    where.push('e.item_size IN (?)');
    params.push(itemSizeFilter.list);
  }
  if (timeTypeFilter.list.length) {
    where.push('e.time_type IN (?)');
    params.push(timeTypeFilter.list);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (pagination.page - 1) * pagination.pageSize;

  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM errand_orders e ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT ${BASE_FIELDS}
       ${BASE_JOIN}
       ${whereSql}
       ORDER BY ${SORT_ORDERS[sortFilter.sort]}
       LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, offset]
    );

    return ok(res, {
      list: rows,
      total: countRow.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/mine', async (req, res, next) => {
  const role = readTrimmed(req.query.role);
  if (!ROLES.includes(role)) {
    return fail(res, 400, 'role 只能是 publisher 或 runner');
  }

  const pagination = parsePagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  const statusFilter = readStatusFilter(req.query.status);
  if (statusFilter.error) {
    return fail(res, 400, statusFilter.error);
  }

  const where = [role === 'publisher' ? 'e.publisher_id = ?' : 'e.runner_id = ?'];
  const params = [req.user.userId];
  if (statusFilter.status) {
    where.push('e.status = ?');
    params.push(statusFilter.status);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (pagination.page - 1) * pagination.pageSize;

  try {
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM errand_orders e ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT ${DETAIL_FIELDS}
       ${DETAIL_JOIN}
       ${whereSql}
       ORDER BY e.created_at DESC, e.order_id DESC
       LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, offset]
    );

    return ok(res, {
      list: rows,
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

  const visibility = readTrimmed(body.visibility) || 'hall';
  if (!ERRAND_VISIBILITIES.includes(visibility)) {
    return fail(res, 400, '可见性不合法');
  }

  const parsed = parseErrandPayload(body);
  if (parsed.error) {
    return fail(res, 400, parsed.error);
  }
  const data = parsed.data;

  try {
    const [result] = await pool.query(
      `INSERT INTO errand_orders
         (publisher_id, pickup_area, pickup_place, delivery_location, item_size,
          item_desc, remark, reward, time_type, time_start, deadline, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        data.pickupArea,
        data.pickupPlace,
        data.deliveryLocation,
        data.itemSize,
        data.itemDesc,
        data.remark,
        data.reward,
        data.timeType,
        data.timeStart,
        data.deadline,
        visibility
      ]
    );

    return ok(
      res,
      { orderId: result.insertId, visibility },
      visibility === 'private' ? '订单已创建，尚未发布到大厅' : '发布成功'
    );
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  try {
    const [rows] = await pool.query(
      `SELECT ${DETAIL_FIELDS} ${DETAIL_JOIN} WHERE e.order_id = ?`,
      [orderId]
    );
    if (!rows.length) {
      return fail(res, 404, '订单不存在');
    }

    const order = rows[0];
    const isPublisher = order.publisherId === req.user.userId;
    const isRunner = order.runnerId !== null && order.runnerId === req.user.userId;
    const isChatPeer =
      order.visibility === 'private' && !isPublisher
        ? await isErrandChatPeer(pool, orderId, order.publisherId, req.user.userId)
        : false;

    if (order.visibility === 'private' && !isPublisher && !isRunner && !isChatPeer) {
      return fail(res, 404, '订单不存在');
    }

    const editable =
      isPublisher && order.status === 'pending' && order.visibility === 'private';

    return ok(res, {
      ...order,
      canTake:
        !isPublisher &&
        order.status === 'pending' &&
        (order.visibility === 'hall' || isChatPeer),
      canEdit: editable,
      canPublish: editable,
      canComplete: isPublisher && order.status === 'taken',
      canCancel: isPublisher && (order.status === 'pending' || order.status === 'taken'),
      canRelease: isRunner && order.status === 'taken'
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const parsed = parseErrandPayload(req.body || {});
  if (parsed.error) {
    return fail(res, 400, parsed.error);
  }
  const data = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT publisher_id AS publisherId, status, visibility
         FROM errand_orders
        WHERE order_id = ?
        FOR UPDATE`,
      [orderId]
    );
    if (!rows.length) {
      await conn.rollback();
      return fail(res, 404, '订单不存在');
    }
    if (rows[0].publisherId !== req.user.userId) {
      await conn.rollback();
      return fail(res, 403, '只有发布者可以修改订单');
    }
    if (rows[0].status !== 'pending' || rows[0].visibility !== 'private') {
      await conn.rollback();
      return fail(res, 409, '只有未发布的待接单私单可以修改');
    }

    await conn.query(
      `UPDATE errand_orders
          SET pickup_area = ?, pickup_place = ?, delivery_location = ?,
              item_size = ?, item_desc = ?, remark = ?, reward = ?,
              time_type = ?, time_start = ?, deadline = ?
        WHERE order_id = ?`,
      [
        data.pickupArea,
        data.pickupPlace,
        data.deliveryLocation,
        data.itemSize,
        data.itemDesc,
        data.remark,
        data.reward,
        data.timeType,
        data.timeStart,
        data.deadline,
        orderId
      ]
    );
    await conn.commit();
    return ok(res, { orderId, visibility: 'private' }, '保存成功');
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      // ignore rollback error
    }
    return next(err);
  } finally {
    conn.release();
  }
});

router.post('/:id/publish', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT publisher_id AS publisherId, status, visibility
         FROM errand_orders
        WHERE order_id = ?
        FOR UPDATE`,
      [orderId]
    );
    if (!rows.length) {
      await conn.rollback();
      return fail(res, 404, '订单不存在');
    }
    if (rows[0].publisherId !== req.user.userId) {
      await conn.rollback();
      return fail(res, 403, '只有发布者可以发布订单');
    }
    if (rows[0].status !== 'pending') {
      await conn.rollback();
      return fail(res, 409, '当前订单不能发布到大厅');
    }
    if (rows[0].visibility === 'hall') {
      await conn.rollback();
      return fail(res, 409, '订单已在大厅');
    }

    await conn.query(
      "UPDATE errand_orders SET visibility = 'hall' WHERE order_id = ?",
      [orderId]
    );
    await conn.commit();
    return ok(res, { orderId, status: 'pending', visibility: 'hall' }, '已发布到大厅');
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      // ignore rollback error
    }
    return next(err);
  } finally {
    conn.release();
  }
});

router.post('/:id/take', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_take_errand(?, ?, @code)', [orderId, req.user.userId]);
    const [[row]] = await conn.query('SELECT @code AS code');
    const code = Number(row.code);

    if (code === 0) {
      return ok(res, { orderId, status: 'taken' }, '接单成功');
    }
    if (code === 403) {
      return fail(res, 403, '不能接自己发布的订单');
    }
    if (code === 4031) {
      return fail(res, 403, '该订单尚未发布到大厅，只有与发布者聊过该订单的跑腿可以接');
    }
    if (code === 404) {
      return fail(res, 404, '订单不存在');
    }
    if (code === 409) {
      return fail(res, 409, '该订单已被接单');
    }
    throw new Error('接单失败');
  } catch (err) {
    return next(err);
  } finally {
    try {
      await conn.query('SET @current_user_id = NULL, @code = NULL');
    } catch (resetErr) {
      // ignore reset error
    }
    conn.release();
  }
});

router.post('/:id/complete', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_complete_errand(?, ?, @code)', [orderId, req.user.userId]);
    const [[row]] = await conn.query('SELECT @code AS code');
    const code = Number(row.code);

    if (code === 0) {
      return ok(res, { orderId, status: 'completed' }, '订单已完成');
    }
    if (code === 403) {
      return fail(res, 403, '只有发布者可以确认完成');
    }
    if (code === 404) {
      return fail(res, 404, '订单不存在');
    }
    if (code === 409) {
      return fail(res, 409, '当前订单不能确认完成');
    }
    throw new Error('确认完成失败');
  } catch (err) {
    return next(err);
  } finally {
    try {
      await conn.query('SET @current_user_id = NULL, @code = NULL');
    } catch (resetErr) {
      // ignore reset error
    }
    conn.release();
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT publisher_id AS publisherId, status, visibility
         FROM errand_orders
        WHERE order_id = ?
        FOR UPDATE`,
      [orderId]
    );
    if (!rows.length) {
      await conn.rollback();
      return fail(res, 404, '订单不存在');
    }
    if (rows[0].publisherId !== req.user.userId) {
      await conn.rollback();
      return fail(res, 403, '只有发布者可以撤回订单');
    }

    const { status, visibility } = rows[0];
    if (status !== 'pending' && status !== 'taken') {
      await conn.rollback();
      return fail(res, 409, '当前订单不能撤回');
    }

    await conn.query('SET @current_user_id = ?', [req.user.userId]);

    if (status === 'pending') {
      await conn.query(
        'UPDATE errand_orders SET status = ? WHERE order_id = ?',
        ['cancelled', orderId]
      );
      await conn.commit();
      return ok(res, { orderId, status: 'cancelled' }, '订单已取消');
    }

    await conn.query(
      `UPDATE errand_orders
          SET status = 'pending', runner_id = NULL, taken_at = NULL
        WHERE order_id = ?`,
      [orderId]
    );
    await conn.commit();
    const message = visibility === 'hall' ? '订单已退回大厅' : '订单已退回待接单';
    return ok(res, { orderId, status: 'pending', visibility }, message);
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

router.post('/:id/release', async (req, res, next) => {
  const orderId = parsePositiveInt(req.params.id);
  if (!orderId) {
    return fail(res, 400, '订单 ID 不合法');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT runner_id AS runnerId, status FROM errand_orders WHERE order_id = ? FOR UPDATE',
      [orderId]
    );
    if (!rows.length) {
      await conn.rollback();
      return fail(res, 404, '订单不存在');
    }
    if (rows[0].runnerId !== req.user.userId) {
      await conn.rollback();
      return fail(res, 403, '只有接单者可以释放订单');
    }
    if (rows[0].status !== 'taken') {
      await conn.rollback();
      return fail(res, 409, '当前订单不能释放');
    }

    await conn.query('SET @current_user_id = ?', [req.user.userId]);
    await conn.query(
      `UPDATE errand_orders
          SET status = 'pending', runner_id = NULL, taken_at = NULL
        WHERE order_id = ?`,
      [orderId]
    );
    await conn.commit();
    return ok(res, { orderId, status: 'pending' }, '已释放订单');
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

module.exports = router;
