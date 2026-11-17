// 接单设置 / 上线接单 双入口页（B 成员，11-13）
// ------------------------------------------------------------------
// 两种模式（手册 §6.12）：
//   无参        = 个人中心「接单设置」，底部「保存设置」；
//   ?mode=online = 代取大厅「我要接单」，底部「保存并上线 / 下线」+ 顶部上线开关。
// 契约（对照 server/src/routes/users.js，mock.js 同构）：
//   GET  /api/users/me/runner-profile → { userId,isOnline,availabilityType,serviceAreas,
//        servicePlaces,timeSlots,manualUntil,itemSizes,basePrice,remark,completedCount }
//   PUT  /api/users/me/runner-profile ← { serviceAreas[], servicePlaces[], availabilityType,
//        timeSlots[], itemSizes[], basePrice, remark }
//   PUT  /api/users/me/online ← { isOnline:bool, availabilityType?, scope?('once'|'future'),
//        scheduleId? } → { isOnline, availabilityType, manualUntil }
// timeSlots 条目（A 的 validateTimeSlots 硬约束，前端必须拼对）：
//   once   → { id, type:'once', date:'YYYY-MM-DD', start:'HH:mm', end:'HH:mm' }
//   weekly → { id, type:'weekly', from:'YYYY-MM-DD', weekdays:[1..7], start, end }
//   id 唯一且 ≤64 字；start < end；计划之间不得重叠（重叠后端 400「在线计划格式错误」）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const campus = require('../../utils/campus');

const SIZE_OPTIONS = [
  { value: 'small', label: '小件' },
  { value: 'medium', label: '中件' },
  { value: 'large', label: '大件' }
];
const WEEKDAY_LABELS = ['', '一', '二', '三', '四', '五', '六', '日'];
const MAX_BASE_PRICE = 100;

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nowHHmm() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function weekdayOfDateStr(s) {
  const d = new Date(String(s).replace(/-/g, '/') + ' 00:00:00');
  if (isNaN(d.getTime())) return 0;
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/** 区间天数（含首尾共 span+1 天）；非法返回 -1 */
function daysBetween(a, b) {
  const ta = new Date(String(a).replace(/-/g, '/') + ' 00:00:00').getTime();
  const tb = new Date(String(b).replace(/-/g, '/') + ' 00:00:00').getTime();
  if (isNaN(ta) || isNaN(tb)) return -1;
  return Math.round((tb - ta) / 86400000);
}

/** 自定义区间最长天数（展开成逐日 once，防止选一年炸出 365 条） */
const MAX_RANGE_DAYS = 31;

/** 生成计划 id：唯一且 ≤64 字（后端约束） */
function slotId() {
  return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

/** 计划状态：进行中 / 未开始 / 已结束（只允许改删「未开始」） */
function slotStatus(slot) {
  const today = todayStr();
  const nowT = nowHHmm();
  if (slot.type === 'once') {
    if (slot.date < today) return 'past';
    if (slot.date > today) return 'future';
    return nowT >= slot.start && nowT < slot.end ? 'active' : nowT < slot.start ? 'future' : 'past';
  }
  // weekly：from 之后每个命中的星期都算 recurring
  if (slot.from > today) return 'future';
  return slot.weekdays.indexOf(weekdayOfDateStr(today)) > -1 &&
    nowT >= slot.start &&
    nowT < slot.end
    ? 'active'
    : 'future';
}

/** 计划是否与现有列表重叠（镜像 A 的 schedulesOverlap） */
function overlapsWith(list, candidate) {
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (!(a.start < candidate.end && candidate.start < a.end)) continue;
    if (a.type === 'once' && candidate.type === 'once') {
      if (a.date === candidate.date) return true;
    } else if (a.type === 'weekly' && candidate.type === 'weekly') {
      if (a.weekdays.some((d) => candidate.weekdays.indexOf(d) > -1)) return true;
    } else {
      const once = a.type === 'once' ? a : candidate;
      const weekly = a.type === 'weekly' ? a : candidate;
      if (
        once.date >= weekly.from &&
        weekly.weekdays.indexOf(weekdayOfDateStr(once.date)) > -1
      ) {
        return true;
      }
    }
  }
  return false;
}

/** 计划的可读文案：「每周一、三 09:00-12:00」/「11-20（周五）09:00-12:00」 */
function slotText(slot) {
  const time = slot.start + '-' + slot.end;
  if (slot.type === 'once') {
    const wd = weekdayOfDateStr(slot.date);
    return slot.date.slice(5).replace('-', '/') + '（周' + (WEEKDAY_LABELS[wd] || '?') + '） ' + time;
  }
  const days = slot.weekdays.map((d) => '周' + WEEKDAY_LABELS[d]).join('、');
  return '每' + days + ' ' + time;
}

/**
 * 下一次会自动上线的时刻 → 「11/16 09:00」。
 * 只用于文案拼装，不要再拼「计划……自动上线」这种句子，
 * 调用方自己决定前缀（否则「已下线 · 计划 周三 09:00 自动上线」会重复）。
 */
function nextUpcomingText(slots) {
  const today = todayStr();
  const nowT = nowHHmm();
  let best = null;
  (slots || []).forEach((s) => {
    if (s.type === 'once') {
      if (s.date > today || (s.date === today && s.start > nowT)) {
        const key = s.date + s.start;
        if (!best || key < best.key) {
          best = { key: key, text: s.date.slice(5).replace('-', '/') + ' ' + s.start };
        }
      }
      return;
    }
    // 覆盖 8 天：若今天就是计划星期且时段已开始，下一次命中是下周同一天（offset=7），
    // 只扫 7 天会在「今天已过时段开始」时漏掉下一次，状态条只剩「已下线」（11-16 真机踩中）
    for (let offset = 0; offset < 8; offset += 1) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const ds = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const wd = weekdayOfDateStr(ds);
      if (s.weekdays.indexOf(wd) < 0) continue;
      if (ds === today && s.start <= nowT) continue;
      if (ds < s.from) continue;
      const key = ds + s.start;
      if (!best || key < best.key) {
        best = { key: key, text: ds.slice(5).replace('-', '/') + ' ' + s.start };
      }
      break;
    }
  });
  return best ? best.text : '';
}

/** 当前是否正落在某条计划时段内 */
function hasActiveSlot(slots) {
  return (slots || []).some((s) => slotStatus(s) === 'active');
}

/** manual_until 是否还没到期（后端 effectiveOnline 的第一优先级判断） */
function manualUntilFuture(value) {
  if (!value) return false;
  const t = new Date(String(value).replace(/-/g, '/')).getTime();
  return !isNaN(t) && t > Date.now();
}

/**
 * 顶部状态条文案（手册 §6.12：不要只靠按钮颜色）。
 * 口径必须与后端 effectiveOnline 一致（server/src/utils/runner.js）：
 *   now  → 看 is_online
 *   slot → 看「此刻是否在计划时段内」，manualUntil 只是今天之内的兜底边界。
 * 所以 slot 模式下即便 is_online=1，只要不在时段内，找跑腿列表**也不会出你**，
 * 这里绝不能显示「当前在线」，否则就是骗用户。
 */
function statusTextOf(p) {
  const slots = p.timeSlots || [];
  const active = hasActiveSlot(slots);
  const reallyOnline =
    p.availabilityType === 'now'
      ? !!p.isOnline
      : !!p.isOnline && (active || manualUntilFuture(p.manualUntil));
  if (reallyOnline) {
    if (p.manualUntil) return '当前在线至 ' + String(p.manualUntil).slice(11, 16);
    return p.availabilityType === 'now' ? '当前在线' : '当前在线（计划时段内）';
  }
  if (p.availabilityType === 'slot') {
    const next = nextUpcomingText(slots);
    return next ? '已下线 · ' + next + ' 自动上线' : '已下线';
  }
  return '已下线';
}

Page({
  data: {
    pageTitle: '接单设置',
    mode: '', // '' = 接单设置；'online' = 上线接单
    loading: true,
    loadError: '',
    saving: false,

    isOnline: false,
    availabilityType: 'slot',
    manualUntil: null,
    statusText: '已下线',
    completedCount: 0,
    // 当前是否真在计划时段内（后端 effectiveOnline 的唯一依据）
    hasActiveSlot: false,
    // 非时段时下一次自动上线的时刻文案，如「11/16 09:00」
    nextOnlineText: '',

    zoneGroups: [], // [{category, zones:[{name,checked}]}]
    placeGroups: [], // [{zone, places:[{name,checked}]}]
    serviceAreas: [],
    servicePlaces: [],

    sizeOptions: SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label, checked: false })),
    itemSizes: [],

    timeSlots: [], // [{id,type,text,status}]
    availabilityOptions: [
      {
        value: 'now',
        label: '当前在线',
        // 用户反馈：只写「随时在线」有歧义 —— 它不会自己下线，必须回来点
        desc: '马上可以被接单。离开本页不会自动下线，请回到本页点「立即下线」。'
      },
      {
        value: 'slot',
        label: '按计划上下线',
        desc: '只在下面设定的时段内出现，时段外自动下线。'
      }
    ],

    // 新增计划表单
    slotType: 'once',
    slotDate: '', // once 区间的开始日期
    slotToDate: '', // once 区间的结束日期
    slotFrom: todayStr(),
    slotStart: '',
    slotEnd: '',
    weekdays: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: '周' + WEEKDAY_LABELS[d], checked: false })),
    minDate: todayStr(),
    editingId: '',

    // 可接范围搜索
    areaKw: '',
    areaResults: [],

    basePrice: '',
    remark: '',
    errors: {}
  },

  onLoad(options) {
    const mode = options && options.mode === 'online' ? 'online' : '';
    this.setData({
      mode: mode,
      pageTitle: mode === 'online' ? '上线接单' : '接单设置'
    });
  },

  onShow() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/mine/runner');
      return;
    }
    this.loadProfile();
  },

  loadProfile() {
    this.setData({ loading: true, loadError: '' });
    http
      .get('/api/users/me/runner-profile', {}, { silent: true })
      .then((profile) => {
        this.applyProfile(profile || {});
      })
      .catch((err) => {
        // 走到这里说明没拉到档案：给错误卡片 + 重试，绝不能让空表单被当成本地设置
        this.setData({ loading: false, loadError: (err && err.message) || '请检查网络后重试' });
      });
  },

  onRetryLoad() {
    this.loadProfile();
  },

  applyProfile(p) {
    const basePrice = p.basePrice === null || p.basePrice === undefined ? '' : String(p.basePrice);
    const slots = (p.timeSlots || []).map((s) => ({
      id: s.id,
      type: s.type,
      date: s.date,
      from: s.from,
      weekdays: (s.weekdays || []).slice(),
      start: s.start,
      end: s.end,
      text: slotText(s),
      status: slotStatus(s)
    }));
    const state = {
      loading: false,
      isOnline: !!p.isOnline,
      availabilityType: p.availabilityType === 'now' ? 'now' : 'slot',
      manualUntil: p.manualUntil || null,
      completedCount: Number(p.completedCount) || 0,
      hasActiveSlot: hasActiveSlot(slots),
      nextOnlineText: nextUpcomingText(p.timeSlots),
      serviceAreas: (p.serviceAreas || []).slice(),
      servicePlaces: (p.servicePlaces || []).slice(),
      itemSizes: (p.itemSizes || []).slice(),
      timeSlots: slots,
      basePrice: basePrice,
      remark: p.remark || '',
      statusText: statusTextOf(Object.assign({}, p, { timeSlots: slots }))
    };
    state.zoneGroups = this.buildZoneGroups(state.serviceAreas);
    state.placeGroups = this.buildPlaceGroups(state.serviceAreas, state.servicePlaces);
    state.sizeOptions = SIZE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      checked: state.itemSizes.indexOf(o.value) > -1
    }));
    this.setData(state);
  },

  /** 25 片区按分类分组，带勾选态（WXML 不能调 indexOf，勾选态在 js 算好） */
  buildZoneGroups(selected) {
    const groups = [];
    campus.CATEGORIES.forEach((cat) => {
      const zones = campus.zonesByCategory()[cat] || [];
      groups.push({
        category: cat,
        zones: zones.map((z) => ({ name: z, checked: selected.indexOf(z) > -1 }))
      });
    });
    return groups;
  },

  /** 已选片区下的地标分组（无下级地标的片区不出现） */
  buildPlaceGroups(areas, places) {
    const groups = [];
    areas.forEach((zone) => {
      const list = campus.placesOfZone(zone);
      if (!list.length) return;
      groups.push({
        zone: zone,
        places: list.map((pl) => ({ name: pl, checked: places.indexOf(pl) > -1 }))
      });
    });
    return groups;
  },

  onAreasChange(e) {
    const areas = (e.detail.value || []).slice();
    // 换片区后，已选地标里不属于新片区集合的要去掉（联动规则）
    const places = this.data.servicePlaces.filter((pl) => {
      const zone = campus.zoneOfPlace(pl);
      return zone && areas.indexOf(zone) > -1;
    });
    this.setData({
      serviceAreas: areas,
      servicePlaces: places,
      placeGroups: this.buildPlaceGroups(areas, places),
      'errors.serviceAreas': ''
    });
  },

  onPlacesChange(e) {
    this.setData({ servicePlaces: (e.detail.value || []).slice() });
  },

  // ---------------- 可接范围搜索（11-16 反馈：长列表找地标太累） ----------------
  onAreaSearch(e) {
    const kw = String((e.detail && e.detail.value) || '').trim();
    this.setData({ areaKw: kw, areaResults: this.buildSearchResults(kw) });
  },

  buildSearchResults(kw) {
    if (!kw) return [];
    const places = this.data.servicePlaces;
    // searchLandmarks 返回 landmark 对象 {name, zone, aliases}，不是字符串（11-16 乱码修复）
    return campus.searchLandmarks(kw, 20).map((l) => {
      const name = typeof l === 'string' ? l : l.name;
      const zone = typeof l === 'object' && l.zone ? l.zone : campus.zoneOfPlace(name);
      return {
        name: name,
        zone: zone || '',
        checked: places.indexOf(name) > -1
      };
    });
  },

  /** 点搜索结果 = 切换该地标勾选；片区没勾就连带勾上（servicePlaces 必须挂在 serviceAreas 下） */
  onSearchPlaceTap(e) {
    const name = e.currentTarget.dataset.name;
    let zone = campus.zoneOfPlace(name);
    // 片区级地点（图书馆/运动场/校医院等无下级地标的片区）：片区名即地点名
    if (!zone && campus.isValidZone(name)) zone = name;
    if (!name || !zone) return;
    const d = this.data;
    let places = d.servicePlaces.slice();
    let areas = d.serviceAreas.slice();
    const idx = places.indexOf(name);
    if (idx > -1) {
      places.splice(idx, 1);
    } else {
      if (areas.indexOf(zone) < 0) areas.push(zone);
      places.push(name);
    }
    this.setData({
      serviceAreas: areas,
      servicePlaces: places,
      zoneGroups: this.buildZoneGroups(areas),
      placeGroups: this.buildPlaceGroups(areas, places),
      areaResults: this.buildSearchResults(d.areaKw),
      'errors.serviceAreas': ''
    });
  },

  onSizesChange(e) {
    this.setData({
      itemSizes: (e.detail.value || []).slice(),
      'errors.itemSizes': ''
    });
  },

  onAvailChange(e) {
    this.setData({ availabilityType: e.detail.value, 'errors.timeSlots': '' });
  },

  // ---------------- 计划表单 ----------------
  onSlotTypeChange(e) {
    this.setData({ slotType: e.detail.value });
  },
  onSlotDateChange(e) {
    this.setData({ slotDate: e.detail.value });
  },
  onSlotToDateChange(e) {
    this.setData({ slotToDate: e.detail.value });
  },
  onSlotFromChange(e) {
    this.setData({ slotFrom: e.detail.value });
  },
  onSlotStartChange(e) {
    this.setData({ slotStart: e.detail.value });
  },
  onSlotEndChange(e) {
    this.setData({ slotEnd: e.detail.value });
  },
  onWeekdayChange(e) {
    const picked = (e.detail.value || []).map(Number).sort((a, b) => a - b);
    this.setData({
      weekdays: this.data.weekdays.map((w) => ({ value: w.value, label: w.label, checked: picked.indexOf(w.value) > -1 }))
    });
  },

  /** 把自定义日期区间展开成逐日 once slot（后端 validateTimeSlots 只认 once/weekly，区间由前端拆） */
  expandOnceRange(fromDate, toDate, start, end) {
    const span = daysBetween(fromDate, toDate);
    const days = [];
    const cur = new Date(String(fromDate).replace(/-/g, '/') + ' 00:00:00');
    for (let i = 0; i <= span; i += 1) {
      days.push(cur.getFullYear() + '-' + pad(cur.getMonth() + 1) + '-' + pad(cur.getDate()));
      cur.setDate(cur.getDate() + 1);
    }
    return days.map((day) => {
      const slot = { id: slotId(), type: 'once', date: day, start: start, end: end };
      return {
        id: slot.id,
        type: 'once',
        date: day,
        from: '',
        weekdays: [],
        start: start,
        end: end,
        text: slotText(slot),
        status: slotStatus(slot)
      };
    });
  },

  /** 新增 / 保存编辑计划；编辑中的计划以 editingId 覆盖 */
  onAddSlot() {
    const d = this.data;
    const type = d.slotType;
    const errors = {};
    if (type === 'once') {
      if (!d.slotDate || !d.slotToDate) errors.slot = '请选择起止日期';
      else if (d.slotDate > d.slotToDate) errors.slot = '结束日期不能早于开始日期';
      else {
        const span = daysBetween(d.slotDate, d.slotToDate);
        if (span < 0) errors.slot = '日期不合法';
        else if (span > MAX_RANGE_DAYS - 1) errors.slot = '日期区间最长 ' + MAX_RANGE_DAYS + ' 天';
      }
    }
    if (type === 'weekly') {
      const picked = d.weekdays.filter((w) => w.checked).map((w) => w.value);
      if (!picked.length) errors.slot = '请选择循环的星期';
      if (!d.slotFrom) errors.slot = errors.slot || '请选择起始日期';
    }
    if (!/^\d{2}:\d{2}$/.test(d.slotStart) || !/^\d{2}:\d{2}$/.test(d.slotEnd)) {
      errors.slot = errors.slot || '请选择完整的起止时间';
    } else if (d.slotStart >= d.slotEnd) {
      errors.slot = '结束时间必须晚于开始时间';
    }
    if (errors.slot) {
      this.setData({ 'errors.timeSlots': errors.slot });
      util.toast(errors.slot);
      return;
    }

    const editing = d.editingId ? d.timeSlots.filter((s) => s.id !== d.editingId) : d.timeSlots;

    // once：区间展开成逐日计划，先整批做重叠校验（任何一天撞上既有计划都报错）
    let newSlots;
    if (type === 'once') {
      newSlots = this.expandOnceRange(d.slotDate, d.slotToDate, d.slotStart, d.slotEnd);
      for (let i = 0; i < newSlots.length; i += 1) {
        const cand = {
          id: newSlots[i].id,
          type: 'once',
          date: newSlots[i].date,
          start: newSlots[i].start,
          end: newSlots[i].end
        };
        if (overlapsWith(editing, cand)) {
          this.setData({ 'errors.timeSlots': '在线计划格式错误' });
          util.toast(newSlots[i].date + ' 与已有计划时间重叠');
          return;
        }
      }
    } else {
      const candidate = {
        id: d.editingId || slotId(),
        type: 'weekly',
        from: d.slotFrom,
        weekdays: d.weekdays.filter((w) => w.checked).map((w) => w.value),
        start: d.slotStart,
        end: d.slotEnd
      };
      if (overlapsWith(editing, candidate)) {
        this.setData({ 'errors.timeSlots': '在线计划格式错误' });
        util.toast('与已有计划时间重叠');
        return;
      }
      newSlots = [
        {
          id: candidate.id,
          type: 'weekly',
          date: '',
          from: candidate.from,
          weekdays: candidate.weekdays,
          start: candidate.start,
          end: candidate.end,
          text: slotText(candidate),
          status: slotStatus(candidate)
        }
      ];
    }

    const timeSlots = d.editingId
      ? d.timeSlots.map((s) => (s.id === d.editingId ? newSlots[0] : s)).concat(
          d.editingId ? newSlots.slice(1) : []
        )
      : d.timeSlots.concat(newSlots);

    this.setData({
      timeSlots: timeSlots,
      editingId: '',
      slotType: 'once',
      slotDate: '',
      slotToDate: '',
      slotStart: '',
      slotEnd: '',
      weekdays: this.data.weekdays.map((w) => ({ value: w.value, label: w.label, checked: false })),
      'errors.timeSlots': ''
    });
    util.toast(
      d.editingId ? '计划已更新' : newSlots.length > 1 ? '已按天拆成 ' + newSlots.length + ' 条计划' : '计划已添加'
    );
  },

  /** 编辑：只有未开始的计划能改（进行中改了也只影响下一次，手册允许但不做入口） */
  onEditSlot(e) {
    const id = e.currentTarget.dataset.id;
    const slot = this.data.timeSlots.filter((s) => s.id === id)[0];
    if (!slot) return;
    if (slot.status !== 'future') {
      util.toast('只有未开始的计划可以修改');
      return;
    }
    this.setData({
      editingId: id,
      slotType: slot.type,
      slotDate: slot.date || '',
      slotToDate: slot.date || '', // 单条 once 编辑时区间=当天
      slotFrom: slot.from || todayStr(),
      slotStart: slot.start,
      slotEnd: slot.end,
      weekdays: this.data.weekdays.map((w) => ({
        value: w.value,
        label: w.label,
        checked: (slot.weekdays || []).indexOf(w.value) > -1
      }))
    });
  },

  onDeleteSlot(e) {
    const id = e.currentTarget.dataset.id;
    const slot = this.data.timeSlots.filter((s) => s.id === id)[0];
    if (!slot) return;
    if (slot.status !== 'future') {
      util.toast('只有未开始的计划可以删除');
      return;
    }
    util.confirm('删除后该时段不再自动上线，确认删除？', '删除计划').then((ok) => {
      if (!ok) return;
      this.setData({
        timeSlots: this.data.timeSlots.filter((s) => s.id !== id),
        editingId: this.data.editingId === id ? '' : this.data.editingId
      });
      util.toast('计划已删除');
    });
  },

  onCancelEdit() {
    this.setData({
      editingId: '',
      slotDate: '',
      slotToDate: '',
      slotStart: '',
      slotEnd: '',
      weekdays: this.data.weekdays.map((w) => ({ value: w.value, label: w.label, checked: false }))
    });
  },

  onBasePriceInput(e) {
    let v = String(e.detail.value || '').replace(/[^\d.]/g, '');
    const dot = v.indexOf('.');
    if (dot > -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    this.setData({ basePrice: v, 'errors.basePrice': '' });
  },
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value || '', 'errors.remark': '' });
  },

  /** 保存前校验；文案尽量与后端一致 */
  validate() {
    const d = this.data;
    const errors = {};
    if (!d.serviceAreas.length) errors.serviceAreas = '服务片区至少选择一个';
    if (!d.itemSizes.length) errors.itemSizes = '请至少选择一种可接规格';

    const price = d.basePrice === '' ? null : Number(d.basePrice);
    if (d.basePrice !== '' && (isNaN(price) || price < 0 || price > MAX_BASE_PRICE)) {
      errors.basePrice = '报价需在 0-' + MAX_BASE_PRICE + ' 元之间';
    }
    if ((d.remark || '').length > 255) errors.remark = '备注不能超过 255 字';

    const hasFuture = d.timeSlots.some((s) => s.status !== 'past');
    if (d.availabilityType === 'slot' && !hasFuture) {
      errors.timeSlots = '按计划上线至少需要一条未来计划';
    }
    return errors;
  },

  buildPayload() {
    const d = this.data;
    return {
      serviceAreas: d.serviceAreas.slice(),
      servicePlaces: d.servicePlaces.slice(),
      itemSizes: d.itemSizes.slice(),
      availabilityType: d.availabilityType,
      timeSlots: d.timeSlots.map((s) =>
        s.type === 'once'
          ? { id: s.id, type: 'once', date: s.date, start: s.start, end: s.end }
          : {
              id: s.id,
              type: 'weekly',
              from: s.from,
              weekdays: (s.weekdays || []).slice().sort((a, b) => a - b),
              start: s.start,
              end: s.end
            }
      ),
      basePrice: d.basePrice === '' ? null : Number(d.basePrice),
      remark: (d.remark || '').trim()
    };
  },

  /** 保存设置；online 模式传 thenOnline=true 时保存后立即上线 */
  save(thenOnline) {
    if (this.data.saving) return;
    // 之前这里静默 return，用户在网络慢时点按钮毫无反应，会以为功能坏了
    if (this.data.loading) {
      util.toast('设置还在加载，请稍候');
      return;
    }
    const errors = this.validate();
    if (Object.keys(errors).length) {
      this.setData({ errors: errors });
      util.toast(Object.keys(errors).map((k) => errors[k])[0]);
      return;
    }
    this.setData({ saving: true });
    http
      .put('/api/users/me/runner-profile', this.buildPayload(), { silent: true })
      .then((profile) => {
        this.applyProfile(profile || {});
        if (this.data.mode !== 'online' || !thenOnline) {
          // 按计划但当前不在时段内：不要含糊说「已保存」，要把下次上线时间讲出来
          const next =
            this.data.availabilityType === 'slot' && !this.data.hasActiveSlot
              ? this.data.nextOnlineText
              : '';
          util.toast(next ? '已保存，' + next + ' 自动上线' : '接单设置已保存');
          this.setData({ saving: false });
          return;
        }
        this.setOnline(true);
      })
      .catch((err) => {
        this.setData({ saving: false });
        util.toast((err && err.message) || '保存失败，请重试');
      });
  },

  /** 上线 / 下线；下线遇「进行中的计划」弹二选一（scope=once/future） */
  setOnline(online, scope, scheduleId) {
    const body = { isOnline: !!online, availabilityType: this.data.availabilityType };
    if (scope) {
      body.scope = scope;
      body.scheduleId = scheduleId;
    }
    this.setData({ saving: true });
    http
      .put('/api/users/me/online', body, { silent: true })
      .then((res) => {
        this.setData({ saving: false });
        this.applyProfile(
          Object.assign({}, this.dataToProfile(), {
            isOnline: res && res.isOnline,
            availabilityType: (res && res.availabilityType) || this.data.availabilityType,
            manualUntil: (res && res.manualUntil) || null
          })
        );
        if (online) {
          util.toast('已上线，接单大厅能看到你了');
          // 从大厅「我要接单」进来时回到大厅，让用户立刻看到在线状态
          setTimeout(() => {
            if (getCurrentPages().length > 1) wx.navigateBack();
          }, 800);
        } else {
          util.toast('已下线');
        }
      })
      .catch((err) => {
        this.setData({ saving: false });
        util.toast((err && err.message) || '操作失败，请重试');
      });
  },

  /** 用当前页面状态合成一份 profile，供 applyProfile 重算状态条 */
  dataToProfile() {
    const d = this.data;
    return {
      isOnline: d.isOnline,
      availabilityType: d.availabilityType,
      manualUntil: d.manualUntil,
      serviceAreas: d.serviceAreas,
      servicePlaces: d.servicePlaces,
      itemSizes: d.itemSizes,
      timeSlots: d.timeSlots.map((s) => ({
        id: s.id,
        type: s.type,
        date: s.date,
        from: s.from,
        weekdays: s.weekdays,
        start: s.start,
        end: s.end
      })),
      basePrice: d.basePrice === '' ? null : Number(d.basePrice),
      remark: d.remark,
      completedCount: d.completedCount
    };
  },

  onTapSave() {
    this.save(false);
  },

  onTapSaveOnline() {
    this.save(true);
  },

  /**
   * online 模式的主按钮。
   * 关键：slot 模式下后端 effectiveOnline 只看「此刻是否在计划时段内」，
   * 非时段时调 /me/online 也不会让找跑腿列表出现你 —— 所以这里不调上线接口，
   * 只保存设置并如实告诉用户下次自动上线的时间（用户反馈：按计划上线"没成功"）。
   */
  onTapMainBottom() {
    const d = this.data;
    if (d.availabilityType === 'slot' && !d.hasActiveSlot) {
      this.save(false);
      return;
    }
    this.save(!d.isOnline);
  },

  onTapOffline() {
    const active = this.data.timeSlots.filter((s) => s.status === 'active');
    if (this.data.availabilityType !== 'slot' || !active.length) {
      this.setOnline(false);
      return;
    }
    const slot = active[0];
    // 进行中的循环/当日计划：二选一（手册 §6.12 交互要点 4）
    wx.showActionSheet({
      alertText: '当前正处于计划时段内，如何下线？',
      itemList: ['只下线这一次（保留计划）', '取消这个计划（之后不再上线）'],
      success: (res) => {
        if (res.tapIndex === 0) this.setOnline(false, 'once', slot.id);
        else if (res.tapIndex === 1) this.setOnline(false, 'future', slot.id);
      },
      fail: () => {}
    });
  }
});
