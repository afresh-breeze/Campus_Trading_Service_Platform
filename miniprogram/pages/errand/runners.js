// 找跑腿匹配页（B 成员，11-15）
// ------------------------------------------------------------------
// 契约（对照 server/src/routes/runners.js，mock.js 同构）：
//   GET /api/runners?area=&place=&timeType=&timeStart=&deadline=&itemSize=&page=&pageSize=
//   · area 必填且必须是 25 个固定片区；place 省略时后端按 place=area 处理；
//   · timeType=asap 只回当前在线；deadline/range 按时间窗重叠过滤；
//   · 400 文案逐字对齐：取件片区不能为空 / 取件片区不在可选范围内 /
//     地标与片区不匹配 / 时间类型不合法 / 时间参数不完整 / 物品规格不合法 /
//     页码或每页条数不合法。
// 入口（发布页「存为私单，先找跑腿」）：
//   ?orderId=&area=&place=&timeType=&itemSize=[&timeStart=][&deadline=]
//   私单已建好，本页只做「展示 + 联系」，**不改订单状态**；谈妥后由对方在
//   详情页接单（手册 §4.5 11-15）。没谈妥可在页内把这一单发布到大厅
//   （gated by 详情接口的 canPublish，不前端自推）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');
const campus = require('../../utils/campus');

const PAGE_SIZE = 10;
const TIME_OPTIONS = [
  { value: 'asap', label: '尽快送达' },
  { value: 'deadline', label: '截止前送达' },
  { value: 'range', label: '指定时间段' }
];
// 找跑腿的规格可以「不限」（后端 itemSize 空串 = 不过滤）
const SIZE_PICK = [
  { value: '', label: '不限' },
  { value: 'small', label: '小件' },
  { value: 'medium', label: '中件' },
  { value: 'large', label: '大件' }
];
const SIZE_LABEL = { small: '小件', medium: '中件', large: '大件' };

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}
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
function joinDateTime(date, time) {
  if (!date || !time) return '';
  return date + ' ' + time + ':00';
}

/** 跑腿行 → 纯展示结构（wxml 不做计算） */
function toCard(raw) {
  const r = adapter.toRunner(raw);
  const areas = r.serviceAreas.slice(0, 2).join('、');
  const areaText = r.serviceAreas.length > 2 ? areas + ' 等 ' + r.serviceAreas.length + ' 个片区' : areas;
  return {
    userId: r.userId,
    nickname: r.nickname || '同学',
    initial: (r.nickname || '同').slice(0, 1),
    avatarUrl: r.avatarUrl,
    onlineText: r.isOnline ? '在线' : '离线',
    online: r.isOnline,
    availText: r.availabilityType === 'now' ? '随时接单' : '按计划上线',
    creditText: '信用 ' + r.creditScore,
    doneText: '完成 ' + r.completedCount + ' 单',
    areaText: areaText || '片区未填',
    sizeTexts: r.itemSizes.map((s) => SIZE_LABEL[s] || s),
    priceText: r.basePrice > 0 ? util.formatPrice(r.basePrice) : '面议',
    remark: r.remark || ''
  };
}

Page({
  data: {
    pageTitle: '找跑腿',
    orderId: 0,
    isLogin: true,

    // 订单摘要（有 orderId 才显示；canPublish 只信详情接口返回）
    orderLoaded: false,
    order: null,
    routeText: '',
    rewardText: '',
    timeText: '',
    canPublish: false,
    publishing: false,

    // 筛选条件：取件地点走 place-picker 弹层（搜索 / 分类 / 片区 / 具体地标）
    area: '桃园',
    place: '', // 空 = 全片区（buildQuery 里落为片区名，后端 place=area 语义）
    placeText: '桃园',
    placePickerVisible: false,
    timeOptions: TIME_OPTIONS,
    sizePick: SIZE_PICK,
    timeIndex: 0,
    sizeIndex: 0,
    minDate: todayStr(),
    startDate: '',
    startTime: '',
    deadlineDate: '',
    deadlineTime: '',

    // 列表
    list: [],
    total: 0,
    page: 1,
    hasMore: false,
    firstLoading: true,
    loadingMore: false,
    refreshing: false,
    error: ''
  },

  onLoad(options) {
    const o = options || {};
    const orderId = Number(o.orderId || 0);
    const updates = {};

    // 片区：URL 带合法片区才回填，否则保持默认「桃园」
    const area = o.area ? decodeURIComponent(o.area) : '';
    if (campus.isValidZone(area)) updates.area = area;
    // 地标：必须属于该片区（片区名本身 = 全片区，不回填为具体地标）
    const place = o.place ? decodeURIComponent(o.place) : '';
    const activeArea = updates.area || this.data.area;
    if (place && place !== activeArea && campus.isValidPlace(activeArea, place)) {
      updates.place = place;
    }
    updates.placeText = campus.displayArea(activeArea, updates.place || '');

    const timeIdx = TIME_OPTIONS.map((t) => t.value).indexOf(o.timeType);
    if (timeIdx > -1) updates.timeIndex = timeIdx;
    const sizeIdx = SIZE_PICK.map((s) => s.value).indexOf(o.itemSize || '');
    if (sizeIdx > -1) updates.sizeIndex = sizeIdx;

    const st = splitDateTime(o.timeStart ? decodeURIComponent(o.timeStart) : '');
    const dl = splitDateTime(o.deadline ? decodeURIComponent(o.deadline) : '');
    updates.startDate = st.date;
    updates.startTime = st.time;
    updates.deadlineDate = dl.date;
    updates.deadlineTime = dl.time;

    if (orderId) updates.orderId = orderId;
    this.setData(updates);

    if (orderId) this.loadOrder(orderId);
  },

  onShow() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/errand/hall');
      this.setData({ isLogin: false });
      return;
    }
    this.setData({ isLogin: true });
    // redirectTo 进来 onLoad 后必走一次 onShow；防止返回本页时重复拉
    if (this._fetched) return;
    this._fetched = true;
    this.fetch(1);
  },

  onRefresh() {
    this.setData({ pulling: true });
    const done = () => this.setData({ pulling: false });
    this.fetch(1).then(done, done);
  },

  onReachBottom() {
    if (this.data.refreshing || this.data.loadingMore || !this.data.hasMore) return;
    this.fetch(this.data.page + 1);
  },

  /** 订单摘要：只为展示与 canPublish 门闸；拉不到不阻塞跑腿列表 */
  loadOrder(orderId) {
    http
      .get('/api/errands/' + orderId, {}, { silent: true })
      .then((order) => {
        if (!order) return;
        // 11-25 口径同大厅卡片：摘要里优先出具体地标，片区前缀留给详情页
        const place = campus.shortPlace(order.pickupArea, order.pickupPlace);
        let timeText = '';
        if (order.timeType === 'asap') timeText = '尽快送达';
        else if (order.timeType === 'deadline') timeText = (util.formatTime(order.deadline) || '') + ' 前';
        else {
          const s = util.formatTime(order.timeStart);
          const e = util.formatTime(order.deadline);
          timeText = s && e ? s + ' 至 ' + e : '时间待定';
        }
        this.setData({
          orderLoaded: true,
          order,
          routeText: (place || '取件地点待定') + ' → ' + (order.deliveryLocation || '送达地点待定'),
          rewardText: util.formatPrice(order.reward),
          timeText,
          canPublish: order.canPublish === true
        });
      })
      .catch(() => {
        // 摘要失败保持隐藏，筛选与列表照常可用
        this.setData({ orderLoaded: false, canPublish: false });
      });
  },

  // ---------------- 取件地点弹层（place-picker） ----------------
  onOpenPlacePicker() {
    this.setData({ placePickerVisible: true });
  },

  onPlaceClose() {
    this.setData({ placePickerVisible: false });
  },

  /** 找跑腿允许「全区」：place 为空时 buildQuery 落为片区名（后端 place=area 语义） */
  onPlaceConfirm(e) {
    const zone = (e.detail && e.detail.zone) || '';
    if (!zone) return;
    const place = (e.detail && e.detail.place) || '';
    this.setData({
      placePickerVisible: false,
      area: zone,
      place,
      placeText: campus.displayArea(zone, place)
    });
  },

  onTimeChange(e) {
    // radio-group 的 e.detail.value 是 value 字符串（'asap'/'deadline'/'range'），不是索引
    // ——同 F-13，Number('deadline') 为 NaN 恒落 0，时间筛选永远停在「尽快」（11-24 修）
    const idx = this.data.timeOptions.map((o) => o.value).indexOf(e.detail.value);
    this.setData({ timeIndex: Math.max(0, idx) });
  },

  onSizeChange(e) {
    this.setData({ sizeIndex: Number(e.detail.value) || 0 });
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value });
  },
  onDeadlineDateChange(e) {
    this.setData({ deadlineDate: e.detail.value });
  },
  onDeadlineTimeChange(e) {
    this.setData({ deadlineTime: e.detail.value });
  },

  /** 组装 query（含与后端同口径的本地预检，避免必败请求） */
  buildQuery(page) {
    const d = this.data;
    const zone = d.area;
    const timeType = TIME_OPTIONS[d.timeIndex].value;
    // place 空 = 全片区 → 传片区名（后端 place=area 语义）
    const place = d.place || zone;

    let timeStart = '';
    let deadline = '';
    if (timeType === 'range') {
      timeStart = joinDateTime(d.startDate, d.startTime);
      deadline = joinDateTime(d.deadlineDate, d.deadlineTime);
    } else if (timeType === 'deadline') {
      deadline = joinDateTime(d.deadlineDate, d.deadlineTime);
    }
    // 本地预检：文案与后端逐字一致（runners.js 的校验顺序）
    if (timeType === 'deadline' && !deadline) {
      return { error: '时间参数不完整' };
    }
    if (timeType === 'range') {
      if (!timeStart || !deadline) return { error: '时间参数不完整' };
      if (timeStart >= deadline) return { error: '时间参数不完整' };
    }

    const query = { area: zone, place, timeType, page, pageSize: PAGE_SIZE };
    if (timeStart) query.timeStart = timeStart;
    if (deadline) query.deadline = deadline;
    const itemSize = SIZE_PICK[d.sizeIndex].value;
    if (itemSize) query.itemSize = itemSize;
    return { query };
  },

  fetch(page) {
    const isFirst = page === 1;
    const built = this.buildQuery(page);
    if (built.error) {
      // 预检失败：首屏进错误态，重查给 toast（文案与后端一致）
      if (isFirst) {
        this.setData({ firstLoading: false, error: built.error });
      } else {
        util.toast(built.error);
      }
      return Promise.resolve();
    }
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);
    if (isFirst) this.setData({ firstLoading: this.data.list.length === 0, error: '' });
    else this.setData({ loadingMore: true });

    return http
      .get('/api/runners', built.query, { silent: true })
      .then((res) => {
        if (seq !== this._reqSeq) return null;
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        const cards = rows.map(toCard);
        const list = isFirst ? cards : this.data.list.concat(cards);
        const total = Number(data.total || 0);
        this.setData({
          list,
          total,
          page,
          hasMore: list.length < total && rows.length > 0,
          firstLoading: false,
          loadingMore: false,
          refreshing: false,
          error: ''
        });
        return list;
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return null;
        this.setData({ firstLoading: false, loadingMore: false, refreshing: false });
        if (isFirst) this.setData({ error: (err && err.message) || '加载失败' });
        else util.toast((err && err.message) || '加载失败，请重试');
        return null;
      });
  },

  /** 「重新匹配」：回第一页按当前筛选重查 */
  onRequery() {
    this._reqSeq = (this._reqSeq || 0) + 1; // 作废在途响应
    this.setData({ refreshing: true });
    this.fetch(1).then(() => this.setData({ refreshing: false }));
  },

  onRetry() {
    this.setData({ firstLoading: true });
    this.fetch(1);
  },

  /** 联系 TA：URL 契约与详情页 onContact 一致；会话由聊天页创建 */
  onContact(e) {
    const userId = Number(e.currentTarget.dataset.userId || 0);
    if (!userId) return;
    if (!this.data.orderId) {
      util.toast('请先从发布页创建私单，再联系跑腿');
      return;
    }
    wx.navigateTo({
      url:
        '/pages/chat/detail?peerId=' + userId + '&bizType=errand&bizId=' + this.data.orderId,
      fail: () => util.toast('聊天页打开失败')
    });
  },

  /** 没谈妥：把这一单发布到大厅（canPublish 只信详情接口，前端不自推） */
  onPublishHall() {
    if (this.data.publishing || !this.data.orderId) return;
    if (!this.data.canPublish) {
      util.toast('当前订单状态不能发布到大厅');
      return;
    }
    util.confirm('发布到大厅后所有人都能看到并接单，确认？', '发布到大厅').then((ok) => {
      if (!ok) return;
      this.setData({ publishing: true });
      http
        .post('/api/errands/' + this.data.orderId + '/publish', {}, { silent: true })
        .then(() => {
          util.toast('已发布到大厅');
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/errand/detail?id=' + this.data.orderId,
              fail: () => this.setData({ publishing: false })
            });
          }, 600);
        })
        .catch((err) => {
          this.setData({ publishing: false });
          util.toast((err && err.message) || '发布失败，请重试');
        });
    });
  },

  onGoHall() {
    wx.switchTab({ url: '/pages/errand/hall', fail: () => wx.navigateBack() });
  }
});
