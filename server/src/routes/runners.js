const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { isValidZone, isValidPlace, zoneOfPlace } = require('../utils/campus');
const {
  ITEM_SIZES,
  parseDateTime,
  asArray,
  slotOverlapsWindow,
  effectiveOnline
} = require('../utils/runner');

const router = express.Router();

router.use(auth);

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

router.get('/', async (req, res, next) => {
  const area = readTrimmed(req.query.area);
  if (!area) {
    return fail(res, 400, '取件片区不能为空');
  }
  if (!isValidZone(area)) {
    return fail(res, 400, '取件片区不在可选范围内');
  }

  const place = readTrimmed(req.query.place) || area;
  if (!isValidPlace(place) || zoneOfPlace(place) !== area) {
    return fail(res, 400, '地标与片区不匹配');
  }

  const timeType = readTrimmed(req.query.timeType);
  if (!['asap', 'deadline', 'range'].includes(timeType)) {
    return fail(res, 400, '时间类型不合法');
  }

  const now = new Date();
  let windowStart = now;
  let windowEnd = null;
  if (timeType === 'deadline') {
    windowEnd = parseDateTime(readTrimmed(req.query.deadline));
    if (!windowEnd || windowEnd <= now) {
      return fail(res, 400, '时间参数不完整');
    }
  } else if (timeType === 'range') {
    windowStart = parseDateTime(readTrimmed(req.query.timeStart));
    windowEnd = parseDateTime(readTrimmed(req.query.deadline));
    if (!windowStart || !windowEnd || windowStart >= windowEnd) {
      return fail(res, 400, '时间参数不完整');
    }
  }

  let itemSize = '';
  if (req.query.itemSize !== undefined && readTrimmed(req.query.itemSize) !== '') {
    itemSize = readTrimmed(req.query.itemSize);
    if (!ITEM_SIZES.includes(itemSize)) {
      return fail(res, 400, '物品规格不合法');
    }
  }

  const page = req.query.page === undefined ? 1 : parsePositiveInt(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 10 : parsePositiveInt(req.query.pageSize);
  if (!page || !pageSize || pageSize > 50) {
    return fail(res, 400, '页码或每页条数不合法');
  }

  try {
    const [rows] = await pool.query(
      `SELECT rp.user_id AS userId, u.nickname, u.avatar_url AS avatarUrl,
              u.credit_score AS creditScore, rp.completed_count AS completedCount,
              rp.service_areas AS serviceAreas, rp.service_places AS servicePlaces,
              rp.availability_type AS availabilityType, rp.is_online AS isOnline,
              rp.time_slots AS timeSlots, rp.manual_until AS manualUntil,
              rp.base_price AS basePrice, rp.remark
         FROM runner_profiles rp
         JOIN users u ON u.user_id = rp.user_id
        WHERE u.status = 'active'
          AND JSON_CONTAINS(rp.service_areas, JSON_QUOTE(?))
        ORDER BY rp.completed_count DESC, u.credit_score DESC, rp.user_id ASC`,
      [area]
    );

    const userIds = rows.map((row) => row.userId);
    const sizeMap = new Map();
    if (userIds.length) {
      const [sizeRows] = await pool.query(
        `SELECT user_id AS userId, item_size AS itemSize
           FROM runner_item_sizes
          WHERE user_id IN (?)`,
        [userIds]
      );
      for (const row of sizeRows) {
        if (!sizeMap.has(row.userId)) {
          sizeMap.set(row.userId, []);
        }
        sizeMap.get(row.userId).push(row.itemSize);
      }
      for (const sizes of sizeMap.values()) {
        sizes.sort((a, b) => ITEM_SIZES.indexOf(a) - ITEM_SIZES.indexOf(b));
      }
    }

    const matched = [];
    for (const row of rows) {
      const serviceAreas = asArray(row.serviceAreas);
      const servicePlaces = asArray(row.servicePlaces);
      if (!serviceAreas.includes(area)) {
        continue;
      }
      if (servicePlaces.length && !servicePlaces.includes(place) && !servicePlaces.includes(area)) {
        continue;
      }

      const itemSizes = sizeMap.get(row.userId) || [];
      if (itemSize && itemSizes.length && !itemSizes.includes(itemSize)) {
        continue;
      }

      const timeSlots = asArray(row.timeSlots);
      const profile = {
        isOnline: Boolean(row.isOnline),
        availabilityType: row.availabilityType,
        timeSlots,
        manualUntil: row.manualUntil || null
      };

      if (timeType === 'asap') {
        if (!effectiveOnline(profile, now)) {
          continue;
        }
      } else if (!slotOverlapsWindow(timeSlots, windowStart, windowEnd)) {
        if (profile.availabilityType !== 'now' || !profile.isOnline) {
          continue;
        }
      }

      matched.push({
        userId: row.userId,
        nickname: row.nickname,
        avatarUrl: row.avatarUrl,
        creditScore: row.creditScore,
        completedCount: row.completedCount,
        serviceAreas,
        servicePlaces,
        availabilityType: row.availabilityType,
        isOnline: effectiveOnline(profile, now),
        timeSlots,
        itemSizes,
        basePrice: row.basePrice,
        remark: row.remark || ''
      });
    }

    const offset = (page - 1) * pageSize;
    return ok(res, {
      list: matched.slice(offset, offset + pageSize),
      total: matched.length,
      page,
      pageSize
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
