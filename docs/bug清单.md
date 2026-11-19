# Bug 清单

> 共同维护（B 建档 11-19）。规则：每条带「编号 / 页面 / 现象 / 期望 / 复现步骤 / 严重 / 负责人 / 状态」。
> 严重度：**P0** 阻塞演示当天必修；**P1** 明显影响功能或数据；**P2** 打磨项。
> 结论来源：UI 走查（`UI走查记录-B.md`）与负向测试（`负向测试记录-B.md`）；已修的不删，标 ✅ 留痕供报告引用。

## 一、未修复（Open）

| # | 页面 | 现象 | 期望 | 严重 | 负责人 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| B-2 | 全局 `.page` | 非 tab 页套 `.page` 底部多约 150rpx 空白（避让悬浮 tabBar 的 padding 对非 tab 页多余） | 拆 `.page` / `.page--tab` | P2 | B（需 A 同意动 `pages/index/index.wxml`） | ⬜ 待确认 |
| B-4 | `utils/mock.js` | 未同步 A 的 v0.10 契约：favorites 忽略 `status`；items/:id 忽略 `view=0` 仍计数；POST items 未拦两位小数；大厅 `status` 仍允许已完成 | 按接口文档 v0.10 同步 mock/契约测试 | P2 | B | ⬜ 待 B |

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
| F-8 | `mine/items`、`mine/favorites` | 两页此前占位；收藏取消后列表不即时移除 | `mine/items` `48a90a8` 只读列表；`mine/favorites` 工作区：四状态筛选、状态标签左上、右下心形取消、取消后本地移除+静默刷新 | P1 | 11-19（favorites 未提交，待 DevTools） |

## 三、复验记录

| 日期 | 复验内容 | 结论 |
| --- | --- | --- |
| 11-19 | 负向测试 12 条（断网/401/404/500/空表单/非法报酬/超长消息/越权/连点/定时器泄漏/长文本/空态） | 12/12 通过，无新增 bug；证据 `scripts/smoke/smoke_negative.js` 40/0 |
