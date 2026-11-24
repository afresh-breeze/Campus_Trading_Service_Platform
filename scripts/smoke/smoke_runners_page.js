/**
 * 找跑腿匹配页冒烟测试（临时脚本，stub 掉 Page/wx/getApp/request）
 * 运行：node smoke_runners_page.js   （cwd 必须在仓库根）
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

require(path.join(MP, 'pages/errand/runners.js'));

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
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
const ev = (v) => ({ detail: { value: v } });

function runner(id, extra) {
  return Object.assign(
    {
      userId: id,
      nickname: '跑腿小李',
      avatarUrl: '',
      creditScore: 96,
      completedCount: 32,
      serviceAreas: ['桃园', '北区教学区'],
      servicePlaces: ['桃园', '第16教学楼'],
      availabilityType: 'now',
      isOnline: true,
      timeSlots: [],
      itemSizes: ['small', 'medium'],
      basePrice: 3,
      remark: '中午和晚上都在北区'
    },
    extra || {}
  );
}

(async () => {
  console.log('[1] onLoad：URL 参数回填');
  const p = makePage();
  p.onLoad({ orderId: '3002', area: '桃园', place: '桃园', timeType: 'asap', itemSize: 'small' });
  check('orderId 解析', p.data.orderId === 3002, p.data.orderId);
  check('片区回填桃园', p.data.area === '桃园', p.data.area);
  check('片区名即地标不回填为具体地标', p.data.place === '', p.data.place);
  check('展示文案 = 桃园', p.data.placeText === '桃园', p.data.placeText);
  check('timeType 回填 asap', p.data.timeOptions[p.data.timeIndex].value === 'asap');
  check('itemSize 回填 small', p.data.sizePick[p.data.sizeIndex].value === 'small');
  check('orderId 触发详情摘要请求', calls[0].url === '/api/errands/3002', calls[0]);

  console.log('[2] onShow：拉取跑腿列表');
  p.onShow();
  const runnersCall = calls[1];
  check('GET /api/runners', runnersCall.url === '/api/runners', runnersCall);
  check('area=桃园', runnersCall.query.area === '桃园');
  check('place 省略时按片区名', runnersCall.query.place === '桃园', runnersCall.query.place);
  check('itemSize=small 透传', runnersCall.query.itemSize === 'small');
  check('asap 不带时间参数', runnersCall.query.timeStart === undefined && runnersCall.query.deadline === undefined, runnersCall.query);

  flushNext(true, {
    // 详情摘要
    orderId: 3002,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '李园 3 栋',
    reward: 3.5,
    timeType: 'asap',
    status: 'pending',
    visibility: 'private',
    canPublish: true
  });
  // 注意：详情摘要在 onLoad 里发起，是第一个 pending；列表请求是第二个
  // 上面 flush 顺序错了也没关系——这里按实际队列再放行
  flushNext(true, {
    list: [runner(8), runner(9, { isOnline: false, availabilityType: 'slot', serviceAreas: ['桃园'], basePrice: 0 })],
    total: 2,
    page: 1,
    pageSize: 10
  });
  await tick();
  await tick();

  console.log('[3] 摘要与卡片派生');
  check('摘要显示私单', p.data.orderLoaded === true && p.data.order.visibility === 'private', p.data.orderLoaded);
  check('路线文案', p.data.routeText === '桃园 → 李园 3 栋', p.data.routeText);
  check('canPublish 透出', p.data.canPublish === true);
  check('卡片数 2', p.data.list.length === 2, p.data.list.length);
  const c0 = p.data.list[0];
  check('在线状态=在线', c0.onlineText === '在线', c0.onlineText);
  check('随时接单文案', c0.availText === '随时接单', c0.availText);
  check('起步价格式化', c0.priceText === '3.00', c0.priceText);
  check('信用/完成文案', c0.creditText === '信用 96' && c0.doneText === '完成 32 单', c0);
  check('规格标签 2 个', c0.sizeTexts.length === 2, c0.sizeTexts);
  const c1 = p.data.list[1];
  check('离线状态', c1.onlineText === '离线', c1.onlineText);
  check('basePrice=0 → 面议', c1.priceText === '面议', c1.priceText);
  check('按计划上线文案', c1.availText === '按计划上线', c1.availText);

  console.log('[4] buildQuery 本地预检（文案与后端一致）');
  const p2 = makePage();
  p2.onLoad({});
  p2.onTimeChange(ev('deadline')); // deadline
  let built = p2.buildQuery(1);
  check('deadline 缺截止 → 时间参数不完整', built.error === '时间参数不完整', built);
  p2.onDeadlineDateChange(ev('2026-11-20'));
  p2.onDeadlineTimeChange(ev('18:00'));
  built = p2.buildQuery(1);
  check('deadline 补齐后带 deadline', !!built.query && built.query.deadline === '2026-11-20 18:00:00', built);
  p2.onTimeChange(ev('range')); // range
  built = p2.buildQuery(1);
  check('range 缺开始 → 时间参数不完整', built.error === '时间参数不完整', built);
  p2.onStartDateChange(ev('2026-11-20'));
  p2.onStartTimeChange(ev('19:00')); // start > deadline
  built = p2.buildQuery(1);
  check('start>=deadline → 时间参数不完整', built.error === '时间参数不完整', built);
  p2.onStartTimeChange(ev('09:00'));
  built = p2.buildQuery(1);
  check(
    'range 合法 → timeStart/deadline 都带',
    !!built.query && built.query.timeStart === '2026-11-20 09:00:00' && built.query.deadline === '2026-11-20 18:00:00',
    built
  );
  p2.onSizeChange(ev('0'));
  built = p2.buildQuery(1);
  check('规格不限 → 不带 itemSize', built.query.itemSize === undefined, built.query);

  console.log('[5] 取件地点弹层确认（place-picker）');
  const p3 = makePage();
  p3.onLoad({});
  // 有下级地标的片区：place 可不选 = 全片区（后端 place=area 语义）
  p3.onPlaceConfirm({ detail: { zone: '北区教学区', place: '' } });
  check('教学区全区确认', p3.data.area === '北区教学区' && p3.data.place === '', p3.data);
  check('全区展示文案', p3.data.placeText === '北区教学区 · 全区', p3.data.placeText);
  let q = p3.buildQuery(1);
  check('place 落为片区名', q.query.place === '北区教学区', q.query);
  // 选具体地标
  p3.onPlaceConfirm({ detail: { zone: '北区教学区', place: '第25教学楼' } });
  check('选楼回填', p3.data.place === '第25教学楼', p3.data.place);
  check('选楼展示文案', p3.data.placeText === '北区教学区 · 第25教学楼', p3.data.placeText);
  q = p3.buildQuery(1);
  check('place=该地标', q.query.place === '第25教学楼', q.query);
  // 无地标片区
  p3.onPlaceConfirm({ detail: { zone: '桃园', place: '' } });
  check('无地标片区回桃园', p3.data.area === '桃园' && p3.data.placeText === '桃园', p3.data.placeText);

  console.log('[6] 重新匹配与加载更多');
  calls.length = 0;
  p.onRequery();
  await tick();
  check('重新匹配回第一页', calls[0].query.page === 1, calls[0].query);
  flushNext(true, {
    list: [],
    total: 0,
    page: 1,
    pageSize: 10
  });
  // 第一个 pending 是详情摘要（onLoad 已放行过），这里应直接是 runners
  // 兜底：若队列头是别的请求则继续放行
  while (calls.length && pending.length) {
    flushNext(true, { list: [runner(8)], total: 12, page: 1, pageSize: 10 });
    break;
  }
  await tick();
  await tick();
  // 分页：直接构造数据验证 hasMore 逻辑
  p.setData({ list: [runner(8)], total: 12, page: 1, hasMore: true, firstLoading: false });
  p.fetch(2);
  await tick();
  const page2 = calls.filter((c) => c.query && c.query.page === 2)[0];
  check('第二页 page=2', !!page2, calls.map((c) => c.query && c.query.page));
  flushNext(true, {
    list: [runner(9)],
    total: 2,
    page: 2,
    pageSize: 10
  });
  await tick();
  await tick();
  check('追加后 hasMore=false', p.data.hasMore === false, p.data);

  console.log('[7] 联系 TA');
  navs.length = 0;
  p.onContact({ currentTarget: { dataset: { userId: 8 } } });
  await tick();
  check(
    '跳聊天页带 peerId/bizType/bizId=3002',
    navs.some((u) => u.indexOf('/pages/chat/detail?peerId=8&bizType=errand&bizId=3002') === 0),
    navs
  );
  const p5 = makePage();
  p5.onLoad({});
  p5.onShow();
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 10 }); // runners 空响应
  await tick();
  toasts.length = 0;
  p5.onContact({ currentTarget: { dataset: { userId: 8 } } });
  await tick();
  check('无 orderId → 提示先建私单', toasts.indexOf('请先从发布页创建私单，再联系跑腿') > -1, toasts);

  console.log('[8] 发布到大厅（canPublish 门闸）');
  const p6 = makePage();
  p6.onLoad({ orderId: '3002' });
  p6.onShow();
  // pending: [详情, runners]
  flushNext(true, {
    orderId: 3002,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '李园 3 栋',
    reward: 3.5,
    timeType: 'asap',
    status: 'pending',
    visibility: 'hall', // 已是大厅单
    canPublish: false
  });
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 10 });
  await tick();
  await tick();
  calls.length = 0;
  toasts.length = 0;
  p6.onPublishHall();
  await tick();
  check('canPublish=false 不发请求', calls.filter((c) => c.method === 'POST').length === 0, calls);
  check('提示不能发布', toasts.indexOf('当前订单状态不能发布到大厅') > -1, toasts);

  const p7 = makePage();
  p7.onLoad({ orderId: '3002' });
  p7.onShow();
  flushNext(true, {
    orderId: 3002,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '李园 3 栋',
    reward: 3.5,
    timeType: 'asap',
    status: 'pending',
    visibility: 'private',
    canPublish: true
  });
  flushNext(true, { list: [], total: 0, page: 1, pageSize: 10 });
  await tick();
  await tick();
  calls.length = 0;
  p7.onPublishHall();
  await tick();
  const pub = calls.filter((c) => c.method === 'POST')[0];
  check('POST publish 接口', !!pub && pub.url === '/api/errands/3002/publish', pub && pub.url);
  flushNext(true, { orderId: 3002, visibility: 'hall' });
  await tick(700);
  check('发布成功跳详情', navs.some((u) => u === '/pages/errand/detail?id=3002'), navs);

  console.log('[9] 首屏失败透出后端文案');
  const p8 = makePage();
  p8.onLoad({});
  p8.onShow();
  flushNext(false, { code: 400, message: '时间参数不完整' });
  await tick();
  check('错误态文案=后端 message', p8.data.error === '时间参数不完整', p8.data.error);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});

/** 局部辅助：直接用 campus 工具查地标（避免依赖页面内部） */
function campusPlaces(zone) {
  const campus = require(path.join(MP, 'utils/campus'));
  return campus.placesOfZone(zone) || [];
}
