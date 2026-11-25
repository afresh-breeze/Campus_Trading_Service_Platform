// 搜索结果（A 成员，11-16）：书目区 + 商品区
// ------------------------------------------------------------------
// 口径（搜索页定稿）：
//   1. 关键词同时查 /api/books/search 与 /api/items，书目区在上、商品区在下；
//   2. 书目卡只展示 onSaleCount > 0 的书，默认 3 条可展开；
//   3. 点书目卡只按 bookId 查该书全部在售商品（忽略关键词），再点一次或点 × 取消；
//   4. 商品 list 卡每页 6 条，排序 latest / price_asc / price_desc，换词/换书保留排序；
//   5. 确认搜索才发请求；历史 8 条存本地，未输入时展示；
//   6. 未登录不发请求，显示登录引导空态；返回详情页不重搜。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');
const config = require('../../config');

const PAGE_SIZE = 6;
const HISTORY_KEY = (config.STORAGE_KEY && config.STORAGE_KEY.SEARCH_HISTORY) || 'cs_search_history';
const HISTORY_MAX = 8;
const BOOK_PREVIEW = 3;

/** 标题行与右上角胶囊齐平：占位到胶囊顶，行高 = 胶囊高 */
function getNavMetrics() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;
    if (menu && menu.top && menu.height) return { top: menu.top, height: menu.height };
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return { top: (win.statusBarHeight || 20) + 4, height: 32 };
  } catch (e) {
    return { top: 24, height: 32 };
  }
}

/** 书目行 → 页面展示对象；后端或 mock 未给 onSaleCount 时记 null，不伪装成 0 */
function mapBook(raw) {
  const book = raw || {};
  const rawCount = book.onSaleCount;
  const countKnown = rawCount !== undefined && rawCount !== null && rawCount !== '';
  return {
    bookId: adapter.num(book.bookId, 0),
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    isbn: book.isbn || '',
    coverUrl: adapter.fullUrl(book.coverUrl || ''),
    onSaleCount: countKnown ? adapter.num(rawCount, 0) : null
  };
}

Page({
  data: {
    stickyTop: 24,
    barHead: 32,
    isLogin: true,
    keyword: '',
    submittedKeyword: '',
    history: [],
    books: [],
    booksLoading: false,
    booksExpanded: false,
    bookPreview: BOOK_PREVIEW,
    activeBook: null,
    items: [],
    total: 0,
    countReady: false,
    page: 1,
    hasMore: true,
    firstLoading: false,
    loadingMore: false,
    refreshing: false,
    error: '',
    sort: 'latest',
    autoFocus: false,
    showSuggest: false,
    suggestKeyword: '',
    suggestions: [],
    suggestLoading: false
  },

  onLoad(options) {
    this._itemsSeq = 0;
    this._booksSeq = 0;
    this._suggestSeq = 0;
    this._suggestTimer = null;
    this._blurTimer = null;
    const nav = getNavMetrics();
    const app = getApp();
    const isLogin = !!(app && typeof app.isLogin === 'function' && app.isLogin());
    const initial = options && options.keyword ? String(options.keyword).trim() : '';

    this.setData({
      stickyTop: nav.top,
      barHead: nav.height,
      isLogin,
      history: this.readHistory(),
      keyword: initial.slice(0, 100)
    });

    if (isLogin && initial) {
      this.submitSearch(initial);
    }
  },

  onReady() {
    if (this.data.isLogin && !this.data.submittedKeyword) {
      this.setData({ autoFocus: true });
    }
  },

  onShow() {
    const app = getApp();
    const isLogin = !!(app && typeof app.isLogin === 'function' && app.isLogin());
    if (isLogin !== this.data.isLogin) {
      this.setData({ isLogin });
      if (!isLogin) this.resetToInitial();
    }
  },

  onUnload() {
    this.cancelSuggestTimers();
    this._suggestSeq = (this._suggestSeq || 0) + 1;
  },

  onPageScroll() {
    if (this.data.showSuggest) this.setData({ showSuggest: false });
  },

  onRefresh() {
    if (!this.data.submittedKeyword) {
      this.setData({ pulling: false });
      return;
    }
    this.setData({ pulling: true });
    const jobs = [this.fetchItems(1)];
    if (!this.data.activeBook) jobs.push(this.fetchBooks(this.data.submittedKeyword));
    Promise.all(jobs).then(() => this.setData({ pulling: false }), () => this.setData({ pulling: false }));
  },

  onReachBottom() {
    if (this.data.firstLoading || this.data.loadingMore || this.data.refreshing) return;
    if (!this.data.hasMore || this.data.error) return;
    this.fetchItems(this.data.page + 1);
  },

  // ---------------- 搜索历史 ----------------

  readHistory() {
    try {
      const raw = wx.getStorageSync(HISTORY_KEY);
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((k) => typeof k === 'string' && k.trim())
        .slice(0, HISTORY_MAX);
    } catch (e) {
      return [];
    }
  },

  saveHistory(keyword) {
    const list = [keyword]
      .concat(this.readHistory().filter((k) => k !== keyword))
      .slice(0, HISTORY_MAX);
    try {
      wx.setStorageSync(HISTORY_KEY, list);
    } catch (e) {
      // 本地存储失败不影响搜索
    }
    this.setData({ history: list });
  },

  onClearHistory() {
    util.confirm('清空最近搜索记录？').then((ok) => {
      if (!ok) return;
      try {
        wx.removeStorageSync(HISTORY_KEY);
      } catch (e) {
        // 忽略本地存储异常
      }
      this.setData({ history: [] });
    });
  },

  onKeywordTap(e) {
    const keyword = String((e.currentTarget.dataset || {}).keyword || '').trim();
    if (!keyword) return;
    this.setData({ keyword });
    this.submitSearch(keyword);
  },

  // ---------------- 输入与搜索 ----------------

  onInput(e) {
    const value = (e.detail && e.detail.value) || '';
    const keyword = value.trim();
    this.setData({ keyword: value });

    if (!keyword) {
      this.cancelSuggestTimers();
      this._suggestSeq = (this._suggestSeq || 0) + 1;
      this.setData({
        showSuggest: false,
        suggestKeyword: '',
        suggestions: [],
        suggestLoading: false
      });
      if (this.data.submittedKeyword) this.resetToInitial();
      return;
    }

    this.setData({
      showSuggest: true,
      suggestKeyword: keyword,
      suggestions: [],
      suggestLoading: true
    });
    this.scheduleSuggest(keyword);
  },

  onInputFocus() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    this.setData({ showSuggest: true, suggestKeyword: keyword });
    if (!this.data.suggestions.length) this.scheduleSuggest(keyword);
  },

  onInputBlur() {
    this.clearBlurTimer();
    this._blurTimer = setTimeout(() => {
      this._blurTimer = null;
      if (this.data.showSuggest) this.setData({ showSuggest: false });
    }, 180);
  },

  // ---------------- 书目联想 ----------------

  scheduleSuggest(keyword) {
    this.clearSuggestTimer();
    this._suggestTimer = setTimeout(() => {
      this._suggestTimer = null;
      this.fetchSuggestions(keyword);
    }, 300);
  },

  fetchSuggestions(keyword) {
    const seq = (this._suggestSeq = (this._suggestSeq || 0) + 1);
    return http
      .get('/api/books/search', { keyword }, { silent: true })
      .then((res) => {
        if (seq !== this._suggestSeq) return;
        const rows = (res && res.list) || [];
        const suggestions = rows
          .map(mapBook)
          .filter((b) => b.bookId)
          .slice(0, 5);
        this.setData({ suggestions, suggestLoading: false });
      })
      .catch(() => {
        if (seq !== this._suggestSeq) return;
        this.setData({ suggestions: [], suggestLoading: false });
      });
  },

  clearSuggestTimer() {
    if (this._suggestTimer) {
      clearTimeout(this._suggestTimer);
      this._suggestTimer = null;
    }
  },

  clearBlurTimer() {
    if (this._blurTimer) {
      clearTimeout(this._blurTimer);
      this._blurTimer = null;
    }
  },

  cancelSuggestTimers() {
    this.clearSuggestTimer();
    this.clearBlurTimer();
  },

  onSuggestSearchTap() {
    this.submitSearch(this.data.suggestKeyword || this.data.keyword);
  },

  onSuggestBookTap(e) {
    const title = String((e.currentTarget.dataset || {}).title || '').trim();
    if (!title) return;
    this.submitSearch(title);
  },

  onConfirm(e) {
    const value = (e.detail && e.detail.value) || this.data.keyword;
    this.submitSearch(value);
  },

  onSubmitTap() {
    this.submitSearch(this.data.keyword);
  },

  submitSearch(raw) {
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/search/result');
      return;
    }
    const keyword = String(raw || '').trim();
    if (!keyword) {
      util.toast('请输入搜索关键词');
      return;
    }
    if (keyword.length > 100) {
      util.toast('搜索关键词最多 100 字');
      return;
    }
    if (wx.hideKeyboard) {
      try {
        wx.hideKeyboard();
      } catch (e) {
        // 键盘未弹起时忽略
      }
    }

    this.cancelSuggestTimers();
    this._suggestSeq = (this._suggestSeq || 0) + 1;

    this.setData({
      keyword,
      submittedKeyword: keyword,
      activeBook: null,
      books: [],
      booksLoading: true,
      booksExpanded: false,
      items: [],
      total: 0,
      countReady: false,
      page: 1,
      hasMore: true,
      firstLoading: true,
      loadingMore: false,
      refreshing: false,
      error: '',
      autoFocus: false,
      showSuggest: false,
      suggestKeyword: '',
      suggestions: [],
      suggestLoading: false
    });
    this.saveHistory(keyword);
    this.setData({ svTop: (this.data.svTop || 0) > 0 ? 0 : 0.1 });
    this.fetchBooks(keyword);
    this.fetchItems(1);
  },

  onClearInput() {
    this.resetToInitial();
  },

  /** 回到刚进页面的状态：清空结果、保留历史 */
  resetToInitial() {
    this._itemsSeq = (this._itemsSeq || 0) + 1;
    this._booksSeq = (this._booksSeq || 0) + 1;
    this._suggestSeq = (this._suggestSeq || 0) + 1;
    this.cancelSuggestTimers();
    this.setData({
      keyword: '',
      submittedKeyword: '',
      activeBook: null,
      books: [],
      booksLoading: false,
      booksExpanded: false,
      items: [],
      total: 0,
      countReady: false,
      page: 1,
      hasMore: true,
      firstLoading: false,
      loadingMore: false,
      refreshing: false,
      error: '',
      showSuggest: false,
      suggestKeyword: '',
      suggestions: [],
      suggestLoading: false
    });
  },

  onRetry() {
    this.setData({ firstLoading: true, error: '' });
    if (!this.data.activeBook && this.data.submittedKeyword) {
      this.fetchBooks(this.data.submittedKeyword);
    }
    this.fetchItems(1);
  },

  // ---------------- 书目 ----------------

  fetchBooks(keyword) {
    if (!keyword) return Promise.resolve();
    const seq = (this._booksSeq = (this._booksSeq || 0) + 1);
    this.setData({ booksLoading: true });

    return http
      .get('/api/books/search', { keyword }, { silent: true })
      .then((res) => {
        if (seq !== this._booksSeq) return;
        const rows = (res && res.list) || [];
        const books = rows
          .map(mapBook)
          .filter((b) => b.bookId && b.onSaleCount !== null && b.onSaleCount > 0);
        this.setData({ books, booksLoading: false, booksExpanded: false });
      })
      .catch(() => {
        if (seq !== this._booksSeq) return;
        // 书目只是辅助信息，失败不阻塞商品结果
        this.setData({ books: [], booksLoading: false, booksExpanded: false });
      });
  },

  onBookTap(e) {
    const ds = e.currentTarget.dataset || {};
    const bookId = Number(ds.id || 0);
    if (!bookId) return;
    const active = this.data.activeBook;
    if (active && active.bookId === bookId) {
      this.clearBookFilter();
      return;
    }
    this.setData({
      activeBook: { bookId, title: ds.title || '' },
      items: [],
      total: 0,
      countReady: false,
      page: 1,
      hasMore: true,
      firstLoading: true,
      loadingMore: false,
      error: ''
    });
    this.setData({ svTop: (this.data.svTop || 0) > 0 ? 0 : 0.1 });
    this.fetchItems(1);
  },

  clearBookFilter() {
    if (!this.data.activeBook) return;
    this.setData({
      activeBook: null,
      items: [],
      total: 0,
      countReady: false,
      page: 1,
      hasMore: true,
      firstLoading: true,
      loadingMore: false,
      error: ''
    });
    this.setData({ svTop: (this.data.svTop || 0) > 0 ? 0 : 0.1 });
    this.fetchItems(1);
  },

  onBooksToggle() {
    this.setData({ booksExpanded: !this.data.booksExpanded });
  },

  // ---------------- 商品 ----------------

  buildItemQuery(page) {
    const query = { page, pageSize: PAGE_SIZE, sort: this.data.sort };
    if (this.data.activeBook) query.bookId = this.data.activeBook.bookId;
    else query.keyword = this.data.submittedKeyword;
    return query;
  },

  fetchItems(page) {
    if (!this.data.submittedKeyword && !this.data.activeBook) return Promise.resolve();
    const isFirst = page === 1;
    const seq = (this._itemsSeq = (this._itemsSeq || 0) + 1);

    if (isFirst) {
      this.setData({
        firstLoading: this.data.items.length === 0,
        loadingMore: false,
        refreshing: true,
        error: ''
      });
    } else {
      this.setData({ loadingMore: true });
    }

    return http
      .get('/api/items', this.buildItemQuery(page), { silent: true })
      .then((res) => {
        if (seq !== this._itemsSeq) return null;
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        // 搜索只出 on_sale；清空状态避免每张卡都挂「在售」
        const cards = adapter.toItemList(rows).map((it) =>
          Object.assign({}, it, { status: '' })
        );

        let items;
        if (isFirst) {
          items = cards;
        } else {
          const seen = {};
          this.data.items.forEach((it) => {
            seen[it.itemId] = true;
          });
          items = this.data.items.concat(cards.filter((it) => !seen[it.itemId]));
        }
        const total = Number(data.total || 0);

        this.setData({
          items,
          total,
          countReady: true,
          page,
          hasMore: items.length < total && rows.length > 0,
          firstLoading: false,
          loadingMore: false,
          refreshing: false,
          error: ''
        });
        return items;
      })
      .catch((err) => {
        if (seq !== this._itemsSeq) return null;
        const message = (err && err.message) || '加载失败';
        const hasList = this.data.items.length > 0;
        const isAuthError = err && (err.code === 401 || err.status === 401 || err.code === 403);

        this.setData({
          firstLoading: false,
          loadingMore: false,
          refreshing: false,
          error: isFirst && !hasList ? message : ''
        });

        if (!isAuthError) {
          if (isFirst && hasList) util.toast('刷新失败，请稍后重试');
          else if (!isFirst) util.toast(message || '加载失败，请重试');
        }
        return null;
      });
  },

  onSortLatest() {
    if (this.data.sort === 'latest') return;
    this.changeSort('latest');
  },

  onSortPrice() {
    const next = this.data.sort === 'price_asc' ? 'price_desc' : 'price_asc';
    this.changeSort(next);
  },

  changeSort(sort) {
    this.setData({
      sort,
      items: [],
      total: 0,
      countReady: false,
      page: 1,
      hasMore: true,
      firstLoading: true,
      loadingMore: false,
      error: ''
    });
    this.setData({ svTop: (this.data.svTop || 0) > 0 ? 0 : 0.1 });
    this.fetchItems(1);
  },

  onTapItem(e) {
    const id = e.detail && e.detail.itemId;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/item/detail?id=' + id,
      fail: () => util.toast('详情页打开失败')
    });
  },

  // ---------------- 登录与返回 ----------------

  onLogin() {
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin('/pages/search/result');
    } else {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    });
  }
});
