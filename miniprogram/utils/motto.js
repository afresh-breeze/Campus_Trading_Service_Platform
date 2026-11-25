// 小票落款短句（B 成员：公共层，11-25）
// ------------------------------------------------------------------
// 用户定稿的 10 条短句：点进详情页随机抽一条，替换原「打印时间」行——
// 打印时间是打印机语义，页面里没有实际用途；短句更有表情，也和随机图案一个套路。
// 抽取时机在 onLoad（与随机图案同批），fetch/回跳/刷新不重抽，防文字闪变。
// 两个详情页共用：errand/detail（代取）+ item/detail（二手，A 已按交接文档接入小票）。
const MOTTOS = [
  'Keep going, never give up.',
  'Live in the moment.',
  'Every day is a new start.',
  'keep your spirit free .',
  'In my chill era.',
  'Fortune favors the bold.',
  'Have a nice day.',
  'Always radiant, always bright.',
  '˶ • × • ˶',
  'Good things loading…'
];

/** 随机取一条（均匀分布，无权重） */
function randomMotto() {
  return MOTTOS[Math.floor(Math.random() * MOTTOS.length)];
}

module.exports = {
  MOTTOS,
  randomMotto
};
