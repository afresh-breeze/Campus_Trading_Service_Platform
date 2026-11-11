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
   * 口径：未读数由后端按 messages.is_read = 0 且非本人发送统计，前端只负责累加展示。
   * 会话接口未就绪时静默失败，不打扰用户。
   */
  refreshUnread() {
    if (!this.globalData.token) {
      this.setUnreadBadge(0);
      return Promise.resolve(0);
    }
    return http.get('/api/conversations', {}, { silent: true })
      .then((data) => {
        const list = (data && (data.list || data.items)) || [];
        let total = 0;
        for (let i = 0; i < list.length; i++) {
          total += Number(list[i].unreadCount || 0);
        }
        this.globalData.unreadCount = total;
        this.setUnreadBadge(total);
        return total;
      })
      .catch(() => 0);
  },

  /** 写 tabBar 红点；消息 tab 索引固定为 2 */
  setUnreadBadge(count) {
    const index = 2;
    // 启用自定义 tabBar 后 wx.setTabBarBadge 不生效，优先让组件自己画
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    const bar = current && typeof current.getTabBar === 'function' && current.getTabBar();
    if (bar && typeof bar.setBadge === 'function') {
      bar.setBadge(count);
      return;
    }
    if (count > 0) {
      wx.setTabBarBadge({
        index: index,
        text: count > 99 ? '99+' : String(count),
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

  /** 登录成功后统一落盘 */
  setSession(token, userInfo) {
    this.globalData.token = token || '';
    this.globalData.userInfo = userInfo || null;
    wx.setStorageSync(config.STORAGE_KEY.TOKEN, this.globalData.token);
    wx.setStorageSync(config.STORAGE_KEY.USER, this.globalData.userInfo);
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
