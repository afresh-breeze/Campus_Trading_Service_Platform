/**
 * 小程序入口（B 成员：公共层）
 * 职责：恢复登录态并校验、全局错误兜底、未读数同步、提供登录态工具方法。
 */
const config = require('./config');
const http = require('./utils/request');

App({
  globalData: {
    token: '',
    userInfo: null,
    unreadCount: 0,
    baseUrl: config.BASE_URL,
    // 自定义 tabBar 当前选中索引（各页面实例据此初始化，避免切换时胶囊跳位）
    tabIndex: 0,
    // 存活的自定义 tabBar 实例注册表。未读数变化时逐个广播，
    // 不能只更新当前页那个实例：在聊天详情（非 tab 页）标记已读时
    // getTabBar() 拿不到组件，其它 tab 上的红点会一直残留到用户切过去重建。
    badgeTargets: [],
    // bootstrap 完成前为 false，页面可据此避免"空数据闪一下"
    ready: false
  },

  onLaunch() {
    if (config.MOCK) {
      console.warn('[MOCK] 当前使用本地模拟数据（config.MOCK = true）。' +
        'A 的后端 server/ 入库后，请把 MOCK 改为 false 再联调，否则字段错误会被假数据掩盖。');
    }
    this.bootstrap();
  },

  onShow() {
    // 从后台切回前台时刷新未读数（聊天模块用）
    if (this.globalData.token) {
      this.refreshUnread();
    }
  },

  onError(err) {
    console.error('[App onError]', err);
  },

  /**
   * 冷启动恢复登录态。
   * 不能只读缓存就认为已登录：token 可能已过期、账号可能已被禁用。
   * 因此先用 /api/auth/me 校验一次，失败即清空本地登录态。
   */
  bootstrap() {
    const token = wx.getStorageSync(config.STORAGE_KEY.TOKEN) || '';
    const cached = wx.getStorageSync(config.STORAGE_KEY.USER) || null;

    if (!token) {
      this.globalData.ready = true;
      return Promise.resolve(null);
    }

    // 先用缓存顶上，避免首屏空白；校验结果回来后覆盖
    this.globalData.token = token;
    this.globalData.userInfo = cached;

    return http.get('/api/auth/me', {}, { silent: true })
      .then((me) => {
        this.globalData.userInfo = me;
        wx.setStorageSync(config.STORAGE_KEY.USER, me);
        this.refreshUnread();
        return me;
      })
      .catch((err) => {
        // token 失效：清空，回到未登录态；网络异常则保留缓存继续用
        const isAuthError = err && (err.code === 401 || err.status === 401);
        if (isAuthError) {
          this.clearSession();
          console.warn('登录态已失效，已清除本地 token');
        } else {
          console.warn('校验登录态失败（可能是后端未启动），暂用本地缓存', err);
        }
        return null;
      })
      .then((res) => {
        this.globalData.ready = true;
        return res;
      });
  },

  /**
   * 同步未读数到 tabBar。
   * 口径：直接调 GET /api/conversations/unread-count（后端按 messages.is_read = 0
   * 且非本人发送聚合），**不再拉会话列表自己累加** —— 列表分页只有 10/20 条，
   * 会话超过一页时角标会少算。接口异常时静默失败，不打扰用户。
   */
  refreshUnread() {
    if (!this.globalData.token) {
      this.setUnreadBadge(0);
      return Promise.resolve(0);
    }
    // tabBar 的 show 与消息页 onShow 常常同时触发，复用同一在途请求，
    // 避免两次响应交错写角标（后到的旧值把新值盖回去）。
    if (this._unreadInFlight) return this._unreadInFlight;
    const task = http.get('/api/conversations/unread-count', {}, { silent: true })
      .then((data) => {
        const total = Number((data && data.count) || 0);
        this.globalData.unreadCount = total;
        this.setUnreadBadge(total);
        return total;
      })
      .catch(() => this.globalData.unreadCount || 0)
      .then((count) => {
        this._unreadInFlight = null;
        return count;
      });
    this._unreadInFlight = task;
    return task;
  },

  /** 注册自定义 tabBar 实例（每个 tab 页各有一个，销毁时自动注销） */
  registerBadgeTarget(target) {
    const list = this.globalData.badgeTargets;
    if (!target || list.indexOf(target) > -1) return;
    list.push(target);
    this.setUnreadBadge(this.globalData.unreadCount || 0);
  },

  unregisterBadgeTarget(target) {
    const list = this.globalData.badgeTargets;
    const i = list.indexOf(target);
    if (i > -1) list.splice(i, 1);
  },

  /** 写 tabBar 红点；消息 tab 索引固定为 2 */
  setUnreadBadge(count) {
    const index = 2;
    // 设置页的「消息通知」开关（本地存储 cs_notify_enabled，未设置过视为开启）：
    // 关掉后不再画红点，但未读数仍正常同步到 globalData——开关只管「显不显示」
    const muted = wx.getStorageSync('cs_notify_enabled') === false;
    const n = muted ? 0 : count;

    // 广播给所有存活的自定义 tabBar 实例，而不是只更新当前页那个。
    // 这样在聊天详情里标记已读后，其它 tab 上的红点也会立刻同步消失。
    const targets = this.globalData.badgeTargets.slice();
    let painted = false;
    targets.forEach((bar) => {
      if (bar && typeof bar.setBadge === 'function') {
        bar.setBadge(n);
        painted = true;
      }
    });

    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    const currentBar = current && typeof current.getTabBar === 'function' && current.getTabBar();
    if (currentBar && typeof currentBar.setBadge === 'function' && targets.indexOf(currentBar) === -1) {
      currentBar.setBadge(n);
      painted = true;
    }
    if (painted) return;

    // 极端兜底：自定义组件还没起来时才走原生 API（启用自定义 tabBar 后原生角标不显示）
    if (n > 0) {
      wx.setTabBarBadge({
        index: index,
        text: n > 99 ? '99+' : String(n),
        fail: () => {}
      });
    } else {
      wx.removeTabBarBadge({ index: index, fail: () => {} });
    }
  },

  /** 从本地缓存恢复 token 与用户信息（同步，不请求网络） */
  restoreSession() {
    try {
      const token = wx.getStorageSync(config.STORAGE_KEY.TOKEN) || '';
      const userInfo = wx.getStorageSync(config.STORAGE_KEY.USER) || null;
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.ready = true;
      return { token, userInfo };
    } catch (e) {
      console.warn('读取本地登录态失败', e);
      return { token: '', userInfo: null };
    }
  },

  /**
   * 登录成功后统一落盘。
   * 必须先把上一位用户的未读数/角标清零再刷新：换账号登录时 unreadCount 不会自己归零，
   * 新用户会顶着上一个账号的红点进来（P1-1）。
   */
  setSession(token, userInfo) {
    this.globalData.token = token || '';
    this.globalData.userInfo = userInfo || null;
    this.globalData.unreadCount = 0;
    wx.setStorageSync(config.STORAGE_KEY.TOKEN, this.globalData.token);
    wx.setStorageSync(config.STORAGE_KEY.USER, this.globalData.userInfo);
    this.setUnreadBadge(0);
    // 登录/注册成功后才拉未读；失败不阻塞登录流程
    this.refreshUnread();
  },

  /** 清空登录态 */
  clearSession() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.unreadCount = 0;
    wx.removeStorageSync(config.STORAGE_KEY.TOKEN);
    wx.removeStorageSync(config.STORAGE_KEY.USER);
    this.setUnreadBadge(0);
  },

  /** 是否已登录 */
  isLogin() {
    return !!this.globalData.token;
  },

  /** 需要登录的页面在 onLoad/onShow 里调用，未登录直接跳登录页 */
  requireLogin(redirect) {
    if (this.isLogin()) return true;
    const url = redirect
      ? `/pages/login/login?redirect=${encodeURIComponent(redirect)}`
      : '/pages/login/login';
    wx.reLaunch({ url });
    return false;
  }
});
