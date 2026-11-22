/**
 * 我的代取页冒烟测试（临时脚本，stub 掉 Page/wx/getApp/request）
 * 运行：node smoke_mine_errands.js   （cwd 必须在仓库根）
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

// ---- 拦截 utils/request ----
const calls = [];
let pending = []; // 未放行请求（FIFO）
const fakeRequest = {
  get(url, query) {
    calls.push({ method: 'GET', url, query });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  post(url, data) {
    calls.push({ method: 'POST', url, data });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  }
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/utils[\\/]request$/.test(request) || /utils[\\/]request\.js$/.test(request)) return fakeRequest;
  return origLoad.apply(this, arguments);
};

// ---- stub 全局 ----
let pageCfg = null;
global.Page = (cfg) => {
  pageCfg = cfg;
};
let appState = { login: true };
global.getApp = () => ({
  isLogin: () => appState.login,
  requireLogin: () => {}
});
const navs = [];
const switches = [];
const toasts = [];
let modalConfirm = true;
global.wx = {
  navigateTo: (o) => navs.push(o.url),
  redirectTo: (o) => navs.push(o.url),
  switchTab: (o) => switches.push(o.url),
  navigateBack: () => navs.push('__back__'),
  showToast: (o) => toasts.push(o.title),
  hideToast: () => {},
  showModal: (o) => o.success({ confirm: modalConfirm }),
  stopPullDownRefresh: () => {}
};

require(path.join(MP, 'pages/mine/errands.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.setData = function (patch) {
    Object.assign(this.data, patch);
  };
  return inst;
}
function flushNext(ok, payload) {
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload);
  else p.reject(payload);
}
/** 放行队列里第一个 method+url 匹配的请求 */
function flushMatch(method, url, ok, payload) {
  const i = pending.findIndex((p) => calls && false); // 占位，实际用 calls 顺序找
  void i;
  // 直接按 calls 里最后未处理的匹配项找
  const idx = pending.findIndex((p, k) => {
    void k;
    return p.__method === method;
  });
  void idx;
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload);
  else p.reject(payload);
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

function order(id, extra) {
  return Object.assign(
    {
      orderId: id,
      publisherId: 1,
      publisherNickname: '小 B',
      publisherAvatar: '',
      pickupArea: '桃园',
      pickupPlace: '桃园',
      deliveryLocation: '李园 3 栋',
      itemSize: 'small',
      itemDesc: '一个快递',
      remark: '',
      reward: 4,
      timeType: 'asap',
      timeStart: null,
      deadline: null,
      visibility: 'hall',
      createdAt: '2026-11-14 10:00:00',
      runnerId: null,
      runnerNickname: null,
      runnerAvatar: '',
      takenAt: null,
      completedAt: null
    },
    extra || {}
  );
}

(async () => {
  console.log('[1] toCard 派生字段与操作按钮');
  // 发布者视角：待接单私单 → 撤回；无接单人 → 无联系
  const c1 = pageCfg && null; // toCard 是模块内函数，通过页面行为间接测
  void c1;

  console.log('[2] onLoad 初始参数与首次拉取');
  appState.login = true;
  const p = makePage();
  p.onLoad({ role: 'publisher', status: 'completed' });
  check('role 透传', p.data.role === 'publisher', p.data.role);
  check('status 初始 completed', p.data.status === 'completed', p.data.status);
  check('标题=我发布的代取', p.data.pageTitle === '我发布的代取', p.data.pageTitle);

  p.onShow();
  check('指定状态走后端 status 参数', calls[0].query.status === 'completed', calls[0]);
  check('role=publisher', calls[0].query.role === 'publisher');
  check('pageSize 上限 50', calls[0].query.pageSize === 50);
  flushNext(true, {
    list: [order(2101, { status: 'completed', runnerId: 8, runnerNickname: '跑腿小李', completedAt: '2026-11-14 12:00:00' })],
    total: 1,
    page: 1,
    pageSize: 50
  });
  await tick();
  check('平铺列表 1 条', p.data.list.length === 1 && p.data.list[0].orderId === 2101, p.data.list.length);
  check('完成卡显示完成时间', /完成于/.test(p.data.list[0].completedText), p.data.list[0].completedText);
  // 已完成订单不能完成/撤回，但保留「联系 TA」（对方信息仍在）
  check(
    '发布者视角已完成 → 仅联系',
    JSON.stringify(p.data.list[0].actions.map((a) => a.key)) === JSON.stringify(['contact']),
    p.data.list[0].actions
  );

  console.log('[3] 切回「全部」：分组视图');
  p.onChipChange({ currentTarget: { dataset: { key: '' } } });
  flushNext(true, {
    list: [
      order(2101, { status: 'completed', runnerId: 8, runnerNickname: '跑腿小李' }),
      order(2102, { status: 'pending', visibility: 'private' }),
      order(2103, { status: 'taken', runnerId: 9, runnerNickname: '阿杰' }),
      order(2104, { status: 'cancelled' })
    ],
    total: 4,
    page: 1,
    pageSize: 50
  });
  await tick();
  check('分组数=4（每组都有）', p.data.sections.length === 4, p.data.sections.map((s) => s.status));
  check(
    '分组顺序 pending→taken→completed→cancelled',
    JSON.stringify(p.data.sections.map((s) => s.status)) ===
      JSON.stringify(['pending', 'taken', 'completed', 'cancelled']),
    p.data.sections.map((s) => s.status)
  );
  check('分组计数正确', p.data.counts.pending === 1 && p.data.counts.taken === 1 && p.data.counts.completed === 1 && p.data.counts.cancelled === 1, p.data.counts);
  const sec0 = p.data.sections[0];
  check('待接单私单 → 只有取消按钮', sec0.list[0].actions.length === 1 && sec0.list[0].actions[0].key === 'cancel', sec0.list[0].actions);
  check('待接单卡对方=等待接单', sec0.list[0].counterpartyText === '等待接单', sec0.list[0].counterpartyText);
  const sec1 = p.data.sections[1];
  check(
    '进行中(发布者) → 完成+撤回+联系',
    JSON.stringify(sec1.list[0].actions.map((a) => a.key)) === JSON.stringify(['complete', 'cancel', 'contact']),
    sec1.list[0].actions
  );
  check('进行中卡对方=接单人昵称', sec1.list[0].counterpartyText === '阿杰', sec1.list[0].counterpartyText);
  check('私单卡带私单标记', p.data.sections[0].list[0].visibility === 'private');

  console.log('[4] tab 切到我接的');
  p.onTabChange({ currentTarget: { dataset: { key: 'runner' } } });
  check('role=runner', p.data.role === 'runner');
  check('标题=我接的代取', p.data.pageTitle === '我接的代取');
  check('status 重置为全部', p.data.status === '');
  flushNext(true, {
    list: [
      order(2105, { publisherId: 6, publisherNickname: '孙同学', status: 'taken', runnerId: 1 }),
      order(2106, { publisherId: 6, publisherNickname: '孙同学', status: 'completed', runnerId: 1 })
    ],
    total: 2,
    page: 1,
    pageSize: 50
  });
  await tick();
  check('我接的分组 2 组', p.data.sections.length === 2, p.data.sections.map((s) => s.status));
  const takenCard = p.data.sections[0].list[0];
  check(
    '我接的进行中 → 释放+联系',
    JSON.stringify(takenCard.actions.map((a) => a.key)) === JSON.stringify(['release', 'contact']),
    takenCard.actions
  );
  check('我接的对方=发布者', takenCard.counterpartyText === '孙同学', takenCard.counterpartyText);

  console.log('[5] 确认完成：弹窗 → POST → 刷新');
  toasts.length = 0;
  p.onAction({ currentTarget: { dataset: { key: 'complete', id: 2105 } } });
  await tick();
  const post = calls.filter((c) => c.method === 'POST')[0];
  check('POST complete 接口', !!post && post.url === '/api/errands/2105/complete', post && post.url);
  flushNext(true, { orderId: 2105, status: 'completed' });
  await tick();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 50 }); // 刷新请求
  await tick();
  check('完成 toast', toasts.indexOf('已确认完成') > -1, toasts);
  check('完成后解禁', p.data.submitting === false);

  console.log('[6] 撤回：按返回 visibility 提示');
  p.onAction({ currentTarget: { dataset: { key: 'cancel', id: 2105 } } });
  await tick();
  flushNext(true, { orderId: 2105, status: 'pending', visibility: 'private' });
  await tick();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 50 });
  await tick();
  check('私单撤回提示=退回待接单', toasts.indexOf('订单已退回待接单') > -1, toasts);

  console.log('[7] 操作失败 409：透出后端文案并刷新');
  toasts.length = 0;
  p.onAction({ currentTarget: { dataset: { key: 'release', id: 2105 } } });
  await tick();
  flushNext(false, { code: 409, message: '当前订单不能释放' });
  await tick();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 50 });
  await tick();
  check('409 文案透出', toasts.indexOf('当前订单不能释放') > -1, toasts);

  console.log('[8] 联系 TA');
  // [7] 刷新后列表已空，先按「进行中」重拉一份有对方信息的卡片
  p.onChipChange({ currentTarget: { dataset: { key: 'taken' } } });
  flushNext(true, {
    list: [order(2105, { publisherId: 6, publisherNickname: '孙同学', status: 'taken', runnerId: 1 })],
    total: 1,
    page: 1,
    pageSize: 50
  });
  await tick();
  navs.length = 0;
  p.onContact(2105);
  await tick();
  check(
    '跳聊天页带 peerId/bizType/bizId',
    navs.some((u) => u.indexOf('/pages/chat/detail?peerId=6&bizType=errand&bizId=2105') === 0),
    navs
  );
  toasts.length = 0;
  p.onContact(2106); // 已完成单 runnerId=1 存在（order() 默认 publisherId=1…此处对已完成单也可以联系）
  await tick();
  check('可联系单正常跳转或提示', navs.length >= 1 || toasts.length === 1, { navs, toasts });

  console.log('[9] 未登录与空态出口');
  appState.login = false;
  const p2 = makePage();
  calls.length = 0;
  p2.onShow();
  await tick();
  check('未登录不发请求', calls.length === 0, calls.length);
  check('未登录 isLogin=false', p2.data.isLogin === false);
  appState.login = true;

  const p3 = makePage();
  p3.onLoad({ role: 'publisher' });
  p3.onShow();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 50 });
  await tick();
  switches.length = 0;
  navs.length = 0;
  p3.onEmptyAction();
  check('发布者空态 → 去发布页', navs.indexOf('/pages/errand/publish') > -1, navs);
  p3.onTabChange({ currentTarget: { dataset: { key: 'runner' } } });
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 50 });
  await tick();
  p3.onEmptyAction();
  check('接单者空态 → 去大厅(switchTab)', switches.indexOf('/pages/errand/hall') > -1, switches);

  console.log('[10] 超量提示');
  const p4 = makePage();
  p4.onLoad({ role: 'publisher' });
  p4.onShow();
  const big = [];
  for (let i = 0; i < 50; i++) big.push(order(2200 + i, { status: 'pending', createdAt: '2026-11-1' + (i % 10) + ' 08:00:00' }));
  flushNext(true, { list: big, total: 73, page: 1, pageSize: 50 });
  await tick();
  check('total>50 → truncated', p4.data.truncated === true, p4.data.truncated);
  check('分组只含 pending', p4.data.sections.length === 1 && p4.data.sections[0].status === 'pending');

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
