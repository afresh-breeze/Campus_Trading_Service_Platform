/**
 * mock 契约一致性测试（B 成员：公共层自测脚本，不入小程序包）
 * ------------------------------------------------------------------
 * 作用：逐条验证 utils/mock.js 与 server/src/routes/*.js 的口径一致，
 *       避免"mock 能跑、联调露馅"。
 *
 * 运行：node scripts/mock-contract-test.js
 * 前提：只需 node，不需要 mysql；mock.js 里 require('../config') 在 node 下可解析。
 *
 * 维护约定：后端新增/改动接口时，先改 mock.js，再在这里补一条断言。
 * 变更：2026-11-12 按 A 的全面排查补 [3] 私单全流程、[4] 代取校验等价、
 *       [7] 商品/书目/用户校验等价，并修正「登录学号 5 位 → 400」这条**错误契约**。
 *       2026-11-13 补 [9] 私单会话发起权限（P0-4 越权）、[10] 大厅筛选
 *       （area/itemSize/timeType/sort，同维度 OR + 跨维度 AND + 筛选后 total）。
 *       [10] 的 400 只看状态码：A 的实现还没推送到 dev，文案待其推送后逐字对齐。
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
    .catch((e) => check(name, e && e.code === code, e ? { code: e.code, message: e.message } : e));
}

function expectFailMsg(name, url, method, data, message) {
  return mock
    .run(url, method, data)
    .then((r) => check(name + '（应失败却成功）', false, r))
    .catch((e) => check(name, e && e.message === message, e ? { code: e.code, message: e.message } : e));
}

const OK_ERRAND = {
  pickupArea: '桃园',
  pickupPlace: '桃园',
  deliveryLocation: '2 号宿舍楼 416',
  itemSize: 'small',
  itemDesc: '一个小快递盒',
  remark: '取件码 5-1-2266',
  reward: 3,
  timeType: 'asap'
};

(async () => {
  console.log('\n[0] 路由覆盖');
  const keys = mock.routeKeys();
  console.log('  已登记路由 ' + keys.length + ' 条');
  // 服务端 40 条 = 39 条 router.* + GET /api/health；mock 39 条 = 40 − POST /api/upload（真机文件上传不适合 mock）
  check('路由数 = 39（服务端 40 − upload）', keys.length === 39, keys.length);
  check('has() 命中 PUT /api/errands/:id', mock.has('/api/errands/2001', 'PUT') === true);
  check('has() 命中 POST /api/errands/:id/publish', mock.has('/api/errands/2001/publish', 'POST') === true);
  check('自检无告警', mock.selfCheck().length === 0, mock.selfCheck());

  console.log('\n[1] 代取大厅 / 我的代取：可见性与身份过滤');
  const hall = await mock.run('/api/errands', 'GET', {});
  check(
    '大厅只出 visibility=hall',
    (hall.list || []).every((e) => e.visibility === 'hall'),
    (hall.list || []).map((e) => [e.orderId, e.visibility])
  );
  check('大厅不含私单 2004 / 2008', ids(hall.list).indexOf(2004) < 0 && ids(hall.list).indexOf(2008) < 0, ids(hall.list));
  check('大厅带 visibility 字段', hall.list[0] && hall.list[0].visibility !== undefined, hall.list[0] && hall.list[0].visibility);

  const asRunner = await mock.run('/api/errands/mine', 'GET', { role: 'runner' });
  check('runner 只含我接的单 [2007, 2005]', JSON.stringify(ids(asRunner.list)) === '[2007,2005]', ids(asRunner.list));
  const asPublisher = await mock.run('/api/errands/mine', 'GET', { role: 'publisher' });
  check('publisher 只含我发布的 [2006, 2004]（私单也出现）', JSON.stringify(ids(asPublisher.list)) === '[2006,2004]', ids(asPublisher.list));
  const runnerCompleted = await mock.run('/api/errands/mine', 'GET', { role: 'runner', status: 'completed' });
  check('runner + status=completed 只 1 条', runnerCompleted.total === 1, runnerCompleted.total);
  await expectFail('缺 role 返回 400', '/api/errands/mine', 'GET', {}, 400);

  console.log('\n[2] 代取详情：can* 六字段 + 私单可见性');
  const d2006 = await mock.run('/api/errands/2006', 'GET', {}); // 我发布、已被接单、hall
  check('2006 我发布+taken → canComplete=true', d2006.canComplete === true, d2006);
  check('2006 canCancel=true', d2006.canCancel === true);
  check('2006 canTake=false（不能接自己单）', d2006.canTake === false);
  check('2006 canEdit=false / canPublish=false（已进大厅）', d2006.canEdit === false && d2006.canPublish === false);
  const d2001 = await mock.run('/api/errands/2001', 'GET', {});
  check('2001 别人 hall+pending → canTake=true', d2001.canTake === true);
  check('2001 canComplete=false', d2001.canComplete === false);
  const d2007 = await mock.run('/api/errands/2007', 'GET', {});
  check('2007 我接的 taken → canRelease=true', d2007.canRelease === true);
  const d2004 = await mock.run('/api/errands/2004', 'GET', {}); // 我发布、pending、private
  check('2004 我的私单 → canEdit/canPublish=true', d2004.canEdit === true && d2004.canPublish === true);
  check('2004 我的私单 → canTake=false', d2004.canTake === false);
  const d2008 = await mock.run('/api/errands/2008', 'GET', {}); // 别人私单，我聊过
  check('2008 别人私单+有会话 → 可见且 canTake=true', d2008.canTake === true, d2008);
  check('2008 visibility=private', d2008.visibility === 'private');

  console.log('\n[3] 私单全流程：建 private → 改单 → 发布到大厅 → 接单');
  const created = await mock.run('/api/errands', 'POST', Object.assign({}, OK_ERRAND, { visibility: 'private' }));
  check('POST 私单返回 visibility=private', created.visibility === 'private' && !!created.orderId, created);
  const newId = created.orderId;

  const hallAfterCreate = await mock.run('/api/errands', 'GET', {});
  check('新建私单不出现在大厅', ids(hallAfterCreate.list).indexOf(newId) < 0);

  const edited = await mock.run('/api/errands/' + newId, 'PUT', Object.assign({}, OK_ERRAND, { reward: 8 }));
  check('PUT 改私单成功且仍 private', edited.visibility === 'private' && edited.orderId === newId, edited);
  const detailEdited = await mock.run('/api/errands/' + newId, 'GET', {});
  check('改单后报酬已更新为 8', detailEdited.reward === 8, detailEdited.reward);

  await expectFail('改已进大厅的 2006 → 409', '/api/errands/2006', 'PUT', OK_ERRAND, 409);
  await expectFail('改别人私单 2008 → 403', '/api/errands/2008', 'PUT', OK_ERRAND, 403);

  const published = await mock.run('/api/errands/' + newId + '/publish', 'POST', {});
  check('publish 返回 status=pending + visibility=hall', published.status === 'pending' && published.visibility === 'hall', published);
  const hallAfterPublish = await mock.run('/api/errands', 'GET', {});
  check('发布后出现在大厅', ids(hallAfterPublish.list).indexOf(newId) >= 0, ids(hallAfterPublish.list));
  await expectFail('重复 publish → 409', '/api/errands/' + newId + '/publish', 'POST', {}, 409);
  await expectFail('publish 别人的单 → 403', '/api/errands/2008/publish', 'POST', {}, 403);

  const taken = await mock.run('/api/errands/2008/take', 'POST', {}); // 私单+有会话 → 可接
  check('私单被聊过的跑腿接单成功', taken.status === 'taken', taken);
  const d2008After = await mock.run('/api/errands/2008', 'GET', {});
  check('接单后 visibility 仍为 private（不因接单变 hall）', d2008After.visibility === 'private', d2008After.visibility);
  check('接单后 canRelease=true（我是接单者）、canComplete=false（我不是发布者）',
    d2008After.canRelease === true && d2008After.canComplete === false);

  const cancelTaken = await mock.run('/api/errands/2006/cancel', 'POST', {}); // 我发布、taken
  check('撤回已接单 → status=pending', cancelTaken.status === 'pending', cancelTaken);
  check('撤回已接单 → 必须回 visibility', cancelTaken.visibility === 'hall', cancelTaken);

  console.log('\n[4] 代取校验：与 errands.js 逐条等价（原 mock 全部放行）');
  await expectFailMsg('reward=null → 报酬不能为空', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { reward: null }), '报酬不能为空');
  await expectFailMsg('itemDesc 501 字 → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { itemDesc: 'x'.repeat(501) }), '物品描述不能超过 500 字');
  await expectFailMsg('remark 256 字 → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { remark: 'x'.repeat(256) }), '备注不能超过 255 字');
  await expectFailMsg('asap 同时带 deadline → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { deadline: '2026-12-01 18:00:00' }), '时间参数不完整');
  await expectFailMsg('deadline 类型缺 deadline → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { timeType: 'deadline' }), '时间参数不完整');
  await expectFailMsg('range 缺 timeStart → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { timeType: 'range', deadline: '2026-12-01 18:00:00' }), '时间参数不完整');
  await expectFailMsg('visibility 非法 → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { visibility: 'public' }), '可见性不合法');
  await expectFailMsg('地标与片区不匹配 → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { pickupPlace: '第30教学楼' }), '地标与片区不匹配');
  await expectFailMsg('送达地点 101 字 → 400', '/api/errands', 'POST',
    Object.assign({}, OK_ERRAND, { deliveryLocation: 'x'.repeat(101) }), '送达地点不能超过 100 字');

  console.log('\n[5] 跑腿匹配：place 属于片区 + 在线/计划过滤');
  await expectFail('缺 area 400', '/api/runners', 'GET', { timeType: 'asap' }, 400);
  await expectFail('place 不属于该片区 400', '/api/runners', 'GET', { area: '桃园', place: '第30教学楼', timeType: 'asap' }, 400);
  await expectFail('timeType 非法 400', '/api/runners', 'GET', { area: '桃园', timeType: 'xxx' }, 400);
  await expectFail('deadline 缺 deadline 400', '/api/runners', 'GET', { area: '桃园', timeType: 'deadline' }, 400);
  const asap = await mock.run('/api/runners', 'GET', { area: '桃园', place: '桃园', timeType: 'asap' });
  check('asap 桃园 → 只有在线的跑腿小李', JSON.stringify((asap.list || []).map((r) => r.userId)) === '[8]', (asap.list || []).map((r) => r.userId));
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

  console.log('\n[6] 聊天：messageId / isMine / 发消息只回 id+时间');
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
  check('标记已读（PUT）返回 unreadCount=0', read.unreadCount === 0, read);
  await expectFail('创建会话缺 peerId 400', '/api/conversations', 'POST', { bizType: 'item', bizId: 1001 }, 400);
  const createdConv = await mock.run('/api/conversations', 'POST', { peerId: 3, bizType: 'item', bizId: 1002 });
  check('创建会话返回 conversationId + 对方昵称', !!createdConv.conversationId && createdConv.peerNickname === '王同学', createdConv);

  console.log('\n[7] 商品 / 书目 / 用户：校验与字段等价');
  const itemNoCond = await mock.run('/api/items', 'POST', {
    itemType: 'normal', categoryId: 1, title: '默认成色测试', price: 12
  });
  const itemDetail = await mock.run('/api/items/' + itemNoCond.itemId, 'GET', {});
  check('缺省 conditionLevel → 后端默认 good', itemDetail.conditionLevel === 'good', itemDetail.conditionLevel);
  check('发布只回 { itemId }', Object.keys(itemNoCond).join(',') === 'itemId', Object.keys(itemNoCond));
  check('firstImage 是字符串（不是 {url,sortNo} 对象）', typeof itemDetail.firstImage === 'string', itemDetail.firstImage);

  const itemImages = await mock.run('/api/items', 'POST', {
    itemType: 'normal', categoryId: 1, title: '带图测试', price: 12,
    images: [{ url: '/uploads/demo.png', sortNo: 2 }, { url: '/uploads/demo2.png', sortNo: 1 }]
  });
  const itemImagesDetail = await mock.run('/api/items/' + itemImages.itemId, 'GET', {});
  check('images 按 sortNo 排序后取第一张 url 作 firstImage',
    itemImagesDetail.firstImage === '/uploads/demo2.png', itemImagesDetail.firstImage);

  await expectFailMsg('图片不是 /uploads/ 开头 → 400', '/api/items', 'POST',
    { itemType: 'normal', categoryId: 1, title: '非法图', price: 12, images: [{ url: '/demo/x.png' }] }, '图片地址不合法');
  await expectFailMsg('图片超过 3 张 → 400', '/api/items', 'POST',
    { itemType: 'normal', categoryId: 1, title: '四张图', price: 12,
      images: [{ url: '/uploads/a.png' }, { url: '/uploads/b.png' }, { url: '/uploads/c.png' }, { url: '/uploads/d.png' }] },
    '最多上传 3 张图片');
  await expectFailMsg('售价 0 → 400', '/api/items', 'POST', { itemType: 'normal', categoryId: 1, title: '零元', price: 0 }, '售价必须大于 0');
  await expectFailMsg('成色非法 → 400', '/api/items', 'POST',
    { itemType: 'normal', categoryId: 1, title: '成色', price: 1, conditionLevel: 'bad' }, '成色不合法');
  await expectFailMsg('描述 2001 字 → 400', '/api/items', 'POST',
    { itemType: 'normal', categoryId: 1, title: '长描述', price: 1, description: 'x'.repeat(2001) }, '描述不能超过 2000 字');

  const book200 = await mock.run('/api/books', 'POST', { title: 'B'.repeat(200) });
  check('书名 200 字可创建（后端上限 200）', !!book200.bookId, book200);
  await expectFailMsg('书名 201 字 → 400', '/api/books', 'POST', { title: 'B'.repeat(201) }, '书名不能超过 200 字');
  const bookIsbn = await mock.run('/api/books', 'POST', { title: 'ISBN 去重', isbn: '9787000000001' });
  const bookIsbn2 = await mock.run('/api/books', 'POST', { title: '另一个书名同 ISBN', isbn: '9787000000001' });
  check('同 ISBN 返回已有书目且 created=false', bookIsbn2.bookId === bookIsbn.bookId && bookIsbn2.created === false, bookIsbn2);
  await expectFailMsg('ISBN 21 位 → 400', '/api/books', 'POST', { title: 'x', isbn: '1'.repeat(21) }, 'ISBN 不能超过 20 位');

  const phoneOk = await mock.run('/api/users/me', 'PUT', { phone: '12345678901' });
  check('手机号任意 11 位数字均通过（不校验 1[3-9]）', phoneOk.userInfo.phone === '12345678901', phoneOk.userInfo.phone);
  await expectFailMsg('手机号 10 位 → 400', '/api/users/me', 'PUT', { phone: '1234567890' }, '手机号格式不正确');
  const campusIgnored = await mock.run('/api/users/me', 'PUT', { campus: '南区' });
  check('PUT /users/me 不接受 campus（仍为 null）', campusIgnored.userInfo.campus === null, campusIgnored.userInfo.campus);

  console.log('\n[8] 登录 / 注册校验：与 auth.js 对齐');
  const u = await mock.run('/api/users/3', 'GET', {});
  check('用户公开资料只含 4 字段', Object.keys(u).sort().join(',') === 'avatarUrl,creditScore,nickname,userId', Object.keys(u));
  const profile = await mock.run('/api/users/me/runner-profile', 'GET', {});
  check('跑腿设置字段齐全（serviceAreas/Places/itemSizes 数组）', Array.isArray(profile.serviceAreas) && Array.isArray(profile.servicePlaces) && Array.isArray(profile.itemSizes));
  await expectFail('登录缺密码 400', '/api/auth/login', 'POST', { studentNo: '202321010100001' }, 400);
  // 修正：auth.js 登录只校验非空，5 位学号不会 400（后端走到查库 → 401「学号或密码错误」）
  const shortNo = await mock.run('/api/auth/login', 'POST', { studentNo: '12345', password: '123456' }).then(
    (r) => ({ ok: true, r }),
    (e) => ({ ok: false, e })
  );
  check('登录学号 5 位**不是** 400（后端只在注册校验格式）', !(shortNo.ok === false && shortNo.e.code === 400),
    shortNo.ok ? 'mock 放行' : shortNo.e);
  await expectFailMsg('登录空学号 → 400', '/api/auth/login', 'POST', { studentNo: '   ', password: '123456' }, '请输入学号和密码');
  const login = await mock.run('/api/auth/login', 'POST', { studentNo: '202321010100001', password: '123456' });
  check('登录返回 token + userInfo', !!login.token && login.userInfo.userId === 1, Object.keys(login));
  await expectFail('注册昵称 1 字 400', '/api/auth/register', 'POST', { studentNo: '202321010100010', nickname: 'a', password: '123456' }, 400);
  await expectFail('注册昵称 13 字 400', '/api/auth/register', 'POST', { studentNo: '202321010100010', nickname: '一二三四五六七八九十一二三', password: '123456' }, 400);
  await expectFail('注册学号 5 位 400', '/api/auth/register', 'POST', { studentNo: '12345', nickname: '五六', password: '123456' }, 400);

  console.log('\n[9] 会话发起权限：私单只允许发布者（P0-4）');
  // 2004 = 当前用户（1）发布的未发布私单
  const convOwnPrivate = await mock.run('/api/conversations', 'POST', {
    peerId: 6,
    bizType: 'errand',
    bizId: 2004
  });
  check('自己发布的私单可以发起会话', !!convOwnPrivate.conversationId, convOwnPrivate);
  // 2008 = 别人（5）的私单：不拦的话，知道 publisherId + orderId 就能先插会话，
  // 再靠 isErrandChatPeer 拿到查看/接单授权（越权）
  await expectFailMsg(
    '别人的私单发起会话 → 403',
    '/api/conversations',
    'POST',
    { peerId: 5, bizType: 'errand', bizId: 2008 },
    '私单只能由发布者发起会话'
  );
  // 2001 = 大厅单：任何登录用户都能就它发起咨询
  const convHall = await mock.run('/api/conversations', 'POST', {
    peerId: 5,
    bizType: 'errand',
    bizId: 2001
  });
  check('大厅单可以自由发起会话', !!convHall.conversationId, convHall);
  await expectFailMsg(
    '订单不存在 → 404',
    '/api/conversations',
    'POST',
    { peerId: 5, bizType: 'errand', bizId: 999999 },
    '订单不存在'
  );

  console.log('\n[10] 大厅筛选：area / itemSize / timeType / sort（A 侧扩展契约）');
  // 断言写成「相对快照」的形式：前面 [1]~[9] 会新建订单，写死 id 列表会随用例增删而碎。
  const idsOf = (r) => (r.list || []).map((e) => e.orderId).join(',');
  const hallAll = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 50 });
  const base = hallAll.list;
  check('基线非空（否则下面全是假通过）', base.length >= 5, base.length);
  check('基线全部是 pending + hall', base.every((e) => e.status === 'pending' && e.visibility === 'hall'));

  /** 断言行集 = 基线里满足 pred 的那批（顺序仍按发布时间倒序） */
  const expectFiltered = async (name, query, pred) => {
    const r = await mock.run('/api/errands', 'GET', Object.assign({ page: 1, pageSize: 50 }, query));
    const want = base.filter(pred).map((e) => e.orderId).join(',');
    check(name, idsOf(r) === want && r.total === base.filter(pred).length, {
      got: idsOf(r),
      want: want,
      total: r.total
    });
    return r;
  };

  const sortLatest = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 50, sort: 'latest' });
  check('sort=latest 与不传等价', idsOf(sortLatest) === idsOf(hallAll), idsOf(sortLatest));

  const sortDesc = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 50, sort: 'reward_desc' });
  const descOk = sortDesc.list.every((e, i, a) => i === 0 || Number(a[i - 1].reward) >= Number(e.reward));
  check('sort=reward_desc 报酬单调不增', descOk, sortDesc.list.map((e) => e.reward));
  const sortAsc = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 50, sort: 'reward_asc' });
  const ascOk = sortAsc.list.every((e, i, a) => i === 0 || Number(a[i - 1].reward) <= Number(e.reward));
  check('sort=reward_asc 报酬单调不减', ascOk, sortAsc.list.map((e) => e.reward));
  check('排序不改变 total', sortDesc.total === hallAll.total && sortAsc.total === hallAll.total);

  // 同维度 OR
  await expectFiltered('area 同维度 OR（桃园+中心图书馆）', { area: '桃园,中心图书馆' }, (e) =>
    ['桃园', '中心图书馆'].indexOf(e.pickupArea) >= 0
  );
  await expectFiltered('itemSize 同维度 OR（small+medium）', { itemSize: 'small,medium' }, (e) =>
    ['small', 'medium'].indexOf(e.itemSize) >= 0
  );
  const timeOr = await expectFiltered('timeType 同维度 OR（asap+deadline）', { timeType: 'asap,deadline' }, (e) =>
    ['asap', 'deadline'].indexOf(e.timeType) >= 0
  );
  check('timeType 筛选排除 range 单', timeOr.list.every((e) => e.timeType !== 'range'));

  // 跨维度 AND
  await expectFiltered('跨维度 AND（中心图书馆 + small）', { area: '中心图书馆', itemSize: 'small' }, (e) =>
    e.pickupArea === '中心图书馆' && e.itemSize === 'small'
  );
  await expectFiltered(
    '跨维度 AND 无交集 → 空列表',
    { area: '桃园', timeType: 'asap' },
    (e) => e.pickupArea === '桃园' && e.timeType === 'asap'
  );

  // 空串 = 不限（前端「不限」不传参，但要能容忍误传空串）
  const emptyVal = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 50, area: '', itemSize: '  ' });
  check('筛选值为空串 → 视为不限', idsOf(emptyVal) === idsOf(hallAll), idsOf(emptyVal));

  // 筛选 + 分页共存：每页都要带同样的筛选条件，total 是筛选后总数而不是全表
  const smallAll = base.filter((e) => e.itemSize === 'small');
  const pg1 = await mock.run('/api/errands', 'GET', { page: 1, pageSize: 1, itemSize: 'small' });
  const pg2 = await mock.run('/api/errands', 'GET', { page: 2, pageSize: 1, itemSize: 'small' });
  check(
    '筛选后第 1 页 = 筛选结果的第 1 条',
    idsOf(pg1) === String(smallAll[0].orderId) && pg1.total === smallAll.length,
    idsOf(pg1) + '/' + pg1.total
  );
  check(
    '筛选后第 2 页（total 仍为筛选后总数）',
    idsOf(pg2) === String(smallAll[1].orderId) && pg2.total === smallAll.length,
    idsOf(pg2) + '/' + pg2.total
  );

  // 非法值：只断言 400 状态码。A 的实现还没推送到 dev，文案待其推送后逐字对齐。
  const filter400 = [
    ['area 非法片区', { area: '火星' }],
    ['area 部分非法', { area: '桃园,火星' }],
    ['itemSize 非法', { itemSize: 'huge' }],
    ['timeType=range 不是合法筛选项', { timeType: 'range' }],
    ['timeType 部分非法', { timeType: 'asap,range' }],
    ['sort 非法', { sort: 'popular' }]
  ];
  for (let i = 0; i < filter400.length; i += 1) {
    const q = Object.assign({ page: 1, pageSize: 50 }, filter400[i][1]);
    const r = await mock.run('/api/errands', 'GET', q).then(
      (ok) => ({ ok: true, data: ok }),
      (err) => ({ ok: false, err: err })
    );
    check(filter400[i][0] + ' → 400', r.ok === false && r.err.code === 400, r.ok ? 'mock 放行' : r.err);
  }

  console.log('\n========== 结果：' + pass + ' 通过 / ' + failCount + ' 失败 ==========');
  process.exit(failCount === 0 ? 0 : 1);
})();
