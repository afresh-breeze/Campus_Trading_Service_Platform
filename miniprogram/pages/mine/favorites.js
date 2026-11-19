// 我的收藏（A 成员，11-18）
// ------------------------------------------------------------------
// 口径：
//   · 顶部四状态横滑筛选（复用首页分类样式），默认在售；GET /api/favorites?status=。
//   · 卡片用 item-card list，show-time 显示商品发布时间；卡片保留状态标签。
//   · 右下角悬浮心形取消收藏：确认 → DELETE → 本地移除并静默刷新。
//   · 每页 10 条、下拉刷新、上拉加载；onShow 按已加载页数静默刷新。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');
const listCommon = require('./list-common');

const PAGE_PATH = '/pages/mine/favorites';

const TABS = [
  { key: 'on_sale', label: '在售' },
  { key: 'reserved', label: '已预订' },
  { key: 'sold', label: '已售' },
  { key: 'off_shelf', label: '已下架' }
];

function emptyOf(status) {
  if (status === 'on_sale') {
    return {
      title: '还没有收藏的在售商品',
      desc: '去二手市场看看，遇到喜欢的就收藏',
      action: '去逛逛'
    };
  }
  const label = status === 'reserved' ? '已预订' : status === 'sold' ? '已售' : '已下架';
  return {
    title: '还没有收藏的' + label + '商品',
    desc: '去在售里看看收藏的商品',
    action: '去在售看看'
  };
}

const DEFAULT_EMPTY = emptyOf('on_sale');

Page({
  data: {
    tabs: TABS,
    status: 'on_sale',
    stickyTop: 64,
    emptyTitle: DEFAULT_EMPTY.title,
    emptyDesc: DEFAULT_EMPTY.desc,
    emptyActionText: DEFAULT_EMPTY.action,
    items: [],
    total: 0,
    page: 1,
    hasMore: true,
    loading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    cancelingId: 0
  },

  onLoad() {
    this._reqSeq = 0;
    this._loginRedirected = false;
    this._loading = false;
    this._loadingStartedAt = 0;
    this._loadingWatchdog = null;
    this.setData({ stickyTop: listCommon.getNavBottom() });
  },

  onShow() {
    if (!listCommon.hasLogin()) {
      if (!this._loginRedirected) listCommon.redirectToLogin(PAGE_PATH);
      this.setData({ loading: false, error: '请先登录' });
      return;
    }
    this._loginRedirected = false;

    if (this.data.items.length && this.data.loading) {
      this._loading = false;
      listCommon.clearLoadingWatchdog(this);
      this.setData({ loading: false });
    }
    if (
      this.data.loading &&
      this._loading &&
      Date.now() - this._loadingStartedAt < 5000
    ) {
      return;
    }
    this.refreshLoaded();
  },

  onUnload() {
    this._reqSeq += 1;
    listCommon.clearLoadingWatchdog(this);
  },

  onPullDownRefresh() {
    if (!listCommon.hasLogin()) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadFirst().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!listCommon.hasLogin()) return;
    if (!this.data.hasMore || !this.data.items.length) return;
    if (this.data.loading || this.data.loadingMore || this.data.refreshing) return;
    this.loadMore();
  },

  // ---------------- 数据 ----------------

  fetchPage(status, page) {
    return http
      .get('/api/favorites', { status, page, pageSize: listCommon.PAGE_SIZE }, { silent: true })
      .then((res) => {
        const data = res || {};
        return {
          rows: Array.isArray(data.list) ? data.list : [],
          total: Number(data.total || 0)
        };
      });
  },

  toCard(raw) {
    const item = adapter.toItem(raw);
    // item-card 自带状态标签固定右下，A 不能改 B 组件；置空后由页面左上角 status-tag 显示
    return Object.assign({}, item, {
      rawStatus: item.status,
      status: ''
    });
  },

  toCards(rows) {
    return rows.map((row) => this.toCard(row));
  },

  loadFirst() {
    return listCommon.loadFirst(this);
  },

  refreshLoaded() {
    return listCommon.refreshLoaded(this);
  },

  loadMore() {
    return listCommon.loadMore(this);
  },

  // ---------------- 交互 ----------------

  onTabChange(e) {
    if (this.data.cancelingId) return;
    const status = e.currentTarget.dataset.key;
    if (!status || status === this.data.status) return;
    const copy = emptyOf(status);
    this.setData({
      status,
      emptyTitle: copy.title,
      emptyDesc: copy.desc,
      emptyActionText: copy.action
    });
    this.loadFirst();
  },

  onEmptyAction() {
    if (this.data.status === 'on_sale') {
      wx.switchTab({
        url: '/pages/index/index',
        fail: () => util.toast('首页打开失败')
      });
      return;
    }
    const copy = emptyOf('on_sale');
    this.setData({
      status: 'on_sale',
      emptyTitle: copy.title,
      emptyDesc: copy.desc,
      emptyActionText: copy.action
    });
    this.loadFirst();
  },

  onTapItem(e) {
    const id = Number((e.detail && e.detail.itemId) || 0);
    if (!id) return;
    wx.navigateTo({
      url: '/pages/item/detail?id=' + id,
      fail: () => util.toast('详情页打开失败')
    });
  },

  onCancelFavorite(e) {
    if (this.data.cancelingId) return;
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;

    util.confirm('取消收藏后可在商品详情页重新收藏，确认取消？', '取消收藏').then((ok) => {
      if (!ok) return;
      this.setData({ cancelingId: id });
      http
        .del('/api/items/' + id + '/favorite', {}, { silent: true })
        .then(() => {
          this.removeItem(id);
          util.toast('已取消收藏');
          return this.refreshLoaded().then((ok) => {
            // 静默刷新失败时回到第 1 页，避免本地移除后分页 offset 漏数据
            if (ok === false) return this.loadFirst();
            return null;
          });
        })
        .catch((err) => {
          const code = err && err.code;
          if (code === 404) {
            this.removeItem(id);
            util.toast('商品已不存在，已从收藏移除');
            return;
          }
          const isAuth = err && (err.code === 401 || err.status === 401 || err.code === 403);
          if (!isAuth) {
            util.toast((err && err.message) || '取消失败，请稍后重试');
          }
        })
        .then(() => this.setData({ cancelingId: 0 }));
    });
  },

  removeItem(id) {
    const items = this.data.items.filter((item) => item.itemId !== id);
    const total = Math.max(0, this.data.total - 1);
    this.setData({
      items,
      total,
      hasMore: items.length < total
    });
  },

  onRetry() {
    if (this.data.error === '请先登录') {
      listCommon.redirectToLogin(PAGE_PATH);
      return;
    }
    if (this.data.items.length) this.refreshLoaded();
    else this.loadFirst();
  }
});