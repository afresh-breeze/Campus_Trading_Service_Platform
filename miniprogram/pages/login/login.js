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
// 开场眼睛条编排时长（与 login.wxss 里 2600ms 对齐）+ 200ms 余量
const INTRO_HOLD_MS = 2800;
// 登录转场时序（均与 login.wxss 对齐，smoke_login 有断言锁定）
const JELLY_MS = 460; // 按钮果冻回弹时长
const TRANSIT_GROW_MS = 480; // 深棕圆放大铺满
const TRANSIT_RIPPLE_MS = 420; // 水波纹淡出
const GOTO_AT_MS = 260; // 涟漪开始后多久发起跳转（涟漪还没播完就换页，遮住跳转延迟）

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
    isMock: config.MOCK,
    // 开场眼睛条编排：只在本次进页播一次，播完摘类回到最终态
    intro: true,
    // 输密码时 > < 眯眼（bindfocus/bindblur 切换）
    eyesClosed: false,
    // 眼睛条几何：top = 导航下方插槽；--bar-from = 开场起点（全屏正中）
    eyesTop: 20,
    barFrom: 300,
    // 登录按钮果冻回弹（onSubmit 触发，播完摘类）
    btnJelly: false,
    // 登录成功转场：'' → 'expand'（深棕圆放大铺满）→ 'ripple'（水波纹淡出）
    transit: '',
    // 转场几何：按钮中心与覆盖四角所需半径，内联传给 .transit 的 CSS 变量
    tapX: 0,
    tapY: 0,
    tapR: 0
  },

  onReady() {
    // 2600ms 编排 + 200ms 余量；摘类后基础样式即最终态（同 detail-page-enter 口径）
    this._introTimer = setTimeout(() => {
      this._introTimer = null;
      this.setData({ intro: false });
    }, INTRO_HOLD_MS);
  },

  onUnload() {
    [
      '_introTimer',
      '_jellyTimer',
      '_transitGrowTimer',
      '_transitGotoTimer'
    ].forEach((key) => {
      if (this[key]) {
        clearTimeout(this[key]);
        this[key] = null;
      }
    });
  },

  onPwFocus() {
    this.setData({ eyesClosed: true });
  },

  onPwBlur() {
    this.setData({ eyesClosed: false });
  },

  // 眼睛条几何：插槽在胶囊下方 10px；开场起点 = 屏高正中 − 插槽中心，
  // 保证放大裸眼落在全屏正中央（keyframes 里经 --bar-from 引用）
  _calcEyesGeometry() {
    let eyesTop = 20;
    let barFrom = 300;
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const navH = win.statusBarHeight + 44; // nav-top 非 fixed 占位高度（状态栏 + bar）
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      if (menu && menu.bottom) {
        eyesTop = Math.max(8, Math.round(menu.bottom + 10 - navH));
      }
      const barHalf = 23; // eyes-bar 高 46px 的一半
      barFrom = Math.max(0, Math.round(win.windowHeight / 2 - (navH + eyesTop + barHalf)));
    } catch (e) {
      // 取不到系统信息时用兜底值，不影响登录主流程
    }
    return { eyesTop, barFrom };
  },

  onLoad(options) {
    this.setData({
      redirect: (options && options.redirect) || '',
      // 眼睛条几何要在首帧渲染前定好，开场才不会跳位
      ...this._calcEyesGeometry()
    });
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

    // 果冻回弹：校验失败也给按压反馈（校验拦截本身不需要动效以外的处理）
    this._playJelly();

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
      // 果冻回弹之后起转场：深棕铺满 → 水波纹 → 进主界面
      setTimeout(() => this._startTransit(), 250);
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

  /** 按钮果冻回弹：460ms 播完摘类（时长与 wxss btn-jelly 对齐） */
  _playJelly() {
    if (this.data.btnJelly) return;
    this.setData({ btnJelly: true });
    if (this._jellyTimer) clearTimeout(this._jellyTimer);
    this._jellyTimer = setTimeout(() => {
      this._jellyTimer = null;
      this.setData({ btnJelly: false });
    }, JELLY_MS);
  },

  /**
   * 登录成功转场：
   *  1) 取按钮 rect，圆心 = 按钮中心，半径 = 到屏幕四角的最远距离（+2px 容差）；
   *  2) expand：深棕圆 scale 0→1 铺满（480ms）；
   *  3) ripple：水波纹淡出（420ms），开始 260ms 后发起跳转——
   *     涟漪还没播完页面就切换，正好遮住 switchTab/redirectTo 的加载延迟。
   */
  _startTransit() {
    const win = (() => {
      try {
        return wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (e) {
        return null;
      }
    })();
    const W = (win && win.windowWidth) || 375;
    const H = (win && win.windowHeight) || 667;

    const apply = (cx, cy, R) => {
      this.setData({ tapX: Math.round(cx), tapY: Math.round(cy), tapR: Math.ceil(R) + 2, transit: 'expand' });
      this._transitGrowTimer = setTimeout(() => {
        this._transitGrowTimer = null;
        this.setData({ transit: 'ripple' });
        this._transitGotoTimer = setTimeout(() => {
          this._transitGotoTimer = null;
          this.goAfterLogin();
        }, GOTO_AT_MS);
      }, TRANSIT_GROW_MS);
    };

    try {
      wx.createSelectorQuery()
        .in(this)
        .select('.submit')
        .boundingClientRect((rect) => {
          if (rect) {
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const R = Math.max(
              Math.hypot(cx, cy),
              Math.hypot(W - cx, cy),
              Math.hypot(cx, H - cy),
              Math.hypot(W - cx, H - cy)
            );
            apply(cx, cy, R);
          } else {
            // 取不到 rect：退化为屏幕中心整屏半径
            apply(W / 2, H / 2, Math.hypot(W / 2, H / 2));
          }
        })
        .exec();
    } catch (e) {
      // SelectorQuery 不可用：直接跳转，保住登录主流程
      this.goAfterLogin();
    }
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
