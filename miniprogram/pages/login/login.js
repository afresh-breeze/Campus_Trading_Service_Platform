// 登录页（B 成员）
const http = require('../../utils/request');
const util = require('../../utils/util');
const config = require('../../config');

Page({
  data: {
    studentNo: '',
    password: '',
    submitting: false,
    redirect: '',
    isMock: config.MOCK
  },

  onLoad(options) {
    this.setData({ redirect: (options && options.redirect) || '' });
    // 已登录直接回首页
    const app = getApp();
    if (app.isLogin()) {
      this.goAfterLogin();
    }
  },

  onStudentNoInput(e) {
    this.setData({ studentNo: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async onSubmit() {
    const { studentNo, password } = this.data;

    if (!studentNo) return util.toast('请输入学号');
    if (!util.REGEX.studentNo.test(studentNo)) return util.toast('学号应为 6-15 位数字');
    if (!password) return util.toast('请输入密码');
    if (!util.REGEX.password.test(password)) return util.toast('密码需 6-20 位');

    this.setData({ submitting: true });
    try {
      const data = await http.post('/api/auth/login', { studentNo, password });
      const app = getApp();
      app.setSession(data.token, data.userInfo);
      util.toast('登录成功', 'success');
      setTimeout(() => this.goAfterLogin(), 400);
    } catch (err) {
      // 错误提示已在 request.js 统一处理
      console.warn('登录失败', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  goAfterLogin() {
    const redirect = this.data.redirect;
    if (redirect) {
      wx.redirectTo({
        url: decodeURIComponent(redirect),
        fail: () => wx.switchTab({ url: '/pages/index/index' })
      });
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },

  onGoRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  onForget() {
    util.toast('请联系管理员重置密码');
  }
});
