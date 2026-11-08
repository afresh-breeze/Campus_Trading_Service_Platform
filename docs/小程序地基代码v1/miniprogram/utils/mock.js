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
const cat = [
  { id: 1, name: '教材书籍', code: 'book' },
  { id: 2, name: '数码电子', code: 'digital' },
  { id: 3, name: '生活用品', code: 'life' },
  { id: 4, name: '运动户外', code: 'sport' },
  { id: 5, name: '其他', code: 'other' }
];

const items = [
  {
    id: 1001,
    title: '高等数学 第七版 上册',
    price: 18,
    coverUrl: '',
    categoryId: 1,
    categoryName: '教材书籍',
    status: 'on_sale',
    campus: '东校区',
    sellerId: 2,
    sellerName: '林同学',
    viewCount: 128,
    createdAt: '2026-11-07 10:20:00',
    isBook: true,
    book: { title: '高等数学', author: '同济大学数学系', publisher: '高等教育出版社', isbn: '9787040396638', edition: '第七版' },
    description: '只用了一学期，无笔记无划线，可小刀。'
  },
  {
    id: 1002,
    title: '罗技 M720 无线鼠标',
    price: 95,
    coverUrl: '',
    categoryId: 2,
    categoryName: '数码电子',
    status: 'on_sale',
    campus: '西校区',
    sellerId: 3,
    sellerName: '王同学',
    viewCount: 64,
    createdAt: '2026-11-08 09:05:00',
    isBook: false,
    description: '九成新，送电池，功能一切正常。'
  },
  {
    id: 1003,
    title: '宿舍折叠小桌板',
    price: 25,
    coverUrl: '',
    categoryId: 3,
    categoryName: '生活用品',
    status: 'on_sale',
    campus: '东校区',
    sellerId: 4,
    sellerName: '陈同学',
    viewCount: 39,
    createdAt: '2026-11-08 12:41:00',
    isBook: false,
    description: '搬宿舍出，桌面无划痕。'
  }
];

const errands = [
  {
    id: 2001,
    title: '帮取一个中号外卖（东门→1 号宿舍楼）',
    areaName: '东校区',
    landmark: '东门菜鸟驿站',
    sizeCode: 'M',
    sizeName: '中号',
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
    id: 2002,
    title: '打印店取资料（图书馆→实验楼 A）',
    areaName: '西校区',
    landmark: '图书馆一楼打印店',
    sizeCode: 'S',
    sizeName: '小号',
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
    id: 2003,
    title: '快递代取（丰巢→ 5 号宿舍楼）',
    areaName: '东校区',
    landmark: '南门丰巢柜',
    sizeCode: 'L',
    sizeName: '大号',
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

const conversations = [
  {
    id: 3001,
    peerName: '林同学',
    peerAvatar: '',
    lastMessage: '好的，那我们五点在图书馆门口见',
    lastMessageAt: '2026-11-08 15:31:00',
    unreadCount: 2,
    relateType: 'item',
    relateId: 1001
  },
  {
    id: 3002,
    peerName: '赵同学',
    peerAvatar: '',
    lastMessage: '取件码发你了，麻烦快点哦',
    lastMessageAt: '2026-11-08 14:58:00',
    unreadCount: 0,
    relateType: 'errand',
    relateId: 2001
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
  campus: '东校区',
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
        nickname: data.nickname || currentUser.nickname,
        campus: data.campus || currentUser.campus
      })
    }),

  'GET /api/users/me': () => delay(Object.assign({}, currentUser)),

  'PUT /api/users/me': (data) => delay(Object.assign({}, currentUser, data)),

  'GET /api/items': (data) => {
    const page = Number(data.page) || 1;
    const pageSize = Number(data.pageSize) || 10;
    let list = items.slice();
    if (data.categoryId) list = list.filter((i) => String(i.categoryId) === String(data.categoryId));
    if (data.keyword) list = list.filter((i) => i.title.indexOf(data.keyword) > -1);
    return delay({ list: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize });
  },

  'GET /api/items/detail': (data) => {
    const found = items.find((i) => String(i.id) === String(data.id));
    return found ? delay(Object.assign({}, found, { isFavorited: false })) : Promise.reject({ code: 404, message: '商品不存在' });
  },

  'POST /api/items': (data) => {
    const item = Object.assign({ id: uid(), status: 'on_sale', viewCount: 0, createdAt: '2026-11-08 16:00:00' }, data);
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

  'GET /api/errands/hall': (data) => {
    let list = errands.filter((i) => i.status === 'pending');
    if (data.areaName) list = list.filter((i) => i.areaName === data.areaName);
    return delay({ list, total: list.length, page: 1, pageSize: 10 });
  },

  'GET /api/errands/detail': (data) => {
    const found = errands.find((i) => String(i.id) === String(data.id));
    if (!found) return Promise.reject({ code: 404, message: '订单不存在' });
    return delay(Object.assign({}, found, {
      canTake: found.status === 'pending',
      canComplete: false,
      canCancel: found.status === 'pending',
      canRelease: found.status === 'taken'
    }));
  },

  'POST /api/errands': (data) => {
    const errand = Object.assign({ id: uid(), status: 'pending', publisherId: 1, publisherName: currentUser.nickname, createdAt: '2026-11-08 16:00:00' }, data);
    errands.unshift(errand);
    return delay(errand);
  },

  'POST /api/errands/take': (data) => {
    const found = errands.find((i) => String(i.id) === String(data.id));
    if (found) found.status = 'taken';
    return delay({ ok: true });
  },

  'POST /api/errands/complete': (data) => {
    const found = errands.find((i) => String(i.id) === String(data.id));
    if (found) found.status = 'completed';
    return delay({ ok: true });
  },

  'GET /api/errands/mine': (data) => {
    const isTaken = data.role === 'runner';
    const list = errands.filter((i) => (isTaken ? i.status !== 'pending' : i.publisherId === 1));
    return delay({ list, total: list.length, page: 1, pageSize: 10 });
  },

  'GET /api/errands/runners': () =>
    delay({
      list: [
        { userId: 8, nickname: '跑腿小李', areaName: '东校区', landmarks: ['东门菜鸟驿站', '南门丰巢柜'], sizes: ['S', 'M', 'L'], rating: 4.9, completedCount: 32 },
        { userId: 9, nickname: '阿杰', areaName: '东校区', landmarks: ['图书馆一楼打印店'], sizes: ['S', 'M'], rating: 4.7, completedCount: 18 }
      ]
    }),

  'GET /api/conversations': () => delay({ list: conversations, total: conversations.length, page: 1, pageSize: 10 }),

  'GET /api/conversations/messages': (data) => delay({ list: messages[data.conversationId] || [], total: (messages[data.conversationId] || []).length }),

  'POST /api/conversations/messages': (data) => {
    const key = data.conversationId || 3001;
    const msg = { id: uid(), conversationId: Number(key), senderId: 1, content: data.content, createdAt: '2026-11-08 16:05:00' };
    if (!messages[key]) messages[key] = [];
    messages[key].push(msg);
    return delay(msg);
  },

  'GET /api/categories': () => delay(cat),

  'GET /api/health': () => delay({ status: 'ok', mock: true })
};

/** 是否存在对应的模拟路由 */
function has(url, method) {
  const key = (method || 'GET').toUpperCase() + ' ' + url.split('?')[0];
  return !!routes[key];
}

/** 执行模拟请求 */
function run(url, method, data) {
  const key = (method || 'GET').toUpperCase() + ' ' + url.split('?')[0];
  const handler = routes[key];
  if (!handler) return Promise.reject({ code: 404, message: '未登记的模拟接口：' + key });
  try {
    return Promise.resolve(handler(data || {}));
  } catch (e) {
    return Promise.reject({ code: -1, message: e.message || '模拟数据异常' });
  }
}

module.exports = { has, run };
