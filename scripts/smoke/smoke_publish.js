/**
 * 发布代取页冒烟测试（stub Page/wx/getApp/request，直跑页面逻辑）
 * 运行：node smoke_publish.js   （cwd 必须在仓库根）
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
    return respond('GET', url);
  },
  post(url, data) {
    calls.push({ method: 'POST', url, data });
    return respond('POST', url);
  },
  put(url, data) {
    calls.push({ method: 'PUT', url, data });
    return respond('PUT', url);
  }
};
function respond(method, url) {
  const keys = Object.keys(responses);
  let hit = keys.indexOf(method + ' ' + url);
  if (hit < 0) {
    hit = keys.findIndex((k) => {
      const pattern = k.replace(/\/:id$/, '/\\d+');
      return k.indexOf('/:id') > -1 && new RegExp('^' + pattern + '$').test(method + ' ' + url);
    });
  }
  const v = hit > -1 ? responses[keys[hit]] : { __fail: true, code: -1, message: 'smoke 未配置响应' };
  return new Promise((resolve, reject) => {
    setTimeout(() => (v && v.__fail ? reject(v) : resolve(v)), 0);
  });
}
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
const redirects = [];
const navBacks = [];
const toasts = [];
global.wx = {
  redirectTo: (o) => redirects.push(o.url),
  navigateBack: () => navBacks.push(1),
  switchTab: () => {},
  showToast: (o) => toasts.push(o.title),
  showModal: () => {},
  setClipboardData: () => {}
};

require(path.join(process.cwd(), 'miniprogram/pages/errand/publish.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.setData = function (patch) {
    const walk = (target, patchObj) => {
      Object.keys(patchObj).forEach((k) => {
        const v = patchObj[k];
        if (k.indexOf('.') > -1) {
          const parts = k.split('.');
          let cur = target;
          for (let i = 0; i < parts.length - 1; i += 1) cur = cur[parts[i]];
          cur[parts[parts.length - 1]] = v;
        } else {
          target[k] = v;
        }
      });
    };
    walk(this.data, patch);
  };
  return inst;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 700));
// picker/radio 事件统一是 { detail: { value } }
const ev = (value) => ({ detail: { value: value } });

(async () => {
  console.log('[1] 取件地点（place-picker 弹层，替代三级 picker）');
  const p = makePage();
  p.onLoad({});
  check('默认非编辑模式', p.data.isEdit === false && p.data.orderId === 0);
  check('初始未选地点', p.data.pickupArea === '' && p.data.pickupText === '' && p.data.placePickerVisible === false);
  // 无下级地标片区：落库传片区名，展示不带「· 全区」尾巴
  p.onPlaceConfirm({ detail: { zone: '桃园', place: '' } });
  check('无地标片区落库传片区名', p.data.pickupArea === '桃园' && p.data.pickupPlace === '桃园', {
    area: p.data.pickupArea,
    place: p.data.pickupPlace
  });
  check('无地标片区展示 = 片区名本身', p.data.pickupText === '桃园', p.data.pickupText);
  check('确认后弹层关闭', p.data.placePickerVisible === false, p.data.placePickerVisible);
  // 有下级地标的片区：必须选到楼（页面兜底）
  p.onPlaceConfirm({ detail: { zone: '北区教学区', place: '' } });
  check('教学区空地标被兜底拦截', p.data.pickupArea === '桃园', p.data.pickupArea);
  p.onPlaceConfirm({ detail: { zone: '北区教学区', place: '第3教学楼' } });
  check('教学区选楼回填', p.data.pickupArea === '北区教学区' && p.data.pickupPlace === '第3教学楼', {
    area: p.data.pickupArea,
    place: p.data.pickupPlace
  });
  check('教学区展示带楼名', p.data.pickupText === '北区教学区 · 第3教学楼', p.data.pickupText);

  console.log('\n[2] 输入过滤');
  p.onRewardInput(ev('abc12.9.99元'));
  check('报酬过滤非法字符', p.data.form.reward === '12.99', p.data.form.reward);
  p.onRewardInput(ev('12.345'));
  check('报酬最多两位小数', p.data.form.reward === '12.34', p.data.form.reward);

  console.log('\n[3] buildPayload：timeType 三态');
  p.onLoad({});
  p.onPlaceConfirm({ detail: { zone: '北区教学区', place: '第1教学楼' } });
  p.onSizeChange(ev('1'));
  p.onTimeTypeChange(ev('0')); // asap
  p.setData({ form: { deliveryLocation: '李园 3 栋', itemDesc: '', remark: '', reward: '5' } });
  let payload = p.buildPayload();
  check('asap 不携带任何时间字段', payload.timeStart === undefined && payload.deadline === undefined, payload);
  check(
    'payload 片区/地标',
    payload.pickupArea === '北区教学区' && payload.pickupPlace === '第1教学楼',
    payload
  );

  p.onTimeTypeChange(ev('1')); // deadline
  p.onDeadlineDateChange(ev(p.data.minDate));
  p.onDeadlineTimeChange(ev('23:30'));
  payload = p.buildPayload();
  check(
    'deadline 带 deadline 不带 timeStart',
    payload.deadline === p.data.minDate + ' 23:30:00' && !payload.timeStart,
    payload
  );

  p.onTimeTypeChange(ev('2')); // range
  p.onStartDateChange(ev(p.data.minDate));
  p.onStartTimeChange(ev('10:00'));
  p.onDeadlineDateChange(ev(p.data.minDate));
  p.onDeadlineTimeChange(ev('12:00'));
  payload = p.buildPayload();
  check(
    'range 带起止',
    payload.timeStart === p.data.minDate + ' 10:00:00' && payload.deadline === p.data.minDate + ' 12:00:00',
    payload
  );

  console.log('\n[4] validate');
  p.onTimeTypeChange(ev('1'));
  p.setData({ deadlineDate: '', deadlineTime: '' });
  p.setData({ form: { deliveryLocation: '', itemDesc: '', remark: '', reward: '' } });
  let errors = p.validate(p.buildPayload());
  check('空表单拦截送达地点', !!errors.deliveryLocation, errors);
  check('空表单拦截报酬', !!errors.reward, errors);
  check('空表单拦截截止时间', !!errors.time, errors);
  p.setData({ form: { deliveryLocation: 'x'.repeat(101), itemDesc: '', remark: '', reward: '201' } });
  errors = p.validate(p.buildPayload());
  check('送达地点超 100 字', errors.deliveryLocation === '送达地点不能超过 100 字', errors);
  check('报酬超 200 拦截', errors.reward === '报酬不能超过 200 元', errors);
  p.setData({ form: { deliveryLocation: '李园 3 栋', itemDesc: '', remark: '', reward: '0' } });
  errors = p.validate(p.buildPayload());
  check('报酬 0 拦截', errors.reward === '报酬必须大于 0 元', errors);
  p.onDeadlineDateChange(ev('2020-01-01'));
  p.onDeadlineTimeChange(ev('08:00'));
  p.setData({ form: { deliveryLocation: '李园 3 栋', itemDesc: '', remark: '', reward: '5' } });
  errors = p.validate(p.buildPayload());
  check('截止时间早于现在拦截', errors.time === '截止时间必须晚于当前时间', errors);

  console.log('\n[5] 提交：大厅单');
  responses = { 'POST /api/errands': { orderId: 3001, visibility: 'hall' } };
  p.onDeadlineDateChange(ev(p.data.minDate));
  p.onDeadlineTimeChange(ev('23:58'));
  p.onTapSubmit();
  await wait();
  const post = calls.filter((c) => c.method === 'POST')[0];
  check('POST /api/errands 且 visibility=hall', !!post && post.data.visibility === 'hall', post);
  check('大厅单成功 redirectTo 详情', redirects[0] === '/pages/errand/detail?id=3001', redirects);

  console.log('\n[6] 提交：私单先找跑腿');
  redirects.length = 0;
  const p2 = makePage();
  p2.onLoad({});
  p2.onPlaceConfirm({ detail: { zone: '桃园', place: '' } }); // 默认桃园（无下级地标，pickupPlace=桃园）
  p2.onSizeChange(ev('0'));
  p2.onTimeTypeChange(ev('0'));
  p2.setData({ form: { deliveryLocation: '李园 3 栋 101', itemDesc: '', remark: '', reward: '3.5' } });
  responses = { 'POST /api/errands': { orderId: 3002, visibility: 'private' } };
  p2.onTapPrivate();
  await wait();
  const post2 = calls.filter((c) => c.method === 'POST')[1];
  check('私单 visibility=private', post2.data.visibility === 'private', post2.data);
  check(
    '私单成功跳找跑腿页带 orderId 与筛选',
    redirects[0].indexOf('/pages/errand/runners?orderId=3002&area=') === 0 &&
      redirects[0].indexOf('timeType=asap') > -1,
    redirects
  );

  console.log('\n[7] 编辑模式回填与保存');
  // 截止时间必须取未来日期（动态生成明天 18:00），否则 validate 判「早于当前时间」拦截提交
  const pad2n = (n) => String(n).padStart(2, '0');
  const fut = new Date(Date.now() + 24 * 3600 * 1000);
  const futDate = fut.getFullYear() + '-' + pad2n(fut.getMonth() + 1) + '-' + pad2n(fut.getDate());
  const p3 = makePage();
  responses = {
    'GET /api/errands/:id': {
      orderId: 2004,
      canEdit: true,
      pickupArea: '李园',
      pickupPlace: '李园',
      deliveryLocation: '5 号宿舍楼 108',
      itemSize: 'large',
      itemDesc: '箱子',
      remark: '小心',
      reward: 6,
      timeType: 'deadline',
      timeStart: null,
      deadline: futDate + ' 18:00:00'
    }
  };
  p3.onLoad({ id: '2004' });
  await wait(50);
  check('编辑模式标题', p3.data.pageTitle === '编辑代取', p3.data.pageTitle);
  check('编辑回填片区', p3.data.pickupArea === '李园', p3.data.pickupArea);
  check('编辑回填无地标片区', p3.data.pickupPlace === '李园', p3.data.pickupPlace);
  check('编辑回填展示文案', p3.data.pickupText === '李园', p3.data.pickupText);
  check('编辑回填规格 large', p3.data.sizeOptions[p3.data.sizeIndex].value === 'large');
  check(
    '编辑回填截止时间',
    p3.data.deadlineDate === futDate && p3.data.deadlineTime === '18:00',
    { d: p3.data.deadlineDate, t: p3.data.deadlineTime }
  );
  check('编辑回填报酬', p3.data.form.reward === '6', p3.data.form);

  responses = { 'PUT /api/errands/:id': { orderId: 2004, visibility: 'private' } };
  p3.onTapSubmit();
  await wait();
  const put = calls.filter((c) => c.method === 'PUT')[0];
  check('编辑走 PUT /api/errands/2004', !!put && /\/api\/errands\/2004$/.test(put.url), put);
  check('编辑不带 visibility 字段', !!put && put.data.visibility === undefined, put && put.data);
  check('编辑成功 navigateBack 回详情', navBacks.length === 1, navBacks);

  console.log('\n[8] 编辑模式 canEdit=false 挡回');
  const p4 = makePage();
  responses = { 'GET /api/errands/:id': { orderId: 2001, canEdit: false } };
  p4.onLoad({ id: '2001' });
  await wait(900); // backOut 有 800ms 延迟
  check('不可编辑 → toast 并退出', navBacks.length === 2, navBacks);

  console.log('\n[9] 提交失败：后端文案落字段 + 按钮解锁');
  const p5 = makePage();
  p5.onLoad({});
  p5.onPlaceConfirm({ detail: { zone: '桃园', place: '' } });
  p5.onSizeChange(ev('0'));
  p5.onTimeTypeChange(ev('0'));
  p5.setData({ form: { deliveryLocation: '李园 3 栋', itemDesc: '', remark: '', reward: '5' } });
  responses = { 'POST /api/errands': { __fail: true, code: 400, message: '取件片区不在可选范围内' } };
  p5.onTapSubmit();
  await wait(50);
  check('后端片区文案落到 pickupArea', p5.data.errors.pickupArea === '取件片区不在可选范围内', p5.data.errors);
  check('失败后按钮解锁', p5.data.submitting === false);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('脚本异常：', e && e.stack);
  process.exit(1);
});
