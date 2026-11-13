// 注册页（B 成员）
// 口径：A 的 users 表虽有 campus 列，但注册流程不采集校区，发布也不采集。
// 因此本页不出现任何校区字段，杜绝前后端字段口径冲突。
// 本次修：① redirect 透传（从大厅被引导注册后能回大厅）② 已登录拦截（手册 §6.2）
//        ③ 字段级错误定位（errorMap）④ 入口加锁 + 跳转前保持 disabled
const http = require('../../utils/request');
const util = require('../../utils/util');

const TAB_PAGES = [
  '/pages/index/index',
  '/pages/errand/hall',
  '/pages/chat/list',
  '/pages/mine/index'
];

function isTabPage(url) {
  const path = String(url || '').split('?')[0];
  return TAB_PAGES.indexOf(path) >= 0;
}

function goto(url) {
  const target = url || '/pages/index/index';
  if (isTabPage(target)) {
    wx.switchTab({
      url: String(target).split('?')[0],
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    });
    return;
  }
  wx.redirectTo({
    url: target,
    fail: () => wx.switchTab({ url: '/pages/index/index' })
  });
}

Page({
  data: {
    form: {
      studentNo: '',
      nickname: '',
      password: '',
      password2: ''
    },
    // 字段级错误：与 form 同 key，wxml 直接取 errors.xxx
    errors: {},
    submitting: false,
    redirect: ''
  },

  onLoad(options) {
    const redirect = (options && options.redirect) || '';
    this.setData({ redirect });
    // 已登录不该停留在注册页（手册 §6.2）：直接回目标页
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && app.isLogin()) {
      util.toast('已登录，无需重复注册');
      goto(this.data.redirect ? decodeURIComponent(this.data.redirect) : '');
    }
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const patch = { ['form.' + key]: e.detail.value };
    // 输入即清掉该字段的旧错误，避免错误提示一直挂着
    if (this.data.errors[key]) patch['errors.' + key] = '';
    this.setData(patch);
  },

  /** 返回 { 字段: 错误 } 映射；空对象表示通过 */
  validate() {
    const f = this.data.form;
    const errors = {};
    const studentNo = (f.studentNo || '').trim();
    const nickname = (f.nickname || '').trim();

    if (!studentNo) errors.studentNo = '请输入学号';
    else if (!util.REGEX.studentNo.test(studentNo)) errors.studentNo = '学号应为 6-20 位数字';

    // 与后端 auth.js 一致：2-12 个字符
    if (nickname.length < 2 || nickname.length > 12) errors.nickname = '昵称需 2-12 个字符';

    if (!util.REGEX.password.test(f.password)) errors.password = '密码需 6-20 位';
    if (f.password !== f.password2) errors.password2 = '两次输入的密码不一致';

    return errors;
  },

  async onSubmit() {
    if (this.data.submitting) return; // 入口锁（P2-4）

    const errors = this.validate();
    const keys = Object.keys(errors);
    if (keys.length) {
      this.setData({ errors });
      // 定位到第一个错误字段：toast 文案 + 字段下方红字，用户不用逐项试
      util.toast(errors[keys[0]]);
      return;
    }
    this.setData({ errors: {} });

    this.setData({ submitting: true });
    try {
      // 只提交后端声明的三个字段，不多传
      const payload = {
        studentNo: this.data.form.studentNo.trim(),
        nickname: this.data.form.nickname.trim(),
        password: this.data.form.password
      };
      const data = await http.post('/api/auth/register', payload, { silent: true });
      const app = getApp();
      app.setSession(data.token, data.userInfo);
      util.toast('注册成功', 'success');
      // 跳转期间保持 disabled；带 redirect 回原页面（P1-5）
      setTimeout(() => {
        goto(this.data.redirect ? decodeURIComponent(this.data.redirect) : '');
      }, 500);
    } catch (err) {
      this.setData({ submitting: false });
      util.toast((err && err.message) || '注册失败，请重试');
    }
  },

  onGoLogin() {
    const redirect = this.data.redirect;
    const url = '/pages/login/login' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : '');
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url });
    }
  }
});
