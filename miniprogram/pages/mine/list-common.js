// 我的发布 / 我的收藏 共用的分页列表逻辑（A 成员，11-19）
// 页面需提供：data（status/items/total/page/hasMore/loading/loadingMore/refreshing/error）、
// fetchPage(status, page)、toCards(rows)、setData、_reqSeq/_loading/_loadingStartedAt/_loadingWatchdog。
const util = require('../../utils/util');

const PAGE_SIZE = 10;

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

function hasLogin() {
  const app = getApp();
  return !!(app && typeof app.isLogin === 'function' && app.isLogin());
}

function clearLoadingWatchdog(page) {
  if (page._loadingWatchdog) {
    clearTimeout(page._loadingWatchdog);
    page._loadingWatchdog = null;
  }
}

function redirectToLogin(pagePath) {
  const app = getApp();
  if (app && typeof app.requireLogin === 'function') {
    app.requireLogin(pagePath);
    return;
  }
  wx.redirectTo({
    url: '/pages/login/login?redirect=' + encodeURIComponent(pagePath)
  });
}

function loadFirst(page) {
  const status = page.data.status;
  const seq = (page._reqSeq += 1);
  page._loading = true;
  page._loadingStartedAt = Date.now();
  clearLoadingWatchdog(page);
  page._loadingWatchdog = setTimeout(() => {
    page._loadingWatchdog = null;
    if (seq !== page._reqSeq) return;
    page._loading = false;
    page.setData({ loading: false, error: '加载超时，请下拉刷新重试' });
  }, 10000);

  page.setData({
    loading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    items: [],
    total: 0,
    page: 1,
    hasMore: true
  });
  // 回顶改走 scroll-view 的 scroll-top（11-25 下拉刷新改 refresher 后页级滚动失效）
  page.setData({ svTop: (page.data.svTop || 0) > 0 ? 0 : 0.1 });

  let request;
  try {
    request = page.fetchPage(status, 1);
  } catch (err) {
    page._loading = false;
    clearLoadingWatchdog(page);
    page.setData({
      loading: false,
      items: [],
      total: 0,
      hasMore: false,
      error: (err && err.message) || '加载失败，请重试'
    });
    return Promise.resolve(false);
  }

  return request
    .then((result) => {
      if (seq !== page._reqSeq) return null;
      page._loading = false;
      clearLoadingWatchdog(page);
      const items = page.toCards(result.rows);
      page.setData({
        items,
        total: result.total,
        page: 1,
        hasMore: items.length < result.total,
        loading: false,
        error: ''
      });
      return true;
    })
    .catch((err) => {
      if (seq !== page._reqSeq) return null;
      page._loading = false;
      clearLoadingWatchdog(page);
      page.setData({
        loading: false,
        items: [],
        total: 0,
        hasMore: false,
        error: (err && err.message) || '请检查网络后重试'
      });
      return false;
    });
}

/** 按已加载页数串行刷新，返回 true=成功 / false=失败 / null=已被更新请求顶掉 */
async function refreshLoaded(page) {
  if (!hasLogin()) return null;
  if (!page.data.items.length) {
    if (
      page.data.loading &&
      page._loading &&
      Date.now() - page._loadingStartedAt < 5000
    ) {
      return null;
    }
    return loadFirst(page);
  }

  const status = page.data.status;
  const loadedPage = Math.max(1, page.data.page || 1);
  const seq = (page._reqSeq += 1);
  page.setData({ refreshing: true, loadingMore: false, error: '' });

  const results = [];
  try {
    for (let current = 1; current <= loadedPage; current += 1) {
      if (seq !== page._reqSeq) return null;
      results.push(await page.fetchPage(status, current));
    }
  } catch (err) {
    if (seq !== page._reqSeq) return null;
    page.setData({ refreshing: false, loading: false, loadingMore: false });
    util.toast((err && err.message) || '刷新失败，请稍后重试');
    return false;
  }

  if (seq !== page._reqSeq) return null;
  const seen = {};
  const cards = [];
  results.forEach((result) => {
    page.toCards(result.rows).forEach((card) => {
      if (!card.itemId || seen[card.itemId]) return;
      seen[card.itemId] = true;
      cards.push(card);
    });
  });
  const total = results.length ? results[0].total : 0;
  page.setData({
    items: cards,
    total,
    page: Math.max(1, Math.ceil(cards.length / PAGE_SIZE)),
    hasMore: cards.length < total,
    loading: false,
    loadingMore: false,
    refreshing: false,
    error: ''
  });
  return true;
}

function loadMore(page) {
  const status = page.data.status;
  const next = (page.data.page || 1) + 1;
  const seq = (page._reqSeq += 1);
  page.setData({ loadingMore: true });

  return page.fetchPage(status, next)
    .then((result) => {
      if (seq !== page._reqSeq) return null;
      const seen = {};
      page.data.items.forEach((item) => {
        seen[item.itemId] = true;
      });
      const appended = [];
      page.toCards(result.rows).forEach((card) => {
        if (!card.itemId || seen[card.itemId]) return;
        seen[card.itemId] = true;
        appended.push(card);
      });
      const items = page.data.items.concat(appended);
      page.setData({
        items,
        total: result.total,
        page: next,
        hasMore: items.length < result.total && result.rows.length > 0,
        loadingMore: false
      });
      return true;
    })
    .catch((err) => {
      if (seq !== page._reqSeq) return null;
      page.setData({ loadingMore: false });
      util.toast((err && err.message) || '加载更多失败，请重试');
      return false;
    });
}

module.exports = {
  PAGE_SIZE,
  getNavBottom,
  hasLogin,
  clearLoadingWatchdog,
  redirectToLogin,
  loadFirst,
  refreshLoaded,
  loadMore
};