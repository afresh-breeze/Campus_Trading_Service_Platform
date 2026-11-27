# Bug 清单

> 共同维护（B 建档 11-19）。规则：每条带「编号 / 页面 / 现象 / 期望 / 复现步骤 / 严重 / 负责人 / 状态」。
> 严重度：**P0** 阻塞演示当天必修；**P1** 明显影响功能或数据；**P2** 打磨项。
> 结论来源：UI 走查（`UI走查记录-B.md`）与负向测试（`负向测试记录-B.md`）；已修的不删，标 ✅ 留痕供报告引用。

## 一、未修复（Open）

| # | 页面 | 现象 | 期望 | 严重 | 负责人 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| （无 —— 11-20 起清单清空，新问题往下追加） | | | | | | |

## 二、已修复（Fixed，留痕）

| # | 页面 | 现象 | 修复 | 严重 | 修复日 |
| --- | --- | --- | --- | --- | --- |
| F-1 | `chat.js`（A 文件，B 修复） | `router.use(auth)` 缺失 → 会话列表/未读数 500 | `edf392d` 补挂 auth，`chat-auth-smoke.js` 15/0 回归 | P0 | 11-16 |
| F-2 | mock 用户表 | 代取单 2009-2011 发布人（11/12/13）不在 users 表 → 联系发布者 404「会话不存在」 | `bf70a17` 补 3 用户 + 契约回归 4 条 | P0 | 11-16 |
| F-3 | `mine/profile` | 头像链路两处断：`tempFiles[0].path`（undefined）+ 相对路径直接绑 image | `efec4cc` `tempFilePath` + `adapter.fullUrl` 双修 | P1 | 11-18 |
| F-4 | 大厅/资料/设置/帮助 | `--color-surface-2` 未定义，hover 反馈不生效 | `efec4cc` app.wxss 正式定义 `#F1EAE0` | P2 | 11-18 |
| F-5 | 冒烟脚本 | 硬编码 `E:/Qin/...` 不可移植 | `efec4cc` 改 `__dirname` 相对定位 | P2 | 11-18 |
| F-6 | `mine/runner` | 加载中渲染空表单（易误读「设置被清空」）、失败只 toast | `bec9651` 骨架屏 + 错误卡片 + 重试 | P1 | 11-17 |
| F-7 | UI 对比度 | 亮橙底白字 ≈2:1（按钮/标签/链接共 4 处） | 11-11 第一轮走查，统一压深棕 `#79513D` | P0 | 11-11 |
| F-8 | `mine/items`、`mine/favorites` | 两页此前占位；收藏取消后列表不即时移除 | `mine/items` `48a90a8` 只读列表；`mine/favorites` `e9fc5b4`：四状态筛选、状态标签左上、右下心形取消、取消后本地移除+静默刷新 | P1 | 11-19（B 11-20 复核确认已提交入库） |
| F-9 | 全局 `.page`（原 B-2） | 非 tab 页套 `.page` 底部多约 150rpx 空白（避让悬浮 tabBar 的 padding 对非 tab 页多余） | 11-20 A 同意后拆分：`app.wxss` 拆 `.page`/`.page--tab`，B 侧 3 个 tab 页加 `page--tab`，`index/index` 由 A 自加；`wxml_check` 全 PASS | P2 | 11-20 |
| F-10 | `utils/mock.js`（原 B-4） | 未同步 A 的 v0.10 契约：favorites 忽略 `status`；items/:id 忽略 `view=0` 仍计数；POST items 未拦两位小数；大厅 `status` 仍允许已完成 | 11-20 五组校验对齐 + 文案逐字对齐 `3e19a51`（含 status/visibility 非字符串边界）；契约测试 `[12]` 节 16 条，契约 **161/0**、冒烟 480/0 | P2 | 11-20 |
| F-11 | B 侧全站按压反馈（11-22 对齐引入） | 按压时「字快速抖动」：① 大厅/聊天列表卡 `u-enter` 入场动画（fill both 占用 transform）与 scale 按压叠加冲突（主因）；② scale 按压使文字逐帧重栅格化（小元素上感知明显） | 11-23 两步修复：第一步摘掉两处列表卡 u-enter；第二步分级——**卡片级按压恢复 item-card 口径（scale 0.985 + opacity 0.94 + 阴影加深）**：hall 订单卡/chat 会话卡/cd-biz/me-order/mine-hero；**行/小控件保持 opacity 或底色**（chips/sort/tabs/行格/btn--press/entry/fab 等）；scale 仅限整卡与纯图标。wxml_check PASS、契约 161/0、冒烟全过 | P1 | 11-23 |
| F-12 | 发布代取 `place-picker` | 有下级地标的片区（教学区等）选片区后点「确定」无反应：发布页漏传 `place-required`（11-15 建档即漏），组件按「找跑腿」口径放行片区直选，页面 `onPlaceConfirm` 又静默 return——弹层不动、无任何提示，表现为「无法选择取件地点」（11-24 用户实测反馈） | `publish.wxml` 补 `place-required="{{true}}"`（组件恢复「发布必须选到楼」拦截 + 提示文案切换）；兜底分支由静默 return 改为 toast「该片区需选择具体教学楼」；`smoke_publish` 38/0、`smoke_place_picker` 29/0 回归 | P1 | 11-24 |
| F-13 | 发布代取 / 找跑腿 radio-group | 选「中件/大件」「时间段/截止前」√闪一下弹回首项，**提交值也恒为首项**（大件单实际发 small、range 单实际发 asap）：`onSizeChange/onTimeTypeChange` 把 radio 的 value 字符串（'medium' 等）当索引 `Number()` 转换，NaN 恒落 0。11-24 用户录屏反馈；**冒烟桩此前喂的也是数字（`ev('1')`）恰好喂饱旧 bug，掩盖了真问题** | 发布页 + 找跑腿页 3 处 handler 改为按 value 反查索引（`indexOf(value)`）；冒烟桩全部改为真实 value 字符串（`ev('medium')` 等），并新增 [10] 节 6 条断言锁定 payload（medium/range 带时间/asap 无时间字段）；全项目扫描确认 `item/publish` 与 `runners.onSizeChange` 的同款写法绑定的是 picker（detail.value 本就是索引），无需修改。冒烟 **publish 44/0、runners_page 47/0**、合计 **497/0** | **P0** | 11-24 |

## 三、复验记录

| 日期 | 复验内容 | 结论 |
| --- | --- | --- |
| 11-19 | 负向测试 12 条（断网/401/404/500/空表单/非法报酬/超长消息/越权/连点/定时器泄漏/长文本/空态） | 12/12 通过，无新增 bug；证据 `scripts/smoke/smoke_negative.js` 40/0 |
| 11-20 | A 复核 4 项：mock v0.10 同步（B-4→F-10）、`.page--tab` 拆分（B-2→F-9）、B-1/B-3 关闭（F-8）、B 文档纠偏 | 全部闭环：契约 161/0、冒烟 480/0、`wxml_check` 全 PASS；已 fetch A 的 `d8dc508`，favorites 随 `e9fc5b4` 确认交付，mock 文案与 `3e19a51` 逐字核对一致 |
