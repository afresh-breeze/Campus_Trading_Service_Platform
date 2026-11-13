/**
 * 本地模拟数据（B 成员：公共层，可选）
 * ------------------------------------------------------------------
 * 用途：A 的 server 还没跑起来时，让页面能点、能跳、能看到数据。
 * 对接真实后端时：把 config.js 里的 MOCK 改成 false 即可，无需改页面代码。
 * 约定：键为 `METHOD url`，值为处理函数 (data) => Promise<resolvedData>
 *
 * ★ 同构原则（2026-11-11 A 复盘后重写；2026-11-12 按 A 全面排查再对齐）
 *   当前登记 39 条路由 = 服务端 40 条 − 1 条不适合 mock 的 POST /api/upload（真机文件上传）。
 *   服务端新增接口必须同步这里 + scripts/mock-contract-test.js，否则 MOCK 模式直接报错。
 *   本文件不是"随便造点假数据"，而是**复刻后端契约**：
 *     · 入参校验与 400 文案 → 对齐 server/src/routes/*.js
 *     · 返回字段名与层级     → 对齐 docs/接口文档.md（不是对齐旧命名习惯）
 *     · canTake/canComplete 等派生字段 → 按"当前登录用户身份 + 订单状态"计算
 *   理由：mock 一旦与后端分叉，本地全绿、config.MOCK=false 立刻露馅，
 *   联调成本远高于写这份对照表。新增后端接口时必须同步在这里补一条。
 *
 * 对照关系（查证用）：
 *   登录注册 users  → server/src/routes/auth.js、users.js
 *   商品/收藏       → server/src/routes/items.js、favorites.js
 *   书目            → server/src/routes/books.js
 *   代取            → server/src/routes/errands.js（can* 口径见 GET /:id）
 *   跑腿匹配        → server/src/routes/runners.js（area+place+timeType 全套校验）
 *   聊天            → server/src/routes/chat.js（messageId / isMine / 发消息只回 id+时间）
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

/** 统一失败：与后端 fail(res, code, message) 同构 */
function fail(code, message) {
  return Promise.reject({ code: code, message: message });
}

function readTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

function parseNonNegativeInt(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  return null;
}

/** 与后端 parsePagination 一致：pageSize 上限 50，非法返回 null */
function parsePagination(data) {
  const q = data || {};
  const page = q.page === undefined || q.page === '' ? 1 : parsePositiveInt(q.page);
  const pageSize = q.pageSize === undefined || q.pageSize === '' ? 10 : parsePositiveInt(q.pageSize);
  if (!page || !pageSize || pageSize > 50) return null;
  return { page: page, pageSize: pageSize };
}

function pageOf(list, pg) {
  const offset = (pg.page - 1) * pg.pageSize;
  return list.slice(offset, offset + pg.pageSize);
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** Date -> 'YYYY-MM-DD HH:mm:ss'（后端统一返回该格式） */
function fmtDate(d) {
  return (
    d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
    ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
  );
}

/** 'YYYY-MM-DD HH:mm:ss' -> Date；格式不对返回 null（对齐后端 parseDateTime） */
function parseDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const parts = value.split(' ');
  const d = parts[0].split('-').map(Number);
  const t = parts[1].split(':').map(Number);
  if (t[0] > 23 || t[1] > 59) return null;
  return new Date(d[0], d[1] - 1, d[2], t[0], t[1], t[2]);
}

/** 合并日期 + 'HH:mm' → Date（对齐后端 combineDateTime） */
function combineDateTime(dateStr, timeStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  if (typeof timeStr !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return null;
  const d = dateStr.split('-').map(Number);
  const t = timeStr.split(':').map(Number);
  return new Date(d[0], d[1] - 1, d[2], t[0], t[1], 0);
}

function weekdayOf(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function dateOnlyOf(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

/**
 * 时间计划与查询窗口是否重叠（对齐 server/src/utils/runner.js slotOverlapsWindow）
 * timeSlots 只支持后端定义的两种形态：
 *   { type:'once',   date:'2026-11-12', start:'18:00', end:'20:00' }
 *   { type:'weekly', from:'2026-11-01', weekdays:[1,3,5], start:'18:00', end:'22:00' }
 */
function slotOverlapsWindow(slots, windowStart, windowEnd) {
  if (!(windowStart instanceof Date) || !(windowEnd instanceof Date) || windowStart >= windowEnd) {
    return false;
  }
  const list = Array.isArray(slots) ? slots : [];
  for (let i = 0; i < list.length; i++) {
    const slot = list[i];
    if (!slot || typeof slot !== 'object') continue;
    if (slot.type === 'once') {
      const s = combineDateTime(slot.date, slot.start);
      const e = combineDateTime(slot.date, slot.end);
      if (s && e && s < windowEnd && e > windowStart) return true;
    } else if (slot.type === 'weekly') {
      if (typeof slot.from !== 'string' || !Array.isArray(slot.weekdays)) continue;
      const from = parseDateTime(slot.from + ' 00:00:00');
      if (!from) continue;
      const startDay = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());
      let cursor = from > startDay ? from : startDay;
      for (let k = 0; k < 8 && cursor <= windowEnd; k++) {
        if (slot.weekdays.indexOf(weekdayOf(cursor)) > -1) {
          const s = combineDateTime(dateOnlyOf(cursor), slot.start);
          const e = combineDateTime(dateOnlyOf(cursor), slot.end);
          if (s && e && s < windowEnd && e > windowStart) return true;
        }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
    }
  }
  return false;
}

/** 有效在线（对齐后端 effectiveOnline） */
function effectiveOnline(profile, now) {
  const p = profile || {};
  if (p.manualUntil) {
    const until = parseDateTime(p.manualUntil);
    if (until && until > now) return !!p.isOnline;
  }
  if (p.availabilityType === 'now') return !!p.isOnline;
  return slotOverlapsWindow(p.timeSlots, now, new Date(now.getTime() + 1000));
}

// ============================================================
// 数据区
// ============================================================

// 分类：后端 categories 表 -> { categoryId, name, sortNo }
const categories = [
  { categoryId: 1, name: '教材书籍', sortNo: 1 },
  { categoryId: 2, name: '数码电子', sortNo: 2 },
  { categoryId: 3, name: '生活用品', sortNo: 3 },
  { categoryId: 4, name: '运动户外', sortNo: 4 },
  { categoryId: 5, name: '其他', sortNo: 5 }
];

// 书目：对齐 server/src/routes/books.js 的 BOOK_FIELDS
const books = [
  {
    bookId: 1,
    isbn: '9787040396638',
    title: '高等数学（第七版）上册',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第七版',
    priceRef: 46.0,
    coverUrl: ''
  },
  {
    bookId: 2,
    isbn: '9787040396607',
    title: '线性代数（第六版）',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第六版',
    priceRef: 32.5,
    coverUrl: ''
  }
];

// 用户：公开字段口径对齐 GET /api/users/:id（userId / nickname / avatarUrl / creditScore）
const users = [
  { userId: 1, studentNo: '202321010100001', nickname: '小 B', avatarUrl: '', creditScore: 100, phone: '13800000000', status: 'active' },
  { userId: 2, studentNo: '202321010100002', nickname: '林同学', avatarUrl: '', creditScore: 92, phone: '', status: 'active' },
  { userId: 3, studentNo: '202321010100003', nickname: '王同学', avatarUrl: '', creditScore: 88, phone: '', status: 'active' },
  { userId: 4, studentNo: '202321010100004', nickname: '陈同学', avatarUrl: '', creditScore: 80, phone: '', status: 'active' },
  { userId: 5, studentNo: '202321010100005', nickname: '赵同学', avatarUrl: '', creditScore: 85, phone: '', status: 'active' },
  { userId: 6, studentNo: '202321010100006', nickname: '孙同学', avatarUrl: '', creditScore: 90, phone: '', status: 'active' },
  { userId: 7, studentNo: '202321010100007', nickname: '周同学', avatarUrl: '', creditScore: 76, phone: '', status: 'active' },
  { userId: 8, studentNo: '202321010100008', nickname: '跑腿小李', avatarUrl: '', creditScore: 96, phone: '', status: 'active' },
  { userId: 9, studentNo: '202321010100009', nickname: '阿杰', avatarUrl: '', creditScore: 86, phone: '', status: 'active' }
];

function userOf(userId) {
  for (let i = 0; i < users.length; i++) {
    if (Number(users[i].userId) === Number(userId)) return users[i];
  }
  return null;
}

const CURRENT_USER_ID = 1;

// 商品：字段完全对齐 v_item_list / CARD_FIELDS（firstImage、itemType、bookId、bookTitle）
// 注意：不再使用 isBook + book:{} 这种嵌套写法，adapter.toItem 只认扁平字段。
const items = [
  {
    itemId: 1001,
    sellerId: 2,
    sellerNickname: '林同学',
    sellerAvatar: '',
    sellerCreditScore: 92,
    categoryId: 1,
    categoryName: '教材书籍',
    bookId: 1,
    bookTitle: '高等数学（第七版）上册',
    itemType: 'book',
    title: '高等数学 第七版 上册',
    description: '只用了一学期，无笔记无划线，可小刀。',
    price: 18.0,
    originalPrice: 46.0,
    conditionLevel: 'good',
    negotiable: true,
    location: '中心图书馆',
    status: 'on_sale',
    viewCount: 128,
    favoriteCount: 6,
    createdAt: '2026-11-07 10:20:00',
    firstImage: '/demo/book-calculus.png'
  },
  {
    itemId: 1002,
    sellerId: 3,
    sellerNickname: '王同学',
    sellerAvatar: '',
    sellerCreditScore: 88,
    categoryId: 2,
    categoryName: '数码电子',
    bookId: null,
    bookTitle: null,
    itemType: 'normal',
    title: '罗技 M720 无线鼠标',
    description: '九成新，送电池，功能一切正常。',
    price: 95.0,
    originalPrice: 249.0,
    conditionLevel: 'like_new',
    negotiable: true,
    location: '南区教学区',
    status: 'on_sale',
    viewCount: 64,
    favoriteCount: 3,
    createdAt: '2026-11-08 09:05:00',
    firstImage: ''
  },
  {
    itemId: 1003,
    sellerId: 4,
    sellerNickname: '陈同学',
    sellerAvatar: '',
    sellerCreditScore: 80,
    categoryId: 3,
    categoryName: '生活用品',
    bookId: null,
    bookTitle: null,
    itemType: 'normal',
    title: '宿舍折叠小桌板',
    description: '搬宿舍出，桌面无划痕。',
    price: 25.0,
    originalPrice: 59.0,
    conditionLevel: 'fair',
    negotiable: false,
    location: '桃园',
    status: 'on_sale',
    viewCount: 39,
    favoriteCount: 1,
    createdAt: '2026-11-08 12:41:00',
    firstImage: ''
  },
  {
    // 归属当前登录用户（sellerId = 1），让「我的发布」和个人中心统计有数据
    itemId: 1006,
    sellerId: 1,
    sellerNickname: '小 B',
    sellerAvatar: '',
    sellerCreditScore: 100,
    categoryId: 3,
    categoryName: '生活用品',
    bookId: null,
    bookTitle: null,
    itemType: 'normal',
    title: '小米台灯（可调色温）',
    description: '用了一个学期，灯罩无划痕，插头完好。',
    price: 35.0,
    originalPrice: 89.0,
    conditionLevel: 'like_new',
    negotiable: true,
    location: '桃园',
    status: 'on_sale',
    viewCount: 17,
    favoriteCount: 0,
    createdAt: '2026-11-09 20:15:00',
    firstImage: ''
  }
];

/**
 * 代取订单：字段对齐 errands.js 的 BASE_FIELDS / DETAIL_FIELDS
 * 注意后端**没有** title / deadlineText / itemSizeName / publisherName，
 * 展示用「取件地 → 送达地」和 timeType+deadline 自己拼，不能靠 mock 多给字段糊过去。
 */
const errands = [
  {
    orderId: 2001,
    publisherId: 5,
    publisherNickname: '赵同学',
    publisherAvatar: '',
    publisherCreditScore: 85,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '1 号宿舍楼 302',
    itemSize: 'medium',
    itemDesc: '一个中号快递',
    remark: '在桃园 3 号驿站货架，取件码 8-2-1033',
    reward: 4.0,
    timeType: 'deadline',
    timeStart: null,
    deadline: '2026-11-12 18:30:00',
    status: 'pending',
    visibility: 'hall',
    createdAt: '2026-11-08 15:02:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    orderId: 2002,
    publisherId: 6,
    publisherNickname: '孙同学',
    publisherAvatar: '',
    publisherCreditScore: 90,
    pickupArea: '中心图书馆',
    pickupPlace: '中心图书馆',
    deliveryLocation: '第16教学楼 501',
    itemSize: 'small',
    itemDesc: '一沓 A4 纸，用文件袋装好了',
    remark: '在一楼打印店',
    reward: 3.0,
    timeType: 'asap',
    timeStart: null,
    deadline: null,
    status: 'pending',
    visibility: 'hall',
    createdAt: '2026-11-08 15:20:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    orderId: 2003,
    publisherId: 7,
    publisherNickname: '周同学',
    publisherAvatar: '',
    publisherCreditScore: 76,
    pickupArea: '李园',
    pickupPlace: '李园',
    deliveryLocation: '5 号宿舍楼 108',
    itemSize: 'large',
    itemDesc: '比较重的箱子',
    remark: '麻烦小心',
    reward: 6.0,
    timeType: 'range',
    timeStart: '2026-11-12 16:00:00',
    deadline: '2026-11-12 18:00:00',
    status: 'taken',
    visibility: 'hall',
    createdAt: '2026-11-08 14:10:00',
    runnerId: 9,
    runnerNickname: '阿杰',
    runnerAvatar: '',
    takenAt: '2026-11-08 14:12:00',
    completedAt: null
  },
  {
    // 当前用户发布的**私单**（未发布到大厅）：canEdit/canPublish = true，canCancel = true，canTake = false
    // 私单不出现在 GET /api/errands（大厅），只可能从「我的代取」「详情页」「会话卡片」进入
    orderId: 2004,
    publisherId: 1,
    publisherNickname: '小 B',
    publisherAvatar: '',
    publisherCreditScore: 100,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '2 号宿舍楼 416',
    itemSize: 'small',
    itemDesc: '一个小快递盒',
    remark: '驿站取件码 5-1-2266，到楼下打电话',
    reward: 3.0,
    timeType: 'asap',
    timeStart: null,
    deadline: null,
    status: 'pending',
    visibility: 'private',
    createdAt: '2026-11-09 19:40:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    // 当前用户接单并已完成（runnerId = 1）：个人中心「完成」计数用
    orderId: 2005,
    publisherId: 6,
    publisherNickname: '孙同学',
    publisherAvatar: '',
    publisherCreditScore: 90,
    pickupArea: '中心图书馆',
    pickupPlace: '中心图书馆',
    deliveryLocation: '第25教学楼 208',
    itemSize: 'small',
    itemDesc: '一沓课件',
    remark: '已交付',
    reward: 4.0,
    timeType: 'deadline',
    timeStart: null,
    deadline: '2026-11-09 18:00:00',
    status: 'completed',
    visibility: 'hall',
    createdAt: '2026-11-08 09:30:00',
    runnerId: 1,
    runnerNickname: '小 B',
    runnerAvatar: '',
    takenAt: '2026-11-08 09:35:00',
    completedAt: '2026-11-08 10:20:00'
  },
  {
    // 当前用户发布、已被别人接单：canComplete = true、canCancel = true
    orderId: 2006,
    publisherId: 1,
    publisherNickname: '小 B',
    publisherAvatar: '',
    publisherCreditScore: 100,
    pickupArea: '北区教学区',
    pickupPlace: '第16教学楼',
    deliveryLocation: '桃园 3 栋 512',
    itemSize: 'small',
    itemDesc: '一份外卖',
    remark: '第16教学楼 301 门口，到了打电话',
    reward: 5.0,
    timeType: 'deadline',
    timeStart: null,
    deadline: '2026-11-12 18:00:00',
    status: 'taken',
    visibility: 'hall',
    createdAt: '2026-11-10 11:20:00',
    runnerId: 8,
    runnerNickname: '跑腿小李',
    runnerAvatar: '',
    takenAt: '2026-11-10 11:25:00',
    completedAt: null
  },
  {
    // 当前用户接单、进行中：canRelease = true
    orderId: 2007,
    publisherId: 3,
    publisherNickname: '王同学',
    publisherAvatar: '',
    publisherCreditScore: 88,
    pickupArea: '南区教学区',
    pickupPlace: '第30教学楼',
    deliveryLocation: '南区 6 号宿舍楼 207',
    itemSize: 'medium',
    itemDesc: '一个文件袋',
    remark: '在 30 教 1 楼门卫处',
    reward: 5.0,
    timeType: 'asap',
    timeStart: null,
    deadline: null,
    status: 'taken',
    visibility: 'hall',
    createdAt: '2026-11-10 16:00:00',
    runnerId: 1,
    runnerNickname: '小 B',
    runnerAvatar: '',
    takenAt: '2026-11-10 16:05:00',
    completedAt: null
  },
  {
    // 别人发布的**私单**，当前用户与发布者（5）就该单建过会话 3003：
    // 非发布者也能看到详情，且 canTake = true（对齐后端 isErrandChatPeer 分支）
    orderId: 2008,
    publisherId: 5,
    publisherNickname: '赵同学',
    publisherAvatar: '',
    publisherCreditScore: 85,
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '3 号宿舍楼 214',
    itemSize: 'small',
    itemDesc: '一份打印材料',
    remark: '桃园驿站，取件码 6-3-1180',
    reward: 4.0,
    timeType: 'asap',
    timeStart: null,
    deadline: null,
    status: 'pending',
    visibility: 'private',
    createdAt: '2026-11-11 18:40:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    // 大厅演示单：range 时间段 + 中件，方便看「11-12 17:00 - 11-12 19:00」这类文案
    orderId: 2009,
    publisherId: 11,
    publisherNickname: '陈同学',
    publisherAvatar: '',
    publisherCreditScore: 82,
    pickupArea: '橘园',
    pickupPlace: '橘园',
    deliveryLocation: '橘园 2 栋 305',
    itemSize: 'medium',
    itemDesc: '两袋水果，别压坏',
    remark: '橘园超市门口，到了打电话',
    reward: 5.5,
    timeType: 'range',
    timeStart: '2026-11-12 17:00:00',
    deadline: '2026-11-12 19:00:00',
    status: 'pending',
    visibility: 'hall',
    createdAt: '2026-11-12 08:10:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    // 大厅演示单：asap + 小件
    orderId: 2010,
    publisherId: 12,
    publisherNickname: '吴同学',
    publisherAvatar: '',
    publisherCreditScore: 95,
    pickupArea: '第一运动场',
    pickupPlace: '第一运动场',
    deliveryLocation: '北区 3 号宿舍楼 512',
    itemSize: 'small',
    itemDesc: '一个篮球，帮忙送回宿舍',
    remark: '操场东侧看台下，黑色袋子装着',
    reward: 3.5,
    timeType: 'asap',
    timeStart: null,
    deadline: null,
    status: 'pending',
    visibility: 'hall',
    createdAt: '2026-11-12 08:40:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  },
  {
    // 大厅演示单：deadline + 大件，报酬最高，用来验证排序（按 createdAt 倒序）
    orderId: 2011,
    publisherId: 13,
    publisherNickname: '郑同学',
    publisherAvatar: '',
    publisherCreditScore: 70,
    pickupArea: '南区教学区',
    pickupPlace: '第30教学楼',
    deliveryLocation: '南区 2 号宿舍楼 118',
    itemSize: 'large',
    itemDesc: '一个台式机主机箱，有点重',
    remark: '30 教 2 楼 205，需要帮忙搬下楼',
    reward: 12.0,
    timeType: 'deadline',
    timeStart: null,
    deadline: '2026-11-12 20:00:00',
    status: 'pending',
    visibility: 'hall',
    createdAt: '2026-11-12 09:05:00',
    runnerId: null,
    runnerNickname: null,
    runnerAvatar: '',
    takenAt: null,
    completedAt: null
  }
];


// 跑腿档案：字段对齐 runner_profiles + runner_item_sizes（数组字段全部是数组）
// 地标必须能在 utils/campus.js 的 52 条清单里查到，见文件末尾自检
const runnerProfiles = [
  {
    userId: 8,
    nickname: '跑腿小李',
    avatarUrl: '',
    creditScore: 96,
    completedCount: 32,
    serviceAreas: ['桃园', '北区教学区'],
    // 注意：后端要求 servicePlaces 里要能命中查询的 place，或直接命中 area。
    // 声明了「桃园」却只列北区楼栋的话，area=桃园 的查询会被过滤掉 —— 数据必须自洽。
    servicePlaces: ['桃园', '第16教学楼', '第4教学楼（A/B栋）'],
    itemSizes: ['small', 'medium', 'large'],
    availabilityType: 'now',
    isOnline: true,
    manualUntil: null,
    timeSlots: [],
    basePrice: 3.0,
    remark: '中午和晚上都在北区，顺路可带'
  },
  {
    userId: 9,
    nickname: '阿杰',
    avatarUrl: '',
    creditScore: 86,
    completedCount: 18,
    serviceAreas: ['中心图书馆', '南区教学区'],
    servicePlaces: ['第30教学楼', '第31教学楼'],
    itemSizes: ['small', 'medium'],
    availabilityType: 'slot',
    isOnline: false,
    manualUntil: null,
    // 按计划上线：工作日 18:00-22:00，窗口不重叠就会被过滤掉（对齐后端）
    // 注意后端 id 必须是字符串（readTrimmed），演示数据也用字符串 id
    timeSlots: [
      { id: 'slot-9-1', type: 'weekly', from: '2026-11-01', weekdays: [1, 2, 3, 4, 5], start: '18:00', end: '22:00' }
    ],
    basePrice: 4.0,
    remark: '工作日 18:00 之后接单'
  }
];

// ---------------- 跑腿档案校验（逐字对照 users.js + utils/runner.js） ----------------
const AVAILABILITY_TYPES = ['slot', 'now'];
// 后端在线接口对「没档案就上线」的用户写入的默认片区
const DEFAULT_SERVICE_AREA = '北区其他';

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}
function runnerToday(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function runnerHHmm(d) {
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
/** 'HH:mm' 严格校验（对齐 runner.js isValidTime） */
function runnerIsValidTime(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
/** 'YYYY-MM-DD' 严格校验（对齐 runner.js parseDateOnly） */
function runnerIsValidDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const p = v.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
}
function runnerWeekdayOf(v) {
  const d = new Date(String(v).replace(/-/g, '/') + ' 00:00:00');
  if (isNaN(d.getTime())) return 0;
  return d.getDay() === 0 ? 7 : d.getDay();
}
/** 两条计划时间是否重叠（对齐 users.js schedulesOverlap） */
function runnerSchedulesOverlap(a, b) {
  if (!(a.start < b.end && b.start < a.end)) return false;
  if (a.type === 'once' && b.type === 'once') return a.date === b.date;
  if (a.type === 'weekly' && b.type === 'weekly') {
    return a.weekdays.some((day) => b.weekdays.indexOf(day) > -1);
  }
  const once = a.type === 'once' ? a : b;
  const weekly = a.type === 'weekly' ? a : b;
  return once.date >= weekly.from && weekly.weekdays.indexOf(runnerWeekdayOf(once.date)) > -1;
}
/** 对齐 runner.js hasFutureSlot：once 看 date+end；weekly 看 from 之后是否还有命中 */
function runnerHasFutureSlot(slots, now) {
  const today = runnerToday(now);
  const nowT = runnerHHmm(now);
  return (slots || []).some((s) => {
    if (!s) return false;
    if (s.type === 'once') {
      return s.date > today || (s.date === today && s.end > nowT);
    }
    if (s.type !== 'weekly') return false;
    if (s.from > today) return true;
    for (let offset = 0; offset < 7; offset += 1) {
      const d = new Date(now.getTime() + offset * 86400000);
      const ds = runnerToday(d);
      const wd = runnerWeekdayOf(ds);
      if (s.weekdays.indexOf(wd) < 0) continue;
      return ds > today || s.end > nowT;
    }
    return false;
  });
}
/** 对齐 runner.js isScheduleNow：当前时刻是否落在某条计划内 */
function runnerIsScheduleNow(slots, now) {
  const today = runnerToday(now);
  const nowT = runnerHHmm(now);
  return (slots || []).some((s) => {
    if (!s) return false;
    if (s.type === 'once') return s.date === today && s.start <= nowT && nowT < s.end;
    if (s.type !== 'weekly') return false;
    return (
      s.from <= today &&
      s.weekdays.indexOf(runnerWeekdayOf(today)) > -1 &&
      s.start <= nowT &&
      nowT < s.end
    );
  });
}
/** 进行中的循环计划在今天的结束时间（对齐 runner.js activeWeeklyEnd） */
function runnerActiveWeeklyEnd(slot, now) {
  if (!slot || slot.type !== 'weekly') return null;
  const today = runnerToday(now);
  if (typeof slot.from !== 'string' || slot.from > today) return null;
  if (slot.weekdays.indexOf(runnerWeekdayOf(today)) < 0) return null;
  return today + ' ' + slot.end + ':00';
}
/** 今天之内下一个上/下线边界（对齐 runner.js nextBoundaryToday，简化为今日边界） */
function runnerNextBoundaryToday(slots, now) {
  const today = runnerToday(now);
  const nowT = runnerHHmm(now);
  let best = null;
  (slots || []).forEach((s) => {
    if (!s) return;
    const hitsToday =
      s.type === 'once' ? s.date === today : s.from <= today && s.weekdays.indexOf(runnerWeekdayOf(today)) > -1;
    if (!hitsToday) return;
    [s.start, s.end].forEach((t) => {
      if (t > nowT && (!best || t < best)) best = t;
    });
  });
  return best ? today + ' ' + best + ':00' : null;
}
/** 对齐 users.js validateTimeSlots：逐条校验 + 两两查重 + 未来计划要求 */
function validateRunnerTimeSlots(raw, availabilityType, now) {
  const input = raw === undefined || raw === null ? [] : raw;
  if (!Array.isArray(input)) return { error: '在线计划格式错误' };

  const slots = [];
  const ids = [];
  for (let i = 0; i < input.length; i += 1) {
    const item = input[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: '在线计划格式错误' };
    }
    const id = readTrimmed(item.id);
    if (!id || id.length > 64 || ids.indexOf(id) > -1) {
      return { error: '在线计划格式错误' };
    }
    if (!runnerIsValidTime(item.start) || !runnerIsValidTime(item.end) || item.start >= item.end) {
      return { error: '在线计划格式错误' };
    }
    ids.push(id);

    if (item.type === 'once') {
      if (!runnerIsValidDate(item.date)) return { error: '在线计划格式错误' };
      slots.push({ id: id, type: 'once', date: item.date, start: item.start, end: item.end });
    } else if (item.type === 'weekly') {
      if (!runnerIsValidDate(item.from) || !Array.isArray(item.weekdays) || item.weekdays.length === 0) {
        return { error: '在线计划格式错误' };
      }
      const weekdays = [];
      for (let j = 0; j < item.weekdays.length; j += 1) {
        const day = item.weekdays[j];
        if (typeof day !== 'number' || day % 1 !== 0 || day < 1 || day > 7 || weekdays.indexOf(day) > -1) {
          return { error: '在线计划格式错误' };
        }
        weekdays.push(day);
      }
      weekdays.sort((x, y) => x - y);
      slots.push({
        id: id,
        type: 'weekly',
        weekdays: weekdays,
        start: item.start,
        end: item.end,
        from: item.from
      });
    } else {
      return { error: '在线计划格式错误' };
    }
  }

  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      if (runnerSchedulesOverlap(slots[i], slots[j])) return { error: '在线计划格式错误' };
    }
  }

  if (availabilityType === 'slot' && !runnerHasFutureSlot(slots, now)) {
    return { error: '按计划上线至少需要一条未来计划' };
  }
  return { slots: slots };
}

// 会话：表结构 userAId / userBId，接口层再按当前用户取「对方」信息（对齐 chat.js peerOf）
const conversations = [
  { conversationId: 3001, userAId: 1, userBId: 2, bizType: 'item', bizId: 1001, lastMessage: '好的，那我们五点在图书馆门口见', lastTime: '2026-11-08 15:31:00' },
  { conversationId: 3002, userAId: 1, userBId: 5, bizType: 'errand', bizId: 2001, lastMessage: '取件码发你了，麻烦快点哦', lastTime: '2026-11-08 14:58:00' },
  // 私单会话：当前用户（跑腿）与发布者就 2008 这张私单聊过 → 详情 canTake = true
  { conversationId: 3003, userAId: 1, userBId: 5, bizType: 'errand', bizId: 2008, lastMessage: '这单我接了，马上到', lastTime: '2026-11-11 19:05:00' }
];

// 消息：字段对齐 chat.js（message_id / sender_id / msg_type / content / is_read / created_at）
const messages = [
  { messageId: 1, conversationId: 3001, senderId: 2, msgType: 'text', content: '同学你好，高数上册还在吗？', isRead: 1, createdAt: '2026-11-08 15:20:00' },
  { messageId: 2, conversationId: 3001, senderId: 1, msgType: 'text', content: '在的，18 元，可以面交', isRead: 1, createdAt: '2026-11-08 15:22:00' },
  { messageId: 3, conversationId: 3001, senderId: 2, msgType: 'text', content: '好的，那我们五点在图书馆门口见', isRead: 0, createdAt: '2026-11-08 15:31:00' },
  { messageId: 4, conversationId: 3002, senderId: 5, msgType: 'text', content: '接单了吗？', isRead: 1, createdAt: '2026-11-08 14:50:00' },
  { messageId: 5, conversationId: 3002, senderId: 1, msgType: 'text', content: '马上出发，十分钟到', isRead: 1, createdAt: '2026-11-08 14:55:00' },
  { messageId: 6, conversationId: 3002, senderId: 5, msgType: 'text', content: '取件码发你了，麻烦快点哦', isRead: 1, createdAt: '2026-11-08 14:58:00' }
];

const favoriteIds = [1001];

const feedbacks = [];

const currentUser = Object.assign({}, users[0], {
  // 接口文档 §2 的字段名是 userId；只保留 id 会让个人中心读到 undefined
  userId: 1,
  campus: null, // 注册不采集校区，users.campus 恒为 NULL（接口文档 §2）
  completedErrands: 7
});

// ---------------- 派生工具 ----------------
function peerOf(conv, userId) {
  const isA = Number(conv.userAId) === Number(userId);
  const peer = userOf(isA ? conv.userBId : conv.userAId) || {};
  return {
    peerId: peer.userId,
    peerNickname: peer.nickname || '',
    peerAvatar: peer.avatarUrl || ''
  };
}

/** 会话未读数：对齐 fn_unread_count（对方发的且 is_read = 0） */
function unreadOf(conversationId, userId) {
  let count = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.conversationId === conversationId && Number(m.senderId) !== Number(userId) && !m.isRead) {
      count += 1;
    }
  }
  return count;
}

function totalUnread(userId) {
  let count = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const conv = conversations.find((c) => c.conversationId === m.conversationId);
    if (!conv) continue;
    const mine = Number(conv.userAId) === Number(userId) || Number(conv.userBId) === Number(userId);
    if (mine && Number(m.senderId) !== Number(userId) && !m.isRead) count += 1;
  }
  return count;
}

function findConversation(id) {
  return conversations.find((c) => String(c.conversationId) === String(id)) || null;
}

function isParticipant(conv, userId) {
  return !!conv && (Number(conv.userAId) === Number(userId) || Number(conv.userBId) === Number(userId));
}

const ITEM_SIZES = ['small', 'medium', 'large'];
const CONDITION_LEVELS = ['new', 'like_new', 'good', 'fair'];
const ITEM_STATUSES = ['on_sale', 'reserved', 'sold', 'off_shelf'];
const ITEM_TYPES = ['normal', 'book'];
const STATUS_TRANSITIONS = {
  on_sale: ['reserved', 'sold', 'off_shelf'],
  reserved: ['on_sale', 'sold'],
  off_shelf: ['on_sale'],
  sold: []
};
const ERRAND_STATUSES = ['pending', 'taken', 'completed', 'cancelled'];
const TIME_TYPES = ['asap', 'deadline', 'range'];

// 地标判定：必须复刻 server/src/utils/campus.js 的语义 ——
//   后端 zoneOfPlace('桃园') 会返回 '桃园'（片区本身可当地标），
//   而小程序 campus.zoneOfPlace 只查地标表，直接传片区名会得到空串。
// 若照搬前端语义，后端能过的「片区即地标」请求会被 mock 判成 400，方向反了。
const campusUtil = require('./campus');
function backendZoneOfPlace(place) {
  if (campusUtil.isValidZone(place)) return place;
  return campusUtil.zoneOfPlace(place) || null;
}
function backendIsValidPlace(place) {
  return campusUtil.isValidZone(place) || !!campusUtil.zoneOfPlace(place);
}

// ---------------- 大厅筛选（GET /api/errands 的 A 侧扩展契约） ----------------
// 契约（2026-11-13 由 B 侧记录的 A 摘要）：
//   area=桃园,李园  itemSize=small,medium  timeType=asap,deadline
//   sort=latest|reward_desc|reward_asc（默认 latest）
//   保留 status / page / pageSize；同维度 OR、跨维度 AND；total 为**筛选后**总数；非法值 400。
// 注意：可筛选的 timeType 只有 asap / deadline —— range 是合法订单类型但**不是**合法筛选项。
// 待办：A 的实现尚未推送到 dev，下面的 400 文案按本文件既有风格（'xxx不合法'）占位；
//       A 推送后需逐字核对，契约测试 [10] 目前只断言状态码与筛选结果，不断言文案。
const ERRAND_SORTS = ['latest', 'reward_desc', 'reward_asc'];
const HALL_TIME_FILTERS = ['asap', 'deadline'];

/** 逗号分隔多值 → 去空白去重数组；空串视为「不限」返回 null */
function parseMultiValue(raw) {
  const s = readTrimmed(raw);
  if (!s) return null;
  const out = [];
  s.split(',').forEach((part) => {
    const v = part.trim();
    if (v && out.indexOf(v) < 0) out.push(v);
  });
  return out.length ? out : null;
}

/**
 * 解析大厅筛选参数。
 * 返回 { area, itemSize, timeType, sort }（未传的维度为 null），或 { error } 表示 400 文案。
 */
function parseHallFilters(data) {
  const body = data || {};
  const area = parseMultiValue(body.area);
  if (area) {
    for (let i = 0; i < area.length; i += 1) {
      if (!campusUtil.isValidZone(area[i])) return { error: '片区不合法' };
    }
  }
  const itemSize = parseMultiValue(body.itemSize);
  if (itemSize) {
    for (let i = 0; i < itemSize.length; i += 1) {
      if (ITEM_SIZES.indexOf(itemSize[i]) < 0) return { error: '物品规格不合法' };
    }
  }
  const timeType = parseMultiValue(body.timeType);
  if (timeType) {
    for (let i = 0; i < timeType.length; i += 1) {
      if (HALL_TIME_FILTERS.indexOf(timeType[i]) < 0) return { error: '时间类型不合法' };
    }
  }
  const sort = readTrimmed(body.sort) || 'latest';
  if (ERRAND_SORTS.indexOf(sort) < 0) return { error: '排序方式不合法' };
  return { area: area, itemSize: itemSize, timeType: timeType, sort: sort };
}

/** 大厅排序：默认按发布时间倒序；报酬排序时用发布时间作为并列的次序 */
function sortHallList(list, sort) {
  const byCreated = (a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.orderId - a.orderId;
  const copy = list.slice();
  if (sort === 'reward_desc') {
    copy.sort((a, b) => Number(b.reward) - Number(a.reward) || byCreated(a, b));
  } else if (sort === 'reward_asc') {
    copy.sort((a, b) => Number(a.reward) - Number(b.reward) || byCreated(a, b));
  } else {
    copy.sort(byCreated);
  }
  return copy;
}

// ---------------- 与后端逐字对齐的小工具 ----------------
const MAX_PRICE = 99999999.99;
const MAX_REWARD = 99999999.99;
const ERRAND_VISIBILITIES = ['private', 'hall'];

/** 对齐 server/src/utils/item.js toNumber：数字或纯数字字符串，其它一律 null（null / '' 也算 null） */
function toNumberStrict(value) {
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && isFinite(Number(value))) return Number(value);
  return null;
}

/** 对齐 server/src/utils/item.js parseBoolean：undefined/null → false，非法值 → null */
function parseBooleanStrict(value) {
  if (value === undefined || value === null) return false;
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return null;
}

/** 对齐 errands.js readOptionalText：非字符串 → 参数错误；超长 → 指定文案；空串 → null */
function readOptionalText(value, maxLength, label) {
  if (value === undefined || value === null) return { value: null, error: '' };
  if (typeof value !== 'string') return { value: null, error: '参数错误' };
  const s = value.trim();
  if (s.length > maxLength) return { value: null, error: label + '不能超过 ' + maxLength + ' 字' };
  return { value: s || null, error: '' };
}

/** 对齐 errands.js readTime：只认 'YYYY-MM-DD HH:mm:ss' */
function readTimeField(value) {
  const s = readTrimmed(value);
  if (!s) return { text: '', date: null, empty: true };
  return { text: s, date: parseDateTime(s), empty: false };
}

/** 对齐 errands.js parseErrandPayload（POST / PUT 共用） */
function parseErrandPayload(body) {
  const pickupArea = readTrimmed(body.pickupArea);
  if (!pickupArea) return { error: '取件片区不能为空' };
  if (!campusUtil.isValidZone(pickupArea)) return { error: '取件片区不在可选范围内' };

  const pickupPlace = readTrimmed(body.pickupPlace);
  if (!pickupPlace) return { error: '取件地标不能为空' };
  if (!backendIsValidPlace(pickupPlace) || backendZoneOfPlace(pickupPlace) !== pickupArea) {
    return { error: '地标与片区不匹配' };
  }

  const deliveryLocation = readTrimmed(body.deliveryLocation);
  if (!deliveryLocation) return { error: '送达地点不能为空' };
  if (deliveryLocation.length > 100) return { error: '送达地点不能超过 100 字' };

  const itemSize = readTrimmed(body.itemSize);
  if (ITEM_SIZES.indexOf(itemSize) < 0) return { error: '物品规格不合法' };

  const itemDesc = readOptionalText(body.itemDesc, 500, '物品描述');
  if (itemDesc.error) return { error: itemDesc.error };

  const remark = readOptionalText(body.remark, 255, '备注');
  if (remark.error) return { error: remark.error };

  if (body.reward === undefined || body.reward === null || body.reward === '') {
    return { error: '报酬不能为空' };
  }
  const reward = toNumberStrict(body.reward);
  if (reward === null) return { error: '报酬格式不正确' };
  if (reward < 0) return { error: '报酬不能为负数' };
  if (reward > MAX_REWARD) return { error: '报酬超出范围' };

  const timeType = readTrimmed(body.timeType);
  if (TIME_TYPES.indexOf(timeType) < 0) return { error: '时间类型不合法' };

  const timeStart = readTimeField(body.timeStart);
  const deadline = readTimeField(body.deadline);
  let timeStartValue = null;
  let deadlineValue = null;

  if (timeType === 'asap') {
    // asap 不允许携带任何时间：后端判定标准是「字符串非空即报错」
    if (!timeStart.empty || !deadline.empty) return { error: '时间参数不完整' };
  } else if (timeType === 'deadline') {
    if (!timeStart.empty || deadline.empty || !deadline.date) return { error: '时间参数不完整' };
    deadlineValue = deadline.text;
  } else {
    if (timeStart.empty || deadline.empty || !timeStart.date || !deadline.date) {
      return { error: '时间参数不完整' };
    }
    if (timeStart.date >= deadline.date) return { error: '时间参数不完整' };
    timeStartValue = timeStart.text;
    deadlineValue = deadline.text;
  }

  return {
    error: '',
    data: {
      pickupArea: pickupArea,
      pickupPlace: pickupPlace,
      deliveryLocation: deliveryLocation,
      itemSize: itemSize,
      itemDesc: itemDesc.value,
      remark: remark.value,
      reward: reward,
      timeType: timeType,
      timeStart: timeStartValue,
      deadline: deadlineValue
    }
  };
}

/** 对齐 items.js parseImages：最多 3 张，必须是 /uploads/ 开头的对象数组 */
function parseImages(value) {
  if (value === undefined || value === null) return { images: [], error: '' };
  if (!Array.isArray(value)) return { images: [], error: '参数错误' };
  if (value.length > 3) return { images: [], error: '最多上传 3 张图片' };

  const list = [];
  for (let i = 0; i < value.length; i++) {
    const image = value[i];
    if (!image || typeof image !== 'object' || typeof image.url !== 'string') {
      return { images: [], error: '图片地址不合法' };
    }
    const url = image.url.trim();
    if (url.indexOf('/uploads/') !== 0 || url.length > 255) {
      return { images: [], error: '图片地址不合法' };
    }
    list.push({ url: url, sortNo: parsePositiveInt(image.sortNo) || i + 1 });
  }
  list.sort((a, b) => a.sortNo - b.sortNo);
  return { images: list.map((im, idx) => ({ url: im.url, sortNo: idx + 1 })), error: '' };
}

/** 对齐 errands.js isErrandChatPeer：当前用户与发布者是否就该单建过会话 */
function hasErrandConversation(orderId, publisherId, userId) {
  return conversations.some(
    (c) =>
      c.bizType === 'errand' &&
      Number(c.bizId) === Number(orderId) &&
      ((Number(c.userAId) === Number(publisherId) && Number(c.userBId) === Number(userId)) ||
        (Number(c.userBId) === Number(publisherId) && Number(c.userAId) === Number(userId)))
  );
}

function itemCard(item) {
  return Object.assign({}, item);
}

function favoriteCountOf(itemId) {
  const base = (items.find((i) => i.itemId === itemId) || {}).favoriteCount || 0;
  return base;
}

// ============================================================
// 路由表
// ============================================================
const routes = {
  // ---------------- 认证（对照 auth.js） ----------------
  'POST /api/auth/login': (data) => {
    const studentNo = readTrimmed(data.studentNo);
    const password = typeof data.password === 'string' ? data.password : '';
    if (!studentNo || !password) return fail(400, '请输入学号和密码');
    // 对齐 auth.js：登录只校验非空，**不校验学号格式**（格式不对走后端 401「学号或密码错误」）。
    // mock 没有密码库，无法复刻 401，因此这里放行任意非空学号，方便演示。
    return delay({
      token: 'mock_token_' + Date.now(),
      userInfo: Object.assign({}, currentUser, { studentNo: studentNo })
    });
  },

  'POST /api/auth/register': (data) => {
    const studentNo = readTrimmed(data.studentNo);
    const nickname = readTrimmed(data.nickname);
    const password = typeof data.password === 'string' ? data.password : '';
    if (!studentNo || !nickname || !password) return fail(400, '学号、密码、昵称不能为空');
    if (!/^\d{6,20}$/.test(studentNo)) return fail(400, '学号应为 6-20 位数字');
    if (nickname.length < 2 || nickname.length > 12) return fail(400, '昵称需 2-12 个字符');
    if (!/^\S{6,20}$/.test(password)) return fail(400, '密码需 6-20 位');
    return delay({
      token: 'mock_token_' + Date.now(),
      userInfo: Object.assign({}, currentUser, { studentNo: studentNo, nickname: nickname })
    });
  },

  'GET /api/auth/me': () => delay(Object.assign({}, currentUser)),

  // ---------------- 用户（对照 users.js） ----------------
  'PUT /api/users/me': (data) => {
    const body = data || {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
    const next = {};

    if (has('nickname')) {
      const nickname = readTrimmed(body.nickname);
      if (nickname.length < 2 || nickname.length > 12) return fail(400, '昵称需 2-12 个字符');
      next.nickname = nickname;
    }

    if (has('avatarUrl')) {
      const raw = body.avatarUrl;
      if (raw === null || raw === '') {
        next.avatarUrl = null;
      } else {
        if (typeof raw !== 'string') return fail(400, '头像地址不合法');
        const url = raw.trim();
        if (url.indexOf('/uploads/') !== 0 || url.length > 255) return fail(400, '头像地址不合法');
        next.avatarUrl = url;
      }
    }

    if (has('college')) {
      const raw = body.college;
      if (raw === null || raw === '') {
        next.college = null;
      } else {
        if (typeof raw !== 'string') return fail(400, '学院名称不合法');
        const college = raw.trim();
        if (college.length > 100) return fail(400, '学院名称过长');
        next.college = college || null;
      }
    }

    if (has('phone')) {
      const raw = body.phone;
      if (raw === null || raw === '') {
        next.phone = null;
      } else {
        // 对齐 users.js：只要求 11 位数字，不校验 1[3-9] 号段
        if (typeof raw !== 'string' || !/^\d{11}$/.test(raw.trim())) {
          return fail(400, '手机号格式不正确');
        }
        next.phone = raw.trim();
      }
    }

    // campus 不在可改字段内（注册不采集、接口文档固定返回 null），即使传了也忽略
    Object.assign(currentUser, next);
    return delay({ userInfo: Object.assign({}, currentUser) });
  },

  // 跑腿档案：逐字对齐 users.js 的校验（服务片区/地标/在线方式/在线计划/规格/报价/备注）
  'GET /api/users/me/runner-profile': () => {
    const profile = runnerProfiles.find((r) => r.userId === CURRENT_USER_ID);
    return delay(
      profile
        ? Object.assign({}, profile)
        : {
            userId: CURRENT_USER_ID,
            isOnline: false,
            availabilityType: 'slot',
            serviceAreas: [],
            servicePlaces: [],
            timeSlots: [],
            manualUntil: null,
            itemSizes: [],
            basePrice: null,
            remark: '',
            completedCount: 0
          }
    );
  },

  'PUT /api/users/me/runner-profile': (data) => {
    const body = data || {};
    const now = new Date();

    // 1. 服务片区：数组且 ≥1，片区必须在 25 片区清单内
    if (!Array.isArray(body.serviceAreas) || body.serviceAreas.length === 0) {
      return fail(400, '服务片区至少选择一个');
    }
    const serviceAreas = [...new Set(body.serviceAreas.map((v) => readTrimmed(v)))];
    if (serviceAreas.some((v) => !campusUtil.isValidZone(v))) {
      return fail(400, '服务片区不在可选范围内');
    }

    // 2. 地标：可空；每个必须是合法地标（片区本身也算）且属于已选片区
    const rawPlaces =
      body.servicePlaces === undefined || body.servicePlaces === null ? [] : body.servicePlaces;
    if (!Array.isArray(rawPlaces)) return fail(400, '地标与片区不匹配');
    const servicePlaces = [...new Set(rawPlaces.map((v) => readTrimmed(v)))];
    if (
      servicePlaces.some(
        (v) => !backendIsValidPlace(v) || serviceAreas.indexOf(backendZoneOfPlace(v)) < 0
      )
    ) {
      return fail(400, '地标与片区不匹配');
    }

    // 3. 在线方式
    const availabilityType = readTrimmed(body.availabilityType);
    if (AVAILABILITY_TYPES.indexOf(availabilityType) < 0) return fail(400, '在线方式不合法');

    // 4. 在线计划（含重叠与「按计划上线必须有未来计划」）
    const slotsResult = validateRunnerTimeSlots(body.timeSlots, availabilityType, now);
    if (slotsResult.error) return fail(400, slotsResult.error);
    const timeSlots = slotsResult.slots;

    // 5. 可接规格
    const rawSizes = body.itemSizes === undefined || body.itemSizes === null ? [] : body.itemSizes;
    if (!Array.isArray(rawSizes)) return fail(400, '可接规格不合法');
    const itemSizes = [...new Set(rawSizes)];
    if (itemSizes.some((v) => ITEM_SIZES.indexOf(v) < 0)) return fail(400, '可接规格不合法');
    itemSizes.sort((a, b) => ITEM_SIZES.indexOf(a) - ITEM_SIZES.indexOf(b));

    // 6. 报价：数字或纯数字字符串，0 ≤ p ≤ 99999999.99
    let basePrice = null;
    if (body.basePrice !== undefined && body.basePrice !== null && body.basePrice !== '') {
      if (typeof body.basePrice === 'number') basePrice = body.basePrice;
      else if (typeof body.basePrice === 'string' && body.basePrice.trim() !== '') {
        basePrice = Number(body.basePrice.trim());
      } else return fail(400, '报价格式不正确');
      if (!isFinite(basePrice) || basePrice > 99999999.99) return fail(400, '报价格式不正确');
      if (basePrice < 0) return fail(400, '报价不能为负数');
    }

    // 7. 备注 ≤255 字
    let remark = '';
    if (body.remark !== undefined && body.remark !== null) {
      if (typeof body.remark !== 'string') return fail(400, '备注格式不正确');
      remark = body.remark.trim();
    }
    if (remark.length > 255) return fail(400, '备注不能超过 255 字');

    // 8. 在线状态：slot 按计划判定当前是否在时段内；now 沿用原状态
    const existing = runnerProfiles.find((r) => r.userId === CURRENT_USER_ID);
    let isOnline;
    if (availabilityType === 'slot') isOnline = runnerIsScheduleNow(timeSlots, now);
    else isOnline = existing ? !!existing.isOnline : false;

    const profile = Object.assign(
      {
        userId: CURRENT_USER_ID,
        nickname: currentUser.nickname,
        avatarUrl: currentUser.avatarUrl || '',
        creditScore: currentUser.creditScore,
        completedCount: existing ? existing.completedCount || 0 : 0
      },
      existing || {},
      {
        serviceAreas: serviceAreas,
        servicePlaces: servicePlaces,
        itemSizes: itemSizes,
        availabilityType: availabilityType,
        timeSlots: timeSlots,
        basePrice: basePrice,
        remark: remark,
        isOnline: isOnline,
        manualUntil: null
      }
    );
    if (existing) {
      Object.assign(existing, profile);
      return delay(Object.assign({}, existing));
    }
    runnerProfiles.push(profile);
    return delay(Object.assign({}, profile));
  },

  'PUT /api/users/me/online': (data) => {
    const body = data || {};
    if (typeof body.isOnline !== 'boolean') return fail(400, 'isOnline 必须为布尔值');
    if (body.availabilityType !== undefined && AVAILABILITY_TYPES.indexOf(body.availabilityType) < 0) {
      return fail(400, '在线方式不合法');
    }
    let scope = null;
    if (body.scope !== undefined) {
      if (['once', 'future'].indexOf(body.scope) < 0) return fail(400, 'scope 不合法');
      scope = body.scope;
      if (!readTrimmed(body.scheduleId)) return fail(400, 'scheduleId 不能为空');
    }

    const now = new Date();
    const profile = runnerProfiles.find((r) => r.userId === CURRENT_USER_ID);
    const availabilityType = body.availabilityType || (profile ? profile.availabilityType : 'now');

    // 随时在线：没有档案也能建一份默认档案（对齐 users.js 的 DEFAULT_SERVICE_AREA）
    if (availabilityType === 'now') {
      if (!profile) {
        const created = {
          userId: CURRENT_USER_ID,
          nickname: currentUser.nickname,
          avatarUrl: currentUser.avatarUrl || '',
          creditScore: currentUser.creditScore,
          completedCount: 0,
          serviceAreas: [DEFAULT_SERVICE_AREA],
          servicePlaces: [],
          itemSizes: [],
          availabilityType: 'now',
          timeSlots: [],
          manualUntil: null,
          basePrice: null,
          remark: '',
          isOnline: body.isOnline
        };
        runnerProfiles.push(created);
      } else {
        profile.isOnline = body.isOnline;
        profile.availabilityType = 'now';
        profile.manualUntil = null;
      }
      return delay({ isOnline: body.isOnline, availabilityType: 'now', manualUntil: null });
    }

    // 按计划上线：必须先保存设置，且至少一条未来计划
    if (!profile) return fail(400, '请先保存接单设置');
    if (!runnerHasFutureSlot(profile.timeSlots || [], now)) {
      return fail(400, '按计划上线至少需要一条未来计划');
    }

    let timeSlots = (profile.timeSlots || []).slice();
    let manualUntil = null;
    let nextAvailabilityType = 'slot';
    let isOnline = body.isOnline;

    if (scope && body.isOnline === false) {
      const schedule = timeSlots.filter((s) => s.id === readTrimmed(body.scheduleId))[0];
      if (!schedule) return fail(400, '该在线计划不存在');
      if (scope === 'once') {
        // 只这一次：下线到该计划的今日结束点
        manualUntil = runnerActiveWeeklyEnd(schedule, now) || runnerNextBoundaryToday(timeSlots, now);
      } else {
        // 取消之后所有：把这条计划从列表里删掉
        timeSlots = timeSlots.filter((s) => s.id !== schedule.id);
        if (!timeSlots.length) {
          nextAvailabilityType = 'now';
          manualUntil = null;
        } else {
          manualUntil = runnerNextBoundaryToday(timeSlots, now);
        }
      }
    } else {
      manualUntil = runnerNextBoundaryToday(timeSlots, now);
    }

    profile.isOnline = isOnline;
    profile.availabilityType = nextAvailabilityType;
    profile.timeSlots = timeSlots;
    profile.manualUntil = manualUntil;
    return delay({
      isOnline: Boolean(isOnline),
      availabilityType: nextAvailabilityType,
      manualUntil: manualUntil
    });
  },

  'GET /api/users/:id': (data) => {
    const userId = parsePositiveInt(data.id);
    if (!userId) return fail(400, '用户 ID 不合法');
    const user = userOf(userId);
    if (!user) return fail(404, '用户不存在');
    // 公开资料只返回昵称、头像、信用分（接口文档 §3）
    return delay({
      userId: user.userId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      creditScore: user.creditScore
    });
  },

  // ---------------- 商品（对照 items.js） ----------------
  'GET /api/items': (data) => {
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const sort = readTrimmed(data.sort) || 'latest';
    if (!['latest', 'price_asc', 'price_desc'].includes(sort)) return fail(400, '排序方式不合法');

    const keyword = readTrimmed(data.keyword);
    if (keyword.length > 100) return fail(400, '搜索关键词过长');

    let list = items.filter((i) => i.status === 'on_sale');
    if (keyword) list = list.filter((i) => i.title.indexOf(keyword) > -1);
    if (data.categoryId) list = list.filter((i) => String(i.categoryId) === String(data.categoryId));

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price || b.itemId - a.itemId);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price || b.itemId - a.itemId);
    else list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.itemId - a.itemId));

    return delay({
      list: pageOf(list, pg).map(itemCard),
      total: list.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  'GET /api/items/mine': (data) => {
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const mine = items
      .filter((i) => Number(i.sellerId) === CURRENT_USER_ID)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.itemId - a.itemId));
    return delay({
      list: pageOf(mine, pg).map(itemCard),
      total: mine.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  'POST /api/items': (data) => {
    const body = data || {};
    const itemType = readTrimmed(body.itemType);
    if (ITEM_TYPES.indexOf(itemType) < 0) return fail(400, '商品类型不合法');

    const categoryId = parsePositiveInt(body.categoryId);
    if (!categoryId) return fail(400, '分类不存在');
    if (!categories.some((c) => c.categoryId === categoryId)) return fail(400, '分类不存在');

    const title = readTrimmed(body.title);
    if (!title) return fail(400, '标题不能为空');
    if (title.length > 100) return fail(400, '标题不能超过 100 字');

    const description = readOptionalText(body.description, 2000, '描述');
    if (description.error) return fail(400, description.error);

    const price = toNumberStrict(body.price);
    if (price === null || price <= 0) return fail(400, '售价必须大于 0');
    if (price > MAX_PRICE) return fail(400, '售价超出范围');

    let originalPrice = null;
    if (body.originalPrice !== undefined && body.originalPrice !== null && body.originalPrice !== '') {
      originalPrice = toNumberStrict(body.originalPrice);
      if (originalPrice === null) return fail(400, '原价格式不正确');
      if (originalPrice < 0) return fail(400, '原价不能为负数');
      if (originalPrice > MAX_PRICE) return fail(400, '原价超出范围');
    }

    // 后端缺省成色是 good（items.js:49），不是必填
    const conditionLevel =
      body.conditionLevel === undefined || body.conditionLevel === null
        ? 'good'
        : readTrimmed(body.conditionLevel);
    if (CONDITION_LEVELS.indexOf(conditionLevel) < 0) return fail(400, '成色不合法');

    const negotiable = parseBooleanStrict(body.negotiable);
    if (negotiable === null) return fail(400, '参数错误');

    const location = readOptionalText(body.location, 100, '交易地点');
    if (location.error) return fail(400, location.error);

    const parsedImages = parseImages(body.images);
    if (parsedImages.error) return fail(400, parsedImages.error);

    let bookId = null;
    if (itemType === 'book') {
      bookId = parsePositiveInt(body.bookId);
      if (!bookId) return fail(400, '书籍商品必须选择书目');
      if (!books.some((b) => b.bookId === bookId)) return fail(400, '书目不存在');
    }

    const cat = categories.find((c) => c.categoryId === categoryId);
    const book = bookId ? books.find((b) => b.bookId === bookId) : null;
    // firstImage 只存**字符串 url**（后端 v_item_list 是子查询取 url），不能把 {url,sortNo} 对象塞进去
    const firstImage = parsedImages.images.length ? parsedImages.images[0].url : '';

    const item = {
      itemId: uid(),
      sellerId: CURRENT_USER_ID,
      sellerNickname: currentUser.nickname,
      sellerAvatar: currentUser.avatarUrl || '',
      sellerCreditScore: currentUser.creditScore,
      categoryId: categoryId,
      categoryName: cat.name,
      bookId: bookId,
      bookTitle: book ? book.title : null,
      itemType: itemType,
      title: title,
      description: description.value,
      price: price,
      originalPrice: originalPrice,
      conditionLevel: conditionLevel,
      negotiable: negotiable,
      location: location.value,
      status: 'on_sale',
      viewCount: 0,
      favoriteCount: 0,
      createdAt: fmtDate(new Date()),
      firstImage: firstImage
    };
    items.unshift(item);
    // 发布接口只回 { itemId }（对齐 items.js）
    return delay({ itemId: item.itemId });
  },

  'GET /api/items/:id': (data) => {
    const itemId = parsePositiveInt(data.id);
    if (!itemId) return fail(400, '商品 ID 不合法');
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return fail(404, '商品不存在');
    found.viewCount += 1;

    const images = (found.firstImage ? [{ imageId: 1, url: found.firstImage, sortNo: 1 }] : []);
    const seller = userOf(found.sellerId) || {};
    return delay(
      Object.assign({}, found, {
        updatedAt: found.createdAt,
        images: images,
        seller: {
          userId: found.sellerId,
          nickname: seller.nickname || found.sellerNickname,
          avatarUrl: seller.avatarUrl || '',
          creditScore: seller.creditScore || found.sellerCreditScore
        },
        isFavorited: favoriteIds.indexOf(found.itemId) > -1,
        isOwner: Number(found.sellerId) === CURRENT_USER_ID
      })
    );
  },

  'PUT /api/items/:id/status': (data) => {
    const itemId = parsePositiveInt(data.id);
    if (!itemId) return fail(400, '商品 ID 不合法');
    const status = readTrimmed(data.status);
    if (ITEM_STATUSES.indexOf(status) < 0) return fail(400, '商品状态不合法');
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return fail(404, '商品不存在');
    if (Number(found.sellerId) !== CURRENT_USER_ID) return fail(403, '只能操作自己发布的商品');
    const allowed = STATUS_TRANSITIONS[found.status] || [];
    if (allowed.indexOf(status) < 0) return fail(409, '当前状态不能变更为目标状态');
    found.status = status;
    return delay({ itemId: itemId, status: status });
  },

  'POST /api/items/:id/favorite': (data) => {
    const itemId = parsePositiveInt(data.id);
    if (!itemId) return fail(400, '商品 ID 不合法');
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return fail(404, '商品不存在');
    if (favoriteIds.indexOf(itemId) < 0) {
      favoriteIds.push(itemId);
      found.favoriteCount = favoriteCountOf(itemId) + 1;
    }
    return delay({ favorited: true, favoriteCount: found.favoriteCount });
  },

  'DELETE /api/items/:id/favorite': (data) => {
    const itemId = parsePositiveInt(data.id);
    if (!itemId) return fail(400, '商品 ID 不合法');
    const found = items.find((i) => i.itemId === itemId);
    if (!found) return fail(404, '商品不存在');
    const idx = favoriteIds.indexOf(itemId);
    if (idx > -1) {
      favoriteIds.splice(idx, 1);
      found.favoriteCount = Math.max(0, (found.favoriteCount || 0) - 1);
    }
    return delay({ favorited: false, favoriteCount: found.favoriteCount });
  },

  // 我的收藏（对照 favorites.js：返回商品卡片 + favoritedAt）
  'GET /api/favorites': (data) => {
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const list = favoriteIds
      .map((id) => items.find((i) => i.itemId === id))
      .filter((i) => !!i)
      .map((i) => Object.assign(itemCard(i), { favoritedAt: i.createdAt }));
    return delay({
      list: pageOf(list, pg),
      total: list.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  // ---------------- 书目（对照 books.js） ----------------
  'GET /api/books/search': (data) => {
    const keyword = readTrimmed(data.keyword);
    if (!keyword) return fail(400, '搜索关键词不能为空');
    if (keyword.length > 100) return fail(400, '搜索关键词过长');
    const list = books.filter(
      (b) =>
        b.title.indexOf(keyword) > -1 ||
        (b.author || '').indexOf(keyword) > -1 ||
        (b.isbn || '').indexOf(keyword) > -1
    );
    return delay({ list: list.slice(0, 10) });
  },

  'POST /api/books': (data) => {
    const body = data || {};
    const title = readTrimmed(body.title);
    if (!title) return fail(400, '书名不能为空');
    if (title.length > 200) return fail(400, '书名不能超过 200 字');

    let isbn = null;
    if (body.isbn !== undefined && body.isbn !== null && body.isbn !== '') {
      if (typeof body.isbn !== 'string') return fail(400, '参数错误');
      isbn = body.isbn.trim() || null;
      if (isbn && isbn.length > 20) return fail(400, 'ISBN 不能超过 20 位');
    }

    const textRules = [
      ['author', 100, '作者'],
      ['publisher', 100, '出版社'],
      ['edition', 50, '版次'],
      ['coverUrl', 255, '封面地址']
    ];
    const values = {};
    for (let i = 0; i < textRules.length; i++) {
      const field = textRules[i][0];
      const maxLength = textRules[i][1];
      const label = textRules[i][2];
      const raw = body[field];
      if (raw === undefined || raw === null || raw === '') {
        values[field] = null;
        continue;
      }
      if (typeof raw !== 'string') return fail(400, '参数错误');
      const trimmed = raw.trim();
      if (trimmed.length > maxLength) {
        return fail(400, label + '不能超过 ' + maxLength + ' 字');
      }
      values[field] = trimmed || null;
    }

    let priceRef = null;
    if (body.priceRef !== undefined && body.priceRef !== null && body.priceRef !== '') {
      priceRef = toNumberStrict(body.priceRef);
      if (priceRef === null) return fail(400, '参考价格式不正确');
      if (priceRef < 0) return fail(400, '参考价不能为负数');
    }

    // 后端按 isbn 去重（books.js），不是 title+isbn
    if (isbn) {
      const existing = books.find((b) => (b.isbn || '') === isbn);
      if (existing) return delay(Object.assign({}, existing, { created: false }));
    }

    const book = {
      bookId: uid(),
      isbn: isbn,
      title: title,
      author: values.author,
      publisher: values.publisher,
      edition: values.edition,
      priceRef: priceRef,
      coverUrl: values.coverUrl || ''
    };
    books.unshift(book);
    return delay(Object.assign({}, book, { created: true }));
  },

  // ---------------- 代取（对照 errands.js） ----------------
  // 大厅只出 visibility='hall'（后端 SQL 硬编码），私单只能从详情页 / 会话卡片进入
  // 筛选：area / itemSize / timeType 同维度 OR、跨维度 AND；sort 三档；total 为筛选后总数
  'GET /api/errands': (data) => {
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const status = readTrimmed(data.status) || 'pending';
    if (ERRAND_STATUSES.indexOf(status) < 0) return fail(400, '订单状态不合法');
    const filters = parseHallFilters(data);
    if (filters.error) return fail(400, filters.error);

    let list = errands.filter((e) => e.status === status && e.visibility === 'hall');
    if (filters.area) list = list.filter((e) => filters.area.indexOf(e.pickupArea) >= 0);
    if (filters.itemSize) list = list.filter((e) => filters.itemSize.indexOf(e.itemSize) >= 0);
    if (filters.timeType) list = list.filter((e) => filters.timeType.indexOf(e.timeType) >= 0);
    list = sortHallList(list, filters.sort);

    return delay({
      list: pageOf(list, pg),
      total: list.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  // 我的代取：role 必填；publisher 看 publisher_id，runner 看 runner_id
  'GET /api/errands/mine': (data) => {
    const role = readTrimmed(data.role);
    if (['publisher', 'runner'].indexOf(role) < 0) return fail(400, 'role 只能是 publisher 或 runner');
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const status = readTrimmed(data.status);
    if (status && ERRAND_STATUSES.indexOf(status) < 0) return fail(400, '订单状态不合法');

    // 我的代取**不过滤 visibility**：自己发的私单也要能看到（对齐后端）
    let list = errands.filter((e) =>
      role === 'publisher' ? Number(e.publisherId) === CURRENT_USER_ID : Number(e.runnerId) === CURRENT_USER_ID
    );
    if (status) list = list.filter((e) => e.status === status);
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.orderId - a.orderId));

    return delay({
      list: pageOf(list, pg),
      total: list.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  // 发布代取：visibility 缺省 hall；传 private 则只建私单，不进大厅
  'POST /api/errands': (data) => {
    const body = data || {};
    const visibility = readTrimmed(body.visibility) || 'hall';
    if (ERRAND_VISIBILITIES.indexOf(visibility) < 0) return fail(400, '可见性不合法');

    const parsed = parseErrandPayload(body);
    if (parsed.error) return fail(400, parsed.error);
    const d = parsed.data;

    const errand = {
      orderId: uid(),
      publisherId: CURRENT_USER_ID,
      publisherNickname: currentUser.nickname,
      publisherAvatar: currentUser.avatarUrl || '',
      publisherCreditScore: currentUser.creditScore,
      pickupArea: d.pickupArea,
      pickupPlace: d.pickupPlace,
      deliveryLocation: d.deliveryLocation,
      itemSize: d.itemSize,
      itemDesc: d.itemDesc,
      remark: d.remark,
      reward: d.reward,
      timeType: d.timeType,
      timeStart: d.timeStart,
      deadline: d.deadline,
      status: 'pending',
      visibility: visibility,
      createdAt: fmtDate(new Date()),
      runnerId: null,
      runnerNickname: null,
      runnerAvatar: '',
      takenAt: null,
      completedAt: null
    };
    errands.unshift(errand);
    // 后端返回 { orderId, visibility }，文案区分私单/大厅，前端可据此提示
    return delay({ orderId: errand.orderId, visibility: visibility });
  },

  // 代取详情：私单只有发布者/接单者/聊过该单的跑腿可见；can* 六个字段全部返回
  'GET /api/errands/:id': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');

    const isPublisher = Number(order.publisherId) === CURRENT_USER_ID;
    const isRunner = order.runnerId !== null && Number(order.runnerId) === CURRENT_USER_ID;
    const isChatPeer =
      order.visibility === 'private' && !isPublisher
        ? hasErrandConversation(orderId, order.publisherId, CURRENT_USER_ID)
        : false;

    if (order.visibility === 'private' && !isPublisher && !isRunner && !isChatPeer) {
      return fail(404, '订单不存在');
    }

    const editable = isPublisher && order.status === 'pending' && order.visibility === 'private';

    return delay(
      Object.assign({}, order, {
        canTake:
          !isPublisher &&
          order.status === 'pending' &&
          (order.visibility === 'hall' || isChatPeer),
        canEdit: editable,
        canPublish: editable,
        canComplete: isPublisher && order.status === 'taken',
        canCancel: isPublisher && (order.status === 'pending' || order.status === 'taken'),
        canRelease: isRunner && order.status === 'taken'
      })
    );
  },

  // 改私单：只有发布者、pending、private 三条件同时成立；不接受 visibility
  'PUT /api/errands/:id': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (Number(order.publisherId) !== CURRENT_USER_ID) return fail(403, '只有发布者可以修改订单');
    if (order.status !== 'pending' || order.visibility !== 'private') {
      return fail(409, '只有未发布的待接单私单可以修改');
    }

    const parsed = parseErrandPayload(data);
    if (parsed.error) return fail(400, parsed.error);
    const d = parsed.data;

    Object.assign(order, {
      pickupArea: d.pickupArea,
      pickupPlace: d.pickupPlace,
      deliveryLocation: d.deliveryLocation,
      itemSize: d.itemSize,
      itemDesc: d.itemDesc,
      remark: d.remark,
      reward: d.reward,
      timeType: d.timeType,
      timeStart: d.timeStart,
      deadline: d.deadline
    });
    return delay({ orderId: orderId, visibility: 'private' });
  },

  // 私单发布到大厅：只改 visibility，状态仍 pending
  'POST /api/errands/:id/publish': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (Number(order.publisherId) !== CURRENT_USER_ID) return fail(403, '只有发布者可以发布订单');
    if (order.status !== 'pending') return fail(409, '当前订单不能发布到大厅');
    if (order.visibility === 'hall') return fail(409, '订单已在大厅');

    order.visibility = 'hall';
    return delay({ orderId: orderId, status: 'pending', visibility: 'hall' });
  },

  'POST /api/errands/:id/take': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (Number(order.publisherId) === CURRENT_USER_ID) return fail(403, '不能接自己发布的订单');
    if (order.status !== 'pending') return fail(409, '该订单已被接单');
    // 私单：只有与该单建过会话的跑腿能接（后端 sp_take_errand 返回 4031）
    if (
      order.visibility === 'private' &&
      !hasErrandConversation(orderId, order.publisherId, CURRENT_USER_ID)
    ) {
      return fail(403, '该订单尚未发布到大厅，只有与发布者聊过该订单的跑腿可以接');
    }
    order.status = 'taken';
    order.runnerId = CURRENT_USER_ID;
    order.runnerNickname = currentUser.nickname;
    order.runnerAvatar = currentUser.avatarUrl || '';
    order.takenAt = fmtDate(new Date());
    return delay({ orderId: orderId, status: 'taken' });
  },

  'POST /api/errands/:id/complete': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (Number(order.publisherId) !== CURRENT_USER_ID) return fail(403, '只有发布者可以确认完成');
    if (order.status !== 'taken') return fail(409, '当前订单不能确认完成');
    order.status = 'completed';
    order.completedAt = fmtDate(new Date());
    return delay({ orderId: orderId, status: 'completed' });
  },

  'POST /api/errands/:id/cancel': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (Number(order.publisherId) !== CURRENT_USER_ID) return fail(403, '只有发布者可以撤回订单');
    if (order.status === 'pending') {
      order.status = 'cancelled';
      return delay({ orderId: orderId, status: 'cancelled' });
    }
    if (order.status === 'taken') {
      // 已接单撤回：退回待接单并清空接单人；**必须回 visibility**，
      // 前端据此区分文案「已退回大厅」/「已退回待接单」（后端 errands.js:637 一致）
      order.status = 'pending';
      order.runnerId = null;
      order.runnerNickname = null;
      order.runnerAvatar = '';
      order.takenAt = null;
      return delay({ orderId: orderId, status: 'pending', visibility: order.visibility });
    }
    return fail(409, '当前订单不能撤回');
  },

  'POST /api/errands/:id/release': (data) => {
    const orderId = parsePositiveInt(data.id);
    if (!orderId) return fail(400, '订单 ID 不合法');
    const order = errands.find((e) => e.orderId === orderId);
    if (!order) return fail(404, '订单不存在');
    if (order.runnerId === null || Number(order.runnerId) !== CURRENT_USER_ID) {
      return fail(403, '只有接单者可以释放订单');
    }
    if (order.status !== 'taken') return fail(409, '当前订单不能释放');
    order.status = 'pending';
    order.runnerId = null;
    order.runnerNickname = null;
    order.runnerAvatar = '';
    order.takenAt = null;
    return delay({ orderId: orderId, status: 'pending' });
  },

  // ---------------- 跑腿匹配（对照 runners.js，含全部 400 校验与三维过滤） ----------------
  'GET /api/runners': (data) => {
    const area = readTrimmed(data.area);
    if (!area) return fail(400, '取件片区不能为空');
    if (!campusUtil.isValidZone(area)) return fail(400, '取件片区不在可选范围内');

    const place = readTrimmed(data.place) || area;
    if (!backendIsValidPlace(place) || backendZoneOfPlace(place) !== area) {
      return fail(400, '地标与片区不匹配');
    }

    const timeType = readTrimmed(data.timeType);
    if (TIME_TYPES.indexOf(timeType) < 0) return fail(400, '时间类型不合法');

    const now = new Date();
    let windowStart = now;
    let windowEnd = null;
    if (timeType === 'deadline') {
      windowEnd = parseDateTime(readTrimmed(data.deadline));
      if (!windowEnd || windowEnd <= now) return fail(400, '时间参数不完整');
    } else if (timeType === 'range') {
      windowStart = parseDateTime(readTrimmed(data.timeStart));
      windowEnd = parseDateTime(readTrimmed(data.deadline));
      if (!windowStart || !windowEnd || windowStart >= windowEnd) return fail(400, '时间参数不完整');
    }

    let itemSize = '';
    if (data.itemSize !== undefined && readTrimmed(data.itemSize) !== '') {
      itemSize = readTrimmed(data.itemSize);
      if (ITEM_SIZES.indexOf(itemSize) < 0) return fail(400, '物品规格不合法');
    }

    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');

    const matched = [];
    runnerProfiles.forEach((r) => {
      if ((r.serviceAreas || []).indexOf(area) < 0) return;
      const places = r.servicePlaces || [];
      // 服务地标为空表示全片区接单；否则必须命中具体地标或片区名
      if (places.length && places.indexOf(place) < 0 && places.indexOf(area) < 0) return;
      if (itemSize && r.itemSizes.length && r.itemSizes.indexOf(itemSize) < 0) return;

      if (timeType === 'asap') {
        if (!effectiveOnline(r, now)) return;
      } else if (!slotOverlapsWindow(r.timeSlots, windowStart, windowEnd)) {
        // 计划没覆盖时，只有「随时接单且当前在线」的跑腿能服务（对齐后端）
        if (r.availabilityType !== 'now' || !r.isOnline) return;
      }

      matched.push({
        userId: r.userId,
        nickname: r.nickname,
        avatarUrl: r.avatarUrl,
        creditScore: r.creditScore,
        completedCount: r.completedCount,
        serviceAreas: r.serviceAreas,
        servicePlaces: r.servicePlaces,
        availabilityType: r.availabilityType,
        isOnline: effectiveOnline(r, now),
        timeSlots: r.timeSlots,
        itemSizes: r.itemSizes,
        basePrice: r.basePrice,
        remark: r.remark || ''
      });
    });

    matched.sort((a, b) => b.completedCount - a.completedCount || b.creditScore - a.creditScore);
    return delay({
      list: pageOf(matched, pg),
      total: matched.length,
      page: pg.page,
      pageSize: pg.pageSize
    });
  },

  // ---------------- 聊天（对照 chat.js，字段 messageId / isMine / 发消息只回 id+时间） ----------------
  'GET /api/conversations/unread-count': () => delay({ count: totalUnread(CURRENT_USER_ID) }),

  'POST /api/conversations': (data) => {
    const body = data || {};
    const peerId = parsePositiveInt(body.peerId);
    if (!peerId) return fail(400, 'peerId 不能为空');
    if (peerId === CURRENT_USER_ID) return fail(400, '不能和自己创建会话');

    const bizType = readTrimmed(body.bizType);
    if (['item', 'errand'].indexOf(bizType) < 0) return fail(400, 'bizType 不合法');

    const bizId = parseNonNegativeInt(body.bizId);
    if (bizId === null || (bizType === 'item' && bizId <= 0)) return fail(400, 'bizId 不合法');

    const peer = userOf(peerId);
    if (!peer || peer.status !== 'active') return fail(404, '对方用户不存在');
    if (bizType === 'item' && !items.some((i) => i.itemId === bizId)) return fail(404, '商品不存在');
    if (bizType === 'errand' && bizId > 0) {
      const order = errands.filter((e) => Number(e.orderId) === Number(bizId))[0];
      if (!order) return fail(404, '订单不存在');
      // P0-4：私单只允许发布者发起会话。私单的查看/接单授权依赖「存在该单会话」，
      // 若这里不拦，任何知道 publisherId + orderId 的人都能先插会话再查看/接走私单。
      if (order.visibility === 'private' && Number(order.publisherId) !== CURRENT_USER_ID) {
        return fail(403, '私单只能由发布者发起会话');
      }
    }

    let conv = conversations.find(
      (c) =>
        c.bizType === bizType &&
        Number(c.bizId) === Number(bizId) &&
        ((Number(c.userAId) === CURRENT_USER_ID && Number(c.userBId) === peerId) ||
          (Number(c.userBId) === CURRENT_USER_ID && Number(c.userAId) === peerId))
    );
    if (!conv) {
      conv = {
        conversationId: uid(),
        userAId: CURRENT_USER_ID,
        userBId: peerId,
        bizType: bizType,
        bizId: bizId,
        lastMessage: null,
        lastTime: null
      };
      conversations.unshift(conv);
    }
    return delay({
      conversationId: conv.conversationId,
      peerId: peer.userId,
      peerNickname: peer.nickname,
      peerAvatar: peer.avatarUrl || ''
    });
  },

  'GET /api/conversations': (data) => {
    const pg = parsePagination(data);
    if (!pg) return fail(400, '页码或每页条数不合法');
    const mine = conversations.filter((c) => isParticipant(c, CURRENT_USER_ID));
    mine.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return b.conversationId - a.conversationId;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return a.lastTime < b.lastTime ? 1 : a.lastTime > b.lastTime ? -1 : b.conversationId - a.conversationId;
    });
    const list = pageOf(mine, pg).map((c) => {
      const peer = peerOf(c, CURRENT_USER_ID);
      return {
        conversationId: c.conversationId,
        peerId: peer.peerId,
        peerNickname: peer.peerNickname,
        peerAvatar: peer.peerAvatar,
        lastMessage: c.lastMessage,
        lastTime: c.lastTime,
        unreadCount: unreadOf(c.conversationId, CURRENT_USER_ID),
        bizType: c.bizType,
        bizId: c.bizId
      };
    });
    return delay({ list: list, total: mine.length, page: pg.page, pageSize: pg.pageSize });
  },

  'GET /api/conversations/:id/context': (data) => {
    const conv = findConversation(data.id);
    if (!conv) return fail(404, '会话不存在');
    if (!isParticipant(conv, CURRENT_USER_ID)) return fail(403, '无权查看该会话');

    const bizId = Number(conv.bizId || 0);
    let bizSummary = null;
    if (conv.bizType === 'item' && bizId > 0) {
      const item = items.find((i) => i.itemId === bizId);
      if (item) {
        // 注意：商品卡片用 firstImage，聊天业务卡片用 coverUrl（接口文档 6 章）
        bizSummary = {
          itemId: item.itemId,
          title: item.title,
          coverUrl: item.firstImage || '',
          price: item.price,
          status: item.status
        };
      }
    } else if (conv.bizType === 'errand' && bizId > 0) {
      const order = errands.find((e) => e.orderId === bizId);
      if (order) {
        bizSummary = {
          orderId: order.orderId,
          itemSize: order.itemSize,
          pickupArea: order.pickupArea,
          pickupPlace: order.pickupPlace,
          reward: order.reward,
          status: order.status
        };
      }
    }
    return delay({ bizType: conv.bizType, bizId: conv.bizId, bizSummary: bizSummary });
  },

  'GET /api/conversations/:id/messages': (data) => {
    const conversationId = parsePositiveInt(data.id);
    if (!conversationId) return fail(400, '会话 ID 不合法');
    const afterId = parseNonNegativeInt(data.afterId);
    if (afterId === null) return fail(400, 'afterId 不合法');
    const limit = data.limit === undefined || data.limit === '' ? 20 : parsePositiveInt(data.limit);
    if (!limit || limit > 50) return fail(400, 'limit 不合法');

    const conv = findConversation(conversationId);
    if (!conv) return fail(404, '会话不存在');
    if (!isParticipant(conv, CURRENT_USER_ID)) return fail(403, '无权查看该会话');

    let list = messages
      .filter((m) => m.conversationId === conversationId && m.messageId > afterId)
      .sort((a, b) => a.messageId - b.messageId);
    // afterId=0 时取最近一页（对齐后端：DESC 取 limit 条再升序返回）
    if (afterId === 0 && list.length > limit) list = list.slice(list.length - limit);

    return delay({
      list: list.map((m) => ({
        messageId: m.messageId,
        senderId: m.senderId,
        msgType: m.msgType,
        content: m.content,
        createdAt: m.createdAt,
        isMine: Number(m.senderId) === CURRENT_USER_ID
      }))
    });
  },

  'POST /api/conversations/:id/messages': (data) => {
    const conversationId = parsePositiveInt(data.id);
    if (!conversationId) return fail(400, '会话 ID 不合法');
    const msgType = readTrimmed(data.msgType) || 'text';
    if (['text', 'image'].indexOf(msgType) < 0) return fail(400, '消息类型不合法');
    const content = readTrimmed(data.content);
    if (!content) return fail(400, '消息内容不能为空');
    if (msgType === 'text' && content.length > 500) return fail(400, '消息不能超过 500 字');
    if (msgType === 'image' && content.indexOf('/uploads/') !== 0) return fail(400, '图片地址不合法');

    const conv = findConversation(conversationId);
    if (!conv) return fail(404, '会话不存在');
    if (!isParticipant(conv, CURRENT_USER_ID)) return fail(403, '无权在该会话发送消息');

    const createdAt = fmtDate(new Date());
    const msg = {
      messageId: uid(),
      conversationId: conversationId,
      senderId: CURRENT_USER_ID,
      msgType: msgType,
      content: content,
      isRead: 0,
      createdAt: createdAt
    };
    messages.push(msg);
    // 触发器 trg_message_after_insert 维护会话摘要
    conv.lastMessage = msgType === 'image' ? '[图片]' : content.slice(0, 255);
    conv.lastTime = createdAt;

    // 发消息只回 { messageId, createdAt }（对齐 chat.js），不要回整条消息
    return delay({ messageId: msg.messageId, createdAt: createdAt });
  },

  'PUT /api/conversations/:id/read': (data) => {
    const conversationId = parsePositiveInt(data.id);
    if (!conversationId) return fail(400, '会话 ID 不合法');
    let lastMessageId = null;
    if (data.lastMessageId !== undefined && data.lastMessageId !== null && data.lastMessageId !== '') {
      lastMessageId = parsePositiveInt(data.lastMessageId);
      if (!lastMessageId) return fail(400, 'lastMessageId 不合法');
    }
    const conv = findConversation(conversationId);
    if (!conv) return fail(404, '会话不存在');
    if (!isParticipant(conv, CURRENT_USER_ID)) return fail(403, '无权操作该会话');

    messages.forEach((m) => {
      if (m.conversationId !== conversationId) return;
      if (Number(m.senderId) === CURRENT_USER_ID) return;
      if (m.isRead) return;
      if (lastMessageId && m.messageId > lastMessageId) return;
      m.isRead = 1;
    });
    return delay({ unreadCount: unreadOf(conversationId, CURRENT_USER_ID) });
  },

  // ---------------- 其它 ----------------
  // 分类：后端返回 { list }，字段 categoryId / name / sortNo
  'GET /api/categories': () => delay({ list: categories }),

  'POST /api/feedback': (data) => {
    const content = readTrimmed((data || {}).content);
    if (!content) return fail(400, '反馈内容不能为空');
    if (content.length > 500) return fail(400, '反馈内容不能超过 500 字');
    const feedbackId = uid();
    feedbacks.push({ feedbackId: feedbackId, userId: CURRENT_USER_ID, content: content });
    return delay({ feedbackId: feedbackId });
  },

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
        ok = false;
        break;
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

/** 已登记的路由清单（开发期核对 mock 覆盖率用） */
function routeKeys() {
  return Object.keys(routes);
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
    if (place && (!backendIsValidPlace(place) || backendZoneOfPlace(place) !== zone)) {
      warnings.push(where + ' 地标「' + place + '」不在片区「' + zone + '」的 52 地标清单内');
    }
  };

  errands.forEach((e) => checkPlace(e.pickupArea, e.pickupPlace, '订单 ' + e.orderId));

  runnerProfiles.forEach((r) => {
    (r.serviceAreas || []).forEach((z) => {
      if (!campus.isValidZone(z)) {
        warnings.push('跑腿 ' + r.userId + ' 服务片区「' + z + '」不在 25 片区清单内');
      }
    });
    (r.servicePlaces || []).forEach((pl) => {
      // 同样按后端语义：片区名本身也是合法地标
      if (!backendZoneOfPlace(pl)) {
        warnings.push('跑腿 ' + r.userId + ' 服务地标「' + pl + '」不在 52 地标清单内');
      }
    });
  });

  // 商品：书目类必须有 bookId + bookTitle（扁平字段，不是嵌套 book 对象）
  items.forEach((it) => {
    if (it.itemType === 'book' && (!it.bookId || !it.bookTitle)) {
      warnings.push('商品 ' + it.itemId + ' 是书目类但缺 bookId / bookTitle');
    }
  });

  if (warnings.length) {
    console.warn('[mock] 数据不合规，共 ' + warnings.length + ' 处：\n' + warnings.join('\n'));
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

module.exports = { has, run, selfCheck, routeKeys };
