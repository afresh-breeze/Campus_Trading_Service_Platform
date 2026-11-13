// 发布代取 / 编辑私单（B 成员，11-13）
// ------------------------------------------------------------------
// 契约（对照 server/src/routes/errands.js 的 parseErrandPayload，mock.js 同构）：
//   · pickupPlace 必填；片区没有下级地标时直接传片区名（后端「片区即地标」语义）；
//   · timeType=asap **不允许携带任何时间字段**（后端字符串非空即报「时间参数不完整」）；
//   · reward 前端收紧到 0 < r ≤ 200、最多两位小数（手册 §6.8，比后端 99999999.99 更严）；
//   · deadline / timeStart 必须晚于当前时间（后端不校验早晚，前端必须把关）。
// 两种入口：
//   · 无参 = 发布大厅单（visibility=hall），成功 wx.redirectTo 详情（防止返回到空表单）；
//   · ?id= = 编辑未发布私单（后端 canEdit=true 才允许），PUT 成功后 navigateBack 回详情。
// 「存为私单，先找跑腿」：visibility=private 建单拿 orderId，带筛选条件跳
//   /pages/errand/runners（手册 §6.10，11-15 落地；现为占位页但不丢单，可从「我的代取」回来）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const campus = require('../../utils/campus');

const SIZE_OPTIONS = [
  { value: 'small', label: '小件' },
  { value: 'medium', label: '中件' },
  { value: 'large', label: '大件' }
];
const TIME_OPTIONS = [
  { value: 'asap', label: '尽快送达' },
  { value: 'deadline', label: '截止前送达' },
  { value: 'range', label: '指定时间段' }
];
const MAX_REWARD = 200;
const ZONES_BY_CATEGORY = campus.zonesByCategory();

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** 今天的 YYYY-MM-DD，作为日期 picker 的下限 */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** 'YYYY-MM-DD HH:mm:ss' → { date, time }；空值返回空串 */
function splitDateTime(v) {
  const s = String(v || '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : { date: '', time: '' };
}

/** '2026-11-14' + '18:00' → '2026-11-14 18:00:00' */
function joinDateTime(date, time) {
  if (!date || !time) return '';
  return date + ' ' + time + ':00';
}

/** 报酬输入过滤：只留数字和一个小数点、最多两位小数 */
function filterReward(raw) {
  let s = String(raw || '').replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot > -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const parts = s.split('.');
  if (parts.length === 2 && parts[1].length > 2) {
    s = parts[0] + '.' + parts[1].slice(0, 2);
  }
  return s;
}

Page({
  data: {
    pageTitle: '发布代取',
    isEdit: false,
    orderId: 0,
    loading: false,
    submitting: false,

    // 片区三级联动：分类 → 片区 → 地标
    categories: campus.CATEGORIES,
    categoryIndex: 0,
    zones: [],
    zoneIndex: 0,
    places: [], // 当前片区的下级地标；空数组 = 该片区无细分地标
    placeIndex: 0,
    placeEmptyText: '全区（无细分地标）',
    pickupPlace: '',

    sizeOptions: SIZE_OPTIONS,
    timeOptions: TIME_OPTIONS,
    sizeIndex: 0,
    timeIndex: 0,

    minDate: todayStr(),
    startDate: '',
    startTime: '',
    deadlineDate: '',
    deadlineTime: '',

    form: {
      deliveryLocation: '',
      itemDesc: '',
      remark: '',
      reward: ''
    },
    descCount: 0,
    remarkCount: 0,
    errors: {},
    errorToast: ''
  },

  onLoad(options) {
    const id = Number((options && options.id) || 0);
    const zoneInit = this.applyZone(this.data.categories[0]);
    if (id) {
      this.setData({ isEdit: true, orderId: id, pageTitle: '编辑代取' });
      this.loadOrder(id);
    } else {
      this.setData(zoneInit);
    }
  },

  /** 编辑模式：拉详情回填；canEdit=false 一律挡回（后端 PUT 也会 409/403，别让它走到那一步） */
  loadOrder(id) {
    this.setData({ loading: true });
    http
      .get('/api/errands/' + id, {}, { silent: true })
      .then((order) => {
        if (!order || !order.canEdit) {
          util.toast('当前订单状态不可编辑');
          setTimeout(() => this.backOut(), 800);
          return;
        }
        const zoneInit = this.applyZone(order.pickupArea);
        const placeIdx = zoneInit.places.indexOf(order.pickupPlace);
        const st = splitDateTime(order.timeStart);
        const dl = splitDateTime(order.deadline);
        this.setData(
          Object.assign(zoneInit, {
            loading: false,
            placeIndex: placeIdx > -1 ? placeIdx : 0,
            sizeIndex: Math.max(
              0,
              this.data.sizeOptions.map((o) => o.value).indexOf(order.itemSize)
            ),
            timeIndex: Math.max(
              0,
              this.data.timeOptions.map((o) => o.value).indexOf(order.timeType)
            ),
            startDate: st.date,
            startTime: st.time,
            deadlineDate: dl.date,
            deadlineTime: dl.time,
            form: {
              deliveryLocation: order.deliveryLocation || '',
              itemDesc: order.itemDesc || '',
              remark: order.remark || '',
              reward: order.reward === null || order.reward === undefined ? '' : String(order.reward)
            },
            descCount: (order.itemDesc || '').length,
            remarkCount: (order.remark || '').length
          })
        );
      })
      .catch((err) => {
        this.setData({ loading: false });
        util.toast((err && err.message) || '订单加载失败');
        setTimeout(() => this.backOut(), 800);
      });
  },

  /** 按片区初始化联动数据；片区不合法时回退到第一个分类的第一个片区 */
  applyZone(zoneName) {
    let categoryIndex = 0;
    let zones = ZONES_BY_CATEGORY[campus.CATEGORIES[0]] || [];
    let zoneIndex = zones.indexOf(zoneName);
    if (zoneIndex > -1) {
      categoryIndex = campus.CATEGORIES.indexOf(
        (campus.ZONES.filter((z) => z.name === zoneName)[0] || {}).category
      );
      zones = ZONES_BY_CATEGORY[campus.CATEGORIES[categoryIndex]] || [];
    } else {
      zoneIndex = 0;
    }
    const zone = zones[zoneIndex] || '';
    const places = campus.placesOfZone(zone);
    return {
      categoryIndex: categoryIndex,
      zones: zones,
      zoneIndex: zoneIndex,
      places: places,
      placeIndex: 0,
      // 片区无下级地标时 pickupPlace = 片区名（后端「片区即地标」）
      pickupPlace: places.length ? '' : zone
    };
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value) || 0;
    const cat = this.data.categories[idx];
    const zones = ZONES_BY_CATEGORY[cat] || [];
    const zone = zones[0] || '';
    const places = campus.placesOfZone(zone);
    this.setData({
      categoryIndex: idx,
      zones: zones,
      zoneIndex: 0,
      places: places,
      placeIndex: 0,
      pickupPlace: places.length ? '' : zone,
      'errors.pickupArea': '',
      'errors.pickupPlace': ''
    });
  },

  /** 切片区必须清空地标并重载 —— 手册 §6.8 交互要点 1（最典型 bug） */
  onZoneChange(e) {
    const idx = Number(e.detail.value) || 0;
    const zone = this.data.zones[idx] || '';
    const places = campus.placesOfZone(zone);
    this.setData({
      zoneIndex: idx,
      places: places,
      placeIndex: 0,
      pickupPlace: places.length ? '' : zone,
      'errors.pickupArea': '',
      'errors.pickupPlace': ''
    });
  },

  onPlaceChange(e) {
    const idx = Number(e.detail.value) || 0;
    this.setData({
      placeIndex: idx,
      pickupPlace: this.data.places[idx] || '',
      'errors.pickupPlace': ''
    });
  },

  onSizeChange(e) {
    this.setData({
      sizeIndex: Number(e.detail.value) || 0,
      'errors.itemSize': ''
    });
  },

  onTimeTypeChange(e) {
    this.setData({
      timeIndex: Number(e.detail.value) || 0,
      'errors.timeType': '',
      'errors.time': ''
    });
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value, 'errors.time': '' });
  },
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value, 'errors.time': '' });
  },
  onDeadlineDateChange(e) {
    this.setData({ deadlineDate: e.detail.value, 'errors.time': '' });
  },
  onDeadlineTimeChange(e) {
    this.setData({ deadlineTime: e.detail.value, 'errors.time': '' });
  },

  onDeliveryInput(e) {
    this.setData({ 'form.deliveryLocation': e.detail.value, 'errors.deliveryLocation': '' });
  },
  onDescInput(e) {
    const v = e.detail.value || '';
    this.setData({ 'form.itemDesc': v, descCount: v.length, 'errors.itemDesc': '' });
  },
  onRemarkInput(e) {
    const v = e.detail.value || '';
    this.setData({ 'form.remark': v, remarkCount: v.length, 'errors.remark': '' });
  },
  onRewardInput(e) {
    this.setData({ 'form.reward': filterReward(e.detail.value), 'errors.reward': '' });
  },

  /** 提交前校验：返回 null（通过）或错误对象；文案尽量与后端一致 */
  validate(payload) {
    const errors = {};
    if (!payload.pickupArea) errors.pickupArea = '请选择取件片区';
    if (!payload.pickupPlace) errors.pickupPlace = '请选择取件地标';
    if (!payload.deliveryLocation) errors.deliveryLocation = '请填写送达地点';
    else if (payload.deliveryLocation.length > 100) errors.deliveryLocation = '送达地点不能超过 100 字';

    if (!payload.itemSize) errors.itemSize = '请选择物品规格';

    if (payload.itemDesc && payload.itemDesc.length > 500) errors.itemDesc = '物品描述不能超过 500 字';
    if (payload.remark && payload.remark.length > 255) errors.remark = '备注不能超过 255 字';

    const reward = Number(payload.reward);
    if (payload.reward === '' || payload.reward === null || payload.reward === undefined) {
      errors.reward = '请填写报酬';
    } else if (isNaN(reward)) {
      errors.reward = '报酬格式不正确';
    } else if (reward <= 0) {
      errors.reward = '报酬必须大于 0 元';
    } else if (reward > MAX_REWARD) {
      errors.reward = '报酬不能超过 ' + MAX_REWARD + ' 元';
    }

    const now = new Date();
    if (payload.timeType === 'deadline') {
      const d = joinDateTime(this.data.deadlineDate, this.data.deadlineTime);
      if (!d) errors.time = '请选择截止时间';
      else if (new Date(d.replace(/-/g, '/')) <= now) errors.time = '截止时间必须晚于当前时间';
    } else if (payload.timeType === 'range') {
      const s = joinDateTime(this.data.startDate, this.data.startTime);
      const d = joinDateTime(this.data.deadlineDate, this.data.deadlineTime);
      if (!s || !d) errors.time = '请选择起止时间';
      else if (new Date(s.replace(/-/g, '/')) <= now) errors.time = '开始时间必须晚于当前时间';
      else if (new Date(s.replace(/-/g, '/')) >= new Date(d.replace(/-/g, '/'))) {
        errors.time = '结束时间必须晚于开始时间';
      }
    }
    return errors;
  },

  /** 组装提交载荷；timeType=asap 不得携带任何时间字段（后端硬约束） */
  buildPayload() {
    const form = this.data.form;
    const timeType = this.data.timeOptions[this.data.timeIndex].value;
    const payload = {
      pickupArea: this.data.zones[this.data.zoneIndex] || '',
      pickupPlace: this.data.pickupPlace || '',
      deliveryLocation: form.deliveryLocation.trim(),
      itemSize: this.data.sizeOptions[this.data.sizeIndex].value,
      itemDesc: form.itemDesc.trim(),
      remark: form.remark.trim(),
      reward: form.reward,
      timeType: timeType
    };
    if (timeType === 'deadline') {
      payload.deadline = joinDateTime(this.data.deadlineDate, this.data.deadlineTime);
    } else if (timeType === 'range') {
      payload.timeStart = joinDateTime(this.data.startDate, this.data.startTime);
      payload.deadline = joinDateTime(this.data.deadlineDate, this.data.deadlineTime);
    }
    return payload;
  },

  /** 统一提交入口：mode=hall 大厅单 / private 私单；编辑模式走 PUT */
  submit(visibility) {
    if (this.data.submitting || this.data.loading) return;
    const payload = this.buildPayload();
    const errors = this.validate(payload);
    if (Object.keys(errors).length) {
      this.setData({ errors: errors });
      const first = Object.keys(errors).map((k) => errors[k])[0];
      util.toast(first);
      return;
    }

    this.setData({ submitting: true });
    let req;
    if (this.data.isEdit) {
      req = http.put('/api/errands/' + this.data.orderId, payload, { silent: true });
    } else {
      payload.visibility = visibility;
      req = http.post('/api/errands', payload, { silent: true });
    }

    req
      .then((res) => {
        const orderId = (res && res.orderId) || this.data.orderId;
        if (this.data.isEdit) {
          util.toast('修改已保存');
          setTimeout(() => this.backOut(), 600);
          return;
        }
        if (visibility === 'private') {
          // 私单不进大厅；带 orderId + 表单条件去找跑腿（手册 §6.8 要点 5 / §6.10）
          util.toast('私单已创建，去挑一位跑腿吧');
          const query = [
            'orderId=' + orderId,
            'area=' + encodeURIComponent(payload.pickupArea),
            'place=' + encodeURIComponent(payload.pickupPlace),
            'timeType=' + payload.timeType,
            'itemSize=' + payload.itemSize
          ];
          if (payload.timeStart) query.push('timeStart=' + encodeURIComponent(payload.timeStart));
          if (payload.deadline) query.push('deadline=' + encodeURIComponent(payload.deadline));
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/errand/runners?' + query.join('&'),
              fail: () => {
                // 匹配页打不开也不能把用户丢回空表单：退回详情页
                wx.redirectTo({ url: '/pages/errand/detail?id=' + orderId });
              }
            });
          }, 600);
          return;
        }
        util.toast('发布成功');
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/errand/detail?id=' + orderId,
            fail: () => this.backOut()
          });
        }, 600);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        const message = (err && err.message) || '提交失败，请重试';
        // 后端逐字校验文案落到对应字段，方便用户直接改
        const errors = {};
        if (message.indexOf('片区') > -1) errors.pickupArea = message;
        else if (message.indexOf('地标') > -1) errors.pickupPlace = message;
        else if (message.indexOf('送达') > -1) errors.deliveryLocation = message;
        else if (message.indexOf('规格') > -1) errors.itemSize = message;
        else if (message.indexOf('描述') > -1) errors.itemDesc = message;
        else if (message.indexOf('备注') > -1) errors.remark = message;
        else if (message.indexOf('报酬') > -1) errors.reward = message;
        else if (message.indexOf('时间') > -1) errors.time = message;
        this.setData({ errors: errors });
        util.toast(message);
      });
  },

  onTapSubmit() {
    this.submit('hall');
  },

  onTapPrivate() {
    // 编辑模式没有「先找跑腿」（私单已经是私单了）
    if (this.data.isEdit) {
      util.toast('编辑模式不支持切换为私单');
      return;
    }
    this.submit('private');
  },

  backOut() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/errand/hall' });
  }
});
