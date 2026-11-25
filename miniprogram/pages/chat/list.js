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
    bizType: row.bizType || '',
    bizId: row.bizId
  };
}

Page({
  data: {
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
        this.setData({
          list,
          total,
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

  onTapConv(e) {
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
