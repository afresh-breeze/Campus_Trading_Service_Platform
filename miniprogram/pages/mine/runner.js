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

/** 下一条未来计划 → 「计划 周三 09:00 自动上线」 */
function nextUpcomingText(slots) {
  const today = todayStr();
  const nowT = nowHHmm();
  let best = null;
  (slots || []).forEach((s) => {
    if (s.type === 'once') {
      if (s.date > today || (s.date === today && s.start > nowT)) {
        if (!best || s.date + s.start < best.key) best = { key: s.date + s.start, text: slotText(s) };
      }
      return;
    }
    for (let offset = 0; offset < 7; offset += 1) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const ds = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const wd = weekdayOfDateStr(ds);
      if (s.weekdays.indexOf(wd) < 0) continue;
      if (ds === today && s.start <= nowT) continue;
      if (ds < s.from) continue;
      const key = ds + s.start;
      if (!best || key < best.key) {
        best = { key: key, text: '计划 周' + WEEKDAY_LABELS[wd] + ' ' + s.start + ' 自动上线' };
      }
      break;
    }
  });
  return best ? best.text : '';
}

/** 顶部状态条文案（手册 §6.12：不要只靠按钮颜色） */
function statusTextOf(p) {
  if (p.isOnline) {
    if (p.manualUntil) {
      return '当前在线至 ' + String(p.manualUntil).slice(11, 16);
    }
    return p.availabilityType === 'now' ? '当前在线（随时接单）' : '当前在线（按计划）';
  }
  const next = nextUpcomingText(p.timeSlots);
  if (p.availabilityType === 'slot' && next) return next;
  return '已下线';
}

Page({
  data: {
    pageTitle: '接单设置',
    mode: '', // '' = 接单设置；'online' = 上线接单
    loading: true,
    saving: false,

    isOnline: false,
    availabilityType: 'slot',
    manualUntil: null,
    statusText: '已下线',
    completedCount: 0,

    zoneGroups: [], // [{category, zones:[{name,checked}]}]
    placeGroups: [], // [{zone, places:[{name,checked}]}]
    serviceAreas: [],
    servicePlaces: [],

    sizeOptions: SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label, checked: false })),
    itemSizes: [],

    timeSlots: [], // [{id,type,text,status}]
    availabilityOptions: [
      { value: 'now', label: '随时在线' },
      { value: 'slot', label: '按计划上下线' }
    ],

    // 新增计划表单
    slotType: 'once',
    slotDate: '',
    slotFrom: todayStr(),
    slotStart: '',
    slotEnd: '',
    weekdays: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: '周' + WEEKDAY_LABELS[d], checked: false })),
    minDate: todayStr(),
    editingId: '',

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
    this.setData({ loading: true });
    http
      .get('/api/users/me/runner-profile', {}, { silent: true })
      .then((profile) => {
        this.applyProfile(profile || {});
      })
      .catch((err) => {
        this.setData({ loading: false });
        util.toast((err && err.message) || '接单设置加载失败');
      });
  },

  applyProfile(p) {
    const basePrice = p.basePrice === null || p.basePrice === undefined ? '' : String(p.basePrice);
    const state = {
      loading: false,
      isOnline: !!p.isOnline,
      availabilityType: p.availabilityType === 'now' ? 'now' : 'slot',
      manualUntil: p.manualUntil || null,
      completedCount: Number(p.completedCount) || 0,
      serviceAreas: (p.serviceAreas || []).slice(),
      servicePlaces: (p.servicePlaces || []).slice(),
      itemSizes: (p.itemSizes || []).slice(),
      timeSlots: (p.timeSlots || []).map((s) => ({
        id: s.id,
        type: s.type,
        date: s.date,
        from: s.from,
        weekdays: (s.weekdays || []).slice(),
        start: s.start,
        end: s.end,
        text: slotText(s),
        status: slotStatus(s)
      })),
      basePrice: basePrice,
      remark: p.remark || '',
      statusText: statusTextOf(p)
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

  /** 新增 / 保存编辑计划；编辑中的计划以 editingId 覆盖 */
  onAddSlot() {
    const d = this.data;
    const type = d.slotType;
    const errors = {};
    if (type === 'once' && !d.slotDate) errors.slot = '请选择日期';
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
    const candidate = {
      id: d.editingId || slotId(),
      type: type,
      date: type === 'once' ? d.slotDate : undefined,
      from: type === 'weekly' ? d.slotFrom : undefined,
      weekdays: type === 'weekly' ? d.weekdays.filter((w) => w.checked).map((w) => w.value) : undefined,
      start: d.slotStart,
      end: d.slotEnd
    };
    if (overlapsWith(editing, candidate)) {
      this.setData({ 'errors.timeSlots': '在线计划格式错误' });
      util.toast('与已有计划时间重叠');
      return;
    }

    const slot = {
      id: candidate.id,
      type: type,
      date: candidate.date || '',
      from: candidate.from || '',
      weekdays: candidate.weekdays || [],
      start: candidate.start,
      end: candidate.end,
      text: slotText(candidate),
      status: slotStatus(candidate)
    };
    const timeSlots = d.editingId
      ? d.timeSlots.map((s) => (s.id === d.editingId ? slot : s))
      : d.timeSlots.concat([slot]);

    this.setData({
      timeSlots: timeSlots,
      editingId: '',
      slotType: 'once',
      slotDate: '',
      slotStart: '',
      slotEnd: '',
      weekdays: this.data.weekdays.map((w) => ({ value: w.value, label: w.label, checked: false })),
      'errors.timeSlots': ''
    });
    util.toast(d.editingId ? '计划已更新' : '计划已添加');
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
    if (this.data.saving || this.data.loading) return;
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
        if (this.data.mode !== 'online') {
          util.toast('接单设置已保存');
          this.setData({ saving: false });
          return;
        }
        if (!thenOnline) {
          util.toast('接单设置已保存');
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

  /** online 模式的主按钮：已在线 = 只保存；未在线 = 保存并上线 */
  onTapMainBottom() {
    this.save(!this.data.isOnline);
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
