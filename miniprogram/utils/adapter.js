/**
 * 字段适配层（B 成员：公共层）
 * ------------------------------------------------------------------
 * 为什么需要这一层：
 *   后端（A 的接口文档 + server/src/utils/item.js）返回的是 firstImage，
 *   而 item-card 组件的对外属性是 coverUrl。两种命名都对，但转换只能发生一次。
 *   把所有「后端字段 → 前端展示字段」的映射集中在这里，
 *   页面与组件只认一套口径，后端改名时只改这个文件。
 *
 * 硬约定：
 *   1. 金额一律转 Number（mysql2 的 DECIMAL 可能回来是字符串）
 *   2. 多值字段一律转数组（后端有时给单值、有时给数组）
 *   3. 时间保持后端原样字符串（YYYY-MM-DD HH:mm:ss），交给 util.formatTime 处理，
 *      不要在 iOS 上用 new Date('2026-11-11 10:00:00')，部分机型解析为 Invalid Date
 *   4. 任何字段缺失都降级为空值，不返回 undefined，不让页面出现 undefined 字样
 */
const config = require('../config');

/** 保证是数组：单值包一层，null/undefined 给空数组 */
function arr(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

/** 保证是有限数字，失败给 fallback */
function num(value, fallback) {
  const base = fallback === undefined ? 0 : fallback;
  if (value === undefined || value === null || value === '') return base;
  const n = Number(value);
  return Number.isFinite(n) ? n : base;
}

/** 相对路径补全为可访问 URL；已是 http(s) 的原样返回 */
function fullUrl(url) {
  const u = typeof url === 'string' ? url.trim() : '';
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  return config.BASE_URL + (u.charAt(0) === '/' ? u : '/' + u);
}

/**
 * 取封面：后端优先 firstImage（v_item_card.firstImage），
 * 兜底依次是 coverUrl、itemImages / images 的第一张。
 * 同时兼容 item_images 行对象（{ url }）与纯字符串两种形态。
 */
function pickCover(raw) {
  const direct = raw.firstImage || raw.coverUrl;
  if (direct) return fullUrl(direct);

  const images = arr(raw.itemImages || raw.images);
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const url = typeof img === 'string' ? img : img && img.url;
    if (url) return fullUrl(url);
  }
  return '';
}

/** 图片列表：既接受 ['/uploads/a.jpg'] 也接受 [{ url, sortNo }] */
function toImageList(raw) {
  return arr(raw.itemImages || raw.images)
    .map((img) => (typeof img === 'string' ? img : img && img.url))
    .filter((url) => !!url)
    .map((url) => fullUrl(url));
}

/**
 * 商品：后端 items 卡片行 → 前端商品对象
 * item-card 只读 coverUrl / price / originalPrice / conditionLevel / status / location / title / itemId
 */
function toItem(raw) {
  const item = raw || {};
  return {
    itemId: num(item.itemId || item.item_id || item.id, 0),
    title: item.title || '',
    description: item.description || '',
    price: num(item.price, 0),
    originalPrice: item.originalPrice === null || item.originalPrice === undefined
      ? null
      : num(item.originalPrice, null),
    coverUrl: pickCover(item),
    images: toImageList(item),
    conditionLevel: item.conditionLevel || '',
    negotiable: item.negotiable === true || item.negotiable === 1 || item.negotiable === '1',
    location: item.location || '',
    status: item.status || '',
    viewCount: num(item.viewCount, 0),
    favoriteCount: num(item.favoriteCount, 0),
    isFavorited: item.isFavorited === true || item.isFavorited === 1,
    itemType: item.itemType || 'normal',
    categoryId: item.categoryId === undefined ? null : item.categoryId,
    categoryName: item.categoryName || '',
    bookId: item.bookId === undefined ? null : item.bookId,
    bookTitle: item.bookTitle || '',
    sellerId: num(item.sellerId, 0),
    sellerNickname: item.sellerNickname || item.sellerName || '',
    sellerAvatar: fullUrl(item.sellerAvatar || ''),
    sellerCreditScore: num(item.sellerCreditScore, 0),
    createdAt: item.createdAt || ''
  };
}

function toItemList(list, key) {
  const source = key ? list && list[key] : list;
  return arr(source).map(toItem);
}

/**
 * 跑腿：后端 GET /api/runners 的行 → 前端跑腿对象
 * 后端字段：serviceAreas / servicePlaces / itemSizes（全部是数组）
 * 旧 mock 字段：pickupArea / pickupPlace / sizes（单值 + 数组混用）
 * 这里统一成数组，页面直接用 wx:for 渲染，不再判断单值。
 */
function toRunner(raw) {
  const runner = raw || {};
  return {
    userId: num(runner.userId, 0),
    nickname: runner.nickname || '',
    avatarUrl: fullUrl(runner.avatarUrl || ''),
    creditScore: num(runner.creditScore, 0),
    completedCount: num(runner.completedCount, 0),
    serviceAreas: arr(runner.serviceAreas || runner.pickupArea),
    servicePlaces: arr(runner.servicePlaces || runner.pickupPlace),
    itemSizes: arr(runner.itemSizes || runner.sizes),
    availabilityType: runner.availabilityType || runner.timeType || 'now',
    isOnline: runner.isOnline === true || runner.isOnline === 1,
    timeSlots: arr(runner.timeSlots),
    basePrice: num(runner.basePrice, 0),
    remark: runner.remark || ''
  };
}

function toRunnerList(list, key) {
  const source = key ? list && list[key] : list;
  return arr(source).map(toRunner);
}

module.exports = {
  arr,
  num,
  fullUrl,
  pickCover,
  toItem,
  toItemList,
  toRunner,
  toRunnerList
};
