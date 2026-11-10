const ITEM_SIZES = ['small', 'medium', 'large'];
const AVAILABILITY_TYPES = ['slot', 'now'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(date) {
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function parseDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const [datePart, timePart] = value.split(' ');
  const date = parseDateOnly(datePart);
  if (!date) {
    return null;
  }
  const [hour, minute, second] = timePart.split(':').map(Number);
  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second);
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function combineDateTime(dateStr, timeStr) {
  const date = typeof dateStr === 'string' ? parseDateOnly(dateStr) : dateStr;
  if (!(date instanceof Date) || !isValidTime(timeStr)) {
    return null;
  }
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function weekdayOf(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function weekdayOfDateString(value) {
  const date = parseDateOnly(value);
  return date ? weekdayOf(date) : null;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function isScheduleNow(slots, now = new Date()) {
  const todayStr = formatDate(now);
  for (const slot of asArray(slots)) {
    if (!slot || typeof slot !== 'object') {
      continue;
    }
    if (slot.type === 'once') {
      if (slot.date !== todayStr) {
        continue;
      }
      const start = combineDateTime(todayStr, slot.start);
      const end = combineDateTime(todayStr, slot.end);
      if (start && end && now >= start && now < end) {
        return true;
      }
    } else if (slot.type === 'weekly') {
      if (typeof slot.from !== 'string' || slot.from > todayStr) {
        continue;
      }
      if (!Array.isArray(slot.weekdays) || !slot.weekdays.includes(weekdayOf(now))) {
        continue;
      }
      const start = combineDateTime(todayStr, slot.start);
      const end = combineDateTime(todayStr, slot.end);
      if (start && end && now >= start && now < end) {
        return true;
      }
    }
  }
  return false;
}

function slotOverlapsWindow(slots, windowStart, windowEnd) {
  if (!(windowStart instanceof Date) || !(windowEnd instanceof Date) || windowStart >= windowEnd) {
    return false;
  }
  for (const slot of asArray(slots)) {
    if (!slot || typeof slot !== 'object') {
      continue;
    }
    if (slot.type === 'once') {
      const start = combineDateTime(slot.date, slot.start);
      const end = combineDateTime(slot.date, slot.end);
      if (start && end && start < windowEnd && end > windowStart) {
        return true;
      }
    } else if (slot.type === 'weekly') {
      const from = parseDateOnly(slot.from);
      if (!from || !Array.isArray(slot.weekdays)) {
        continue;
      }
      const startDay = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());
      let cursor = from > startDay ? from : startDay;
      // 连续 7 天覆盖全部星期，足以判断循环计划与窗口是否重叠
      for (let i = 0; i < 8 && cursor <= windowEnd; i += 1) {
        if (slot.weekdays.includes(weekdayOf(cursor))) {
          const dateStr = formatDate(cursor);
          const start = combineDateTime(dateStr, slot.start);
          const end = combineDateTime(dateStr, slot.end);
          if (start && end && start < windowEnd && end > windowStart) {
            return true;
          }
        }
        cursor = addDays(cursor, 1);
      }
    }
  }
  return false;
}

function hasFutureSlot(slots, now = new Date()) {
  for (const slot of asArray(slots)) {
    if (!slot || typeof slot !== 'object') {
      continue;
    }
    if (slot.type === 'once') {
      const end = combineDateTime(slot.date, slot.end);
      if (end && end > now) {
        return true;
      }
    } else if (slot.type === 'weekly') {
      if (parseDateOnly(slot.from)) {
        return true;
      }
    }
  }
  return false;
}

function nextBoundaryToday(slots, now = new Date()) {
  const todayStr = formatDate(now);
  let boundary = null;
  const consider = (time) => {
    if (time && time > now && (!boundary || time < boundary)) {
      boundary = time;
    }
  };

  for (const slot of asArray(slots)) {
    if (!slot || typeof slot !== 'object') {
      continue;
    }
    if (slot.type === 'once' && slot.date === todayStr) {
      consider(combineDateTime(todayStr, slot.start));
      consider(combineDateTime(todayStr, slot.end));
    } else if (
      slot.type === 'weekly' &&
      typeof slot.from === 'string' &&
      slot.from <= todayStr &&
      Array.isArray(slot.weekdays) &&
      slot.weekdays.includes(weekdayOf(now))
    ) {
      consider(combineDateTime(todayStr, slot.start));
      consider(combineDateTime(todayStr, slot.end));
    }
  }

  const dayEnd = combineDateTime(todayStr, '23:59');
  if (!boundary || (dayEnd && boundary > dayEnd)) {
    boundary = dayEnd;
  }
  return boundary;
}

function activeWeeklyEnd(slot, now = new Date()) {
  if (!slot || slot.type !== 'weekly') {
    return null;
  }
  const todayStr = formatDate(now);
  if (typeof slot.from !== 'string' || slot.from > todayStr) {
    return null;
  }
  if (!Array.isArray(slot.weekdays) || !slot.weekdays.includes(weekdayOf(now))) {
    return null;
  }
  const start = combineDateTime(todayStr, slot.start);
  const end = combineDateTime(todayStr, slot.end);
  if (start && end && now >= start && now < end) {
    return end;
  }
  return null;
}

function effectiveOnline(profile, now = new Date()) {
  if (profile.manualUntil) {
    const until = parseDateTime(profile.manualUntil);
    if (until && until > now) {
      return Boolean(profile.isOnline);
    }
  }
  if (profile.availabilityType === 'now') {
    return Boolean(profile.isOnline);
  }
  return isScheduleNow(profile.timeSlots, now);
}

module.exports = {
  ITEM_SIZES,
  AVAILABILITY_TYPES,
  formatDate,
  formatDateTime,
  parseDateOnly,
  parseDateTime,
  isValidTime,
  combineDateTime,
  weekdayOfDateString,
  asArray,
  isScheduleNow,
  slotOverlapsWindow,
  hasFutureSlot,
  nextBoundaryToday,
  activeWeeklyEnd,
  effectiveOnline
};
