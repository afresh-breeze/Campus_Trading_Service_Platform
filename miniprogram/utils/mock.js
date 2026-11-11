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
// 口径说明（**必须复刻后端真实返回，不是复刻命名习惯**）：
//   items：itemId / title / price / originalPrice / conditionLevel / status
//          firstImage（后端 v_item_card 的字段名，不是 coverUrl）/ location / sellerNickname
//   errand_orders：orderId / title / pickupArea / pickupPlace / deliveryLocation
//          itemSize（small / medium / large，不是 S/M/L）/ reward / timeType / deadlineText / remark
//   conversations：conversationId / peerId / peerNickname / peerAvatar
//          lastMessage / lastTime / unreadCount / bizType / bizId（不是 relateType / relateId）
//   runners：serviceAreas / servicePlaces / itemSizes（全部是数组），且 area + timeType 必填
//
// 为什么要和后端字段一致：mock 故意"长得不一样"等于给联调埋雷 ——
// 本地一路通过，切 config.MOCK = false 后才发现图片全空、跑腿页 400。
// 页面统一经 utils/adapter.js 做一次字段转换，mock 只负责和后端同构。
//
// 地标约束：pickupArea / pickupPlace 必须取自 utils/campus.js 的 25 片区 / 52 地标，
// 文件末尾有开发期自检，出现清单外的值会在控制台 warn。
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
    firstImage: '/demo/book-calculus.png',
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
    title: '帮取一个中号快递（桃园 → 1 号宿舍楼）',
    pickupArea: '桃园',
    // 必须取自 utils/campus.js 的 52 地标；桃园属于宿舍园，地标即片区名
    pickupPlace: '桃园',
    deliveryLocation: '1 号宿舍楼 302',
    // item_size 是 ENUM('small','medium','large')，不是 S/M/L
    itemSize: 'medium',
    itemSizeName: '中号',
    reward: 4,
    timeType: 'deadline',
    deadlineText: '今天 18:30 前',
    status: 'pending',
    publisherId: 5,
    publisherName: '赵同学',
    remark: '在桃园 3 号驿站货架，取件码 8-2-1033',
    createdAt: '2026-11-08 15:02:00'
  },
  {
    orderId: 2002,
    title: '打印店取资料（中心图书馆 → 第16教学楼）',
    pickupArea: '中心图书馆',
    // 图书馆片区未细分到单体楼，地标即片区名
    pickupPlace: '中心图书馆',
    deliveryLocation: '第16教学楼 501',
    itemSize: 'small',
    itemSizeName: '小号',
    reward: 3,
    timeType: 'asap',
    deadlineText: '尽快',
    status: 'pending',
    publisherId: 6,
    publisherName: '孙同学',
    remark: '一沓 A4 纸，用文件袋装好了，在一楼打印店',
    createdAt: '2026-11-08 15:20:00'
  },
  {
    orderId: 2003,
    title: '快递代取（李园 → 5 号宿舍楼）',
    pickupArea: '李园',
    pickupPlace: '李园',
    deliveryLocation: '5 号宿舍楼 108',
    itemSize: 'large',
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

// 跑腿档案：字段严格对齐后端 runner_profiles 的返回口径（全部数组）
// 地标必须能在 utils/campus.js 的 52 条清单里查到，见文件末尾自检
const runnerProfiles = [
  {
    userId: 8,
    nickname: '跑腿小李',
    avatarUrl: '',
    creditScore: 96,
    completedCount: 32,
    serviceAreas: ['桃园', '北区教学区'],
    servicePlaces: ['第16教学楼', '第4教学楼（A/B栋）'],
    itemSizes: ['small', 'medium', 'large'],
    availabilityType: 'now',
    isOnline: true,
    timeSlots: [],
    basePrice: 3,
    remark: '中午和晚上都在北区，顺路可带'
  },
  {
    userId: 9,
    nickname: '阿杰',
    avatarUrl: '',
    creditScore: 88,
    completedCount: 18,
    serviceAreas: ['中心图书馆', '南区教学区'],
    servicePlaces: ['第30教学楼', '第31教学楼'],
    itemSizes: ['small', 'medium'],
    availabilityType: 'slot',
    isOnline: false,
    timeSlots: [],
    basePrice: 4,
    remark: '工作日 18:00 之后接单'
  }
];

// unreadCount 为派生字段：后端按 messages.is_read = 0 聚合得出，表内不存储。
const conversations = [
  {
    conversationId: 3001,
    peerId: 2,
    peerNickname: '林同学',
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
    peerNickname: '赵同学',
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

  // 找跑腿匹配：**字段与必填参数都复刻后端 GET /api/runners**（server/src/routes/runners.js）
  //   必填 area + timeType（asap / deadline / range），否则后端直接 400；
  //   返回 serviceAreas / servicePlaces / itemSizes 三个数组，不是 pickupArea / sizes 单值。
  //   mock 若对缺参放行，本地永远发现不了 400，联调时才炸。
  'GET /api/runners': (data) => {
    const area = (data.area || '').trim();
    if (!area) {
      return Promise.reject({ code: 400, message: '取件片区不能为空' });
    }
    const timeType = (data.timeType || '').trim();
    if (['asap', 'deadline', 'range'].indexOf(timeType) < 0) {
      return Promise.reject({ code: 400, message: '时间类型不合法' });
    }
    let list = runnerProfiles.filter((r) => r.serviceAreas.indexOf(area) > -1);
    if (data.itemSize) {
      list = list.filter(
        (r) => !r.itemSizes.length || r.itemSizes.indexOf(data.itemSize) > -1
      );
    }
    return delay({ list, total: list.length, page: 1, pageSize: 10 });
  },

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

// ---------------- 开发期数据自检 ----------------
// 地标只能来自 utils/campus.js 的 25 片区 / 52 地标，手写数据必然会漂。
// 这里在开发环境跑一次校验，出现清单外的值立刻 warn，避免演示时被追问
// 「东门菜鸟驿站是哪个片区」。
const campus = require('./campus');

function selfCheck() {
  const warnings = [];

  const checkPlace = (zone, place, where) => {
    if (!zone || !campus.isValidZone(zone)) {
      warnings.push(where + ' 片区「' + zone + '」不在 25 片区清单内');
      return;
    }
    if (place && !campus.isValidPlace(zone, place)) {
      warnings.push(where + ' 地标「' + place + '」不在片区「' + zone + '」的 52 地标清单内');
    }
  };

  errands.forEach((e) => checkPlace(e.pickupArea, e.pickupPlace, '订单 ' + e.orderId));

  runnerProfiles.forEach((r) => {
    r.serviceAreas.forEach((z) => {
      if (!campus.isValidZone(z)) {
        warnings.push('跑腿 ' + r.userId + ' 服务片区「' + z + '」不在 25 片区清单内');
      }
    });
    r.servicePlaces.forEach((pl) => {
      // 地标本身能反查所属片区，能查到就合法
      if (!campus.zoneOfPlace(pl)) {
        warnings.push('跑腿 ' + r.userId + ' 服务地标「' + pl + '」不在 52 地标清单内');
      }
    });
  });

  if (warnings.length) {
    console.warn('[mock] 地标数据不合规，共 ' + warnings.length + ' 处：\n' + warnings.join('\n'));
  }
  return warnings;
}

// 只在本地 mock 模式下自检，不影响真机
try {
  const config = require('../config');
  if (config && config.MOCK) {
    selfCheck();
  }
} catch (e) {
  // config 缺失时忽略，不阻塞启动
}

module.exports = { has, run, selfCheck };
