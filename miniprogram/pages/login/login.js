// 登录页（B 成员）
// ------------------------------------------------------------------
// 三个必须守住的点：
//  1. 登录接口传 skipAuthRedirect —— A 的后端用 401 表示「学号或密码错误」，
//     若走统一 401 处理会把用户已有会话清掉、还跳回登录页，等于「点了没反应」（P0-1）。
//  2. 回跳要分流：redirect 常是 tabBar 页（大厅/我的），wx.redirectTo 跳 tabBar 必失败，
//     失败后落到默认首页，用户会以为「登录完丢了原来的位置」（P0-2）。
//  3. 连续失败 5 次给一句「稍后再试」，避免无脑重试撞后端限流（手册 §6.1，P2-2）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const config = require('../../config');

const TAB_PAGES = [
  '/pages/index/index',
  '/pages/errand/hall',
  '/pages/chat/list',
  '/pages/mine/index'
];
const MAX_FAIL = 5;
const AGREEMENT = {
  user:
    '《用户协议》摘要：\n1. 本平台仅限本校学生使用，账号与学号一一对应；\n' +
    '2. 禁止发布违法违规、虚假或违禁物品；\n3. 交易与跑腿过程请自行核实对方身份；\n' +
    '4. 违规账号将被禁用。\n\n完整文本随课程设计文档一并提交。',
  privacy:
    '《隐私政策》摘要：\n1. 仅采集学号、昵称、头像、学院、手机号（可选）；\n' +
    '2. 学号仅用于身份识别，不对外展示；\n3. 联系方式仅在交易双方之间可见；\n' +
    '4. 你可以随时在「个人资料」中修改或清除可选信息。\n\n完整文本随课程设计文档一并提交。'
};

function isTabPage(url) {
  const path = String(url || '').split('?')[0];
  return TAB_PAGES.indexOf(path) >= 0;
}

/**
 * 统一跳转：tabBar 页用 switchTab（不接受 query），其余用 redirectTo。
 * 都失败才退化到首页，避免「登录成功却停在登录页」。
 */
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
    studentNo: '',
    password: '',
    submitting: false,
    failCount: 0,
    redirect: '',
    isMock: config.MOCK
  },

  onLoad(options) {
    this.setData({ redirect: (options && options.redirect) || '' });
    // 已登录直接回目标页（可能是 tabBar 页）
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && app.isLogin()) {
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
    // 入口锁：bindconfirm 与按钮点击可能在同一帧触发（P2-4）
    if (this.data.submitting) return;

    const studentNo = (this.data.studentNo || '').trim();
    const password = this.data.password || '';

    if (!studentNo) return util.toast('请输入学号');
    if (!util.REGEX.studentNo.test(studentNo)) return util.toast('学号应为 6-20 位数字');
    if (!password) return util.toast('请输入密码');
    if (!util.REGEX.password.test(password)) return util.toast('密码需 6-20 位');

    if (this.data.failCount >= MAX_FAIL) {
      return util.toast('连续失败次数过多，请稍后再试或联系管理员');
    }

    this.setData({ submitting: true });
    try {
      // silent + skipAuthRedirect：文案由本页统一 toast，且 401 不清会话
      const data = await http.post(
        '/api/auth/login',
        { studentNo, password },
        { skipAuthRedirect: true, silent: true }
      );
      this.setData({ failCount: 0 });
      const app = getApp();
      app.setSession(data.token, data.userInfo);
      util.toast('登录成功', 'success');
      // 跳转期间保持 disabled，避免 400ms 窗口内重复提交
      setTimeout(() => this.goAfterLogin(), 400);
    } catch (err) {
      const times = this.data.failCount + 1;
      const base = (err && err.message) || '登录失败，请重试';
      this.setData({ submitting: false, failCount: times });
      if (times >= MAX_FAIL) {
        util.toast('已连续失败 ' + times + ' 次，请确认学号密码或稍后再试');
      } else {
        util.toast(base);
      }
    }
  },

  goAfterLogin() {
    const redirect = this.data.redirect ? decodeURIComponent(this.data.redirect) : '';
    goto(redirect);
  },

  onGoRegister() {
    const redirect = this.data.redirect;
    const url =
      '/pages/register/register' +
      (redirect ? '?redirect=' + encodeURIComponent(redirect) : '');
    wx.navigateTo({ url, fail: () => util.toast('注册页打开失败') });
  },

  onForget() {
    // 项目没有短信/邮箱通道，自助找回不在本期范围；文案统一成「找管理员」
    util.toast('暂不支持自助找回，请联系管理员重置密码');
  },

  onOpenAgreement(e) {
    const type = e.currentTarget.dataset.type === 'privacy' ? 'privacy' : 'user';
    wx.showModal({
      title: type === 'privacy' ? '隐私政策' : '用户协议',
      content: AGREEMENT[type],
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});
