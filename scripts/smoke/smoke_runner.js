/**
 * 接单设置/上线页冒烟测试（stub Page/wx/getApp/request，直跑页面逻辑）
 * 运行：node smoke_runner.js   （cwd 必须在仓库根）
 */
const path = require('path');
const Module = require('module');

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
let responses = {};
const fakeRequest = {
  get(url, data) {
    calls.push({ method: 'GET', url, data });
    return new Promise((resolve, reject) => {
      const v = responses['GET ' + url] || responses['GET *'];
      setTimeout(() => (v && v.__fail ? reject(v) : resolve(v)), 0);
    });
  },
  post(url, data) {
    calls.push({ method: 'POST', url, data });
    return Promise.resolve({});
  },
  put(url, data) {
    calls.push({ method: 'PUT', url, data });
    const v = responses['PUT ' + url] || responses['PUT *'];
    return new Promise((resolve, reject) => {
      setTimeout(() => (v && v.__fail ? reject(v) : resolve(v)), 0);
    });
  }
};
const origLoad = Module._load;
Module._load = function (request) {
  if (/utils[\\/]request$/.test(request) || /utils[\\/]request\.js$/.test(request)) return fakeRequest;
  return origLoad.apply(this, arguments);
};

// ---- stub 全局 ----
let pageCfg = null;
global.Page = (cfg) => {
  pageCfg = cfg;
};
global.getApp = () => ({ isLogin: () => true, requireLogin: () => {} });
global.getCurrentPages = () => [{}, {}];
let navBacks = 0;
let actionSheet = null; // 模拟用户点的项
global.wx = {
  navigateBack: () => {
    navBacks += 1;
  },
  switchTab: () => {},
  showToast: () => {},
  showModal: (o) => {
    if (o && o.success) o.success({ confirm: true });
  },
  showActionSheet: (o) => {
    if (actionSheet !== null && o.success) o.success({ tapIndex: actionSheet });
  },
  setClipboardData: () => {}
};

require(path.join(process.cwd(), 'miniprogram/pages/mine/runner.js'));

function makePage(mode) {
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
  inst.onLoad(mode ? { mode: mode } : {});
  return inst;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 20));
const ev = (value) => ({ detail: { value: value } });
function tomorrow() {
  const d = new Date(Date.now() + 86400000);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
/** 今天 + n 天（n 可为 0） */
function dayFromNow(n) {
  const d = new Date(Date.now() + n * 86400000);
  const p = (num) => (num < 10 ? '0' + num : '' + num);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function todayStr() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

(async () => {
  console.log('[1] 双模式初始化 + 默认档案');
  responses = { 'GET /api/users/me/runner-profile': null };
  const p = makePage();
  check('无参模式 = 接单设置', p.data.mode === '' && p.data.pageTitle === '接单设置');
  await p.onShow();
  await wait();
  check('默认档案回填', p.data.isOnline === false && p.data.availabilityType === 'slot');
  const zoneTotal = p.data.zoneGroups.reduce((n, g) => n + g.zones.length, 0);
  check('25 片区按分类分组', p.data.zoneGroups.length === 7 && zoneTotal === 25, {
    groups: p.data.zoneGroups.length,
    zones: zoneTotal
  });
  check('默认状态条 = 已下线', p.data.statusText === '已下线', p.data.statusText);

  const pOnline = makePage('online');
  check('mode=online 标题/入口', pOnline.data.mode === 'online' && pOnline.data.pageTitle === '上线接单');

  console.log('\n[2] 片区/地标联动');
  p.onAreasChange(ev(['桃园', '北区教学区']));
  check('片区勾选生效', JSON.stringify(p.data.serviceAreas) === '["桃园","北区教学区"]', p.data.serviceAreas);
  check('地标面板只出现已选片区', JSON.stringify(p.data.placeGroups.map((g) => g.zone)) === '["北区教学区"]', p.data.placeGroups.map((g) => g.zone));
  // 预置一个李园地标再取消李园片区：联动必须把它清掉
  p.setData({ servicePlaces: ['第1教学楼', '李园'] });
  p.onAreasChange(ev(['北区教学区']));
  check('取消片区后其地标被清掉', JSON.stringify(p.data.servicePlaces) === '["第1教学楼"]', p.data.servicePlaces);
  p.onAreasChange(ev(['桃园', '北区教学区']));
  p.onPlacesChange(ev(['第1教学楼', '第2教学楼']));
  check('地标多选生效', JSON.stringify(p.data.servicePlaces) === '["第1教学楼","第2教学楼"]', p.data.servicePlaces);
  p.onSizesChange(ev(['small', 'medium']));
  check('规格多选生效', JSON.stringify(p.data.itemSizes) === '["small","medium"]', p.data.itemSizes);

  console.log('\n[2.1] 可接范围搜索（11-16 乱码修复：searchLandmarks 返回对象非字符串）');
  p.setData({ servicePlaces: ['第1教学楼'], areaKw: '' });
  p.onAreaSearch({ detail: { value: '教' } });
  const rs = p.data.areaResults;
  check('结果 name 是字符串（不再 [object Object]）', rs.length > 0 && typeof rs[0].name === 'string', rs.slice(0, 2));
  check('结果带所属片区', !!rs[0].zone, rs[0]);
  check('已选地标显示勾选态', rs.some((r) => r.name === '第1教学楼' && r.checked === true), rs.filter((r) => r.checked));
  // 点结果切换：勾一个未选的（第2教学楼），片区已在列表里不会重复加
  p.onSearchPlaceTap({ currentTarget: { dataset: { name: '第2教学楼' } } });
  check('点结果勾选地标', p.data.servicePlaces.indexOf('第2教学楼') > -1, p.data.servicePlaces);
  p.onSearchPlaceTap({ currentTarget: { dataset: { name: '第2教学楼' } } });
  check('再点取消勾选', p.data.servicePlaces.indexOf('第2教学楼') < 0, p.data.servicePlaces);
  // 片区未勾时点结果连带勾上（搜真实地标关键字；「桃园」是片区无下级地标，searchLandmarks 搜不到属正常）
  p.onAreaSearch({ detail: { value: '图书馆' } });
  const tao = p.data.areaResults[0];
  check('「图书馆」有可搜地标', !!tao && !!tao.zone, p.data.areaResults);
  if (tao) {
    p.onSearchPlaceTap({ currentTarget: { dataset: { name: tao.name } } });
    check('未勾片区时连带勾上片区', p.data.serviceAreas.indexOf(tao.zone) > -1 && p.data.servicePlaces.indexOf(tao.name) > -1, {
      areas: p.data.serviceAreas,
      places: p.data.servicePlaces
    });
  }

  console.log('\n[3] 计划增删改（11-16：once 改为自定义起止日期区间）');
  p.onSlotTypeChange(ev('once'));
  p.onSlotDateChange(ev(tomorrow()));
  p.onSlotToDateChange(ev(tomorrow()));
  p.onSlotStartChange(ev('09:00'));
  p.onSlotEndChange(ev('12:00'));
  p.onAddSlot();
  check('单日区间计划已添加', p.data.timeSlots.length === 1 && p.data.timeSlots[0].status === 'future', p.data.timeSlots);
  check('once 文案含日期与时段', /至| /.test(p.data.timeSlots[0].text) && p.data.timeSlots[0].text.indexOf('09:00-12:00') > -1, p.data.timeSlots[0].text);
  // 起止倒置
  p.onSlotStartChange(ev('15:00'));
  p.onSlotEndChange(ev('14:00'));
  p.onAddSlot();
  check('起止倒置被拦', p.data.timeSlots.length === 1 && p.data.errors.timeSlots === '结束时间必须晚于开始时间', p.data.errors);
  // 重叠（添加成功后表单会清空，需重选日期）
  p.onSlotStartChange(ev('10:00'));
  p.onSlotEndChange(ev('11:00'));
  p.onSlotDateChange(ev(tomorrow()));
  p.onSlotToDateChange(ev(tomorrow()));
  p.onAddSlot();
  check('与已有计划重叠被拦', p.data.timeSlots.length === 1 && p.data.errors.timeSlots === '在线计划格式错误', p.data.errors);
  // weekly 计划
  p.onSlotTypeChange(ev('weekly'));
  p.onWeekdayChange(ev(['1', '3']));
  p.onSlotStartChange(ev('18:00'));
  p.onSlotEndChange(ev('22:00'));
  p.onAddSlot();
  check('weekly 计划已添加且星期升序', p.data.timeSlots.length === 2 && JSON.stringify(p.data.timeSlots[1].weekdays) === '[1,3]', p.data.timeSlots);
  check('weekly 文案', p.data.timeSlots[1].text.indexOf('每周一') > -1 && p.data.timeSlots[1].text.indexOf('18:00-22:00') > -1, p.data.timeSlots[1].text);
  // 编辑 future 计划
  p.onEditSlot({ currentTarget: { dataset: { id: p.data.timeSlots[0].id } } });
  check('编辑回填表单', p.data.editingId === p.data.timeSlots[0].id && p.data.slotStart === '09:00', p.data.editingId);
  p.onSlotEndChange(ev('13:00'));
  p.onAddSlot();
  check('编辑保存覆盖原计划', p.data.timeSlots[0].end === '13:00' && p.data.editingId === '', p.data.timeSlots[0]);
  // 删除
  const delId = p.data.timeSlots[0].id;
  p.onDeleteSlot({ currentTarget: { dataset: { id: delId } } });
  await wait(10);
  check('删除计划生效', p.data.timeSlots.length === 1 && p.data.timeSlots[0].id !== delId, p.data.timeSlots.map((s) => s.id));

  console.log('\n[3.1] 自定义区间按天拆分（11-16 反馈第 5 条）');
  p.onSlotTypeChange(ev('once'));
  p.onSlotDateChange(ev(dayFromNow(10)));
  p.onSlotToDateChange(ev(dayFromNow(12)));
  p.onSlotStartChange(ev('08:00'));
  p.onSlotEndChange(ev('09:00'));
  p.onAddSlot();
  check('3 天区间拆成 3 条逐日计划', p.data.timeSlots.length === 4, p.data.timeSlots.length);
  check('区间首日正确', p.data.timeSlots[1].date === dayFromNow(10) && p.data.timeSlots[1].start === '08:00', p.data.timeSlots[1]);
  check('区间末日正确', p.data.timeSlots[3].date === dayFromNow(12), p.data.timeSlots[3]);
  // 超长区间被拦
  p.onSlotDateChange(ev(dayFromNow(1)));
  p.onSlotToDateChange(ev(dayFromNow(40)));
  p.onAddSlot();
  check('超 31 天区间被拦', p.data.errors.timeSlots.indexOf('最长') > -1, p.data.errors);
  // 区间中某天与既有计划重叠 → 整批拦下
  p.onSlotToDateChange(ev(dayFromNow(11)));
  p.onSlotStartChange(ev('08:30'));
  p.onSlotEndChange(ev('08:40'));
  p.onAddSlot(); // dayFromNow(10) 08:30-08:40 撞上已有的 08:00-09:00
  check('区间撞已有计划整批拦下', p.data.timeSlots.length === 4, p.data.timeSlots.length);

  console.log('\n[4] validate');
  let errors = p.validate();
  check('全空校验通过（片区/规格/计划都已填）', Object.keys(errors).length === 0, errors);
  p.setData({ serviceAreas: [] });
  errors = p.validate();
  check('片区为空 → 服务片区至少选择一个', errors.serviceAreas === '服务片区至少选择一个', errors);
  p.setData({ serviceAreas: ['桃园'], itemSizes: [] });
  errors = p.validate();
  check('规格为空被拦', !!errors.itemSizes, errors);
  p.setData({ itemSizes: ['small'], availabilityType: 'slot', timeSlots: [] });
  errors = p.validate();
  check('slot 无未来计划被拦', errors.timeSlots === '按计划上线至少需要一条未来计划', errors);
  p.setData({ timeSlots: [{ id: 'x', type: 'once', date: tomorrow(), start: '09:00', end: '10:00', status: 'future', text: '', weekdays: [], from: '' }], basePrice: '101' });
  errors = p.validate();
  check('报价超 100 被拦', !!errors.basePrice, errors);
  p.setData({ basePrice: '50' });
  errors = p.validate();
  check('恢复后校验通过', Object.keys(errors).length === 0, errors);

  console.log('\n[5] buildPayload 结构');
  p.setData({ availabilityType: 'slot', timeSlots: [
    { id: 's1', type: 'once', date: tomorrow(), from: '', weekdays: [], start: '09:00', end: '10:00', status: 'future', text: '' },
    { id: 's2', type: 'weekly', date: '', from: '2026-11-01', weekdays: [3, 1], start: '18:00', end: '22:00', status: 'future', text: '' }
  ] });
  const payload = p.buildPayload();
  check('once 条目字段', JSON.stringify(Object.keys(payload.timeSlots[0]).sort()) === JSON.stringify(['date', 'end', 'id', 'start', 'type']), payload.timeSlots[0]);
  check('weekly weekdays 升序', JSON.stringify(payload.timeSlots[1].weekdays) === '[1,3]', payload.timeSlots[1]);
  check('basePrice 转数字', payload.basePrice === 50, payload.basePrice);
  check('availabilityType 透传', payload.availabilityType === 'slot', payload.availabilityType);

  console.log('\n[6] 保存（接单设置模式）');
  calls.length = 0;
  responses = { 'PUT /api/users/me/runner-profile': { userId: 1, isOnline: false, availabilityType: 'slot', serviceAreas: ['桃园'], servicePlaces: [], itemSizes: ['small'], timeSlots: payload.timeSlots, manualUntil: null, basePrice: 50, remark: '', completedCount: 0 } };
  p.onTapSave();
  await wait();
  const putProfile = calls.filter((c) => c.method === 'PUT' && c.url === '/api/users/me/runner-profile')[0];
  check('走 PUT runner-profile', !!putProfile, calls);
  check('设置模式不调上线接口', calls.filter((c) => c.url === '/api/users/me/online').length === 0, calls.map((c) => c.url));
  check('保存后状态条刷新', typeof p.data.statusText === 'string' && p.data.statusText.length > 0, p.data.statusText);

  console.log('\n[7] 保存并上线（online 模式，now 型）');
  const p2 = makePage('online');
  await p2.onShow();
  await wait();
  p2.onAreasChange(ev(['桃园']));
  p2.onSizesChange(ev(['small']));
  p2.onAvailChange(ev('now'));
  calls.length = 0;
  responses = {
    'PUT /api/users/me/runner-profile': { userId: 1, isOnline: false, availabilityType: 'now', serviceAreas: ['桃园'], servicePlaces: [], itemSizes: ['small'], timeSlots: [], manualUntil: null, basePrice: null, remark: '', completedCount: 0 },
    'PUT /api/users/me/online': { isOnline: true, availabilityType: 'now', manualUntil: null }
  };
  p2.onTapMainBottom();
  await wait(900); // 上线成功后 800ms 才 navigateBack
  const putP = calls.filter((c) => c.url === '/api/users/me/runner-profile')[0];
  const putO = calls.filter((c) => c.url === '/api/users/me/online')[0];
  check('先保存档案再上线', !!putP && !!putO, calls.map((c) => c.url));
  check('上线 body isOnline=true', putO.data.isOnline === true && putO.data.availabilityType === 'now', putO.data);
  check('上线后 navigateBack 回大厅', navBacks === 1, navBacks);
  check('上线后状态条在线', p2.data.isOnline === true && p2.data.statusText.indexOf('当前在线') === 0, p2.data.statusText);

  console.log('\n[8] 下线：进行中计划二选一');
  const p3 = makePage('online');
  await p3.onShow();
  await wait();
  const todayHH = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const t0 = pad(todayHH.getHours()) + ':' + pad(todayHH.getMinutes());
  p3.setData({
    availabilityType: 'slot',
    isOnline: true,
    timeSlots: [
      { id: 'active1', type: 'weekly', date: '', from: '2026-11-01', weekdays: [new Date().getDay() === 0 ? 7 : new Date().getDay()], start: '00:00', end: '23:59', status: 'active', text: '进行中' }
    ]
  });
  calls.length = 0;
  responses = { 'PUT /api/users/me/online': { isOnline: false, availabilityType: 'slot', manualUntil: null } };
  actionSheet = 0; // 只下线这一次
  p3.onTapOffline();
  await wait();
  const off1 = calls.filter((c) => c.url === '/api/users/me/online')[0];
  check('scope=once + scheduleId', off1 && off1.data.scope === 'once' && off1.data.scheduleId === 'active1', off1 && off1.data);
  actionSheet = 1; // 取消之后所有
  p3.onTapOffline();
  await wait();
  const off2 = calls.filter((c) => c.url === '/api/users/me/online')[1];
  check('scope=future + scheduleId', off2 && off2.data.scope === 'future', off2 && off2.data);
  // 无进行中计划：直接下线不带 scope
  p3.setData({ timeSlots: [], isOnline: true });
  calls.length = 0;
  p3.onTapOffline();
  await wait();
  const off3 = calls.filter((c) => c.url === '/api/users/me/online')[0];
  check('无进行中计划直接下线（不带 scope）', off3 && off3.data.scope === undefined && off3.data.isOnline === false, off3 && off3.data);

  console.log('\n[9] 状态条文案（与后端 effectiveOnline 同口径）');
  // statusTextOf 不在导出里，通过 applyProfile 间接验证
  const baseProfile = {
    userId: 1,
    serviceAreas: ['桃园'],
    servicePlaces: [],
    itemSizes: ['small'],
    basePrice: null,
    remark: '',
    completedCount: 3
  };

  // ① now 模式：isOnline 即在线
  p3.applyProfile(Object.assign({}, baseProfile, { isOnline: true, availabilityType: 'now', manualUntil: null, timeSlots: [] }));
  check('now 在线文案 = 当前在线', p3.data.statusText === '当前在线', p3.data.statusText);

  // ② slot + manualUntil 未过期：后端第一优先级会判在线（「只下线这一次」的压制器）
  const later = new Date(Date.now() + 3600000);
  const laterHHmm = pad(later.getHours()) + ':' + pad(later.getMinutes());
  const laterStr =
    later.getFullYear() + '-' + pad(later.getMonth() + 1) + '-' + pad(later.getDate()) + ' ' + laterHHmm + ':00';
  p3.applyProfile(Object.assign({}, baseProfile, { isOnline: true, availabilityType: 'slot', manualUntil: laterStr, timeSlots: [] }));
  check('manualUntil 未过期 → 当前在线至 HH:mm', p3.data.statusText === '当前在线至 ' + laterHHmm, p3.data.statusText);

  // ③ slot 非时段（计划在明天）：即便 isOnline=1 也不许说在线，否则用户去大厅找不到自己
  p3.applyProfile(
    Object.assign({}, baseProfile, {
      isOnline: true,
      availabilityType: 'slot',
      manualUntil: null,
      timeSlots: [{ id: 'o1', type: 'once', date: tomorrow(), start: '09:00', end: '12:00' }]
    })
  );
  check('slot 非时段不谎报在线', p3.data.statusText.indexOf('已下线') === 0, p3.data.statusText);
  check('非时段给出下次自动上线时刻', p3.data.statusText.indexOf('自动上线') > -1, p3.data.statusText);
  check('hasActiveSlot=false', p3.data.hasActiveSlot === false, p3.data.hasActiveSlot);
  check('nextOnlineText 有值', !!p3.data.nextOnlineText, p3.data.nextOnlineText);

  // ④ slot 且此刻在时段内 → 在线（计划时段内）
  p3.applyProfile(
    Object.assign({}, baseProfile, {
      isOnline: true,
      availabilityType: 'slot',
      manualUntil: null,
      timeSlots: [{ id: 'o2', type: 'once', date: todayStr(), start: '00:00', end: '23:59' }]
    })
  );
  check('slot 时段内 → 当前在线（计划时段内）', p3.data.statusText === '当前在线（计划时段内）', p3.data.statusText);
  check('hasActiveSlot=true', p3.data.hasActiveSlot === true, p3.data.hasActiveSlot);

  // ⑤ 已下线但还有未来计划：文案带下次上线时间
  p3.applyProfile(
    Object.assign({}, baseProfile, {
      isOnline: false,
      availabilityType: 'slot',
      manualUntil: null,
      timeSlots: [{ id: 'w1', type: 'weekly', from: dayFromNow(-100), weekdays: [1], start: '09:00', end: '12:00' }]
    })
  );
  check('下线但有计划 → 已下线 · 下次自动上线', p3.data.statusText.indexOf('已下线 · ') === 0 && p3.data.statusText.indexOf('自动上线') > -1, p3.data.statusText);
  check('completedCount 回填', p3.data.completedCount === 3, p3.data.completedCount);

  console.log('\n[10] 按计划非时段：不谎报上线（用户反馈第 9 条）');
  const p4 = makePage('online');
  await p4.onShow();
  await wait();
  p4.onAreasChange(ev(['桃园']));
  p4.onSizesChange(ev(['small']));
  p4.onAvailChange(ev('slot'));
  p4.onSlotTypeChange(ev('once'));
  p4.onSlotDateChange(ev(tomorrow()));
  p4.onSlotToDateChange(ev(tomorrow()));
  p4.onSlotStartChange(ev('09:00'));
  p4.onSlotEndChange(ev('12:00'));
  p4.onAddSlot();
  p4.setData({ hasActiveSlot: false, isOnline: false });
  calls.length = 0;
  responses = {
    'PUT /api/users/me/runner-profile': {
      userId: 1, isOnline: false, availabilityType: 'slot',
      serviceAreas: ['桃园'], servicePlaces: [], itemSizes: ['small'],
      timeSlots: [{ id: 'x', type: 'once', date: tomorrow(), start: '09:00', end: '12:00' }],
      manualUntil: null, basePrice: null, remark: '', completedCount: 0
    }
  };
  navBacks = 0;
  p4.onTapMainBottom();
  await wait(900);
  check('非时段只保存、不调上线接口', calls.filter((c) => c.url === '/api/users/me/online').length === 0, calls.map((c) => c.url));
  check('非时段不 navigateBack（留在页面看提示）', navBacks === 0, navBacks);
  check('非时段保存后状态条为已下线', p4.data.statusText.indexOf('已下线') === 0, p4.data.statusText);

  console.log('\n[11] loading 期间点按钮有反馈（不再静默）');
  const p5 = makePage('online');
  p5.setData({ loading: true });
  calls.length = 0;
  p5.onTapMainBottom();
  await wait(50);
  check('loading 期间不发请求', calls.length === 0, calls.map((c) => c.url));
  p5.setData({ loading: false });

  console.log('\n[10] 具体地标悬浮卡片（11-24 改版：勾教学区弹卡多选，背景模糊，确定提交）');
  const p7 = makePage();
  p7.onLoad({});
  p7.onAreasChange(ev(['北区教学区']));
  check('勾教学区自动弹卡', p7.data.placeCard.visible === true && p7.data.placeCard.zone === '北区教学区', p7.data.placeCard.zone);
  check('卡片列出全部 27 个地标', p7.data.placeCard.list.length === 27, p7.data.placeCard.list.length);
  p7.onPlaceCardChange(ev(['第1教学楼', '第2教学楼']));
  check('卡片内多选计数', p7.data.placeCard.count === 2, p7.data.placeCard.count);
  p7.onPlaceCardConfirm();
  check('确定后写入 servicePlaces', JSON.stringify(p7.data.servicePlaces) === '["第1教学楼","第2教学楼"]', p7.data.servicePlaces);
  check('确定后卡片关闭', p7.data.placeCard.visible === false);
  const northGroup = p7.data.zoneGroups
    .filter((g) => g.category === '教学区')[0];
  const northZone = northGroup.zones.filter((z) => z.name === '北区教学区')[0];
  check('片区下方出现 chip 摘要', northZone.chips.length === 2 && northZone.more === 0, northZone);
  p7.onZoneChipsTap({ currentTarget: { dataset: { zone: '北区教学区' } } });
  check('重开卡片回显已选', p7.data.placeCard.visible === true && p7.data.placeCard.count === 2, p7.data.placeCard.count);
  p7.onPlaceCardAll();
  check('全选 27 个', p7.data.placeCard.count === 27 && p7.data.placeCard.all === true, p7.data.placeCard.count);
  p7.onPlaceCardConfirm();
  check('全选提交 27 个地标', p7.data.servicePlaces.length === 27, p7.data.servicePlaces.length);
  p7.onAreasChange(ev(['桃园']));
  check('取消勾选片区清空其地标', p7.data.servicePlaces.length === 0 && p7.data.serviceAreas.length === 1, p7.data.servicePlaces.length);
  p7.onAreasChange(ev(['桃园', '南区教学区']));
  check('新勾南区教学区弹卡', p7.data.placeCard.visible === true && p7.data.placeCard.zone === '南区教学区');
  p7.onPlaceCardCancel();
  check('放弃后回退为未勾选', p7.data.serviceAreas.indexOf('南区教学区') < 0 && p7.data.placeCard.visible === false, p7.data.serviceAreas);
  p7.onAreasChange(ev(['桃园', '南区教学区']));
  p7.onPlaceCardChange(ev(['第30教学楼']));
  p7.onPlaceCardConfirm();
  p7.onAreasChange(ev(['桃园', '南区教学区']));
  p7.onPlaceCardCancel();
  check('已保存过的片区放弃不回退勾选', p7.data.serviceAreas.indexOf('南区教学区') > -1 && JSON.stringify(p7.data.servicePlaces) === '["第30教学楼"]', p7.data.servicePlaces);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('脚本异常：', e && e.stack);
  process.exit(1);
});
