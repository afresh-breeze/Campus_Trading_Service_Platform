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
function toCard(row, keySeq) {
  const unread = Number(row.unreadCount || 0);
  const nickname = row.peerNickname || '同学';
  return {
    // 带版本号的行 key：换代时强制重建节点，避免旧 animation 的 transform 残留
    rowKey: String(row.conversationId) + '_' + (keySeq || 0),
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
    // 置顶重排 FLIP 动画状态：animData 由 wx.createAnimation 生成，flipActive 控制浮层
    animData: '',
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
        const cards = rows.map((row) => toCard(row, this._reorderSeq || 0));
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
        // 置顶重排：先让旧列表动画到目标位置，动画结束再提交新顺序，避免真机生切/频闪
        if (isFirst && this._pendingReorder) {
          this._pendingReorder = false;
          this._commitWithReorder(list, total);
          return list;
        }
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
          }
        );
        return list;
      })
      .catch((err) => {
        if (seq !== this._reqSeq) return null;
        this._pendingReorder = false;
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
   * 置顶重排：先让旧列表原地不动，按新顺序把每条滑到目标位置；
   * 动画结束后再一次性提交新顺序并清掉动画，避免「先换代再倒回」的生切/频闪。
   */
  _commitWithReorder(list, total) {
    const oldList = this.data.list || [];
    const oldIds = oldList.map((c) => c.conversationId);
    const newIndex = {};
    list.forEach((c, i) => {
      newIndex[c.conversationId] = i;
    });

    // 无条件直出：无动画 API / 条数变化 / 会话对不上时，直接换列表
    const canAnimate =
      typeof wx !== 'undefined' &&
      typeof wx.createAnimation === 'function' &&
      typeof wx.createSelectorQuery === 'function' &&
      list.length === oldList.length &&
      oldList.every((c) => newIndex[c.conversationId] !== undefined);

    const commit = () => {
      // 递增 key 版本号，强制 wx:for 重建行节点，彻底丢掉带残留 transform 的旧节点
      const seq = (this._reorderSeq = (this._reorderSeq || 0) + 1);
      const fresh = list.map((conv) =>
        Object.assign({}, conv, {
          rowKey: String(conv.conversationId) + '_' + seq,
          animData: '',
          flipActive: false
        })
      );
      this.setData({
        list: fresh,
        total,
        page: 1,
        hasMore: fresh.length < total,
        firstLoading: false,
        loadingMore: false,
        refreshing: false,
        error: ''
      });
    };

    if (!canAnimate) return commit();

    this._captureTops().then((tops) => {
      // 旧顺序里各个槽位的 top，作为每条卡片「目标位置」的参照
      const slots = oldIds.map((id) => tops[id]);
      if (slots.some((top) => typeof top !== 'number')) return commit();

      const updates = {};
      let moved = false;
      oldList.forEach((conv, j) => {
        const target = newIndex[conv.conversationId];
        const delta = Math.round(slots[target] - slots[j]);
        const active = Math.abs(delta) > 1;
        if (active) moved = true;
        const anim = wx.createAnimation({ duration: 320, timingFunction: 'ease-out' });
        anim.translateY(delta).step();
        updates['list[' + j + '].animData'] = anim.export();
        updates['list[' + j + '].flipActive'] = active;
      });
      if (!moved) return commit();
      this.setData(updates);
      // 动画播完再换顺序：此刻视觉位置 == 新布局位置，不会跳
      setTimeout(commit, 340);
    });
  },

  onTogglePin(e) {
    const id = Number(e.currentTarget.dataset.id || 0);
    const pinned = e.currentTarget.dataset.pinned === true || e.currentTarget.dataset.pinned === 'true';
    if (!id) return;
    http
      .patch('/api/conversations/' + id + '/pin', { pinned: !pinned }, { silent: true })
      .then(() => {
        util.toast(pinned ? '已取消置顶' : '已置顶');
        this._pendingReorder = true;
        return this.refresh();
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
