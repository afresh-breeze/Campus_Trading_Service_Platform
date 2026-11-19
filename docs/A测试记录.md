# A 测试记录（后端 / 数据库 / 二手页面）

> 负责人：A ｜ 最后更新：2026-11-19 ｜ 对应提交：`3752f88`（发布页）、`48a90a8`（我的发布）、`530d37c`（A 记录）；我的收藏与全量审计修订在工作区
>
> 本文件只记录 A 负责的后端、数据库对象和二手 6 页；B 的 UI / 聊天用例见 B 的测试记录。M1 / M2 尚未正式验收，本文不把“待 DevTools 验收”写成通过。

## 1. 环境与数据

| 项 | 值 |
| --- | --- |
| 时间 | 2026-11-18 |
| 系统 | Windows 10.0.26200（x64） |
| Node | v24.18.0 |
| 小程序基础库 | 3.5.5 |
| 后端 | `http://127.0.0.1:3000`（用户前台运行，A 不 kill / 重启；status 过滤验证由用户重启后执行） |
| 数据库 | 本机 MySQL，`mysql` CLI / Navicat 均可操作 |
| 演示账号 | 2023001 / 2023002 / 2023003，密码 `123456` |
| 演示数据 | 约 35 件商品、16 本书目、6 个分类；状态分布会随测试变化 |
| 结果口径 | **PASS** = 实际执行且符合预期；**部分** = 只验证了结构或间接链路；**待验收** = 需要 DevTools / 真机；**未执行** = 尚未跑 |

> 账号密码来自课程演示数据，不是真实用户凭据；不要提交 `server/.env`、上传文件或数据库 dump 到仓库。

## 2. 结果汇总

| 类别 | 项目 | 结果 | 证据 / 说明 |
| --- | --- | --- | --- |
| 数据库 | 14 表、4 视图、5 存储过程、2 函数、5 触发器 | PASS（结构核对） | `database/schema.sql`、`database/objects.sql` 与《数据库 14 张表设计详解》一致；触发器已由用户 root 安装 |
| 数据库 | 收藏计数、商品状态日志、会话冗余字段触发器 | PASS（历史验证） | 2026-11-16 已验证收藏 +1/-1、`item_status_logs`、`last_message/last_time` 正常 |
| 接口契约 | mock 契约测试 | PASS 145/145 | `node scripts/mock-contract-test.js` |
| 代码 | WXML 配平（全项目 26 个 wxml） | PASS 26/26 | `node scripts/smoke/wxml_check.js` |
| 代码 | A 页面 / 后端 JS 语法 | PASS | `node --check` 全部通过 |
| 页面逻辑 | 发布商品页冒烟 | PASS 43/43 | 表单校验、图片上传、书目联想、手动建书、跳转；提交 `3752f88` |
| 页面逻辑 | 我的发布列表 / 生命周期 | PASS | 状态标签保留、列表无状态操作按钮、双 onShow 只发一次请求、旧 loading 复位、`pageScrollTo` 抛错仍能加载、真实接口返回 5 条 |
| 页面逻辑 | 我的收藏列表 / 取消收藏 | PASS | 四状态切换、取消/404/空态/分页/登录定向检查；status 真接口已重启验证 |
| 真实接口 | 健康、鉴权、分类、书目、上传、列表、状态权限 | PASS | 见 §4；另含 4.1 后端审计边界复测，10 项通过（A-10 为代码级守卫） |
| 协作验证 | B 的 chat 鉴权冒烟 | PASS 15/15 | `node scripts/chat-auth-smoke.js` |
| 协作验证 | B 的我的三页冒烟 | PASS 30/30 | `node scripts/smoke/smoke_mine_pages.js`（B 已修复脚本路径） |
| 冒烟合计 | 本地 12 个 smoke 脚本 | PASS 480/0 | 2026-11-19 全量复跑，含 B 的 negative 40 条 |
| 页面验收 | DevTools 视觉 / 真实 UI 发布 | 待验收 | 需用户在本机微信开发者工具执行 |
| 里程碑 | M1 / M2 端到端 | 未执行 | 我的收藏已实现（工作区）；M2 双账号未验收，不能声称通过 |
| 回归 | 29 / 60 条全量用例、性能、并发、安全 | 未执行 | 按手册 11-20 / 11-21 回归阶段执行 |

## 3. 数据库对象用例

| 编号 | 用例 | 操作 / 输入 | 预期 | 实际 | 结果 |
| --- | --- | --- | --- | --- | --- |
| DB-01 | 表结构与约束 | 对照 `schema.sql` / 设计详解检查 14 表 | 表、主外键、CHECK、索引齐全 | 14 表结构一致；商品、收藏、会话等主外键符合设计 | PASS |
| DB-02 | 视图 | 通过接口间接查询 `v_item_list`；会话列表走 `v_conversation_base` | 列表字段、首图、状态正确 | 首页、搜索、我的发布、聊天列表均返回正确 | PASS（间接） |
| DB-03 | 存储过程 | 核对发布、接单、会话等过程结构 | 事务 / 参数 / 权限符合接口 | 结构核对通过；发布/接单/会话接口已实现并调用 | PASS（结构） |
| DB-04 | 函数 | `fn_unread_count` 等 | 未读数返回正确 | `/api/conversations/unread-count` 返回 200；B 的 chat 冒烟 15/15 | PASS（间接） |
| DB-05 | 触发器 | 收藏、商品状态、代取状态、消息冗余字段 | 状态变化写日志，计数与预览同步 | 2026-11-16 已验证收藏计数 +1/-1、商品状态日志、`last_message/last_time` | PASS（历史） |
| DB-06 | 发布事务 | `sp_publish_item` 插入商品 + 多图 | 失败回滚，不留下半条数据 | 结构与调用链核对；真实 UI 发布待 DevTools | 部分 |
| DB-07 | 状态机 | 在售 → 已预订 → 在售；已售出 → 在售 | 合法流转成功，非法流转 409 | 2026-11-18 对 2023003 商品 94 执行 `reserved → on_sale`，已恢复；已售出终态 409 见 API-16 | PASS |
| DB-08 | 数据完整性 | 商品 / 图片 / 收藏 / 会话关联 | 无悬空主记录，图片路径合法 | 列表、详情、会话接口均能取到完整关联；图片地址为 `/uploads/` 或演示路径 | PASS（抽查） |

> 本轮没有重建数据库，也没有安装/修改任何数据库对象；`objects.sql` 的安装由用户以 root 执行。

## 4. 后端接口用例

执行时间：2026-11-18；服务端由用户前台运行。

| 编号 | 接口 / 操作 | 输入 | 预期 | 实际 | 结果 |
| --- | --- | --- | --- | --- | --- |
| API-01 | `GET /api/health` | 无 | `code=0`，`db=ok` | `{"time":"2026-11-18T09:14:00.402Z","db":"ok"}` | PASS |
| API-02 | `POST /api/auth/login` + `GET /api/auth/me` | 2023001 / 123456 | 登录成功，资料完整 | `code=0`；昵称、学号、学院、信用分、状态正常 | PASS |
| API-03 | `GET /api/items` 无 token | 无 | 401 | HTTP 401，`code=401`，`请先登录` | PASS |
| API-04 | 错误密码登录 | 2023001 / wrongpass | 401 | `code=401`，`学号或密码错误` | PASS |
| API-05 | `GET /api/categories` | 已登录 | 返回 6 个分类 | `code=0`，6 个 | PASS |
| API-06 | `GET /api/books/search?keyword=高等数学` | 已登录 | 返回匹配书目 | `code=0`，3 本 | PASS |
| API-07 | `POST /api/books` 重复 ISBN | `9787040396638` | 复用已有书目，不新建 | `code=0`，`created=false`，`bookId=1` | PASS |
| API-08 | `POST /api/upload` 合法图片 | demo png | 200，返回 `/uploads/...` | 成功返回相对路径；测试文件已删除 | PASS |
| API-09 | `POST /api/upload` 非图片 | txt | 400，拒绝 | HTTP 400，`只支持 jpg/png/webp 图片` | PASS |
| API-10 | `GET /api/items` 超大页码 | `page=99999&pageSize=10` | 空列表，不报错 | `code=0`，`total=27`，`list=[]` | PASS |
| API-11 | `GET /api/items/mine` 在售 | 2023001 | 只返回本人在售 | `code=0`，`total=5`，`list=5` | PASS |
| API-12 | `GET /api/items/mine` 已售 | 2023001 | 只返回本人已售 | `code=0`，`total=2` | PASS |
| API-13 | `GET /api/favorites` | 2023001 | 返回本人收藏 | `code=0`，`total=4` | PASS |
| API-14 | `GET /api/errands` | 已登录 | 返回大厅单 | `code=0`，`total=7`（测试时点） | PASS |
| API-15 | `GET /api/users/me/runner-profile` | 已登录 | 返回接单资料 | `code=0` | PASS |
| API-16 | 非卖家改状态 | 2023002 改 2023001 的商品 99 | 403 | `code=403`，`只能操作自己发布的商品` | PASS |
| API-17 | 已售出再上架 | 2023001 的已售商品 88 → `on_sale` | 409 | `code=409`，`当前状态不能变更为目标状态` | PASS |
| API-18 | 非法状态值 | 在售商品 → `foo` | 400 | `code=400`，`商品状态不合法` | PASS |
| API-19 | 商品不存在 | `PUT /api/items/999999/status` | 404 | `code=404`，`商品不存在` | PASS |
| API-20 | 状态变更耗时 | 对 2023003 商品 94 `reserved → on_sale` | 不阻塞，成功恢复 | PUT 27ms、GET 9ms、恢复 18ms；商品已回到在售 | PASS |
| API-21 | `POST /api/items` 真实发布 | DevTools / 页面 | 200 + `itemId` | 未在 A 的自动化中调用；待 DevTools | 待验收 |
| API-22 | 收藏 / 取消收藏 | 2023001 | 计数与列表一致 | 本轮未执行 | 未执行 |
| API-23 | `POST /api/feedback` | 已登录 | 写入反馈 | 本轮未执行 | 未执行 |
| API-24 | 并发接单 / 409 竞态 | 双账号 | 只有一人成功 | 本轮未执行 | 未执行 |
| API-25 | 收藏删除 / 恢复 | 2023001 对商品 94 `DELETE` 后 `POST` 收藏 | 收藏数 4→3→4，数据恢复 | 两次均 `code=0`，商品已恢复收藏 | PASS |
| API-26 | `GET /api/favorites?status=` | 四状态分别查询 | 只返回该状态收藏，total 为该状态数 | all=3，on_sale=3，reserved/sold/off_shelf=0，sum=3；非法 status 400 | PASS |

> API-20 的状态变更属于测试数据操作：测试后已把商品 94 恢复为 `on_sale`；没有新建商品或书目。
> API-13/API-25 记录的是执行时点的收藏数（4）；API-26 是后续时点（3）。演示数据会随取消/重新收藏变化，以实时接口为准。

### 4.1 2026-11-19 后端审计修订复测（用户重启 3000 后）

| 编号 | 用例 | 实际 | 结果 |
| --- | --- | --- | --- |
| A-01 | `GET /api/items?sort=constructor` | 400，`排序方式不合法` | PASS |
| A-02 | `GET /api/errands?status=completed` | 400，`大厅只支持待接单` | PASS |
| A-03 | `GET /api/favorites?status=on_sale&status=sold` | 400，`商品状态不合法` | PASS |
| A-04 | `GET /api/items/99?view=0` ×2 与默认请求交错 | 29 → 30 → 30，后续 `view=0` 不再增加 | PASS |
| A-05 | `POST /api/items` 售价 `0.001` | 400，`售价最多两位小数`；在售总数 5→5，无测试商品 | PASS |
| A-06 | `POST /api/items` 原价 `0.001` | 400，`原价最多两位小数`；无测试商品 | PASS |
| A-07 | `POST /api/upload` 字段名 `image` | 400，`请使用 file 字段上传单张图片` | PASS |
| A-08 | `POST /api/errands` `visibility=false` | 400，`可见性不合法` | PASS |
| A-09 | 非发布者 `PUT /api/errands/:id`（空 body） | 新建私单 20 → 2023002 PUT 返回 403「只有发布者可以修改订单」→ 2023001 取消，状态 cancelled | PASS |
| A-10 | `runnerOnline` 覆盖新 `manual_until` 的并发窗口 | 未来 `manual_until` 跳过更新；空值更新 SQL 带 `manual_until IS NULL OR manual_until <= NOW()` 守卫 | PASS（代码级） |

> A-04 让商品 99 的浏览量 29→30，多计 1 次属于测试副作用；A-05/A-06 未创建商品；A-09 创建了审计私单 20，测试后已由发布者取消（状态 cancelled）。

## 5. 页面与脚本用例

| 编号 | 对象 | 用例 | 结果 | 说明 |
| --- | --- | --- | --- | --- |
| P-01 | 发布商品页 | 普通/书籍模式、图片 0-3 张、选完即传、书目联想/手动建书、校验、提交跳详情 | PASS 43/43（逻辑） | 临时 Node 冒烟；真实 UI 发布待 DevTools |
| P-02 | 我的发布 | 四状态横滑筛选、只读列表、状态标签、分页/刷新、onShow 静默刷新 | PASS（定向） | 卡片状态保留、无 `actions`/操作栏；真实接口 5 条正常 |
| P-03 | 我的发布 | 从详情返回时不重复请求、旧 loading 复位、`pageScrollTo` 抛错仍继续加载 | PASS | 针对“返回后骨架屏不结束”的回归检查 |
| P-04 | 首页 / 详情 / 搜索 | 已实现页面逻辑与接口链路 | 部分 | 代码已推送；最终视觉/交互待 DevTools |
| P-05 | 我的收藏 | 四状态横滑筛选、左上角状态标签、右下角心形取消、404、空态、分页、登录 | PASS（定向） | Node 冒烟 + 真实收藏接口；status 查询重启后已验证；DevTools 视觉待验收 |
| S-01 | mock 契约 | 141+ 条接口契约 | PASS 145/145 | `node scripts/mock-contract-test.js` |
| S-02 | WXML | 全项目 26 个 wxml | PASS 26/26 | `node scripts/smoke/wxml_check.js` |
| S-03 | JS 语法 | A 页面与后端路由 | PASS | `node --check` |
| S-04 | B chat 鉴权 | 无 token / 带 token / 会话列表 | PASS 15/15 | `node scripts/chat-auth-smoke.js` |
| S-05 | B 我的三页 | 加载回填、缓存、FAQ、反馈 | PASS 30/30 | `node scripts/smoke/smoke_mine_pages.js` |
| S-06 | 本地 smoke 合计 | 12 个脚本全量复跑 | PASS 480/0 | chat/detail/hall/runner/publish/item-card/negative 等 |
| S-07 | B 负向测试 | 断网/401/404/500/空表单/越权/连点/定时器/空态 | PASS 40/0 | `node scripts/smoke/smoke_negative.js` |
| S-08 | 列表公共逻辑 | items/favorites 首屏、分页、串行刷新、取消、刷新失败回退 | PASS 13/13 | 临时 Node 冒烟；`pages/mine/list-common.js` |

## 6. 缺陷与修复

| 编号 | 级别 | 现象 / 原因 | 修复 / 结果 | 提交 |
| --- | --- | --- | --- | --- |
| DEF-01 | P1 | 从商品详情返回「我的发布」偶发骨架屏不结束：连续 onShow 可能重复发首屏请求、旧 `loading` 残留、`wx.pageScrollTo` 同步抛错会中断请求 | 双 onShow 只保留一个请求；有数据时先复位 loading；包住 `pageScrollTo`；10 秒看门狗转错误卡；已用生命周期检查和真实后端验证 | `48a90a8` |
| DEF-02 | P1/P2 | B 的个人资料头像取了 `tempFiles[0].path`、`<image>` 直接绑相对路径；B 冒烟脚本硬编码 `E:/Qin`；`--color-surface-2` 未定义 | A 复查报告后由 B 在 `efec4cc` 修复；A 未修改 B 文件 | B `efec4cc` |
| DEF-03 | P3 | B 的 UI 走查 #32 称商品详情图片无兜底，实际已有 `binderror` + 「暂无图片」 | B 已在 `efec4cc` 撤回该误报 | B `efec4cc` |
| DEF-04 | P1 | 我的收藏空态文案写死，切到已售/已预订/已下架空列表仍显示「还没有收藏/去逛逛」 | 改为动态绑定 `emptyTitle/emptyDesc/emptyActionText`；分状态空态和动作恢复正常 | 工作区 |
| DEF-05 | P2 | 详情页每次 onShow 重拉都会给 `view_count` +1，返回/状态刷新造成虚高 | 详情页仅在首次请求计数，后续带 `view=0`；后端只在非 `view=0` 时 +1 | 工作区 |
| DEF-06 | P2 | 全量审计的后端边界：favorites `status` 非字符串静默跳过；`sort` 原型键绕过；errands `visibility` 非字符串默认 hall；大厅 `status=completed` 仍返回；售价 0.001 未拦；上传错误字段 500；runnerOnline 可能覆盖新 manual_until；PUT 私单先校验 body 后查归属 | 已分别加类型/白名单/枚举/两位小数/LIMIT_UNEXPECTED_FILE/条件 UPDATE/先锁行后解析；接口文档升 v0.10；重启后 8 项实测通过，PUT 非发布者/runner 并发未实测 | 工作区 |
| DEF-07 | P3 | 发布页 `bookFocus` 无 focus 复位，「更换」第二次不聚焦；首页「发布页尚未实现」文案过期 | 聚焦时复位 `bookFocus`；文案改为「发布页打开失败」 | 工作区 |
| DEF-08 | P2 | 我的发布/收藏 onShow 并行刷新 N 页；收藏取消后刷新失败可能分页 offset；两页列表加载逻辑重复 | 抽出 `pages/mine/list-common.js`；`refreshLoaded` 串行请求；收藏取消刷新失败回退第 1 页；专项冒烟 13/13 | 工作区 |

当前 A 侧没有已知未修复 P0；我的收藏已实现（工作区），M1 / M2 未验收。

- 本轮全量审计的后端修订（DEF-06）已在用户重启 3000 后复测：A-01~A-09 实测通过；A-10 为代码级守卫测试；A-09 的审计私单 20 已取消。
- P2 列表逻辑已抽到 `pages/mine/list-common.js`，items/favorites 首屏、分页、串行刷新、取消和刷新失败回退专项 13/13。
- B 的 `f499f00` 已拉入并跑通 negative 40/0；A 未修改 B 文件。
- B 的 `utils/mock.js` 尚未同步 v0.10：MOCK 模式下 favorites `status`、详情 `view=0`、价格两位小数、大厅 `status` 与真实后端有偏差（已记 bug清单 B-4，待 B 处理）。

## 7. 数据清理与安全

- 合法上传测试生成的 `/uploads/...` 文件已删除；非图片上传被后端拒绝，未落盘。
- 状态机测试只在商品 94 上做 `reserved → on_sale`，测试后已恢复；没有新建商品、书目或用户。
- 没有修改 `database/` 下 DDL / 对象；没有提交 `server/.env`、上传文件或 dump。
- 服务端 3000 由用户前台运行，A 没有 kill / 重启；本次后端复测与 status 过滤验证由用户重启后执行；`.tmp-sql2er/` 是未跟踪临时目录，不属于交付文件。

## 8. 结论与待办

- A 负责的数据库对象、后端接口契约和已实现二手页面，逻辑 / 接口 / 冒烟检查通过；但这不是 M1 / M2 验收结论。
- 待办：我的收藏 DevTools 视觉/真实 UI 取消；发布页与我的发布的 DevTools 视觉/真实发布验收；M1 二手闭环；M2 双账号端到端；29 / 60 条全量用例与性能/并发/安全回归。
- B 的文档（UI 走查、开发日志、README-导入说明）仍把 `mine/items` 写成占位，待 B 更新；A 不修改 B 文件。

## 9. 复现命令

```bash
# 仓库根目录；服务端需先由用户启动在 3000
node scripts/mock-contract-test.js
node scripts/smoke/wxml_check.js $(find miniprogram -name '*.wxml' -print)
node scripts/chat-auth-smoke.js
node scripts/smoke/smoke_mine_pages.js

# A 页面逻辑冒烟为临时脚本，不入库；关键口径已写入本记录
```

> 本记录中的商品数量、收藏数、订单数是测试时点的演示数据，后续 seed / 状态操作会变化；以接口实时返回为准。
