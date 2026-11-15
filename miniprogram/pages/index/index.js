// 二手市场（A 成员，11-14）：列表、分类、排序、下拉刷新、上拉加载
// ------------------------------------------------------------------
// 口径（二手首页定稿）：
//   1. 只展示 on_sale，状态过滤交给后端，前端不二次过滤；
//   2. 搜索胶囊只做入口，跳 /pages/search/result，首页不弹键盘；
//   3. 分类单选（0 = 全部），排序 latest / price_asc / price_desc；
//   4. 每页 6 条：当前 seed 8 件在售，可演示 6 + 2 的上拉加载；
//   5. 每次 onShow 重拉第一页；筛选/排序变化清空旧列表并显示骨架；
//   6. 请求带自增 seq，过期响应整包丢弃；上拉按 itemId 去重。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const PAGE_SIZE = 6;
const TAB_INDEX = 0;
const ALL_CATEGORY = { categoryId: 0, name: '全部' };

/** 与 nav-top 同一个公式：吸顶内容停在胶囊下方 */
function getNavHeight() {
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

Page({
  data: {
    stickyTop: 64,
    stuck: false,
    isLogin: true,
    firstLoading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    list: [],
    total: 0,
    countReady: false,
    page: 1,
    hasMore: true,
    categories: [ALL_CATEGORY],
    categoryId: 0,
    sort: 'latest'
  },

  onLoad() {
    this._reqSeq = 0;
    this._categoriesLoading = false;
    this.setData({ stickyTop: getNavHeight() });
  },

  onReady() {
    this.setupStickyObserver();
  },

  onShow() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar && typeof bar.syncSelected === 'function') {
      bar.syncSelected(TAB_INDEX);
    }
    this.refresh();
  },

  onUnload() {
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.refreshing || this.data.loadingMore || this.data.firstLoading) return;
    if (!this.data.hasMore || this.data.error) return;
    this.fetch(this.data.page + 1);
  },

  /** 吸顶后加阴影：观察标题区下方的哨兵是否越过吸顶线 */
  setupStickyObserver() {
    if (!wx.createIntersectionObserver) return;
    try {
      this._io = wx.createIntersectionObserver(this, { thresholds: [0] });
      this._io
        .relativeToViewport({ top: -this.data.stickyTop })
        .observe('.home-sentinel', (res) => {
          const stuck = res.intersectionRatio <= 0;
          if (stuck !== this.data.stuck) this.setData({ stuck });
        });
    } catch (e) {
      // 老基础库不支持时只保留吸顶，不加阴影
      this._io = null;
    }
  },

  /** 重拉第一页；返回 Promise 供下拉刷新收尾 */
  refresh() {
    const app = getApp();
    const isLogin = !!(app && typeof app.isLogin === 'function' && app.isLogin());
    if (!isLogin) {
      this.setData({
        isLogin: false,
        list: [],
        total: 0,
        countReady: false,
        firstLoading: false,
        loadingMore: false,
        refreshing: false,
        hasMore: false,
        error: ''
      });
      return Promise.resolve();
    }
    this.setData({ isLogin: true, refreshing: true });
    this.loadCategories();
    return this.fetch(1);
  },

  /** 分类只拉一次；失败时保留「全部」，下次刷新再试 */
  loadCategories() {
    if (this._categoriesLoading || this.data.categories.length > 1) return;
    this._categoriesLoading = true;
    http
      .get('/api/categories', {}, { silent: true })
      .then((res) => {
        const rows = (res && res.list) || [];
        const categories = [ALL_CATEGORY].concat(
          rows.map((c) => ({
            categoryId: Number(c.categoryId),
            name: c.name
          }))
        );
        this.setData({ categories });
      })
      .catch(() => {
        // 分类失败不阻塞列表，保留「全部」
      })
      .then(() => {
        this._categoriesLoading = false;
      });
  },

  buildQuery(page) {
    const query = { page, pageSize: PAGE_SIZE, sort: this.data.sort };
    if (this.data.categoryId > 0) query.categoryId = this.data.categoryId;
    return query;
  },

  fetch(page) {
    const isFirst = page === 1;
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);

    if (isFirst) {
      this.setData({
        firstLoading: this.data.list.length === 0,
        loadingMore: false,
        refreshing: true,
        error: ''
      });
    } else {
      this.setData({ loadingMore: true });
    }

    return http
      .get('/api/items', this.buildQuery(page), { silent: true })
      .then((res) => {
        if (seq !== this._reqSeq) return null;
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        // 首页只出 on_sale；item-card 的 list 模式会对任意 status 渲染标签，
        // 这里置空，避免每张卡都挂一个「在售」。
        const cards = adapter.toItemList(rows).map((it) =>
          Object.assign({}, it, { status: '' })
        );

        let list;
        if (isFirst) {
          list = cards;
        } else {
          const seen = {};
          this.data.list.forEach((it) => {
            seen[it.itemId] = true;
          });
          list = this.data.list.concat(cards.filter((it) => !seen[it.itemId]));
        }
        const total = Number(data.total || 0);

        this.setData({
          list,
          total,
          countReady: true,
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
        const message = (err && err.message) || '加载失败';
        const hasList = this.data.list.length > 0;
        const isAuthError = err && (err.code === 401 || err.status === 401 || err.code === 403);

        this.setData({
          firstLoading: false,
          loadingMore: false,
          refreshing: false,
          // 首屏失败才整页错误态；已有列表时保留列表，只提示
          error: isFirst && !hasList ? message : ''
        });

        if (!isAuthError) {
          if (isFirst && hasList) util.toast('刷新失败，请稍后重试');
          else if (!isFirst) util.toast(message || '加载失败，请重试');
        }
        return null;
      });
  },

  /** 分类/排序变化：清空旧列表，回到顶部，重新拉第一页 */
  resetAndFetch(patch) {
    this.setData(
      Object.assign(
        {
          list: [],
          total: 0,
          countReady: false,
          hasMore: true,
          firstLoading: true,
          error: ''
        },
        patch
      )
    );
    wx.pageScrollTo({ scrollTop: 0, duration: 200, fail: () => {} });
    this.fetch(1);
  },

  onCategoryTap(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (id === this.data.categoryId) return;
    this.resetAndFetch({ categoryId: id });
  },

  onSortLatest() {
    if (this.data.sort === 'latest') return;
    this.resetAndFetch({ sort: 'latest' });
  },

  onSortPrice() {
    // latest → 升序；再点 → 降序；再点 → 升序
    const next = this.data.sort === 'price_asc' ? 'price_desc' : 'price_asc';
    this.resetAndFetch({ sort: next });
  },

  onViewAll() {
    if (this.data.categoryId === 0) return;
    this.resetAndFetch({ categoryId: 0 });
  },

  onSearchTap() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/search/result');
      return;
    }
    wx.navigateTo({
      url: '/pages/search/result',
      fail: () => util.toast('搜索页打开失败')
    });
  },

  onTapItem(e) {
    const id = e.detail && e.detail.itemId;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/item/detail?id=' + id,
      fail: () => util.toast('详情页打开失败')
    });
  },

  onPublish() {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/index/index');
      return;
    }
    wx.navigateTo({
      url: '/pages/item/publish',
      fail: () => util.toast('发布页尚未实现')
    });
  },

  onLogin() {
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin('/pages/index/index');
    } else {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  onRetry() {
    this.setData({ firstLoading: true, error: '' });
    this.refresh();
  }
});
