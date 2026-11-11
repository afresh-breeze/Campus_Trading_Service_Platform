// 我的（B 成员：个人中心，tab 4）
// ------------------------------------------------------------------
// 数据口径：
//   1. 当前用户统一读 GET /api/auth/me（接口文档 §2 明确：不要再调 GET /api/users/me）
//   2. 后端暂无 stats 聚合接口，四项统计用四个列表接口的 total 派生：
//      /api/items/mine、/api/favorites、/api/errands/mine?role=publisher、
//      /api/errands/mine?role=runner&status=completed
//   3. 统计失败显示「—」而不是 0：把"没拉到"和"确实是 0"区分开，避免误导
//   4. 昵称/头像改动后回本页要立刻生效 → onShow 必刷，且走缓存先渲染再校验
const http = require('../../utils/request');
const adapter = require('../../utils/adapter');
const util = require('../../utils/util');

const APP_VERSION = 'v0.3.0';
const TAB_INDEX = 3;

const STAT_ITEMS = [
  { key: 'items', label: '发布', url: '/pages/mine/items' },
  { key: 'favorites', label: '收藏', url: '/pages/mine/favorites' },
  { key: 'errands', label: '代取', url: '/pages/mine/errands' },
  { key: 'completed', label: '完成', url: '/pages/mine/errands' }
];

const GROUPS = [
  {
    key: 'content',
    title: '我的内容',
    cells: [
      { key: 'items', text: '我的发布', url: '/pages/mine/items', auth: true },
      { key: 'favorites', text: '我的收藏', url: '/pages/mine/favorites', auth: true },
      { key: 'errands', text: '我的代取', url: '/pages/mine/errands', auth: true },
      { key: 'runner', text: '接单设置', url: '/pages/mine/runner', auth: true }
    ]
  },
  {
    key: 'other',
    title: '其他',
    cells: [
      { key: 'settings', text: '设置', url: '/pages/mine/settings', auth: false },
      { key: 'help', text: '帮助与反馈', url: '/pages/mine/help', auth: false },
      // 关于没有独立页面（app.json 只有 20 页，不再新增），用弹窗承载
      { key: 'about', text: '关于', url: '', auth: false }
    ]
  }
];

/** 统计占位：value 用字符串，避免 setData 时被当成 0 */
function emptyStats() {
  return STAT_ITEMS.map((s) => ({ key: s.key, label: s.label, url: s.url, value: '—' }));
}

function buildStats(nums) {
  return STAT_ITEMS.map((s, i) => {
    const v = nums[i];
    return {
      key: s.key,
      label: s.label,
      url: s.url,
      value: v === null || v === undefined ? '—' : String(v)
    };
  });
}

Page({
  data: {
    ready: false,
    isLogin: false,
    user: null,
    avatarUrl: '',
    initial: '校',
    nickname: '点击登录',
    subText: '登录后可发布、收藏与接单',
    stats: emptyStats(),
    groups: GROUPS,
    version: APP_VERSION
  },

  onShow() {
    // 切页同步选中态：走 syncSelected，避免胶囊播放「瞬移后滑动」的动画
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar && typeof bar.syncSelected === 'function') {
      bar.syncSelected(TAB_INDEX);
    }
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh(true).then(() => wx.stopPullDownRefresh());
  },

  /**
   * @param {boolean} fromPull 下拉刷新时不弹任何提示，失败保持旧数据
   */
  refresh(fromPull) {
    const app = getApp();
    if (!app || typeof app.isLogin !== 'function' || !app.isLogin()) {
      this.applyGuest();
      return Promise.resolve();
    }

    // 先用缓存渲染（首屏不空白），再请求校验
    this.applyUser(app.globalData.userInfo);

    return http
      .get('/api/auth/me', {}, { silent: true })
      .then((me) => {
        if (!me) return null;
        app.setSession(app.globalData.token, me);
        this.applyUser(me);
        return me;
      })
      .catch(() => {
        // 后端没起或断网：保留缓存，不打扰用户（与 app.bootstrap 的策略一致）
        if (!fromPull && !app.globalData.userInfo) {
          util.toast('资料加载失败，下拉可重试');
        }
        return null;
      })
      .then(() => this.fetchStats());
  },

  /** 未登录态：头像位置显示「校」，点击整卡跳登录 */
  applyGuest() {
    this.setData({
      ready: true,
      isLogin: false,
      user: null,
      avatarUrl: '',
      initial: '校',
      nickname: '点击登录',
      subText: '登录后可发布、收藏与接单',
      stats: emptyStats()
    });
  },

  applyUser(u) {
    const user = u || {};
    const nickname = user.nickname || '同学';
    const credit = adapter.num(user.creditScore, 0);
    const parts = [];
    if (user.studentNo) parts.push('学号 ' + user.studentNo);
    if (credit) parts.push('信用分 ' + credit);

    this.setData({
      ready: true,
      isLogin: true,
      user,
      avatarUrl: adapter.fullUrl(user.avatarUrl),
      initial: nickname.slice(0, 1).toUpperCase(),
      nickname,
      subText: parts.length ? parts.join(' · ') : '完善资料后更容易成交'
    });
  },

  /**
   * 四项统计：逐个 catch，任一失败只影响自己那一格
   * pageSize 给 1，只要 total，不浪费流量
   */
  fetchStats() {
    const jobs = [
      http.get('/api/items/mine', { page: 1, pageSize: 1 }, { silent: true }),
      http.get('/api/favorites', { page: 1, pageSize: 1 }, { silent: true }),
      http.get('/api/errands/mine', { role: 'publisher', page: 1, pageSize: 1 }, { silent: true }),
      http.get('/api/errands/mine', { role: 'runner', status: 'completed', page: 1, pageSize: 1 }, { silent: true })
    ];

    return Promise.all(
      jobs.map((p) =>
        p.then((d) => (d && d.total !== undefined ? adapter.num(d.total, null) : null)).catch(() => null)
      )
    ).then((nums) => {
      this.setData({ stats: buildStats(nums) });
      return nums;
    });
  },

  /** 顶部用户卡：已登录进资料页，未登录去登录页 */
  onTapProfile() {
    const app = getApp();
    if (!app.isLogin()) {
      app.requireLogin('/pages/mine/index');
      return;
    }
    wx.navigateTo({ url: '/pages/mine/profile' });
  },

  onTapStat(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    this.guardJump(url);
  },

  onTapCell(e) {
    const ds = e.currentTarget.dataset;
    if (ds.key === 'about') {
      this.onAbout();
      return;
    }
    if (!ds.url) return;
    if (ds.auth) this.guardJump(ds.url);
    else wx.navigateTo({ url: ds.url });
  },

  /** 需要登录的入口：未登录先回登录页，登录后回到本页 */
  guardJump(url) {
    const app = getApp();
    if (!app.isLogin()) {
      app.requireLogin('/pages/mine/index');
      return;
    }
    wx.navigateTo({ url, fail: () => util.toast('页面不存在，请在 app.json 注册') });
  },

  onAbout() {
    wx.showModal({
      title: '关于校园易站',
      content: '校园二手交易与代取服务平台\n课程设计作业 · ' + APP_VERSION + '\n技术栈：微信小程序 + Node.js/Express + MySQL',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#79513D'
    });
  },

  onLogout() {
    util.confirm('退出后需要重新登录才能发布、接单和聊天，确定退出？', '退出登录').then((ok) => {
      if (!ok) return;
      const app = getApp();
      app.clearSession();
      this.applyGuest();
      wx.reLaunch({ url: '/pages/login/login' });
    });
  }
});
