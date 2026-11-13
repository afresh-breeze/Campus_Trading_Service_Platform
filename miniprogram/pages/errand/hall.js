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
    publisherNickname: nickname,
    publisherInitial: nickname.slice(0, 1),
    publisherAvatarUrl: adapter.fullUrl(order.publisherAvatar),
    createdText: util.fromNow(order.createdAt)
  };
}

Page({
  data: {
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
    filters: { area: '', itemSize: '', timeType: '', sort: 'latest' }
  },

  onLoad() {
    // 首屏由 onShow 触发：onLoad 时 app.bootstrap 可能还没跑完
    this._reqSeq = 0;
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
    wx.navigateTo({ url: '/pages/errand/publish', fail: () => util.toast('发布页尚未实现') });
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
      fail: () => util.toast('接单设置页尚未实现')
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
