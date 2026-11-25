// 代取公共工具（B 成员，11-25 从 hall.js 抽出）
// ------------------------------------------------------------------
// 品类缩略图：errand_orders 表没有图片字段（真图片要 A 加字段，已列需求清单），
// 用 itemDesc/remark 关键词猜品类，配 assets/errand/ 下的本地插画。
// 原实现在 hall.js 内部；详情页也要用同一张图做顶部预览（11-25 用户要求对齐
// 二手详情页「预览图在上、详情在下」），抽到公共层避免两边规则漂移。
// 注意：规则顺序即优先级（先 food 后 doc…），调整前先跑 smoke_hall/smoke_detail。

const CATEGORY_RULES = [
  { key: 'food', words: ['外卖', '奶茶', '咖啡', '饭', '餐', '早餐', '午餐', '晚餐', '宵夜', '水果', '零食', '饮'] },
  { key: 'doc', words: ['文件', '打印', '资料', '书', '论文', '证件', '作业'] },
  { key: 'daily', words: ['药', '超市', '日用品', '纸巾', '水', '生活'] },
  { key: 'express', words: ['快递', '包裹', '菜鸟', '驿站', '取件'] }
];

/** 品类 key：food / doc / daily / express，全部未命中兜底 other */
function guessCategory(order) {
  const order2 = order || {};
  const text = ((order2.itemDesc || '') + ' ' + (order2.remark || '')).toLowerCase();
  for (let i = 0; i < CATEGORY_RULES.length; i += 1) {
    const rule = CATEGORY_RULES[i];
    if (rule.words.some((w) => text.indexOf(w) > -1)) return rule.key;
  }
  return 'other';
}

/** 品类插画完整路径（列表缩略图与详情页预览图共用） */
function categoryIcon(order) {
  return '/assets/errand/' + guessCategory(order) + '.png';
}

module.exports = {
  CATEGORY_RULES,
  guessCategory,
  categoryIcon
};
