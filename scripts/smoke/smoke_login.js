/**
 * 登录页冒烟测试（stub 掉 Page/wx/getApp/request）
 * 运行：node scripts/smoke/smoke_login.js   （cwd 必须在仓库根）
 *
 * 覆盖两块：
 *  A. 11-25 改版的「弥散背景 + 光晕开场」结构契约（wxml / wxss / js 三处口径对齐）
 *  B. 登录页三条老红线不许回退：skipAuthRedirect、回跳 tabBar 分流、连续失败熔断
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const REPO = process.cwd();
const MP = path.join(REPO, 'miniprogram');
const PAGE = path.join(MP, 'pages/login');

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
let pending = [];
const fakeRequest = {
  get(url, query) {
    calls.push({ method: 'GET', url, query });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  },
  post(url, data, opts) {
    calls.push({ method: 'POST', url, data, opts });
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
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
let session = null;
global.getApp = () => ({
  isLogin: () => false,
  setSession: (token, userInfo) => {
    session = { token, userInfo };
  }
});
const toasts = [];
const navs = [];
const switches = [];
const redirects = [];
const modals = [];
global.wx = {
  showToast: (o) => toasts.push(o),
  navigateTo: (o) => navs.push(o.url),
  switchTab: (o) => switches.push(o.url),
  redirectTo: (o) => redirects.push(o.url),
  showModal: (o) => modals.push(o)
};

require(path.join(PAGE, 'login.js'));

function makePage() {
  const inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data));
  inst.setData = function (patch) {
    Object.assign(this.data, patch);
  };
  return inst;
}
function flush(ok, payload) {
  const p = pending.shift();
  if (!p) throw new Error('没有挂起请求');
  if (ok) p.resolve(payload);
  else p.reject(payload);
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

const wxml = fs.readFileSync(path.join(PAGE, 'login.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(PAGE, 'login.wxss'), 'utf8');
const js = fs.readFileSync(path.join(PAGE, 'login.js'), 'utf8');
const count = (s, sub) => s.split(sub).length - 1;
const seg = (from, to) => {
  const a = wxml.indexOf(from);
  const b = wxml.indexOf(to, a + 1);
  return a >= 0 && b > a ? wxml.slice(a, b) : '';
};

(async () => {
  console.log('[1] 结构：弥散层已移除，黄屏底 + 眼睛条就位');
  check('intro 入场类挂在页根上', wxml.indexOf("{{intro ? 'intro' : ''}}") >= 0);
  check('弥散层 mesh 已移除', wxml.indexOf('mesh') < 0);
  check('旧光晕 glow/glow-ring/hero-halo 已移除',
    wxml.indexOf('glow') < 0 && wxml.indexOf('hero-halo') < 0);
  check('眼睛条存在', /class="eyes-bar/.test(wxml));
  check('两只眼睛', count(wxml, 'class="eye"') === 2, count(wxml, 'class="eye"'));
  check('瞳孔与眯眼符号齐全',
    count(wxml, 'class="pupil"') === 2 && wxml.indexOf('sq--gt') >= 0 && wxml.indexOf('sq--lt') >= 0);
  check('眯眼为两段圆头短棒', count(wxml, 'class="seg seg--up"') === 2 && count(wxml, 'class="seg seg--dn"') === 2);
  check('眯眼状态类绑定 eyesClosed', wxml.indexOf('{{eyesClosed') >= 0);
  check('旧 logo 块已移除', wxml.indexOf('class="logo"') < 0);
  check('旧副标题 hero-sub 已移除', wxml.indexOf('hero-sub') < 0);
  check('标题文案保留', wxml.indexOf('校园易站') >= 0);
  check('表单卡内只有 2 个字段', count(seg('class="form-card"', 'class="btn btn-primary'), 'class="field"') === 2);

  console.log('\n[2] 层级：按钮抽出卡片、黄底对比度、协议仍在');
  check('登录按钮不在表单卡内', seg('class="form-card"', '</view>\n\n  <button').indexOf('<button') < 0);
  check('按钮保留 loading/disabled 绑定', /loading="\{\{submitting\}\}"/.test(wxml) && /disabled="\{\{submitting\}\}"/.test(wxml));
  check('按压反馈用 btn--press（不缩放口径）', wxml.indexOf('hover-class="btn--press"') >= 0);
  check('底部链接用 text-2 令牌（主页面底色直接可读）', /\.extra-link\s*\{[^}]*var\(--color-text-2\)/.test(wxss));
  check('协议行用 text-3 令牌', /\.agreement\s*\{[^}]*var\(--color-text-3\)/.test(wxss));
  check('MOCK 提示用 text-3 令牌', /\.tip\s*\{[^}]*var\(--color-text-3\)/.test(wxss));
  check('无黄屏色残留（#FDE03F 已移除）', wxss.indexOf('#FDE03F') < 0 && wxml.indexOf('#FDE03F') < 0);
  check('协议两个链接都可点', /data-type="user"/.test(wxml) && /data-type="privacy"/.test(wxml));
  check('MOCK 提示按 isMock 条件渲染', wxml.indexOf('wx:if="{{isMock}}"') >= 0);
  check('去注册仍走 onGoRegister', wxml.indexOf('bindtap="onGoRegister"') >= 0);

  console.log('\n[3] 动画契约：眼睛条编排与 js 时长对齐');
  [
    'login-rise',
    'bar-journey',
    'splash-look',
    'eyes-move',
    'eyes-blink'
  ].forEach((k) => check('存在 @keyframes ' + k, wxss.indexOf('@keyframes ' + k) >= 0));
  check('底色与主页面同源（var(--color-bg)）', /page\s*\{[^}]*background-color:\s*var\(--color-bg\)/.test(wxss));
  check('弥散渐变已移除（无 linear-gradient / blur）',
    wxss.indexOf('linear-gradient') < 0 && wxss.indexOf('blur(') < 0);
  check('眼睛几何与 loading-eyes 同源（eye 64 / pupil 40 / travel 20）',
    /width:\s*64rpx/.test(wxss) && /width:\s*40rpx/.test(wxss) && /translate\(-20rpx,\s*0\)/.test(wxss));
  check('眯眼方向：左眼 >（sq--gt 镜像）', /\.sq--gt\s*\{[^}]*scaleX\(-1\)/.test(wxss));
  check('内容层满屏高（translateY(100%) 才能移出整屏，防开场标题穿帮）',
    /\.login-body\s*\{[^}]*min-height:\s*100vh/.test(wxss));
  check('待机扫视挂基础态 .pupil（摘 .intro 后动画不中断）',
    /\.pupil\s*\{[^}]*animation:\s*eyes-move/.test(wxss));
  check('开场起点由 js 计算（胶囊 + 屏高）', js.indexOf('getMenuButtonBoundingClientRect') >= 0);
  check('有减弱动态效果降级', wxss.indexOf('prefers-reduced-motion') >= 0);
  check('编排 2600ms 与 INTRO_HOLD_MS=2800 对齐', /2600ms/.test(wxss) && /INTRO_HOLD_MS\s*=\s*2800/.test(js));
  check('data.intro 初始为 true', pageCfg.data.intro === true);
  check('js 有摘类逻辑', /setData\(\{\s*intro:\s*false\s*\}\)/.test(js));
  check('密码聚焦切眯眼', /onPwFocus[\s\S]*?eyesClosed:\s*true/.test(js) && wxml.indexOf('bindfocus="onPwFocus"') >= 0);
  check('失焦恢复待机', /onPwBlur[\s\S]*?eyesClosed:\s*false/.test(js) && wxml.indexOf('bindblur="onPwBlur"') >= 0);

  console.log('\n[3.5] 登录转场契约：果冻回弹 + 深棕铺满水波纹');
  check('按钮绑定果冻类', wxml.indexOf("{{btnJelly ? 'submit--jelly' : ''}}") >= 0);
  check('存在 @keyframes btn-jelly', wxss.indexOf('@keyframes btn-jelly') >= 0);
  check('果冻时长 js/wxss 对齐（460ms）', /JELLY_MS\s*=\s*460/.test(js) && /btn-jelly 460ms/.test(wxss));
  check('果冻播完摘类', /_jellyTimer = setTimeout\(\(\) => \{\s*this\._jellyTimer = null;\s*this\.setData\(\{ btnJelly: false \}\)/.test(js));
  check('转场覆盖层存在且几何走 CSS 变量',
    /class="transit \{\{transit\}\}"/.test(wxml) &&
    wxml.indexOf('--tx: {{tapX}}px') >= 0 && wxml.indexOf('--ty: {{tapY}}px') >= 0 && wxml.indexOf('--tr: {{tapR}}px') >= 0);
  check('转场三段 keyframes 齐全',
    wxss.indexOf('@keyframes transit-grow') >= 0 &&
    wxss.indexOf('@keyframes transit-fade') >= 0 &&
    wxss.indexOf('@keyframes transit-ring') >= 0);
  check('深棕用 --color-primary-dark（铺满与涟漪同色）',
    /\.transit__fill\s*\{[^}]*var\(--color-primary-dark\)/.test(wxss) &&
    /\.transit__ring\s*\{[^}]*var\(--color-primary-dark\)/.test(wxss));
  check('ripple 段 transform 锁 scale(1)（防基态 scale(0) 瞬消）',
    /@keyframes transit-fade\s*\{[\s\S]*?transform:\s*scale\(1\)[\s\S]*?transform:\s*scale\(1\)/.test(wxss));
  check('转场时序 js/wxss 对齐（480/420/260）',
    /TRANSIT_GROW_MS\s*=\s*480/.test(js) && /TRANSIT_RIPPLE_MS\s*=\s*420/.test(js) && /GOTO_AT_MS\s*=\s*260/.test(js) &&
    /transit-grow 480ms/.test(wxss) && /transit-fade 420ms/.test(wxss));
  check('转场半径按按钮 rect + 四角最远距离计算', /boundingClientRect/.test(js) && /Math\.hypot/.test(js));
  check('转场降级：reduced-motion 下深棕直接铺满', /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.transit\.expand \.transit__fill\s*\{[\s\S]*?transform:\s*scale\(1\)/.test(wxss));
  check('onUnload 清转场定时器', /_transitGrowTimer/.test(js) && /_transitGotoTimer/.test(js) && /_jellyTimer/.test(js));

  console.log('\n[4] 光晕编排生命周期');
  const p0 = makePage();
  p0.onReady();
  check('onReady 挂上编排定时器', !!p0._introTimer);
  p0.onUnload();
  check('onUnload 清掉定时器', p0._introTimer === null);

  console.log('\n[5] 输入校验（老红线回归）');
  const p1 = makePage();
  p1.onLoad({});
  await p1.onSubmit();
  check('空学号 → 请先输入学号', toasts[toasts.length - 1].title === '请输入学号', toasts[toasts.length - 1]);
  p1.setData({ studentNo: 'abc' });
  await p1.onSubmit();
  check('学号非数字 → 校验提示', toasts[toasts.length - 1].title === '学号应为 6-20 位数字', toasts[toasts.length - 1]);
  p1.setData({ studentNo: '2021001234', password: '123' });
  await p1.onSubmit();
  check('密码过短 → 校验提示', toasts[toasts.length - 1].title === '密码需 6-20 位', toasts[toasts.length - 1]);
  check('校验失败不发请求', calls.length === 0);

  console.log('\n[6] 提交：401 语义与回跳分流');
  p1.setData({ password: 'abc123456' });
  const submitting = p1.onSubmit();
  await tick();
  check('POST /api/auth/login', calls[0] && calls[0].url === '/api/auth/login', calls[0] && calls[0].url);
  check('带 skipAuthRedirect（401 不等于登录过期）', !!(calls[0] && calls[0].opts && calls[0].opts.skipAuthRedirect === true));
  check('带 silent（文案由本页 toast）', !!(calls[0] && calls[0].opts && calls[0].opts.silent === true));
  flush(false, { code: 401, message: '学号或密码错误' });
  await submitting;
  check('401 → 透传后端文案', toasts[toasts.length - 1].title === '学号或密码错误', toasts[toasts.length - 1]);
  check('失败计数 +1', p1.data.failCount === 1, p1.data.failCount);
  check('失败后解除 submitting', p1.data.submitting === false);

  // 成功路径：redirect 是 tabBar 页 → switchTab
  const p2 = makePage();
  p2.onLoad({ redirect: encodeURIComponent('/pages/errand/hall') });
  p2.setData({ studentNo: '2021001234', password: 'abc123456' });
  const ok = p2.onSubmit();
  await tick();
  flush(true, { token: 'tk', userInfo: { nickname: '小 B' } });
  await ok;
  await tick(450);
  check('写会话', session && session.token === 'tk');
  check('tabBar 目标走 switchTab', switches[switches.length - 1] === '/pages/errand/hall', switches);
  check('tabBar 目标不走 redirectTo', redirects.length === 0, redirects);

  // 非 tabBar 目标 → redirectTo
  const p3 = makePage();
  p3.onLoad({ redirect: encodeURIComponent('/pages/item/detail?id=1') });
  p3.setData({ studentNo: '2021001234', password: 'abc123456' });
  const ok3 = p3.onSubmit();
  await tick();
  flush(true, { token: 'tk2', userInfo: {} });
  await ok3;
  await tick(450);
  check('非 tabBar 目标走 redirectTo', redirects[redirects.length - 1] === '/pages/item/detail?id=1', redirects);

  console.log('\n[7] 连续失败熔断');
  const p4 = makePage();
  p4.onLoad({});
  p4.setData({ studentNo: '2021001234', password: 'abc123456', failCount: 5 });
  const before = calls.length;
  await p4.onSubmit();
  check('failCount>=5 直接拦下', calls.length === before);
  check('给出稍后再试提示', /稍后再试/.test(toasts[toasts.length - 1].title), toasts[toasts.length - 1]);

  console.log('\n[8] 协议弹窗与忘记密码');
  const p5 = makePage();
  p5.onOpenAgreement({ currentTarget: { dataset: { type: 'privacy' } } });
  check('隐私政策弹窗标题', modals[0] && modals[0].title === '隐私政策', modals[0] && modals[0].title);
  check('弹窗只有一个确认键', modals[0] && modals[0].showCancel === false);
  p5.onForget();
  check('忘记密码指向管理员', /管理员/.test(toasts[toasts.length - 1].title), toasts[toasts.length - 1]);
  p5.onGoRegister();
  check('去注册带 redirect', /\/pages\/register\/register/.test(navs[0] || ''), navs);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
