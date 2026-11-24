/**
 * 大厅页冒烟测试（临时脚本，stub 掉 Page/wx/getApp/request）
 * 运行：node smoke_hall.js   （cwd 必须在仓库根）
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

// ---- 拦截 utils/request.js，换成可控的 fakeGet ----
let pending = []; // 未放行的请求队列（FIFO）
const calls = [];
const fakeRequest = {
  get(url, query) {
    calls.push({ url, query });
    return new Promise((resolve, reject) => {
      pending.push({ resolve, reject, query });
    });
  }
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/utils[\\/]request$/.test(request) || /utils[\\/]request\.js$/.test(request)) {
    return fakeRequest;
  }
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
const toasts = [];
let menuRect = { top: 48, height: 32, bottom: 80 }; // 可变，测试齐平/兜底两条路径
global.wx = {
  navigateTo: (o) => navs.push(o.url),
  stopPullDownRefresh: () => {},
  showToast: (o) => toasts.push(o.title),
  hideToast: () => {},
  getMenuButtonBoundingClientRect: () => menuRect
};

require(path.join(MP, 'pages/errand/hall.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.setData = function (patch) {
    Object.keys(patch).forEach((k) => {
      if (k.indexOf('.') > -1) {
        const parts = k.split('.');
        let cur = this.data;
        for (let i = 0; i < parts.length - 1; i += 1) cur = cur[parts[i]];
        cur[parts[parts.length - 1]] = patch[k];
      } else {
        this.data[k] = patch[k];
      }
    });
  };
  inst.getTabBar = () => null;
  return inst;
}

/** 放行最早一个挂起请求 */
function flushNext(ok, payload) {
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload);
  else p.reject(payload);
}

/** 等两轮微任务，让 then/catch 跑完 */
const tick = () => new Promise((r) => setTimeout(r, 0));

function order(id, extra) {
  return Object.assign(
    {
      orderId: id,
      pickupArea: '桃园',
      pickupPlace: '菜鸟驿站',
      deliveryLocation: '李园 3 栋',
      itemSize: 'small',
      timeType: 'asap',
      reward: 5,
      itemDesc: '一个快递',
      publisherNickname: '小明',
      publisherAvatar: '/uploads/a.png',
      createdAt: new Date(Date.now() - 60 * 1000).toISOString()
    },
    extra || {}
  );
}

(async () => {
  console.log('[1] buildQuery：默认不带筛选参数');
  const p0 = makePage();
  const q0 = p0.buildQuery(1);
  check('status=pending', q0.status === 'pending', q0);
  check('pageSize=10', q0.pageSize === 10, q0);
  check(
    '默认只带 page/pageSize/sort/status',
    JSON.stringify(Object.keys(q0).sort()) === JSON.stringify(['page', 'pageSize', 'sort', 'status']),
    Object.keys(q0)
  );
  check('default sort=latest', q0.sort === 'latest', q0.sort);

  const p0b = makePage();
  p0b.data.filters = { area: '桃园', itemSize: 'small', timeType: 'asap', sort: 'reward_desc' };
  const q0b = p0b.buildQuery(2);
  check('筛选参数透传 area', q0b.area === '桃园', q0b);
  check('筛选参数透传 itemSize', q0b.itemSize === 'small');
  check('筛选参数透传 timeType', q0b.timeType === 'asap');
  check('筛选参数透传 sort', q0b.sort === 'reward_desc');
  check('筛选翻页 page=2', q0b.page === 2);

  console.log('\n[2] 未登录');
  appState.login = false;
  const pg = makePage();
  await pg.refresh();
  check('未登录 isLogin=false', pg.data.isLogin === false);
  check('未登录不发请求', calls.length === 0);
  check('未登录不显示骨架', pg.data.firstLoading === false);
  appState.login = true;

  console.log('\n[3] 首屏成功');
  calls.length = 0;
  const p1 = makePage();
  const p1p = p1.refresh();
  check('刷新中 refreshing=true', p1.data.refreshing === true);
  check('首屏骨架 firstLoading=true', p1.data.firstLoading === true);
  flushNext(true, {
    list: [order(1), order(2, { timeType: 'deadline', deadline: '2026-11-12T18:00:00' })],
    total: 5
  });
  await p1p;
  check('列表 2 条', p1.data.list.length === 2, p1.data.list.length);
  check('total=5', p1.data.total === 5);
  check('hasMore=true', p1.data.hasMore === true);
  check('refreshing 复位', p1.data.refreshing === false);
  check('firstLoading 复位', p1.data.firstLoading === false);
  check('卡片 itemDesc', p1.data.list[0].itemDesc === '一个快递', p1.data.list[0]);
  check('卡片 publisherInitial', p1.data.list[0].publisherInitial === '小');
  check(
    '卡片 publisherAvatarUrl 已拼全域名',
    String(p1.data.list[0].publisherAvatarUrl).indexOf('/uploads/a.png') > 0,
    p1.data.list[0].publisherAvatarUrl
  );
  check('卡片 rewardText 两位小数', p1.data.list[0].rewardText === '5.00', p1.data.list[0].rewardText);
  check('asap → 尽快', p1.data.list[0].timeText === '尽快', p1.data.list[0].timeText);
  check('deadline → xx 前', /前$/.test(p1.data.list[1].timeText), p1.data.list[1].timeText);
  check('无 remark 字段泄漏', p1.data.list[0].remark === undefined);

  console.log('\n[4] 翻页去重 + hasMore');
  p1.onReachBottom();
  check('触发第 2 页请求', calls.length === 2, calls.length);
  check('第 2 页 page=2', calls[1].query.page === 2);
  flushNext(true, { list: [order(2), order(3)], total: 5 }); // order(2) 与已有重复
  await tick();
  check('去重后共 3 条', p1.data.list.length === 3, p1.data.list.length);
  check('page=2', p1.data.page === 2);
  check('hasMore=true（3<5）', p1.data.hasMore === true);

  p1.onReachBottom();
  flushNext(true, { list: [order(4), order(5)], total: 5 });
  await tick();
  check('满页后 5 条', p1.data.list.length === 5, p1.data.list.length);
  check('hasMore=false（5=5）', p1.data.hasMore === false);
  const before = calls.length;
  p1.onReachBottom();
  check('hasMore=false 不再请求', calls.length === before);

  console.log('\n[5] 并发竞态：旧响应整包丢弃');
  const p2 = makePage();
  const r1 = p2.fetch(1); // seq=1（旧）
  const r2 = p2.fetch(1); // seq=2（新）
  flushNext(true, { list: [order(91)], total: 1 }); // 旧响应后到
  await tick();
  check('旧响应不写入列表', p2.data.list.length === 0, p2.data.list.length);
  flushNext(true, { list: [order(92)], total: 1 });
  await Promise.all([r1, r2]);
  check(
    '新响应写入列表',
    p2.data.list.length === 1 && p2.data.list[0].orderId === 92,
    p2.data.list.map((x) => x.orderId)
  );

  console.log('\n[6] 刷新期间禁止 load-more');
  const p3 = makePage();
  const r3 = p3.refresh();
  check('refreshing=true', p3.data.refreshing === true);
  const n0 = calls.length;
  p3.onReachBottom();
  check('刷新中 onReachBottom 不请求', calls.length === n0, calls.length);
  flushNext(true, { list: [order(1)], total: 1 });
  await r3;

  console.log('\n[7] 错误分支');
  const p4 = makePage();
  const r4 = p4.refresh();
  flushNext(false, { code: -1, message: '无法连接后端' });
  await r4;
  check('首屏失败整页错误', p4.data.error === '无法连接后端', p4.data.error);
  check('首屏失败骨架关闭', p4.data.firstLoading === false);

  const p5 = makePage();
  const r5 = p5.refresh();
  flushNext(true, { list: [order(1), order(2)], total: 5 });
  await r5;
  p5.onReachBottom();
  flushNext(false, { code: -1, message: '翻页失败' });
  await tick();
  check('翻页失败保留列表', p5.data.list.length === 2, p5.data.list.length);
  check('翻页失败不设整页错误', p5.data.error === '', p5.data.error);
  check('翻页失败 loadingMore 复位', p5.data.loadingMore === false);

  const p6 = makePage();
  p6.data.firstLoading = true;
  p6.onRetry();
  check('onRetry 重新拉第一页', calls[calls.length - 1].query.page === 1);
  flushNext(true, { list: [], total: 0 });
  await tick();
  check('空列表 hasMore=false', p6.data.hasMore === false);

  console.log('\n[8] 跳转');
  navs.length = 0;
  const p7 = makePage();
  p7.onTapOrder({ currentTarget: { dataset: { id: 2001 } } });
  check('点卡片进详情', navs[0] === '/pages/errand/detail?id=2001', navs);
  p7.onTapOrder({ currentTarget: { dataset: {} } });
  check('无 id 不跳转', navs.length === 1);
  appState.login = false;
  p7.onPublish();
  check('未登录发布 → 不跳转', navs.length === 1);
  p7.onGoRunner();
  check('未登录上线 → 不跳转', navs.length === 1);
  p7.onLogin();
  check('未登录点登录不崩', true);
  appState.login = true;
  p7.onPublish();
  check('已登录发布 → 发布页', navs[navs.length - 1] === '/pages/errand/publish', navs);
  p7.onGoRunner();
  check('上线设置 → runner?mode=online', navs[navs.length - 1] === '/pages/mine/runner?mode=online', navs);

  console.log('\n[9] 筛选/排序（11-15 用户反馈第 1/8 条）');
  const p8 = makePage();
  calls.length = 0;
  p8.onFilterTap({ currentTarget: { dataset: { type: 'itemSize', value: 'small' } } });
  check('规格筛选写入 query', calls[calls.length - 1].query.itemSize === 'small', calls[calls.length - 1].query);
  check('列表被清空走首屏骨架', p8.data.list.length === 0 && p8.data.firstLoading === true);
  flushNext(true, { list: [order(1, {})], total: 1 });
  await tick();
  p8.onSortReward();
  check('报酬排序 reward_desc', calls[calls.length - 1].query.sort === 'reward_desc', calls[calls.length - 1].query);
  flushNext(true, { list: [order(1, {})], total: 1 });
  await tick();
  p8.onSortReward();
  check('再点切 reward_asc', calls[calls.length - 1].query.sort === 'reward_asc', calls[calls.length - 1].query);
  flushNext(true, { list: [order(1, {})], total: 1 });
  await tick();
  p8.onSortLatest();
  check('回最新排序', calls[calls.length - 1].query.sort === 'latest', calls[calls.length - 1].query);
  flushNext(true, { list: [order(1, {})], total: 1 });
  await tick();
  p8.onFilterTap({ currentTarget: { dataset: { type: 'timeType', value: 'asap' } } });
  check('时间筛选 timeType=asap', calls[calls.length - 1].query.timeType === 'asap', calls[calls.length - 1].query);
  flushNext(true, { list: [order(1, {})], total: 1 });
  await tick();
  p8.onFilterTap({ currentTarget: { dataset: { type: 'itemSize', value: 'small' } } });
  check('重复点同一筛选不发请求', calls[calls.length - 1].query.timeType === 'asap' && calls[calls.length - 1].query.page === 1);

  console.log('\n[10] 品类缩略图派生（toCard 内的 guessCategory）');
  const p9 = makePage();
  calls.length = 0;
  p9.fetch(1);
  flushNext(true, {
    list: [
      order(1, { itemDesc: '帮我带一份外卖' }),
      order(2, { itemDesc: '', remark: '菜鸟驿站取件' }),
      order(3, { itemDesc: '打印资料' }),
      order(4, { itemDesc: '帮拿药' }),
      order(5, { itemDesc: '' })
    ],
    total: 5
  });
  await tick();
  check('外卖→food', p9.data.list[0].categoryIcon === '/assets/errand/food.png', p9.data.list[0].categoryIcon);
  check('驿站取件→express', p9.data.list[1].categoryIcon === '/assets/errand/express.png', p9.data.list[1].categoryIcon);
  check('打印资料→doc', p9.data.list[2].categoryIcon === '/assets/errand/doc.png', p9.data.list[2].categoryIcon);
  check('帮拿药→daily', p9.data.list[3].categoryIcon === '/assets/errand/daily.png', p9.data.list[3].categoryIcon);
  check('空描述→other 兜底', p9.data.list[4].categoryIcon === '/assets/errand/other.png', p9.data.list[4].categoryIcon);

  console.log('\n[11] 标题与胶囊齐平、滚动全程冻结（无任何动画）');
  const p10 = makePage();
  p10.onLoad();
  check('占位 = 胶囊顶部 y（标题与胶囊齐平）', p10.data.stickyTop === menuRect.top, p10.data.stickyTop);
  check('标题行高 = 胶囊高度（完全同排）', p10.data.barHead === menuRect.height, p10.data.barHead);
  check('不再有 compact 缩小状态', p10.data.compact === undefined, p10.data.compact);
  check('不再有 onPageScroll 滚动监听', p10.onPageScroll === undefined, typeof p10.onPageScroll);
  check('不再有顶栏/哨兵状态残留', p10.data.stuck === undefined && p10.data.headHidden === undefined, {
    stuck: p10.data.stuck,
    headHidden: p10.data.headHidden
  });
  menuRect = null; // 胶囊 API 不可用时走兜底
  const p10b = makePage();
  p10b.onLoad();
  check('胶囊读取失败 → 兜底占位 24/行高 32', p10b.data.stickyTop === 24 && p10b.data.barHead === 32, {
    stickyTop: p10b.data.stickyTop,
    barHead: p10b.data.barHead
  });

  console.log('\n[12] 卡片视觉层级（11-25：主/次/辅三档）');
  const fs = require('fs');
  const wxml = fs.readFileSync(path.join(MP, 'pages/errand/hall.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(MP, 'pages/errand/hall.wxss'), 'utf8');
  check('起终点用不同的层级 class', /order__place--from/.test(wxml) && /order__place--to/.test(wxml), 'wxml 未分层');
  check('主级（取件地点）36rpx/700', /\.order__place--from\s*\{[\s\S]*?font-size: 36rpx[\s\S]*?font-weight: 700/.test(wxss), '主级样式不符');
  check('次级（送达地点）26rpx/400 且用 text-2', /\.order__place--to\s*\{[\s\S]*?font-size: 26rpx[\s\S]*?color: var\(--color-text-2\)/.test(wxss), '次级样式不符');
  check('报酬去掉「报酬」二字', !/order__reward-label/.test(wxml), 'wxml 仍渲染报酬标签');
  check('报酬样式不再残留 label 规则', !/\.order__reward-label/.test(wxss), 'wxss 仍有死规则');
  check('报酬 40rpx/700', /\.order__price\s*\{[\s\S]*?font-size: 40rpx[\s\S]*?font-weight: 700/.test(wxss), '报酬字号不符');
  check('规格与时间都压成中性灰胶囊', /tag tag-gray order__tag/.test(wxml) && !/tag-warning order__tag/.test(wxml), '时间胶囊仍用 warning 色');
  check('物品描述 26rpx + 左引线', /\.order__desc\s*\{[\s\S]*?border-left: 2rpx solid var\(--color-border\)[\s\S]*?font-size: 26rpx/.test(wxss), '描述样式不符');
  check('按压反馈仍是整卡 scale 0.985（未被层级改动破坏）', /\.order--hover\s*\{[\s\S]*?scale\(0\.985\)/.test(wxss), '按压口径丢失');

  console.log('\n[13] 取件地点短文案：优先地标（11-25 用户反馈）');
  const campusUtil = require(path.join(MP, 'utils/campus.js'));
  const p11 = makePage();
  calls.length = 0;
  p11.fetch(1);
  flushNext(true, {
    list: [
      order(1, { pickupArea: '南区教学区', pickupPlace: '第30教学楼' }),
      order(2, { pickupArea: '桃园', pickupPlace: '桃园' }),
      order(3, { pickupArea: '北区教学区', pickupPlace: '不在白名单的旧地标' })
    ],
    total: 3
  });
  await tick();
  check('选了地标 → 只出地标不带片区前缀', p11.data.list[0].fromText === '第30教学楼', p11.data.list[0].fromText);
  check('无地标片区 → 退回片区名', p11.data.list[1].fromText === '桃园', p11.data.list[1].fromText);
  check('历史脏数据（地标不在白名单）也能显示', p11.data.list[2].fromText === '不在白名单的旧地标', p11.data.list[2].fromText);
  check('shortPlace：地标优先', campusUtil.shortPlace('北区教学区', '第30教学楼') === '第30教学楼');
  check('shortPlace：place=片区名 → 片区名', campusUtil.shortPlace('桃园', '桃园') === '桃园');
  check('shortPlace：空值兜底', campusUtil.shortPlace('', '') === '');
  check('52 个地标全校无重名（单独展示不歧义的前提）', (() => {
    const seen = {};
    let dup = false;
    campusUtil.LANDMARKS.forEach((l) => {
      if (seen[l.name] && seen[l.name] !== l.zone) dup = true;
      seen[l.name] = l.zone;
    });
    return campusUtil.LANDMARKS.length === 52 && !dup;
  })());

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('脚本异常：', e && e.stack);
  process.exit(1);
});
