const cron = require('node-cron');
const pool = require('../db');
const { asArray, effectiveOnline, parseDateTime } = require('../utils/runner');

let task = null;

async function runOnce(now = new Date()) {
  const [rows] = await pool.query(
    `SELECT user_id AS userId, is_online AS isOnline,
            availability_type AS availabilityType,
            time_slots AS timeSlots, manual_until AS manualUntil
       FROM runner_profiles
      WHERE availability_type = 'slot'`
  );

  let updated = 0;
  for (const row of rows) {
    const manualUntil = row.manualUntil ? parseDateTime(row.manualUntil) : null;
    if (manualUntil && manualUntil > now) {
      continue;
    }

    const profile = {
      isOnline: Boolean(row.isOnline),
      availabilityType: row.availabilityType,
      timeSlots: asArray(row.timeSlots),
      manualUntil: null
    };
    const shouldOnline = effectiveOnline(profile, now) ? 1 : 0;
    const hasExpiredManual = row.manualUntil !== null && row.manualUntil !== undefined;

    if (shouldOnline !== Number(row.isOnline) || hasExpiredManual) {
      await pool.query(
        `UPDATE runner_profiles
            SET is_online = ?, manual_until = NULL
          WHERE user_id = ?`,
        [shouldOnline, row.userId]
      );
      updated += 1;
    }
  }

  return { scanned: rows.length, updated };
}

function start() {
  if (task) {
    return task;
  }

  runOnce()
    .then(({ scanned, updated }) => {
      console.log(`[runnerOnline] 启动补算完成：扫描 ${scanned}，更新 ${updated}`);
    })
    .catch((err) => {
      console.error('[runnerOnline] 启动补算失败', err);
    });

  task = cron.schedule('* * * * *', () => {
    runOnce()
      .then(({ updated }) => {
        if (updated > 0) {
          console.log(`[runnerOnline] 自动上下线更新 ${updated} 人`);
        }
      })
      .catch((err) => {
        console.error('[runnerOnline] 定时任务失败', err);
      });
  }, { timezone: 'Asia/Shanghai' });

  return task;
}

module.exports = { runOnce, start };
