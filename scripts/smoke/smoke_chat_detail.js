/**
 * 聊天页冒烟测试（临时脚本，stub 掉 Page/wx/getApp/request）
 * 运行：node smoke_chat_detail.js   （cwd 必须在仓库根）
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
  post(url, data) {
    calls.push({ method: 'POST', url, data });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  put(url, data) {
    calls.push({ method: 'PUT', url, data });
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
const toasts = [];
const clips = [];
global.wx = {
  navigateTo: (o) => navs.push(o.url),
  switchTab: (o) => navs.push('switch:' + o.url),
  navigateBack: () => navs.push('__back__'),
  showToast: (o) => toasts.push(o.title),
  hideToast: () => {},
  setClipboardData: (o) => clips.push(o.data)
};

require(path.join(MP, 'pages/chat/detail.js'));

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
/** 清 calls 同时必须清 pending，避免陈旧未 settle 的 promise 错位 */
function resetCalls() {
  calls.length = 0;
  pending.length = 0;
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

const now = () => {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00'
  );
};
const msg = (id, senderId, content, extra) =>
  Object.assign(
    { messageId: id, senderId, msgType: 'text', content, createdAt: now(), isMine: senderId === 1 },
    extra || {}
  );

(async () => {
  console.log('[1] 初始化：建会话 → 首屏消息 → 已读 → 轮询');
  const p = makePage();
  p.onLoad({ peerId: '2', bizType: 'item', bizId: '1001' });
  check('POST /api/conversations 建会话', calls[0].method === 'POST' && calls[0].url === '/api/conversations', calls[0]);
  check('请求体 peerId/bizType/bizId', calls[0].data.peerId === 2 && calls[0].data.bizType === 'item' && calls[0].data.bizId === 1001, calls[0].data);
  flushNext(true, { conversationId: 7, peerId: 2, peerNickname: '李四', peerAvatar: '/uploads/a2.jpg' });
  await tick();
  check('会话 id 记录', p.data.conversationId === 7, p.data.conversationId);
  check('对方昵称进标题', p.data.pageTitle === '李四' && p.data.peerNickname === '李四', p.data.pageTitle);
  check('并行拉 context', calls.some((c) => c.url === '/api/conversations/7/context'));
  const msgsCall = calls.filter((c) => c.url === '/api/conversations/7/messages')[0];
  check('首屏 afterId=0 limit=20', msgsCall.query.afterId === 0 && msgsCall.query.limit === 20, msgsCall.query);
  // 放行 context 与 messages（队列顺序）
  flushNext(true, { bizType: 'item', bizId: 1001, bizSummary: { itemId: 1001, title: '高数上册', coverUrl: '/uploads/b1.jpg', price: 18, status: 'on_sale' } });
  flushNext(true, { list: [msg(1, 2, '同学你好，高数上册还在吗？'), msg(2, 1, '在的，18 元，可以面交')] });
  await tick();
  await tick();
  check('气泡 2 条且升序', p.data.messages.length === 2 && p.data.messages[0].messageId === 1, p.data.messages.length);
  check('isMine 映射（第 2 条自己）', p.data.messages[1].isMine === true && p.data.messages[0].isMine === false);
  check('首条显示时间分隔', p.data.messages[0].showTime === true);
  check('滚动锚点=最后一条', p.data.scrollAnchor === 'm2', p.data.scrollAnchor);
  check('业务卡片=商品', p.data.bizCard && p.data.bizCard.title === '高数上册' && p.data.bizCard.jumpUrl === '/pages/item/detail?id=1001', p.data.bizCard);
  check('副标题=关于《高数上册》', p.data.bizTitleText === '关于《高数上册》', p.data.bizTitleText);
  check('loading 结束', p.data.loading === false);
  check('轮询已启动', !!p._pollTimer);
  // init 链路里 markRead 会调两次（appendMessages 的 hasPeerNew + init then），把挂起的 PUT 全消化
  while (pending.length) {
    flushNext(true, { unreadCount: 0 });
    await tick();
  }

  console.log('[2] 标记已读 + 全局角标');
  const readCalls = calls.filter((c) => c.method === 'PUT' && /\/read$/.test(c.url));
  check('进入即标记已读', readCalls.length >= 1, readCalls.length);
  check('read 带 lastMessageId', readCalls.some((c) => c.data.lastMessageId === 2), readCalls);
  check('全局角标刷新', appState.unreadRefreshed >= 1, appState.unreadRefreshed);

  console.log('[3] 轮询：增量拉取 + 去重');
  resetCalls();
  p.pollTick();
  const pollCall = calls.filter((c) => c.url === '/api/conversations/7/messages')[0];
  check('轮询带 afterId=本地最大', pollCall.query.afterId === 2, pollCall.query);
  flushNext(true, { list: [msg(3, 2, '那五点图书馆门口见', { isMine: false })] });
  await tick();
  await tick();
  check('新消息追加', p.data.messages.length === 3 && p.data.messages[2].content === '那五点图书馆门口见');
  check('对方新消息触发已读', calls.filter((c) => c.method === 'PUT' && /\/read$/.test(c.url)).length >= 1);
  // 再次轮询返回同一条 → 不重复
  resetCalls();
  p.pollTick();
  check('增量 afterId=3', calls.filter((c) => c.url === '/api/conversations/7/messages')[0].query.afterId === 3);
  flushNext(true, { list: [msg(3, 2, '重复消息')] });
  await tick();
  await tick();
  check('messageId 去重不重复追加', p.data.messages.length === 3, p.data.messages.length);

  console.log('[4] 发送：乐观更新 → 替换真实 id');
  resetCalls();
  p.onInput({ detail: { value: '好的，没问题' } });
  p.onSend();
  check('输入框立即清空', p.data.input === '');
  const opt = p.data.messages[p.data.messages.length - 1];
  check('乐观气泡 pending', opt.pending === true && opt.content === '好的，没问题' && opt.isMine === true, opt);
  const sendCall = calls.filter((c) => c.method === 'POST' && /messages$/.test(c.url))[0];
  check('POST 发送消息', !!sendCall && sendCall.data.content === '好的，没问题', sendCall);
  flushNext(true, { messageId: 88, createdAt: now() });
  await tick();
  const real = p.data.messages[p.data.messages.length - 1];
  check('替换为真实 messageId=88', real.messageId === 88 && real.pending === false && real.key === 'm88', real);

  console.log('[5] 发送失败 → 标红重发');
  p.onInput({ detail: { value: '再试试' } });
  p.onSend();
  flushNext(false, { code: -1, message: '网络开小差了' });
  await tick();
  const failed = p.data.messages[p.data.messages.length - 1];
  check('失败标红', failed.failed === true, failed);
  toasts.length = 0;
  p.onTapFailed({ currentTarget: { dataset: { temp: failed.tempId } } });
  await tick();
  const retryCall = calls.filter((c) => c.method === 'POST' && /messages$/.test(c.url)).pop();
  check('重发同一内容', retryCall.data.content === '再试试', retryCall);
  flushNext(true, { messageId: 89, createdAt: now() });
  await tick();
  check('重发成功', p.data.messages[p.data.messages.length - 1].messageId === 89);

  console.log('[6] 空消息与超长消息拦截');
  calls.length = 0;
  toasts.length = 0;
  p.onInput({ detail: { value: '   ' } });
  p.onSend();
  check('空消息 toast 拦截', toasts.indexOf('不能发送空消息') > -1, toasts);
  check('空消息不发请求', calls.filter((c) => c.method === 'POST').length === 0);

  console.log('[7] onHide/onUnload 清定时器 + 隐藏标记已读');
  check('轮询运行中', !!p._pollTimer);
  calls.length = 0;
  p.onHide();
  check('onHide 清定时器', p._pollTimer === null, p._pollTimer);
  check('onHide 标记一次已读', calls.some((c) => c.method === 'PUT' && /\/read$/.test(c.url)));
  p.onShow();
  check('onShow 恢复轮询', !!p._pollTimer);
  p.onUnload();
  check('onUnload 清定时器', p._pollTimer === null);

  console.log('[8] 长按复制');
  clips.length = 0;
  p.onLongPressMsg({ currentTarget: { dataset: { content: '复制我' } } });
  check('内容进剪贴板', clips.indexOf('复制我') > -1, clips);

  console.log('[9] 403 非参与者');
  resetCalls(); // [7] onHide 留下的 PUT read 会顶错队列
  const p2 = makePage();
  p2.onLoad({ peerId: '5', bizType: 'errand', bizId: '2001' });
  flushNext(false, { code: 403, message: '无权查看该会话' });
  await tick();
  check('fatal=无法打开会话', p2.data.fatalError === '无法打开会话', p2.data.fatalError);
  check('403 透出后端 message', p2.data.fatalDesc === '无权查看该会话', p2.data.fatalDesc);
  check('403 不给重试', p2.data.canRetry === false);
  check('403 不启动轮询', p2._pollTimer === null || p2._pollTimer === undefined);

  console.log('[10] 网络失败给重试');
  resetCalls();
  const p3 = makePage();
  p3.onLoad({ peerId: '2', bizType: 'item', bizId: '1001' });
  flushNext(false, { code: -1, message: '请检查网络' });
  await tick();
  check('fatal=打开会话失败', p3.data.fatalError === '打开会话失败', p3.data.fatalError);
  check('网络失败可重试', p3.data.canRetry === true);

  console.log('[11] 代取会话卡片');
  resetCalls();
  const p4 = makePage();
  p4.onLoad({ conversationId: '3002', peerId: '5', bizType: 'errand', bizId: '2001' });
  // 队列：POST(补 peer 信息) → context → messages
  flushNext(true, { conversationId: 3002, peerId: 5, peerNickname: '赵同学', peerAvatar: '' });
  await tick();
  flushNext(true, { bizType: 'errand', bizId: 2001, bizSummary: { orderId: 2001, itemSize: 'medium', pickupArea: '桃园', pickupPlace: '桃园', reward: 4, status: 'pending' } });
  flushNext(true, { list: [msg(10, 5, '接单了吗？')] });
  await tick();
  await tick();
  check('会话卡片=代取', p4.data.bizCard && p4.data.bizCard.title === '代取订单 #2001', p4.data.bizCard);
  check('代取副标题', p4.data.bizTitleText === '关于代取订单', p4.data.bizTitleText);
  check('卡片带规格与取件地', /中件/.test(p4.data.bizCard.subText) && /桃园/.test(p4.data.bizCard.subText), p4.data.bizCard.subText);
  check('卡片价格', p4.data.bizCard.mainText === '¥4.00', p4.data.bizCard.mainText);
  p4.onUnload();

  console.log('[12] 业务卡片跳转');
  navs.length = 0;
  p.onBizTap();
  check('点击卡片跳商品详情', navs.indexOf('/pages/item/detail?id=1001') > -1, navs);

  p.onUnload();
  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
