// 游走的眼睛 loading（B 成员：公共层，11-25）
// ------------------------------------------------------------------
// 移植自 loading-ui 的 WanderingEyes（MIT，https://github.com/turbostarter/loading-ui），
// 源码参考克隆在仓库外 E:\Qin\Computer\数据库·\loading-ui-ref（勿入小程序包）。
// 原实现是 React + SVG/容器查询单位（cqmin），小程序不支持 → 重写为纯 WXSS：
//   · 瞳孔 = eye 内的绝对定位圆点，transform 位移（左→右→下→回中）；
//   · 眨眼 = eye 高度在 64↔24rpx 间瞬时收缩（overflow hidden 裁掉瞳孔，成眯眼效果）；
//   · 配色不照抄原版黑/白：眼白 = --color-bg-white（暖白），瞳孔 = --color-primary-dark
//     （#79513D 品牌深棕），阴影与 --shadow-card 同源暖棕——贴合奶茶色系不突兀。
// 短句（11-25）：眼睛下方显示 utils/motto.js 的随机短句，每走完一轮动画换一条——
//   用 bindanimationiteration（动画每完成一周期触发一次）保证切换频率与眼睛动画严格同步，
//   不用 setInterval（计时器会与 CSS 动画漂移）。
// 全站接入（11-25）：页面级加载态 + 上拉加载 footer（传 mini 走紧凑模式）。
const mottoUtil = require('../../utils/motto');

Component({
  properties: {
    // 一轮扫视+眨眼的周期（ms）。原版 10s，节奏偏慢偏萌；想更活泼传小一点
    duration: { type: Number, value: 10000 },
    // 紧凑模式：上拉加载 footer 等小空间用（整体 0.55 缩放）
    mini: { type: Boolean, value: false },
    // 是否显示下方短句（默认开；纯图形场景可传 false）
    motto: { type: Boolean, value: true }
  },

  data: {
    mottoText: ''
  },

  lifetimes: {
    attached() {
      // 开场先随机一条；之后每轮动画结束换一条（onCycle）
      this.setData({ mottoText: mottoUtil.randomMotto() });
    }
  },

  methods: {
    // 眼睛动画走完一轮（animationiteration，周期 = --dur）→ 换一条短句
    onCycle() {
      this.setData({ mottoText: mottoUtil.randomMotto() });
    }
  }
});
