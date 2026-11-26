/**
 * 第二轮 UI/交互改动冒烟测试（11-26）
 * 覆盖：找跑腿页发布入口、消息/我的页标题栏、红点位置与广播、
 *       会话左滑操作、聊天输入框 textarea 自动增高。
 * 运行：node scripts/smoke/smoke_ui_round2.js   （cwd 必须在仓库根）
 */
const fs = require('fs');
const path = require('path');
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
function read(rel) {
  return fs.readFileSync(path.join(MP, rel), 'utf8');
}

(async () => {
  console.log('[1] 找跑腿页：发布到大厅入口位置');
  const runnersWxml = read('pages/errand/runners.wxml');
  const runnersWxss = read('pages/errand/runners.wxss');
  const filterPublishAt = runnersWxml.indexOf('rp-filter__publish');
  const rebtnAt = runnersWxml.indexOf('rp-filter__btn');
  const emptyAt = runnersWxml.indexOf('wx:elif="{{!list.length}}"');
  const bottomPublishAt = runnersWxml.indexOf('class="rp-publish"');

  check('无匹配发布按钮在筛选卡片内', filterPublishAt > rebtnAt && filterPublishAt < emptyAt, { rebtnAt, filterPublishAt, emptyAt });
  const filterPublishBlock = runnersWxml.slice(Math.max(0, filterPublishAt - 260), filterPublishAt + 60);
  check('发布按钮用描边样式与重新匹配区分', /class="btn btn-ghost btn-block rp-filter__publish"/.test(filterPublishBlock), filterPublishBlock.slice(-180));
  check('有匹配时底部有发布入口', bottomPublishAt > 0 && bottomPublishAt > runnersWxml.indexOf('class="rp-more"'));
  check('空态不再放主色发布按钮', !/rp-state[\s\S]{0,600}btn btn-primary btn-block[\s\S]{0,60}onPublishHall/.test(runnersWxml.slice(emptyAt, emptyAt + 600)));
  check('筛选卡片内发布按钮限定无匹配态', /canPublish && !firstLoading && !error && !list.length/.test(runnersWxml));
  check('WXSS 定义 rp-filter__publish 间距', /\.rp-filter__publish\s*\{/.test(runnersWxss));
  check('WXSS 定义底部 rp-publish', /\.rp-publish\s*\{/.test(runnersWxss));

  console.log('\n[2] 消息 / 我的页标题栏');
  ['pages/chat/list.wxml|cl-bar|消息', 'pages/mine/index.wxml|mine-bar|我的'].forEach((spec) => {
    const [file, cls, title] = spec.split('|');
    const wxml = read(file);
    const wxss = read(file.replace('.wxml', '.wxss'));
    const js = read(file.replace('.wxml', '.js'));
    check(file + ' 有吸顶标题栏', wxml.indexOf('class="' + cls + '"') > -1);
    check(file + ' 标题文字=' + title, wxml.indexOf('>' + title + '</text>') > -1);
    check(file + ' 占位与行高内联', /__safe" style="height: \{\{stickyTop\}\}px"/.test(wxml) && /__head" style="height: \{\{barHead\}\}px"/.test(wxml));
    check(file + ' js 计算胶囊度量', /function getNavMetrics\(\)/.test(js) && /stickyTop: nav\.top, barHead: nav\.height/.test(js));
    check(file.replace('.wxml', '.wxss') + ' sticky top:0', /position: sticky;\s+top: 0;/.test(wxss));
    check(file + ' 已移除 nav-top', wxml.indexOf('<nav-top') < 0);
  });

  console.log('\n[3] 未读红点位置与广播');
  const tabWxml = read('custom-tab-bar/index.wxml');
  const tabWxss = read('custom-tab-bar/index.wxss');
  const tabJs = read('custom-tab-bar/index.js');
  const appJs = read('app.js');
  const iconWrapAt = tabWxml.indexOf('class="tab-bar__icon-wrap"');
  const badgeAt = tabWxml.indexOf('class="tab-bar__badge"');
  check('badge 是图标容器的子节点', badgeAt > iconWrapAt && badgeAt < tabWxml.indexOf('</view>\n    <text class="tab-bar__text"'));
  check('badge 水平居中不按文字偏移', /\.tab-bar__badge\s*\{[^}]*left: 50%;[\s\S]{0,80}transform: translateX\(-50%\)/.test(tabWxss));
  check('badge 不再用 margin-left 偏移', /\.tab-bar__badge\s*\{[^}]*\}/.exec(tabWxss)[0].indexOf('margin-left') < 0);
  check('tabBar 注册到全局注册表', /app\.registerBadgeTarget\(this\)/.test(tabJs));
  check('tabBar 销毁时注销', /app\.unregisterBadgeTarget\(this\)/.test(tabJs));
  check('tabBar show 主动对齐服务端', /pageLifetimes:[\s\S]{0,600}app\.refreshUnread\(\)/.test(tabJs));
  check('app 定义 badgeTargets 注册表', /badgeTargets: \[\]/.test(appJs));
  check('setUnreadBadge 广播所有实例', /badgeTargets\.slice\(\)[\s\S]{0,300}bar\.setBadge\(n\)/.test(appJs));
  check('refreshUnread 复用在途请求', /this\._unreadInFlight/.test(appJs));
  check('失败不清空未读数', /catch\(\(\) => this\.globalData\.unreadCount \|\| 0\)/.test(appJs));

  console.log('\n[4] 会话左滑操作');
  const listWxml = read('pages/chat/list.wxml');
  const listWxss = read('pages/chat/list.wxss');
  const listJs = read('pages/chat/list.js');
  check('三个操作按钮齐备', ['onTogglePin', 'onMarkUnread', 'onDeleteConv'].every((m) => listWxml.indexOf(m) > -1));
  check('按钮文案含置顶/标为未读/删除', />标为未读</.test(listWxml) && />删除</.test(listWxml) && /取消置顶/.test(listWxml));
  check('左滑用 translateX 跟随', /translateX\(\{\{item\.swipeX\}\}px\)/.test(listWxml));
  check('长按唤出操作', /bindlongpress="onConvLongPress"/.test(listWxml));
  check('触摸手势三件套', /bindtouchstart="onSwipeStart"/.test(listWxml) && /bindtouchmove="onSwipeMove"/.test(listWxml) && /bindtouchend="onSwipeEnd"/.test(listWxml));
  check('操作按钮用 catchtap 防误触', /catchtap="onTogglePin"/.test(listWxml) && /catchtap="onDeleteConv"/.test(listWxml));
  check('WXSS 三色操作按钮', /cl-swipe__action--pin[\s\S]{0,80}#4A90D9/.test(listWxss) && /cl-swipe__action--unread[\s\S]{0,80}#C88A3E/.test(listWxss) && /cl-swipe__action--delete[\s\S]{0,80}color-danger/.test(listWxss));
  check('置顶调用 PATCH pin', /\.patch\('\/api\/conversations\/' \+ id \+ '\/pin'/.test(listJs));
  check('标为未读调用 PUT unread', /\.put\('\/api\/conversations\/' \+ id \+ '\/unread'/.test(listJs));
  check('删除调用 del', /\.del\('\/api\/conversations\/' \+ id/.test(listJs));
  check('滑动屏蔽一次 tap', /_suppressTap/.test(listJs) && /if \(this\._suppressTap\) return;/.test(listJs));
  check('纵向手势交还 scroll-view', /touch\.lock = 'scroll'/.test(listJs));

  console.log('\n[5] 聊天输入框自动增高');
  const detailWxml = read('pages/chat/detail.wxml');
  const detailWxss = read('pages/chat/detail.wxss');
  check('输入框改为 textarea 且旧 input 已移除', /<textarea[\s\S]{0,1200}\/>/.test(detailWxml) && !/<input\b/.test(detailWxml));
  check('开启 auto-height', /auto-height="\{\{true\}\}"/.test(detailWxml));
  check('保留 500 字上限', /maxlength="500"/.test(detailWxml));
  check('保留 bindinput/bindconfirm', /bindinput="onInput"/.test(detailWxml) && /bindconfirm="onSend"/.test(detailWxml));
  check('输入条底部对齐', /\.cd-inputbar\s*\{[^}]*align-items: flex-end;/.test(detailWxss));
  check('输入框改圆角框且有行高', /\.cd-inputbar__input\s*\{[^}]*border-radius: 20rpx;[^}]*line-height: 44rpx;/.test(detailWxss));
  check('输入框有最大高度兜底', /\.cd-inputbar__input\s*\{[^}]*max-height: 240rpx;/.test(detailWxss));

  console.log('\n[6] 后端 / 数据库 / mock 契约');
  const chatRoute = fs.readFileSync(path.join(REPO, 'server/src/routes/chat.js'), 'utf8');
  const schema = fs.readFileSync(path.join(REPO, 'database/schema.sql'), 'utf8');
  const dump = fs.readFileSync(path.join(REPO, 'database/campus_service_dump.sql'), 'utf8');
  const mockJs = read('utils/mock.js');
  const reqJs = read('utils/request.js');
  check('后端 PATCH pin 路由', /router\.patch\('\/:id\/pin'/.test(chatRoute));
  check('后端 PUT unread 路由', /router\.put\('\/:id\/unread'/.test(chatRoute));
  check('后端 DELETE 会话路由', /router\.delete\('\/:id'/.test(chatRoute));
  check('会话列表按 is_pinned 排序', /ORDER BY c\.is_pinned DESC/.test(chatRoute));
  check('schema 增 is_pinned 列', /is_pinned TINYINT\(1\) NOT NULL DEFAULT 0/.test(schema));
  check('dump 增 is_pinned 列', /`is_pinned` tinyint\(1\) NOT NULL DEFAULT '0'/.test(dump));
  check('mock 三路由齐备', /PATCH \/api\/conversations\/:id\/pin/.test(mockJs) && /PUT \/api\/conversations\/:id\/unread/.test(mockJs) && /DELETE \/api\/conversations\/:id/.test(mockJs));
  check('request 暴露 patch', /patch: \(url, data, extra\)/.test(reqJs));

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});
