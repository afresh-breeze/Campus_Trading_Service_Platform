// 我的三页冒烟（11-17 走查新增）：个人资料 / 设置 / 帮助与反馈
// stub 掉 Page/wx/getApp，用 utils/mock.js 的真实返回跑各分支
const path = require('path');
const REPO = 'E:/Qin/Computer/数据库·/Campus_Trading_Service_Platform/miniprogram';

const store = {};
const toasts = [];
const modals = [];
const navs = [];
const uploaded = [];

global.wx = {
  showToast(o) { toasts.push((o && o.title) || ''); },
  showModal(o) { modals.push(o); if (o && typeof o.success === 'function') {} },
  getStorageSync(k) { return store[k] === undefined ? '' : store[k]; },
  setStorageSync(k, v) { store[k] = v; },
  removeStorageSync(k) { delete store[k]; },
  clearStorageSync() { Object.keys(store).forEach((k) => delete store[k]); },
  getStorageInfoSync() { return { currentSize: 2048, keys: Object.keys(store) }; },
  reLaunch(o) { navs.push(o.url); },
  navigateTo(o) { navs.push(o.url); },
  navigateBack() {},
  switchTab() {},
  showLoading() {},
  hideLoading() {},
  uploadFile() {},
  getFileSystemManager: () => ({
    stat: (o) => o.success({ stats: { size: 1024 } })
  }),
  compressImage: (o) => o.success && o.success({ tempFilePath: 'tmp.jpg' })
};

let captured = null;
global.Page = (cfg) => { captured = cfg; };
global.getApp = () => ({
  globalData: { userInfo: { userId: 1, nickname: '老昵称' }, token: 'mock' },
  isLogin: () => true,
  clearSession: () => { delete store.cs_token; delete store.cs_user; },
  refreshUnread: () => {}
});
global.getCurrentPages = () => [{}, {}];

const mock = require(path.join(REPO, 'utils', 'mock.js'));
const version = require(path.join(REPO, 'utils', 'version.js'));

/** 加载页面并构造 Page 实例（每次重新 require 前清缓存） */
function loadPage(rel) {
  delete require.cache[require.resolve(path.join(REPO, rel))];
  captured = null;
  require(path.join(REPO, rel));
  const cfg = captured;
  const p = Object.assign({}, cfg);
  p.data = JSON.parse(JSON.stringify(cfg.data));
  p.setData = (d) => Object.assign(p.data, d);
  return p;
}

/** 让 http 层走 mock：替换 request.js 的 get/put/post */
const http = require(path.join(REPO, 'utils', 'request.js'));
function useMockHttp() {
  http.get = (url, params, opts) => mock.run(url, 'GET', params || {}, opts);
  http.put = (url, body) => mock.run(url, 'PUT', body || {});
  http.post = (url, body) => mock.run(url, 'POST', body || {});
  http.upload = (filePath) => { uploaded.push(filePath); return Promise.resolve({ url: '/uploads/tmp-1.jpg' }); };
}
useMockHttp();

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + ' -> ' + JSON.stringify(extra)); }
}

// mock 的 delay 默认 260ms，等待要盖过它，否则断言跑在响应之前（假失败）
const flush = () => new Promise((r) => setTimeout(r, 400));

(async () => {
  console.log('\n[1] 个人资料：加载与字段回填');
  const pf = loadPage('pages/mine/profile.js');
  await pf.load();
  await flush();
  check('loading 结束', pf.data.loading === false, pf.data);
  check('昵称回填', pf.data.nickname === '小 B', pf.data.nickname);
  check('学号回填', /^2023/.test(pf.data.studentNo), pf.data.studentNo);
  check('信用分是数字', typeof pf.data.creditScore === 'number', pf.data.creditScore);
  check('首字取昵称第一个字', pf.data.initial === Array.from(pf.data.nickname)[0], pf.data.initial);

  console.log('\n[2] 个人资料：校验（口径对齐 users.js）');
  pf.setData({ nickname: '一' });
  check('昵称 1 字不通过', pf.validate() === false && /2-12/.test(pf.data.errors.nickname), pf.data.errors);
  pf.setData({ nickname: '一二三四五六七八九十一二三', errors: {} });
  check('昵称 13 字不通过', pf.validate() === false, pf.data.errors);
  pf.setData({ nickname: '新昵称', phone: '12345', errors: {} });
  check('手机号非 11 位不通过', pf.validate() === false && /11 位/.test(pf.data.errors.phone), pf.data.errors);
  pf.setData({ nickname: '新昵称', phone: '', college: '', errors: {} });
  check('合法输入通过', pf.validate() === true, pf.data.errors);
  pf.setData({ nickname: '😀同学' });
  check('emoji 按码点计数（2 个字通过）', pf.validate() === true, pf.data.errors);

  console.log('\n[3] 个人资料：保存与缓存同步');
  pf.setData({ nickname: '新昵称', college: '计算机学院', phone: '13800000000' });
  pf.onSave();
  await flush();
  const saved = mock.run('/api/auth/me', 'GET', {});
  check('PUT 成功后缓存同步昵称', (await saved).nickname === '新昵称', (await saved).nickname);
  check('保存后 toast', toasts.indexOf('保存成功') > -1, toasts);
  check('saving 复位', pf.data.saving === false);

  console.log('\n[4] 设置页：通知开关与清缓存保留登录态');
  store.cs_token = 'tk';
  store.cs_user = { userId: 1 };
  store.cs_search_history = ['高数'];
  const st = loadPage('pages/mine/settings.js');
  st.onShow();
  check('默认通知为开', st.data.notifyEnabled === true, st.data.notifyEnabled);
  check('缓存大小可读', /KB|MB/.test(st.data.cacheSize), st.data.cacheSize);
  check('版本号与 version.js 一致', st.data.version === version.APP_VERSION, st.data.version);
  st.onToggleNotify({ detail: { value: false } });
  check('关通知写本地', wx.getStorageSync('cs_notify_enabled') === false, wx.getStorageSync('cs_notify_enabled'));
  // 清缓存：modal 直接回调确认
  wx.showModal = (o) => { o.success({ confirm: true }); };
  st.onClearCache();
  await flush();
  check('清缓存后 token 保留', wx.getStorageSync('cs_token') === 'tk', wx.getStorageSync('cs_token'));
  check('清缓存后用户信息保留', !!wx.getStorageSync('cs_user'), wx.getStorageSync('cs_user'));
  check('清缓存后搜索历史被清', wx.getStorageSync('cs_search_history') === '', wx.getStorageSync('cs_search_history'));
  check('清缓存保留通知开关', wx.getStorageSync('cs_notify_enabled') === false);
  st.onLogout();
  await flush();
  check('退出登录 reLaunch 登录页', navs[navs.length - 1] === '/pages/login/login', navs);

  console.log('\n[5] 帮助页：FAQ 折叠与反馈提交');
  const hp = loadPage('pages/mine/help.js');
  check('FAQ 8 条', hp.data.faqs.length === 8, hp.data.faqs.length);
  check('默认全收起', hp.data.openIndex === -1);
  hp.onToggleFaq({ currentTarget: { dataset: { index: 2 } } });
  check('点开第 3 条', hp.data.openIndex === 2, hp.data.openIndex);
  hp.onToggleFaq({ currentTarget: { dataset: { index: 2 } } });
  check('再点收起', hp.data.openIndex === -1, hp.data.openIndex);
  hp.onSubmit();
  await flush();
  check('空内容不提交', toasts[toasts.length - 1] === '请先写下你的意见', toasts);
  hp.setData({ content: '希望代取支持多张图片' });
  hp.onSubmit();
  await flush();
  check('提交成功清空输入', hp.data.content === '', hp.data.content);
  check('提交成功 toast', toasts.indexOf('感谢反馈') > -1, toasts);
  hp.setData({ content: 'x'.repeat(201) });
  hp.onSubmit();
  await flush();
  check('超 200 字被拦', toasts[toasts.length - 1].indexOf('200') > -1, toasts);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})();
