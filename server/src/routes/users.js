const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { isValidZone, isValidPlace, zoneOfPlace } = require('../utils/campus');
const {
  ITEM_SIZES,
  AVAILABILITY_TYPES,
  formatDateTime,
  parseDateOnly,
  isValidTime,
  weekdayOfDateString,
  asArray,
  isScheduleNow,
  hasFutureSlot,
  nextBoundaryToday,
  activeWeeklyEnd,
  effectiveOnline
} = require('../utils/runner');

const router = express.Router();

router.use(auth);

const USER_FIELDS = `user_id AS userId, student_no AS studentNo, nickname,
  avatar_url AS avatarUrl, campus, college, phone,
  credit_score AS creditScore, status, created_at AS createdAt`;

const PROFILE_FIELDS = `user_id AS userId, is_online AS isOnline,
  availability_type AS availabilityType, service_areas AS serviceAreas,
  service_places AS servicePlaces, time_slots AS timeSlots,
  manual_until AS manualUntil, base_price AS basePrice, remark,
  completed_count AS completedCount`;

const DEFAULT_SERVICE_AREA = '北区其他';

function readTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }
  return null;
}

function charLength(value) {
  return Array.from(value).length;
}

function sameSchedule(a, b) {
  const normalize = (slot) => JSON.stringify({
    type: slot.type,
    date: slot.date || null,
    start: slot.start,
    end: slot.end,
    weekdays: Array.isArray(slot.weekdays) ? [...slot.weekdays].sort((x, y) => x - y) : null,
    from: slot.from || null
  });
  return normalize(a) === normalize(b);
}

function schedulesOverlap(a, b) {
  if (!(a.start < b.end && b.start < a.end)) {
    return false;
  }
  if (a.type === 'once' && b.type === 'once') {
    return a.date === b.date;
  }
  if (a.type === 'weekly' && b.type === 'weekly') {
    return a.weekdays.some((day) => b.weekdays.includes(day));
  }
  const once = a.type === 'once' ? a : b;
  const weekly = a.type === 'weekly' ? a : b;
  return once.date >= weekly.from && weekly.weekdays.includes(weekdayOfDateString(once.date));
}

function validateTimeSlots(raw, availabilityType, now) {
  const input = raw === undefined || raw === null ? [] : raw;
  if (!Array.isArray(input)) {
    return { error: '在线计划格式错误' };
  }

  const slots = [];
  const ids = new Set();

  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: '在线计划格式错误' };
    }
    const id = readTrimmed(item.id);
    if (!id || id.length > 64 || ids.has(id)) {
      return { error: '在线计划格式错误' };
    }
    if (!isValidTime(item.start) || !isValidTime(item.end) || item.start >= item.end) {
      return { error: '在线计划格式错误' };
    }
    ids.add(id);

    if (item.type === 'once') {
      if (!parseDateOnly(item.date)) {
        return { error: '在线计划格式错误' };
      }
      slots.push({ id, type: 'once', date: item.date, start: item.start, end: item.end });
    } else if (item.type === 'weekly') {
      if (!parseDateOnly(item.from) || !Array.isArray(item.weekdays) || item.weekdays.length === 0) {
        return { error: '在线计划格式错误' };
      }
      const weekdays = [];
      for (const day of item.weekdays) {
        if (!Number.isInteger(day) || day < 1 || day > 7 || weekdays.includes(day)) {
          return { error: '在线计划格式错误' };
        }
        weekdays.push(day);
      }
      weekdays.sort((x, y) => x - y);
      slots.push({ id, type: 'weekly', weekdays, start: item.start, end: item.end, from: item.from });
    } else {
      return { error: '在线计划格式错误' };
    }
  }

  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (schedulesOverlap(slots[i], slots[j])) {
        return { error: '在线计划格式错误' };
      }
    }
  }

  if (availabilityType === 'slot' && !hasFutureSlot(slots, now)) {
    return { error: '按计划上线至少需要一条未来计划' };
  }
  return { slots };
}

function parseProfile(row, itemSizes) {
  return {
    userId: row.userId,
    isOnline: Boolean(row.isOnline),
    availabilityType: row.availabilityType,
    serviceAreas: asArray(row.serviceAreas),
    servicePlaces: asArray(row.servicePlaces),
    timeSlots: asArray(row.timeSlots),
    manualUntil: row.manualUntil || null,
    itemSizes,
    basePrice: row.basePrice === undefined ? null : row.basePrice,
    remark: row.remark || '',
    completedCount: row.completedCount
  };
}

function defaultProfile(userId) {
  return {
    userId,
    isOnline: false,
    availabilityType: 'slot',
    serviceAreas: [],
    servicePlaces: [],
    timeSlots: [],
    manualUntil: null,
    itemSizes: [],
    basePrice: null,
    remark: '',
    completedCount: 0
  };
}

async function loadRunnerProfile(userId, executor = pool, lock = false) {
  const [rows] = await executor.query(
    `SELECT ${PROFILE_FIELDS} FROM runner_profiles WHERE user_id = ?${lock ? ' FOR UPDATE' : ''}`,
    [userId]
  );
  if (!rows.length) {
    return { exists: false, profile: defaultProfile(userId) };
  }
  const [sizes] = await executor.query(
    `SELECT item_size AS itemSize
       FROM runner_item_sizes
      WHERE user_id = ?
      ORDER BY FIELD(item_size, 'small', 'medium', 'large')`,
    [userId]
  );
  return {
    exists: true,
    profile: parseProfile(rows[0], sizes.map((row) => row.itemSize))
  };
}

router.get('/me/runner-profile', async (req, res, next) => {
  try {
    const { profile } = await loadRunnerProfile(req.user.userId);
    return ok(res, profile);
  } catch (err) {
    return next(err);
  }
});

router.put('/me/runner-profile', async (req, res, next) => {
  const body = req.body || {};
  const now = new Date();

  if (!Array.isArray(body.serviceAreas) || body.serviceAreas.length === 0) {
    return fail(res, 400, '服务片区至少选择一个');
  }
  const serviceAreas = [...new Set(body.serviceAreas.map((value) => readTrimmed(value)))];
  if (serviceAreas.some((value) => !isValidZone(value))) {
    return fail(res, 400, '服务片区不在可选范围内');
  }

  const rawPlaces = body.servicePlaces === undefined || body.servicePlaces === null ? [] : body.servicePlaces;
  if (!Array.isArray(rawPlaces)) {
    return fail(res, 400, '地标与片区不匹配');
  }
  const servicePlaces = [...new Set(rawPlaces.map((value) => readTrimmed(value)))];
  if (servicePlaces.some((value) => !isValidPlace(value) || !serviceAreas.includes(zoneOfPlace(value)))) {
    return fail(res, 400, '地标与片区不匹配');
  }

  const availabilityType = readTrimmed(body.availabilityType);
  if (!AVAILABILITY_TYPES.includes(availabilityType)) {
    return fail(res, 400, '在线方式不合法');
  }

  const slotsResult = validateTimeSlots(body.timeSlots, availabilityType, now);
  if (slotsResult.error) {
    return fail(res, 400, slotsResult.error);
  }
  const timeSlots = slotsResult.slots;

  const rawSizes = body.itemSizes === undefined || body.itemSizes === null ? [] : body.itemSizes;
  if (!Array.isArray(rawSizes)) {
    return fail(res, 400, '可接规格不合法');
  }
  const itemSizes = [...new Set(rawSizes)];
  if (itemSizes.some((value) => !ITEM_SIZES.includes(value))) {
    return fail(res, 400, '可接规格不合法');
  }
  itemSizes.sort((a, b) => ITEM_SIZES.indexOf(a) - ITEM_SIZES.indexOf(b));

  let basePrice = null;
  if (body.basePrice !== undefined && body.basePrice !== null && body.basePrice !== '') {
    if (typeof body.basePrice === 'number') {
      basePrice = body.basePrice;
    } else if (typeof body.basePrice === 'string' && body.basePrice.trim() !== '') {
      basePrice = Number(body.basePrice.trim());
    } else {
      return fail(res, 400, '报价格式不正确');
    }
    if (!Number.isFinite(basePrice) || basePrice > 99999999.99) {
      return fail(res, 400, '报价格式不正确');
    }
    if (basePrice < 0) {
      return fail(res, 400, '报价不能为负数');
    }
  }

  let remark = '';
  if (body.remark !== undefined && body.remark !== null) {
    if (typeof body.remark !== 'string') {
      return fail(res, 400, '备注格式不正确');
    }
    remark = body.remark.trim();
  }
  if (charLength(remark) > 255) {
    return fail(res, 400, '备注不能超过 255 字');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [oldRows] = await conn.query(
      `SELECT ${PROFILE_FIELDS} FROM runner_profiles WHERE user_id = ? FOR UPDATE`,
      [req.user.userId]
    );
    const oldProfile = oldRows.length
      ? parseProfile(oldRows[0], [])
      : null;

    let isOnline = availabilityType === 'slot'
      ? (isScheduleNow(timeSlots, now) ? 1 : 0)
      : (oldProfile && effectiveOnline(oldProfile, now) ? 1 : 0);
    let manualUntil = null;

    if (availabilityType === 'slot' && oldProfile && oldProfile.availabilityType === 'slot') {
      for (const oldSlot of oldProfile.timeSlots) {
        const end = activeWeeklyEnd(oldSlot, now);
        if (!end) {
          continue;
        }
        const newSlot = timeSlots.find((slot) => slot.id === oldSlot.id);
        if (!newSlot || !sameSchedule(oldSlot, newSlot)) {
          isOnline = effectiveOnline(oldProfile, now) ? 1 : 0;
          manualUntil = formatDateTime(end);
          break;
        }
      }
    }

    await conn.query(
      `INSERT INTO runner_profiles
         (user_id, is_online, availability_type, service_areas, service_places,
          time_slots, manual_until, base_price, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_online = VALUES(is_online),
         availability_type = VALUES(availability_type),
         service_areas = VALUES(service_areas),
         service_places = VALUES(service_places),
         time_slots = VALUES(time_slots),
         manual_until = VALUES(manual_until),
         base_price = VALUES(base_price),
         remark = VALUES(remark)`,
      [
        req.user.userId,
        isOnline,
        availabilityType,
        JSON.stringify(serviceAreas),
        JSON.stringify(servicePlaces),
        JSON.stringify(timeSlots),
        manualUntil,
        basePrice,
        remark || null
      ]
    );

    await conn.query('DELETE FROM runner_item_sizes WHERE user_id = ?', [req.user.userId]);
    if (itemSizes.length) {
      const rows = itemSizes.map((size) => [req.user.userId, size]);
      await conn.query('INSERT INTO runner_item_sizes (user_id, item_size) VALUES ?', [rows]);
    }

    await conn.commit();
    const { profile } = await loadRunnerProfile(req.user.userId, conn);
    return ok(res, profile, '保存成功');
  } catch (err) {
    await conn.rollback();
    return next(err);
  } finally {
    conn.release();
  }
});

router.put('/me/online', async (req, res, next) => {
  const body = req.body || {};
  if (typeof body.isOnline !== 'boolean') {
    return fail(res, 400, 'isOnline 必须为布尔值');
  }

  if (body.availabilityType !== undefined && !AVAILABILITY_TYPES.includes(body.availabilityType)) {
    return fail(res, 400, '在线方式不合法');
  }

  let scope = null;
  let scheduleId = '';
  if (body.scope !== undefined) {
    if (!['once', 'future'].includes(body.scope)) {
      return fail(res, 400, 'scope 不合法');
    }
    scope = body.scope;
    scheduleId = readTrimmed(body.scheduleId);
    if (!scheduleId) {
      return fail(res, 400, 'scheduleId 不能为空');
    }
  }

  const now = new Date();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT ${PROFILE_FIELDS} FROM runner_profiles WHERE user_id = ? FOR UPDATE`,
      [req.user.userId]
    );
    const exists = rows.length > 0;
    const profile = exists ? parseProfile(rows[0], []) : null;
    const availabilityType = body.availabilityType || (profile ? profile.availabilityType : 'now');

    if (availabilityType === 'now') {
      if (!exists) {
        await conn.query(
          `INSERT INTO runner_profiles
             (user_id, is_online, availability_type, service_areas, service_places,
              time_slots, manual_until, base_price, remark)
           VALUES (?, ?, 'now', ?, JSON_ARRAY(), JSON_ARRAY(), NULL, NULL, NULL)`,
          [req.user.userId, body.isOnline ? 1 : 0, JSON.stringify([DEFAULT_SERVICE_AREA])]
        );
      } else {
        await conn.query(
          `UPDATE runner_profiles
              SET is_online = ?, availability_type = 'now', manual_until = NULL
            WHERE user_id = ?`,
          [body.isOnline ? 1 : 0, req.user.userId]
        );
      }

      await conn.commit();
      return ok(res, {
        isOnline: body.isOnline,
        availabilityType: 'now',
        manualUntil: null
      });
    }

    if (!profile) {
      await conn.rollback();
      return fail(res, 400, '请先保存接单设置');
    }
    if (!hasFutureSlot(profile.timeSlots, now)) {
      await conn.rollback();
      return fail(res, 400, '按计划上线至少需要一条未来计划');
    }

    let timeSlots = profile.timeSlots;
    let manualUntil = null;
    let nextAvailabilityType = 'slot';
    let isOnline = body.isOnline ? 1 : 0;

    if (scope && body.isOnline === false) {
      const schedule = timeSlots.find((slot) => slot.id === scheduleId);
      if (!schedule) {
        await conn.rollback();
        return fail(res, 400, '该在线计划不存在');
      }

      if (scope === 'once') {
        manualUntil = formatDateTime(activeWeeklyEnd(schedule, now) || nextBoundaryToday(timeSlots, now));
      } else {
        timeSlots = timeSlots.filter((slot) => slot.id !== scheduleId);
        if (!timeSlots.length) {
          nextAvailabilityType = 'now';
          manualUntil = null;
        } else {
          manualUntil = formatDateTime(nextBoundaryToday(timeSlots, now));
        }
      }
    } else {
      manualUntil = formatDateTime(nextBoundaryToday(timeSlots, now));
    }

    await conn.query(
      `UPDATE runner_profiles
          SET is_online = ?, availability_type = ?, time_slots = ?, manual_until = ?
        WHERE user_id = ?`,
      [isOnline, nextAvailabilityType, JSON.stringify(timeSlots), manualUntil, req.user.userId]
    );

    await conn.commit();
    return ok(res, {
      isOnline: Boolean(isOnline),
      availabilityType: nextAvailabilityType,
      manualUntil
    });
  } catch (err) {
    await conn.rollback();
    return next(err);
  } finally {
    conn.release();
  }
});

router.put('/me', async (req, res, next) => {
  const body = req.body || {};
  const updates = [];
  const params = [];

  if (Object.prototype.hasOwnProperty.call(body, 'nickname')) {
    const nickname = readTrimmed(body.nickname);
    if (charLength(nickname) < 2 || charLength(nickname) > 12) {
      return fail(res, 400, '昵称需 2-12 个字符');
    }
    updates.push('nickname = ?');
    params.push(nickname);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'avatarUrl')) {
    let avatarUrl = body.avatarUrl;
    if (avatarUrl === null || avatarUrl === '') {
      avatarUrl = null;
    } else {
      if (typeof avatarUrl !== 'string') {
        return fail(res, 400, '头像地址不合法');
      }
      avatarUrl = avatarUrl.trim();
      if (!avatarUrl.startsWith('/uploads/') || avatarUrl.length > 255) {
        return fail(res, 400, '头像地址不合法');
      }
    }
    updates.push('avatar_url = ?');
    params.push(avatarUrl);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'college')) {
    let college = body.college;
    if (college === null || college === '') {
      college = null;
    } else {
      if (typeof college !== 'string') {
        return fail(res, 400, '学院名称不合法');
      }
      college = college.trim();
      if (charLength(college) > 100) {
        return fail(res, 400, '学院名称过长');
      }
      if (!college) {
        college = null;
      }
    }
    updates.push('college = ?');
    params.push(college);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
    let phone = body.phone;
    if (phone === null || phone === '') {
      phone = null;
    } else {
      if (typeof phone !== 'string' || !/^\d{11}$/.test(phone.trim())) {
        return fail(res, 400, '手机号格式不正确');
      }
      phone = phone.trim();
    }
    updates.push('phone = ?');
    params.push(phone);
  }

  try {
    if (updates.length) {
      params.push(req.user.userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }
    const [rows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE user_id = ?`,
      [req.user.userId]
    );
    return ok(res, { userInfo: rows[0] }, '保存成功');
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const userId = parsePositiveInt(req.params.id);
  if (!userId) {
    return fail(res, 400, '用户 ID 不合法');
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id AS userId, nickname, avatar_url AS avatarUrl, credit_score AS creditScore
         FROM users
        WHERE user_id = ?`,
      [userId]
    );
    if (!rows.length) {
      return fail(res, 404, '用户不存在');
    }
    return ok(res, rows[0]);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
