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
  check('无地标片区：主级=片区名且无片区小字', p2003.data.routeFromMain === '李园' && p2003.data.routeFromSub === '', {
    main: p2003.data.routeFromMain,
    sub: p2003.data.routeFromSub
  });

  const p2006 = makePage();
  p2006.apply(await mock.run('/api/errands/2006', 'GET', {}));
  check('asap/deadline 时间文案', p2006.data.timeText.indexOf('前送达') > 0, p2006.data.timeText);
  check('报酬两位小数', p2006.data.rewardText === '5.00', p2006.data.rewardText);
  check('有地标片区：主级=地标、小字=片区（11-25 用户反馈）', p2006.data.routeFromMain === '第16教学楼' && p2006.data.routeFromSub === '北区教学区', {
    main: p2006.data.routeFromMain,
    sub: p2006.data.routeFromSub
  });
  check('粒子环 16 点已生成', p2006.data.routeDots.length === 16 && p2006.data.routeDots[0].c === 0, p2006.data.routeDots.length);
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
  check('粒子环结构（ring + wx:for routeDots）', /detail-route__ring"/.test(wxmlD) && /wx:for="\{\{routeDots\}\}"/.test(wxmlD), '环结构不符');
  check('粒子环四档色全用令牌（无新配色）', ['0', '1', '2', '3'].every((n) => new RegExp('detail-route__ring-dot--' + n + '\\s*\\{[\\s\\S]*?background-color: var\\(--color-[a-z-]+\\)').test(wxssD)), '环色变体不符');
  check('js 预生成 16 个粒子且只算位置档位', (function () { const src = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.js'), 'utf8'); return /const RING_STEPS = 16/.test(src) && /routeDots\.push/.test(src); })(), 'js 粒子数据缺失');
  check('取件地点两行：地标主级 + 片区小字', /routeFromMain/.test(wxmlD) && /detail-route__value-sub/.test(wxmlD) && /routeFromSub/.test(wxmlD), '两行结构不符');
  check('送达地点不再截断（无 ellipsis）', !/detail-route__value ellipsis/.test(wxmlD), '地点仍被截断');
  check('备注移到虚线下（label+内容，wx:if 保留）', /detail-route__foot/.test(wxmlD) && /detail-route__remark-label/.test(wxmlD) && /wx:if="\{\{order\.remark\}\}"/.test(wxmlD), '备注行结构不符');
  check('粒子环色全用令牌、旧弧样式已删', !/detail-route__arc\s*\{/.test(wxssD) && /detail-route__ring\s*\{/.test(wxssD), '旧弧样式残留');
  check('中段是定位父级（小人 absolute 的锚点，v0.31 错位回归闸）', /\.detail-route__mid\s*\{[\s\S]*?position: relative/.test(wxssD), 'mid 丢失 relative');
  check('环与小人共用同一居中方案', /\.detail-route__ring\s*\{[\s\S]*?width: 84rpx/.test(wxssD) && /\.detail-route__runner\s*\{[\s\S]*?top: 50%/.test(wxssD), '居中方案不符');
  check('虚线用既有 border 色', /border-top: 3rpx dashed var\(--color-border\)/.test(wxssD), '分割虚线色不符');
  check('起终点圆点配色未变', /\.detail-route__dot--from\s*\{[\s\S]*?background-color: var\(--color-primary-dark\)/.test(wxssD) && /\.detail-route__dot--to\s*\{[\s\S]*?background-color: var\(--color-accent\)/.test(wxssD), '圆点配色被改');
  check('地点值仍是主级 32rpx 加粗', /\.detail-route__value\s*\{[\s\S]*?font-size: var\(--font-lg\)[\s\S]*?font-weight: 700/.test(wxssD), '地点字号被改');

  console.log('\n[14] 小票外壳 + 条形码落款（11-25 用户预览确认「细锯齿」版）');
  const fsApp = require('fs');
  const wxmlReceipt = /class="receipt"/.test(wxmlD)
    && /receipt__saw receipt__saw--top/.test(wxmlD)
    && /receipt__saw receipt__saw--bottom/.test(wxmlD)
    && /class="receipt__body"/.test(wxmlD);
  check('小票外壳结构（receipt + 上下齿条 + 纸面 body）', wxmlReceipt, '结构不符');
  check('五段（预览图 + 四卡）都挂 receipt__sec', (wxmlD.match(/card detail-\w+ receipt__sec/g) || []).length === 5, '分段挂载不符');
  check('齿条上下各一条 wx:for（sawTeeth × 2）', (wxmlD.match(/wx:for="\{\{sawTeeth\}\}"/g) || []).length === 2, '齿条数量不符');
  check('落款图案结构（image + 随机 receiptImage + 日期/打印时间）', /receipt-doodle__img/.test(wxmlD) && /src="\{\{receiptImage\}\}"/.test(wxmlD)
    && /receipt-doodle__date/.test(wxmlD) && /打印时间：\{\{receiptPrintTime\}\}/.test(wxmlD), '落款区结构不符');
  check('条码拼条已移除（防误会：不残留 bars/bar 节点与样式）', !/receipt-code/.test(wxmlD) && !/receipt-code/.test(wxssD) && !/barBars/.test(wxmlD), '条码残留');
  check('纸面走 --color-paper 令牌（wxss 不写死 #FFFDF7）', /background-color: var\(--color-paper\)/.test(wxssD) && !/#FFFDF7/i.test(wxssD), '纸面色不符');
  check('app.wxss 已定义 --color-paper', /--color-paper:\s*#FFFDF7/i.test(fsApp.readFileSync(path.join(REPO, 'app.wxss'), 'utf8')), '令牌缺失');
  check('齿：26rpx 齿距 + 16rpx 齿高', /width: 26rpx/.test(wxssD) && /height: 16rpx/.test(wxssD) && /border-left: 13rpx solid transparent/.test(wxssD), '齿几何不符');
  check('齿自带 box-sizing: border-box（回归闸：content-box 下会被 16rpx 齿条整条裁没）', /\.receipt__tooth\s*\{[\s\S]*?box-sizing: border-box/.test(wxssD), '缺 box-sizing');
  check('齿条 overflow hidden（裁掉第 27 齿）', /\.receipt__saw\s*\{[\s\S]*?overflow: hidden/.test(wxssD), '齿条未裁边');
  check('小票内卡片去浮层（透明 + 无阴影 + 无内边距）', /\.receipt__body \.card\s*\{[\s\S]*?padding: 0[\s\S]*?background-color: transparent[\s\S]*?box-shadow: none/.test(wxssD), '卡片覆盖不符');
  check('分段之间是虚线撕线', /\.receipt__body \.receipt__sec \+ \.receipt__sec\s*\{[\s\S]*?border-top: 3rpx dashed var\(--color-border\)/.test(wxssD), '撕线不符');
  check('5 张落款图案已入库（语义命名，dog 与旧 doodle-* 均已删）', ['cat', 'mouse', 'cake', 'umbrella', 'trees'].every(function (n) {
      return fsD.existsSync(path.join(REPO, 'assets', 'receipt', n + '.png'));
    }) && !fsD.existsSync(path.join(REPO, 'assets', 'receipt', 'dog.png'))
      && !fsD.existsSync(path.join(REPO, 'assets', 'receipt', 'doodle-1.png')), '图案文件不符');
  check('js：27 齿 + 图案清单 + 随机抽取 + 日期/打印时间字段', (function () {
    const src = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.js'), 'utf8');
    const onLoadBody = (src.match(/onLoad\(options\) \{[\s\S]*?\n  \},/) || [''])[0];
    return /i < 27/.test(src)
      && /const DOODLE_IMAGES = \[/.test(src)
      && /cat\.png/.test(src) && /trees\.png/.test(src) && !/dog\.png/.test(src)
      && /Math\.random\(\) \* DOODLE_IMAGES\.length/.test(onLoadBody)
      && /receiptDate: util\.formatTime\(printAt, false\)/.test(src)
      && /receiptPrintTime: util\.formatTime\(printAt\)/.test(src);
  })(), 'js 数据缺失');

  console.log('\n[15] 顶部预览图（11-25 对齐二手详情页：预览在上、详情在下）');
  check('预览图在小票内第一段（hero 结构，无角标——用户要求删「示意图」）', /detail-hero receipt__sec/.test(wxmlD)
    && /detail-hero__img/.test(wxmlD) && /src="\{\{heroImage\}\}"/.test(wxmlD)
    && !/detail-hero__badge/.test(wxmlD) && !/示意图/.test(wxmlD), 'hero 结构不符');
  check('预览图位于头部卡之前（wxml 中 hero 在 detail-head 前面）', wxmlD.indexOf('detail-hero') < wxmlD.indexOf('detail-head'), '顺序不符');
  check('预览块等宽正方形（614rpx）+ 满铺 aspectFill + 防溢出裁切', /\.detail-hero\s*\{[\s\S]*?height: 614rpx[\s\S]*?overflow: hidden/.test(wxssD)
    && /detail-hero__img\s*\{[\s\S]*?width: 100%[\s\S]*?height: 100%/.test(wxssD) && /mode="aspectFill"/.test(wxmlD), 'hero 样式不符');
  check('js 预览图与列表缩略图同一派生（utils/errand.categoryIcon）', (function () {
    const src = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.js'), 'utf8');
    return /require\('\.\.\/\.\.\/utils\/errand'\)/.test(src)
      && /heroImage: errandUtil\.categoryIcon\(order\)/.test(src)
      && /heroImage: ''/.test(src);
  })(), 'js 派生不符');
  check('公共层 errand.js 存在且插画已放大到 512²', (function () {
    const u = fsD.readFileSync(path.join(REPO, 'utils', 'errand.js'), 'utf8');
    return /food/.test(u) && /guessCategory/.test(u) && /categoryIcon/.test(u)
      && ['food', 'doc', 'daily', 'express', 'other'].every(function (n) {
        const p2 = path.join(REPO, 'assets', 'errand', n + '.png');
        if (!fsD.existsSync(p2)) return false;
        const buf = fsD.readFileSync(p2);
        // PNG IHDR：宽高在字节 16..24（大端）
        return buf.readUInt32BE(16) === 512 && buf.readUInt32BE(20) === 512;
      });
  })(), '公共层或插画缺失');
  check('hall.js 已切换到公共层（本地 guessCategory 无残留）', (function () {
    const h = fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'hall.js'), 'utf8');
    return /errandUtil\.categoryIcon\(order\)/.test(h) && !/function guessCategory/.test(h);
  })(), 'hall 切换不符');

  console.log('\n[16] 眼睛 loading 组件（11-25 移植 loading-ui WanderingEyes，MIT）');
  const compDir = path.join(REPO, 'components', 'loading-eyes');
  check('组件四件套齐备', ['index.js', 'index.json', 'index.wxml', 'index.wxss'].every(function (f) {
    return fsD.existsSync(path.join(compDir, f));
  }), '组件文件缺失');
  const compWxss = fsD.readFileSync(path.join(compDir, 'index.wxss'), 'utf8');
  const compWxml = fsD.readFileSync(path.join(compDir, 'index.wxml'), 'utf8');
  const compJs = fsD.readFileSync(path.join(compDir, 'index.js'), 'utf8');
  check('扫视 + 眨眼两组 keyframes（节奏与原版一致）', /@keyframes eyes-move/.test(compWxss)
    && /@keyframes eyes-blink/.test(compWxss)
    && /translate\(-20rpx, 0\)/.test(compWxss) && /translate\(20rpx, 0\)/.test(compWxss)
    && /translate\(0, 20rpx\)/.test(compWxss), 'keyframes 不符');
  check('眨眼收缩到 24rpx（64 × 0.375，与原版 blinkScale 一致）', /height: 24rpx/.test(compWxss), '眨眼参数不符');
  check('配色走令牌（眼白 bg-white + 瞳孔 primary-dark，不照抄黑/白）', /background-color: var\(--color-bg-white\)/.test(compWxss)
    && /background-color: var\(--color-primary-dark\)/.test(compWxss)
    && !/#000/.test(compWxss) && !/#fff[^d]/i.test(compWxss), '配色不符');
  check('瞳孔占比对齐原版（直径 40rpx = 眼白 × 0.64，负 margin 居中锚点）', /margin: -20rpx 0 0 -20rpx/.test(compWxss)
    && /width: 40rpx/.test(compWxss) && /left: 50%/.test(compWxss), '瞳孔定位不符');
  check('周期可配（duration 属性 → --dur）', /duration: \{ type: Number/.test(compJs) && /--dur: \{\{duration\}\}ms/.test(compWxml), '周期配置不符');
  check('详情页已注册并接入（loading 态：眼睛 + 加载中文案）', (function () {
    const pj = JSON.parse(fsD.readFileSync(path.join(REPO, 'pages', 'errand', 'detail.json'), 'utf8'));
    return pj.usingComponents['loading-eyes'] === '/components/loading-eyes/index'
      && /<loading-eyes /.test(wxmlD)
      && wxmlD.indexOf('loading-eyes') < wxmlD.indexOf('加载中…');
    })(), '页面接入不符');

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})();
