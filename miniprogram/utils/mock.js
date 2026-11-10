/**
 * 本地模拟数据（B 成员：公共层，可选）
 * ------------------------------------------------------------------
 * 用途：A 的 server 还没跑起来时，让页面能点、能跳、能看到数据。
 * 对接真实后端时：把 config.js 里的 MOCK 改成 false 即可，无需改页面代码。
 * 约定：键为 `METHOD url`，值为处理函数 (data) => Promise<resolvedData>
 */
const store = {
  nextId: 1000
};

function delay(data, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms || 260));
}

function uid() {
  store.nextId += 1;
  return store.nextId;
}

// ---------------- 假数据 ----------------
// 口径说明（与后端 schema 对齐）：
//   items：itemId / title / price / originalPrice / conditionLevel / status
//          coverUrl / location（不是 campus）/ sellerNickname / description
//   errand_orders：orderId / title / pickupArea / pickupPlace / deliveryLocation
//          itemSize / itemSizeName / reward / timeType / deadlineText / remark
//   conversations：conversationId / peerId / peerName / peerAvatar
//          lastMessage / lastTime / bizType / bizId（不是 relateType / relateId）
// 所有地区值均取自 utils/campus.js 的 25 个固定片区，禁止出现"东校区/西校区"。
const cat = [
  { id: 1, name: '教材书籍', code: 'book' },
  { id: 2, name: '数码电子', code: 'digital' },
  { id: 3, name: '生活用品', code: 'life' },
  { id: 4, name: '运动户外', code: 'sport' },
  { id: 5, name: '其他', code: 'other' }
];

const items = [
  {
    itemId: 1001,
    title: '高等数学 第七版 上册',
    price: 18,
    originalPrice: 46,
    coverUrl: '',
    categoryId: 1,
    categoryName: '教材书籍',
    conditionLevel: 'good',
    status: 'on_sale',
    location: '中心图书馆',
    sellerId: 2,
    sellerNickname: '林同学',
    viewCount: 128,
    createdAt: '2026-11-07 10:20:00',
    isBook: true,
    book: { title: '高等数学', author: '同济大学数学系', publisher: '高等教育出版社', isbn: '9787040396638', edition: '第七版' },
    description: '只用了一学期，无笔记无划线，可小刀。'
  },
  {
    itemId: 1002,
    title: '罗技 M720 无线鼠标',
    price: 95,
    originalPrice: 249,
    coverUrl: '',
    categoryId: 2,
    categoryName: '数码电子',
    conditionLevel: 'like_new',
    status: 'on_sale',
    location: '南区教学区',
    sellerId: 3,
    sellerNickname: '王同学',
    viewCount: 64,
    createdAt: '2026-11-08 09:05:00',
    isBook: false,
    description: '九成新，送电池，功能一切正常。'
  },
  {
    itemId: 1003,
    title: '宿舍折叠小桌板',
    price: 25,
    originalPrice: 59,
    coverUrl: '',
    categoryId: 3,
    categoryName: '生活用品',
    conditionLevel: 'fair',
    status: 'on_sale',
    location: '桃园',
    sellerId: 4,
    sellerNickname: '陈同学',
    viewCount: 39,
    createdAt: '2026-11-08 12:41:00',
    isBook: false,
    description: '搬宿舍出，桌面无划痕。'
  }
];

const errands = [
  {
    orderId: 2001,
    title: '帮取一个中号外卖（东门 → 1 号宿舍楼）',
    pickupArea: '桃园',
    pickupPlace: '东门菜鸟驿站',
    deliveryLocation: '1 号宿舍楼 302',
    itemSize: 'M',
    itemSizeName: '中号',
    reward: 4,
    timeType: 'deadline',
    deadlineText: '今天 18:30 前',
    status: 'pending',
    publisherId: 5,
    publisherName: '赵同学',
    remark: '在驿站 3 号货架，取件码 8-2-1033',
    createdAt: '2026-11-08 15:02:00'
  },
  {
    orderId: 2002,
    title: '打印店取资料（中心图书馆 → 实验楼 A）',
    pickupArea: '中心图书馆',
    pickupPlace: '图书馆一楼打印店',
    deliveryLocation: '实验楼 A 栋 501',
    itemSize: 'S',
    itemSizeName: '小号',
    reward: 3,
    timeType: 'asap',
    deadlineText: '尽快',
    status: 'pending',
    publisherId: 6,
    publisherName: '孙同学',
    remark: '一沓 A4 纸，用文件袋装好了',
    createdAt: '2026-11-08 15:20:00'
  },
  {
    orderId: 2003,
    title: '快递代取（丰巢 → 5 号宿舍楼）',
    pickupArea: '李园',
    pickupPlace: '南门丰巢柜',
    deliveryLocation: '5 号宿舍楼 108',
    itemSize: 'L',
    itemSizeName: '大号',
    reward: 6,
    timeType: 'range',
    deadlineText: '16:00 - 18:00',
    status: 'taken',
    publisherId: 7,
    publisherName: '周同学',
    remark: '比较重的箱子，麻烦小心',
    createdAt: '2026-11-08 14:10:00'
  }
];

// unreadCount 为派生字段：后端按 messages.is_read = 0 聚合得出，表内不存储。
const conversations = [
  {
    conversationId: 3001,
    peerId: 2,
    peerName: '林同学',
    peerAvatar: '',
    lastMessage: '好的，那我们五点在图书馆门口见',
    lastTime: '2026-11-08 15:31:00',
    unreadCount: 2,
    bizType: 'item',
    bizId: 1001
  },
  {
    conversationId: 3002,
    peerId: 5,
    peerName: '赵同学',
    peerAvatar: '',
    lastMessage: '取件码发你了，麻烦快点哦',
    lastTime: '2026-11-08 14:58:00',
    unreadCount: 0,
    bizType: 'errand',
    bizId: 2001
  }
];

const messages = {
  3001: [
    { id: 1, conversationId: 3001, senderId: 2, content: '同学你好，高数上册还在吗？', createdAt: '2026-11-08 15:20:00' },
    { id: 2, conversationId: 3001, senderId: 1, content: '在的，18 元，可以面交', createdAt: '2026-11-08 15:22:00' },
    { id: 3, conversationId: 3001, senderId: 2, content: '好的，那我们五点在图书馆门口见', createdAt: '2026-11-08 15:31:00' }
  ],
  3002: [
    { id: 4, conversationId: 3002, senderId: 5, content: '接单了吗？', createdAt: '2026-11-08 14:50:00' },
    { id: 5, conversationId: 3002, senderId: 1, content: '马上出发，十分钟到', createdAt: '2026-11-08 14:55:00' },
    { id: 6, conversationId: 3002, senderId: 5, content: '取件码发你了，麻烦快点哦', createdAt: '2026-11-08 14:58:00' }
  ]
};

const currentUser = {
  id: 1,
  studentNo: '2023210101',
  nickname: '小 B',
  avatarUrl: '',
  campus: '桃园',
  phone: '13800000000',
  creditScore: 100,
  completedErrands: 7
};

// ---------------- 路由表 ----------------
const routes = {
  'POST /api/auth/login': (data) =>
    delay({
      token: 'mock_token_' + Date.now(),
      userInfo: Object.assign({}, currentUser, { studentNo: data.studentNo || currentUser.studentNo })
    }),

  'POST /api/auth/register': (data) =>
    delay({
      token: 'mock_token_' + Date.now(),
      userInfo: Object.assign({}, currentUser, {
        studentNo: data.studentNo || currentUser.studentNo,
        nickname: data.nickname || currentUser.nickname
      })
    }),

  'GET /api/auth/me': () => delay(Object.assign({}, currentUser)),

  'PUT /api/users/me': (data) => delay(Object.assign({}, currentUser, data)),

  'GET /api/items': (data) => {
    const page = Number(data.page) || 1;
    const pageSize = Number(data.pageSize) || 10;
    let list = items.slice();
    if (data.categoryId) list = list.filter((i) => String(i.categoryId) === String(data.categoryId));
    if (data.keyword) list = list.filter((i) => i.title.indexOf(data.keyword) > -1);
    return delay({ list: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize });
  },

  'GET /api/items/:id': (data) => {
    const found = items.find((i) => String(i.itemId) === String(data.id));
    return found ? delay(Object.assign({}, found, { isFavorited: false })) : Promise.reject({ code: 404, message: '商品不存在' });
  },

  'POST /api/items': (data) => {
    const item = Object.assign({ itemId: uid(), status: 'on_sale', viewCount: 0, createdAt: '2026-11-08 16:00:00' }, data);
    items.unshift(item);
    return delay(item);
  },

  'GET /api/books/search': (data) =>
    delay({
      list: [
        { title: '高等数学', author: '同济大学数学系', publisher: '高等教育出版社', isbn: '9787040396638', edition: '第七版' },
        { title: '线性代数', author: '同济大学数学系', publisher: '高等教育出版社', isbn: '9787040396607', edition: '第六版' }
      ]
    }),

  'GET /api/errands': (data) => {
    let list = errands.filter((i) => i.status === 'pending');
    if (data.pickupArea) list = list.filter((i) => i.pickupArea === data.pickupArea);
    return delay({ list, total: list.length, page: 1, pageSize: 10 });
  },

  'GET /api/errands/:id': (data) => {
    const found = errands.find((i) => String(i.orderId) === String(data.id));
    if (!found) return Promise.reject({ code: 404, message: '订单不存在' });
    return delay(Object.assign({}, found, {
      canTake: found.status === 'pending',
      canComplete: false,
      canCancel: found.status === 'pending',
      canRelease: found.status === 'taken'
    }));
  },

  'POST /api/errands': (data) => {
    const errand = Object.assign({ orderId: uid(), status: 'pending', publisherId: 1, publisherName: currentUser.nickname, createdAt: '2026-11-08 16:00:00' }, data);
    errands.unshift(errand);
    return delay(errand);
  },

  'POST /api/errands/:id/take': (data) => {
    const found = errands.find((i) => String(i.orderId) === String(data.id));
    if (found) found.status = 'taken';
    return delay({ ok: true });
  },

  'POST /api/errands/:id/complete': (data) => {
    const found = errands.find((i) => String(i.orderId) === String(data.id));
    if (found) found.status = 'completed';
    return delay({ ok: true });
  },

  'GET /api/errands/mine': (data) => {
    const isTaken = data.role === 'runner';
    const list = errands.filter((i) => (isTaken ? i.status !== 'pending' : i.publisherId === 1));
    return delay({ list, total: list.length, page: 1, pageSize: 10 });
  },

  'GET /api/runners': () =>
    delay({
      list: [
        { userId: 8, nickname: '跑腿小李', pickupArea: '桃园', pickupPlace: '东门菜鸟驿站', sizes: ['S', 'M', 'L'], rating: 4.9, completedCount: 32 },
        { userId: 9, nickname: '阿杰', pickupArea: '中心图书馆', pickupPlace: '图书馆一楼打印店', sizes: ['S', 'M'], rating: 4.7, completedCount: 18 }
      ]
    }),

  'GET /api/conversations': () => delay({ list: conversations, total: conversations.length, page: 1, pageSize: 10 }),

  'GET /api/conversations/:id/messages': (data) => {
    const cid = data.id || data.conversationId;
    const list = messages[cid] || [];
    return delay({ list, total: list.length });
  },

  'POST /api/conversations/:id/messages': (data) => {
    const key = data.id || data.conversationId || 3001;
    const msg = {
      id: uid(),
      conversationId: Number(key),
      senderId: 1,
      // msg_type 只允许 text / image，与 schema.sql 一致
      msgType: data.msgType === 'image' ? 'image' : 'text',
      content: data.content || '',
      isRead: 0,
      createdAt: '2026-11-08 16:05:00'
    };
    if (!messages[key]) messages[key] = [];
    messages[key].push(msg);
    return delay(msg);
  },

  'GET /api/categories': () => delay(cat),

  'GET /api/health': () => delay({ status: 'ok', mock: true })
};

/**
 * 路由匹配。
 * 后端真实路径带路径参数（如 /api/items/:id），mock 的键也按同样的 :param 形式登记，
 * 因此不能直接字符串相等，需要把 :param 段当成通配来比对。
 * 返回 { handler, params }；未命中返回 null。
 */
function match(url, method) {
  const path = url.split('?')[0];
  const m = (method || 'GET').toUpperCase();
  const key = m + ' ' + path;

  // 1) 精确命中
  if (routes[key]) return { handler: routes[key], params: {} };

  // 2) 按 :param 通配命中
  const segs = path.split('/');
  const keys = Object.keys(routes);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const sp = k.indexOf(' ');
    if (sp < 0) continue;
    if (k.slice(0, sp) !== m) continue;
    const kSegs = k.slice(sp + 1).split('/');
    if (kSegs.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let j = 0; j < kSegs.length; j++) {
      if (kSegs[j].charAt(0) === ':') {
        params[kSegs[j].slice(1)] = decodeURIComponent(segs[j]);
      } else if (kSegs[j] !== segs[j]) {
        ok = false; break;
      }
    }
    if (ok) return { handler: routes[k], params: params };
  }
  return null;
}

/** 是否存在对应的模拟路由 */
function has(url, method) {
  return !!match(url, method);
}

/** 执行模拟请求 */
function run(url, method, data) {
  const hit = match(url, method);
  if (!hit) {
    const key = (method || 'GET').toUpperCase() + ' ' + url.split('?')[0];
    return Promise.reject({ code: 404, message: '未登记的模拟接口：' + key });
  }
  try {
    // 把路径参数并入入参，页面调用方式与真实接口保持一致
    const payload = Object.assign({}, data || {}, hit.params);
    return Promise.resolve(hit.handler(payload));
  } catch (e) {
    return Promise.reject({ code: -1, message: e.message || '模拟数据异常' });
  }
}

module.exports = { has, run };
