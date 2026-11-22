// 我的代取（B 成员，11-15）
// ------------------------------------------------------------------
// 契约（对照 server/src/routes/errands.js 的 /mine 分支，mock.js 同构）：
//   GET /api/errands/mine?role=publisher|runner&status=&page=&pageSize=
//   · role 必填，缺失/非法 → 400「role 只能是 publisher 或 runner」；
//   · status 可选（pending/taken/completed/cancelled），省略 = 全部状态；
//   · publisher 能看到自己**未发布的私单**（后端不过滤 visibility）；
//   · 排序固定 createdAt DESC。
// 操作按钮口径（手册 §4.5 11-15）：本页提供 撤回/完成/释放/联系 快捷入口。
//   列表行不带 can* 六字段（那是详情接口专属），所以按钮按 role+status
//   这两个**后端原样返回**的字段派生，仅作展示捷径；真正的权限校验仍在
//   动作接口（POST /:id/cancel 等 409/403 兜底），前端绝不跳过后端报错。
// 分组口径（手册「按状态分组，每组显示数量」）：
//   默认拉一次全状态（pageSize=50）客户端分组；选中具体状态时改走后端
//   status 参数（过滤只在后端，避免两边口径不一致——同大厅页铁律）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const PAGE_SIZE = 50; // 上限 50（后端红线），超出只提示不硬翻页
const SIZE_TEXT = { small: '小件', medium: '中件', large: '大件' };
const STATUS_LABELS = { pending: '待接单', taken: '进行中', completed: '已完成', cancelled: '已取消' };
const GROUP_ORDER = ['pending', 'taken', 'completed', 'cancelled'];

const TABS = [
  { key: 'publisher', label: '我发布的' },
  { key: 'runner', label: '我接的' }
];
const CHIPS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待接单' },
  { key: 'taken', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
];

/** 卡片紧凑时间，同大厅口径 */
function shortTime(order) {
  if (!order) return '';
  if (order.timeType === 'asap') return '尽快';
  const fmt = (v) => {
    const t = util.formatTime(v);
    return t ? t.slice(5) : '';
  };
  if (order.timeType === 'deadline') {
    const t = fmt(order.deadline);
    return t ? t + ' 前' : '尽快';
  }
  const s = fmt(order.timeStart);
  const e = fmt(order.deadline);
  if (!s || !e) return '时间待定';
  return s + ' - ' + e;
}

/**
 * 列表行 → 纯展示结构。
 * counterparty：我发布的显示接单人（没有则「等待接单」）；我接的显示发布者。
 * actions：按 role+status 派生的快捷操作（真正的校验在动作接口）。
 */
function toCard(order, role) {
  const place =
    order.pickupPlace && order.pickupPlace !== order.pickupArea
      ? order.pickupArea + ' · ' + order.pickupPlace
      : order.pickupArea || '';
  const isPublisher = role === 'publisher';
  const peerId = isPublisher ? Number(order.runnerId || 0) : Number(order.publisherId || 0);
  const peerNickname = isPublisher ? order.runnerNickname : order.publisherNickname;

  const actions = [];
  if (order.status === 'taken') {
    if (isPublisher) actions.push({ key: 'complete', text: '确认完成' });
    else actions.push({ key: 'release', text: '释放订单' });
  }
  // 撤回：发布者 + 待接单/进行中（与后端 cancel 分支一致）；进行中叫「撤回」
  if (isPublisher && (order.status === 'pending' || order.status === 'taken')) {
    actions.push({ key: 'cancel', text: order.status === 'taken' ? '撤回订单' : '取消订单', danger: true });
  }
  if (peerId) actions.push({ key: 'contact', text: '联系 TA' });

  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status || '',
    visibility: order.visibility || 'hall',
    fromText: place || '取件地点待定',
    toText: order.deliveryLocation || '送达地点待定',
    sizeText: SIZE_TEXT[order.itemSize] || '规格未填',
    timeText: shortTime(order),
    rewardText: util.formatPrice(order.reward),
    itemDesc: order.itemDesc || '',
    counterpartyText: peerNickname || (isPublisher ? '等待接单' : ''),
    peerId: peerId,
    createdText: util.fromNow(order.createdAt),
    completedText: order.completedAt ? '完成于 ' + util.formatTime(order.completedAt) : '',
    actions: actions
  };
}

Page({
  data: {
    pageTitle: '我的代取',
    tabs: TABS,
    chips: CHIPS,
    role: 'publisher',
    status: '', // 空 = 全部（分组视图）
    isLogin: true,
    loading: true,
    error: '',
    counts: { pending: 0, taken: 0, completed: 0, cancelled: 0 },
    total: 0,
    truncated: false, // 超过 50 条只展示最近 50 条
    sections: [], // 全部状态时的分组视图
    list: [], // 选中具体状态时的平铺视图
    submitting: false
  },

  onLoad(options) {
    const role = options && options.role === 'runner' ? 'runner' : 'publisher';
    const status = options && CHIPS.some((c) => c.key === options.status) ? options.status : '';
    this.setData({ role, status, pageTitle: role === 'runner' ? '我接的代取' : '我发布的代取' });
  },

  onShow() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/mine/errands?role=' + this.data.role);
      this.setData({ isLogin: false, loading: false });
      return;
    }
    this.setData({ isLogin: true });
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh());
  },

  refresh() {
    // 选中具体状态：过滤只在后端（同大厅铁律）；全部：一次拉全再客户端分组
    if (this.data.status) return this.fetchFiltered(this.data.status);
    return this.fetchAll();
  },

  /** 全状态拉取 → 计数 + 按 status 分组（待接单 → 进行中 → 已完成 → 已取消） */
  fetchAll() {
    this.setData({ loading: this.data.sections.length === 0 && this.data.list.length === 0, error: '' });
    return http
      .get('/api/errands/mine', { role: this.data.role, page: 1, pageSize: PAGE_SIZE }, { silent: true })
      .then((res) => {
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        const total = Number(data.total || 0);
        const counts = { pending: 0, taken: 0, completed: 0, cancelled: 0 };
        const buckets = { pending: [], taken: [], completed: [], cancelled: [] };
        rows.forEach((raw) => {
          const card = toCard(raw, this.data.role);
          if (buckets[card.status]) {
            buckets[card.status].push(card);
            counts[card.status] += 1;
          }
        });
        const sections = GROUP_ORDER.filter((s) => buckets[s].length).map((s) => ({
          status: s,
          label: STATUS_LABELS[s],
          count: counts[s],
          list: buckets[s]
        }));
        this.setData({
          loading: false,
          error: '',
          sections,
          list: [],
          counts,
          total,
          truncated: total > rows.length
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: (err && err.message) || '加载失败' });
      });
  },

  /** 具体状态：走后端 status 参数，分页上限内一次拉取 */
  fetchFiltered(status) {
    this.setData({ loading: this.data.list.length === 0 && this.data.sections.length === 0, error: '' });
    return http
      .get(
        '/api/errands/mine',
        { role: this.data.role, status, page: 1, pageSize: PAGE_SIZE },
        { silent: true }
      )
      .then((res) => {
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        const total = Number(data.total || 0);
        this.setData({
          loading: false,
          error: '',
          list: rows.map((raw) => toCard(raw, this.data.role)),
          sections: [],
          counts: this.data.counts, // 计数仍来自「全部」视图，保持不闪动
          total,
          truncated: total > rows.length
        });
      })
      .catch((err) => {
        this.setData({ loading: false, error: (err && err.message) || '加载失败' });
      });
  },

  onRetry() {
    this.setData({ loading: true });
    this.refresh();
  },

  onTabChange(e) {
    const role = e.currentTarget.dataset.key;
    if (!role || role === this.data.role) return;
    this.setData({
      role,
      status: '',
      pageTitle: role === 'runner' ? '我接的代取' : '我发布的代取',
      loading: true,
      sections: [],
      list: []
    });
    this.fetchAll();
  },

  onChipChange(e) {
    const status = e.currentTarget.dataset.key || '';
    if (status === this.data.status) return;
    this.setData({ status, loading: true });
    this.refresh();
  },

  onTapOrder(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/errand/detail?id=' + id,
      fail: () => util.toast('详情页打开失败')
    });
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!key || !id) return;
    if (key === 'contact') return this.onContact(id);
    if (this.data.submitting) return;

    // 确认文案与详情页口径一致；标题跟随动作名
    const map = {
      complete: {
        confirm: '确认这笔代取已经送达？完成后不可撤销。',
        title: '确认完成',
        url: '/api/errands/' + id + '/complete',
        ok: '已确认完成'
      },
      cancel: {
        confirm: '撤回/取消后订单退回待接单或作废，确认？',
        title: '确认撤回',
        url: '/api/errands/' + id + '/cancel'
      },
      release: {
        confirm: '释放后订单回到待接单，你可能被其他人接走，确认？',
        title: '确认释放',
        url: '/api/errands/' + id + '/release',
        ok: '已释放，订单回到待接单'
      }
    };
    const cfg = map[key];
    if (!cfg) return;

    util.confirm(cfg.confirm, cfg.title).then((ok) => {
      if (!ok) return;
      this.setData({ submitting: true });
      http
        .post(cfg.url, {}, { silent: true })
        .then((res) => {
          if (key === 'cancel') {
            const data = res || {};
            if (data.status === 'cancelled') util.toast('订单已取消');
            else if (data.visibility === 'hall') util.toast('订单已退回大厅');
            else util.toast('订单已退回待接单');
          } else {
            util.toast(cfg.ok || '操作成功');
          }
          return this.refresh().then(() => this.setData({ submitting: false }));
        })
        .catch((err) => {
          this.setData({ submitting: false });
          // 409/403/404 一律透出后端 message（权限与状态校验在后端）
          util.toast((err && err.message) || '操作失败，请重试');
          this.refresh();
        });
    });
  },

  /** 联系对方：URL 契约与详情页 onContact 完全一致（手册 §6.14） */
  onContact(orderId) {
    const id = Number(orderId || 0);
    if (!id) return;
    const card =
      this.data.list.filter((c) => c.orderId === id)[0] ||
      (this.data.sections.reduce((acc, s) => acc.concat(s.list), []).filter((c) => c.orderId === id)[0] ||
        null);
    if (!card || !card.peerId) {
      util.toast('暂无可联系的对象');
      return;
    }
    wx.navigateTo({
      url:
        '/pages/chat/detail?peerId=' + card.peerId + '&bizType=errand&bizId=' + card.orderId,
      fail: () => util.toast('聊天页打开失败')
    });
  },

  onGoPublish() {
    wx.navigateTo({ url: '/pages/errand/publish', fail: () => util.toast('发布页打开失败') });
  },

  /** 空态主按钮：我发布的 → 去发布；我接的 → 去大厅（switchTab，navigateTo 对 tab 页无效） */
  onEmptyAction() {
    if (this.data.role === 'publisher') return this.onGoPublish();
    wx.switchTab({ url: '/pages/errand/hall', fail: () => util.toast('大厅打开失败') });
  },

  onLogin() {
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin('/pages/mine/errands?role=' + this.data.role);
    } else {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  }
});
