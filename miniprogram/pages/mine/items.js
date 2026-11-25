// 我的发布（A 成员，11-18）
// ------------------------------------------------------------------
// 口径（A 手册 11-11 + 2026-11-18 定稿）：
//   · 四个状态横滑椭圆条：在售 / 已预订 / 已售 / 已下架；列表按状态分页请求后端。
//   · 列表只读：复用 item-card list，卡片保留状态标签；状态变更只能进详情页操作。
//   · 从详情返回按已加载页数静默刷新，位置不跳；列表本身不提供状态操作按钮。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');
const listCommon = require('./list-common');

const PAGE_PATH = '/pages/mine/items';

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

const DEFAULT_EMPTY = emptyOf('on_sale');

Page({
  data: {
    parallax: false,
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
    this.setData({ stickyTop: listCommon.getNavBottom() });
  },

  onShow() {
    if (this.data.parallax) this.setData({ parallax: false });
    if (!listCommon.hasLogin()) {
      if (!this._loginRedirected) listCommon.redirectToLogin(PAGE_PATH);
      this.setData({ loading: false, error: '请先登录' });
      return;
    }
    this._loginRedirected = false;

    // 返回页面时若旧 loading 还挂着但列表已有数据，先把骨架放掉
    if (this.data.items.length && this.data.loading) {
      this._loading = false;
      listCommon.clearLoadingWatchdog(this);
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
    listCommon.clearLoadingWatchdog(this);
  },

  onRefresh() {
    if (!listCommon.hasLogin()) {
      this.setData({ pulling: false });
      return;
    }
    this.setData({ pulling: true });
    this.loadFirst().then(() => this.setData({ pulling: false }), () => this.setData({ pulling: false }));
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
      .get(
        '/api/items/mine',
        { status, page, pageSize: listCommon.PAGE_SIZE },
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
    // 视差：原页内容左移 20px，返回 onShow 回弹（11-25 转场增强）
    this.setData({ parallax: true });
    wx.navigateTo({
      url: '/pages/item/detail?id=' + id,
      fail: () => util.toast('详情页打开失败')
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