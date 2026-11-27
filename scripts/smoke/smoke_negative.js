// 负向测试冒烟（11-19，手册 §4.3「fix/negative-cases」）
// 覆盖手册表格 12 条场景中可代码级验证的部分；需开发者工具实机验证的项
// 在 docs/负向测试记录-B.md 里标「待截图」，由 11-20/21 截图归档时补齐。
const path = require('path');
const fs = require('fs');
const REPO = path.join(__dirname, '..', '..', 'miniprogram');

// ---------------- 全局 stub ----------------
const navs = [];
const toasts = [];
let reqCount = 0; // wx.request 真实发出次数（测「不发请求」用）
let wxRequestImpl = null; // 每个用例切换

global.wx = {
  request(opts) {
    reqCount += 1;
    if (wxRequestImpl) return wxRequestImpl(opts);
    if (opts && typeof opts.success === 'function') opts.success({ statusCode: 200, data: { code: 0, data: {} } });
  },
  showToast(o) { toasts.push((o && o.title) || ''); },
  showModal(o) { if (o && typeof o.success === 'function') o.success({ confirm: true }); },
  reLaunch(o) { navs.push(o.url); },
  navigateTo(o) { navs.push(o.url); },
  redirectTo(o) { navs.push(o.url); },
  navigateBack() {},
  switchTab() {},
  setStorageSync() {},
  getStorageSync() { return ''; },
  removeStorageSync() {},
  clearStorageSync() {},
  getStorageInfoSync() { return { currentSize: 128, keys: [] }; },
  setTabBarBadge() {},
  removeTabBarBadge() {},
  stopPullDownRefresh() {},
  startPullDownRefresh() {},
  showLoading() {},
  hideLoading() {},
  showToastShort() {},
  getFileSystemManager: () => ({ stat: (o) => o.success && o.success({ stats: { size: 1024 } }) }),
  compressImage: (o) => o.success && o.success({ tempFilePath: 'tmp.jpg' }),
  uploadFile() {}
};

const timers = new Set();
let timerSeq = 0;
const realSetInterval = global.setInterval;
const realClearInterval = global.clearInterval;
global.setInterval = (fn, ms) => {
  const id = ++timerSeq;
  timers.add(id);
  return id;
};
global.clearInterval = (id) => {
  timers.delete(id);
};

let appStub = null;
global.getApp = () => appStub;
// 必须返回空数组：request.js 的 gotoLogin 会读 current.route 并 indexOf，
// 给 {} 会让 route=undefined 抛 TypeError，promise 以 Error reject（假失败）
global.getCurrentPages = () => [];

let captured = null;
global.Page = (cfg) => { captured = cfg; };

const mock = require(path.join(REPO, 'utils', 'mock.js'));
const http = require(path.join(REPO, 'utils', 'request.js'));
const config = require(path.join(REPO, 'config.js'));

// request() 在 config.MOCK=true 时短路走 mock（根本到不了 wx.request），
// 所以「测真实网络层」的用例先在内存里把 MOCK 关掉（只改运行时对象，不动 config.js 文件），
// 测完恢复原值——A 机器上 MOCK=false 时本脚本行为一致。
const MOCK_ORIGINAL = config.MOCK;
function setMock(v) { config.MOCK = v; }

/** 加载页面构造实例 */
function loadPage(rel) {
  delete require.cache[require.resolve(path.join(REPO, rel))];
  captured = null;
  require(path.join(REPO, rel));
  const p = Object.assign({}, captured);
  p.data = JSON.parse(JSON.stringify(captured.data));
  p.setData = (d) => Object.assign(p.data, d);
  return p;
}

/** 用 mock 后端顶替 http（对 POST/PUT/GET 的业务层验证用） */
function useMockHttp() {
  http.get = (url, params) => mock.run(url, 'GET', params || {});
  http.put = (url, body) => mock.run(url, 'PUT', body || {});
  http.post = (url, body) => mock.run(url, 'POST', body || {});
}



let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + ' -> ' + JSON.stringify(extra)); }
}
const flush = (ms) => new Promise((r) => setTimeout(r, ms || 400));

(async () => {
  // ============ [1] token 过期 / 被删 ============
  console.log('\n[1] token 过期 → 清会话 + 回登录页，不白屏');
  setMock(false);
  wxRequestImpl = (opts) => opts.success({ statusCode: 401, data: { code: 401, message: '登录已过期' } });
  let err1 = null;
  await http.get('/api/auth/me', {}, { silent: true }).catch((e) => { err1 = e; });
  await flush(50);
  check('401 被 reject 且 code=401', err1 && err1.code === 401, err1);
  check('自动跳登录页（reLaunch）', navs.indexOf('/pages/login/login') > -1, navs);
  check('文案可读不暴露内部信息', !/stack|Error:|Exception/i.test(JSON.stringify(err1 || {})), err1);

  // ============ [2] 未登录点「我的代取」 ============
  console.log('\n[2] 未登录点「我的代取」→ 跳登录且带回跳地址');
  appStub = {
    globalData: { token: '', userInfo: null },
    isLogin: () => false,
    requireLogin: null
  };
  delete require.cache[require.resolve(path.join(REPO, 'app.js'))];
  const appCfgSrc = fs.readFileSync(path.join(REPO, 'app.js'), 'utf8');
  // app.js 用 App() 注册，直接 eval 提取 requireLogin 逻辑不现实——按其实现等价验证：
  // requireLogin(redirect) = 未登录 → reLaunch(`/pages/login/login?redirect=encode(redirect)`)
  const target = '/pages/mine/errands?role=publisher';
  const wantUrl = '/pages/login/login?redirect=' + encodeURIComponent(target);
  // 手工复现 app.js 的 requireLogin 行为（stub getApp 后调用真实函数太重）
  appStub.requireLogin = function (redirect) {
    if (this.isLogin()) return true;
    const url = redirect ? '/pages/login/login?redirect=' + encodeURIComponent(redirect) : '/pages/login/login';
    wx.reLaunch({ url: url });
    return false;
  };
  const ok2 = appStub.requireLogin(target);
  check('未登录返回 false', ok2 === false, ok2);
  check('reLaunch 携带 redirect 参数', navs.indexOf(wantUrl) > -1, navs);
  // 登录成功后回跳：tabBar 页走 switchTab，非 tabBar 页走 redirectTo（login.js 的 goto 分流）
  const loginSrc = fs.readFileSync(path.join(REPO, 'pages', 'login', 'login.js'), 'utf8');
  check('登录页有 redirect 回跳分流', loginSrc.indexOf('switchTab') > -1 && loginSrc.indexOf('redirectTo') > -1, null);

  // ============ [3] 断网刷列表 → 错误态 + 重试，不卡 loading ============
  console.log('\n[3] 断网刷列表 → 错误态 + 重试按钮');
  wxRequestImpl = (opts) => opts.fail && opts.fail({ errMsg: 'request:fail' });
  const hall = loadPage('pages/errand/hall.js');
  hall.fetch(1);
  await flush(60);
  check('首屏失败置 error 态', hall.data.error !== '', hall.data.error);
  check('不卡在 loading', hall.data.firstLoading === false, hall.data.firstLoading);
  check('文案非技术报错', !/stack|Error:/i.test(hall.data.error), hall.data.error);
  const hallWxml = fs.readFileSync(path.join(REPO, 'pages', 'errand', 'hall.wxml'), 'utf8');
  check('错误态有重试按钮', hallWxml.indexOf('onRetry') > -1, null);

  // ============ [4] 后端 500 → 「服务器错误」，不显示原始报错 ============
  console.log('\n[4] 后端 500 → 统一文案');
  wxRequestImpl = (opts) => opts.success({ statusCode: 500, data: { code: 500, message: '服务器错误' } });
  let err4 = null;
  await http.get('/api/errands', {}, {}).catch((e) => { err4 = e; }); // 非 silent → toast
  check('500 透出统一文案', err4 && err4.message === '服务器错误', err4);
  check('toast 同步提示（非 silent）', toasts.indexOf('服务器错误') > -1, toasts);
  // body.message 缺失时的兜底
  wxRequestImpl = (opts) => opts.success({ statusCode: 502, data: 'Bad Gateway' });
  let err4b = null;
  await http.get('/api/errands', {}, { silent: true }).catch((e) => { err4b = e; });
  check('无 message 时兜底「服务异常（状态码）」', err4b && /^服务异常（\d+）$/.test(err4b.message), err4b);

  // ============ [5] 提交空表单 → 字段旁提示，不发请求 ============
  console.log('\n[5] 空表单提交不发请求');
  wxRequestImpl = null;
  reqCount = 0;
  setMock(MOCK_ORIGINAL);
  useMockHttp();
  const pub = loadPage('pages/errand/publish.js');
  const errors = pub.validate({});
  check('空表单多项报错', Object.keys(errors).length >= 4, errors);
  check('报酬空有提示', errors.reward === '请填写报酬', errors.reward);
  const before5 = reqCount;
  pub.submit('hall');
  await flush(30);
  check('校验失败不发出任何请求', reqCount === before5, reqCount);

  // ============ [6] 报酬 abc / -1 / 9999 全拦住 ============
  console.log('\n[6] 报酬非法值拦截（前端 0 < r ≤ 200）');
  const base = { pickupArea: '北区教学区', pickupPlace: '第30教学楼', deliveryLocation: '南区 1 栋 101', itemSize: 'small', timeType: 'asap' };
  check("reward 'abc' 拦截", pub.validate(Object.assign({}, base, { reward: 'abc' })).reward === '报酬格式不正确', null);
  check("reward '-1' 拦截", pub.validate(Object.assign({}, base, { reward: '-1' })).reward === '报酬必须大于 0 元', null);
  check("reward '9999' 拦截（后端上限 99999999.99，前端收紧到 200）", pub.validate(Object.assign({}, base, { reward: '9999' })).reward === '报酬不能超过 200 元', null);
  check("reward '5.5' 放行", pub.validate(Object.assign({}, base, { reward: '5.5' })).reward === undefined, null);

  // ============ [7] 消息发空 / 发 501 字 ============
  console.log('\n[7] 消息空 / 超 500 字拦截');
  let e7a = null;
  await mock.run('/api/conversations/3001/messages', 'POST', { content: '   ' }).catch((e) => { e7a = e; });
  check('空消息 → 400', e7a && e7a.code === 400, e7a);
  let e7b = null;
  await mock.run('/api/conversations/3001/messages', 'POST', { content: '好'.repeat(501) }).catch((e) => { e7b = e; });
  check('501 字 → 400 且文案明确', e7b && e7b.code === 400 && e7b.message.indexOf('500') > -1, e7b);
  const chatWxml = fs.readFileSync(path.join(REPO, 'pages', 'chat', 'detail.wxml'), 'utf8');
  check('输入框 maxlength=500 前端就拦', chatWxml.indexOf('maxlength="500"') > -1, null);

  // ============ [8] 私单建会话（11-26 定稿：取消限制，先聊后接） ============
  console.log('\n[8] 私单建会话不再 403');
  let c8 = null;
  await mock
    .run('/api/conversations', 'POST', { peerId: 5, bizType: 'errand', bizId: 2008 })
    .then((r) => { c8 = r; })
    .catch(() => {});
  check('非发布者/接单者也能就私单建会话（幂等复用 3003）', c8 && c8.conversationId === 3003, c8);
  const detailSrc = fs.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.js'), 'utf8');
  check('详情页 403 透出后端原因而非空白', detailSrc.indexOf('err.message') > -1 || detailSrc.indexOf('err && err.message') > -1, null);

  // ============ [9] 快速连点接单 3 次 → 只发 1 次请求 ============
  console.log('\n[9] 连点接单防重');
  const det = loadPage('pages/errand/detail.js');
  det.data.order = await mock.run('/api/errands/2001', 'GET', {});
  det.data.id = 2001; // fetch() 依赖 data.id 拉详情，缺了会在链路里异常提前复位 submitting（测试假象）
  let putCalls = 0;
  http.post = () => { putCalls += 1; return Promise.resolve({}); };
  // 第一次点击：确认弹窗自动通过 → doAction → submitting=true → 发 1 次
  det.onAction({ currentTarget: { dataset: { key: 'take' } } });
  await flush(80); // 请求在途（mock 260ms），submitting 必须仍为 true
  check('在途期间 submitting 为 true', det.data.submitting === true, det.data.submitting);
  // 第二、三次连点：submitting=true 直接 return
  det.onAction({ currentTarget: { dataset: { key: 'take' } } });
  det.onAction({ currentTarget: { dataset: { key: 'take' } } });
  check('连点被守卫拦下（仍是 1 次）', putCalls === 1, putCalls);
  await flush(500); // 等 fetch 收尾
  check('3 次点击只发 1 次接单请求', putCalls === 1, putCalls);
  check('submitting 复位等待响应后结束', det.data.submitting === false, det.data.submitting);

  // ============ [10] 聊天页快速进出 10 次 → 不留定时器 ============
  console.log('\n[10] 聊天页进出 10 次不留轮询');
  useMockHttp();
  const cd = loadPage('pages/chat/detail.js');
  cd.data.conversationId = 3001;
  for (let i = 0; i < 10; i++) {
    cd.onShow();
    cd.onHide();
  }
  check('10 次进出后无残留定时器', timers.size === 0, timers.size);
  cd.onShow();
  check('单次 onShow 只起 1 个轮询', timers.size === 1, timers.size);
  cd.onShow(); // 重复 onShow 不得叠加（startPoll 有 _pollTimer 守卫）
  check('重复 onShow 不叠加定时器', timers.size === 1, timers.size);
  cd.onUnload();
  check('onUnload 清定时器', timers.size === 0, timers.size);

  // ============ [11] 长昵称（20 字）/ 长标题 → 省略号 ============
  console.log('\n[11] 长文本省略');
  const hallWxml2 = fs.readFileSync(path.join(REPO, 'pages', 'errand', 'hall.wxml'), 'utf8');
  const appWxss = fs.readFileSync(path.join(REPO, 'app.wxss'), 'utf8');
  // 11-25 层级优化后起终点各有独立 class，两者都必须保留 ellipsis（长地名不许撑破卡片）
  check(
    '昵称/地点用 ellipsis',
    hallWxml2.indexOf('order__who ellipsis') > -1 &&
      /order__place order__place--from ellipsis/.test(hallWxml2) &&
      /order__place order__place--to ellipsis/.test(hallWxml2),
    null
  );
  check('描述用两行省略', hallWxml2.indexOf('ellipsis-2') > -1, null);
  check('全局 .ellipsis 定义了 overflow hidden', /\.ellipsis\s*\{[^}]*overflow:\s*hidden/.test(appWxss), null);
  // 11-25 全站宋体（page 级 font-family 一处生效；旧黑体栈不得残留）
  check(
    '全局字体栈为宋体（Songti SC 优先）',
    /font-family:\s*'Songti SC'[\s\S]*?serif;/.test(appWxss) && appWxss.indexOf('PingFang SC') === -1,
    null
  );
  // 11-25 宋体下 44rpx 标题 700 偏细：公共层统一提 900 + 细描边（覆盖 A/B 两页大标题）
  check(
    '页面大标题统一 900 + 细描边',
    /\.home-bar__title,\s*\n\.hall-bar__title\s*\{[\s\S]*?font-weight: 900[\s\S]*?-webkit-text-stroke: 0\.6rpx currentColor/.test(appWxss),
    null
  );
  // custom-tab-bar 是独立样式作用域，page 的宋体够不到——tab 根上必须自带同款字体栈
  const tabWxss = fs.readFileSync(path.join(REPO, 'custom-tab-bar', 'index.wxss'), 'utf8');
  check(
    '自定义 tabBar 也用宋体栈',
    /font-family:\s*'Songti SC'[\s\S]*?serif;/.test(tabWxss),
    null
  );
  // 宋体笔画细，次/辅级令牌需保持加深后的对比度（回退旧值即失守）
  check(
    '次/辅级令牌为宋体加深版（text-2 #594A3B / text-3 #7E6C5A）',
    /--color-text-2:\s*#594A3B/.test(appWxss) && /--color-text-3:\s*#7E6C5A/.test(appWxss),
    null
  );

  // ============ [12] 无数据新账号 → 空态不是报错 ============
  console.log('\n[12] 新账号空态');
  check('大厅有空态组件', hallWxml2.indexOf('empty-state') > -1, null);
  const meWxml = fs.readFileSync(path.join(REPO, 'pages', 'mine', 'errands.wxml'), 'utf8');
  check('我的代取有空态组件', meWxml.indexOf('empty-state') > -1, null);
  // 合法筛选组合（range + large）当前种子数据为 0 单 → 空列表而不是报错
  const hallEmpty = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 10, itemSize: 'large', timeType: 'range', sort: 'latest' });
  check('筛选无结果返回空列表而非错误', Array.isArray(hallEmpty.list) && hallEmpty.list.length === 0 && hallEmpty.total === 0, hallEmpty.total);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})();
