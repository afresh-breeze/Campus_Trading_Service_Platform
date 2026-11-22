/**
 * 消息列表页冒烟测试（临时脚本，stub 掉 Page/wx/getApp/request）
 * 运行：node smoke_chat_list.js   （cwd 必须在仓库根）
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
  }
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/utils[\\/]request$/.test(request) || /utils[\\/]request\.js$/.test(request)) return fakeRequest;
  return origLoad.apply(this, arguments);
};

let pageCfg = null;
global.Page = (cfg) => {
  pageCfg = cfg;
};
let appState = { login: true, unreadRefreshed: 0 };
global.getApp = () => ({
  isLogin: () => appState.login,
  requireLogin: () => {},
  globalData: { userInfo: { userId: 1 }, token: 't' },
  refreshUnread: () => {
    appState.unreadRefreshed += 1;
  }
});
const navs = [];
const switches = [];
const toasts = [];
let tabSync = [];
global.wx = {
  navigateTo: (o) => navs.push(o.url),
  switchTab: (o) => switches.push(o.url),
  showToast: (o) => toasts.push(o.title),
  hideToast: () => {},
  stopPullDownRefresh: () => {}
};

require(path.join(MP, 'pages/chat/list.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.setData = function (patch) {
    Object.assign(this.data, patch);
  };
  inst.getTabBar = () => ({
    syncSelected: (i) => tabSync.push(i),
    setBadge: () => {}
  });
  return inst;
}
function flushNext(ok, payload) {
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload);
  else p.reject(payload);
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

function conv(id, extra) {
  return Object.assign(
    {
      conversationId: id,
      peerId: 2,
      peerNickname: '李四',
      peerAvatar: '/uploads/a2.jpg',
      lastMessage: '在的，明天可以吗',
      lastTime: '2026-11-15 20:12:03',
      unreadCount: 2,
      bizType: 'item',
      bizId: 1001
    },
    extra || {}
  );
}

(async () => {
  console.log('[1] onShow：tab 同步 + 登录门 + 刷新');
  const p = makePage();
  p.onShow();
  check('syncSelected(2)', tabSync.indexOf(2) > -1, tabSync);
  check('全局角标刷新被调用', appState.unreadRefreshed > 0, appState.unreadRefreshed);
  check('GET /api/conversations page=1', calls[0].url === '/api/conversations' && calls[0].query.page === 1, calls[0]);
  check('pageSize=20', calls[0].query.pageSize === 20);
  flushNext(true, { list: [conv(7), conv(8, { unreadCount: 100, lastMessage: '', lastTime: null })], total: 2, page: 1, pageSize: 20 });
  await tick();
  check('列表 2 条', p.data.list.length === 2);
  check('未读数透传', p.data.list[0].unreadCount === 2 && p.data.list[0].unreadText === '2');
  check('未读 >99 → 99+', p.data.list[1].unreadText === '99+', p.data.list[1].unreadText);
  check('空最后消息兜底', p.data.list[1].lastMessage === '暂无消息');
  check('空时间不显示', p.data.list[1].timeText === '');
  check('头像 fullUrl', /\/uploads\/a2\.jpg$|\/uploads\/a2\.jpg/.test(p.data.list[0].avatarUrl), p.data.list[0].avatarUrl);
  check('时间相对化', p.data.list[0].timeText !== '', p.data.list[0].timeText);

  console.log('[2] 上拉加载 + 去重');
  p.fetch(2);
  flushNext(true, { list: [conv(7), conv(9)], total: 3, page: 2, pageSize: 20 });
  await tick();
  check('翻页按 conversationId 去重', p.data.list.length === 3, p.data.list.map((c) => c.conversationId));
  check('hasMore=false（3 < 3 不成立）', p.data.hasMore === false, p.data.hasMore);

  console.log('[3] 首屏失败与空态');
  const p2 = makePage();
  p2.onShow();
  flushNext(false, { code: 500, message: '服务器错误' });
  await tick();
  check('错误态透出 message', p2.data.error === '服务器错误', p2.data.error);
  const p3 = makePage();
  p3.onShow();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 20 });
  await tick();
  check('空会话 → 空态', p3.data.list.length === 0 && !p3.data.error);
  switches.length = 0;
  p3.onGoIndex();
  check('空态按钮 → switchTab 首页', switches.indexOf('/pages/index/index') > -1, switches);

  console.log('[4] 进会话带四参');
  navs.length = 0;
  p.onTapConv({
    currentTarget: { dataset: { id: 7, peer: 2, biztype: 'item', bizid: 1001 } }
  });
  check(
    '跳聊天页带 conversationId/peerId/bizType/bizId',
    navs[0] === '/pages/chat/detail?conversationId=7&peerId=2&bizType=item&bizId=1001',
    navs
  );

  console.log('[5] 未登录');
  appState.login = false;
  const p4 = makePage();
  calls.length = 0;
  p4.onShow();
  await tick();
  check('未登录不发请求', calls.length === 0, calls.length);
  check('未登录 isLogin=false', p4.data.isLogin === false);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
