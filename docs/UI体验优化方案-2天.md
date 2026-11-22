# 校园易站 UI 体验优化方案（2 天版）

> 版本：v1.0（2026-11-19）
> 目标：课程展示优先，先提升界面美观与“呼吸感”，再兼顾流畅度与低成本性能。
> 执行人：B（公共层 + B 的 14 页）
> 执行边界：A 的 6 页（首页、商品详情、搜索结果、发布商品、我的发布、我的收藏）默认由 A 按本方案第 6 节同步；如用户明确授权 B 代改，再纳入 B 的执行范围，避免分工越界。
> 工期：2 个工作日。P0 必做，P1 尽力，P2 可砍。
> 验收：用户 / A；以真机截图 + 演示路径走查为准。

---

## 0. 一句话方案

**不换组件库。** 用“统一设计令牌 + 组件打磨 + 克制动效 + 首屏入场”四件事，把现在的“平铺白卡”提升为“奶油纸感、有层次、有反馈”的界面。

---

## 1. 取舍：先明确不做什么

### 1.1 做

- 统一颜色、圆角、阴影、间距、字号、动效令牌。
- 打磨 6 个高频组件：`item-card`、`custom-tab-bar`、`place-picker`、`empty-state`、`nav-top`、`status-tag`。
- 给演示路径上的 10 个页面做视觉升级：登录、首页、搜索、商品详情、发布商品、我的、代取大厅、代取详情、聊天列表、聊天详情。
- 给卡片/按钮加按压反馈，给首屏列表加入场 stagger，给弹层加入场动画，给骨架加 shimmer，给空态加轻微漂浮。
- 修复现有令牌缺失和颜色语义错误（见 2.3、4.2）。

### 1.2 不做

- 不整体迁移 TDesign / Vant Weapp / ColorUI。
- 不切 Skyline 渲染引擎，不做 worklet 手势动画。
- 不引入 Tailwind / weapp-vite / Lottie / GSAP。
- 不做全站几十个元素的复杂入场，不做玻璃拟态和大面积模糊。
- 不改业务逻辑、接口、数据结构；动效只加展示层标记。

### 1.3 为什么

- 2 天、1 个执行人、20 个页面，全量换组件库会带来样式冲突、回归和工期风险。
- 当前 UI 已有设计令牌和骨架屏基础，问题不是“组件不够”，而是“节奏不统一、反馈太弱、层次太平”。
- 演示看的是首屏和主路径：把 10 个 P0 页面做细，收益远大于 20 个页面都做一半。

---

## 2. 现状诊断（带证据）

### 2.1 动效与反馈不足

- 全项目 WXSS 只有 **10 处** `transition / animation`，分布在 6 个文件。
- 全项目有 **52 处** `hover-class`，但多数只改 `opacity`，按下去“没手感”。
- 弹层 `place-picker` 没有入场动画；空态没有动效；骨架只有透明度脉冲。
- 图片加载完成直接出现，没有淡入；列表首屏没有入场节奏。

### 2.2 留白与层次不足

- `app.wxss` 的 `.card + .card` 只有 `16rpx` 间距，页面内缺少“分组留白”。
- 页面 padding 统一 `24rpx`，标题、搜索、分类、列表之间的节奏接近，视觉上平。
- 卡片几乎都是同白底、同阴影、同圆角，缺少“主卡 / 次卡 / 内嵌面”的层级。

### 2.3 设计令牌缺口与语义错误（P0）

当前 `app.wxss` 定义了 34 个令牌，但以下变量被页面使用、**没有定义**：

| 未定义令牌 | 使用文件 | 建议 |
|---|---|---|
| `--color-surface` | `chat/detail.wxss`、`chat/list.wxss`、`mine/errands.wxss` | 增加别名指向 `--color-bg-white` |
| `--color-primary-soft` | `chat/detail.wxss`、`chat/list.wxss`、`errand/runners.wxss` | 增加别名指向 `--color-primary-light` |
| `--color-text-1` | `chat/detail.wxss`、`chat/list.wxss`、`errand/runners.wxss`、`mine/errands.wxss` | 增加别名指向 `--color-text` |
| `--font-md` | 同上 4 个文件 | 增加别名指向 `--font-base` |

更严重的是 **`--color-primary` 的语义错用**：

- `app.wxss` 中 `--color-primary: #E6A874`（浅橙），但聊天/代取等页面写成 `var(--color-primary, #79513D)`，期望的是深棕。
- `var()` 的第二个参数只是“变量不存在时的兜底”，变量存在时不会生效，所以这些地方实际拿到的是 `#E6A874`。
- 受影响位置包括聊天气泡、发送按钮、代取价格、代取选中 tab、找跑腿联系按钮等；白字压浅橙，对比度不足，视觉也“发飘”。

**修复原则：**

- 白字/正文/实心按钮：用 `--color-primary-dark`（#79513D）。
- 浅色选中底 + 深色文字：用 `--color-primary-light` + `--color-primary-dark`。
- 价格文字：用 `--color-price`（#A7724F）。
- 不允许再用 `var(--color-primary, #79513D)` 这种“假兜底”。

### 2.4 结论

这轮优化不是“重做 UI”，而是把已有的奶茶色体系 **收紧成一套统一节奏**：

> 更松的页面留白 + 更柔的两层阴影 + 更大的卡片圆角 + 更短的动效 + 所有可点元素都有按压反馈。

---

## 3. 视觉方向：奶油纸感 · 轻层次

| 维度 | 规则 |
|---|---|
| 背景 | 保留 `#F4F1E7` 暖米色；不整页铺纯白 |
| 卡片 | 纯白 `#FFFFFF`；圆角 `24rpx`；两层低透明度阴影 |
| 内嵌面 | `#F1EAE0`；用于输入框、标签底、图片占位 |
| 主色 | `#E6A874` 只做填充/装饰，不做白字底 |
| 文字 | 主文字 `#2E2119`；次级 `#6B5B4D`；弱化 `#9A8875` |
| 价格 | `#A7724F`，大字号 + 数字等宽 |
| 圆角 | 卡片 24rpx；图片/内嵌 16rpx；胶囊 999rpx |
| 阴影 | 两层：贴近的 2rpx 柔影 + 12rpx 扩散影；避免黑色重影 |
| 动效 | 120ms 反馈 / 200ms 状态 / 320ms 入场；只动 `transform`、`opacity` |
| 禁止 | 彩色发光、玻璃拟态、每个卡片都浮起、超过 400ms 的动画 |

---

## 4. 全局层：令牌、别名与工具类（P0）

### 4.1 `app.wxss` 新增/调整

在 `page` 选择器内追加以下令牌（保留现有令牌，不删除）：

```css
page {
  /* 节奏 */
  --space-page: 32rpx;
  --space-section: 48rpx;
  --radius-card: 24rpx;
  --radius-inner: 16rpx;

  /* 动效 */
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 320ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1);

  /* 阴影：覆盖原 --shadow-card，新增两张 */
  --shadow-card:
    0 2rpx 4rpx rgba(121, 81, 61, 0.04),
    0 12rpx 32rpx rgba(121, 81, 61, 0.08);
  --shadow-card-hover:
    0 4rpx 12rpx rgba(121, 81, 61, 0.06),
    0 20rpx 48rpx rgba(121, 81, 61, 0.12);
  --shadow-bar: 0 -8rpx 32rpx rgba(121, 81, 61, 0.08);

  /* 兼容别名：先给 B 的旧页面止血，P2 再逐页替换 */
  --color-surface: var(--color-bg-white);
  --color-primary-soft: var(--color-primary-light);
  --color-text-1: var(--color-text);
  --color-primary-strong: var(--color-primary-dark);
  --font-md: var(--font-base);
}
```

同时调整全局卡片与页面容器：

```css
.page-body {
  padding: var(--space-page);
}

.card {
  padding: 28rpx;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.card + .card {
  margin-top: 20rpx;
}
```

> 注意：`gallery`、`pf-form`、`st-group` 等已有 `padding: 0` 的卡片会就近覆盖，不受影响。
> 不要改 `--color-primary` 的值；统一用 `--color-primary-dark` 表达深棕。

### 4.2 旧页面令牌替换清单（P0）

B 的文件按下面替换；A 的 6 页由 A 同步。

| 文件 | 查找 | 替换为 | 说明 |
|---|---|---|---|
| `pages/chat/detail.wxss` | `var(--color-primary, #79513D)` | `var(--color-primary-dark)` | 4 处：头像字、业务价、我方气泡、发送按钮 |
| `pages/chat/list.wxss` | `var(--color-primary, #79513d)` | `var(--color-primary-dark)` | 1 处：头像占位字 |
| `pages/errand/runners.wxss` | `var(--color-primary, #79513d)` | 按钮/选中用 `--color-primary-dark`；价格用 `--color-price` | 4 处 |
| `pages/mine/errands.wxss` | `var(--color-primary, #79513d)` | 选中 tab/chip、主按钮用 `--color-primary-dark`；价格用 `--color-price` | 5 处 |
| `pages/mine/favorites.wxss`（A 页） | `color: var(--color-primary)` | `color: var(--color-accent)` 或 `--color-price` | A 同步；浅橙心形在白底上太淡 |

### 4.3 全局工具类（直接追加到 `app.wxss`）

```css
/* 按压反馈：只动 transform / opacity，避免重排 */
.u-press {
  transition:
    transform 120ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 120ms cubic-bezier(0.22, 1, 0.36, 1);
}
.u-press--hover {
  transform: scale(0.985);
  opacity: 0.94;
}

/* 首屏入场：最多 6 个，延迟由页面内联 style 控制 */
@keyframes u-fade-up {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.u-enter {
  animation: u-fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 骨架 shimmer：替代各页面的 opacity pulse */
@keyframes sk-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
.sk-block {
  background: linear-gradient(90deg, #efe6d8 25%, #faf6ee 37%, #efe6d8 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

/* 分组标题：左侧短竖条，给详情/表单页建立节奏 */
.t-section {
  display: flex;
  align-items: center;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text);
}
.t-section::before {
  content: '';
  width: 6rpx;
  height: 26rpx;
  margin-right: 12rpx;
  border-radius: 3rpx;
  background: var(--color-primary);
}
```

按钮全局过渡：

```css
.btn {
  transition:
    transform 120ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 120ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.btn--press {
  transform: scale(0.98);
  opacity: 0.92;
}
```

> 使用方式：元素 `class` 加 `u-press`，`hover-class` 加 `u-press--hover`；按钮用 `hover-class="btn--press"`。
> 小程序 button 默认 `hover-class` 是 `button-hover`，但不同基础库表现不一致。P0 按钮请显式加 `hover-class="btn--press"`，不要依赖默认。

---

## 5. 组件级改造（P0）

### 5.1 `components/item-card`

文件：`components/item-card/index.wxss`

| 项目 | 改动 |
|---|---|
| 卡片 | `border-radius: 24rpx`；两层 `--shadow-card`；加 `transition` |
| list 模式 | `padding: 24rpx`；封面 `border-radius: 16rpx`；标题 30rpx/600 |
| grid 模式 | 封面顶部随卡片裁切；body `padding: 18rpx 22rpx 22rpx`；标题 28rpx/600 |
| 价格 | `font-variant-numeric: tabular-nums`；数字 38rpx/700 |
| 按压 | `hover-class` 对应类加 `transform: scale(0.985); opacity: .94; box-shadow: var(--shadow-card-hover);` |
| 图片 | 保持 `lazy-load`；图片容器固定宽高，禁止布局抖动 |

参考代码：

```css
.card {
  background: var(--color-bg-white, #ffffff);
  overflow: hidden;
  border-radius: 24rpx;
  box-shadow:
    0 2rpx 4rpx rgba(121, 81, 61, 0.04),
    0 12rpx 32rpx rgba(121, 81, 61, 0.08);
  transition:
    transform 120ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 120ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.card--list {
  padding: 24rpx;
}

.card--list .card__cover {
  border-radius: 16rpx;
}

.card--list .card__title {
  font-size: 30rpx;
  font-weight: 600;
}

.card--grid .card__body {
  padding: 18rpx 22rpx 22rpx;
}

.card--grid .card__title {
  font-size: 28rpx;
  font-weight: 600;
}

.card__num {
  font-size: 38rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.card--hover {
  transform: scale(0.985);
  opacity: 0.94;
  box-shadow:
    0 4rpx 12rpx rgba(121, 81, 61, 0.06),
    0 20rpx 48rpx rgba(121, 81, 61, 0.12);
}
```

### 5.2 `components/custom-tab-bar`

文件：`components/custom-tab-bar/index.wxss`

- 胶囊阴影更柔，保留现有滑动动画。
- 选中图标轻度上浮 + 放大；不要给文字加颜色过渡（会闪）。
- 可选半透明：`background: rgba(255,255,255,.96)`；`backdrop-filter` 在低端安卓可能不生效，必须保留实色兜底。

```css
.tab-bar {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12rpx 40rpx rgba(121, 81, 61, 0.16);
}

.tab-bar__pill {
  box-shadow: 0 4rpx 12rpx rgba(230, 168, 116, 0.35);
}

.tab-bar__icon-wrap {
  transition: transform 200ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

.tab-bar__item--active .tab-bar__icon-wrap {
  transform: translateY(-2rpx) scale(1.04);
}
```

### 5.3 `components/place-picker`

文件：`components/place-picker/index.wxss`

当前 `wx:if` 控制显隐，退场没有过渡；2 天内只做**入场**，退场直接消失，接受这个取舍。

```css
.pp-mask {
  animation: pp-fade 200ms ease-out;
}

.pp-panel {
  animation: pp-up 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pp-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pp-up {
  from {
    opacity: 0.6;
    transform: translateY(48rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

同时：
- `.pp-confirm` 加 `hover-class="btn--press"`（在 WXML 中）。
- 选中态 `pp-zone--active`、`pp-place--active` 保持深棕底白字，不要改回浅橙。
- `.pp-panel` 圆角统一 24rpx，顶部加一条 8rpx 的浅色拖拽提示条（可选，用 `::before` 实现）。

### 5.4 `components/empty-state`

文件：`components/empty-state/index.wxss`、`index.wxml`

- 空态图形加柔和光晕 + 3.2s 轻微上下浮动，避免“死图”。
- 标题 32rpx/600；描述 26rpx；按钮 80rpx 高、胶囊、深棕底。
- 按钮加按压反馈。

```css
.empty__art {
  position: relative;
}

.empty__art::before {
  content: '';
  position: absolute;
  left: -20rpx;
  right: -20rpx;
  top: 10rpx;
  bottom: -16rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(230, 168, 116, 0.18), transparent 70%);
}

.empty__box {
  animation: empty-float 3.2s ease-in-out infinite;
}

@keyframes empty-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

.empty__btn {
  height: 80rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  background: var(--color-primary-dark, #79513d);
  transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms;
}

.empty__btn--hover {
  transform: scale(0.98);
  opacity: 0.92;
}
```

WXML 给按钮加 `hover-class="empty__btn--hover"`。

### 5.5 `components/nav-top`

文件：`components/nav-top/index.wxss`

- 返回按钮加大按压反馈：`scale(.94)`。
- `fixed` 模式的导航条用半透明暖米底 + 可选模糊，内容滚过时有层次。
- 标题字重 600。

```css
.nav-top__back {
  transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms;
  background: rgba(255, 255, 255, 0.92);
}

.nav-top__back--hover {
  transform: scale(0.94);
  opacity: 0.9;
}

.nav-top__bar--fixed {
  background: rgba(244, 241, 231, 0.92);
  /* 可选；低端安卓不生效时自动退回上面的实色 */
  backdrop-filter: saturate(160%) blur(20rpx);
}

.nav-top__title {
  font-weight: 600;
}
```

### 5.6 `components/status-tag`

文件：`components/status-tag/index.wxss`

- 高度 44rpx、圆角 10rpx、字重 500，让状态标签更“实”。
- 保持现有对比度口径：实心标签白字只压深色底。

```css
.tag {
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 10rpx;
  font-size: 22rpx;
  font-weight: 500;
  letter-spacing: 0.2rpx;
}
```

---

## 6. 页面级改造（P0 演示路径）

> 演示路径：登录 → 首页 → 搜索结果 → 商品详情 → 发布商品 → 我的 → 代取大厅 → 代取详情 → 聊天列表 → 聊天详情。
> 以下 A 的页面由 A 按同一清单同步；B 的页面由 B 执行。

### 6.1 登录 / 注册

文件：`pages/login/login.wxml|wxss`、`pages/register/register.wxml|wxss`

- 两个页面统一：同一套顶部渐变、同一表单卡圆角 24rpx、同一提交按钮间距 32rpx。
- 登录页 logo 后加两个柔和的光晕圆（CSS 伪元素），不要用图片。
- 表单卡加 `u-enter`，延迟 60ms。
- 提交按钮加 `hover-class="btn--press"`。
- 注册页标题与登录页字号/字重对齐（44rpx/700）。

### 6.2 首页

文件：`pages/index/index.wxml|wxss`

- 顶部区域：左右 padding 改 `32rpx`；标题 44rpx/700；副标题行高 1.5；搜索胶囊与分类之间留 16rpx；分类与排序之间留 12rpx。
- 列表：`padding: 0 32rpx`；每项 `margin-top: 20rpx`；首项 24rpx。
- 首屏入场：给前 6 个 `.home-list__item` 加 `u-enter` + 内联延迟：

```xml
<view
  class="home-list__item {{index < 6 ? 'u-enter' : ''}}"
  style="animation-delay: {{index < 6 ? index * 40 : 0}}ms"
  wx:for="{{list}}"
  wx:key="itemId"
>
  <item-card mode="list" item="{{item}}" show-time="{{true}}" bind:tap="onTapItem" />
</view>
```

- 骨架屏：封面/线条改用 `sk-block`，删除本页 `home-pulse`。
- 搜索胶囊、分类 chip、排序、FAB 都加按压反馈（`u-press--hover` 或各自 hover 类加 `scale(.98)`）。
- 空态/错误态容器 padding 改 32rpx。

### 6.3 搜索结果

文件：`pages/search/result.wxml|wxss`

- 搜索框高度 80rpx；搜索按钮同步 80rpx；按钮加按压。
- 联想面板：加 `u-enter`；阴影用 `--shadow-card-hover`；圆角 20rpx。
- 历史/提示 chip：按压加 `scale(.97)`；选中/按下用浅主色。
- 书目卡片：圆角 24rpx；阴影统一；按下 `scale(.985)`；选中边框保持深棕 2rpx。
- 商品列表：`padding: 0 32rpx`；每项 20rpx；前 6 项加 `u-enter` + 40ms stagger。
- 骨架屏统一 `sk-block`。
- 排序行左右 padding 32rpx。

### 6.4 商品详情

文件：`pages/item/detail.wxml|wxss`

- 页面 padding 32rpx；卡片间距 20rpx。
- 轮播卡：圆角 24rpx；图片高度保持 520rpx；右下角计数胶囊加深色半透明底。
- “商品信息 / 商品描述 / 卖家”标题改用 `t-section`（WXML 加类，保留原类名做布局）。
- 价格数字 52rpx/700；标题 34rpx/600；成色/分类标签 22rpx。
- 卖家头像加一圈 4rpx 的页面底色描边，头像更“立”。
- 底部操作栏：`box-shadow: var(--shadow-bar)`；按钮加 `hover-class="btn--press"`；收藏按钮选中态保持浅主色底 + 深棕字。
- “回二手市场”链接按下 `scale(.985)`。

### 6.5 发布商品

文件：`pages/item/publish.wxml|wxss`

- 模式切换：选中项用深棕底白字；切换加 200ms 过渡；两项都加按压。
- 卡片标题改用 `t-section`；表单卡片内边距 28rpx。
- 图片格子：圆角 16rpx；添加按钮/删除按钮加按压；上传遮罩保持白底半透明。
- 地点 chip/书目联想行加按压反馈。
- 底部发布栏：`shadow-bar`；发布按钮加 `hover-class="btn--press"`。
- 表单错误提示颜色保持 `--color-danger`，不要用浅橙。

### 6.6 我的

文件：`pages/mine/index.wxml|wxss`

- 用户卡：圆角 28rpx；背景 `linear-gradient(135deg, #FCE7C8 0%, #FFFFFF 70%)`；加一个右上角柔光圆（伪元素）；头像加 4rpx 白圈。
- 昵称 36rpx/600；副标题 24rpx。
- 统计数字 38rpx/700 + `tabular-nums`；标签 22rpx；分隔线保留。
- 分组卡：圆角 24rpx；标题 22rpx + `letter-spacing: 2rpx`；cell 高度 100rpx；按下背景 `--color-surface-2`。
- 退出登录按钮加按压反馈。
- 用户卡、统计项、cell 都加 `transition`，按下时 `scale(.995)` 即可，不要过度。

### 6.7 代取大厅

文件：`pages/errand/hall.wxml|wxss`

- 顶部 padding 改 32rpx；标题 44rpx/700；chip 高度 56rpx；选中 chip 用浅主色底 + 深棕字。
- 订单卡：padding 28rpx；圆角 24rpx；阴影统一；按下 `scale(.985)` + 阴影加深。
- 路线区：在起点和终点之间加一条竖向虚线连接（WXML 加一个 `.order__connector`）：

```xml
<view class="order__line">
  <view class="order__dot order__dot--from"></view>
  <text class="order__place ellipsis">{{item.fromText}}</text>
</view>
<view class="order__connector"></view>
<view class="order__line">
  <view class="order__dot order__dot--to"></view>
  <text class="order__place ellipsis">{{item.toText}}</text>
</view>
```

```css
.order__connector {
  height: 20rpx;
  margin-left: 6rpx;
  border-left: 2rpx dashed var(--color-border);
}
```

- 报酬区加浅主色底胶囊，价格 36rpx/700 `tabular-nums`。
- 底部“查看详情 ›”改深棕或焦糖棕，加按压。
- 前 6 张卡加 `u-enter` + 40ms stagger；骨架统一 `sk-block`。

### 6.8 代取详情

文件：`pages/errand/detail.wxml|wxss`

- 与商品详情同一套卡片节奏：padding 32rpx、卡片间距 20rpx、圆角 24rpx。
- “路线 / 物品与订单 / 发布人与接单人”标题用 `t-section`。
- 路线卡起点/终点圆点保持深棕/焦糖；虚线保持。
- 报酬数字 52rpx/700；状态标签用 `status-tag`。
- 底部操作栏 `shadow-bar`；按钮加 `hover-class="btn--press"`。
- 订单编号复制行加按压背景。

### 6.9 聊天列表

文件：`pages/chat/list.wxml|wxss`

- 先完成 4.2 的令牌替换。
- 会话卡：`padding: 24rpx`；圆角 24rpx；`box-shadow: var(--shadow-card)`；`margin-bottom: 20rpx`；按下 `scale(.985)`。
- 头像 96rpx；未读角标加 2rpx 白描边，避免压头像糊。
- 名字 30rpx/600；最后一条消息 26rpx；时间 22rpx。
- 前 6 条会话加 `u-enter` + 40ms stagger。
- 骨架统一 `sk-block`。

### 6.10 聊天详情

文件：`pages/chat/detail.wxml|wxss`

- 先完成 4.2 的令牌替换；重点是我方气泡和发送按钮：
  - 我方气泡：`background: var(--color-primary-dark)`，白字。
  - 对方气泡：白底 + 1rpx `--color-border`，深色字。
  - 气泡圆角做“单角收口”：对方 `20rpx 20rpx 20rpx 6rpx`，我方 `20rpx 20rpx 6rpx 20rpx`。
- 业务卡片：白底、圆角 20rpx、阴影统一；按下 `scale(.985)`。
- 输入栏：白底 + `shadow-bar`；输入框底 `--color-surface-2`；发送按钮激活时深棕底白字，未激活时浅底灰字。
- 消息区背景可用极浅暖色渐变，不要抢气泡。
- 发送按钮加 `hover-class="btn--press"`。

### 6.11 P1 页面（只做统一替换，不做单独设计）

以下页面只做 4.1 全局令牌生效后的“统一扫尾”：

- `pages/mine/items`、`pages/mine/favorites`（A 页，A 同步）
- `pages/mine/errands`、`pages/mine/runner`
- `pages/errand/runners`
- `pages/mine/profile`、`pages/mine/settings`、`pages/mine/help`
- `pages/errand/publish`
- `pages/register`

统一动作：

1. 替换 4.2 的 `--color-primary` 误用。
2. 卡片圆角/阴影/间距跟随全局。
3. 所有可点的 cell/row/chip 加按压缩放（`.995`~`.98`）。
4. 页面 padding 从 24rpx 改 32rpx（仅页面级，不动卡片内部）。
5. 骨架统一 `sk-block`（如果有）。

---

## 7. 动效规范（B 执行时照这张表）

| 场景 | 时长 | 缓动 | 属性 | 备注 |
|---|---|---|---|---|
| 卡片/按钮按压 | 120ms | `cubic-bezier(.22,1,.36,1)` | `transform`、`opacity` | 按下 `scale(.98~.985)`，松开回弹 |
| 卡片阴影变化 | 200ms | `ease-out` | `box-shadow` | 只给可交互卡片 |
| 弹层入场 | 200~260ms | `ease-out` | `opacity`、`translateY` | 退场可省略 |
| 首屏列表入场 | 320ms | `ease-out` | `opacity`、`translateY` | 最多 6 个，stagger 40ms |
| 骨架 shimmer | 1.4s | `linear` | `background-position` | 循环，仅加载态 |
| 图片淡入（P2） | 200ms | `ease-out` | `opacity` | WebView 无原生 fade-in，需要 `bindload` |
| Tab 胶囊 | 240ms | 现有曲线 | `left` | 保持现状，不改 |

硬性规则：

- 只动 `transform` / `opacity`；不要动 `width` / `height` / `top` / `left`。
- 入场用 `ease-out`，退场用 `ease-in`；不要用 `linear` 做界面动效。
- 首屏入场只在首次加载做；上拉加载的新项不要重复入场。
- 任何动画不超过 400ms；空态漂浮除外（3s 左右，幅度 ≤ 8rpx）。
- 低端安卓演示时，若掉帧，优先关闭 `backdrop-filter` 和空态漂浮，保留按压反馈。

---

## 8. 性能与健壮性（低成本，不扩范围）

### 8.1 性能

- 首页、搜索、详情、大厅、聊天列表已有骨架；本轮只把 pulse 换成 shimmer，不新增页面骨架。
- 图片：保留 `lazy-load`；列表封面固定宽高；不要把大图放进 `setData`。
- 不引入 `initialRenderingCache`：收益有限，配置和验证成本高，2 天内不做。
- 不引入 `recycle-view`：当前列表规模用不上，且要求固定 item 高度，和瀑布流冲突。
- 不改构建链，不引 npm 依赖。

### 8.2 健壮性

B 在真机/开发者工具至少走一遍以下极端数据：

- 标题 100 个字符：卡片/详情不溢出、不遮挡价格。
- 无图片：显示“暂无图片”占位，卡片高度不塌。
- 价格为 0 / 很长：数字不换行、不压标签。
- 空列表/错误态：有明确出路（去登录/去发布/重试）。
- 320px 窄屏：按钮不重叠，底部栏不遮挡内容。
- iPhone 刘海屏：`env(safe-area-inset-bottom)` 生效，底部栏不被 home indicator 盖住。
- 聊天长消息：气泡不超出 70% 宽度，换行正常。
- 未读数 99+：角标不撑破头像。

> 不要为了动效改业务 JS；如果必须加状态（例如图片淡入），只加 `imgLoaded` 这类纯展示标记，并在组件 `observers` 里重置。

---

## 9. 2 天排期

### Day 1（公共层 + 首屏）

| 时间 | 任务 | 产出 |
|---|---|---|
| 09:00-10:00 | `app.wxss` 令牌、别名、工具类、卡片/按钮全局规则 | 全局样式基础 |
| 10:00-12:30 | 6 个组件改造：item-card、tabbar、place-picker、empty-state、nav-top、status-tag | 组件层完成 |
| 13:30-15:30 | 首页、搜索结果 | 首屏主路径 |
| 15:30-17:30 | 商品详情、代取大厅 | 核心详情/列表 |
| 17:30-18:00 | 开发者工具自测 + 截图 | Day1 截图包 |

### Day 2（其余页面 + 验收）

| 时间 | 任务 | 产出 |
|---|---|---|
| 09:00-11:00 | 登录/注册、我的、聊天列表、聊天详情 | P0 剩余页面 |
| 11:00-12:30 | 发布商品、代取详情、P1 页面令牌扫尾 | 全站一致性 |
| 13:30-15:30 | 边界数据走查 + 真机预览 + 修复 | 验收清单 |
| 15:30-16:30 | 前后对比截图（至少 8 组） | 交付材料 |
| 16:30-17:00 | 提交代码 + 交接说明 | 可演示版本 |

**砍单顺序：** 如果 Day1 结束 P0 未完成，Day2 先砍 P1 页面的单独设计，只保留令牌扫尾；再砍图片淡入（P2）；最后砍空态漂浮。**不要砍首页、详情、大厅、我的、聊天这 5 个演示重点。**

---

## 10. 验收标准

### 10.1 视觉

- 首页、详情、大厅、我的、聊天 5 个重点页面截图放在一起，卡片圆角、阴影、间距、字号节奏一致。
- 页面第一屏能看出“标题 → 搜索/筛选 → 内容卡”的层次，不是一整块平铺。
- 没有浅橙底 + 白字的低对比组合。
- 卡片不再全部一样重：主卡略抬、次卡贴地、内嵌面用暖灰。

### 10.2 动效

- 点卡片/按钮有明确按压反馈，松手回弹。
- 首屏列表有轻微入场，不拖沓、不遮挡内容。
- 地点弹层从底部滑入，不突兀。
- 骨架是 shimmer，不是呼吸闪烁。
- 没有超过 400ms 的界面动画。

### 10.3 一致性

- 全项目搜索 `var(--color-primary,` 为 0（B 的文件）。
- 全项目搜索未定义令牌为 0（4.1 的别名生效）。
- 所有卡片圆角/阴影来自全局令牌或组件统一值，不再出现 `12rpx / 16rpx / 24rpx` 混用（图片内圆角 16rpx 除外）。
- 聊天、代取、我的代取三个页面的主按钮颜色一致。

### 10.4 健壮性

- 第 8.2 节的 8 个极端场景全部通过。
- iOS/Android 各看一遍；至少一台真机。
- 页面切换、下拉刷新、上拉加载、弹层打开/关闭无白屏、无布局跳动。

### 10.5 性能

- 首页/搜索/详情首屏加载有骨架，无长时间白屏。
- 列表滚动无明显掉帧；如掉帧，先关 `backdrop-filter` 和漂浮动画。
- 不新增 npm 依赖，不新增图片资源（除非用户确认）。

---

## 11. 风险与回滚

| 风险 | 处理 |
|---|---|
| 全局 `.card` 改动影响面大 | 先改令牌和工具类，再改组件，最后改页面；分 3 次提交，便于回滚 |
| `var()` 在小程序组件内继承不确定 | 组件内使用字面值或带 fallback 的 `var(--x, 默认值)` |
| `backdrop-filter` 低端安卓不生效 | 必须保留实色背景兜底；演示机卡顿就关闭 |
| 动效导致列表重复播放 | 只给前 6 项加入场；上拉加载的新项不加 |
| 改到 A 的文件 | 开工前确认边界；A 的 6 页由 A 同步，B 不直接改 |
| 演示前发现样式回归 | 优先回滚最近一次 `style(...)` 提交；保留功能性提交 |

提交建议（小步）：

```text
style(tokens): 统一间距/阴影/动效令牌与兼容别名
style(components): 打磨卡片/空态/弹层/tabBar/navTop
style(pages): 首屏与详情演示路径视觉升级
style(mine+chat): 令牌纠偏与聊天气泡/输入栏
```

---

## 12. 交付物

1. 代码改动（按第 9 节排期）。
2. 至少 8 组前后对比截图：
   - 首页列表 / 首页骨架
   - 搜索结果（含联想）
   - 商品详情（首屏 + 底栏）
   - 代取大厅（筛选 + 卡片）
   - 我的（用户卡 + 统计）
   - 聊天列表 / 聊天详情
   - 地点选择弹层
   - 空态 / 错误态
3. 一页验收清单（第 10 节勾选）。
4. 如时间允许，录 30 秒演示路径视频，重点展示：按压反馈、列表入场、弹层滑入、聊天发送。

---

## 附录 A：B 的最小改动顺序

1. `app.wxss`：令牌 + 别名 + 工具类 + `.card` / `.btn`。
2. 4 个 B 页面的 `--color-primary` 替换（chat/detail、chat/list、errand/runners、mine/errands）。
3. 6 个组件。
4. 首页 / 搜索 / 详情 / 大厅 / 我的 / 聊天。
5. 其余 B 页只做令牌和间距扫尾。

## 附录 B：WXML 入场写法

```xml
<view
  class="home-list__item {{index < 6 ? 'u-enter' : ''}}"
  style="animation-delay: {{index < 6 ? index * 40 : 0}}ms"
  wx:for="{{list}}"
  wx:key="itemId"
>
  ...
</view>
```

> 只给首屏前 6 项；不要给 `item-card` 组件本身传入动画类，避免样式隔离和复用问题。

## 附录 C：验收勾选表

- [ ] 首页：标题/搜索/分类/列表四级层次清晰
- [ ] 首页：前 6 项入场 + 骨架 shimmer
- [ ] 搜索：联想面板入场 + 书目卡按压
- [ ] 商品详情：轮播/价格/信息/卖家/底栏五段清晰
- [ ] 发布商品：表单分组有节奏，底部按钮不遮挡
- [ ] 我的：用户卡/统计/分组卡有主次
- [ ] 代取大厅：筛选 chip 选中态正确，路线连接线出现
- [ ] 代取详情：底部操作栏按钮反馈正常
- [ ] 聊天列表：卡片阴影/圆角/未读角标统一
- [ ] 聊天详情：我方气泡深棕白字，输入栏不拥挤
- [ ] 地点弹层：滑入动画正常
- [ ] 空态/错误态：有出路、按钮可点
- [ ] 320px 窄屏 + 刘海屏无遮挡
- [ ] 全项目无未定义令牌、无浅橙白字
- [ ] 无新增 npm 依赖/图片资源
