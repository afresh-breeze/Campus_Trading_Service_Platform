/**
 * 消息列表左滑操作运行时冒烟（11-26）
 * 直接驱动 list.js 的 onTogglePin / onMarkUnread / onDeleteConv，
 * 验证请求真的发出、成功后重新拉列表。
 * 运行：node scripts/smoke/smoke_chat_swipe.js   （cwd 必须在仓库根）
 */
const path = require('path');
const Module = require('module');
const REPO = process.cwd();
const MP = path.join(REPO, 'miniprogram');

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log('  PASS  ' + name);
  } else {
    fail += 1;
    console.log('  FAIL  ' + name + (extra === undefined ? '' : ' -> ' + JSON.stringify(extra)));
  }
}

const calls = [];
let pending = [];
const fakeRequest = {
  get(url, query) {
    calls.push({ method: 'GET', url, query });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  patch(url, data) {
    calls.push({ method: 'PATCH', url, data });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  put(url, data) {
    calls.push({ method: 'PUT', url, data });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  del(url, data) {
    calls.push({ method: 'DELETE', url, data });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  }
};
const origLoad = Module._load;
Module._load = function (request) {
  if (/utils[\\/]request(\.js)?$/.test(request)) return fakeRequest;
  return origLoad.apply(this, arguments);
};

let pageCfg = null;
global.Page = (cfg) => { pageCfg = cfg; };
global.getApp = () => ({
  isLogin: () => true,
  requireLogin: () => {},
  globalData: { token: 't' },
  refreshUnread: () => {}
});
let modalConfirm = true;
global.wx = {
  showToast: () => {},
  hideToast: () => {},
  stopPullDownRefresh: () => {},
  showModal: (o) => { if (o.success) o.success({ confirm: modalConfirm }); },
  getWindowInfo: () => ({ windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 24, height: 32 })
};

require(path.join(MP, 'pages/chat/list.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.data.list = [
    { conversationId: 11, peerId: 2, isPinned: false, swipeX: -225, swiping: false },
    { conversationId: 12, peerId: 3, isPinned: false, swipeX: 0, swiping: false }
  ];
  inst.setData = function (patch) { Object.assign(this.data, patch); };
  inst.getTabBar = () => ({ syncSelected: () => {}, setBadge: () => {} });
  inst._actionWidth = 225;
  return inst;
}
function flushNext(ok, payload) {
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload); else p.reject(payload);
}
const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  console.log('[1] 置顶：点击置顶按钮走 PATCH 并刷新列表');
  const p = makePage();
  calls.length = 0;
  p.onTogglePin({ currentTarget: { dataset: { id: 11, pinned: false } } });
  check('置顶发出 PATCH /api/conversations/11/pin', calls.length === 1 && calls[0].method === 'PATCH' && calls[0].url === '/api/conversations/11/pin', calls);
  check('置顶请求体 pinned=true', calls[0] && calls[0].data.pinned === true, calls[0] && calls[0].data);
  flushNext(true, { pinned: true });
  await tick();
  check('成功后重新拉列表', calls.length === 2 && calls[1].method === 'GET' && calls[1].url === '/api/conversations', calls);
  flushNext(true, { list: [], total: 0 });
  await tick();

  console.log('\n[2] 取消置顶：pinned=true 时发 pinned=false');
  calls.length = 0;
  p.onTogglePin({ currentTarget: { dataset: { id: 12, pinned: true } } });
  check('取消置顶请求体 pinned=false', calls[0] && calls[0].data.pinned === false, calls[0] && calls[0].data);
  flushNext(true, { pinned: false });
  await tick();
  flushNext(true, { list: [], total: 0 });
  await tick();

  console.log('\n[3] 置顶失败：toast 且不刷新');
  const p3 = makePage();
  calls.length = 0;
  p3.onTogglePin({ currentTarget: { dataset: { id: 11, pinned: false } } });
  flushNext(false, { code: 500, message: '服务异常' });
  await tick();
  check('失败后不发第二次请求', calls.length === 1, calls);

  console.log('\n[4] 标为未读：PUT unread 并刷新');
  const p4 = makePage();
  calls.length = 0;
  p4.onMarkUnread({ currentTarget: { dataset: { id: 11 } } });
  check('标为未读发出 PUT unread', calls[0] && calls[0].method === 'PUT' && calls[0].url === '/api/conversations/11/unread', calls);
  flushNext(true, { unreadCount: 1 });
  await tick();
  check('成功后重新拉列表', calls.length === 2 && calls[1].method === 'GET', calls);
  flushNext(true, { list: [], total: 0 });
  await tick();

  console.log('\n[5] 删除：确认后 DELETE 并刷新');
  const p5 = makePage();
  calls.length = 0;
  p5.onDeleteConv({ currentTarget: { dataset: { id: 11 } } });
  await tick();
  check('删除发出 DELETE', calls[0] && calls[0].method === 'DELETE' && calls[0].url === '/api/conversations/11', calls);
  flushNext(true, { deleted: true });
  await tick();
  check('成功后重新拉列表', calls.length === 2 && calls[1].method === 'GET', calls);
  flushNext(true, { list: [], total: 0 });
  await tick();

  console.log('\n[6] 删除取消：不发出请求');
  const p6 = makePage();
  calls.length = 0;
  modalConfirm = false;
  p6.onDeleteConv({ currentTarget: { dataset: { id: 11 } } });
  await tick();
  check('取消删除不发请求', calls.length === 0, calls);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
