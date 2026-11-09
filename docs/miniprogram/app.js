/**
 * 小程序入口（B 成员：公共层）
 * 只做三件事：恢复本地登录态、全局错误兜底、提供登录态工具方法。
 */
const config = require('./config');

App({
  globalData: {
    token: '',
    userInfo: null,
    unreadCount: 0,
    baseUrl: config.BASE_URL
  },

  onLaunch() {
    this.restoreSession();
  },

  onShow() {
    // 从后台切回前台时刷新未读数（聊天模块用）
    if (this.globalData.token && this.refreshUnread) {
      this.refreshUnread();
    }
  },

  onError(err) {
    console.error('[App onError]', err);
  },

  /** 从本地缓存恢复 token 与用户信息 */
  restoreSession() {
    try {
      const token = wx.getStorageSync(config.STORAGE_KEY.TOKEN) || '';
      const userInfo = wx.getStorageSync(config.STORAGE_KEY.USER) || null;
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
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
