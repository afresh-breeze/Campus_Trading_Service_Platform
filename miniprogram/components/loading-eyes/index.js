// 游走的眼睛 loading（B 成员：公共层，11-25）
// ------------------------------------------------------------------
// 移植自 loading-ui 的 WanderingEyes（MIT，https://github.com/turbostarter/loading-ui），
// 源码参考克隆在仓库外 E:\Qin\Computer\数据库·\loading-ui-ref（勿入小程序包）。
// 原实现是 React + SVG/容器查询单位（cqmin），小程序不支持 → 重写为纯 WXSS：
//   · 瞳孔 = eye 内的绝对定位圆点，transform 位移（左→右→下→回中）；
//   · 眨眼 = eye 高度在 64↔24rpx 间瞬时收缩（overflow hidden 裁掉瞳孔，成眯眼效果）；
//   · 配色不照抄原版黑/白：眼白 = --color-bg-white（暖白），瞳孔 = --color-primary-dark
//     （#79513D 品牌深棕），阴影与 --shadow-card 同源暖棕——贴合奶茶色系不突兀。
// 场景：详情页等「发现/等待」语义的加载态（比转圈 spinner 更有表情）。
Component({
  properties: {
    // 一轮扫视+眨眼的周期（ms）。原版 10s，节奏偏慢偏萌；想更活泼传小一点
    duration: { type: Number, value: 10000 }
  }
});
