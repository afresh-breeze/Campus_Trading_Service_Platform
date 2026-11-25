// 商品详情（A 成员，11-16）
// ------------------------------------------------------------------
// 数据口径：
//   GET /api/items/:id -> 卡片字段 + images[] + seller{} + isFavorited + isOwner，
//   并让 view_count +1；首屏只由 onShow 拉一次，避免 onLoad/onShow 双请求。
// 角色：
//   买家：收藏 + 联系卖家（所有状态都保留操作，MVP 口径）；
//   卖家：隐藏收藏/联系，底部按 status 显示状态管理按钮，后端仍校验状态流转。
// 聊天：
//   跳 /pages/chat/detail?peerId=<sellerId>&bizType=item&bizId=<itemId>，
//   会话由 B 的聊天页 POST /api/conversations 创建/复用，本页不直接建会话。
const http = require('../../utils/request');
const adapter = require('../../utils/adapter');
const util = require('../../utils/util');
// 小票落款随机短句（11-25 B 加：替换「打印时间」行，与代取详情页同一份清单 utils/motto.js）
const mottoUtil = require('../../utils/motto');

const CONDITION_TEXT = {
  new: '全新',
  like_new: '几乎全新',
  good: '成色良好',
  fair: '有使用痕迹'
};
const DESC_COLLAPSE_LEN = 120;

/* 小票锯齿：纸面 686rpx / 齿距 26rpx → 取 27 齿（702rpx），末齿由 overflow 裁掉 */
const SAW_TEETH = [];
for (let i = 0; i < 27; i++) SAW_TEETH.push(i);

/* 小票落款图案：512×512 黑线条透明底 PNG，按内容语义命名 */
const DOODLE_IMAGES = [
  '/assets/receipt/cat.png',
  '/assets/receipt/mouse.png',
  '/assets/receipt/cake.png',
  '/assets/receipt/umbrella.png',
  '/assets/receipt/trees.png'
];

function formatPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

/** 底部状态按钮：主色留给「标记售出 / 重新上架」 */
function buildActions(status) {
  if (status === 'on_sale') {
    return [
      { key: 'reserve', text: '标记预订' },
      { key: 'off_shelf', text: '下架' },
      { key: 'sold', text: '标记售出', primary: true }
    ];
  }
  if (status === 'reserved') {
    return [
      { key: 'cancel_reserve', text: '取消预订' },
      { key: 'sold', text: '标记售出', primary: true }
    ];
  }
  if (status === 'off_shelf') {
    return [{ key: 'relist', text: '重新上架', primary: true }];
  }
  return [];
}

const ACTION_MAP = {
  reserve: {
    status: 'reserved',
    title: '标记预订',
    confirm: '标记为已预订后，商品会从首页和搜索隐藏。确认？',
    ok: '已标记为预订'
  },
  off_shelf: {
    status: 'off_shelf',
    title: '下架商品',
    confirm: '下架后商品不会出现在首页和搜索，收藏过的买家仍可从详情查看。确认下架？',
    ok: '已下架'
  },
  sold: {
    status: 'sold',
    title: '标记售出',
    confirm: '标记售出后不可撤销，确认这笔交易已完成？',
    ok: '已标记售出'
  },
  cancel_reserve: {
    status: 'on_sale',
    title: '取消预订',
    confirm: '取消预订后商品会重新上架。确认？',
    ok: '已取消预订'
  },
  relist: {
    status: 'on_sale',
    title: '重新上架',
    confirm: '重新上架后商品会出现在首页和搜索。确认？',
    ok: '已重新上架'
  }
};

/** 详情响应 -> 页面展示结构，wxml 不做字段映射和计算 */
function mapDetail(raw) {
  const data = raw || {};
  const item = adapter.toItem(data);
  const images = item.images && item.images.length
    ? item.images
    : (item.coverUrl ? [item.coverUrl] : []);
  const sellerRaw = data.seller || {};
  const sellerName = sellerRaw.nickname || item.sellerNickname || '卖家';
  const sellerAvatar = adapter.fullUrl(sellerRaw.avatarUrl || item.sellerAvatar || '');
  const credit = sellerRaw.creditScore !== undefined && sellerRaw.creditScore !== null
    ? sellerRaw.creditScore
    : item.sellerCreditScore;
  const price = Number(item.price) || 0;
  const original = Number(item.originalPrice) || 0;
  const description = item.description || '';
  const isOwner = !!data.isOwner;
  const actions = isOwner ? buildActions(item.status) : [];

  return {
    item,
    images,
    seller: {
      name: sellerName,
      initial: sellerName.slice(0, 1) || '卖',
      avatarUrl: sellerAvatar,
      creditText: credit !== undefined && credit !== null && credit !== ''
        ? '信用分 ' + credit
        : '信用分 暂无'
    },
    isOwner,
    isFavorited: !!data.isFavorited,
    favoriteCount: Number(item.favoriteCount) || 0,
    viewCount: Number(item.viewCount) || 0,
    priceText: formatPrice(price),
    originalText: original > price ? '¥' + formatPrice(original) : '',
    conditionText: CONDITION_TEXT[item.conditionLevel] || item.conditionLevel || '',
    categoryName: item.categoryName || '',
    bookTitle: item.bookTitle || '',
    locationText: item.location || '未填写',
    createdText: item.createdAt ? util.formatTime(item.createdAt) : '未填写',
    descriptionText: description || '卖家没有填写描述',
    descLong: description.length > DESC_COLLAPSE_LEN,
    actions,
    showBar: isOwner ? actions.length > 0 : true
  };
}

Page({
  data: {
    anim: 'enter',
    id: 0,
    loading: true,
    refreshing: false,
    error: '',
    errorDesc: '',
    canRetry: false,
    item: null,
    images: [],
    imageIndex: 0,
    imageErrors: {},
    seller: { name: '', initial: '', avatarUrl: '', creditText: '' },
    isOwner: false,
    isFavorited: false,
    favoriteCount: 0,
    viewCount: 0,
    priceText: '',
    originalText: '',
    conditionText: '',
    categoryName: '',
    bookTitle: '',
    locationText: '',
    createdText: '',
    descriptionText: '',
    descLong: false,
    descExpanded: false,
    actions: [],
    showBar: false,
    favoriting: false,
    submitting: false,
    actionKey: '',
    sawTeeth: SAW_TEETH,
    receiptImage: DOODLE_IMAGES[0],
    receiptDate: '',
    receiptMotto: ''
  },

  onLoad(options) {
    this._reqSeq = 0;
    this._viewCounted = false;
    // 图案与短句只在打开页面时抽一次；之后的刷新/回跳不重抽，避免闪变
    this.setData({
      receiptImage: DOODLE_IMAGES[Math.floor(Math.random() * DOODLE_IMAGES.length)],
      receiptMotto: mottoUtil.randomMotto()
    });
    const id = Number(options && options.id || 0);
    if (!Number.isInteger(id) || id <= 0) {
      this.setData({
        loading: false,
        error: '商品不存在',
        errorDesc: '链接缺少有效的商品 ID',
        canRetry: false,
        showBar: false
      });
      return;
    }
    this.setData({ id });
  },

  onReady() {
    // 入场动画播完移除动画类：transform 常驻会改变后代 fixed 的包含块（detail-bar 错位的老坑）
    this._enterTimer = setTimeout(() => {
      if (this.data.anim === 'enter') this.setData({ anim: '' });
    }, 220);
  },

  onNavBack() {
    // 退场：先播右移离场动画（先慢后快）再返回；系统手势返回走原生转场（拦截不到）
    if (this.data.anim === 'exit') return;
    clearTimeout(this._enterTimer);
    this.setData({ anim: 'exit' });
    this._exitTimer = setTimeout(() => wx.navigateBack(), 250);
  },

  onUnload() {
    clearTimeout(this._enterTimer);
    clearTimeout(this._exitTimer);
  },

  onShow() {
    if (!this.data.id) return;
    this.loadDetail();
  },

  loadDetail() {
    const id = this.data.id;
    if (!id) return Promise.resolve(null);
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);
    const hasItem = !!this.data.item;

    if (hasItem) this.setData({ refreshing: true });
    else this.setData({ loading: true, error: '', errorDesc: '', canRetry: false });

    return http
      .get('/api/items/' + id, this._viewCounted ? { view: 0 } : {}, { silent: true })
      .then((raw) => {
        if (seq !== this._reqSeq) return null;
        this._viewCounted = true;
        this.applyDetail(raw);
        return raw;
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return null;
        const code = err && err.code;
        const isAuth = err && (err.code === 401 || err.status === 401);
        // 详情已被删除时，即使页面已有旧内容也要切到 404，避免继续展示失效商品
        if (code === 404) {
          this.applyError(err);
          return null;
        }
        if (!this.data.item) {
          this.applyError(err);
        } else {
          this.setData({ loading: false, refreshing: false });
          if (!isAuth) util.toast('刷新失败，请稍后重试');
        }
        return null;
      });
  },

  applyDetail(raw) {
    const view = mapDetail(raw);
    const printAt = new Date();
    const hasItem = !!this.data.item;
    const nextIndex = view.images.length
      ? (hasItem ? Math.min(this.data.imageIndex, view.images.length - 1) : 0)
      : 0;
    const nextDescExpanded = view.descLong ? (hasItem && this.data.descExpanded) : false;

    this.setData({
      loading: false,
      refreshing: false,
      error: '',
      errorDesc: '',
      canRetry: false,
      item: view.item,
      images: view.images,
      imageIndex: nextIndex,
      imageErrors: {},
      seller: view.seller,
      isOwner: view.isOwner,
      isFavorited: view.isFavorited,
      favoriteCount: view.favoriteCount,
      viewCount: view.viewCount,
      priceText: view.priceText,
      originalText: view.originalText,
      conditionText: view.conditionText,
      categoryName: view.categoryName,
      bookTitle: view.bookTitle,
      locationText: view.locationText,
      createdText: view.createdText,
      descriptionText: view.descriptionText,
      descLong: view.descLong,
      descExpanded: nextDescExpanded,
      actions: view.actions,
      showBar: view.showBar,
      receiptDate: util.formatTime(printAt, false)
    });
  },

  applyError(err) {
    const code = err && err.code;
    if (code === 404) {
      this.setData({
        loading: false,
        refreshing: false,
        item: null,
        images: [],
        actions: [],
        showBar: false,
        error: '商品不存在或已删除',
        errorDesc: '可能已被卖家删除，或链接已失效',
        canRetry: false
      });
      return;
    }
    this.setData({
      loading: false,
      refreshing: false,
      canRetry: true,
      error: '加载失败',
      errorDesc: (err && err.message) || '请检查网络后重试'
    });
  },

  onRetry() {
    if (!this.data.id) return;
    this.setData({ loading: true, error: '', errorDesc: '', canRetry: false });
    this.loadDetail();
  },

  onBackHome() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: () => wx.navigateBack({ fail: () => {} })
    });
  },

  onSwiperChange(e) {
    this.setData({ imageIndex: Number(e.detail.current) || 0 });
  },

  onImageError(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const patch = {};
    patch['imageErrors.' + index] = true;
    this.setData(patch);
  },

  onPreviewImage(e) {
    if (!this.data.images.length) return;
    const tapped = Number(e.currentTarget.dataset.index);
    const index = Number.isInteger(tapped) ? tapped : this.data.imageIndex;
    wx.previewImage({
      current: this.data.images[index] || this.data.images[0],
      urls: this.data.images
    });
  },

  onToggleDesc() {
    this.setData({ descExpanded: !this.data.descExpanded });
  },

  onFavorite() {
    if (this.data.isOwner || this.data.favoriting || !this.data.item) return;
    const id = this.data.item.itemId || this.data.id;
    if (!id) return;
    const next = !this.data.isFavorited;

    // 丢弃可能还在飞的详情刷新，避免旧的 isFavorited 覆盖刚更新的收藏状态
    this._reqSeq = (this._reqSeq || 0) + 1;
    this.setData({ favoriting: true, refreshing: false });

    const req = next
      ? http.post('/api/items/' + id + '/favorite', {}, { silent: true })
      : http.del('/api/items/' + id + '/favorite', {}, { silent: true });

    req
      .then((res) => {
        const favorited = !!(res && res.favorited);
        const count = Number(res && res.favoriteCount);
        this.setData({
          favoriting: false,
          isFavorited: favorited,
          favoriteCount: Number.isFinite(count) ? count : this.data.favoriteCount
        });
        util.toast(favorited ? '已收藏' : '已取消收藏');
      })
      .catch((err) => {
        this.setData({ favoriting: false });
        const code = err && err.code;
        if (code === 404) {
          this.applyError(err);
          return;
        }
        const isAuth = err && (err.code === 401 || err.status === 401);
        if (!isAuth) util.toast((err && err.message) || '操作失败，请重试');
      });
  },

  onContact() {
    if (this.data.isOwner) return;
    const item = this.data.item;
    if (!item || !item.sellerId) {
      util.toast('暂无可联系的对象');
      return;
    }
    wx.navigateTo({
      url: '/pages/chat/detail?peerId=' + item.sellerId
        + '&bizType=item&bizId=' + (item.itemId || this.data.id),
      fail: () => util.toast('聊天页打开失败')
    });
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    if (!this.data.isOwner || this.data.submitting) return;
    const cfg = ACTION_MAP[key];
    if (!cfg) return;
    util.confirm(cfg.confirm, cfg.title).then((ok) => {
      if (!ok) return;
      this.runStatusAction(key, cfg);
    });
  },

  runStatusAction(key, cfg) {
    const id = this.data.id;
    if (!id) return;
    this.setData({ submitting: true, actionKey: key });
    http
      .put('/api/items/' + id + '/status', { status: cfg.status }, { silent: true })
      .then((res) => {
        const nextStatus = (res && res.status) || cfg.status;
        const actions = buildActions(nextStatus);
        this.setData({
          submitting: false,
          actionKey: '',
          'item.status': nextStatus,
          actions,
          showBar: actions.length > 0
        });
        util.toast(cfg.ok);
        this.loadDetail();
      })
      .catch((err) => {
        this.setData({ submitting: false, actionKey: '' });
        const code = err && err.code;
        const isAuth = err && (err.code === 401 || err.status === 401);
        if (code === 404) {
          this.applyError(err);
          return;
        }
        if (isAuth) return;
        util.toast((err && err.message) || '操作失败，请重试');
        if (code === 409) this.loadDetail();
      });
  }
});
