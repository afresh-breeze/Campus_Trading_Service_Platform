// 设置（B 成员，11-17）：消息通知开关 / 清理缓存 / 关于版本 / 退出登录
// ------------------------------------------------------------------
// 口径（手册 §6.5）：
//   · 消息通知开关存本地（config.STORAGE_KEY 里没有，这里用 cs_notify_enabled），
//     app.js 的 setUnreadBadge 会读它——关掉后不再画 tabBar 红点（不是假装关掉）
//   · 清理缓存必须保留登录态（token + 用户信息），否则「清缓存」等于「被踢下线」
//   · 退出登录二次确认 → app.clearSession() → reLaunch 登录页（不能 navigateBack，
//     返回栈里可能还有需要登录的页面）
const config = require('../../config');
const util = require('../../utils/util');
const { APP_VERSION } = require('../../utils/version');

const NOTIFY_KEY = 'cs_notify_enabled';

Page({
  data: {
    isLogin: false,
    notifyEnabled: true,
    cacheSize: '0 KB',
    version: APP_VERSION
  },

  onShow() {
    const app = getApp();
    this.setData({
      isLogin: !!(app && typeof app.isLogin === 'function' ? app.isLogin() : wx.getStorageSync(config.STORAGE_KEY.TOKEN)),
      // 未设置过按「开启」处理（getStorageSync 未命中返回 ''，不能直接当 false）
      notifyEnabled: wx.getStorageSync(NOTIFY_KEY) !== false
    });
    this.refreshCacheSize();
  },

  refreshCacheSize() {
    try {
      const info = wx.getStorageInfoSync();
      this.setData({ cacheSize: formatSize(info.currentSize) });
    } catch (e) {
      this.setData({ cacheSize: '—' });
    }
  },

  onToggleNotify(e) {
    const on = !!e.detail.value;
    wx.setStorageSync(NOTIFY_KEY, on);
    this.setData({ notifyEnabled: on });
    util.toast(on ? '已开启消息提醒' : '已关闭消息提醒');
    // 立即让角标跟随开关：关掉时 setUnreadBadge 内部会清零
    const app = getApp();
    if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
  },

  /** 清缓存：只清业务缓存，token 与用户信息原样写回 */
  onClearCache() {
    util.confirm('将清理搜索历史等本地缓存，登录状态会保留。', '清理缓存').then((ok) => {
      if (!ok) return;
      const token = wx.getStorageSync(config.STORAGE_KEY.TOKEN);
      const user = wx.getStorageSync(config.STORAGE_KEY.USER);
      const notify = wx.getStorageSync(NOTIFY_KEY);
      try {
        wx.clearStorageSync();
        if (token) wx.setStorageSync(config.STORAGE_KEY.TOKEN, token);
        if (user) wx.setStorageSync(config.STORAGE_KEY.USER, user);
        if (notify !== '') wx.setStorageSync(NOTIFY_KEY, notify);
      } catch (e) {
        util.toast('清理失败，请稍后再试');
        return;
      }
      this.refreshCacheSize();
      util.toast('已清理');
    });
  },

  onLogout() {
    util.confirm('退出后需要重新登录才能发布和接单。', '退出登录').then((ok) => {
      if (!ok) return;
      const app = getApp();
      if (app && typeof app.clearSession === 'function') app.clearSession();
      else {
        wx.removeStorageSync(config.STORAGE_KEY.TOKEN);
        wx.removeStorageSync(config.STORAGE_KEY.USER);
      }
      wx.reLaunch({ url: '/pages/login/login' });
    });
  }
});

/** 缓存大小：KB → 便于阅读的 MB */
function formatSize(kb) {
  const n = Number(kb) || 0;
  if (n <= 0) return '0 KB';
  if (n < 1024) return n + ' KB';
  return (n / 1024).toFixed(1) + ' MB';
}
