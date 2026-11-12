# 成员 B 开发计划与 Git 协作手册

> 适用对象：成员 B
> 项目：校园交易服务平台（Campus Trading Service Platform）
> 周期：2026-11-05 ~ 2026-11-30（26 个自然日）
> 分工口径：已按《课程设计开发计划.md》0.4 分工表与队友 A 确认。
>
> **本文件与《A成员开发计划与Git协作手册.md》的关系：**
> - 两份手册是**同一套口径的两面**：A 那份从数据库/后端主线看项目，这份从**小程序端、聊天全栈和材料**看项目。
> - 页面、分工、接口、表数量一律与 A 手册一致：**20 个页面、14 张表、4 视图 / 5 存储过程 / 2 函数 / 5 触发器**。
> - 冲突时的处理顺序：`docs/接口文档.md` > A 手册与 B 手册的公共约定 > 任一份手册的细节。发现不一致，先在群里说，再改文档。
> - 全书统一口径：A 6 页、B 14 页；P0 14 页、P1 6 页。

---

## 目录

- 0. 先看这一页
- 1. 开工前：分工、仓库、环境（11-05）
- 2. Git 零基础速通（协作者版）
- 3. 分支与合并总表
- 4. 26 天逐日计划
- 5. 小程序公共层手册（B 的地基）
- 6. 页面手册（B 的 14 个页面）
- 7. 聊天全栈手册（B 的后端部分）
- 8. Git 异常处理手册
- 9. 和 A 的协作规则
- 10. 报告、PPT、视频（B 的部分）
- 11. 检查清单
- 12. 附录

---

## 0. 先看这一页

### 0.1 你的职责边界

**你负责（B）：**

| 类别 | 具体内容 | 交付物 |
| --- | --- | --- |
| 小程序公共层 | `app.json`（20 个页面注册 + tabBar）、`app.wxss`（全局样式变量）、`app.js`（启动、登录态恢复）、`config.js`（BASE_URL）、`utils/request.js`（统一请求 + 401 处理） | `miniprogram/app.*`、`config.js`、`utils/` |
| 组件库 | `item-card`、`empty-state`、`status-tag`（A 的 6 个页面也要用） | `miniprogram/components/` |
| 登录注册 | 登录页、注册页、表单校验、token 存储、自动登录、退出登录 | `pages/login/`、`pages/register/` |
| 个人中心 | 个人中心、个人资料、设置、帮助（意见反馈） | `pages/mine/index|profile|settings|help` |
| 代取前端 | 代取大厅、发布代取、代取详情、找跑腿匹配、我的代取、接单设置/上线（同页两入口） | `pages/errand/hall|publish|detail|runners`、`pages/mine/errands`、`pages/mine/runner` |
| 聊天全栈 | `server/src/routes/chat.js`（会话、消息、已读、未读数）+ 消息列表页 + 聊天页 | `server/src/routes/chat.js`、`pages/chat/list|detail` |
| 片区地标常量 | `miniprogram/utils/campus.js`（A 给清单内容，你落地维护） | `utils/campus.js` |
| UI 与材料 | UI 走查、截图整理与编号、`report/报告.docx` 排版、`report/答辩PPT.pptx`、`report/系统演示.mp4` | `report/` |
| 报告 | 第 4、7、8、10 章 + AI 辅助开发专题 + 封面/摘要/目录/排版 | `report/B章节.md` 等 |
| 测试 | `docs/测试用例.md` 主笔、UI/聊天用例执行、测试记录整理 | `docs/测试用例.md` |

**A 负责（不要抢着做，除非 A 明确请你帮忙）：**

- `database/` 全部：14 张表 DDL、视图、存储过程、函数、触发器、权限、dump。
- `server/` 基础设施与业务：`app.js`、`db.js`、`middleware/auth.js`、`utils/`、`routes/auth.js`、`users.js`、`items.js`、`favorites.js`、`errands.js`、`upload.js`、`jobs/runnerOnline.js`。
- 二手 6 个页面：首页、商品详情、发布商品、搜索结果、我的发布、我的收藏。
- 报告第 1、2、3、5、6、9 章 + 参考文献。
- `readme.txt`、源码打包、数据库 dump。

**两个人共同负责：**

- 需求确认、`docs/接口文档.md`、测试、集成、答辩演练。
- 每天 21:30 同步进度。

### 0.2 三个最重要的交付

1. **11-07（M0）**：`app.json` 一次性注册全部 20 个页面（含 A 的 6 个）、`request.js` 能打通 `/api/health` 与 `/api/auth/me`、登录/注册页可用、token 存本地、401 自动跳登录。
2. **11-16（M2）**：代取 6 个页面可用 + 聊天全栈闭环（会话列表 → 聊天页 → 发消息 → 3 秒轮询 → 已读）。
3. **11-26（M4）**：`报告.docx` 初版完整、`答辩PPT.pptx` 12 页、`系统演示.mp4` 能播放。

这三个节点守住，11-30 就不会慌。任一节点要失守，立刻按 9.6 砍功能，先保 M2 和材料。

### 0.3 关键路径

```text
11-06 app.json 注册 20 页 + request.js + health 打通
  → 11-07 登录/注册页 + token + 401 跳转（M0）
    → 11-08 公共层稳定版 + 三个组件（A 的页面要用）
      → 11-09~11 片区地标选择器 + 发布代取页 + 代取大厅
        → 11-12~13 代取详情/我的代取/接单设置/上线
          → 11-13~15 聊天 API + 两个聊天页
            → 11-16 M2 代取 + 聊天闭环
              → 11-17~20 UI 走查、截图、测试用例
                → 11-21 功能冻结
                  → 11-22~25 报告第 4/7/8/10 章 + 合稿排版
                    → 11-26 PPT + 视频（M4）
                      → 11-27~29 彩排、定稿、三处备份
                        → 11-30 提交演示
```

**最危险的拖法**：10 个页面一起开工，每个都写一半。正确做法是**一个页面一个分支，写完接口联调通过再开下一个**；公共层和组件必须 11-08 前定型，否则 A 的 6 个页面会跟着返工。

### 0.4 当前进度（更新至 11-12）与接下来的事

> 这一节每完成一个阶段就改写一次。**只写有证据的进度**：代码入库、编译通过、A 确认，三者之一才算数。

#### 1）里程碑状态

| 里程碑 | 日期 | 状态 | 依据 |
| --- | --- | --- | --- |
| M0 环境与登录打通 | 11-07 | ✅ 已过 | `app.json` 注册 20 页；`/api/health`、`/api/auth/me` 可通；登录页渲染成功，开发者工具 **0 错误 0 警告** |
| M1 二手闭环（配合 A） | 11-11 | 🟡 配合中 | 公共层与组件已交付，A 可引用；B 侧页面尚未开始 |
| M2 代取 + 聊天闭环 | 11-16 | 🟡 进行中 | 后端已就绪：A 的 `routes/errands.js` 10 个接口 11-11 已推送（707 行）、B 的 `routes/chat.js` 7 个接口 11-11 已补齐；小程序侧 **代取大厅 + 详情页 11-12 已落地**（见 §0.4-6、§0.4-7），剩发布/找跑腿/我的代取/接单设置与聊天页 |

#### 2）公共层遗留项（A 11-10 评审提出的 7 项，已全部闭环）

| # | 问题 | 处理 | 状态 |
| --- | --- | --- | --- |
| 1 | 缺片区/地标常量 | 新增 `utils/campus.js`，落地 **25 个固定片区 + 52 条地标**，导出 `zonesByCategory/isValidZone/placesOfZone/isValidPlace/zoneOfPlace/searchLandmarks/displayArea` | ✅ |
| 2 | mock 路由键与后端不一致 | 改为后端真实路径（`/api/items/:id`、`/api/auth/me`、`/api/conversations/:id/messages`），并加 `:param` 通配匹配 `match()` | ✅ |
| 3 | `MOCK` 开关未成体系 | `config.MOCK = true`，`onLaunch` 打印提示；联调时改 `false` 即切真实后端，页面代码不动 | ✅ |
| 4 | 非 2xx 响应吞掉后端 `message` | `request.js` 在非 2xx 分支透出 `body.message`；`fail` 分支区分**超时**与**连不上后端** | ✅ |
| 5 | `app.js` 无启动引导 | 补 `bootstrap()`（冷启动用 `/api/auth/me` 校验 token，401 才清登录态，网络异常保留缓存）、`setSession/clearSession/isLogin/requireLogin` | ✅ |
| 6 | 注册页采集校区，与后端冲突 | 删除 `register.js` 的 `CAMPUS_LIST`/`onCampusChange` 与 `register.wxml` 的校区 picker，只提交 `studentNo/nickname/password` | ✅ |
| 7 | 未读数无统一刷新入口 | `app.js` 补 `refreshUnread()` + `setUnreadBadge()`，`onShow` 与 `bootstrap` 后各调一次；未读数按 `messages.is_read = 0` 聚合，**表内不存** | ✅ |

#### 3）公共组件（3 个，各 4 文件）

| 组件 | 用途 | 关键约束 |
| --- | --- | --- |
| `status-tag` | 状态标签，item/errand 两域 | 枚举严格对齐 `schema.sql`：item 用 `on_sale/reserved/sold/off_shelf`，errand 用 `pending/taken/completed/cancelled` |
| `empty-state` | 空状态，几何图形拼空盒子 | **不依赖图片资源**；只在真无内容时用，加载中用骨架屏 |
| `item-card` | 商品卡片，grid/list 两模式 | 字段取 `itemId/title/price/originalPrice/conditionLevel/status/coverUrl/location/sellerNickname`；成色枚举 `new/like_new/good/fair`；地点取 **`items.location`**，不是废弃的 `campus`。**`coverUrl` 是组件对外名，后端返回的是 `firstImage`，必须经 `utils/adapter.js` 的 `toItem()` 转换后再传入**，页面里不要手写字段映射 |

#### 4）口径修正（与 A 对齐后统一）

- **主色**：`app.wxss` 从 `#3b7cff` 改为 `#FFA726`（A 手册 §12.2 橙黄系）后，**11-11 再按用户提供的奶茶色板改为 `#E6A874`**：页面底 `#F4F1E7`、浅底 `#FCDBA9`、辅色 `#A7724F`、白字按钮 `#79513D`、最深 `#6A4431`。价格色 `#A7724F`。**红线不变：`#E6A874` 上不放白字**（对比度仅约 2:1）。细节见 `docs/UI走查记录-B.md`。
- **校区/片区**：全部改为 25 个固定片区，代码与假数据中**禁止出现"东校区/西校区"**（已清零）。
- **字段命名**：`items.campus → items.location`；`areaName/landmark → pickupArea/pickupPlace`；`relateType/relateId → bizType/bizId`；`lastMessageAt → lastTime`；`sellerName → sellerNickname`；`messages.msg_type` 仅 `text/image`，已读状态在 `messages.is_read`。
- **图片字段**：后端商品卡片返回 **`firstImage`**（`v_item_list` 的子查询），组件对外叫 `coverUrl`，两者由 `utils/adapter.js` 的 `toItem()` 统一转换，**转换只在这一处**；`mock.js` 也按 `firstImage` 返回，和后端同构。
- **跑腿字段**：`GET /api/runners` 返回 **`serviceAreas` / `servicePlaces` / `itemSizes`（全部数组）**，且 **`area` + `timeType` 为必填参数**，缺参后端直接 400；mock 已按同样规则拒绝缺参，字段也不再是旧稿的 `pickupArea / pickupPlace / sizes`。

#### 5）11-11 当日清单（已完成）

- [x] 1. `status-tag` 已接到「我的」页用户卡做**试渲染**（新增 `user` 域，`active`→正常 / `disabled`→已禁用）。⚠️ 微信开发者工具的编译验证需在本机执行，尚未留证。
- [x] 2. 「我的」页（tab 4）已实现：用户信息卡（头像/昵称/学号/信用分/账号状态）、四项统计（发布/收藏/代取/完成）、两组入口（我的发布/我的收藏/我的代取/接单设置 + 设置/帮助与反馈/关于）、退出登录；含下拉刷新与 `onShow` 刷新。
- [ ] 3. 21:30 与 A 同步：组件是否可用、**`routes/errands.js` 字段确认**（10 个接口 A 已于 11-11 推送，含 `PUT /:id`、`POST /:id/publish`，不再是排期问题）、11-12 代取详情页的状态机字段对齐。**（人工待办）**
- [x] 4. UI 走查第一遍：产出 `docs/UI走查记录-B.md`（22 条，B 侧 19 条已修）。**A 的 6 个页面仍是占位骨架，页面级走查被阻塞**，已在该文档 §3 留了落地后要复查的清单。
- [x] 5. 组件问题修复（对应当日 §4.3 要求）：网格卡片等高、图片占位底色、压图标签改实心、标签字号与灰标签对比度、空态颜色变量化；同时修掉 `app.wxss` 里 `.btn-primary` / `.fab` 白字压亮橙的**红线违规**。

#### 6）11-12 当日任务：代取详情页（已完成）

**主线：`pages/errand/detail` 由占位页重写（js 292 行 / wxml 136 行 / wxss 218 行 / json 4 行）**

| 手册 §4.4 要求 | 落地 |
| --- | --- |
| 展示状态、取件片区·地标·说明、送达地点、规格、时间、报酬、发布人、接单人 | 三段卡片：**头部**（`status-tag` + 私单标记 + 报酬 + 时间）、**路线**（取件→送达双圆点，地标与片区同名只显示一次，不出现「桃园 · 桃园」）、**信息**（规格/描述/订单号可复制/发布相对时间）+ 发布人/接单人卡（无头像时用昵称首字，不依赖图片资源） |
| 底部按钮按 `canTake/canComplete/canCancel/canRelease` 显示，前端不自己算 | `buildActions()` 只读后端 `can*`（含 `canPublish`），顺序：主操作 → 发布到大厅 → 撤回/取消 → 释放；**无主操作时把第一个提为主色**，避免整栏全灰。私单 `canEdit` 见下方「暂不渲染」 |
| 接单/完成/撤回/释放 各调对应接口 | `POST /:id/take`、`/complete`、`/cancel`、`/release`，并补 `/publish`（私单发布到大厅，11-11 新增接口） |
| 每个操作二次确认，文案写清后果 | `util.confirm()`；`taken` 状态下撤回文案单独区分「退回待接单（大厅单回大厅、私单仍为私单）」，不笼统写「回大厅」 |
| 409 冲突提示并刷新详情 | `handleActionError()`：409 →「手慢了，订单已被接走」+ 重拉；404 → 整页转错误态；其余透出后端 `message`（与 `response.js` 的 `code = status` 对齐） |
| `taken` 下「联系 TA」 | 仅 `taken/completed` 且 `chatPeerId` 存在时显示，跳 `/pages/chat/detail?peerId=<对方>&bizType=errand&bizId=<orderId>`；发布者找接单人、其他身份找发布者 |
| `onShow` 重拉 | 已实现（从聊天页返回能看到最新状态）；另加 `onPullDownRefresh` |

**顺带处理的边界**

- **私单 404 不是「加载失败」**：单独给「订单不存在或已删除」+ 可见范围说明 +「回代取大厅」按钮，不放死胡同。
- **`canEdit` 暂不渲染**：编辑需回填 `pages/errand/publish`，该页仍是占位（11-13 前落地），先不挂按钮，避免「点了没反应」的假故障；发布页落地后补一个即可（`detail.js` 头部有注释）。
- **`takenAt` 统一格式化**：走 `util.formatTime` 成 `YYYY-MM-DD HH:mm`，不直接吐后端 ISO 串。

**验证**：`node --check` 通过、`detail.json` 解析通过、WXML 标签配平；用 mock 数据跑 `apply()` 分支 **22 项断言全过**（5 种 `can*` 组合、三种时间口径、地标去重、报酬两位小数、`isPublisher/isRunner`、`chatPeerId` 双向、404 与缺 id 分支）。
**未做**：微信开发者工具编译留证与两账号并发联调（需本机环境）。**大厅页仍是占位，详情页暂时没有入口**，验证只能靠开发者工具「自定义编译模式」带 `id=2001` 直达。

#### 7）11-12 追加：代取大厅（已完成）

**为什么追加**：详情页做完后 tab 2「代取」仍是 17 行占位页，用户编译后看到骨架以为代码没生效。大厅是详情页唯一的入口，不补就等于详情页无法验收。

**`pages/errand/hall` 由占位页重写（js 184 行 / wxml 101 行 / wxss 217 行）**

| 手册 §6.7 要求 | 落地 |
| --- | --- |
| 只拉 `status=pending`，page/pageSize=10 | 请求固定 `{status:'pending', page, pageSize:10}`，**前端不再二次过滤状态**；`visibility=hall` 由后端 SQL 固定 |
| 卡片：片区·地标、送达地、报酬、时间、规格、发布人 | 路线两行（实心点=取件、空心点=送达）+ 右侧报酬；第二行规格/时间标签 + 备注；底部发布人·相对时间 |
| 点卡片进详情 | `navigateTo('/pages/errand/detail?id=')` |
| 下拉刷新 / 上拉加载 / 三态 | 全部实现；`hasMore = 已加载数 < total`，翻页失败只 toast 不清列表；上拉用 `loadingMore` 锁防重复请求 |
| 顶部「我要接单」入口 | `/pages/mine/runner?mode=online`（11-13 落地后生效） |
| 空列表 | 空态 +「去发布代取」；未登录单独给登录引导，不在大厅里弹 401 |
| 顶部在线人数条 | **不做**：后端无此数据（手册原话「若接口无此数据就省略，不要编」） |

**字段名纠偏**：手册 §6.7 表格原写 `errandId`，后端**实际返回 `orderId`**，已改。

**验证**：`node --check`、json 解析、WXML 配平通过；stub 掉 `Page/wx/getApp/request` 直跑页面逻辑 **34 项断言全过**（派生字段、时间三态、分页追加不重复、翻页失败保留列表、首屏失败错误态、未登录、跳转参数、空列表）。
**mock 补 3 条大厅演示单**（2009 橘园 range / 2010 第一运动场 asap / 2011 南区 large deadline），大厅从 2 条变 5 条，契约测试仍 88/0。

#### 8）已知阻塞（写在这里，避免口头遗忘）

- ~~A 的 `server/src/routes/errands.js` 仍为占位文件~~ → **已解除（11-11 复核）**：A 已推送 `routes/errands.js`，**707 行、10 个接口**全部实现（`GET /api/errands`、`GET /api/errands/mine`、`POST /api/errands`、`GET /api/errands/:id`、`PUT /api/errands/:id`、`POST /api/errands/:id/publish`、`:id/take`、`:id/complete`、`:id/cancel`、`:id/release`）。代取联调可直连真实后端，`mock.js` 退为离线兜底。
- ~~`routes/chat.js` 为 A 的待办~~ → **归属已纠正：聊天全栈归 B**（§1.2 分工表本来就是「A 只交付数据库对象」）。11-10 的提交 `695c5df` 已交付会话/消息表、`sp_get_or_create_conversation`、`fn_unread_count`、`trg_message_after_insert`、`v_conversation_base`，`routes/chat.js` 已由 B 于 11-11 补齐，不再互相等。
- ~~mock 与后端字段/校验不一致~~ → **已整改（11-11 复盘）**：`utils/mock.js` 经两轮对齐后共 **39 条路由**（服务端 40 条 − `POST /api/upload` 文件上传接口，该接口不适合 mock），入参校验、返回字段、失败码逐条对齐 `server/src/routes/*.js`；`scripts/mock-contract-test.js` 已扩到 **88 项断言全过**，作为回归门槛。**后端新增接口必须同步 mock 与断言**，否则 MOCK 模式会直接报「mock 未登记该接口」。
- ~~代取详情页无入口~~ → **已解除（11-12）**：`pages/errand/hall` 已实现列表并接好 `bindtap → /pages/errand/detail?id=`。
- 本地仓库落后远端 19+ 提交（代码经网页提交入库），**先 `pull` 再写新代码**，否则产生大量冲突。
- **A 的 6 个二手页面仍为占位骨架**（wxml 11 行），M1 的 UI 走查与 B 侧配合验收都要等页面落地（记录见 `docs/UI走查记录-B.md` #18）。
- **后端无 stats 聚合接口**：个人中心四项统计用 `items/mine`、`favorites`、`errands/mine` 的 `total` 派生，`/api/errands/mine` 必须支持 `status` 筛选（mock 已对齐）。

### 0.5 每天建议节奏

计划按每天 6 小时有效工作安排；有课的日子至少保证 4 小时，周末补到 6~8 小时。**里程碑不能挪，任务可以挪。**

| 时间 | 做什么 | 说明 |
| --- | --- | --- |
| 09:00-09:10 | `git pull`、看 A 的 PR、列今天 3 件事 | 先拉代码，不要上来就写 |
| 09:10-12:00 | 深度工作：页面骨架 / 聊天 API | 关掉聊天软件，先做最难的 |
| 14:00-17:30 | 联调、样式打磨、真机预览 | 下午适合反复试错 |
| 19:30-21:00 | 截图、补文档、写测试用例 | 当天做完当天验 |
| 21:00-21:20 | commit、push、开 PR | 不留到明天 |
| 21:30-21:45 | 和 A 同步 | 对接口、对进度、对明天 |
| 21:45-22:00 | 截图归档、更新 bug 清单 | 明天一来就能接着干 |

### 0.6 这份手册怎么用

- **Git 不熟**：先读第 2 章（协作者视角和 A 略有不同），再读第 3 章。
- **写页面时**：第 5 章是公共层约定，第 6 章是每个页面的字段、交互和异常状态。
- **写聊天后端时**：第 7 章，含 SQL、轮询、越权校验。
- **出问题时**：第 8 章 Git 异常、第 9 章协作规则。
- **做材料时**：第 10 章，含报告第 4/7/8/10 章模板、PPT 12 页、视频分镜。
- **交东西前**：第 11 章清单，打勾才算完成。

---

## 1. 开工前：分工、仓库、环境（11-05）

### 1.1 和 A 对齐的 8 件事

已经在群里确认过，这里留档，避免后面“我以为你会做”。

1. **分工**：A 做数据库 + 后端主线 + 二手 6 页；B 做公共层 + 登录/注册/个人中心 + 代取 6 页 + 聊天全栈 + 材料。
2. **`app.json` 只有 B 能改**：A 在 11-07 把 6 个页面路径发给 B，B 一次性注册 20 页，之后 A 不再动 `app.json`。
3. **`database/` 只有 A 能改**：B 需要加字段/加表，先在群里说，A 改 `schema.sql` / `objects.sql`，B 重新导入。
4. **聊天数据库对象由 A 交付**：B 写 `routes/chat.js` 和聊天页，但会话/消息表、`sp_get_or_create_conversation`、`fn_unread_count`、`trg_message_after_insert`、`v_conversation_base` 由 A 在 11-13 前交付。
5. **接口契约**：响应格式、分页、鉴权头、字段命名、图片 URL，按 1.4 执行。
6. **Git 模型**：`main` 只放里程碑；`dev` 日常集成；每人按任务切 `feature/*`；走 PR；里程碑才合 `main`。
7. **同步时间**：每天 21:30，15 分钟。
8. **演示环境**：微信开发者工具 + 本机后端 + 本机 MySQL；不做公网部署和域名备案。

### 1.2 分工口径（已确认）

| 模块 | A | B |
| --- | --- | --- |
| 数据库 DDL / 对象 / 权限 | 全部 | 只提需求，不改 SQL |
| Express 基础设施 / 鉴权 / 上传 | 全部 | 使用，不改 |
| 认证 / 用户 / 二手 / 收藏 / 代取 API | 全部 | 使用，不改 |
| 聊天 API | 只交付数据库对象 | 全部（`routes/chat.js`） |
| 二手 6 个页面 | 全部 | 不改 |
| 登录/注册/个人中心/个人资料/设置/帮助 | 不改 | 全部 |
| 代取 6 个页面（大厅/发布/详情/找跑腿/我的代取/接单设置-上线） | 不改 | 全部 |
| 聊天 2 个页面 | 不改 | 全部 |
| 小程序公共层 / `app.json` / 样式 / 组件 | 使用，不改 | 全部 |
| 报告 | 第 1、2、3、5、6、9 章 + 参考文献 | 第 4、7、8、10 章 + 封面/摘要/目录/排版 |
| PPT / 视频 | 提供数据库素材、讲数据部分 | 制作、录制、剪辑 |
| 测试 | 后端用例、并发、性能、安全 | UI 用例、聊天用例、测试记录整理 |

**两条硬规则：**

1. **`database/` 只有 A 能改。** 你需要加字段，先提需求。
2. **`miniprogram/app.json` 只有你能改。** 你一次注册完 20 页，之后不再频繁改动；A 要加页面必须先找你。

**全项目 20 个页面（唯一口径）：**

| # | 模块 | 页面 | 路径 | 优先级 | 负责人 |
| --- | --- | --- | --- | --- | --- |
| 1 | 登录注册 | 登录 | `pages/login/login` | P0 | **B** |
| 2 | 登录注册 | 注册 | `pages/register/register` | P0 | **B** |
| 3 | 二手 | 二手首页 | `pages/index/index` | P0 | A |
| 4 | 二手 | 商品详情 | `pages/item/detail` | P0 | A |
| 5 | 二手 | 发布商品 | `pages/item/publish` | P0 | A |
| 6 | 二手 | 搜索结果 | `pages/search/result` | P0 | A |
| 7 | 二手 | 我的发布 | `pages/mine/items` | P1 | A |
| 8 | 二手 | 我的收藏 | `pages/mine/favorites` | P1 | A |
| 9 | 代取 | 代取大厅 | `pages/errand/hall` | P0 | **B** |
| 10 | 代取 | 发布代取 | `pages/errand/publish` | P0 | **B** |
| 11 | 代取 | 代取详情 | `pages/errand/detail` | P0 | **B** |
| 12 | 代取 | 找跑腿匹配 | `pages/errand/runners` | P1 | **B** |
| 13 | 代取 | 我的代取 | `pages/mine/errands` | P0 | **B** |
| 14 | 代取 | 接单设置/上线 | `pages/mine/runner` | P0 | **B** |
| 15 | 聊天 | 消息列表 | `pages/chat/list` | P0 | **B** |
| 16 | 聊天 | 聊天页 | `pages/chat/detail` | P0 | **B** |
| 17 | 个人中心 | 个人中心 | `pages/mine/index` | P0 | **B** |
| 18 | 个人中心 | 个人资料 | `pages/mine/profile` | P1 | **B** |
| 19 | 个人中心 | 设置 | `pages/mine/settings` | P1 | **B** |
| 20 | 个人中心 | 帮助 | `pages/mine/help` | P1 | **B** |

- 合计：B 14 页、A 6 页；P0 14 页、P1 6 页。
- tabBar 4 个：首页、代取、消息、我的；**不新增“上线”板块**。
- “上线”不是独立页面，而是 `pages/mine/runner?mode=online`；个人页进入同一页时是“接单设置”模式。

### 1.3 文件归属表

| 文件 / 目录 | 负责人 | 说明 |
| --- | --- | --- |
| `miniprogram/app.json` / `app.wxss` / `app.js` | **B** | A 只使用，不改 |
| `miniprogram/config.js` | **B** | `BASE_URL`、轮询间隔等常量 |
| `miniprogram/utils/request.js` | **B** | 统一请求封装；A 只调用 |
| `miniprogram/utils/campus.js` | **B** | 25 片区 + 52 地标常量；A 提供清单内容 |
| `miniprogram/utils/format.js` | **B** | 时间/金额/状态文案格式化 |
| `miniprogram/components/` | **B** | `item-card`、`empty-state`、`status-tag` |
| `miniprogram/pages/login/`、`register/` | **B** | |
| `miniprogram/pages/mine/index|profile|settings|help|errands|runner/` | **B** | |
| `miniprogram/pages/errand/` | **B** | 大厅、发布、详情、找跑腿 |
| `miniprogram/pages/chat/` | **B** | 消息列表、聊天页 |
| `miniprogram/pages/index/`、`item/`、`search/`、`mine/items/`、`mine/favorites/` | A | 不碰 |
| `server/src/routes/chat.js` | **B** | 挂载点是 `/api/conversations`，A 已挂好 |
| `server/src/app.js`、`db.js`、`middleware/`、`utils/` | A | 不碰 |
| `server/src/routes/` 其他文件 | A | 不碰 |
| `server/package.json` | A | 要加依赖先问 A |
| `server/.env` | 各自本地 | **不提交 Git** |
| `database/` | A | 只读 |
| `docs/接口文档.md` | 共同 | A 写认证/用户/二手/代取/上传；B 写聊天段 |
| `docs/测试用例.md` | **B 主笔** | A 11-20 填后端结果 |
| `docs/B测试记录.md` | **B** | UI/聊天测试记录 |
| `docs/AI辅助开发记录-B.md` | **B** | 11-25 由你合并进附录 |
| `docs/bug清单.md` | 共同 | 11-21 后逐条修 |
| `report/B章节.md` | **B** | 第 4/7/8/10 章正文 |
| `report/报告.docx` | **B 唯一编辑** | A 不直接改，避免 Word 二进制冲突 |
| `report/答辩PPT.pptx` | **B 唯一编辑** | A 提供 P5~P8 素材 |
| `report/系统演示.mp4` | **B 录制剪辑** | `report/*.mp4` 不提交 Git |
| `report/assets/` | **B 统一编号** | A 的图加 `a_` 前缀 |
| `readme.txt` | A 主笔 | B 校对 |

### 1.4 接口契约（你按这个写页面）

页面里所有请求都要符合下面的约定，A 已经写进 `docs/接口文档.md`。

**统一响应格式：**

```json
{ "code": 0, "message": "ok", "data": {} }
```

- `code = 0` 成功；非 0 失败。
- HTTP 状态码同时使用：400 参数错误、401 未登录、403 无权限、404 不存在、409 状态冲突、500 服务器错误。
- 分页统一返回：`{ "list": [], "total": 0, "page": 1, "pageSize": 10 }`。
- 鉴权：请求头 `Authorization: Bearer <token>`。
- 时间：接口返回 `YYYY-MM-DD HH:mm:ss` 字符串。
- 金额：接口返回数字（元）。
- 枚举：数据库存英文（`on_sale`、`taken`），**前端负责映射中文**；片区、地标等名称型字典直接存中文。
- 图片：接口返回相对路径（`/uploads/xxx.jpg`），页面必须用 `BASE_URL + url` 拼接。**不要在前端硬编码 `127.0.0.1`**，真机演示会挂。
- 字段命名：接口字段 `camelCase`（`coverUrl`、`createdAt`、`pickupArea`）。

**B 会用到的主要接口清单：**

| 方法 | 路径 | 负责 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | A | 注册页 |
| POST | `/api/auth/login` | A | 登录页 |
| GET | `/api/auth/me` | A | 启动校验登录态 / 读个人资料 |
| PUT | `/api/users/me` | A | 保存个人资料（**不接受 `campus`**）|
| GET/PUT | `/api/users/me/runner-profile` | A | 接单设置回显/保存 |
| PUT | `/api/users/me/online` | A | 上线/下线 |
| GET | `/api/runners?area=&place=&timeType=&timeStart=&deadline=&itemSize=` | A | 找跑腿匹配页 |
| GET/POST | `/api/errands` | A | 代取大厅 / 发布代取 |
| GET | `/api/errands/:id` | A | 代取详情（含 `canTake`/`canEdit`/`canPublish`/`canComplete`/`canCancel`/`canRelease`） |
| PUT | `/api/errands/:id` | A | 修改未发布的私单（不接受 `visibility`）|
| POST | `/api/errands/:id/publish` | A | 私单发布到大厅 |
| POST | `/api/errands/:id/take` | A | 接单 |
| POST | `/api/errands/:id/complete` | A | 完成 |
| POST | `/api/errands/:id/cancel` | A | 发布者撤回 |
| POST | `/api/errands/:id/release` | A | 接单者释放 |
| POST | `/api/feedback` | A | 帮助页意见反馈 |
| GET/POST | `/api/conversations` | **B** | 会话列表 / 获取或创建会话 |
| GET | `/api/conversations/:id/messages?afterId=` | **B** | 增量拉消息 |
| POST | `/api/conversations/:id/messages` | **B** | 发送消息 |
| PUT | `/api/conversations/:id/read` | **B** | 标记已读 |
| GET | `/api/conversations/unread-count` | **B** | tabBar 未读红点 |

**页面跳转参数（A/B 必须一致）：**

```text
/pages/chat/detail?peerId=<对方userId>&bizType=item&bizId=<商品id>
/pages/chat/detail?peerId=<对方userId>&bizType=errand&bizId=<订单id>
/pages/errand/runners?area=北区教学区&place=第16教学楼&timeType=deadline&deadline=2026-11-20 18:00:00&itemSize=small
/pages/mine/runner?mode=online
/pages/errand/detail?id=<订单id>
/pages/item/detail?id=<商品id>
```

**你的页面必须能接收的入参：**

| 页面 | 必收参数 | 可选参数 |
| --- | --- | --- |
| `pages/chat/detail` | `peerId`、`bizType`、`bizId` | `conversationId` |
| `pages/errand/runners` | 无 | `area`、`place`、`timeType`、`timeStart`、`deadline`、`itemSize` |
| `pages/mine/runner` | 无 | `mode=online` |
| `pages/errand/detail` | `id` | — |

**接口变更流程：**

1. 在群里说“我要改哪个接口、为什么、影响谁”。
2. 改 `docs/接口文档.md` 对应段落（聊天段由你写）。
3. 双方确认后，各自改代码。
4. 不允许“代码先改了再说”。

### 1.5 小程序工程初始化（11-06 一次性做完）

**`app.json` 注册 20 页（含 A 的 6 页，A 在 11-07 给你路径）：**

```json
{
  "pages": [
    "pages/login/login",
    "pages/register/register",
    "pages/index/index",
    "pages/item/detail",
    "pages/item/publish",
    "pages/search/result",
    "pages/mine/items",
    "pages/mine/favorites",
    "pages/errand/hall",
    "pages/errand/publish",
    "pages/errand/detail",
    "pages/errand/runners",
    "pages/mine/errands",
    "pages/mine/runner",
    "pages/chat/list",
    "pages/chat/detail",
    "pages/mine/index",
    "pages/mine/profile",
    "pages/mine/settings",
    "pages/mine/help"
  ],
  "window": {
    "navigationBarTitleText": "校园交易服务平台",
    "navigationBarBackgroundColor": "#1f3a93",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f6f8"
  },
  "tabBar": {
    "color": "#8a8f99",
    "selectedColor": "#1f3a93",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/errand/hall", "text": "代取" },
      { "pagePath": "pages/chat/list", "text": "消息" },
      { "pagePath": "pages/mine/index", "text": "我的" }
    ]
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

> tabBar 图标可以先不配（不配就不显示图标，功能不受影响）；如果要配，图标放 `miniprogram/assets/tabbar/`，81×81 PNG，提交进 Git。

**`config.js`：**

```js
// 本机后端；真机预览时改成电脑的局域网 IP，例如 http://192.168.1.8:3000
const BASE_URL = 'http://127.0.0.1:3000';

module.exports = {
  BASE_URL,
  CHAT_POLL_INTERVAL: 3000,   // 聊天轮询间隔（毫秒）
  LIST_PAGE_SIZE: 10,         // 列表分页大小
  STORAGE_TOKEN: 'cs_token',
  STORAGE_USER: 'cs_user'
};
```

**`utils/request.js` 的最小实现（第 5 章会写完整版）：**

```js
const { BASE_URL, STORAGE_TOKEN } = require('../config');

function request({ url, method = 'GET', data = {}, auth = true, showLoading = false }) {
  return new Promise((resolve, reject) => {
    if (showLoading) wx.showLoading({ title: '加载中', mask: true });
    const header = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = wx.getStorageSync(STORAGE_TOKEN);
      if (token) header.Authorization = 'Bearer ' + token;
    }
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header,
      timeout: 10000,
      success(res) {
        if (showLoading) wx.hideLoading();
        const body = res.data || {};
        if (res.statusCode === 401) {
          wx.removeStorageSync(STORAGE_TOKEN);
          wx.reLaunch({ url: '/pages/login/login' });
          return reject(new Error('未登录'));
        }
        if (body.code === 0) return resolve(body.data);
        wx.showToast({ title: body.message || '请求失败', icon: 'none' });
        reject(new Error(body.message || '请求失败'));
      },
      fail(err) {
        if (showLoading) wx.hideLoading();
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = { request };
```

**开发者工具的设置：**

1. 详情 → 本地设置 → 勾选 **“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”**。
2. 详情 → 本地设置 → 调试基础库选稳定版（≥ 2.30）。
3. 编译模式可保存“登录页”“代取大厅”等自定义编译条件，切换页面快。

### 1.6 本机环境检查

| 工具 | 要求 | 用途 |
| --- | --- | --- |
| 微信开发者工具 | 稳定版，已登录 | 写页面、预览、截图 |
| Node.js | ≥ 20（A 用 24，你跟着用） | 跑后端，方便联调 |
| MySQL 8.0 | 本机一份 | 你也要能建库，方便自己造数据 |
| Navicat | 已安装 | 看数据、改演示数据、造测试数据 |
| VS Code | 已安装 | 写代码 |
| Git | ≥ 2.40 | 支持 `git switch` |

**你的本地库和 A 的是两份。** 你需要自己按 A 手册 1.7 建 `campus_service` 库、执行 `database/schema.sql`、`objects.sql`、`seed.sql`，再 `cd server && npm run seed`。A 改表结构后，你要重新导入一次。

---

## 2. Git 零基础速通（协作者版）

你和 A 用的是同一套模型，区别只在**你是 collaborator，不是仓库 owner**：你不能改仓库设置、不能加保护规则、不能删别人的分支，但**可以 clone、切分支、push、开 PR、合并 PR**。

### 2.1 六个概念

| 概念 | 通俗理解 | 你要记住的 |
| --- | --- | --- |
| 远程仓库 `origin` | GitHub 上的共享文件夹 | 两个人最终同步的地方 |
| 本地仓库 | 你电脑上的副本 | 你的代码先存在这里 |
| 分支 `branch` | 平行世界 / 草稿本 | 每个人在各自分支上改，互不打扰 |
| 提交 `commit` | 存档点 | 每完成一小块就存一次 |
| 推送 `push` | 把本地存档上传到 GitHub | 每天至少一次 |
| 拉取 `pull` | 把 GitHub 上新内容下载并合并到本地 | 每天开工第一件事 |
| 合并 `merge` | 把两个分支合到一起 | 通过 PR 或 `git merge` |
| 冲突 `conflict` | 两人改了同一行 | 手动选最终内容，不是报错 |

```text
你改的文件（工作区） → git add → 暂存区 → git commit → 本地仓库 → git push → GitHub
```

`git status` 会告诉你现在处于哪一步。

### 2.2 分支模型

```text
main    ──●────────────────●────────────────●────────────────●────────●
            \              /                /                /        /
dev           ●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●
               \    /      \    /      \    /
             feature     feature      feature
             /mp-base    /errand-pages /chat-api ...
```

- **`main`**：只放“能演示”的版本，只在里程碑从 `dev` 合进来。**永远不在 `main` 上写代码。**
- **`dev`**：日常集成分支，当天完成的功能合到这里，`dev` 也要能启动。
- **`feature/xxx`**：你的任务分支，从最新 `dev` 切出，做完合回 `dev` 再删。**一个分支只归一个人。**
- **`fix/xxx`**：修 bug，流程同 `feature`。
- **`docs/xxx`**：写报告/文档。

**你是协作者，注意三点：**

1. 不要直接改 `main`；也不要为了省事把 `feature` 直接合到 `main`。
2. 不要删 A 的分支；不要 `push --force`（会覆盖 A 的提交，这是最严重的事故）。
3. 合并别人的 PR 前，先看 `Files changed`，确认没动你的文件（`app.json`、`app.wxss`、`pages/`、`components/`）。

### 2.3 一次性配置

```bash
git config --global user.name "你的名字或 GitHub 昵称"
git config --global user.email "你的邮箱"

# pull 用 merge，不熟 rebase 就别用
git config --global pull.rebase false

# Windows 换行符转换
git config --global core.autocrlf true
```

**认证方式：**

- 第一次 `git push` 会弹浏览器让你登录 GitHub，登录一次后 Git Credential Manager 会记住。
- 如果提示输入用户名/密码：GitHub 不接受账户密码，要用 Personal Access Token（PAT）当密码，或改用浏览器登录。
- **不要把 token 写进代码、`.env.example` 或 README。**

### 2.4 第一次 clone 与确认

```bash
cd D:\Code
git clone https://github.com/afresh-breeze/Campus_Trading_Service_Platform.git
cd Campus_Trading_Service_Platform
git branch -a          # 应看到 main、dev、remotes/origin/dev
git switch dev
git pull origin dev
git log --oneline -5
```

`git ls-remote origin` 能列出 `refs/heads/main`、`refs/heads/dev`，说明网络和权限都正常。

### 2.5 每天的标准循环（7 步）

**第 1 步：看状态**

```bash
git status
```

工作区干净最好；有未提交改动，先提交或 `git stash`（见 8.6），**不要带着一堆改动切分支**。

**第 2 步：切 dev 并拉最新**

```bash
git switch dev
git pull origin dev
```

**第 3 步：从最新 dev 切任务分支**

```bash
git switch -c feature/errand-publish
```

命名规则（英文小写 + 连字符）：

- `feature/mp-base`、`feature/auth-pages`、`feature/errand-pages`、`feature/chat-api`、`feature/chat-pages`
- `fix/chat-poll`、`fix/errand-form`
- `docs/report-b`、`docs/ppt`

**第 4 步：写代码，小步提交**

```bash
git status
git diff
git add miniprogram/pages/errand/publish/
git commit -m "feat(errand): 发布代取页支持片区地标二级选择"
```

- `git add .` 可以用，但**先看 `git status`**，确认没有 `.env`、`node_modules`、`unpackage/`、视频、`report/*.mp4`。
- 一次提交只做一件事，30~60 分钟一次。

**第 5 步：推送**

```bash
git push -u origin feature/errand-publish   # 第一次
git push                                     # 之后
```

**第 6 步：在 GitHub 开 PR**

1. 仓库页面点 `Compare & pull request`（或 `Pull requests` → `New pull request`）。
2. `base` 选 **`dev`**，`compare` 选你的分支。
3. 标题：`feat(errand): 发布代取页与二级片区地标选择`。
4. 描述按 2.8 模板写。
5. 群里 @A：`PR #xx 麻烦看一下`。
6. A 留评论 → 你改 → `git push`，PR 自动更新。
7. A `Approve` → 点 `Merge pull request` → `Confirm merge` → `Delete branch`。

**第 7 步：同步 dev、删本地分支**

```bash
git switch dev
git pull origin dev
git branch -d feature/errand-publish
git fetch --prune
```

`git branch -d` 报 “not fully merged” 说明还没真合并，**不要用 `-D` 强删**。

### 2.6 命令速查表

| 目的 | 命令 | 备注 |
| --- | --- | --- |
| 看状态 | `git status` | 最常用 |
| 看当前分支 | `git branch` | 带 `*` 是当前 |
| 看所有分支 | `git branch -a` | 远程显示 `remotes/origin/xxx` |
| 切分支 | `git switch dev` | 旧写法 `git checkout dev` |
| 新建并切 | `git switch -c feature/xxx` | 先从最新 dev 切 |
| 拉取 | `git pull origin dev` | 先提交本地改动 |
| 推送（首次） | `git push -u origin <分支>` | 建立跟踪 |
| 推送（之后） | `git push` | |
| 看改动 | `git diff` | 未暂存 |
| 看已暂存 | `git diff --staged` | `git add` 之后 |
| 暂存文件 | `git add <文件>` | 建议按文件加 |
| 提交 | `git commit -m "feat(xxx): ..."` | 消息要能看懂 |
| 看历史 | `git log --oneline --graph --all -20` | 看合并关系 |
| 看远程 | `git remote -v` | 确认 origin |
| 把 dev 合进当前分支 | `git merge dev` | 当前分支是 feature 时 |
| 放弃工作区修改 | `git restore <文件>` | **会丢失未提交修改** |
| 取消暂存 | `git restore --staged <文件>` | 内容还在 |
| 暂存工作 | `git stash push -m "wip: xxx"` | 见 8.6 |
| 恢复暂存工作 | `git stash pop` | |
| 打标签 | `git tag -a v1.0-m3 -m "..."` | 里程碑 |
| 清理远程已删分支 | `git fetch --prune` | |

### 2.7 commit message 规范

格式：`<type>(<scope>): <中文描述>`

| type | 用途 | 例子 |
| --- | --- | --- |
| `feat` | 新功能 | `feat(chat): 会话列表与未读红点` |
| `fix` | 修 bug | `fix(errand): 修复发布页片区切换后地标未清空` |
| `style` | 样式/UI | `style(mp): 统一卡片圆角与阴影` |
| `docs` | 文档 | `docs(report): 完成第 7 章系统实现` |
| `test` | 测试 | `test: 补充聊天用例 12 条` |
| `refactor` | 重构 | `refactor(mp): 抽取状态文案映射` |
| `chore` | 杂项 | `chore: 添加 tabBar 图标` |

好例子：`feat(mp): app.json 注册 20 个页面并配置 tabBar`、`feat(chat): 3 秒轮询增量拉取消息`、`fix(mine): 修复个人中心头像不刷新`。

坏例子：`update`、`111`、`改了一下`、`最终版`、`再改最后一次`。

> commit 历史会出现在报告和答辩里（“两个人怎么分工”可以用 Git 记录证明），写清楚对你有利。

### 2.8 PR 模板与审查

```markdown
## 做了什么
- 新增 pages/errand/publish 页面：片区 → 地标二级选择、三种时间模式、报酬校验
- 复用 components/empty-state，新增表单校验提示

## 怎么验证
- [ ] 开发者工具编译通过，控制台无报错
- [ ] 选片区后地标列表正确联动；只选片区时 pickupPlace = 片区名
- [ ] timeType=asap 时不传时间；deadline/range 校验通过
- [ ] 提交成功后跳转 /pages/errand/detail?id=xx

## 截图
（贴 2~3 张：正常态、校验失败、提交成功）

## 需要 A 注意
- 发布成功依赖 POST /api/errands 返回 orderId
- pickupPlace 可能传片区名，后端校验要放行
```

**审查清单：**

- [ ] 只改了本分支该改的文件，没动 A 的 `database/`、`server/src`（除 `routes/chat.js`）。
- [ ] 没有 `.env`、`node_modules`、大文件、视频。
- [ ] 开发者工具编译无报错，无 `console.log` 残留（尤其是 token、密码）。
- [ ] 页面有加载/空/错误三态。
- [ ] 接口字段与 `docs/接口文档.md` 一致，没有硬编码假数据。
- [ ] 涉及 `app.json` 的改动，A 已知会。

**PR 大小**：一个 PR 不超过 400 行、10 个文件；不挂超过 2 天；半成品用 Draft PR。

### 2.9 什么时候建分支、什么时候合并

**建分支**：开始新页面前、修 bug 前、写报告一章前。建之前必须 `git switch dev && git pull origin dev`。

**合到 `dev`**：当天功能做完、本地编译通过、接口联调通过后；最晚第二天早上。

**合到 `main`**：只在里程碑（11-07、11-11、11-16、11-21、11-26、11-29），必须 PR，合并后打 tag。

**不要做**：在 `main`/`dev` 上直接写代码；feature 直接合 `main`；分支活过 3 天；重复使用已合并分支。

---

## 3. 分支与合并总表

这张表是全局视图，具体每天做什么见第 4 章。**B 的分支只写 B 的任务；A 的分支见 A 手册第 3 章。**

| 日期 | 分支 | 内容 | 合并到 | 里程碑 |
| --- | --- | --- | --- | --- |
| 11-06 | `feature/mp-base` | `app.json` 20 页 + tabBar、`app.wxss`、`app.js`、`config.js`、`request.js`、`utils/campus.js` 骨架 | `dev` | — |
| 11-07 | `feature/auth-pages` | 登录页、注册页、token 存储、401 跳登录、个人中心骨架 | `dev` | M0 |
| 11-08 | `feature/mp-components` | `item-card`、`empty-state`、`status-tag`、`request.js` 稳定版 | `dev` | — |
| 11-09 | `feature/errand-form` | 片区地标选择器、发布代取页骨架 | `dev` | — |
| 11-10 | `feature/errand-hall` | 代取大厅列表、下拉刷新、上拉加载 | `dev` | — |
| 11-11 | `fix/mp-ui-m1` | 配合 M1 的 UI 走查修复、组件微调 | `dev` | M1 |
| 11-12 | `feature/errand-detail` | 代取详情页、接单/完成/撤回/释放按钮与二次确认 | `dev` | — |
| 11-13 | `feature/runner-setting` | 接单设置页、上线/下线、计划列表增删改 | `dev` | — |
| 11-13~14 | `feature/chat-api` | `routes/chat.js`：会话列表、获取或创建、消息、已读、未读数 | `dev` | — |
| 11-14 | `feature/chat-pages` | 消息列表页、聊天页、3 秒轮询 | `dev` | — |
| 11-15 | `feature/mine-errands` | 我的代取（发布/接单两个 tab）、找跑腿匹配页 | `dev` | — |
| 11-16 | `fix/m2-integration` | M2 联调修复 | `dev` | M2 |
| 11-17 | `style/ui-walkthrough` | UI 走查第一轮：三态、间距、文案统一 | `dev` | — |
| 11-18 | `docs/screenshots` | 截图清单、编号、`report/assets/` 归档 | `dev` | — |
| 11-19 | `fix/negative-cases` | UI 负向测试：断网、401、404、超时 | `dev` | — |
| 11-20 | `docs/test-cases` | `docs/测试用例.md` 主笔 + 执行记录 | `dev` | — |
| 11-21 | `release/m3`（PR：`dev` → `main`） | 功能冻结 | `main` | `v1.0-m3` |
| 11-22 | `docs/report-b-ch4` | 报告第 4 章逻辑设计 | `dev` | — |
| 11-23 | `docs/report-b-ch78` | 报告第 7、8 章 | `dev` | — |
| 11-24 | `docs/report-b-ch10` | 第 10 章 + AI 专题 + 封面/摘要/目录 | `dev` | — |
| 11-25 | `docs/final-report`（你主导） | 合稿、排版 `报告.docx`、PPT 初稿 | `dev` | — |
| 11-26 | `chore/release-package` | PPT 定稿、视频初版、打包 | `dev` | M4 |
| 11-27~29 | `fix/rehearsal`（按需） | 彩排问题、视频定稿 | `dev` → `main` | `v1.0-final` |
| 11-30 | — | 提交与现场演示 | — | — |

**里程碑合并的固定动作（你也要会，A 忙的时候由你开 PR）：**

```bash
# 1. 确认 dev 最新、能启动
git switch dev
git pull origin dev

# 2. GitHub 开 PR：base=main，compare=dev
#    标题：release: v0.3 M2 代取与聊天闭环
#    合并方式：Create a merge commit

# 3. 合并后同步 main 并打 tag
git switch main
git pull origin main
git tag -a v0.3-m2 -m "M2: 代取与聊天闭环"
git push origin v0.3-m2

# 4. 把 main 合回 dev
git switch dev
git merge main
git push origin dev
```

第 4 步多出的 `Merge branch 'main' into dev` 是正常的，保证两边一致。

---

## 4. 26 天逐日计划

每天的结构固定：**今天完成 → 怎么做 → 验收 → Git**。里程碑当天多一项“对齐检查”。

### 4.1 阶段总览

| 阶段 | 日期 | 目标 | 你的产出 |
| --- | --- | --- | --- |
| P1 地基 | 11-05 ~ 11-08 | 公共层 + 登录 + 组件 | `app.json` 20 页、`request.js`、3 组件、登录注册页 |
| P2 二手配合 | 11-09 ~ 11-11 | 支撑 A 的二手闭环，同时起步代取 | 组件修复、UI 走查、发布代取页骨 |
| P3 代取 | 11-11 ~ 11-13 | 代取 6 页 | 大厅/发布/详情/我的代取/接单设置-上线 |
| P4 聊天 | 11-13 ~ 11-16 | 聊天全栈 | `routes/chat.js` + 2 页 + 3 秒轮询 |
| P5 质量 | 11-17 ~ 11-21 | UI、截图、测试用例 | 走查清单、截图归档、`测试用例.md` |
| P6 材料 | 11-22 ~ 11-26 | 报告、PPT、视频 | 第 4/7/8/10 章、docx、pptx、mp4 |
| P7 收尾 | 11-27 ~ 11-30 | 彩排、备份、答辩 | 定稿 + 三处备份 |

### 4.2 第一阶段：地基（11-05 ~ 11-08）

#### 11-05（周四）：接到活，先把地认熟

**今天完成**

1. clone 仓库，切 `dev`，`app.json` 现在有几页、`pages/` 下有哪些空目录。
2. 通读 A 手册第 0、1、3 章，确认 `app.json` 归你、`database/` 归 A。
3. 找 A 要 **6 个二手页面的路径**（首页、详情、发布、搜索、我的发布、我的收藏），今天就要，别等。
4. 建自己的备忘录：20 页清单 + 14 页自己的页面清单，打印或贴在屏保上。

**怎么做**

- 用 `git ls-remote origin` 确认权限（能列出 `refs/heads/dev`）。
- 在开发者工具里“导入项目”，选 `miniprogram/` 目录；AppID 用测试号或无 AppID 模式（不涉及支付，不需要正式号）。
- 打开 `docs/课程设计开发计划.md`，只看页面清单和分工表两段。

**验收**：`git status` 干净；能编译成功（此时可能是空白页）；20 页清单写在纸上。

**Git**：不建分支，不发 PR，只 `git pull`。

#### 11-06（周五）：`app.json` 一次注册完 20 页 + 打通 `/api/health`

**今天完成**

1. `app.json` 注册 20 个页面（第 1.5 节的 JSON 直接抄），配 tabBar 4 项。
2. `app.wxss` 写全局样式变量和公共类：颜色、字号、间距、按钮、卡片、空态、安全区。
3. `config.js`、`utils/request.js` 最小版，`app.js` 里做登录态恢复。
4. 用 `request.js` 请求 `GET /api/health`，控制台打印 `code=0`。

**怎么做**

- 页面文件先建“最小可编译骨架”（`.js/.json/.wxml/.wxss` 四个文件），`wxml` 里只放一行文字，保证 20 页都能打开、不报错。
- `app.js` 里不要写 `onLaunch` 里 `await` 登录态校验的阻塞逻辑，改成“先渲染，再异步校验”，否则真机白屏。
- `request.js` 里 401 用 `wx.reLaunch` 而不是 `navigateTo`，避免栈里堆满登录页。

**验收**

- 开发者工具“页面路径”里 20 个路径都能跳转且不报错。
- `wx.request` 打 `/api/health` 返回 `{code:0}`，控制台可见。
- 断网时会弹“网络异常，请重试”（把 `BASE_URL` 改成错端口试一次）。

**Git**

```bash
git switch -c feature/mp-base
git add miniprogram/app.json miniprogram/app.wxss miniprogram/app.js miniprogram/config.js miniprogram/utils/
git commit -m "feat(mp): app.json 注册 20 个页面并封装统一请求"
git push -u origin feature/mp-base
```

**注意**：`app.json` 只有你能改，改完当天必须在群里说“20 页已注册，A 可以开工”。

#### 11-07（周六）：登录注册打通，M0

**今天完成**

1. 登录页：学号 + 密码，`POST /api/auth/login`，token + user 存本地，跳 tabBar 首页。
2. 注册页：学号、密码、确认密码、昵称（**不采集校区**，与接口文档一致），`POST /api/auth/register`，成功后自动登录或回登录页。
3. `app.js` 启动时若有 token，调 `GET /api/auth/me` 校验；401 静默清 token，不弹错误。
4. 个人中心骨架页：头像、昵称、学号、四个入口占位（我的发布/我的收藏/我的代取/接单设置）。
5. 退出登录：清 storage + `reLaunch` 登录页。

**怎么做**

- 表单校验写在页面里的 `validate()`，不要依赖后端报错：学号 7 位数字、密码 ≥ 6 位、两次密码一致、昵称 1~20 字。
- 登录按钮要有 `loading` 态并 `disabled` 防连点，否则会重复提交。
- 密码输入框 `password` 属性必须开，截图里不能出现明文密码。
- 错误提示用 `wx.showToast({icon:'none'})`，不要用 `alert`。

**验收**

- 3 个演示账号（2023001/002/003，密码 123456）都能登录。
- 密码错、学号不存在、重复注册学号，三种错误都有中文提示。
- 有 token 时冷启动直接进首页；手动删 token 后进登录页。
- 无 token 访问需要登录的页面，自动回登录页（拿 401 测）。

**Git**

```bash
git switch dev && git pull origin dev
git switch -c feature/auth-pages
git add miniprogram/pages/login/ miniprogram/pages/register/ miniprogram/app.js miniprogram/pages/mine/index/
git commit -m "feat(auth): 登录注册页与本地登录态管理"
git push -u origin feature/auth-pages
```

**M0 对齐检查（和 A 一起过）**

- [ ] `GET /api/health` 返回 `{code:0}`。
- [ ] 注册/登录返回 JWT，密码是 bcrypt 哈希（A 那边确认）。
- [ ] 401 被前端正确接住并跳登录。
- [ ] 20 页全部能打开。
- [ ] `dev` 合并完成，`main` 打了 `v0.1-m0` tag。

#### 11-08（周日）：公共层稳定版 + 三个组件

**今天完成**

1. `request.js` 稳定版：`loading` 可配置、统一错误提示、401、超时 10s、`code!==0` 抛错、支持 `auth:false`。
2. `app.wxss` 定型（后面页面都靠它）：颜色变量、字号、圆角、卡片、按钮、三态容器、安全区。
3. `item-card` 组件：封面、标题、价格、成色/校区、状态标签；支持 `mode="book"`（书籍卡片，显示书名+作者+同书商品数）。
4. `empty-state` 组件：图标位、主文案、副文案、按钮（可选）。
5. `status-tag` 组件：`on_sale/reserved/sold/off_shelf` + `pending/taken/completed/cancelled`，颜色映射表。
6. `utils/format.js`：时间友好显示（刚刚/x 分钟前/x 小时前/MM-DD HH:mm）、金额 `¥12.00`、状态中文映射。

**怎么做**

- 组件用 `properties + observers`，不要用 `getApp()` 拿全局数据（组件要能独立复用）。
- `item-card` 的图片 URL 拼接放组件内部（`BASE_URL + coverUrl`），别让每个页面各写一遍。
- 状态映射集中放 `utils/format.js`，页面和组件都从这里取，避免一个页面写“待接单”、另一个写“未接单”。
- 组件写完在 `pages/index/index` 里放 3 条假数据自测（A 的页面，只加临时代码，PR 前删掉或告诉 A）。

**验收**

- 三个组件能通过 `<item-card item="{{item}}" />` 渲染，`empty-state` 能显示按钮并触发 `bind:action`。
- 20 页里随便挑 5 个页面，`app.wxss` 的类都能用（不会样式丢失）。

**Git**

```bash
git switch dev && git pull origin dev
git switch -c feature/mp-components
git add miniprogram/components/ miniprogram/utils/ miniprogram/app.wxss miniprogram/utils/request.js
git commit -m "feat(mp): 公共组件 item-card/empty-state/status-tag 与统一请求稳定版"
git push -u origin feature/mp-components
```

**今天必须做的沟通**：把组件用法（一段 10 行的示例代码）发群里，A 11-09 要用。

### 4.3 第二阶段：二手配合 + 代取起步（11-09 ~ 11-11）

#### 11-09（周一）：片区地标常量 + 发布代取页骨架

**今天完成**

1. `utils/campus.js`：25 个片区（按分类分组）+ 52 条地标（含别名、所属片区）+ `getLandmarksByZone()`、`findZoneByPlace()`。
2. 发布代取页：表单骨架（取件片区 → 地标、取件说明、送达地点、规格、时间模式、报酬、备注）。
3. 片区 → 地标二级联动选择器（用 `picker` + `mode="multiSelector"` 或两个 `picker`，二选一但要能用）。

**怎么做**

- 地标数据按 A 手册 11.9 那份清单抄，**别名只用于本地搜索，不改正式名**。
- 片区选择器用一列“分类+片区”两级：第一列分类（宿舍园/教学区/图书馆/运动场/校医院/校外/其他），第二列该分类下的片区。
- 选完片区自动带出该片区第一个地标；如果片区没有下级地标（宿舍园、图书馆、运动场、校医院、校外），`pickupPlace = 片区名`，页面显示“该片区无需选楼栋”。
- 表单字段命名与后端一致：`pickupArea`、`pickupPlace`、`deliveryLocation`、`itemSize`、`itemDesc`、`remark`、`timeType`、`timeStart`、`deadline`、`reward`。**A 的 `errand_orders` 没有 `pickupLocation` 这一列**：取件楼栋门牌、取件时间、交付要求统一写 `remark`；`itemDesc` 对应 `item_desc`（物品说明），`deliveryLocation` 对应 `delivery_location`（送达地点）。

**验收**

- 切片区，地标列表正确联动；选“北区教学区”能选到“第16教学楼”。
- 无下级地标的片区，提交时 `pickupPlace` 等于片区名。
- 表单字段能在 `console.log` 打出完整对象。

**Git**：`feature/errand-form`，commit `feat(errand): 片区地标二级联动与发布表单骨架`。

#### 11-10（周二）：发布代取页完成 + 代取大厅

**今天完成**

1. 发布页校验与提交：报酬 0~200 元、描述 ≤ 200 字、`timeType=deadline/range` 必须填时间且晚于当前。
2. 提交调 `POST /api/errands`，成功 `wx.redirectTo` 到详情页；失败提示后端 `message`。
3. 代取大厅：`GET /api/errands?status=pending`，卡片列表（片区·地标、送达地、报酬、时间要求、规格、发布人）。
4. 下拉刷新 + 上拉加载更多（`onReachBottom` + `page/pageSize` + `hasMore`）。
5. 三态：加载中骨架、空态（`empty-state`：暂无待接单）、错误态（重试按钮）。

**怎么做**

- 大厅只显示 `pending`（A 的接口默认值）；不要在前端过滤状态，避免和后端口径不一致。
- 上拉加载要加 `loading` 锁，防止连续触发导致重复追加。同一 `errandId` 去重。
- 时间展示用 `format.js`，`timeType=asap` 显示“尽快”，`deadline` 显示“11-12 18:00 前”。
- 报酬用 `¥` + 两位小数，颜色用强调色，别用红色（红色留给“已取消”）。

**验收**

- 从大厅点进详情能带上 `id`（详情页 11-12 才写，先能拿到参数）。
- 20 条以上数据时，上拉能加载第 2 页，不重复不跳条。
- 断网刷新有错误态和“重试”。

**Git**

```bash
git add miniprogram/pages/errand/publish/ miniprogram/pages/errand/hall/ miniprogram/utils/campus.js
git commit -m "feat(errand): 发布代取页完成与代取大厅列表"
git push
```

#### 11-11（周三）：M1 配合 + UI 走查第一遍

**今天完成**

1. 帮 A 的二手闭环做 UI 走查（A 今天过 M1）：首页、搜索、详情、发布、我的收藏逐页看一遍。
2. 修组件问题：卡片高度不一致、图片拉伸、状态标签颜色、空态文案。
3. 把走查结果写成 `docs/UI走查记录-B.md`（问题、页面、严重程度、谁改）。

**怎么做**

- 走查用“三看”：**看对齐**（左右边距是否一致）、**看三态**（有没有空态/加载态）、**看文案**（术语是否符合统一表）。
- 每个问题截一张图，用“页面 + 现象 + 期望”三句话描述，不要只说“这里怪怪的”。
- A 的页面问题写进记录，**不要自己动手改 A 的文件**，让 A 改或者征得同意后再改。

**验收**：走查记录 ≥ 15 条；你负责的问题当天修完一半。

**Git**：`fix/mp-ui-m1`，commit `fix(mp): 统一卡片间距与状态标签配色`。

**M1 对齐检查**：A 那边二手闭环跑通即可；你确认“首页右下角加号能进发布”“搜索页书籍卡片样式正常”“收藏状态图标正确”。

### 4.4 第三阶段：代取（11-11 ~ 11-13）

#### 11-12（周四）：代取详情页（状态机 UI）

**今天完成**

1. 详情页展示：订单状态、取件片区·地标·说明、送达地点、规格、时间、报酬、发布人、接单人头像（若有）。
2. 底部按钮按 `canTake / canComplete / canCancel / canRelease` 显示，前端不自己算权限。
3. 接单 → `POST /api/errands/:id/take`；完成 → `/complete`；撤回 → `/cancel`；释放 → `/release`。
4. 每个操作都二次确认（`wx.showModal`），文案写清后果（“接单后订单将从大厅消失”）。
5. 409 冲突时提示“手慢了，订单已被接走”，并刷新详情。

**怎么做**

- 按钮显隐只信后端返回的 `canXxx` 字段，前端不要用 `status + 当前用户` 自己推，否则 A 改了权限规则你就错。
- `taken` 状态下“联系 TA”按钮指向 `/pages/chat/detail?peerId=<对方>&bizType=errand&bizId=<orderId>`。
- 状态用 `status-tag` 组件，颜色：待接单蓝、已接单橙、已完成绿、已取消灰。
- 页面 `onShow` 重新拉详情（从聊天页返回时要看到最新状态）。

**验收**

- 两个账号配合：账号 1 发布 → 账号 2 打开详情点接单 → 成功；账号 1 刷新能看到接单人。
- 两个账号同时点接单，一个成功一个提示“已被接走”（409）。
- 完成/撤回/释放四个动作都能走通，状态标签随之变化。

**Git**：`feature/errand-detail`，commit `feat(errand): 代取详情页与状态操作按钮`。

#### 11-13（周五）：接单设置页 + 上线/下线（同页两入口）

**今天完成**

1. `pages/mine/runner` 支持两种模式：无 `mode` = **接单设置**；`mode=online` = **上线/接单设置**（多一个上线开关）。
2. 表单：可接片区（多选）、具体地标（可空）、规格多选（小/中/大）、在线计划（`once` 指定日期时间段 / `weekly` 按星期循环）、基础报价、备注。
3. 回显：`GET /api/users/me/runner-profile`，`manualUntil`、计划列表都要正确显示。
4. 保存：`PUT /api/users/me/runner-profile`；上线/下线：`PUT /api/users/me/online`。
5. 计划列表能改/删**未开始**的计划；进行中的循环点下线时弹窗二选一（“只这一次” / “取消之后所有”）。

**怎么做**

- 片区多选用 `checkbox-group`，地标跟着已选片区动态列（勾了 3 个片区就展示这 3 个片区的地标）。
- 时间用 `picker mode="date"` + `picker mode="time"` 组合，`weekly` 用星期多选 + 时间段；提交时拼成后端要的结构。
- 上线状态在页面顶部用一条状态条显示：“当前在线至 22:00”或“已下线”；不要只靠按钮颜色。
- 从个人页进入（`接单设置`）时，底部按钮是“保存设置”；从代取页进入（`?mode=online`）时，底部是“保存并上线 / 下线”。

**验收**

- 个人页 → 接单设置 → 保存 → 退出再进，数据回显一致。
- 代取大厅上方“我要接单”入口 → 带 `?mode=online` → 能上线，返回大厅能看到自己的在线状态。
- 计划保存后，列表能显示“每周一 09:00-12:00”这样的可读文案。
- 下线时若有进行中的循环计划，弹窗二选一可用。

**Git**：`feature/runner-setting`，commit `feat(errand): 接单设置页与上线/下线双入口`。

### 4.5 第四阶段：聊天（11-13 ~ 11-16）

#### 11-13 ~ 11-14：`routes/chat.js`（你的后端部分）

**今天完成**

1. `POST /api/conversations`：`{peerId, bizType, bizId}` → 调 `sp_get_or_create_conversation` → 返回 `{conversationId, ...}`。
2. `GET /api/conversations`：会话列表（用视图 `v_conversation_base`），带对方昵称、最后消息、未读数、时间。
3. `GET /api/conversations/:id/messages?afterId=&limit=20`：增量拉取，按 `message_id` 升序。
4. `POST /api/conversations/:id/messages`：`{content, msgType}`，插入消息（触发器负责更新会话最后消息），返回 `messageId`。`msgType` 取 `text`/`image`，缺省 `text`；不传会导致 `messages.msg_type` 取默认值，图片消息就退化成文本。
5. `PUT /api/conversations/:id/read`：标记已读（把 `messages.is_read` 置 1）。A 的 `messages` 表自带 `msg_type`、`is_read` 两列，**没有** `conversation_members` 表，也没有 `last_read_id` 这种游标字段。
6. `GET /api/conversations/unread-count`：用 `fn_unread_count` 汇总总未读数。
7. **越权校验**：非会话参与者一律 403，不能靠前端隐藏。

**怎么做**

- 所有 SQL 用参数化（`?` 占位），不要拼字符串。
- `sp_get_or_create_conversation` 的入参顺序按 A 的 `objects.sql`；如果 A 还没交付，先在群里催，不要自己改 `database/`。
- 会话唯一性靠 `(user_a, user_b, biz_type, biz_id)`；`user_a < user_b` 由存储过程保证，你在 Node 层不要重复排序。
- 消息内容长度限制 500 字，空字符串拒绝；`content` 里不要 `trim()` 后为空还放行。
- 返回时间统一 `YYYY-MM-DD HH:mm:ss`，前端自己格式化。

**验收（用 Postman 或 curl）**

- 同一对用户、同一业务，连续调两次 `POST /api/conversations` 返回**同一个** `conversationId`。
- 账号 1 发消息，账号 2 `afterId=0` 能拉到；再 `afterId=<lastId>` 拉不到重复数据。
- 账号 3 调账号 1/2 的会话详情，返回 403。
- `unread-count` 在标记已读后归零。

**Git**：`feature/chat-api`，commit `feat(chat): 会话与消息接口（含越权校验）`。

> **聊天段的接口文档由你写**：写进 `docs/接口文档.md` 的“聊天”一节，包含路径、参数、返回示例、错误码。A 会照着 review。

#### 11-14（周六）：消息列表页 + 聊天页 + 3 秒轮询

**今天完成**

1. 消息列表页：会话卡片（头像、昵称、最后消息、时间、未读红点），下拉刷新，空态。
2. 聊天页：消息气泡（左对方/右自己）、时间分组、发送框、发送按钮、滚动到底。
3. 轮询：`onShow` 启动 `setInterval` 3 秒，`onHide`/`onUnload` 必须 `clearInterval`。
4. 进入即标记已读；页面隐藏时也标记一次已读。
5. `bizType/bizId` 透出在标题下方（“关于《数据结构》”或“关于代取订单”）。

**怎么做**

- 轮询用**增量**（`afterId` = 本地最后一条 `messageId`），不要每次全量拉，5000 条消息会卡死。
- 拉回来的消息按 `messageId` 去重再 append，避免轮询重叠导致重复。
- 只有新消息才滚到底；用户手动上翻看历史时不要强制滚动（记录 `isAtBottom`）。
- 发送成功后**乐观更新**：先本地追加一条 `pending` 气泡，成功后替换成真实 ID；失败标红并可重试。
- 消息内容做 XSS 无关处理即可，但要处理换行（`\n` → 多个 `text` 块）。
- `onUnload` 里除了 `clearInterval`，还要取消未完成的请求（`this._reqId`）。

**验收**

- 两个账号（或两个模拟器窗口）互发，**5 秒内**能看到对方消息。
- 切到别的 tab 再回来，轮询恢复且不重复。
- 连续快速发 5 条，顺序正确、不重复。
- 断网时发送失败有红点重试，恢复网络后能补发。
- 消息列表未读红点与 `unread-count` 一致。

**Git**：`feature/chat-pages`，commit `feat(chat): 消息列表与聊天页（3 秒增量轮询）`。

#### 11-15（周日）：我的代取 + 找跑腿匹配

**今天完成**

1. 我的代取：两个 tab（我发布的 / 我接的），列表按状态分组，操作按钮（撤回/释放/完成/联系）。
2. 找跑腿匹配页：`GET /api/runners?area=&place=&timeType=&itemSize=`，跑腿卡片（片区、可接规格、在线状态、报价、备注）。
3. 从发布页“先找跑腿”入口跳过来时，**发布页已用 `visibility='private'` 建好私单**，这里带的是 `orderId` + 表单筛选条件；页面顶部显示筛选条件，可修改后重新查。
4. 点“联系 TA”进聊天页；**不直接改订单状态**。

**怎么做**

- 我的代取用 `status` 分组（待接单/已接单/已完成/已取消），每组显示数量。
- 找跑腿只做“展示 + 联系”，页面上明确写一句“谈妥后由对方在详情页接单”，避免用户以为点了就指派；私单不需要先发布到大厅。
- 空态要给出路：“当前没有符合条件的跑腿，去发布大厅试试？” → 按钮跳发布页。

**验收**：两个 tab 数据正确；跑腿卡片能跳到聊天；无结果时提示清晰。

**Git**：`feature/mine-errands`，commit `feat(errand): 我的代取与找跑腿匹配页`。

#### 11-16（周一）：M2 联调

**今天完成**

1. 全链路自己走 3 遍：注册 → 登录 → 发布代取 → 找跑腿 → 接单 → 聊天 → 完成。
2. 修联调问题，所有 P0 bug 清零。
3. 和 A 一起对 M2 检查清单（见第 11 章）。

**验收**：13 项 M2 检查项全过；`dev` 能跑通三条闭环。

**M2 对齐检查：** 代取六页可用、聊天闭环可用、并发接单一个 409、未读数正确。

### 4.6 第五阶段：质量（11-17 ~ 11-21）

#### 11-17（周二）：UI 走查第二轮（全局统一）

**今天完成**

1. 20 个页面全部走一遍，按“对齐 / 三态 / 文案 / 交互反馈 / 图片”五项打分。
2. 统一：所有列表页都有空态和错误态；所有按钮都有点击反馈；所有时间都走 `format.js`。
3. 输出 `docs/UI走查记录-B.md` 第二轮清单，标 P0/P1/P2。

**验收**：走查清单清零 P0；文案与术语表一致（“待接单”不是“未接单”）。

#### 11-18（周三）：截图与素材归档

**今天完成**

1. 按报告章节建目录：`report/assets/ch2/ ch3/ ch4/ ch6/ ch7/ ch8/`。
2. 截图清单（B 负责部分）：登录、注册、个人中心、代取大厅、发布代取、代取详情（4 种状态）、找跑腿、我的代取、接单设置/上线、消息列表、聊天页、空态/错误态各 1 张。
3. 命名规范：`ch7_fig7-3_chat-list.png`、`ch7_fig7-4_chat-detail.png`。
4. 每张图记录“图号、说明、对应页面路径”，写进 `report/assets/图目录-B.md`。

**怎么做**

- 用开发者工具的“截图”功能，导出 2 倍图（清晰但不超 500KB）。
- 状态类截图要能看清状态标签（不要把弹窗挡在标签上）。
- 涉及个人信息的（手机号、真实姓名）先改成演示数据。

**验收**：截图 ≥ 30 张，全部有编号和说明；A 的图用 `a_` 前缀，不与你冲突。

#### 11-19（周四）：负向测试（你最容易被扣分的地方）

**今天完成**

按下表逐条测，每条记录“操作 → 期望 → 实际 → 截图”：

| 场景 | 期望 |
| --- | --- |
| token 过期/被删 | 自动回登录页，不白屏 |
| 未登录点“我的代取” | 跳登录，登录后回到原页面或首页 |
| 断网刷列表 | 错误态 + 重试按钮，不卡在 loading |
| 后端 500 | 提示“服务异常”，不显示原始报错 |
| 提交空表单 | 字段旁提示，不发请求 |
| 报酬填 `abc` / `-1` / `9999` | 全部拦住 |
| 消息发空 / 发 501 字 | 拦住并提示 |
| 打开别人的订单详情（越权） | 403 友好提示，不是空白页 |
| 快速连点接单 3 次 | 只发 1 次请求 |
| 聊天页快速进出 10 次 | 不留定时器（看 `onUnload` 后是否还在轮询） |
| 长昵称（20 字）/ 长标题 | 不撑破布局，省略号 |
| 无数据新账号 | 所有列表显示空态，不是报错 |

**验收**：12 条全部有记录；发现的问题进 `docs/bug清单.md`。

#### 11-20（周五）：`docs/测试用例.md` 主笔

**今天完成**

1. 按模块建用例表，覆盖 P0 全部路径 + 主要异常路径，**目标 60 条以上**。
2. 每条：编号、模块、前置条件、步骤、预期结果、实际结果、结论、执行人。
3. 你执行 UI/聊天部分（约 40 条），A 执行后端/数据库部分（约 20 条）。
4. 统计通过率，P0 必须 100%。

**格式示例：**

| 编号 | 模块 | 前置 | 步骤 | 预期 | 实际 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| TC-C01 | 聊天 | A 已发布商品 | 1. B 进详情 2. 点“联系卖家” 3. 发“还在吗” | 创建会话并显示消息，A 5 秒内收到 | 一致 | 通过 |
| TC-E03 | 代取 | 订单 pending | 1. B 点接单 2. A 同时点接单 | 一人成功，另一人提示已被接走 | 一致 | 通过 |

**验收**：60 条用例、P0 通过率 100%；`docs/B测试记录.md` 有执行记录。

#### 11-21（周六）：功能冻结

**今天完成**

1. 所有 feature 分支合并进 `dev`，删掉临时分支。
2. 开 PR `dev → main`，合并后打 `v1.0-m3`。
3. 冻结清单（见 11 章 M3）逐项打勾。
4. 群里发一句：“功能冻结，后面只修 P0/P1 和做材料。”

**冻结后可以做**：修 P0 bug、补三态、补注释、补文档、补截图、加索引类性能优化。
**冻结后不可以做**：加页面、加字段、改接口返回格式、换 UI 风格、大重构。

**Git**

```bash
git switch dev
git pull origin dev
# GitHub 开 PR: dev → main，标题 release: v1.0 M3 功能冻结
git switch main && git pull origin main
git tag -a v1.0-m3 -m "M3: 功能冻结"
git push origin v1.0-m3
```

### 4.7 第六阶段：材料（11-22 ~ 11-26）

#### 11-22（周日）：报告第 4 章（逻辑设计）

**今天完成**：`report/B章节.md` 的第 4 章，含关系模式、3NF 论证、表结构三节。

- 4.1 关系模式：14 张表的关系模式写法（`users(user_id, student_no, ...)`），主键下划线或加粗。
- 4.2 3NF 论证：挑 4 张表逐个论证（`items`、`errand_orders`、`messages`、`runner_profiles`），写清“消除了什么部分依赖/传递依赖”。
- 4.3 表结构：14 张表的字段表（字段名、类型、约束、说明），从 `schema.sql` 复制，**不要手打**。
- 必须有：表 4-1 关系模式一览、表 4-2~4-15 各表结构（可以合并成几张）、图 4-1 关系模式图（可选）。

**注意**：A 改表结构必须同步告诉你；表名/字段名错一个，答辩就被问住。

#### 11-23（周一）：报告第 7、8 章

**第 7 章 系统实现**

```text
7.1 系统总体架构（小程序 → Express → MySQL，图 7-1）
7.2 小程序端实现（公共层、请求封装、组件、页面结构）
7.3 后端接口实现（路由分层、鉴权中间件、统一响应）
7.4 关键功能实现（选 4 个写透：登录鉴权、代取状态机、聊天会话、轮询增量拉取）
7.5 数据库访问（手写 SQL、参数化、事务、视图/过程的调用点）
7.6 界面展示（截图 8~12 张，每张一句话说明）
```

写法要求：每个关键功能按“**需求 → 设计 → 代码片段（≤ 15 行）→ 效果截图**”四段写，代码只放最关键的判断。

**第 8 章 系统测试**

```text
8.1 测试环境与方法
8.2 测试用例设计（引用 docs/测试用例.md）
8.3 功能测试结果（按模块统计通过率表）
8.4 异常与边界测试（引用 11-19 的 12 条负向测试）
8.5 并发测试（引用 A 的接单 409）
8.6 缺陷统计与修复（bug 清单表：编号、现象、原因、修复、状态）
```

**表格必须真实**：通过率要和 `测试用例.md` 的数字一致，截图要和用例编号对应。

#### 11-24（周二）：第 10 章 + AI 专题 + 封面摘要目录

**第 10 章 系统使用简介**：面向“第一次拿到这个项目的人”

```text
10.1 运行环境（OS、Node、MySQL、微信开发者工具版本）
10.2 数据库初始化（三条 SQL + npm run seed，附图）
10.3 后端启动（.env 配置项说明，不写真实密码）
10.4 小程序运行（导入项目、不校验域名、改 BASE_URL）
10.5 演示账号与操作路径（3 个账号 + 三条闭环步骤）
10.6 常见问题（端口占用、图片不显示、真机请求失败、中文乱码）
```

**AI 辅助开发专题**：写清“用了什么、怎么用、效果、边界”，每条给 1 个真实例子（提示词片段 + 产出 + 你改了什么）。**不要吹**，写清哪些是 AI 写的、哪些是你重写的。

**封面/摘要/目录**：按学校模板，摘要 300~500 字（背景 1 句、做了什么 3 句、技术 2 句、结果 1 句），关键词 4 个；目录用 Word 自动生成，**不要手打页码**。

**验收**：4 章 + 专题的 Markdown 全部进 `report/B章节.md`；11-22 到 11-24 每天 22:00 前合并到 `dev`。

#### 11-25（周三）：合稿与排版（你的主场）

**今天完成**

1. 把 `report/A章节.md` + `report/B章节.md` 合成 `report/报告.docx`（Word 里用“插入 → 对象 → 文件中的文字”，或先合成一个 md 再转）。
2. 按学校模板设置：A4、页边距（上下 2.5、左 3、右 2.5）、正文小四宋体 1.5 倍行距、标题黑体、图题在图下、表题在表上、代码 Consolas 五号。
3. 图表编号统一：按章编号（图 7-1、表 4-2），正文引用不跳号；图题/表题不与正文分页。
4. 目录自动生成 + 页码；页眉写项目名；摘要、目录、正文、参考文献各自分页。
5. 术语按统一表校对一遍（见 9.3）。
6. 交 `report/答辩PPT.pptx` 初稿（可以只做前 6 页）。

**怎么做**

- 先在 Word 里定义“标题 1/标题 2/标题 3”样式，再套用，不要手动设字号。
- 图片统一宽度（14cm 左右），不要一张大一张小。
- 生成目录前先 `F9` 更新域，页码错了再更新一次。
- 交稿后 A 在 `report/A校对意见.md` 写意见，你按意见改；**`.docx` 只有你能编辑**，避免二进制冲突。

**验收**：目录页码正确、图表编号连续、无“图片丢失”、全文术语一致。

#### 11-26（周四）：PPT + 视频 + M4

**今天完成**：PPT 12 页定稿、系统演示视频初版、材料齐套检查。

**PPT 12 页（你负责制作，A 供 P5~P8 内容）**

| 页 | 标题 | 内容来源 | 讲者 |
| --- | --- | --- | --- |
| P1 | 封面 | 你 | 你 |
| P2 | 背景与痛点 | A 供要点，你美化 | 你 |
| P3 | 功能与角色 | A 供要点，你美化 | 你 |
| P4 | 技术架构 | A 供要点，你美化 | 你 |
| P5 | 数据库概念设计 | A | A |
| P6 | 逻辑与物理设计 | A | A |
| P7 | 数据库对象 | A | A |
| P8 | 核心业务与并发 | A | A |
| P9 | 系统演示 | 你（截图/录屏） | 你 |
| P10 | 测试与安全 | 你（A 供权限/并发素材） | 你 |
| P11 | 难点、不足与展望 | A/B 各一半 | A/B |
| P12 | 总结与分工 | 你 | 你 |

**设计规则**：16:9、深蓝+浅灰两种主色、每页标题 ≤12 字、正文 ≤6 行、字号标题 32~40 正文 20~24、代码 ≤8 行、截图加红框、右下角页码、动画只用淡入、最后一页写“请老师批评指正”。

**视频（6~8 分钟）**

| 时间 | 内容 | 谁录 |
| --- | --- | --- |
| 0:00-0:30 | 片头：项目名、成员、分工 | 你（静态封面+字幕） |
| 0:30-1:30 | 背景与功能总览 | 你 |
| 1:30-3:30 | 数据库设计与对象 | A |
| 3:30-5:30 | 二手流程 | A |
| 5:30-7:00 | 代取 + 聊天 | 你 |
| 7:00-7:40 | 并发接单 + 权限 | A |
| 7:40-8:00 | 结尾与分工 | 你 |

**剪辑要求**：1920×1080 / 30fps / H.264，≤200MB；加片头片尾和字幕；A 的分段录屏（`video/a_01_schema.mp4` 等）你负责拼接；**不要录到 token、密码、真实个人信息**。

**M4 检查**：见第 11 章 M4 清单。

### 4.8 第七阶段：收尾（11-27 ~ 11-30）

#### 11-27（周五）：彩排第一遍

- 按答辩流程完整走一遍并计时（8~10 分钟），你讲 P1~P4、P9、P10、P12。
- 记录“卡壳点、超时点、演示失败点”，当天改 PPT 和讲稿。
- 你写答辩稿的系统部分（`docs/答辩讲稿.md` 的后半段），A 写数据库部分。

#### 11-28（周六）：彩排第二遍 + 视频定稿

- 完整走第二遍，目标 8~10 分钟不超时。
- 视频剪辑定稿，导出 `report/系统演示.mp4`，确认断网能播。
- 定 15 个常见问题答案（第 9.5 节给了 12 个，你们再补 3 个）。

#### 11-29（周日）：定稿 + 三处备份

- 材料定稿：`报告.docx`、`答辩PPT.pptx`、`系统演示.mp4`、`readme.txt`、源码 zip。
- 三处备份：U 盘 + 网盘 + 邮箱（邮箱至少放 readme + 报告 + PPT，视频可发链接）。
- `dev → main` 合并，打 `v1.0-final`。
- 之后只改错别字和演示阻塞问题，不动结构。

#### 11-30（周一）：提交与答辩

- 提前 30 分钟到教室，测投影、网络、电源。
- 后端已启动、MySQL 已启动、开发者工具已编译、3 个账号已登录。
- 两份并发接单窗口准备好（A 演示）。
- 讲稿纸面版 + 问题答案各一份，手机静音。

---

## 5. 小程序公共层手册（B 的地基）

公共层不稳定，A 的 6 个页面就会反复返工。这一章是**约定**，不是建议。

### 5.1 目录约定

```text
miniprogram/
├─ app.js / app.json / app.wxss
├─ config.js
├─ sitemap.json
├─ utils/
│  ├─ request.js      # 统一请求
│  ├─ campus.js       # 25 片区 + 52 地标 + 映射函数
│  └─ format.js       # 时间/金额/状态文案
├─ components/
│  ├─ item-card/      # 商品卡片（含书籍模式）
│  ├─ empty-state/    # 空/错误态
│  └─ status-tag/     # 状态标签
├─ assets/
│  ├─ tabbar/
│  └─ icons/
└─ pages/…
```

**规则：**

1. 页面里不写 `wx.request`，一律走 `utils/request.js`。
2. 页面里不拼 `BASE_URL`，图片 URL 由组件/工具函数拼。
3. 状态中文只从 `format.js` 取，不在 `wxml` 里写死中文。
4. 颜色/字号只从 `app.wxss` 的类取，`wxss` 里不写 `#3b82f6` 这种裸色值（除个别强调）。

### 5.2 `app.wxss` 全局样式（骨架）

```css
page {
  --c-primary: #1f3a93;
  --c-primary-light: #e8edfb;
  --c-accent: #f59e0b;
  --c-danger: #e5484d;
  --c-success: #18a058;
  --c-text: #1f2329;
  --c-text-2: #646a73;
  --c-text-3: #8f959e;
  --c-border: #e5e6eb;
  --c-bg: #f5f6f8;
  --radius: 16rpx;
  --gap: 24rpx;

  background: var(--c-bg);
  color: var(--c-text);
  font-size: 28rpx;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
}

.card { background: #fff; border-radius: var(--radius); padding: var(--gap); }
.row { display: flex; align-items: center; }
.row-between { display: flex; align-items: center; justify-content: space-between; }
.ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.price { color: var(--c-danger); font-weight: 600; }
.btn-primary { background: var(--c-primary); color: #fff; border-radius: 999rpx; }
.btn-primary[disabled] { opacity: .5; }
.page-pad { padding: var(--gap); padding-bottom: calc(var(--gap) + env(safe-area-inset-bottom)); }
.t-text-2 { color: var(--c-text-2); }
.t-sm { font-size: 24rpx; }
```

**注意**：小程序对 CSS 变量支持良好，但 `calc(env(safe-area-inset-bottom))` 在部分基础库要写成 `constant()` 兜底；用不上就不写。

### 5.3 `utils/request.js` 完整版

```js
const { BASE_URL, STORAGE_TOKEN } = require('../config');

let redirecting = false; // 防止并发 401 反复跳登录

function toLogin() {
  if (redirecting) return;
  redirecting = true;
  wx.removeStorageSync(STORAGE_TOKEN);
  wx.removeStorageSync('cs_user');
  wx.reLaunch({
    url: '/pages/login/login',
    complete: () => setTimeout(() => { redirecting = false; }, 800)
  });
}

function request(options) {
  const {
    url, method = 'GET', data = {}, auth = true,
    loading = false, loadingText = '加载中', silent = false, timeout = 10000
  } = options;

  return new Promise((resolve, reject) => {
    if (loading) wx.showLoading({ title: loadingText, mask: true });
    const header = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = wx.getStorageSync(STORAGE_TOKEN);
      if (token) header.Authorization = `Bearer ${token}`;
    }

    wx.request({
      url: BASE_URL + url,
      method, data, header, timeout,
      success(res) {
        if (loading) wx.hideLoading();
        const body = res.data || {};
        if (res.statusCode === 401) { toLogin(); return reject({ code: 401, message: '未登录' }); }
        if (res.statusCode === 403) {
          if (!silent) wx.showToast({ title: '没有权限', icon: 'none' });
          return reject({ code: 403, message: body.message || '没有权限' });
        }
        if (res.statusCode >= 500) {
          if (!silent) wx.showToast({ title: '服务异常，请稍后再试', icon: 'none' });
          return reject({ code: res.statusCode, message: '服务异常' });
        }
        if (body.code === 0) return resolve(body.data);
        if (!silent) wx.showToast({ title: body.message || '操作失败', icon: 'none' });
        reject({ code: body.code, message: body.message || '操作失败' });
      },
      fail(err) {
        if (loading) wx.hideLoading();
        if (!silent) wx.showToast({ title: '网络异常，请检查网络', icon: 'none' });
        reject({ code: -1, message: '网络异常', raw: err });
      }
    });
  });
}

const get = (url, data, opt) => request({ url, method: 'GET', data, ...opt });
const post = (url, data, opt) => request({ url, method: 'POST', data, ...opt });
const put = (url, data, opt) => request({ url, method: 'PUT', data, ...opt });

module.exports = { request, get, post, put };
```

**约定：**

- `loading: true` 用于“用户主动操作”（登录、提交），列表页用页面内骨架，不用全局 loading。
- `silent: true` 用于轮询、静默校验（如 `/api/auth/me`），不弹 toast。
- 错误对象统一 `{ code, message }`，页面里 `catch (e) { if (e.code === 409) {...} }`。

### 5.4 `utils/format.js`

```js
const STATUS_TEXT = {
  on_sale: '在售', reserved: '已预订', sold: '已售出', off_shelf: '已下架',
  pending: '待接单', taken: '已接单', completed: '已完成', cancelled: '已取消'
};
const SIZE_TEXT = { small: '小件', medium: '中件', large: '大件' };

function statusText(s) { return STATUS_TEXT[s] || s || ''; }
function sizeText(s) { return SIZE_TEXT[s] || s || ''; }
function money(v) { return '¥' + Number(v || 0).toFixed(2); }

function timeFriendly(str) {
  if (!str) return '';
  const t = new Date(str.replace(/-/g, '/')).getTime();
  const diff = Date.now() - t;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 172800000) return '昨天';
  return str.slice(5, 16);
}

function imageUrl(u) {
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  return require('../config').BASE_URL + u;
}

module.exports = { statusText, sizeText, money, timeFriendly, imageUrl, STATUS_TEXT };
```

### 5.5 组件用法（A 也要按这个用）

**`item-card`**

```xml
<item-card item="{{item}}" mode="normal|book" bind:tap="onTapItem" />
```

```js
properties: {
  item: { type: Object, value: {} },
  mode: { type: String, value: 'normal' }
}
```

**`empty-state`**

```xml
<empty-state
  icon="empty"
  title="暂无待接单"
  desc="去发布一条代取需求吧"
  btn-text="去发布"
  bind:action="goPublish" />
```

**`status-tag`**

```xml
<status-tag status="{{order.status}}" />
```

**规则**：组件不直接 `wx.navigateTo`，只 `triggerEvent`，跳转由页面决定（组件才能复用）。

### 5.6 三态标准（每个列表页必做）

| 状态 | 触发 | 表现 |
| --- | --- | --- |
| 加载中 | 首次请求 | 骨架屏（3~5 个灰块），不用全屏 loading |
| 空 | `list.length === 0` 且无错误 | `empty-state` + 一个出路按钮 |
| 错误 | 请求失败 | `empty-state` + “重试” + 错误原因一句话 |
| 加载更多中 | 上拉 | 底部“加载中…” |
| 没有更多 | `list.length >= total` | 底部“没有更多了” |

**判断顺序**：先判断错误，再判断空，最后判断有数据。反了会出现“明明报错却显示空态”。

### 5.7 页面骨架（新建页面照抄）

```js
// pages/xxx/xxx.js
const { get } = require('../../utils/request');

Page({
  data: {
    list: [], page: 1, pageSize: 10, total: 0,
    loading: false, loadingMore: false, hasMore: true, error: ''
  },

  onLoad(query) { this.setData({ query }); this.fetchList(true); },
  onPullDownRefresh() { this.fetchList(true).then(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore && !this.data.loadingMore) this.fetchList(false); },

  async fetchList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: reset, loadingMore: !reset, error: '' });
    try {
      const res = await get('/api/xxx', { page, pageSize: this.data.pageSize });
      const list = reset ? res.list : this.data.list.concat(res.list);
      this.setData({
        list, page, total: res.total,
        hasMore: list.length < res.total
      });
    } catch (e) {
      this.setData({ error: e.message || '加载失败' });
    } finally {
      this.setData({ loading: false, loadingMore: false });
    }
  }
});
```

```json
{ "usingComponents": { "empty-state": "/components/empty-state/index" },
  "enablePullDownRefresh": true, "onReachBottomDistance": 80 }
```

### 5.8 真机与图片的坑（提前避开）

1. **图片不显示**：`BASE_URL` 必须是电脑局域网 IP（`http://192.168.x.x:3000`），不能用 `127.0.0.1`；手机和电脑同一 WiFi。
2. **请求被拦截**：真机调试要在“详情 → 本地设置”勾选不校验域名；正式版才需要备案域名（本项目不做）。
3. **后端 0.0.0.0**：Express 要监听 `0.0.0.0` 才能被手机访问（A 的 `app.js` 已处理，确认一下）。
4. **时区**：`new Date('2026-11-20 18:00:00')` 在 iOS 上会 `Invalid Date`，必须把 `-` 换成 `/`（`format.js` 已处理）。
5. **`rpx`**：设计稿按 750 宽，1px ≈ 2rpx；边框用 `1rpx` 有时会消失，改用 `1px`。
6. **滚动**：页面级滚动用 `enablePullDownRefresh` + `onReachBottom`；聊天页要用 `scroll-view` 并 `scroll-into-view` 到最后一条。

---

## 6. 页面手册（你的 14 个页面）

每个页面按固定五段写：**路径与入参 → 数据字段 → 交互要点 → 异常与边界 → 验收标准**。字段名与 `docs/接口文档.md` 一致。

### 6.1 登录页 `pages/login/login`（P0）

**入参**：可选 `redirect`（登录后要回跳的页面路径）。

**数据字段**

| 字段 | 类型 | 校验 | 说明 |
| --- | --- | --- | --- |
| `studentNo` | string | 7 位数字，必填 | 学号 |
| `password` | string | ≥ 6 位，必填 | 密码，输入框 `password` |

**交互要点**

1. 输入框 `maxlength`：学号 7、密码 20。
2. 按钮 `disabled` + `loading`，防连点。
3. 登录成功：`wx.setStorageSync('cs_token', token)`、`cs_user` 存 `{userId, nickname, studentNo, avatarUrl}`。
4. 跳转优先级：`redirect` > `wx.switchTab('/pages/index/index')`。
5. 底部“还没有账号？去注册” → `/pages/register/register`。
6. 登录页不显示 tabBar（tabBar 页才显示，`login` 不在 tabBar 里，无需处理）。

**异常与边界**

| 情况 | 处理 |
| --- | --- |
| 学号不存在 / 密码错 | 用后端 `message` 提示，不自己编文案 |
| 网络失败 | “网络异常，请检查网络” |
| 连续失败 5 次 | 提示“请稍后再试”（不实现真限流，只提示） |
| 已登录再次进入 | `onLoad` 检查 token，有则直接回首页 |

**验收**：3 个演示账号可登录；错误密码有中文提示；冷启动有 token 直接进首页；截图无明文密码。

### 6.2 注册页 `pages/register/register`（P0）

**数据字段**

| 字段 | 校验 |
| --- | --- |
| `studentNo` | 6-20 位数字（本校 15 位），未注册过（格式由 `auth.js` 校验） |
| `password` / `confirmPassword` | ≥ 6 位，两次一致 |
| `nickname` | 2~12 字，必填（与 `auth.js` 同口径） |
| `campus` | **不采集**：注册表单已删校区（v0.5），`users.campus` 恒为 NULL，接口文档固定返回 `null`。片区概念只用于二手/代取的 `pickupArea`，不要与注册混在一起 |

**交互要点**

- 提交前本地校验全过才发请求；错误定位到字段（`errorMap`）。
- 注册成功两种做法二选一，**推荐 B 方案**：
  - A：跳回登录页，提示“注册成功，请登录”。
  - B：后端直接返回 token（若接口支持），注册即登录，进首页。
- 已登录用户访问注册页 → 直接 `reLaunch` 首页。

**验收**：重复学号提示“该学号已注册”；两次密码不一致有提示；注册成功后能立即完成一次发布动作。

### 6.3 个人中心 `pages/mine/index`（P0，tabBar）

**数据字段**：`user`（头像、昵称、学号、信用分；**无校区**）、`stats`（发布数、收藏数、代取数、完成数——有接口就用，没有就用本地占位并标注）。

**交互要点**

1. 顶部头像卡：点击进个人资料；未登录显示“点击登录”。
2. 四个入口：我的发布、我的收藏、我的代取、接单设置。
3. 第二组：设置、帮助与反馈、关于。
4. 下拉刷新拉 `GET /api/auth/me`（保存资料才用 `PUT /api/users/me`）。
5. `onShow` 刷新（从资料页改完昵称回来要变）。

**验收**：四个入口都能跳对；改昵称后返回立即更新；未登录点入口跳登录。

### 6.4 个人资料 `pages/mine/profile`（P1）

**交互**：头像（`wx.chooseMedia` → `POST /api/upload` → 保存相对路径）、昵称、学院（`college`）、手机号（可选，11 位数字即可，后端不校验号段）、简介；保存 `PUT /api/users/me`。**没有校区字段**（后端不接受 `campus`）。

**边界**：图片 > 5MB 先压缩（`wx.compressImage`）；上传失败保留旧头像并提示；昵称清空不允许保存。

### 6.5 设置 `pages/mine/settings`（P1）

**内容**：清除缓存（`wx.clearStorage` 但要保留 token，或提示会退出登录）、消息通知开关（本地存储）、关于版本号、退出登录（二次确认 → 清 token → `reLaunch` 登录页）。

### 6.6 帮助与反馈 `pages/mine/help`（P1）

**内容**：常见问题折叠列表（8 条，写你踩过的坑）、意见反馈表单（只有内容，≤ 200 字；`feedback` 表**没有** `type`/`status` 列）→ `POST /api/feedback`。

### 6.7 代取大厅 `pages/errand/hall`（P0，tabBar）

**入参**：无。顶部有“我要接单/上线”入口 → `/pages/mine/runner?mode=online`。

**数据字段（单条订单）**

| 字段 | 说明 |
| --- | --- |
| `orderId` | 主键（后端实际字段名；旧稿写 `errandId` 是错的） |
| `pickupArea` / `pickupPlace` | 取件片区 / 地标 |
| `deliveryLocation` | 送达地点（必填） |
| `itemSize` | `small/medium/large` |
| `itemDesc` | 物品说明（可空） |
| `remark` | 备注：取件楼栋门牌、取件时间、交付要求都在这里 |
| `timeType` | `asap/deadline/range` |
| `timeStart` / `deadline` | 时间 |
| `reward` | 报酬（元） |
| `publisherNickname` / `publisherAvatar` | 发布人 |
| `createdAt` | 发布时间 |

**交互要点**

1. 只拉 `status=pending`，分页 `page/pageSize=10`。
2. 卡片点击进详情。
3. 下拉刷新、上拉加载、三态齐全。
4. 顶部固定一条提示条：“当前在线接单 3 人”（若接口无此数据就省略，不要编）。

**异常与边界**：409 已被接走 → 刷新列表并 toast；空列表 → 空态 + “去发布代取”按钮。

**验收**：20 条数据分页正确；断网有错误态；上拉不重复。

### 6.8 发布代取 `pages/errand/publish`（P0）

**字段与校验（这是最容易被扣分的页面）**

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| `pickupArea` | 分类+片区二级 picker | 必选 |
| `pickupPlace` | 地标 picker（按已选片区联动） | 有下级地标时必选；无下级地标时 = 片区名 |
| `deliveryLocation` | input | 必填，≤ 100 字（对应 `delivery_location VARCHAR(100)`） |
| `itemDesc` | textarea | 可空，≤ 500 字，显示计数（对应 `item_desc VARCHAR(500)`） |
| `remark` | textarea | 可空，≤ 255 字；取件楼栋门牌、取件时间、交付要求写这里（对应 `remark VARCHAR(255)`） |
| `itemSize` | radio（小/中/大） | 必选 |
| `timeType` | radio（尽快/截止前/时间段） | 必选 |
| `timeStart` | date+time picker | `range` 时必填，且 > 现在 |
| `deadline` | date+time picker | `deadline/range` 时必填，且 > 现在（`range` 时 > `timeStart`） |
| `reward` | input type=digit | 0 < reward ≤ 200，最多两位小数 |

**交互要点**

1. 切片区清空地标并重载地标列表（否则会残留上一个片区的地标——这是最典型的 bug）。
2. `timeType=asap` 时隐藏时间选择器，提交不传 `timeStart/deadline`。
3. 报酬输入实时过滤非数字字符。
4. 提交成功 `wx.redirectTo('/pages/errand/detail?id=' + orderId)`（用 redirect 防止返回到空表单）。
5. 页面底部有“先找跑腿”按钮 → **先以 `visibility='private'` 调 `POST /api/errands` 建私单**，拿到 `orderId` 后带 `orderId` + 表单条件跳 `/pages/errand/runners`（P1）。私单不进大厅；谈妥由对方在详情页接单，若始终没人接，发布者可在详情页点“发布到大厅”（`POST /api/errands/:id/publish`）。

**验收**：12 种非法输入全部被拦住；片区切换地标联动正确；成功后详情页能看到刚发的单。

### 6.9 代取详情 `pages/errand/detail`（P0）

**入参**：`id`（必填，缺失时提示并 `navigateBack`）。

**数据字段**：订单全字段（含 `visibility`）+ `publisher`（发布人）+ `runner`（接单人头像昵称，可空）+ `canTake/canEdit/canPublish/canComplete/canCancel/canRelease`。私单若非发布者/接单者/聊过该单，详情接口直接 404。

**交互要点**

1. 底部按钮**只按后端布尔字段显示**，前端不自己判断。
2. 每个操作二次确认，文案写后果：
   - 接单：“接单后订单将从大厅消失，确认接单？”
   - 完成：“确认已完成送达？”
   - 撤回：“撤回后订单退回待接单（大厅单回大厅、私单仍为私单），确认？”
   - 释放：“释放后订单回到大厅，你可能被其他人接走，确认？”
3. `taken/completed` 显示“联系 TA” → 聊天页（`bizType=errand`）。
4. `onShow` 重新拉取（从聊天返回要看最新状态）。
5. 显示发布人信用/完成数（若接口有）。

**异常与边界**：409 → 提示“手慢了，订单已被接走” + 自动刷新；404 → “订单不存在或已删除” + 返回大厅。

**验收**：两账号并发接单一个成功一个 409；四种状态按钮组合正确；状态标签颜色正确。

### 6.10 找跑腿匹配 `pages/errand/runners`（P1）

**入参**：`area`、`place`、`timeType`、`timeStart`、`deadline`、`itemSize`（都可选，从发布页带入）。

**数据字段（跑腿卡片）**：`nickname`、`avatarUrl`、`serviceAreas`（可接片区数组，对应 `runner_profiles.service_areas`）、`servicePlaces`（可接地标数组，对应 `service_places`）、`itemSizes`（规格数组，来自 `runner_item_sizes`）、`isOnline`、`basePrice`、`remark`、`completedCount`。

**交互要点**

1. 顶部筛选条显示当前条件，点“修改”展开筛选面板。
2. 卡片显示“可接：桃园、北区教学区 / 小件·中件”。
3. “联系 TA” → 聊天页（`bizType=errand`、`bizId=<orderId>`）。**必须带私单的真实 `orderId`**，谈妥后对方才能在详情页直接接单。
4. 页面必须有一句说明：“谈妥后由对方在详情页直接接单（私单不必先发大厅）”，避免误解为指派。

**验收**：按片区筛选生效；无结果有空态 + 回大厅按钮；联系能进正确会话。

### 6.11 我的代取 `pages/mine/errands`（P0）

**结构**：两个 tab（我发布的 / 我接的），每个 tab 内按状态分组。

**交互**：发布者视角按钮（撤回/联系/确认完成）；接单者视角按钮（释放/联系/标记完成）；每组显示数量；空态区分“还没发过”和“还没有人接单”。

**验收**：两个 tab 数据归属正确（不能把我接的显示成我发布的）；操作后列表即时更新。

### 6.12 接单设置 / 上线 `pages/mine/runner`（P0）

**两种模式**

| 入口 | 参数 | 页面标题 | 底部按钮 |
| --- | --- | --- | --- |
| 个人中心 → 接单设置 | 无 | 接单设置 | 保存设置 |
| 代取大厅 → 我要接单 | `?mode=online` | 上线接单 | 保存并上线 / 下线 |

**字段**

| 字段 | 控件 | 校验 |
| --- | --- | --- |
| `serviceAreas` | 片区多选（checkbox） | ≥ 1（落 `runner_profiles.service_areas`，A 的 CHECK 要求 JSON 数组且长度 ≥ 1） |
| `servicePlaces` | 地标多选（随 `serviceAreas` 变化） | 可空（空数组=整个片区都接） |
| `itemSizes` | 规格多选 | ≥ 1（落 `runner_item_sizes` 联合表，不是 JSON 列） |
| `timeSlots` | 计划列表（once / weekly） | 可空 |
| `basePrice` | input digit | 0~100 |
| `remark` | input | ≤ 50 字 |
| `isOnline` | switch | 仅 `mode=online` 显示 |

**字段与后端对齐（A 的 `runner_profiles`）**：`serviceAreas`→`service_areas`、`servicePlaces`→`service_places`、`timeSlots`→`time_slots`、`basePrice`→`base_price`、`isOnline`→`is_online`、`remark`→`remark`、`completedCount`→`completed_count`；另外 A 多了 `availability_type ENUM('slot','now')`（接单模式）和 `manual_until`（手动上线到几点），上线按钮要同时传这两个字段，否则 `chk_runner_slot_requires_schedule` 会拦。规格不写在 `runner_profiles` 里，落到 `runner_item_sizes` 联合表。

**交互要点**

1. 顶部状态条：“当前在线至 22:00”/“已下线”/“计划 周一 09:00 自动上线”。
2. 计划新增：选 `once`（日期 + 时间段）或 `weekly`（星期多选 + 时间段），保存后列表显示可读文案。
3. 计划列表可编辑/删除（仅未开始的计划）。
4. 下线时有进行中的循环计划 → 弹窗二选一（只这一次 / 取消之后所有）。
5. 修改进行中的循环 → 提示“只影响下一次”。

**验收**：两种模式标题和按钮正确；保存后回显一致；下线弹窗两个选项都生效；`mode=online` 时上线后大厅能看到“我”在线（A 的接口）。

### 6.13 消息列表 `pages/chat/list`（P0，tabBar）

**交互**：会话卡片（头像、昵称、最后消息省略、时间、未读红点）、下拉刷新、`onShow` 刷新、空态“还没有消息，去逛逛商品吧”。

**边界**：最后消息为长文本要省略；时间用 `timeFriendly`；未读数 > 99 显示 `99+`。

### 6.14 聊天页 `pages/chat/detail`（P0）

**入参**：`peerId`（必填）、`bizType`（`item/errand`）、`bizId`、`conversationId`（可空）。

**初始化流程（严格按顺序）**

```text
onLoad(query)
  → 存 peerId/bizType/bizId/conversationId
  → 若无 conversationId：POST /api/conversations {peerId,bizType,bizId} 拿 conversationId
  → GET /api/conversations/:id/messages?afterId=0 拉最近 20 条
  → 渲染 + 滚到底
  → PUT /api/conversations/:id/read 标记已读
  → onShow: 启动 3 秒轮询
  → onHide/onUnload: clearInterval
```

**交互要点**

1. 气泡：自己在右（主色），对方在左（白底）；显示时间（间隔 > 5 分钟才显示一次）。
2. 输入框 `maxlength=500`，`confirm-type="send"`，`adjust-position`。
3. 发送：乐观更新 + 失败标红重试。
4. 轮询：`afterId` 增量 + 按 `messageId` 去重 + 只在底部时自动滚动。
5. 页面隐藏（`onHide`）时也调一次 `read`。
6. 标题：显示对方昵称；副标题显示“关于《xxx》”或“关于代取订单”。

**异常与边界**

| 情况 | 处理 |
| --- | --- |
| 403（不是参与者） | 提示“无权查看该会话” + 返回 |
| 会话创建失败 | 停在骨架屏 + 重试按钮 |
| 发送失败 | 红点 + 点击重发，不丢草稿 |
| 长按消息 | 复制（`wx.setClipboardData`），不做撤回/删除（P2 不做） |
| 页面反复进出 | 不留定时器（`onUnload` 必清） |

**验收**：两账号 5 秒内收到消息；快速进出 10 次不双发不重复；未读数随之归零。

---

## 7. 聊天全栈手册（你唯一的后端部分）

### 7.1 你负责的边界

| 层 | 内容 | 谁做 |
| --- | --- | --- |
| 表结构 | `conversations`、`messages`（**没有 `conversation_members`**，成员关系就是 `conversations.user_a_id / user_b_id` 两列） | A（你只读） |
| 会话/未读对象 | `sp_get_or_create_conversation`、`fn_unread_count`、`v_conversation_base`、`trg_message_after_insert` | A（11-13 前交付） |
| 路由 | `server/src/routes/chat.js` | **你** |
| 挂载 | `app.use('/api/conversations', chatRouter)` | A（已挂好，你只改路由文件内部） |
| 页面 | `pages/chat/list`、`pages/chat/detail` | **你** |
| 测试 | 聊天用例 12 条 + 越权用例 | **你** |

**接口前缀**：`/api/conversations`（不是 `/api/chat`，与 A 的挂载点一致）。

### 7.2 七个接口的详细契约

#### 7.2.1 `POST /api/conversations` 获取或创建会话

请求：

```json
{ "peerId": 2, "bizType": "item", "bizId": 15 }
```

- `peerId` 必填，正整数，且不能等于当前用户（等于自己返回 400）。
- `bizType` 只能是 `item` / `errand`。
- `bizId` 商品或订单 ID。**私单流程必须传真实 `orderId`**：发布页先以 `visibility='private'` 建单，拿返回的 `orderId` 建会话，后端才能用 `isErrandChatPeer` 认出「这个跑腿聊过这单」，否则详情页 `canTake` 恒为 false、接单返回 403。`0` 仅为兼容历史数据保留。

返回：

```json
{ "code": 0, "message": "ok",
  "data": { "conversationId": 7, "peerId": 2, "peerNickname": "李四", "peerAvatar": "/uploads/a2.jpg" } }
```

- 同一 `(当前用户, peerId, bizType, bizId)` 必须返回**同一个** `conversationId`。

#### 7.2.2 `GET /api/conversations` 会话列表

查询参数：`page`、`pageSize`（默认 1/20）。

返回：

```json
{ "code": 0, "data": { "list": [
  { "conversationId": 7, "peerId": 2, "peerNickname": "李四", "peerAvatar": "/uploads/a2.jpg",
    "lastMessage": "在的，明天可以吗", "lastTime": "2026-11-15 20:12:03",
    "unreadCount": 2, "bizType": "item", "bizId": 15 }
], "total": 5, "page": 1, "pageSize": 20 } }
```

#### 7.2.3 `GET /api/conversations/:id/messages` 增量拉消息

参数：`afterId`（默认 0）、`limit`（默认 20，最大 50）。

返回 `list` 按 `messageId` **升序**，每条含 `messageId`、`senderId`、`content`、`createdAt`、`isMine`（后端算，前端不必比对）。

> `afterId` 是“只看更新的”，所以页面首次进入用 0 拉最近一页（后端按 `messageId DESC LIMIT` 再升序返回），轮询用本地最大 `messageId`。

#### 7.2.4 `POST /api/conversations/:id/messages` 发送消息

请求：`{ "content": "还在吗" }`。校验：trim 后非空、≤ 500 字、用户必须是会话参与者。

返回：`{ "messageId": 88, "createdAt": "2026-11-15 20:13:10" }`。

#### 7.2.5 `POST /api/conversations/:id/read` 标记已读

请求：`{ "lastMessageId": 88 }`（可省略，省略则标记到最新）。返回 `{ "unreadCount": 0 }`。

#### 7.2.6 `GET /api/conversations/unread-count`

返回 `{ "count": 3 }`，用于 tabBar 红点。

#### 7.2.7 `GET /api/conversations/:id/context` 会话业务卡片

返回 `{ bizType, bizId, bizSummary }`：商品会话给封面/标题/价格/状态，代取会话给规格、取片区/地标、报酬、状态；记录不存在时 `bizSummary = null`。
卡片只负责展示与跳转，接单动作仍在代取详情页完成（`canTake` 由后端算）。

### 7.3 `routes/chat.js` 参考实现

```js
const express = require('express');
const router = express.Router();
const db = require('../db');                 // A 的 mysql2/promise 连接池
const auth = require('../middleware/auth');  // A 的鉴权中间件

router.use(auth);

// 工具：确认当前用户属于该会话，否则 null
// 没有 conversation_members 表，成员关系就在 conversations 的 user_a_id / user_b_id 上
async function assertMember(conversationId, userId) {
  const [rows] = await db.query(
    'SELECT conversation_id FROM conversations WHERE conversation_id = ? AND (user_a_id = ? OR user_b_id = ?) LIMIT 1',
    [conversationId, userId, userId]
  );
  return rows.length ? rows[0] : null;
}

// 1) 获取或创建会话
router.post('/', async (req, res, next) => {
  try {
    const me = req.user.userId;
    const { peerId, bizType = 'item', bizId = 0 } = req.body || {};
    if (!peerId) return res.status(400).json({ code: 400, message: '缺少 peerId' });
    if (Number(peerId) === Number(me)) return res.status(400).json({ code: 400, message: '不能和自己发起会话' });
    if (!['item', 'errand'].includes(bizType)) return res.status(400).json({ code: 400, message: 'bizType 非法' });

    // 调 A 的存储过程；输出参数方式按 objects.sql 实际写法调整
    const [out] = await db.query('CALL sp_get_or_create_conversation(?, ?, ?, ?, @cid)', [me, peerId, bizType, bizId]);
    const [[{ cid }]] = await db.query('SELECT @cid AS cid');

    const [[peer]] = await db.query('SELECT nickname, avatar_url FROM users WHERE user_id = ?', [peerId]);
    res.json({ code: 0, message: 'ok', data: {
      conversationId: cid,
      peerId: Number(peerId),
      peerNickname: peer ? peer.nickname : '',
      peerAvatar: peer ? peer.avatar_url : ''
    }});
  } catch (e) { next(e); }
});

// 2) 会话列表
router.get('/', async (req, res, next) => {
  try {
    const me = req.user.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;

    const [rows] = await db.query(
      `SELECT conversation_id AS conversationId, peer_id AS peerId, peer_nickname AS peerNickname,
              peer_avatar AS peerAvatar, last_message AS lastMessage, last_time AS lastTime,
              unread_count AS unreadCount, biz_type AS bizType, biz_id AS bizId
         FROM v_conversation_base
        WHERE user_id = ?
        ORDER BY last_time DESC
        LIMIT ? OFFSET ?`, [me, pageSize, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_a_id = ? OR user_b_id = ?', [me, me]
    );
    res.json({ code: 0, message: 'ok', data: { list: rows, total, page, pageSize } });
  } catch (e) { next(e); }
});

// 3) 增量拉消息
router.get('/:id/messages', async (req, res, next) => {
  try {
    const me = req.user.userId;
    const cid = Number(req.params.id);
    if (!(await assertMember(cid, me))) return res.status(403).json({ code: 403, message: '无权查看该会话' });

    const afterId = Number(req.query.afterId) || 0;
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const [rows] = await db.query(
      `SELECT message_id AS messageId, sender_id AS senderId, content, created_at AS createdAt
         FROM messages
        WHERE conversation_id = ? AND message_id > ?
        ORDER BY message_id ASC
        LIMIT ?`, [cid, afterId, limit]
    );
    rows.forEach(r => { r.isMine = Number(r.senderId) === Number(me); });
    res.json({ code: 0, message: 'ok', data: { list: rows } });
  } catch (e) { next(e); }
});

// 4) 发送消息
router.post('/:id/messages', async (req, res, next) => {
  try {
    const me = req.user.userId;
    const cid = Number(req.params.id);
    const content = String((req.body || {}).content || '').trim();
    if (!content) return res.status(400).json({ code: 400, message: '消息不能为空' });
    if (content.length > 500) return res.status(400).json({ code: 400, message: '消息不能超过 500 字' });
    if (!(await assertMember(cid, me))) return res.status(403).json({ code: 403, message: '无权在该会话发言' });

    const [r] = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [cid, me, content]
    );
    const [[row]] = await db.query(
      'SELECT created_at AS createdAt FROM messages WHERE message_id = ?', [r.insertId]
    );
    res.json({ code: 0, message: 'ok', data: { messageId: r.insertId, createdAt: row.createdAt } });
  } catch (e) { next(e); }
});

// 5) 标记已读
router.post('/:id/read', async (req, res, next) => {
  try {
    const me = req.user.userId;
    const cid = Number(req.params.id);
    if (!(await assertMember(cid, me))) return res.status(403).json({ code: 403, message: '无权操作该会话' });

    // 已读状态落在 messages.is_read 上：把“对方发的、还没读的”消息置 1
    const lastMessageId = Number((req.body || {}).lastMessageId) || 0;
    const sql = lastMessageId > 0
      ? `UPDATE messages SET is_read = 1
          WHERE conversation_id = ? AND sender_id <> ? AND message_id <= ?`
      : `UPDATE messages SET is_read = 1
          WHERE conversation_id = ? AND sender_id <> ?`;
    const params = lastMessageId > 0 ? [cid, me, lastMessageId] : [cid, me];
    await db.query(sql, params);
    const [[{ unread }]] = await db.query('SELECT fn_unread_count(?) AS unread', [me]);
    res.json({ code: 0, message: 'ok', data: { unreadCount: unread || 0 } });
  } catch (e) { next(e); }
});

// 6) 总未读数
router.get('/unread-count', async (req, res, next) => {
  try {
    const [[row]] = await db.query('SELECT fn_unread_count(?) AS count', [req.user.userId]);
    res.json({ code: 0, message: 'ok', data: { count: row.count || 0 } });
  } catch (e) { next(e); }
});

module.exports = router;
```

**路由顺序坑**：`/unread-count` 必须写在 `/:id/...` **之前**，否则 `unread-count` 会被当成 `:id` 匹配（`Number('unread-count')` 是 `NaN`，报 500）。

**存储过程调用坑**：`CALL` 的输出参数在 `mysql2` 里用 `@cid` + 单独 `SELECT @cid` 拿，不要指望返回值。若 A 用了 `OUT` 参数配合 `execute`，按 A 的实际写法改，**不要自己改 `objects.sql`**。

### 7.4 三条必须守住的安全线

1. **越权**：每个 `/:id` 接口都先 `assertMember`，403 而不是 404（避免猜 ID）。
2. **参数化**：所有变量用 `?`，`ORDER BY`/`LIMIT` 用白名单或 `Number()` 强转。
3. **内容长度**：`content` 服务端也截断校验，不能只靠前端 `maxlength`。

### 7.5 轮询 vs WebSocket 的取舍（报告里要能解释）

| 方案 | 优点 | 缺点 | 本项目 |
| --- | --- | --- | --- |
| 3 秒轮询 | 实现简单、无需额外服务、断网自动恢复 | 非实时、有请求开销 | **采用** |
| WebSocket | 真实时 | 需要 `ws` 服务、心跳重连、部署复杂 | 不采用，写入展望 |

**报告写法**（第 7 章 + 第 9 章难点）：“聊天的实时性通过 3 秒增量轮询实现，客户端只请求 `messageId > afterId` 的增量数据，避免全量拉取；单次请求在 5000 条消息规模下仍为毫秒级索引查询。代价是消息最长延迟 3 秒、空闲时仍有请求；若改为 WebSocket 可消除轮询开销，但需要额外的连接管理与心跳机制，超出本课程设计范围。”

### 7.6 聊天自测清单（11-16 前必须全过）

- [ ] 重复创建会话返回同一 `conversationId`。
- [ ] `afterId` 增量拉取不重复、不丢消息。
- [ ] 非参与者拉消息/发消息/标记已读 → 403。
- [ ] 空消息、501 字消息 → 400。
- [ ] `bizType=xxx` → 400。
- [ ] 与自己建会话 → 400。
- [ ] 会话列表按 `last_time` 倒序，未读数正确。
- [ ] 标记已读后 `unread-count` 归零。
- [ ] 两账号互发，5 秒内到达。
- [ ] 5000 条消息下首屏 < 1 秒。

---

## 8. Git 异常处理手册

原则：**先 `git status`，再决定。不知道后果的命令不要执行，尤其不要 `push --force`。**

### 8.1 push 失败（网络 / 超时）

```bash
git push
# fatal: unable to access ... Could not resolve host
# 或 RPC failed; HTTP 408
```

处理顺序：

1. 换网络（手机热点）或关掉 VPN/代理再试。
2. 加大缓冲：`git config --global http.postBuffer 524288000`。
3. 只推当前分支：`git push origin HEAD`。
4. 仍然失败：先在群里说“推不上去”，把改动 `git stash` 或本地 commit 保留，**不要删代码重来**。

**本地 commit 不会丢**，push 失败不慌。

### 8.2 push 被拒绝（non-fast-forward）

```text
! [rejected] dev -> dev (non-fast-forward)
hint: Updates were rejected because the tip of your current branch is behind
```

说明远程有别人（A）的新提交。处理：

```bash
git pull --no-rebase origin dev     # 先拉再合
# 解决冲突（见 8.4）
git push origin dev
```

**不要用 `git push -f`。** 那会覆盖 A 的提交，属于严重事故。

### 8.3 忘记切分支，在 dev 上写了代码

```bash
git status                       # 看到改动
git stash push -m "wip: errand-page"
git switch -c feature/errand-publish
git stash pop
```

改动就到新分支上了，`dev` 恢复干净。

如果已经 commit 到 `dev` 但还没 push：

```bash
git log --oneline -3             # 确认最新的提交是你的
git reset --soft HEAD~1          # 撤销提交，改动回到暂存区
git stash push -m "wip"
git switch -c feature/xxx
git stash pop
```

**`--soft` 不会丢改动；不要用 `--hard`。**

### 8.4 冲突处理（最常见的场景：`app.json`、`docs/接口文档.md`）

```bash
git pull origin dev
# CONFLICT (content): Merge conflict in miniprogram/app.json
```

**步骤：**

1. `git status` 看哪些文件冲突（`both modified`）。
2. 打开文件，找到标记：

```text
<<<<<<< HEAD
你的版本
=======
远程的版本
>>>>>>> origin/dev
```

3. **手工合并成最终版本**，删掉三行标记。
4. `git add <冲突文件>` → `git commit -m "merge: 解决 app.json 冲突"`。
5. 重新编译，确认 20 页都在（`app.json` 冲突最容易丢页面）。

**冲突处理的三个专用约定：**

| 文件 | 约定 |
| --- | --- |
| `miniprogram/app.json` | 以**页面并集**为准，两边的 pages 都要保留，顺序按你定的 20 页顺序 |
| `docs/接口文档.md` | 两边段落都保留，聊天段以你为准 |
| `report/报告.docx`、`report/答辩PPT.pptx` | 二进制冲突无法合并：**永远先 `git pull` 再编辑，且只有你能编辑**；若已冲突，以最新一版为准，另一版从 `git log` 找回后手工重贴 |

**看不懂就后退：**

```bash
git merge --abort        # 放弃这次合并，回到合并前状态
```

### 8.5 提交错了（改 message / 漏文件）

```bash
# 改最后一次提交的说明（还没 push）
git commit --amend -m "feat(chat): 会话列表与未读红点"

# 忘了加文件
git add miniprogram/utils/format.js
git commit --amend --no-edit
```

已 push 的提交不要 amend（会造成分叉），直接再提交一个 `fix:` 更安全。

### 8.6 stash 的用法

```bash
git stash push -m "wip: 聊天页轮询"    # 暂存当前改动
git stash list                          # 查看
git stash pop                           # 恢复并删除记录
git stash apply                         # 恢复但保留记录
git stash drop stash@{0}                # 丢弃某条
```

**用途**：临时切分支修 bug、pull 前有未提交改动。

### 8.7 误删文件 / 想回到某个版本

```bash
git status                              # 看被删的文件
git restore miniprogram/pages/chat/detail/detail.wxml   # 恢复工作区文件

git log --oneline -10                   # 找目标提交
git show <commit>:path/to/file          # 看某个版本的文件内容
git restore --source=<commit> -- path/to/file  # 用历史版本覆盖
```

**没提交的改动恢复不了**（除非编辑器有本地历史）；所以“小步提交”是唯一的保险。

### 8.8 分支搞乱了

```bash
git branch                              # 我在哪
git switch dev                          # 回主线
git branch -d feature/xxx               # 删已合并分支（失败说明没合并）
git fetch --prune                       # 清理远程已删分支
git branch -a                           # 再确认
```

**不要 `git branch -D` 强删没合并的分支**——里面可能是你写了两天的页面。

### 8.9 PR 合并后本地还显示旧代码

```bash
git switch dev
git pull origin dev
git fetch --prune
```

PR 是在 GitHub 上合并的，本地必须 pull 才能看到。

### 8.10 大文件/敏感文件误提交

```bash
# 只是刚 add，还没 commit
git restore --staged report/系统演示.mp4

# 已经 commit 但没 push
git reset --soft HEAD~1
# 从暂存区移除大文件，重新提交其他文件

# 已经 push（不要在 main 上这样做，先问 A）
# 用 git rm --cached 后提交一次，历史上仍有记录，需 force push 才能清
git rm --cached report/系统演示.mp4
echo "report/*.mp4" >> .gitignore
git add .gitignore
git commit -m "chore: 忽略演示视频文件"
```

**预防**：`.gitignore` 里必须有 `node_modules/`、`.env`、`report/*.mp4`、`report/*.docx`（若老师要求交 docx，就放 `report/` 但不进 Git，用 U 盘交）、`*.log`、`unpackage/`、`miniprogram_npm/`。

### 8.11 微信开发者工具相关

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 编译报 “pages/xxx 未找到” | `app.json` 注册了但目录四个文件不齐 | 补齐 `.js/.json/.wxml/.wxss` |
| 组件样式不生效 | `usingComponents` 路径写成相对路径 | 用绝对路径 `/components/xxx/index` |
| 改了代码没生效 | 缓存 | 工具菜单“清缓存 → 全部清除”后重编译 |
| 真机白屏 | `onLaunch` 里阻塞式 `await` | 改成异步校验，先渲染 |
| 真机请求失败 | `127.0.0.1` 或未勾选不校验域名 | 改局域网 IP + 勾选不校验 |

### 8.12 求助的正确姿势

发群里的信息要包含：

1. 我在哪个分支、想做什么。
2. 报错原文（截图或文字，不要只说“报错了”）。
3. 我已经试过什么。
4. `git status` 输出。

**永远不要在没备份的情况下执行 `git reset --hard`、`git clean -fd`、`git push -f`。**

---

## 9. 和 A 的协作规则

### 9.1 每天的同步（15 分钟，21:30）

固定四个问题：

1. 今天完成了什么？（对应到页面/接口）
2. 明天做什么？
3. 有没有阻塞？（等接口、等数据库对象、等素材）
4. 有没有接口变更？

写成一句话发群里，例如：

> 今天：代取大厅 + 发布页完成，片区联动已修。明天：详情页。阻塞：`POST /api/errands` 的时间字段命名要确认（`timeStart` 还是 `startTime`）。明天要 A 的 `v_errand_hall` 视图确认字段。

### 9.2 分工红线和求助边界

| 情况 | 你该怎么做 |
| --- | --- |
| 需要新接口 | 在群里提，写清路径、入参、返回；A 排期 |
| 需要加字段/改表 | 提给 A，A 改 SQL，你重新导入 |
| A 的接口返回不对 | 先自己用 Postman 复现，带上请求和返回截图提给 A |
| A 的页面有 UI 问题 | 写进 `docs/UI走查记录-B.md`，A 改（或授权你改） |
| `app.json` 要加页面 | 你自己改（你是唯一负责人） |
| 报告章节内容冲突 | 以实际代码 + `schema.sql` 为准，两人一起核对 |
| 你想重构 A 的代码 | **不要**。要重构就提 issue，A 同意后他自己改 |

**一句话：`database/` 和 `server/` 除 `routes/chat.js` 之外，你不写；`miniprogram/` 除 A 的 6 个页面之外，你全权负责。**

### 9.3 术语统一表（报告、PPT、页面文案都用这套）

| 中文 | 英文/字段 | 不要用 |
| --- | --- | --- |
| 用户 | user | 账号、会员 |
| 卖家 | seller | 商家、店主 |
| 买家 | buyer | 顾客 |
| 跑腿 / 接单者 | runner | 骑手、外卖员、代取员 |
| 代取订单 | `errand_orders` / errand order | 跑腿单、任务单、代拿单 |
| 二手商品 | `items` / item | 产品、货物 |
| 收藏 | favorites | 关注 |
| 会话 | conversations | 聊天室、对话 |
| 消息 | messages | 信息、聊天记录 |
| 在售 | `on_sale` | 上架中、售卖中 |
| 已售出 | `sold` | 已卖出、完成 |
| 已下架 | `off_shelf` | 下架、删除 |
| 待接单 | `pending` | 待处理、未接、待领取 |
| 已接单 | `taken` | 已接、进行中、已领取 |
| 已完成 | `completed` | 完成、已送达 |
| 已取消 | `cancelled` | 取消、关闭、已撤回 |
| 撤回 | cancel（发布者动作） | 取消订单 |
| 释放 | release（接单者动作） | 退单、放弃 |
| 上线 | online | 上架、开工 |
| 片区 | zone | 区域、园区 |
| 地标 | place / landmark | 地点、位置、楼栋 |
| 规格 | `itemSize`（small/medium/large） | 大小、尺寸类型 |

**注意**：`pending` 在代取里是“待接单”，在二手商品里没有这个状态；`reserved` 只在二手商品里存在。报告里不要混。

### 9.4 页面文案规范（UI 走查的检查项之一）

1. 按钮动词开头：“发布代取”“确认接单”“联系 TA”，不用“提交”。
2. 状态用词与 9.3 一致，全站唯一。
3. 空态要有出路：一句话说明 + 一个按钮。
4. 错误提示说人话：“网络异常，请检查网络”，不要“error 500”。
5. 不用感叹号堆叠，不用“亲”。
6. 数字带单位：“¥12.00”“3 人”“20 分钟前”。
7. 时间格式统一 `MM-DD HH:mm`（跨年才显示年份）。
8. 二次确认必须写清后果，不只写“确定吗？”。

### 9.5 答辩常见问题（你负责系统部分的 12 个）

| # | 问题 | 你的回答要点 |
| --- | --- | --- |
| 1 | 系统有哪些角色，各能做什么？ | 游客/普通用户/跑腿；用户发商品和代取单，跑腿上线接单 |
| 2 | 二手交易流程怎么走？ | 发布 → 搜索 → 详情 → 收藏 → 联系卖家 → 线下交易 → 标记售出 |
| 3 | 代取为什么做“大厅 + 找跑腿”两条路？ | 先精准匹配，匹配不到再广播，减少无人接单 |
| 4 | 接单怎么保证不被重复接？ | 数据库 `FOR UPDATE` + 条件更新 + `affectedRows` 判断，冲突返回 409（A 主讲） |
| 5 | 聊天为什么用轮询不用 WebSocket？ | 实现简单、断网自恢复；代价是最长 3 秒延迟、空闲有请求；增量拉取控制开销 |
| 6 | 聊天怎么保证安全？ | 每个接口校验会话成员，非成员 403；消息长度服务端再校验；参数化查询 |
| 7 | 未读数怎么算的？ | `fn_unread_count` 数 `messages` 里 `is_read = 0 且 sender_id <> 我` 的条数，会话列表和 tabBar 共用；没有 `last_read_id` 游标 |
| 8 | 上线/计划是怎么实现的？ | `once`/`weekly` 计划存 JSON，Node 定时任务按分钟判断上下线；手动下线可只影响这一次 |
| 9 | 找跑腿的匹配条件是什么？ | 取件片区 + 具体地标 + 在线状态 + 在线计划重叠 + 规格 |
| 10 | 前端怎么统一管理请求和错误？ | `utils/request.js` 统一封装 token、401 跳登录、错误提示、超时；页面只关心业务 |
| 11 | 两人怎么分工的？ | A 数据库 + 后端主线 + 二手 6 页；B 公共层 + 登录/个人中心 + 代取 6 页 + 聊天全栈 + 材料；Git 分支 + PR 记录可查 |
| 12 | 如果重做，你会改什么？ | 聊天换 WebSocket、搜索换全文索引、加后台审核、补自动化测试 |

**回答原则**：不会就承认，然后把话题带回你熟悉的部分（页面交互、轮询、组件复用、材料制作）。

### 9.6 进度落后时的砍功能顺序（提前决定，避免现场纠结）

从后往前砍，砍到能守住里程碑为止：

1. 找跑腿匹配页（P1）→ 只保留“去大厅发布”的引导。
2. 个人资料/设置/帮助（P1）→ 保留设置和退出登录，帮助只留静态文案。
3. 我的代取只保留一个 tab（我发布的）。
4. 聊天不做乐观更新和重试，只做基本发送 + 轮询。
5. 消息不做时间分组，只显示单条时间。
6. PPT 页数从 12 减到 10（去掉 P6、P11 合并）。
7. 视频从 6~8 分钟减到 4~5 分钟（数据库片段压缩）。

**永远不砍**：登录注册、代取大厅/发布/详情、聊天基本收发、报告主体章节、三处备份。

---

## 10. 报告、PPT、视频（你的部分）

### 10.1 你负责的章节与时间

| 内容 | 初稿 | 定稿 | 主要素材 |
| --- | --- | --- | --- |
| 第 4 章 逻辑设计 | 11-22 | 11-24 | `database/schema.sql` |
| 第 7 章 系统实现 | 11-23 | 11-24 | `miniprogram/`、`server/` |
| 第 8 章 系统测试 | 11-23 | 11-24 | `docs/测试用例.md`、bug 清单 |
| 第 10 章 系统使用简介 | 11-24 | 11-25 | `readme.txt` |
| AI 辅助开发专题 | 11-24 | 11-25 | `docs/AI辅助开发记录-B.md` |
| 封面/摘要/目录/排版 | 11-25 | 11-29 | 学校模板 |

### 10.2 第 4 章 逻辑设计（写作要点 + 模板）

```text
4.1 关系模式
4.2 范式分析（3NF 论证）
4.3 表结构设计（逐表说明）
4.4 完整性约束
```

**4.1 关系模式**：14 张表全部列出，主键加粗：

```text
users(**user_id**, student_no, password_hash, nickname, avatar_url, campus, college, phone,
      credit_score, status, created_at)
categories(**category_id**, name, sort_no)
books(**book_id**, isbn, title, author, publisher, edition, price_ref, cover_url)
items(**item_id**, seller_id, category_id, book_id, item_type, title, description, price, original_price,
      condition_level, negotiable, campus, location, status, view_count, favorite_count,
      created_at, updated_at)
item_images(**image_id**, item_id, url, sort_no)
favorites(**user_id**, **item_id**, created_at)
errand_orders(**order_id**, publisher_id, runner_id, pickup_area, pickup_place, delivery_location,
              item_size, item_desc, remark, reward, time_type, time_start, deadline, status, visibility,
              created_at, taken_at, completed_at)
runner_profiles(**user_id**, is_online, availability_type, service_areas, service_places, time_slots,
                manual_until, base_price, remark, completed_count)
runner_item_sizes(**user_id**, **item_size**)
conversations(**conversation_id**, user_a_id, user_b_id, biz_type, biz_id, last_message, last_time)
messages(**message_id**, conversation_id, sender_id, msg_type, content, is_read, created_at)
item_status_logs(**log_id**, item_id, old_status, new_status, changed_by, changed_at)
errand_status_logs(**log_id**, order_id, old_status, new_status, changed_by, changed_at)
feedback(**feedback_id**, user_id, content, created_at)
```

> 字段名以 `database/schema.sql` 为准；A 改过结构就同步改本文，**不要凭记忆写**。

**4.2 3NF 论证**（挑 4 张表逐个写，每个 3~5 行）：

- `items`：所有非主属性完全依赖 `item_id`；分类名、书目信息拆到 `categories`/`books`，消除传递依赖；图片拆到 `item_images`，消除多值属性。
- `errand_orders`：`pickup_area`/`pickup_place` 直接依赖订单，不依赖发布人；跑腿能力拆到 `runner_profiles`，避免“发布人能力”这种错误依赖。
- `messages`：`conversation_id + sender_id + content + created_at` 全部依赖 `message_id`；会话最后消息冗余在 `conversations`，属于**有意识的反规范化**，由触发器维护。
- `runner_profiles`：`user_id` 作主键，1:1 关系；多值属性（片区数组、规格）用 JSON 与 `runner_item_sizes` 联合表处理，说明为什么两者并存。

**4.3 表结构**：每张表一个小节，字段表四列（字段、类型、约束、说明），字段数多的表（`items`、`errand_orders`）完整列，其余可只列关键字段并注明“完整定义见 `schema.sql`”。

**4.4 完整性约束**：实体完整性（主键）、参照完整性（外键 + `ON DELETE` 策略）、用户定义完整性（`CHECK`/`ENUM`/`NOT NULL`/金额 ≥ 0）。举 3 个例子说明为什么这样设计。

**常见扣分点：**

- 关系模式和 `schema.sql` 不一致（最常见）。
- 3NF 论证只写“满足第三范式”，没有具体依赖分析。
- 表结构截图/A 的图重复，或只贴 ER 图没有表结构。

### 10.3 第 7 章 系统实现（写作要点 + 模板）

```text
7.1 系统总体架构
7.2 小程序端实现
7.3 后端接口实现
7.4 关键功能实现
7.5 数据库访问方式
7.6 界面展示
```

**7.1 架构**：图 7-1 三层图（小程序 → Express HTTP/JSON → MySQL），标注 JWT 鉴权、静态图片、定时任务三处细节。

**7.2 小程序端**：写清五件事，每件配 8~12 行代码：

1. 页面注册与 tabBar（`app.json`）。
2. 统一请求封装（`request.js`）：token 注入、401 跳转、错误提示。
3. 组件复用（`item-card`/`empty-state`/`status-tag`）：一段用法 + 一句“减少三个页面重复代码约 xx 行”。
4. 三态管理：加载/空/错误的标准做法。
5. 分页与下拉刷新：`page/pageSize/hasMore` 的写法。

**7.3 后端接口**：路由分层（`routes/` 按模块）、统一响应、鉴权中间件、错误处理。附一张接口数量统计表（认证 3、用户 4、二手 6、代取 7、聊天 6、上传 1）。

**7.4 关键功能实现（这是拿分重点，选 4 个写透）**

| 功能 | 写到什么程度 |
| --- | --- |
| 登录鉴权 | 密码 bcrypt 校验 → 签发 JWT → 中间件解析 → `req.user`；前端 token 存储与 401 处理 |
| 代取状态机 | `pending → taken → completed`，`pending → cancelled`，`taken → pending`（撤回/释放）；`canXxx` 由后端算，前端只渲染 |
| 聊天会话 | `sp_get_or_create_conversation` 保证唯一；`(user_a,user_b,biz_type,biz_id)` 唯一约束 |
| 增量轮询 | `afterId` 增量 + 去重 + 只在底部时自动滚动；3 秒间隔；`onHide/onUnload` 清定时器 |

每个功能按：**需求一句话 → 设计（含图或流程）→ 关键代码 ≤ 15 行 → 效果截图** 写。

**7.5 数据库访问**：手写 SQL + 参数化、事务用法、视图/过程/函数在哪些接口被调用（做一张对照表：对象名 → 调用接口 → 所在文件）。

**7.6 界面展示**：8~12 张截图，每张一句话说明“这个界面解决什么问题”。

**常见扣分点：**

- 只贴大段代码，没有设计说明。
- 代码和实际仓库不一致（改了代码没更新报告）。
- 截图糊、有调试信息、有真实个人信息。
- 没有说清“哪个页面调哪个接口”。

### 10.4 第 8 章 系统测试（写作要点）

```text
8.1 测试环境与方法
8.2 测试用例设计
8.3 功能测试结果
8.4 异常与边界测试
8.5 并发测试
8.6 缺陷统计与修复
```

**8.1**：表格写清 OS、Node、MySQL、微信开发者工具、开发者工具基础库版本、测试账号数量、测试轮次（3 轮：M1 后、M2 后、冻结后）。

**8.2**：说明用例设计方法（等价类、边界值、场景法），给出用例总数与分布表（模块 / 条数 / P0 / P1）。

**8.3**：按模块统计通过率表：

| 模块 | 用例数 | 通过 | 失败 | 通过率 |
| --- | --- | --- | --- | --- |
| 认证 | 8 | 8 | 0 | 100% |
| 二手 | 16 | 16 | 0 | 100% |
| 代取 | 18 | 17 | 1 | 94.4% |
| 聊天 | 12 | 12 | 0 | 100% |
| 个人中心 | 6 | 6 | 0 | 100% |
| **合计** | **60** | **59** | **1** | **98.3%** |

> 数字必须和你 `docs/测试用例.md` 里的真实统计一致，不要凑整。

**8.4**：把 11-19 的 12 条负向测试整理成表，重点写 token 过期、越权、断网、空提交、超长输入。

**8.5**：引用 A 的并发接单测试（两个会话，一个 200 一个 409），贴两张截图。

**8.6**：bug 清单表（编号、模块、现象、原因、修复方式、状态），至少 10 条真实 bug，写清“已修复/遗留”。

**常见扣分点**：只写“测试通过”没有表；用例数和报告数字矛盾；没有缺陷记录（显得没真测）。

### 10.5 第 10 章 系统使用简介（写作要点）

面向“第一次拿到项目的人”，必须能照着做：

```text
10.1 运行环境
10.2 数据库初始化
10.3 后端启动
10.4 小程序运行
10.5 演示账号与操作路径
10.6 常见问题
```

- 10.3 的 `.env` 只写字段名和示例值，**不写真实密码**。
- 10.4 必须写“勾选不校验合法域名”“`BASE_URL` 改局域网 IP”。
- 10.5 给三条闭环的操作步骤（二手 / 代取 / 聊天），每步一句话。
- 10.6 至少 6 条：端口占用、图片不显示、真机请求失败、中文乱码、时间显示 Invalid Date、编译报页面未找到。

### 10.6 AI 辅助开发专题（必写，老师会看）

结构：

```text
1. 使用的工具与场景（代码生成、报错排查、文档润色、测试用例设计）
2. 三个真实案例：提示词 → 产出 → 我改了什么（每个 3~5 行）
3. 效果评价：哪些环节提效明显（页面骨架、SQL 草稿、文案），哪些不行（业务规则、UI 细节）
4. 边界与反思：AI 生成的代码必须人工 review；SQL 必须自己验证；不能把不确定的答案写进报告
5. 学术诚信声明：核心设计、业务逻辑由本人完成，AI 仅作辅助
```

**注意**：不要写成“AI 帮我们做完了”；写清“哪里用了、我怎么验证、改了什么”。

### 10.7 版面与排版（你主导）

| 项 | 要求 |
| --- | --- |
| 纸张/页边距 | A4；上 2.5 / 下 2.5 / 左 3 / 右 2.5 cm（以学校模板为准） |
| 正文 | 小四宋体，1.5 倍行距，首行缩进 2 字符 |
| 标题 | 一级黑体三号、二级黑体四号、三级黑体小四 |
| 图题 | 图下方，五号宋体居中，“图 7-1 xxx” |
| 表题 | 表上方，五号宋体居中，“表 4-1 xxx” |
| 代码 | Consolas 五号，浅灰底纹，单倍行距，不超过页宽 |
| 页码 | 底部居中；页眉写项目名 |
| 分页 | 摘要、目录、正文、参考文献各自另起一页 |

**排版流程**：先定义样式 → 套用 → 插图表 → 更新域 → 生成目录 → 逐页检查（图题不孤行、表格不跨页断头）。

### 10.8 图表编号与截图清单（你负责的部分）

| 编号 | 内容 | 页面 |
| --- | --- | --- |
| 图 7-1 | 系统总体架构图 | — |
| 图 7-2 | 小程序目录结构 | — |
| 图 7-3 | 统一请求封装流程 | — |
| 图 7-4~7-13 | 登录、注册、个人中心、代取大厅、发布代取、代取详情（taken）、找跑腿、我的代取、接单设置、消息列表、聊天页 | 对应页面 |
| 图 8-1~8-4 | 测试执行截图、并发接单 409、越权 403、断网错误态 | — |
| 表 4-1 | 关系模式一览 | — |
| 表 4-2~4-15 | 各表结构 | — |
| 表 7-1 | 接口清单 | — |
| 表 7-2 | 数据库对象调用对照 | — |
| 表 8-1 | 用例分布 | — |
| 表 8-2 | 通过率统计 | — |
| 表 8-3 | 缺陷清单 | — |

### 10.9 PPT 制作清单（你的操作步骤）

1. 建母版：16:9，深蓝 `#1f3a93` + 浅灰 `#f5f6f8`；标题字体思源黑体/微软雅黑，正文同族。
2. 统一版式：标题左上、内容居中、页码右下、留白足够。
3. 逐页填内容（按 4.7 表格），A 的 P5~P8 素材 11-25 12:00 前收到。
4. 截图统一加 2px 边框 + 圆角，红框标重点。
5. 检查：投影下能否看清、有没有超出边界、字体是否丢失（导出前“嵌入字体”或转图片）。
6. 导出 PDF 备份一份，防止现场 PowerPoint 版本问题。

### 10.10 视频制作清单（你的操作步骤）

1. 收 A 的分段录屏（`video/a_01_schema.mp4` 等），检查分辨率一致。
2. 剪辑软件（剪映专业版即可）：拼接 → 加片头（5 秒）→ 加字幕 → 加片尾。
3. 字幕：关键操作处加一句说明；不要全程念稿式字幕。
4. 导出：1920×1080、30fps、H.264、≤200MB。
5. 自检：全片看一遍，确认无 token/密码/真实信息，声音正常，时长 6~8 分钟。
6. 交付：`report/系统演示.mp4`，另存一份到 U 盘和网盘。

---

## 11. 检查清单

> 用法：每天收工看 11.1；每个里程碑看 11.3；11-21 看 11.4；11-29 看 11.5。**打勾才算完成。**

### 11.1 每日收工（2 分钟）

- [ ] 今天的代码已 `git add` + `commit`，message 能看懂。
- [ ] 已 `git push` 到自己的分支（或已合并 `dev`）。
- [ ] `git status` 没有意外文件（`.env`、`node_modules`、视频、docx）。
- [ ] 开发者工具编译无报错，控制台无红色错误。
- [ ] 今天新页面有三态（加载/空/错误）。
- [ ] 今天新增截图已放进 `report/assets/` 并命名。
- [ ] 给 A 发进度：完成什么、明天做什么、有无阻塞。
- [ ] 明天第一件事写在便签里，不超过 3 条。

### 11.2 每周日检查（15 分钟）

- [ ] `dev` 能跑通三条闭环：二手、代取、聊天。
- [ ] 本周 feature 分支都已合并，没有活过 5 天的分支。
- [ ] 20 个页面都能打开，无 404。
- [ ] 文案与术语表一致（抽查 10 处）。
- [ ] 报告素材覆盖本周完成的功能。
- [ ] 和 A 对一次接口变更，`docs/接口文档.md` 是最新的。
- [ ] 仓库无敏感文件（`.env`、token、真实手机号）。
- [ ] 下周任务拆到天。

### 11.3 里程碑清单

#### M0（11-07）环境与登录打通

- [ ] 20 页在 `app.json` 注册，全部能打开。
- [ ] `GET /api/health` 返回 `{code:0}`。
- [ ] 登录/注册页可用，token 存本地。
- [ ] 401 自动回登录页，不白屏。
- [ ] 3 个演示账号可登录（2023001/002/003）。
- [ ] 个人中心骨架页显示昵称/学号。
- [ ] `main` 有 `v0.1-m0`。

#### M1（11-11）二手闭环（你配合）

- [ ] `item-card` 在首页正常渲染，书籍模式正确。
- [ ] `empty-state` 在三处以上页面复用。
- [ ] 状态标签颜色与文案统一。
- [ ] 走查记录 ≥ 15 条，你负责的已修一半。
- [ ] 首页右下角加号能进发布页。

#### M2（11-16）代取 + 聊天闭环

- [ ] 代取大厅：分页、刷新、三态。
- [ ] 发布代取：片区→地标联动、三种时间模式、12 项校验。
- [ ] 代取详情：按 `canXxx` 显示按钮，四种操作可用，409 提示正确。
- [ ] 我的代取：发布/接单两个 tab 正确。
- [ ] 接单设置：两种模式、计划增删改、下线二选一弹窗。
- [ ] 找跑腿：筛选生效、联系进聊天、不直接改状态。
- [ ] 聊天：会话列表、聊天页、3 秒轮询、增量去重、已读。
- [ ] 越权 403、空消息 400、重复会话同一 ID。
- [ ] 两账号 5 秒内收到消息。
- [ ] `main` 有 `v0.3-m2`。

#### M3（11-21）功能冻结

- [ ] P0 页面全部可用（14 页）。
- [ ] 所有列表页三态齐全。
- [ ] 负向测试 12 条全过。
- [ ] `docs/测试用例.md` ≥ 60 条，P0 通过率 100%。
- [ ] `docs/UI走查记录-B.md` 清零 P0。
- [ ] 截图 ≥ 30 张并有编号。
- [ ] 冻结后不再加功能。
- [ ] `main` 有 `v1.0-m3`。

#### M4（11-26）材料齐套

- [ ] 第 4、7、8、10 章 + AI 专题完成。
- [ ] `报告.docx` 初版：目录、页码、图表编号正确。
- [ ] `答辩PPT.pptx` 12 页初版。
- [ ] `系统演示.mp4` 初版能播放（≤200MB）。
- [ ] `report/assets/` 图目录完整。
- [ ] `docs/测试用例.md`、`docs/接口文档.md` 最新。
- [ ] `main` 有 `v1.0-m4`。

#### M5（11-29）彩排与备份

- [ ] 完整走 2 遍，8~10 分钟不超时。
- [ ] 你的部分能脱稿 4 分钟。
- [ ] 12 个问题能用自己的话答。
- [ ] 干净环境按 readme 启动 ≤ 10 分钟。
- [ ] 三处备份（U 盘 + 网盘 + 邮箱），断网能放视频。
- [ ] `main` 有 `v1.0-final`。

### 11.4 11-21 冻结专项（你的动作）

**可以做**

- 修 P0 bug（登录、代取发布/接单、聊天收发、三态缺失）。
- 补空态/错误态、补文案、补注释。
- 补测试记录、补截图、补文档。
- 修明显的样式错位。

**不可以做**

- 加页面、加字段、改 `app.json` 页面顺序（会打乱别人的测试）。
- 改接口返回格式（A 的接口你不能改）。
- 换 UI 风格、大改组件结构。
- 引入新依赖（`package.json` 归 A）。

**冻结当天**

1. 所有 feature 分支合并 `dev`，删临时分支。
2. 开 PR `dev → main`，合并后打 `v1.0-m3`。
3. 建 `docs/bug清单.md`，按 P0/P1/P2 排优先级，只修 P0/P1。

### 11.5 11-29 提交前总检查

**材料**

- [ ] 报告 docx：章节完整、目录页码正确、图表连续、术语统一。
- [ ] PPT：能打开、字体不丢、截图清晰、12 页。
- [ ] 视频：能播放、有字幕、6~8 分钟、≤200MB。
- [ ] readme：账号、步骤、分工、常见问题。
- [ ] 源码 zip：不含 `node_modules`、`.env`、视频。
- [ ] 数据库 dump：能恢复。

**系统**

- [ ] 干净环境按 readme 启动成功。
- [ ] 3 个账号能登录。
- [ ] 二手、代取、聊天三条闭环可演示。
- [ ] 并发接单能复现 409。
- [ ] 图片能显示（`BASE_URL` 正确）。
- [ ] 断网演示有错误态，不白屏。

**备份**

- [ ] U 盘（zip + docx + pptx + mp4）。
- [ ] 网盘一份。
- [ ] 邮箱一份。
- [ ] 答辩当天不带错版本。

### 11.6 答辩当天（你负责的准备）

- [ ] 提前 30 分钟到场，测投影/网络/电源。
- [ ] 笔记本电量充足 + 充电器。
- [ ] 三份材料（U 盘 + 本地 + 网盘）。
- [ ] 后端 + MySQL 已启动，开发者工具已编译。
- [ ] 3 个账号已登录，聊天页面已在两个窗口打开。
- [ ] PPT 有 PDF 备份，视频有离线备份。
- [ ] 讲稿 + 12 问答案纸面版各一份。
- [ ] 手机静音。

---

## 12. 附录

### 12.1 `.gitignore` 建议

```gitignore
# 依赖
node_modules/
miniprogram_npm/
unpackage/

# 环境变量
.env
.env.*
!.env.example

# 微信开发者工具
project.private.config.json

# 报告与视频大文件（不进 Git，用 U 盘/网盘交）
report/*.docx
report/*.pptx
report/*.mp4
report/*.pdf

# 日志与临时文件
*.log
.DS_Store
Thumbs.db
```

> 如果老师要求 docx/pptx 也进仓库，就把 `report/*.docx`、`report/*.pptx` 两行删掉，但 mp4 建议始终不进 Git。

### 12.2 你负责的文件清单（提交前自查）

```text
miniprogram/
├─ app.js / app.json / app.wxss
├─ config.js
├─ utils/request.js
├─ utils/campus.js
├─ utils/format.js
├─ components/item-card/
├─ components/empty-state/
├─ components/status-tag/
├─ pages/login/
├─ pages/register/
├─ pages/errand/{hall,publish,detail,runners}/
├─ pages/chat/{list,detail}/
└─ pages/mine/{index,profile,settings,help,errands,runner}/

server/src/routes/chat.js

docs/测试用例.md
docs/B测试记录.md
docs/UI走查记录-B.md
docs/AI辅助开发记录-B.md
docs/接口文档.md（聊天段）
docs/答辩讲稿.md（系统部分）

report/B章节.md
report/报告.docx
report/答辩PPT.pptx
report/系统演示.mp4
report/assets/（B 的图）
```

### 12.3 页面 → 接口 → 文件对照表（写报告直接用）

| 页面 | 主要接口 | 前端文件 |
| --- | --- | --- |
| 登录 | `POST /api/auth/login` | `pages/login/` |
| 注册 | `POST /api/auth/register` | `pages/register/` |
| 个人中心 | `GET /api/users/me` | `pages/mine/index/` |
| 个人资料 | `GET/PUT /api/users/me`、`POST /api/upload` | `pages/mine/profile/` |
| 设置 | 本地 + `POST /api/auth/logout`（若有） | `pages/mine/settings/` |
| 帮助 | `POST /api/feedback` | `pages/mine/help/` |
| 代取大厅 | `GET /api/errands?status=pending` | `pages/errand/hall/` |
| 发布代取 | `POST /api/errands` | `pages/errand/publish/` |
| 代取详情 | `GET /api/errands/:id` + `take/complete/cancel/release` | `pages/errand/detail/` |
| 找跑腿 | `GET /api/runners` | `pages/errand/runners/` |
| 我的代取 | `GET /api/errands/mine?role=publisher|runner` | `pages/mine/errands/` |
| 接单设置/上线 | `GET/PUT /api/users/me/runner-profile`、`PUT /api/users/me/online` | `pages/mine/runner/` |
| 消息列表 | `GET /api/conversations`、`GET /api/conversations/unread-count` | `pages/chat/list/` |
| 聊天页 | `POST /api/conversations`、`GET/POST /api/conversations/:id/messages`、`POST /api/conversations/:id/read` | `pages/chat/detail/` |

### 12.4 常用调试片段

```js
// 打印当前登录态（调试后删除）
console.log('token', wx.getStorageSync('cs_token'));
console.log('user', wx.getStorageSync('cs_user'));

// 模拟慢网（开发者工具 → 网络 → 自定义）
// 模拟 401：手动删 token 后进页面
wx.removeStorageSync('cs_token');
```

```bash
# 后端联调用
curl http://127.0.0.1:3000/api/health
curl -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d "{\"studentNo\":\"2023001\",\"password\":\"123456\"}"
```

### 12.5 术语表（前端相关）

| 术语 | 解释 |
| --- | --- |
| rpx | 小程序响应式单位，750rpx = 屏幕宽 |
| 三态 | 加载中 / 空 / 错误，列表页必备 |
| 轮询 | 客户端定时请求拉取新数据 |
| 增量拉取 | 只请求比本地最新 ID 更新的数据（`afterId`） |
| 乐观更新 | 先本地显示再等服务端确认 |
| 幂等 | 同一请求重复执行结果一致（如获取或创建会话） |
| 越权 | 访问不属于自己的数据，应返回 403 |
| Skeuomorphism | 拟物（本项目不用） |
| tabBar | 底部导航栏 |
| 安全区 | `env(safe-area-inset-*)`，全面屏底部留白 |
| PR | Pull Request，合并请求 |
| tag | 版本标记，如 `v1.0-m3` |

### 12.6 最后 10 句话

1. **公共层 11-08 必须定型**，否则 A 的 6 个页面跟着返工。
2. **`app.json` 只有你改**，改完立刻群里通知。
3. **一个页面一个分支**，写完联调通过再开下一个，不要 10 个页面同时开工。
4. **所有页面都要三态**，空态和错误态是老师的加分项，也是你最容易漏的。
5. **按钮显隐只信后端 `canXxx`**，前端不要自己推权限。
6. **聊天只做增量轮询**，不要全量拉，5000 条会卡死。
7. **边开发边截图**，11-18 才开始补图一定来不及。
8. **报告数字要和测试用例一致**，不要凑整，老师会翻。
9. **每天 commit + push**，永远不要 `push --force`。
10. **11-21 冻结，11-26 材料齐套，11-29 三处备份，11-30 按时提交。**
