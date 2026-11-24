// 代取详情页逻辑冒烟测试：stub 掉 Page/wx/getApp，用 mock 数据跑 apply() 分支
const path = require('path');
const REPO = path.join(__dirname, '..', '..', 'miniprogram');

let captured = null;
global.Page = (cfg) => { captured = cfg; };
const navs = [];
global.wx = {
  showToast() {}, navigateBack() {}, switchTab() {},
  navigateTo(o) { navs.push(o.url); },
  stopPullDownRefresh() {}, setClipboardData() {}
};
global.getApp = () => ({
  globalData: { userInfo: { userId: 1 }, token: 'mock' },
  isLogin: () => true,
  requireLogin() {}
});
global.getCurrentPages = () => [{}, {}];

const mock = require(path.join(REPO, 'utils', 'mock.js'));
require(path.join(REPO, 'pages', 'errand', 'detail.js'));

const cfg = captured;
function makePage() {
  const p = Object.assign({}, cfg);
  p.data = JSON.parse(JSON.stringify(cfg.data));
  p.setData = (d) => Object.assign(p.data, d);
  return p;
}

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + ' -> ' + JSON.stringify(extra)); }
}

(async () => {
  console.log('\n[1] 按钮派生（只信后端 can*）');
  // 11-16 反馈：聊天入口并入底部操作栏 → 有聊天对象时 actions 首位是 chat
  const cases = [
    ['2001 别人 hall pending', '2001', ['chat', 'take'], 'take'],
    ['2006 我发布 taken', '2006', ['chat', 'complete', 'cancel'], 'complete'],
    ['2007 我接的 taken', '2007', ['chat', 'release'], 'release'],
    ['2004 我的私单 pending', '2004', ['publish', 'findRunner', 'edit', 'cancel'], 'publish'],
    ['2008 别人私单我聊过', '2008', ['chat', 'take'], 'take']
  ];
  for (const [name, id, want, primary] of cases) {
    const order = await mock.run('/api/errands/' + id, 'GET', {});
    const p = makePage();
    p.apply(order);
    const keys = p.data.actions.map((a) => a.key);
    const pri = (p.data.actions.find((a) => a.primary) || {}).key;
    check(name + ' → ' + want.join('+'), JSON.stringify(keys) === JSON.stringify(want), keys);
    check(name + ' 主色按钮 = ' + primary, pri === primary, pri);
  }

  console.log('\n[2] 文案与派生字段');
  const p2003 = makePage();
  p2003.apply(await mock.run('/api/errands/2003', 'GET', {}));
  check('range 时间文案含起止', /2026-11-12 16:00 至 2026-11-12 18:00/.test(p2003.data.timeText), p2003.data.timeText);
  check('地标=片区时只显示一次', p2003.data.areaText === '李园', p2003.data.areaText);

  const p2006 = makePage();
  p2006.apply(await mock.run('/api/errands/2006', 'GET', {}));
  check('asap/deadline 时间文案', p2006.data.timeText.indexOf('前送达') > 0, p2006.data.timeText);
  check('报酬两位小数', p2006.data.rewardText === '5.00', p2006.data.rewardText);
  check('我是发布者 isPublisher=true', p2006.data.isPublisher === true);
  check('联系对象=接单人 8', p2006.data.chatPeerId === 8, p2006.data.chatPeerId);

  const p2007 = makePage();
  p2007.apply(await mock.run('/api/errands/2007', 'GET', {}));
  check('我是接单者 isRunner=true', p2007.data.isRunner === true);
  check('联系对象=发布者 3', p2007.data.chatPeerId === 3, p2007.data.chatPeerId);

  console.log('\n[2.1] 聊天入口（A 15:11 反馈：没接单也要能聊）');
  // 2001 大厅单 pending，我是非发布者 → 有「联系发布者」入口
  const p2001 = makePage();
  p2001.apply(await mock.run('/api/errands/2001', 'GET', {}));
  check('pending 大厅单 → 显示聊天入口', p2001.data.chatShow === true, p2001.data.chatShow);
  check('pending 非发布者 → 文案「联系发布者」', p2001.data.chatLabel === '联系发布者', p2001.data.chatLabel);
  check('pending → 有「可先联系」提示', /先联系发布者/.test(p2001.data.chatTip), p2001.data.chatTip);
  check('pending 聊天对象=发布者 5', p2001.data.chatPeerId === 5, p2001.data.chatPeerId);
  // 2004 我发布的私单 pending，无接单人 → 没有可联系对象
  const p2004c = makePage();
  p2004c.apply(await mock.run('/api/errands/2004', 'GET', {}));
  check('我发布 pending 无接单人 → 不显示聊天入口', p2004c.data.chatShow === false, p2004c.data.chatShow);
  // 2006 taken → 联系 TA
  check('taken 发布者 → 文案「联系 TA」', p2006.data.chatLabel === '联系 TA', p2006.data.chatLabel);
  check('taken → 显示聊天入口', p2006.data.chatShow === true);
  check('taken 不再有「可先联系」提示', p2006.data.chatTip === '', p2006.data.chatTip);

  console.log('\n[3] 异常分支');
  const p404 = makePage();
  p404.applyError({ code: 404 });
  check('404 → 订单不存在或无法查看', p404.data.error === '订单不存在或无法查看', p404.data.error);
  check('404 → 不给重试', p404.data.canRetry === false);
  check('404 → 清空按钮', p404.data.actions.length === 0);

  const pErr = makePage();
  pErr.applyError({ code: -1, message: '无法连接后端' });
  check('其他错误展示 message', pErr.data.errorDesc === '无法连接后端', pErr.data.errorDesc);

  const pMiss = makePage();
  pMiss.onLoad({});
  check('缺 id 不进入加载', pMiss.data.id === 0);

  console.log('\n[4] 跳转类动作（edit / findRunner 曾因 cfg 判空顺序失效）');
  const pJump = makePage();
  pJump.onLoad({ id: '2004' });
  pJump.apply(await mock.run('/api/errands/2004', 'GET', {}));
  navs.length = 0;
  pJump.onAction({ currentTarget: { dataset: { key: 'edit' } } });
  check('编辑 → 跳发布页回填', navs[0] === '/pages/errand/publish?id=2004', navs);
  navs.length = 0;
  pJump.onAction({ currentTarget: { dataset: { key: 'findRunner' } } });
  check(
    '找跑腿 → 带 orderId 与筛选条件',
    navs[0] &&
      navs[0].indexOf('/pages/errand/runners?orderId=2004&area=') === 0 &&
      navs[0].indexOf('timeType=asap') > -1 &&
      navs[0].indexOf('itemSize=small') > -1,
    navs
  );

  console.log('\n[12] 物品信息卡视觉层级（11-25：主 = 规格+描述，辅 = 编号/时间）');
  const fsD = require('fs');
  const wxmlD = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.wxml'), 'utf8');
  const wxssD = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.wxss'), 'utf8');
  check('规格独立成主级行 + 胶囊节点', /detail-info__spec/.test(wxmlD) && /detail-info__size-chip/.test(wxmlD), 'wxml 未见规格胶囊');
  check('描述独立成块（左对齐整块排版）', /detail-info__desc-block/.test(wxmlD) && /detail-info__desc /.test(wxmlD), 'wxml 未见描述块');
  check('未填写走弱化变体', /detail-info__desc--empty/.test(wxmlD), 'wxml 未见空描述变体');
  check('编号/时间收进辅组 meta', /detail-info__meta/.test(wxmlD) && (wxmlD.match(/detail-info__row--meta/g) || []).length >= 2, '辅组结构不符');
  check('主级字号 32rpx（--font-lg）', /\.detail-info__desc\s*\{[\s\S]*?font-size: var\(--font-lg\)/.test(wxssD) && /\.detail-info__size-chip\s*\{[\s\S]*?font-size: var\(--font-lg\)/.test(wxssD), '主级字号不符');
  check('主级加粗 700（描述按用户反馈加粗）', /\.detail-info__desc\s*\{[\s\S]*?font-weight: 700/.test(wxssD), '描述未加粗');
  check('辅级 24rpx 灰阶（--font-sm + text-2/3）', /\.detail-info__v\s*\{[\s\S]*?font-size: var\(--font-sm\)[\s\S]*?color: var\(--color-text-2\)/.test(wxssD), '辅级样式不符');
  check('辅组有分割线隔开主辅', /border-top: 1rpx solid var\(--color-divider\)/.test(wxssD), '未见分割线');
  check('复制交互保留在编号行', /bindtap="onCopyOrderId"/.test(wxmlD), '复制交互丢失');

  console.log('\n[13] 路线卡登机牌式布局（11-25 用户预览确认：横向 + 跑步小人 + 粒子弧 + 备注下移）');
  check('横向三段结构（top / col / mid）', /detail-route__top/.test(wxmlD) && /detail-route__col/.test(wxmlD) && /detail-route__mid/.test(wxmlD), 'wxml 未见三段结构');
  check('送达列右对齐 class', /detail-route__col--to/.test(wxmlD), 'wxml 未见右对齐列');
  check('跑步图标引用本地资源', /src="\/assets\/icons\/runner\.png"/.test(wxmlD), 'wxml 未见 runner 图标');
  check('runner.png 已入库', fsD.existsSync(path.join(REPO, 'assets', 'icons', 'runner.png')), '图标文件缺失');
  check('粒子弧 + 两端实心端点', /detail-route__arc"/.test(wxmlD) && /detail-route__arc-end--from/.test(wxmlD) && /detail-route__arc-end--to/.test(wxmlD), '弧结构不符');
  check('备注移到虚线下（label+内容，wx:if 保留）', /detail-route__foot/.test(wxmlD) && /detail-route__remark-label/.test(wxmlD) && /wx:if="\{\{order\.remark\}\}"/.test(wxmlD), '备注行结构不符');
  check('弧为 dotted 半圆（text-4 色，无新配色）', /\.detail-route__arc\s*\{[\s\S]*?border: 5rpx dotted var\(--color-text-4\)[\s\S]*?border-bottom: none/.test(wxssD), '弧样式不符');
  check('虚线用既有 border 色', /border-top: 3rpx dashed var\(--color-border\)/.test(wxssD), '分割虚线色不符');
  check('起终点圆点配色未变', /\.detail-route__dot--from\s*\{[\s\S]*?background-color: var\(--color-primary-dark\)/.test(wxssD) && /\.detail-route__dot--to\s*\{[\s\S]*?background-color: var\(--color-accent\)/.test(wxssD), '圆点配色被改');
  check('地点值仍是主级 32rpx 加粗', /\.detail-route__value\s*\{[\s\S]*?font-size: var\(--font-lg\)[\s\S]*?font-weight: 700/.test(wxssD), '地点字号被改');

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})();
