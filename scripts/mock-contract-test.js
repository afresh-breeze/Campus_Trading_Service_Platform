/**
 * mock 契约一致性测试（B 成员：公共层自测脚本，不入小程序包）
 * ------------------------------------------------------------------
 * 作用：逐条验证 utils/mock.js 与 server/src/routes/*.js 的口径一致，
 *       避免"mock 能跑、联调露馅"（A 于 11-11 复盘提出的问题）。
 *
 * 运行：node scripts/mock-contract-test.js
 * 前提：只需 node，不需要 mysql；mock.js 里 require('../config') 在 node 下可解析。
 *
 * 维护约定：后端新增/改动接口时，先改 mock.js，再在这里补一条断言。
 */
const path = require('path');
const REPO = require('path').join(__dirname, '..', 'miniprogram', 'utils');
const mock = require(path.join(REPO, 'mock.js'));

let pass = 0;
let failCount = 0;

function check(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log('  PASS  ' + name);
  } else {
    failCount += 1;
    console.log('  FAIL  ' + name + (extra === undefined ? '' : ' -> ' + JSON.stringify(extra)));
  }
}

function ids(list) {
  return (list || []).map((x) => x.orderId);
}

function expectFail(name, url, method, data, code) {
  return mock
    .run(url, method, data)
    .then((r) => check(name + '（应失败却成功）', false, r))
    .catch((e) => check(name, e && e.code === code, e));
}

(async () => {
  console.log('\n[0] 路由覆盖');
  const keys = mock.routeKeys();
  console.log('  已登记路由 ' + keys.length + ' 条：');
  keys.forEach((k) => console.log('    ' + k));
  check('路由数 >= 30（原 22 条）', keys.length >= 30, keys.length);
  check('自检无告警', mock.selfCheck().length === 0, mock.selfCheck());

  console.log('\n[1] 代取：我的代取按身份过滤（原 role=runner 用 status!=pending）');
  const asRunner = await mock.run('/api/errands/mine', 'GET', { role: 'runner' });
  // 后端按 created_at DESC 排序：2007(11-10) 在 2005(11-08) 之前
  check('runner 只含我接的单 [2007, 2005]', JSON.stringify(ids(asRunner.list)) === '[2007,2005]', ids(asRunner.list));
  const asPublisher = await mock.run('/api/errands/mine', 'GET', { role: 'publisher' });
  check('publisher 只含我发布的 [2006, 2004]', JSON.stringify(ids(asPublisher.list)) === '[2006,2004]', ids(asPublisher.list));
  const runnerCompleted = await mock.run('/api/errands/mine', 'GET', { role: 'runner', status: 'completed' });
  check('runner + status=completed 只 1 条', runnerCompleted.total === 1, runnerCompleted.total);
  await expectFail('缺 role 返回 400', '/api/errands/mine', 'GET', {}, 400);

  console.log('\n[2] 代取详情：can* 按用户身份 + 状态计算（原 canComplete 恒 false）');
  const d2006 = await mock.run('/api/errands/2006', 'GET', {}); // 我发布、已被接单
  check('2006 我发布+taken → canComplete=true', d2006.canComplete === true, d2006);
  check('2006 canCancel=true', d2006.canCancel === true);
  check('2006 canTake=false（不能接自己单）', d2006.canTake === false);
  const d2001 = await mock.run('/api/errands/2001', 'GET', {}); // 别人发布、pending
  check('2001 别人 pending → canTake=true', d2001.canTake === true);
  check('2001 canComplete=false', d2001.canComplete === false);
  const d2007 = await mock.run('/api/errands/2007', 'GET', {}); // 我接的、taken
  check('2007 我接的 taken → canRelease=true', d2007.canRelease === true);
  const d2004 = await mock.run('/api/errands/2004', 'GET', {}); // 我发布、pending
  check('2004 我发布 pending → canTake=false', d2004.canTake === false);

  console.log('\n[3] 跑腿匹配：place 属于片区 + 在线/计划过滤（原只校验 area+timeType）');
  await expectFail('缺 area 400', '/api/runners', 'GET', { timeType: 'asap' }, 400);
  await expectFail('place 不属于该片区 400', '/api/runners', 'GET', { area: '桃园', place: '第30教学楼', timeType: 'asap' }, 400);
  await expectFail('timeType 非法 400', '/api/runners', 'GET', { area: '桃园', timeType: 'xxx' }, 400);
  await expectFail('deadline 缺 deadline 400', '/api/runners', 'GET', { area: '桃园', timeType: 'deadline' }, 400);
  const asap = await mock.run('/api/runners', 'GET', { area: '桃园', place: '桃园', timeType: 'asap' });
  check('asap 桃园 → 只有在线的跑腿小李', JSON.stringify((asap.list || []).map((r) => r.userId)) === '[8]', (asap.list || []).map((r) => r.userId));
  // 明天上午 09:00-10:00：阿杰的计划只有工作日 18:00-22:00，窗口不重叠且非「随时在线」→ 应被过滤
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const outOfSlot = await mock.run('/api/runners', 'GET', {
    area: '南区教学区', place: '第30教学楼', timeType: 'range',
    timeStart: day + ' 09:00:00', deadline: day + ' 10:00:00'
  });
  check('range 09:00-10:00 南区 → 阿杰计划不覆盖，被过滤', outOfSlot.total === 0, outOfSlot.total);
  const sizeLarge = await mock.run('/api/runners', 'GET', { area: '桃园', place: '桃园', timeType: 'asap', itemSize: 'large' });
  check('itemSize=large 仍匹配（小李支持大件）', sizeLarge.total === 1, sizeLarge.total);
  await expectFail('itemSize 非枚举 400', '/api/runners', 'GET', { area: '桃园', place: '桃园', timeType: 'asap', itemSize: 'huge' }, 400);

  console.log('\n[4] 聊天：messageId / isMine / 发消息只回 id+时间');
  const msgs = await mock.run('/api/conversations/3001/messages', 'GET', { afterId: 0 });
  const first = (msgs.list || [])[0] || {};
  check('消息字段是 messageId 不是 id', first.messageId !== undefined && first.id === undefined, first);
  check('消息带 isMine', typeof first.isMine === 'boolean', first);
  check('isMine 与 senderId 一致', msgs.list.every((m) => m.isMine === (m.senderId === 1)));
  const sent = await mock.run('/api/conversations/3001/messages', 'POST', { content: '测试消息' });
  check('发消息只回 {messageId, createdAt}', sent.messageId !== undefined && sent.createdAt !== undefined && sent.content === undefined, sent);
  const unread = await mock.run('/api/conversations/unread-count', 'GET', {});
  check('未读总数接口存在且为数字', typeof unread.count === 'number', unread);
  const ctx = await mock.run('/api/conversations/3001/context', 'GET', {});
  check('会话业务卡片返回 coverUrl（不是 firstImage）', ctx.bizSummary && ctx.bizSummary.coverUrl !== undefined, ctx.bizSummary);
  const read = await mock.run('/api/conversations/3001/read', 'PUT', {});
  check('标记已读返回 unreadCount=0', read.unreadCount === 0, read);
  await expectFail('创建会话缺 peerId 400', '/api/conversations', 'POST', { bizType: 'item', bizId: 1001 }, 400);
  const created = await mock.run('/api/conversations', 'POST', { peerId: 3, bizType: 'item', bizId: 1002 });
  check('创建会话返回 conversationId + 对方昵称', !!created.conversationId && created.peerNickname === '王同学', created);

  console.log('\n[5] 商品：扁平书目录字段 + 收藏/状态接口');
  const detail = await mock.run('/api/items/1001', 'GET', {});
  check('商品详情是扁平 itemType=book', detail.itemType === 'book', detail.itemType);
  check('商品详情带 bookId/bookTitle', detail.bookId === 1 && !!detail.bookTitle, { bookId: detail.bookId, bookTitle: detail.bookTitle });
  check('商品详情不再有嵌套 book 对象', detail.book === undefined);
  check('商品详情带 seller/isOwner/isFavorited', !!detail.seller && typeof detail.isOwner === 'boolean' && typeof detail.isFavorited === 'boolean');
  const fav = await mock.run('/api/items/1002/favorite', 'POST', {});
  check('收藏成功返回 favorited + favoriteCount', fav.favorited === true && typeof fav.favoriteCount === 'number', fav);
  const unfav = await mock.run('/api/items/1002/favorite', 'DELETE', {});
  check('取消收藏返回 favorited=false', unfav.favorited === false, unfav);
  const st = await mock.run('/api/items/1006/status', 'PUT', { status: 'sold' });
  check('商品状态流转 on_sale→sold 成功', st.status === 'sold', st);
  await expectFail('非法状态流转 409', '/api/items/1006/status', 'PUT', { status: 'on_sale' }, 409);
  await expectFail('改动别人商品 403', '/api/items/1001/status', 'PUT', { status: 'sold' }, 403);
  const cats = await mock.run('/api/categories', 'GET', {});
  check('分类返回 {list} 且字段 categoryId', Array.isArray(cats.list) && cats.list[0].categoryId === 1, cats.list && cats.list[0]);
  await expectFail('书目搜索缺关键词 400', '/api/books/search', 'GET', {}, 400);
  const books = await mock.run('/api/books/search', 'GET', { keyword: '高数' });
  check('书目搜索按书名/作者/ISBN 命中', Array.isArray(books.list), books.list);
  const feedback = await mock.run('/api/feedback', 'POST', { content: '很好用' });
  check('反馈返回 feedbackId', !!feedback.feedbackId, feedback);

  console.log('\n[6] 用户与登录校验对齐');
  const u = await mock.run('/api/users/3', 'GET', {});
  check('用户公开资料只含 4 字段', Object.keys(u).sort().join(',') === 'avatarUrl,creditScore,nickname,userId', Object.keys(u));
  const profile = await mock.run('/api/users/me/runner-profile', 'GET', {});
  check('跑腿设置字段齐全（serviceAreas/Places/itemSizes 数组）', Array.isArray(profile.serviceAreas) && Array.isArray(profile.servicePlaces) && Array.isArray(profile.itemSizes));
  await expectFail('登录缺密码 400', '/api/auth/login', 'POST', { studentNo: '202321010100001' }, 400);
  await expectFail('登录学号 5 位 400', '/api/auth/login', 'POST', { studentNo: '12345', password: '123456' }, 400);
  const login = await mock.run('/api/auth/login', 'POST', { studentNo: '202321010100001', password: '123456' });
  check('登录返回 token + userInfo', !!login.token && login.userInfo.userId === 1, Object.keys(login));
  await expectFail('注册昵称 1 字 400', '/api/auth/register', 'POST', { studentNo: '202321010100010', nickname: 'a', password: '123456' }, 400);
  await expectFail('注册昵称 13 字 400', '/api/auth/register', 'POST', { studentNo: '202321010100010', nickname: '一二三四五六七八九十一二三', password: '123456' }, 400);

  console.log('\n========== 结果：' + pass + ' 通过 / ' + failCount + ' 失败 ==========');
  process.exit(failCount === 0 ? 0 : 1);
})();
