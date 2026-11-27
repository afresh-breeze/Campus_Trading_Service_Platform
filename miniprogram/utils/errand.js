// 代取公共工具（B 成员，11-25 从 hall.js 抽出；11-26 占位图改版）
// ------------------------------------------------------------------
// 缩略图：errand_orders 表没有图片字段（真图片要 A 加字段，已列需求清单）。
// 11-25 版用 itemDesc/remark 关键词猜品类配 assets/errand/ 插画；
// 11-26 用户定稿改为 **无图占位**：assets/placeholder/ 7 张线条图案按
// orderId 稳定随机取一张（列表/详情/刷新永远同图，见 utils/placeholder.js）。
// 详情页预览与列表缩略图共用本函数，勿在页面里另写一份。

const placeholder = require('./placeholder');

/** 缩略图/预览图完整路径（11-26 起为按 orderId 稳定随机的占位图） */
function categoryIcon(order) {
  return placeholder.pick(order && order.orderId);
}

module.exports = {
  categoryIcon
};
