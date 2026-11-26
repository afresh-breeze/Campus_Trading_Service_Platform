// 消息列表（B 成员，11-14，tab 3）
// ------------------------------------------------------------------
// 契约（对照 server/src/routes/chat.js，mock.js 同构）：
//   GET /api/conversations?page=&pageSize= → { list:[{ conversationId, peerId,
//     peerNickname, peerAvatar, lastMessage, lastTime, unreadCount, bizType, bizId }], total }
//   · 列表按 last_time 倒序（后端排好，前端不重排）；
//   · unreadCount 是「对方发的且未读」条数，>99 显示 99+；
//   · onShow 必刷：从聊天页回来，未读/最后消息可能已变。
// 进入会话带 conversationId + peerId + bizType + bizId 四参（聊天页可跳过建会话）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const TAB_INDEX = 2;
const PAGE_SIZE = 20;
// 左滑露出的操作区：3 个按钮各 150rpx，换算成 px 用于手指跟随位移
const ACTION_ITEM_RPX = 150;
const ACTION_COUNT = 3;

/** 标题行与右上角胶囊齐平：占位到胶囊顶，标题行高 = 胶囊高 */
function getNavMetrics() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (menu && menu.top && menu.height) return { top: menu.top, height: menu.height };
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return { top: (win.statusBarHeight || 20) + 4, height: 32 };
  } catch (e) {
    return { top: 24, height: 32 };
  }
}

/** 会话行 → 纯展示结构 */
function toCard(row) {
  const unread = Number(row.unreadCount || 0);
  const nickname = row.peerNickname || '同学';
  return {
    conversationId: row.conversationId,
    peerId: row.peerId,
    peerNickname: nickname,
    initial: nickname.slice(0, 1),
    avatarUrl: adapter.fullUrl(row.peerAvatar),
    lastMessage: row.lastMessage || '暂无消息',
    timeText: row.lastTime ? util.fromNow(row.lastTime) : '',
    unreadCount: unread,
    unreadText: unread > 99 ? '99+' : String(unread),
    hasUnread: unread > 0,
    isPinned: row.isPinned === true || Number(row.isPinned) === 1,
    // 左滑位移（px）：0 = 收起，-actionWidth = 露出全部操作
    swipeX: 0,
    swiping: false,
    // 置顶重排 FLIP 动画状态：flipFromY = 先放回旧位置的位移，flipPhase = prepare/run/''
    flipFromY: 0,
    flipPhase: '',
    flipActive: false,
    bizType: row.bizType || '',
    bizId: row.bizId
  };
}

Page({
  data: {
    stickyTop: 24,
    barHead: 32,
    list: [],
    total: 0,
    page: 1,
    hasMore: false,
    firstLoading: true,
    loadingMore: false,
    refreshing: false,
    error: '',
    isLogin: true
  },

  onLoad() {
    this._reqSeq = 0;
    const nav = getNavMetrics();
    this.setData({ stickyTop: nav.top, barHead: nav.height });
    let windowWidth = 375;
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      windowWidth = win.windowWidth || windowWidth;
    } catch (e) {}
    this._actionWidth = (ACTION_ITEM_RPX * ACTION_COUNT * windowWidth) / 750;
  },

  onShow() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar && typeof bar.syncSelected === 'function') {
      bar.syncSelected(TAB_INDEX);
    }
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/chat/list');
      this.setData({ isLogin: false, firstLoading: false, list: [], error: '' });
      return;
    }
    this.setData({ isLogin: true });
    this.refresh();
    // 列表页也顺带刷一次全局角标（进入页面时角标可能滞后）
    if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
  },

  onRefresh() {
    this.setData({ pulling: true });
    const done = () => this.setData({ pulling: false });
    this.refresh().then(done, done);
  },

  onReachBottom() {
    if (this.data.refreshing || this.data.loadingMore || !this.data.hasMore) return;
    this.fetch(this.data.page + 1);
  },

  refresh() {
    this.setData({ refreshing: true });
    return this.fetch(1);
  },

  fetch(page) {
    const isFirst = page === 1;
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);
    if (isFirst) this.setData({ firstLoading: this.data.list.length === 0, error: '' });
    else this.setData({ loadingMore: true });

    return http
      .get('/api/conversations', { page, pageSize: PAGE_SIZE }, { silent: true })
      .then((res) => {
        if (seq !== this._reqSeq) return null;
        const data = res || {};
        const rows = Array.isArray(data.list) ? data.list : [];
        const cards = rows.map(toCard);
        // 会话数少且顺序可能因新消息变化，第一页直接替换，翻页按 conversationId 去重
        let list;
        if (isFirst) {
          list = cards;
        } else {
          const seen = {};
          this.data.list.forEach((c) => {
            seen[c.conversationId] = true;
          });
          list = this.data.list.concat(cards.filter((c) => !seen[c.conversationId]));
        }
        const total = Number(data.total || 0);
        this.setData(
          {
            list,
            total,
            page,
            hasMore: list.length < total && rows.length > 0,
            firstLoading: false,
            loadingMore: false,
            refreshing: false,
            error: ''
          },
          () => {
            // 置顶成功后第一页重排完成，播放「旧位置 → 新位置」的位移动画
            if (isFirst && this._pendingFlip) {
              const oldTops = this._pendingFlip;
              this._pendingFlip = null;
              this._playFlip(oldTops);
            }
          }
        );
        return list;
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return null;
        this._pendingFlip = null;
        this.setData({ firstLoading: false, loadingMore: false, refreshing: false });
        if (isFirst) this.setData({ error: (err && err.message) || '加载失败' });
        else util.toast((err && err.message) || '加载失败，请重试');
        return null;
      });
  },

  onRetry() {
    this.setData({ firstLoading: true });
    this.refresh();
  },

  // ---------------- 会话左滑 / 长按操作 ----------------
  _setSwipe(id, x, swiping) {
    const updates = {};
    this.data.list.forEach((conv, index) => {
      if (conv.conversationId === id) {
        updates['list[' + index + '].swipeX'] = x;
        updates['list[' + index + '].swiping'] = !!swiping;
      } else if (conv.swipeX !== 0 || conv.swiping) {
        // 同一时刻只允许一行露出操作，避免多张卡片叠在一起
        updates['list[' + index + '].swipeX'] = 0;
        updates['list[' + index + '].swiping'] = false;
      }
    });
    if (Object.keys(updates).length) this.setData(updates);
  },

  _offsetOf(id) {
    const hit = this.data.list.find((c) => c.conversationId === id);
    return hit ? hit.swipeX || 0 : 0;
  },

  onSwipeStart(e) {
    const t = (e.touches && e.touches[0]) || {};
    this._touch = {
      id: e.currentTarget.dataset.id,
      startX: t.clientX || 0,
      startY: t.clientY || 0,
      base: this._offsetOf(e.currentTarget.dataset.id),
      lastX: this._offsetOf(e.currentTarget.dataset.id),
      lock: '',
      moved: false
    };
    this._suppressTap = false;
  },

  onSwipeMove(e) {
    const touch = this._touch;
    if (!touch) return;
    const t = (e.touches && e.touches[0]) || {};
    const dx = (t.clientX || 0) - touch.startX;
    const dy = (t.clientY || 0) - touch.startY;

    // 先判定手势方向：纵向优先交给 scroll-view，避免滑动列表时卡片乱跑
    if (!touch.lock) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        touch.lock = 'scroll';
        return;
      }
      if (Math.abs(dx) > 8) touch.lock = 'swipe';
      else return;
    }
    if (touch.lock !== 'swipe') return;

    touch.moved = true;
    let x = touch.base + dx;
    if (x > 0) x = 0;
    if (x < -this._actionWidth) x = -this._actionWidth;
    touch.lastX = x;
    this._setSwipe(touch.id, x, true);
  },

  onSwipeEnd() {
    const touch = this._touch;
    this._touch = null;
    if (!touch || !touch.moved) return;
    // 结束手势后屏蔽一次 tap，防止「滑动松手」误进聊天页
    this._suppressTap = true;
    setTimeout(() => {
      this._suppressTap = false;
    }, 260);
    const opened = touch.lastX < -this._actionWidth / 2;
    this._setSwipe(touch.id, opened ? -this._actionWidth : 0, false);
  },

  // ---------------- 置顶重排动画（FLIP） ----------------
  /** 采集当前每条卡片在屏幕上的 top，按 conversationId 索引 */
  _captureTops() {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined' || typeof wx.createSelectorQuery !== 'function') return resolve({});
      const ids = this.data.list.map((c) => c.conversationId);
      try {
        wx.createSelectorQuery()
          .selectAll('.cl-swipe')
          .boundingClientRect((rects) => {
            const tops = {};
            (rects || []).forEach((rect, index) => {
              if (ids[index] != null && typeof rect.top === 'number') tops[ids[index]] = rect.top;
            });
            resolve(tops);
          })
          .exec();
      } catch (e) {
        resolve({});
      }
    });
  },

  /**
   * 列表已按新顺序渲染：先把每条卡片 translateY 回旧位置（关过渡），
   * 下一帧清零位移并开过渡，于是置顶项从原位置上滑、其余项顺势下滑。
   */
  _playFlip(oldTops) {
    if (!oldTops || typeof wx === 'undefined' || typeof wx.createSelectorQuery !== 'function') return;
    this._captureTops().then((newTops) => {
      const updates = {};
      let moved = false;
      this.data.list.forEach((conv, index) => {
        const oldTop = oldTops[conv.conversationId];
        const newTop = newTops[conv.conversationId];
        const delta =
          typeof oldTop === 'number' && typeof newTop === 'number' ? Math.round(oldTop - newTop) : 0;
        const active = Math.abs(delta) > 1;
        if (active) moved = true;
        updates['list[' + index + '].flipFromY'] = delta;
        updates['list[' + index + '].flipPhase'] = 'prepare';
        updates['list[' + index + '].flipActive'] = active;
      });
      if (!moved) return;
      this.setData(updates);
      // 等一帧让「回到旧位置」先渲染，再放开过渡滑到新位置
      const afterPaint = () => {
        const release = {};
        this.data.list.forEach((conv, index) => {
          release['list[' + index + '].flipFromY'] = 0;
          release['list[' + index + '].flipPhase'] = 'run';
        });
        this.setData(release);
      };
      if (typeof wx !== 'undefined' && typeof wx.nextTick === 'function') wx.nextTick(afterPaint);
      else setTimeout(afterPaint, 20);
      // 动画结束后清掉临时状态（360ms 过渡 + 余量）
      setTimeout(() => {
        const done = {};
        this.data.list.forEach((conv, index) => {
          done['list[' + index + '].flipPhase'] = '';
          done['list[' + index + '].flipActive'] = false;
        });
        this.setData(done);
      }, 440);
    });
  },

  onTogglePin(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    const pinned = e.currentTarget.dataset.pinned === true || e.currentTarget.dataset.pinned === 'true';
    if (!id) return;
    // 请求发出前同步启动位置采集，确保拿到的是重排前的坐标
    const capturing = this._captureTops();
    http
      .patch('/api/conversations/' + id + '/pin', { pinned: !pinned }, { silent: true })
      .then(() => {
        util.toast(pinned ? '已取消置顶' : '已置顶');
        return capturing.then((tops) => {
          this._pendingFlip = tops;
          return this.refresh();
        });
      })
      .catch((err) => util.toast((err && err.message) || '操作失败'));
  },

  onMarkUnread(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;
    http
      .put('/api/conversations/' + id + '/unread', {}, { silent: true })
      .then(() => {
        util.toast('已标为未读');
        const app = getApp();
        if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
        return this.refresh();
      })
      .catch((err) => util.toast((err && err.message) || '操作失败'));
  },

  onDeleteConv(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;
    util.confirm('删除后该会话的聊天记录也会一并删除，确认？', '删除会话').then((ok) => {
      if (!ok) return;
      http
        .del('/api/conversations/' + id, {}, { silent: true })
        .then(() => {
          util.toast('已删除');
          const app = getApp();
          if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
          return this.refresh();
        })
        .catch((err) => util.toast((err && err.message) || '删除失败'));
    });
  },

  onTapConv(e) {
    if (this._suppressTap) return;
    // 操作区露出时，第一下点击只负责收起，不进聊天页
    if (this.data.list.some((c) => c.swipeX < 0)) {
      this._setSwipe(-1, 0, false);
      return;
    }
    const { id, peer, biztype, bizid } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({
      url:
        '/pages/chat/detail?conversationId=' +
        id +
        '&peerId=' +
        (peer || '') +
        '&bizType=' +
        (biztype || '') +
        '&bizId=' +
        (bizid || ''),
      fail: () => util.toast('聊天页打开失败')
    });
  },

  onGoIndex() {
    wx.switchTab({ url: '/pages/index/index', fail: () => util.toast('首页打开失败') });
  },

  onLogin() {
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin('/pages/chat/list');
    } else {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  }
});
