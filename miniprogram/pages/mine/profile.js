// 个人资料（B 成员，11-17）：头像 / 昵称 / 学院 / 手机号 → PUT /api/users/me
// ------------------------------------------------------------------
// 口径（对照 server/src/routes/users.js 的 PUT /me 与 utils/mock.js）：
//   · 昵称 2-12 个字符（按 Unicode 码点计，中文一个字算 1，不能用 str.length）
//   · 头像必须是 /uploads/ 开头的相对路径，上传走 POST /api/upload（字段名 file）
//   · 学院 ≤ 100 字、可空；手机号可空，非空必须是 11 位数字（后端不校验号段）
//   · users 表没有 bio/简介 列 → 页面不渲染简介，避免「填了存不上」
//   · 头像 > 5MB 先 wx.compressImage 压缩；上传失败保留旧头像并提示（手册 §6.4 边界）
//   · 当前用户统一读 GET /api/auth/me（接口文档 §2：不要再调 GET /api/users/me）
const http = require('../../utils/request');
const adapter = require('../../utils/adapter');
const util = require('../../utils/util');
const config = require('../../config');

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** 按 Unicode 码点计数：'😀' 这类 emoji 不会被算成 2 */
function charLength(str) {
  const s = String(str === null || str === undefined ? '' : str);
  return Array.from(s).length;
}

Page({
  data: {
    loading: true,
    error: '',
    errorDesc: '',
    saving: false,
    uploading: false,
    // 表单（11-18 A 复查修复）：avatarUrl 给 <image> 显示用（adapter.fullUrl 补全后的完整地址），
    // avatarRaw 保存后端要的 /uploads/ 相对路径——直接把相对路径绑给 image 是显示不出来的
    avatarUrl: '',
    avatarRaw: '',
    nickname: '',
    college: '',
    phone: '',
    // 只读
    studentNo: '',
    creditScore: 0,
    status: 'active',
    initial: '友',
    errors: {}
  },

  onLoad() {
    this.load();
  },

  /** 拉当前用户；失败给错误态 + 重试（不吞成空表单，避免把「没拉到」误当「没填」） */
  load() {
    this.setData({ loading: true, error: '', errorDesc: '' });
    return http
      .get('/api/auth/me', {}, { silent: true })
      .then((me) => {
        const u = me || {};
        const nickname = String(u.nickname || '');
        this.setData({
          loading: false,
          avatarRaw: u.avatarUrl || '',
          avatarUrl: adapter.fullUrl(u.avatarUrl),
          nickname: nickname,
          college: u.college || '',
          phone: u.phone || '',
          studentNo: u.studentNo || '',
          creditScore: Number(u.creditScore || 0),
          status: u.status || 'active',
          initial: nickname ? Array.from(nickname)[0] : '友'
        });
      })
      .catch((err) => {
        const code = (err && err.code) || 0;
        this.setData({
          loading: false,
          error: code === 401 ? '请先登录' : '资料加载失败',
          errorDesc: code === 401 ? '登录状态已失效，请重新登录' : '检查网络后重试'
        });
      });
  },

  onRetry() {
    if (this.data.error === '请先登录') {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.load();
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    const patch = {};
    patch[key] = value;
    if (key === 'nickname') patch.initial = value ? Array.from(value)[0] : '友';
    patch['errors.' + key] = '';
    this.setData(patch);
  },

  /** 选图 → 超 5MB 压缩 → 上传拿 /uploads/ 相对路径 → 仅预览，点「保存」才落库 */
  onChooseAvatar() {
    if (this.data.uploading) return;
    const pick = () =>
      new Promise((resolve, reject) => {
        if (typeof wx.chooseMedia === 'function') {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sizeType: ['compressed'],
            // wx.chooseMedia 返回的是 tempFilePath，不是 path（11-18 A 复查：原写法上传拿到 undefined）
            success: (res) => resolve((res.tempFiles[0] || {}).tempFilePath || ''),
            fail: reject
          });
        } else {
          wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            success: (res) => resolve(res.tempFilePaths[0]),
            fail: reject
          });
        }
      });

    pick()
      .then((path) => this.shrinkIfNeeded(path))
      .then((path) => {
        this.setData({ uploading: true });
        return http.upload(path).then((res) => {
          const url = (res && res.url) || '';
          if (!url) throw { code: -1, message: '上传返回为空' };
          this.setData({ uploading: false, avatarRaw: url, avatarUrl: adapter.fullUrl(url) });
          util.toast('头像已更新，记得保存');
        });
      })
      .catch((err) => {
        this.setData({ uploading: false });
        // 用户主动取消不算失败
        if (err && /cancel/.test(String(err.errMsg || ''))) return;
        // 上传失败：保留旧头像，只提示（手册 §6.4）
        util.toast('头像上传失败，请稍后再试');
      });
  },

  /** 超过 5MB 用 wx.compressImage 压一次；拿不到大小就直接上传（后端 413 兜底） */
  shrinkIfNeeded(path) {
    return new Promise((resolve) => {
      let fs = null;
      try {
        fs = wx.getFileSystemManager();
      } catch (e) {
        resolve(path);
        return;
      }
      fs.stat({
        path: path,
        success: (res) => {
          const size = (res.stats && res.stats.size) || 0;
          if (size <= MAX_AVATAR_BYTES) {
            resolve(path);
            return;
          }
          wx.compressImage({
            src: path,
            quality: 60,
            success: (r) => resolve(r.tempFilePath),
            fail: () => resolve(path)
          });
        },
        fail: () => resolve(path)
      });
    });
  },

  validate() {
    const errors = {};
    const nickname = String(this.data.nickname || '').trim();
    const phone = String(this.data.phone || '').trim();
    const college = String(this.data.college || '').trim();
    if (charLength(nickname) < 2 || charLength(nickname) > 12) {
      errors.nickname = '昵称需 2-12 个字符';
    }
    if (charLength(college) > 100) errors.college = '学院名称不能超过 100 字';
    if (phone && !/^\d{11}$/.test(phone)) errors.phone = '手机号需 11 位数字';
    this.setData({ errors: errors });
    return !Object.keys(errors).length;
  },

  onSave() {
    if (this.data.saving) return;
    if (!this.validate()) {
      util.toast('请先修正标红的项');
      return;
    }
    const body = {
      nickname: String(this.data.nickname || '').trim(),
      college: String(this.data.college || '').trim(),
      phone: String(this.data.phone || '').trim(),
      avatarUrl: this.data.avatarRaw || ''
    };
    this.setData({ saving: true });
    http
      .put('/api/users/me', body, { silent: true })
      .then((data) => {
        this.setData({ saving: false });
        const userInfo = (data && data.userInfo) || null;
        this.syncCache(userInfo);
        util.toast('保存成功');
      })
      .catch((err) => {
        this.setData({ saving: false });
        util.toast((err && err.message) || '保存失败，请稍后再试');
      });
  },

  /** 同步全局缓存：返回「我的」页时用户卡要立刻是新的昵称/头像 */
  syncCache(userInfo) {
    if (!userInfo) return;
    const app = getApp();
    if (!app) return;
    const merged = Object.assign({}, app.globalData.userInfo || {}, userInfo);
    app.globalData.userInfo = merged;
    try {
      wx.setStorageSync(config.STORAGE_KEY.USER, merged);
    } catch (e) {
      /* 缓存写失败不影响本次保存 */
    }
  }
});
