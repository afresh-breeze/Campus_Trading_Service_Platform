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

  console.log('\n[7] 置顶重排：FLIP 位移动画状态');
  const p7 = makePage();
  p7.data.list = [
    { conversationId: 11, peerId: 2, isPinned: false, swipeX: 0, swiping: false },
    { conversationId: 12, peerId: 3, isPinned: false, swipeX: 0, swiping: false }
  ];
  p7.setData = function (patch, cb) {
    // 真实 setData 会展开 list[0].xxx 路径；测试桩也要展开，否则看不到 FLIP 状态
    Object.keys(patch).forEach((key) => {
      const m = /^list\[(\d+)\]\.(.+)$/.exec(key);
      if (m) {
        const row = this.data.list[Number(m[1])];
        if (row) row[m[2]] = patch[key];
      } else {
        this.data[key] = patch[key];
      }
    });
    if (typeof cb === 'function') cb();
  };
  const rectCbs = [];
  global.wx.createAnimation = (opts) => {
    const actions = [];
    return {
      translateY(y) { actions.push({ method: 'translateY', args: [y] }); return this; },
      step(o) { actions.push({ step: Object.assign({}, opts, o || {}) }); return this; },
      export() { return { actions: JSON.parse(JSON.stringify(actions)) }; }
    };
  };
  global.wx.createSelectorQuery = () => {
    const q = {
      selectAll(sel) { q.sel = sel; return q; },
      boundingClientRect(cb) { rectCbs.push(cb); return q; },
      exec() { return q; }
    };
    return q;
  };
  calls.length = 0;
  p7.onTogglePin({ currentTarget: { dataset: { id: 12, pinned: false } } });
  check('置顶请求先发出，不阻塞动画采集', calls.length === 1 && calls[0].method === 'PATCH', calls);
  flushNext(true, { pinned: true });
  await tick();
  check('成功后按新顺序重新拉列表', calls.length === 2 && calls[1].method === 'GET', calls);
  flushNext(true, {
    list: [
      { conversationId: 12, peerId: 3, isPinned: true, unreadCount: 0, animData: '', flipActive: false },
      { conversationId: 11, peerId: 2, isPinned: false, unreadCount: 0, animData: '', flipActive: false }
    ],
    total: 2
  });
  await tick();
  check('提交前采集旧顺序坐标', rectCbs.length === 1, rectCbs.length);
  rectCbs.shift()([{ top: 200 }, { top: 300 }]); // 旧顺序：11 在上(200)、12 在下(300)
  await tick();
  const acts0 = (p7.data.list[0].animData || {}).actions || [];
  const acts1 = (p7.data.list[1].animData || {}).actions || [];
  check('原第一条下移到第二个槽位（+100px）', acts0[0] && acts0[0].method === 'translateY' && acts0[0].args[0] === 100, acts0);
  check('被置顶项上移到第一个槽位（-100px）', acts1[0] && acts1[0].method === 'translateY' && acts1[0].args[0] === -100, acts1);
  check('动画单步且时长 320ms', acts0[1] && acts0[1].step.duration === 320 && acts0.length === 2, acts0);
  check('动画期间保持旧顺序，不提前换代', p7.data.list[0].conversationId === 11 && p7.data.list[1].conversationId === 12, p7.data.list.map((c) => c.conversationId));
  check('发生位移的卡片置顶显示', p7.data.list[0].flipActive === true && p7.data.list[1].flipActive === true, p7.data.list.map((c) => c.flipActive));
  await new Promise((r) => setTimeout(r, 380));
  check('动画结束后提交新顺序：置顶项到顶部', p7.data.list[0].conversationId === 12 && p7.data.list[1].conversationId === 11, p7.data.list.map((c) => c.conversationId));
  check('提交时清掉动画与浮层状态', p7.data.list.every((c) => !c.animData && c.flipActive === false), p7.data.list);
  check('提交时换新行 key，强制重建节点', p7.data.list[0].rowKey === '12_1' && p7.data.list[1].rowKey === '11_1', p7.data.list.map((c) => c.rowKey));

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
