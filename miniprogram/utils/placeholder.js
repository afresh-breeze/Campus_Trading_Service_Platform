// 无图占位（B 成员，11-26 用户定稿）
// ------------------------------------------------------------------
// 二手商品未传封面、代取订单（errand_orders 表无图片字段）一律用本地
// 线条图案占位：assets/placeholder/ph-1..7.png。
// 按业务 id 做稳定哈希取一张——同一商品/订单在列表、详情、刷新之间永远
// 是同一张图，不会每次渲染跳变；不同条目尽量分散到 7 张上。
const COUNT = 7;

/**
 * 稳定随机占位图路径
 * @param {number|string} seed 业务 id（itemId / orderId）；空值也能给出稳定结果
 * @returns {string} '/assets/placeholder/ph-N.png'，N ∈ [1, 7]
 */
function pick(seed) {
  const s = String(seed === null || seed === undefined ? '' : seed);
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return '/assets/placeholder/ph-' + ((h % COUNT) + 1) + '.png';
}

module.exports = { pick, COUNT };
