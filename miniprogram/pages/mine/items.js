// 我的发布（A 成员，11-18）
// ------------------------------------------------------------------
// 口径（A 手册 11-11 + 2026-11-18 定稿）：
//   · 四个状态横滑椭圆条：在售 / 已预订 / 已售 / 已下架；列表按状态分页请求后端。
//   · 列表只读：复用 item-card list，卡片保留状态标签；状态变更只能进详情页操作。
//   · 从详情返回按已加载页数静默刷新，位置不跳；列表本身不提供状态操作按钮。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const PAGE_PATH = '/pages/mine/items';
const PAGE_SIZE = 10;

const TABS = [
  { key: 'on_sale', label: '在售' },
  { key: 'reserved', label: '已预订' },
  { key: 'sold', label: '已售' },
  { key: 'off_shelf', label: '已下架' }
];

function emptyOf(status) {
  if (status === 'on_sale') {
    return {
      title: '还没有在售的商品',
      desc: '发布一件闲置，让同学看到',
      action: '去发布'
    };
  }
  const label = status === 'reserved' ? '已预订' : status === 'sold' ? '已售' : '已下架';
  return {
    title: '还没有' + label + '的商品',
    desc: '去在售里看看已发布的商品',
    action: '去在售看看'
  };
}

/** 与 nav-top fixed 同口径：胶囊底部 + 6px，让 tab 吸在导航栏下方 */
function getNavBottom() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;
    if (menu && menu.bottom) return menu.bottom + 6;
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return (win.statusBarHeight || 20) + 44;
  } catch (e) {
    return 64;
  }
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
    error: ''
  },

  onLoad() {
    this._reqSeq = 0;
    this._loginRedirected = false;
    this._loading = false;
    this._loadingStartedAt = 0;
    this._loadingWatchdog = null;
    this.setData({ stickyTop: getNavBottom() });
  },

  onShow() {
    if (!this.hasLogin()) {
      if (!this._loginRedirected) this.redirectToLogin();
      this.setData({ loading: false, error: '请先登录' });
      return;
    }
    this._loginRedirected = false;

    // 返回页面时若旧 loading 还挂着但列表已有数据，先把骨架放掉
    if (this.data.items.length && this.data.loading) {
      this._loading = false;
      this.clearLoadingWatchdog();
      this.setData({ loading: false });
    }
    // 首次加载/刷新已在进行中就不要重复发请求，等它自己收尾
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
    this.clearLoadingWatchdog();
  },

  onPullDownRefresh() {
    if (!this.hasLogin()) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadFirst().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.hasLogin()) return;
    if (!this.data.hasMore || !this.data.items.length) return;
    if (this.data.loading || this.data.loadingMore || this.data.refreshing) return;
    this.loadMore();
  },

  hasLogin() {
    const app = getApp();
    return !!(app && typeof app.isLogin === 'function' && app.isLogin());
  },

  clearLoadingWatchdog() {
    if (this._loadingWatchdog) {
      clearTimeout(this._loadingWatchdog);
      this._loadingWatchdog = null;
    }
  },

  redirectToLogin() {
    this._loginRedirected = true;
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin(PAGE_PATH);
      return;
    }
    wx.redirectTo({
      url: '/pages/login/login?redirect=' + encodeURIComponent(PAGE_PATH)
    });
  },

  // ---------------- 数据 ----------------

  fetchPage(status, page) {
    return http
      .get(
        '/api/items/mine',
        { status, page, pageSize: PAGE_SIZE },
        { silent: true }
      )
      .then((res) => {
        const data = res || {};
        return {
          rows: Array.isArray(data.list) ? data.list : [],
          total: Number(data.total || 0)
        };
      });
  },

  toCards(rows) {
    return adapter.toItemList(rows);
  },

  loadFirst() {
    const status = this.data.status;
    const seq = (this._reqSeq += 1);
    this._loading = true;
    this._loadingStartedAt = Date.now();
    this.clearLoadingWatchdog();
    this._loadingWatchdog = setTimeout(() => {
      this._loadingWatchdog = null;
      if (seq !== this._reqSeq) return;
      this._loading = false;
      this.setData({ loading: false, error: '加载超时，请下拉刷新重试' });
    }, 10000);

    this.setData({
      loading: true,
      loadingMore: false,
      refreshing: false,
      error: '',
      items: [],
      total: 0,
      page: 1,
      hasMore: true
    });
    try {
      wx.pageScrollTo({ scrollTop: 0, duration: 0, fail: () => {} });
    } catch (e) {
      // 页面还没就绪时滚动失败，不影响列表请求
    }

    let request;
    try {
      request = this.fetchPage(status, 1);
    } catch (err) {
      this._loading = false;
      this.clearLoadingWatchdog();
      this.setData({
        loading: false,
        items: [],
        total: 0,
        hasMore: false,
        error: (err && err.message) || '加载失败，请重试'
      });
      return Promise.resolve();
    }

    return request
      .then((result) => {
        if (seq !== this._reqSeq) return;
        this._loading = false;
        this.clearLoadingWatchdog();
        const items = this.toCards(result.rows);
        this.setData({
          items,
          total: result.total,
          page: 1,
          hasMore: items.length < result.total,
          loading: false,
          error: ''
        });
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return;
        this._loading = false;
        this.clearLoadingWatchdog();
        this.setData({
          loading: false,
          items: [],
          total: 0,
          hasMore: false,
          error: (err && err.message) || '请检查网络后重试'
        });
      });
  },

  /** 按已加载页数静默刷新，保持列表深度与滚动位置 */
  refreshLoaded() {
    if (!this.hasLogin()) return Promise.resolve();
    if (!this.data.items.length) {
      // 已有首屏请求在飞就等它，避免重复请求互相顶掉
      if (
        this.data.loading &&
        this._loading &&
        Date.now() - this._loadingStartedAt < 5000
      ) {
        return Promise.resolve();
      }
      return this.loadFirst();
    }

    const status = this.data.status;
    const loadedPage = Math.max(1, this.data.page || 1);
    const seq = (this._reqSeq += 1);
    this.setData({ refreshing: true, loadingMore: false, error: '' });

    const requests = [];
    for (let page = 1; page <= loadedPage; page += 1) {
      requests.push(this.fetchPage(status, page));
    }

    return Promise.all(requests)
      .then((results) => {
        if (seq !== this._reqSeq) return;
        const seen = {};
        const cards = [];
        results.forEach((result) => {
          result.rows.forEach((row) => {
            const card = adapter.toItem(row);
            if (!card.itemId || seen[card.itemId]) return;
            seen[card.itemId] = true;
            cards.push(card);
          });
        });
        const total = results.length ? results[0].total : 0;
        this.setData({
          items: cards,
          total,
          page: Math.max(1, Math.ceil(cards.length / PAGE_SIZE)),
          hasMore: cards.length < total,
          loading: false,
          loadingMore: false,
          refreshing: false,
          error: ''
        });
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return;
        this.setData({ refreshing: false, loading: false, loadingMore: false });
        util.toast((err && err.message) || '刷新失败，请稍后重试');
      });
  },

  loadMore() {
    const status = this.data.status;
    const next = (this.data.page || 1) + 1;
    const seq = (this._reqSeq += 1);
    this.setData({ loadingMore: true });

    return this.fetchPage(status, next)
      .then((result) => {
        if (seq !== this._reqSeq) return;
        const seen = {};
        this.data.items.forEach((item) => {
          seen[item.itemId] = true;
        });
        const appended = [];
        result.rows.forEach((row) => {
          const card = adapter.toItem(row);
          if (!card.itemId || seen[card.itemId]) return;
          seen[card.itemId] = true;
          appended.push(card);
        });
        const items = this.data.items.concat(appended);
        this.setData({
          items,
          total: result.total,
          page: next,
          hasMore: items.length < result.total && result.rows.length > 0,
          loadingMore: false
        });
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return;
        this.setData({ loadingMore: false });
        util.toast((err && err.message) || '加载更多失败，请重试');
      });
  },

  // ---------------- 交互 ----------------

  onTabChange(e) {
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
      wx.navigateTo({
        url: '/pages/item/publish',
        fail: () => util.toast('发布页打开失败')
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

  onRetry() {
    if (this.data.error === '请先登录') {
      this.redirectToLogin();
      return;
    }
    if (this.data.items.length) this.refreshLoaded();
    else this.loadFirst();
  }
});