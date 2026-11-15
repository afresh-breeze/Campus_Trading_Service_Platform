// 代取大厅（B 成员，11-12，tab 2）
// ------------------------------------------------------------------
// 口径（手册 §6.7）：
//   1. 只拉 status=pending，分页 page/pageSize=10；**不在前端二次过滤状态**，
//      过滤逻辑只在后端，避免两边口径不一致；
//   2. 列表只出「已发布到大厅」的单（visibility=hall 由后端 SQL 固定，前端不管）；
//   3. 点卡片带 id 进详情，接单动作在详情页做（详情页只信后端 can*）。
// 字段名注意：后端返回的是 orderId，不是手册 §6.7 表格旧写的 errandId。
//
// 并发（P0-3）：下拉刷新与上拉加载可能同时飞出去，返回顺序不保证。
//   ① 每次请求带自增 seq，回来时不是最新 seq 就整包丢弃；
//   ② 刷新期间（refreshing）禁止 load-more；
//   ③ append 按 orderId 去重，防止 offset 分页在“别人接单”后重复下发同一条。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const TAB_INDEX = 1;
const PAGE_SIZE = 10;
const SIZE_TEXT = { small: '小件', medium: '中件', large: '大件' };

// 筛选条候选（后端 errands.js 的 TIME_TYPES / ITEM_SIZES 原样枚举，空串 = 不限）
const SIZE_CHIPS = [
  { value: '', label: '全部' },
  { value: 'small', label: '小件' },
  { value: 'medium', label: '中件' },
  { value: 'large', label: '大件' }
];
const TIME_CHIPS = [
  { value: '', label: '不限' },
  { value: 'asap', label: '尽快' },
  { value: 'deadline', label: '限时' },
  { value: 'range', label: '时段' }
];

// 品类缩略图：表里没有图片字段，用 itemDesc/remark 关键词猜品类配本地插画。
// 真图片要 A 给 errand_orders 加字段（已列需求清单），这里先解决「看不出是什么」。
const CATEGORY_RULES = [
  { key: 'food', words: ['外卖', '奶茶', '咖啡', '饭', '餐', '早餐', '午餐', '晚餐', '宵夜', '水果', '零食', '饮'] },
  { key: 'doc', words: ['文件', '打印', '资料', '书', '论文', '证件', '作业'] },
  { key: 'daily', words: ['药', '超市', '日用品', '纸巾', '水', '生活'] },
  { key: 'express', words: ['快递', '包裹', '菜鸟', '驿站', '取件'] }
];
function guessCategory(order) {
  const text = ((order.itemDesc || '') + ' ' + (order.remark || '')).toLowerCase();
  for (let i = 0; i < CATEGORY_RULES.length; i += 1) {
    const rule = CATEGORY_RULES[i];
    if (rule.words.some((w) => text.indexOf(w) > -1)) return rule.key;
  }
  return 'other';
}

/** 与 nav-top / 二手首页同一个公式：吸顶内容停在胶囊下方 */
function getNavHeight() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (menu && menu.bottom) return menu.bottom + 6;
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return (win.statusBarHeight || 20) + 44;
  } catch (e) {
    return 64;
  }
}

/** 卡片用紧凑时间：「尽快」/「11-12 18:00 前」/「11-12 09:00 起」 */
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

/** 列表项 → 纯展示结构：wxml 不做计算，也不做字段映射 */
function toCard(order) {
  const place =
    order.pickupPlace && order.pickupPlace !== order.pickupArea
      ? order.pickupArea + ' · ' + order.pickupPlace
      : order.pickupArea || '';
  const nickname = order.publisherNickname || '同学';
  return {
    orderId: order.orderId,
    fromText: place || '取件地点待定',
    toText: order.deliveryLocation || '送达地点待定',
    sizeText: SIZE_TEXT[order.itemSize] || '规格未填',
    timeText: shortTime(order),
    rewardText: util.formatPrice(order.reward),
    itemDesc: order.itemDesc || '',
    categoryIcon: '/assets/errand/' + guessCategory(order) + '.png',
    publisherNickname: nickname,
    publisherInitial: nickname.slice(0, 1),
    publisherAvatarUrl: adapter.fullUrl(order.publisherAvatar),
    createdText: util.fromNow(order.createdAt)
  };
}

Page({
  data: {
    stickyTop: 64,
    stuck: false, // 筛选条是否已吸附（只控制阴影）
    headHidden: false, // 大标题是否已完全滚出视口（控制顶栏小标题出现）
    list: [],
    total: 0,
    page: 1,
    hasMore: true,
    firstLoading: true, // 首屏骨架
    loadingMore: false,
    refreshing: false, // 刷新中：禁止 load-more，避免两路请求交叉
    error: '',
    isLogin: true,
    // 筛选条件：A 的大厅筛选契约（area/itemSize/timeType/sort）落地后由筛选条写入；
    // 空串表示不限，**默认不带任何筛选参数**，与现有请求完全一致。
    filters: { area: '', itemSize: '', timeType: '', sort: 'latest' },
    sizeChips: SIZE_CHIPS,
    timeChips: TIME_CHIPS
  },

  onLoad() {
    // 首屏由 onShow 触发：onLoad 时 app.bootstrap 可能还没跑完
    this._reqSeq = 0;
    this.setData({ stickyTop: getNavHeight() });
  },

  onReady() {
    this.setupStickyObserver();
  },

  onUnload() {
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    if (this._ioHead) {
      this._ioHead.disconnect();
      this._ioHead = null;
    }
  },

  onShow() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar && typeof bar.syncSelected === 'function') {
      bar.syncSelected(TAB_INDEX);
    }
    // 从详情页回来必须刷新：刚接走的单要从列表消失
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.refreshing) return;
    if (this.data.loadingMore || !this.data.hasMore || this.data.error) return;
    this.fetch(this.data.page + 1);
  },

  /**
   * 两个独立判据，别混成一个：
   *   ① stuck      = 哨兵越过吸顶线 → 筛选条吸住了，只加阴影；
   *   ② headHidden = 哨兵越过视口顶   → 大标题**完全滚出去**了，这时才显示顶栏小标题。
   *
   * 为什么不能都用 ①：筛选条吸附时大标题离屏幕顶只差 60px 左右、还在屏上，
   * 顶栏一出现就把大标题盖住，看起来像「文字突然变小 / 弹出」（用户反馈）。
   * 用 ② 让大标题自己滚出、顶栏再补位，两者永不重叠。
   *
   * 哨兵只有 2rpx，临界点手指微抖或惯性回弹会让 crossing 反复触发，
   * 所以两个判据都加最小切换间隔做迟滞，避免连闪。
   */
  setupStickyObserver() {
    if (!wx.createIntersectionObserver) return;
    try {
      this._io = wx.createIntersectionObserver(this, { thresholds: [0] });
      this._io
        .relativeToViewport({ top: -this.data.stickyTop })
        .observe('.hall-sentinel', (res) => {
          this.applyStickyFlag('stuck', res.intersectionRatio <= 0);
        });

      this._ioHead = wx.createIntersectionObserver(this, { thresholds: [0] });
      this._ioHead.relativeToViewport().observe('.hall-sentinel', (res) => {
        this.applyStickyFlag('headHidden', res.intersectionRatio <= 0);
      });
    } catch (e) {
      this._io = null;
      this._ioHead = null;
    }
  },

  /** 带迟滞的布尔状态写入：240ms 内的来回穿越视为抖动，直接忽略 */
  applyStickyFlag(key, value) {
    if (this.data[key] === value) return;
    const now = Date.now();
    if (this._flagAt && now - this._flagAt < 240) return;
    this._flagAt = now;
    const patch = {};
    patch[key] = value;
    this.setData(patch);
  },

  /** 筛选/排序变化：清空旧列表，回到顶部，重拉第一页 */
  resetAndFetch(patch) {
    this.setData(
      Object.assign(
        {
          list: [],
          total: 0,
          hasMore: true,
          firstLoading: true,
          error: ''
        },
        patch
      )
    );
    // 老基础库可能没有 pageScrollTo，缺函数时跳过回顶
    if (wx.pageScrollTo) wx.pageScrollTo({ scrollTop: 0, duration: 200, fail: () => {} });
    this.fetch(1);
  },

  onFilterTap(e) {
    const type = e.currentTarget.dataset.type;
    const value = e.currentTarget.dataset.value || '';
    if (!type || this.data.filters[type] === value) return;
    this.resetAndFetch(this._pick('filters.' + type, value));
  },

  onSortLatest() {
    if (this.data.filters.sort === 'latest') return;
    this.resetAndFetch(this._pick('filters.sort', 'latest'));
  },

  /** 报酬排序：latest → 降序 → 升序 循环 */
  onSortReward() {
    const cur = this.data.filters.sort;
    const next = cur === 'reward_desc' ? 'reward_asc' : 'reward_desc';
    this.resetAndFetch(this._pick('filters.sort', next));
  },

  _pick(key, value) {
    const patch = {};
    patch[key] = value;
    return patch;
  },

  /** 重置到第一页；返回 Promise 便于下拉刷新收尾 */
  refresh() {
    const app = getApp();
    const isLogin = !!(app && typeof app.isLogin === 'function' && app.isLogin());
    if (!isLogin) {
      // 未登录不进列表：后端会 401，弹错误反而干扰；直接给登录引导
      this.setData({ isLogin: false, list: [], total: 0, firstLoading: false, error: '' });
      return Promise.resolve();
    }
    this.setData({ isLogin: true, refreshing: true });
    return this.fetch(1);
  },

  /** 组装 query：只带非空筛选项（默认 filters 全空 = 与旧请求一致） */
  buildQuery(page) {
    const f = this.data.filters || {};
    const query = { status: 'pending', page, pageSize: PAGE_SIZE };
    if (f.area) query.area = f.area;
    if (f.itemSize) query.itemSize = f.itemSize;
    if (f.timeType) query.timeType = f.timeType;
    if (f.sort) query.sort = f.sort;
    return query;
  },

  fetch(page) {
    const isFirst = page === 1;
    // 每次请求带自增序号；响应回来时不等于最新序号就丢弃（P0-3）
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);

    if (isFirst) this.setData({ firstLoading: this.data.list.length === 0, error: '' });
    else this.setData({ loadingMore: true });

    return http
      .get('/api/errands', this.buildQuery(page), { silent: true })
      .then((res) => {
        if (seq !== this._reqSeq) return null; // 过期响应：整包丢弃，不碰列表
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        const cards = rows.map(toCard);

        let list;
        if (isFirst) {
          list = cards;
        } else {
          // 按 orderId 去重：offset 分页在总数变化时会重复下发同一条
          const seen = {};
          this.data.list.forEach((it) => {
            seen[it.orderId] = true;
          });
          list = this.data.list.concat(cards.filter((it) => !seen[it.orderId]));
        }
        const total = Number(data.total || 0);

        this.setData({
          list,
          total,
          page,
          // 用「已加载数量 < 总数」判断，比 rows.length 更稳（并发接单会让 total 变小）
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
        this.setData({
          firstLoading: false,
          loadingMore: false,
          refreshing: false,
          // 首屏失败才整页错误态；翻页失败保留已有列表，只提示
          error: isFirst ? (err && err.message) || '加载失败' : ''
        });
        if (!isFirst) util.toast((err && err.message) || '加载失败，请重试');
        return null;
      });
  },

  onRetry() {
    this.setData({ firstLoading: true });
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

  onPublish() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/errand/hall');
      return;
    }
    wx.navigateTo({ url: '/pages/errand/publish', fail: () => util.toast('发布页打开失败') });
  },

  onGoRunner() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/errand/hall');
      return;
    }
    // 11-13 实现：mode=online 表示「上线 / 接单设置」双入口的第二个
    wx.navigateTo({
      url: '/pages/mine/runner?mode=online',
      fail: () => util.toast('接单设置页打开失败')
    });
  },

  onLogin() {
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin('/pages/errand/hall');
    } else {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  }
});
