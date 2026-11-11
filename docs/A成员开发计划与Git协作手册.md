# 成员 A 开发计划与 Git 协作手册

> 适用对象：成员 A
> 项目：校园交易服务平台（Campus Trading Service Platform）
> 周期：2026-11-05 ~ 2026-11-30（26 个自然日）
> 分工口径：已按《课程设计开发计划.md》0.4 分工表与队友 B 确认。
>
> **本文件与《课程设计开发计划.md》冲突时的处理：**
> - 页面、分工、接口、表数量一律以本文件为准；主计划已按本文件同步。
> - 二手页面（含搜索结果页）由 A 做；聊天后端和页面由 B 做；聊天数据库对象由 A 交付。
> - 全书统一为 **20 个页面、14 张表**，不再使用旧的 16 页/13 表口径。

---

## 目录

- 0. 先看这一页
- 1. 开工前：分工、仓库、环境（11-05）
- 2. Git 零基础速通
- 3. 分支与合并总表
- 4. 26 天逐日计划
- 5. 数据库实施手册（40 分核心）
- 6. 二手模块前端手册（A 的 6 个页面）
- 7. Git 异常处理手册
- 8. 和 B 的协作规则
- 9. 报告、PPT、视频（A 的部分）
- 10. 检查清单
- 11. 附录
- 12. UI 设计方向与 AI 美化技能（11-10 新增）

---

## 0. 先看这一页

### 0.1 你的职责边界

**你负责（A）：**

| 类别 | 具体内容 | 交付物 |
| --- | --- | --- |
| 数据库设计 | 14 张表、主外键、CHECK、索引、ENUM、状态机、3NF 说明 | `database/schema.sql`、ER 图、报告第 2/3/4 章素材 |
| 数据库对象 | 4 视图、5 存储过程、2 函数、5 触发器、事务、权限 | `database/objects.sql`、测试 SQL、截图、报告第 6 章 |
| 后端基础设施 | Express 骨架、MySQL 连接池、统一响应、错误处理、鉴权中间件、上传 | `server/src/app.js`、`db.js`、`middleware/`、`utils/` |
| 后端业务 | 认证、用户、二手商品、收藏、代取、跑腿匹配、自动上下线、上传接口 | `server/src/routes/auth.js`、`users.js`、`items.js`、`favorites.js`、`errands.js`、`upload.js`、`jobs/runnerOnline.js` |
| 聊天数据库对象 | 会话/消息表、`sp_get_or_create_conversation`、`fn_unread_count`、`trg_message_after_insert`、`v_conversation_base` | 11-13 前交给 B 使用 |
| 二手前端 | 二手首页、商品详情、发布商品、搜索结果、我的发布、我的收藏 | `miniprogram/pages/index/`、`pages/item/`、`pages/search/`、`pages/mine/items/`、`pages/mine/favorites/` |
| 联调排错 | 二手闭环、代取前后端联调、数据库问题排查 | 测试记录、修复提交 |
| 报告 | 第 1、2、3、5、6、9 章、参考文献；给 B 提供第 4/7/8/10 章素材 | `report/A章节.md` 等 |

**B 负责（不要抢着做，除非 B 明确请你帮忙）：**

- 小程序公共层：`app.json`、`app.wxss`、`app.js`、`config.js`、`utils/request.js`、`components/`、全部 20 个页面注册。
- 登录、注册、个人中心、个人资料、设置、帮助页面。
- 代取大厅、发布代取、代取详情、找跑腿匹配、我的代取页面。
- 接单设置/上线页面（同一页两个入口：个人页进入为设置，代取页带 `?mode=online` 进入为上线/下线）。
- 聊天全栈：`server/src/routes/chat.js` + 消息列表/聊天页。
- 报告第 4、7、8、10 章、封面、摘要、目录；PPT、视频；最终 Word 排版。
- UI 统一、截图整理、演示脚本。

**两个人共同负责：**

- 需求确认、接口文档、测试、集成、答辩演练。
- 每天 21:30 同步进度。

### 0.2 三个最重要的交付

1. **11-07（M0）**：数据库 14 张表 DDL 完成，注册/登录/`/api/auth/me` 跑通，B 能登录。
2. **11-11（M1）**：二手闭环完成——注册 → 发布 → 独立搜索页（书籍卡片 + 同书优先）→ 详情 → 收藏 → 下架，A 的 6 个页面可用。
3. **11-21（M3）**：所有数据库对象齐全，核心功能可用，功能冻结。

这三个节点守住，11-30 就不会慌。任何一个节点失守，立刻按 8.6 砍功能，不要拖。

### 0.3 关键路径

```text
11-06 14 张表 DDL
  → 11-07 登录鉴权
    → 11-08~11 二手 API + 6 个页面（含搜索结果页）
      → 11-12~14 代取 API
        → 11-13 聊天数据库对象交给 B
          → 11-17~18 数据库对象补齐 + 性能测试
            → 11-21 功能冻结
              → 11-22~24 报告
                → 11-26 材料齐套
                  → 11-27~29 彩排
                    → 11-30 提交演示
```

**最危险的拖法**：先把所有功能写完，最后一周才补视图/存储过程/触发器。这样数据库对象没有真实使用场景，报告也写不实。正确做法是**每个对象跟着功能一起做**，做完立刻测试、截图、写进报告素材。

### 0.4 当前进度与今天（11-07）要做的 10 件事

- [x] 1\. 建好 GitHub 仓库并邀请 B 为协作者。
- [x] 2\. 和 B 对齐分工：A 数据库 + 后端主线 + 二手 6 页；B 公共层 + 登录/个人中心 + 代取 + 聊天 + 找跑腿/设置/帮助。
- [x] 3. 建好 `dev` 分支并设为默认分支，确认 `git ls-remote origin` 能连通。
- [x] 4. 和 B 逐条确认 **14 张表**和 **20 个页面**清单，把接口文档 v0.1 发到群里。
- [x] 5\. 确认本机 Node、npm、MySQL、Git、Navicat、VS Code 版本（见 1.6）。
- [x] 6. 用 Navicat 连接 MySQL，创建 `campus_service` 库和 `cs_app` 账号。
- [x] 7. 试跑 `users`、`items` 两张表的 DDL，确认能建、能删、能重跑。
- [x] 8. 写 `schema.sql` 的 14 张表 DDL（11-06 的任务顺延到今天，M0 里程碑不变）。
- [x] 9. 搭 Express 骨架 + `/api/health` + 注册/登录/`/api/auth/me`；B 在 11-07 一次性注册 20 个页面，A 把 6 个页面路径发给 B。
- [x] 10\. 21:30 和 B 开 15 分钟同步会，确认 M0 验收和明天各自的任务。

### 0.5 每天建议节奏

计划按每天 6 小时有效工作安排；有课的日子至少保证 4 小时，周末补到 6~8 小时。**里程碑不能挪，任务可以挪。**

| 时间 | 做什么 | 说明 |
| --- | --- | --- |
| 09:00-09:10 | 拉代码、看 PR、列今天 3 件事 | 先 `git pull`，不要上来就写 |
| 09:10-12:00 | 深度工作：数据库 / 后端 | 关掉聊天软件，先做最难的 |
| 14:00-17:30 | 编码 / 页面 / 联调 | 下午适合做需要频繁试错的事 |
| 19:30-21:00 | 测试、截图、补文档 | 当天做完当天验 |
| 21:00-21:20 | commit、push、开 PR | 不留到明天 |
| 21:30-21:45 | 和 B 同步 | 对进度、对接口、对明天任务 |
| 21:45-22:00 | 更新问题清单、截图归档 | 明天一来就能接着干 |

### 0.6 这份手册怎么用

- **Git 不熟**：先读第 2 章，再读第 3 章；第 4 章每天照着做。
- **写代码时**：第 4 章是日程，第 5 章是数据库细节，第 6 章是二手前端细节。
- **出问题时**：第 7 章是 Git 急救，先看症状再动手。
- **和 B 协作**：第 8 章有文件归属、交接清单、冲突规避。
- **写报告时**：第 9 章有章节分工、截图清单、答辩问题。
- **每天收工**：第 10 章 checklist；附录 11.6 可以打印一页贴在桌上。

---

## 1. 开工前：分工、仓库、环境（11-05）

### 1.1 和 B 对齐的 8 件事

今天必须和 B 确认，最好在群里发一条文字确认，避免后面“我以为你会做”。

1. **分工**：A 做数据库 + 后端主线 + 二手前后端（6 个页面）；B 做小程序公共层 + 登录/注册/个人中心 + 代取页面 + 聊天全栈 + 找跑腿匹配/设置/帮助。
2. **聊天数据库对象归 A**：B 写 `server/src/routes/chat.js` 和聊天页面，但会话/消息表、存储过程、函数、触发器由 A 在 11-13 前交付。B 不要直接改 `schema.sql`。
3. **接口契约**：响应格式、分页格式、鉴权头、字段命名、图片 URL 形式，按 1.4 执行。
4. **文件归属**：按 1.3 的表执行，不改对方的文件；必须改时先打招呼。
5. **Git 模型**：`main` 只放里程碑版本；`dev` 日常集成；每个人按任务建 `feature/*` 分支；PR 合并；里程碑才合并到 `main`。
6. **同步时间**：每天 21:30，15 分钟，按 8.1 的模板说。
7. **演示环境**：微信开发者工具 + 本机后端 + 本机 MySQL；不要求公网部署、域名备案。
8. **页面注册**：全项目 20 个页面，`app.json` 只有 B 能改；A 在 11-07 把 6 个页面路径发给 B，B 一次性注册完，之后 A 不再动 `app.json`。

### 1.2 分工口径（已确认）

| 模块 | A | B |
| --- | --- | --- |
| 数据库 DDL / 对象 / 权限 | 全部 | 只提需求，不改 SQL |
| Express 基础设施 / 鉴权 / 上传 | 全部 | 使用，不改 |
| 认证 / 用户 / 二手 / 收藏 / 代取 API | 全部 | 使用，不改 |
| 聊天 API | 只交付数据库对象 | 全部（`routes/chat.js`） |
| 二手 6 个页面（首页/详情/发布/搜索/我的发布/我的收藏） | 全部 | 不改 |
| 登录/注册/个人中心/我的代取/接单设置/个人资料/设置/帮助 | 不改 | 全部 |
| 代取 5 个页面（大厅/发布/详情/找跑腿/我的代取） | 不改 | 全部 |
| 聊天 2 个页面 | 不改 | 全部 |
| 小程序公共层 / `app.json` / 样式 / 组件 | 使用，不改 | 全部 |
| 报告 | 第 1、2、3、5、6、9 章 + 参考文献 | 第 4、7、8、10 章 + 封面/摘要/目录/排版 |
| PPT / 视频 | 提供数据库素材、讲数据部分 | 制作、录制、剪辑 |
| 测试 | 后端用例、并发、性能、安全 | UI 用例、聊天用例、测试记录整理 |

**两条硬规则：**

1. **`database/` 目录只有 A 能改。** B 需要加字段、加表，先在群里说，A 统一改 `schema.sql` 和 `objects.sql`，B 重新导入。
2. **`miniprogram/app.json` 只有 B 能改。** A 需要加页面，11-07 就把 6 个页面路径发给 B，B 在 11-07 一次性注册完全部 20 个页面；之后 A 不再动 `app.json`。

**全项目 20 个页面（唯一口径，和主计划一致）：**

| # | 模块 | 页面 | 路径 | 优先级 | 负责人 |
| --- | --- | --- | --- | --- | --- |
| 1 | 登录注册 | 登录 | `pages/login/login` | P0 | B |
| 2 | 登录注册 | 注册 | `pages/register/register` | P0 | B |
| 3 | 二手 | 二手首页（右下角圆形加号“我要卖”） | `pages/index/index` | P0 | A |
| 4 | 二手 | 商品详情 | `pages/item/detail` | P0 | A |
| 5 | 二手 | 发布商品 | `pages/item/publish` | P0 | A |
| 6 | 二手 | 搜索结果（书籍卡片 + 同书商品优先） | `pages/search/result` | P0 | A |
| 7 | 二手 | 我的发布 | `pages/mine/items` | P1 | A |
| 8 | 二手 | 我的收藏 | `pages/mine/favorites` | P1 | A |
| 9 | 代取 | 代取大厅（右下角圆形加号“找代取”） | `pages/errand/hall` | P0 | B |
| 10 | 代取 | 发布代取（先选片区再选具体地标，含“先找跑腿”入口） | `pages/errand/publish` | P0 | B |
| 11 | 代取 | 代取详情 | `pages/errand/detail` | P0 | B |
| 12 | 代取 | 找跑腿匹配 | `pages/errand/runners` | P1 | B |
| 13 | 代取 | 我的代取 | `pages/mine/errands` | P0 | B |
| 14 | 代取 | 接单设置/上线（同一页两个入口；服务片区、具体地标可多选；按具体日期或星期循环的在线计划，或现在上线；规格 / 报价 / 备注选填；计划列表可改/删，进行中循环下线要询问范围） | `pages/mine/runner` | P0 | B |
| 15 | 聊天 | 消息列表 | `pages/chat/list` | P0 | B |
| 16 | 聊天 | 聊天页 | `pages/chat/detail` | P0 | B |
| 17 | 个人中心 | 个人中心 | `pages/mine/index` | P0 | B |
| 18 | 个人中心 | 个人资料 | `pages/mine/profile` | P1 | B |
| 19 | 个人中心 | 设置 | `pages/mine/settings` | P1 | B |
| 20 | 个人中心 | 帮助 | `pages/mine/help` | P1 | B |

- 合计：A 6 页、B 14 页；P0 14 页、P1 6 页。
- 底部 tabBar 仍是 4 个：首页、代取、消息、我的；不新增“上线”板块。
- “上线”不是独立页面，而是 `pages/mine/runner?mode=online`；个人页进入同一页时是“接单设置”模式。
- 页面 14 的在线计划：单次日期默认当天、可多选几天；按星期循环选周一至周日；未开始的计划可修改/取消；进行中的单次可直接提前下线；进行中的循环下线时弹窗问“只提前结束这一次 / 取消之后所有循环”；修改进行中的循环时弹窗提醒“只影响下一次，当前这次要结束请用提前下线”。

### 1.3 文件归属表

这张表是减少冲突的核心。**改动别人的文件之前，先在群里说一声。**

| 文件 / 目录 | 负责人 | 说明 |
| --- | --- | --- |
| `database/schema.sql` | A | 建库建表；B 只读 |
| `database/objects.sql` | A | 视图/过程/函数/触发器；B 只读 |
| `database/seed.sql` | A | 分类、书目等静态数据 |
| `database/campus_service_dump.sql` | A | 11-21、11-26 的最终 dump |
| `server/src/app.js` | A | 所有路由挂载由 A 一次写好；B 不碰 |
| `server/src/db.js` | A | 连接池 |
| `server/src/middleware/auth.js` | A | JWT 鉴权 |
| `server/src/utils/response.js` | A | 统一响应 |
| `server/src/utils/campus.js` | A | 片区/地标清单与 `isValidZone`、`isValidPlace`、`zoneOfPlace` 校验 |
| `server/src/routes/auth.js` | A | 注册/登录/me |
| `server/src/routes/users.js` | A | 用户资料、跑腿设置、上下线、跑腿匹配列表 |
| `server/src/jobs/runnerOnline.js` | A | `node-cron` 每分钟按在线计划自动切换跑腿上下线 |
| `server/src/routes/items.js` | A | 二手商品 |
| `server/src/routes/favorites.js` | A | 收藏 |
| `server/src/routes/errands.js` | A | 代取 |
| `server/src/routes/upload.js` | A | 图片上传 |
| `server/src/routes/chat.js` | B | 聊天 API；A 只在 11-07 建占位文件 |
| `server/scripts/seed.js` | A | 演示账号、演示数据 |
| `server/package.json` / `package-lock.json` | A | B 要加依赖先问 A |
| `server/.env.example` | A | B 复制成自己的 `.env` |
| `server/.env` | 各自本地 | **不提交 Git** |
| `server/uploads/` | 各自本地 | 用户上传；**不提交 Git**，只保留 `.gitkeep` |
| `miniprogram/app.json` / `app.wxss` / `app.js` | B | A 只使用，不改 |
| `miniprogram/config.js` / `utils/request.js` | B | A 只调用，不改 |
| `miniprogram/utils/campus.js` | B | 片区与地标常量；A 提供清单内容，B 落地和维护文件 |
| `miniprogram/components/` | B | A 只使用，不改 |
| `miniprogram/pages/login/`、`register/`、`mine/index/`、`mine/errands/`、`mine/runner/`、`mine/profile/`、`mine/settings/`、`mine/help/` | B | A 不改 |
| `miniprogram/pages/errand/`（大厅、发布、详情、找跑腿） | B | A 不改 |
| `miniprogram/pages/chat/` | B | A 不改 |
| `miniprogram/pages/index/` | A | 二手首页 |
| `miniprogram/pages/item/` | A | 商品详情、发布商品 |
| `miniprogram/pages/search/` | A | 搜索结果页（书籍卡片 + 商品推荐） |
| `miniprogram/pages/mine/items/`、`mine/favorites/` | A | 我的发布、我的收藏 |
| `docs/接口文档.md` | 共同 | A 写认证/用户/二手/代取/上传/数据库部分；B 写聊天部分；改前先 pull |
| `docs/AI辅助开发记录-A.md` | A | 各写各的，11-25 由 B 合并进附录 |
| `docs/AI辅助开发记录-B.md` | B | 同上 |
| `docs/测试用例.md` | B 主笔 | A 在 11-20 填后端结果；改前先 pull |
| `docs/A测试记录.md` | A | A 的后端/数据库测试记录，避免和 B 抢同一个文件 |
| `report/报告.docx` | B 唯一编辑 | A 不直接改，避免 Word 二进制冲突 |
| `report/答辩PPT.pptx` | B 唯一编辑 | A 提供素材 |
| `report/系统演示.mp4` | B 录制剪辑 | `report/*.mp4` 不提交 Git |
| `report/A章节.md` | A | A 的报告正文，B 负责粘进 Word 排版 |
| `readme.txt` | A 主笔 | 11-26 完成，B 校对 |

### 1.4 接口契约

11-05 就定死，后面只增不改。所有接口按下面的约定写，A/B 都不要临时改字段名。

**统一响应格式：**

```json
{ "code": 0, "message": "ok", "data": {} }
```

- `code = 0` 成功；非 0 失败。
- HTTP 状态码同时使用：400 参数错误、401 未登录、403 无权限、404 不存在、409 状态冲突、500 服务器错误。
- 分页统一返回：`{ "list": [], "total": 0, "page": 1, "pageSize": 10 }`。
- 鉴权：请求头 `Authorization: Bearer <token>`。
- 时间：数据库 `DATETIME`，接口返回 `YYYY-MM-DD HH:mm:ss` 字符串。
- 金额：数据库 `DECIMAL(10,2)`，接口返回数字。
- 状态/规格枚举：数据库存英文（`on_sale`、`taken`），前端映射中文；片区、地标等名称型字典直接存中文。
- 命名：数据库表/字段 `snake_case`，接口字段 `camelCase`；在 SQL 里用 `AS` 转成 camelCase，减少 JS 映射。
- 图片：接口返回相对路径（如 `/uploads/xxx.jpg`、`/demo/item-1.jpg`），前端用 `BASE_URL + url` 拼接。不要返回 `127.0.0.1` 绝对地址，否则真机演示会挂。
- 聊天图片：复用 `POST /api/upload`（5MB，jpg/png/webp），返回相对路径；发送消息时 `msgType='image'`、`content` 传该路径，**必须先上传成功再发消息**。服务端只接受以 `/uploads/` 开头的 `content`；`conversations.last_message` 由触发器固定写 `[图片]`。
- SQL：全部 `?` 占位符，禁止字符串拼接。
- 密钥：`.env` 不提交，仓库只有 `.env.example`。

**在开发计划第 4 章接口清单基础上，补充/明确这些接口（11-05 写进接口文档）：**

| 方法 | 路径 | 负责 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/categories` | A | 分类列表，首页筛选和发布页都要用 |
| GET | `/api/books/search?keyword=` | A | 书名/ISBN/作者联想；返回 `bookId`、`isbn`、`title`、`author`、`publisher`、`coverUrl` |
| POST | `/api/books` | A | 手动新增书目；ISBN 已存在则返回已有 `bookId` |
| GET | `/api/items?keyword=&bookId=&categoryId=&sort=&page=&pageSize=` | A | `bookId` 用于搜索结果页“同书商品优先” |
| GET | `/api/users/me/runner-profile` | A | 接单设置页回显；返回 `isOnline`、`availabilityType`、`serviceAreas: []`、`servicePlaces: []`、`itemSizes: []`、`timeSlots: []`、`manualUntil`、`remark` |
| GET | `/api/runners?area=&place=&timeType=&timeStart=&deadline=&itemSize=&page=&pageSize=` | A | 找跑腿匹配页；`asap` 只返回在线，`deadline`/`range` 允许“未来计划重叠但当前不在线”的 `slot` 跑腿；按片区 + 具体地标 + 时间重叠筛选，不直接改订单状态 |
| GET | `/api/errands/:id` | A | 返回订单完整字段（含 `deliveryLocation` 送达地点）和 `canTake`、`canComplete`、`canCancel`、`canRelease`，B 的页面据此显示按钮 |
| POST | `/api/errands/:id/cancel` | A | 发布者撤回：`pending → cancelled`；`taken → pending`，清空接单人 |
| POST | `/api/errands/:id/release` | A | 接单者释放：`taken → pending`，清空接单人 |
| POST | `/api/feedback` | A | 帮助页意见反馈；body `{ "content": "..." }` |

**跑腿资料与上线（B 的页面按这个传参）：**

```json
PUT /api/users/me/runner-profile
{
  "serviceAreas": ["桃园", "北区教学区"],
  "servicePlaces": ["第16教学楼", "第25教学楼"],
  "availabilityType": "slot",
  "timeSlots": [
    { "id": "o1", "type": "once", "date": "2026-11-09", "start": "14:00", "end": "18:00" },
    { "id": "o2", "type": "once", "date": "2026-11-10", "start": "14:00", "end": "18:00" },
    { "id": "w1", "type": "weekly", "weekdays": [1, 3, 5], "start": "18:00", "end": "22:00", "from": "2026-11-09" }
  ],
  "itemSizes": ["small", "medium"],
  "basePrice": 5.00,
  "remark": "可代取快递"
}
```

```json
PUT /api/users/me/online
{ "isOnline": true, "availabilityType": "now" }
```

- `availabilityType` 只取 `slot`（按在线计划自动上下线）或 `now`（现在上线，手动保持），不再有 `long_term`。
- `timeSlots` 是在线计划数组，不再用 `HH:mm-HH:mm` 字符串：
  - `once`：`{ id, type:"once", date:"YYYY-MM-DD", start:"HH:mm", end:"HH:mm" }`，只在那一天生效；不选日期时前端传当天，多选几天就生成多条。
  - `weekly`：`{ id, type:"weekly", weekdays:[1..7], start:"HH:mm", end:"HH:mm", from:"YYYY-MM-DD" }`，`1`=周一……`7`=周日，从 `from` 起长期有效，取消即结束。
  - 每条计划有稳定 `id`；同一天内要求 `start < end`，暂不支持跨天；同一时间不允许两条计划重叠。
- `slot` 模式至少要有一条未来计划；`now` 模式可以为空，已保存的计划保留但暂停，切回 `slot` 后恢复。
- `GET` 还要返回 `isOnline`、`manualUntil`，B 用来显示“手动状态将在几点恢复自动”。
- 手动上线/下线：`isOnline`；`slot` 模式下后端把 `manualUntil` 设为“下一个计划边界”和“当天 23:59”中较早者，到期自动计划接管。`now` 模式不设 `manualUntil`（切到 `now` 时清空），保持到用户手动切换。
- 正在进行的循环计划点下线时，前端先弹窗问“只提前结束这一次 / 取消之后所有循环”，再传 `{ isOnline:false, scope:"once"|"future", scheduleId:"w1" }`：
  - `scope:"once"`：`manualUntil` 设到本次结束，循环规则保留；
  - `scope:"future"`：删除这条循环规则并立即下线。
- 正在进行循环计划时修改计划，前端必须弹窗提醒“修改只影响下一次；当前这次要结束请用提前下线”。后端处理：若被修改/删除的 `weekly` 计划当前正处于 occurrence 中，先用旧计划算出本次结束时间，把 `manual_until` 设为该时间，再保存新计划；这样当前这次保持原状态到旧结束时间，下一次按新计划执行。保存资料时清空的是其他旧手动覆盖，不覆盖这条保护值。
- `itemSizes` 是多选数组，取 `small` / `medium` / `large`，存 `runner_item_sizes` 关联表。
- `serviceAreas` 是片区数组，至少选一个，取值来自 25 个固定片区（见 1.4 下方清单）；`availabilityType` 必填；`itemSizes`、`basePrice`、`remark` 选填，保存时保留上次填写值，下次进入直接回显。
- `servicePlaces` 是具体地标数组，可为空：空数组表示“只按片区接单，片区内哪栋楼都接”；非空时每个元素必须是受控地标名，或直接写片区名表示“整个片区”。后端校验每个元素所属的片区必须在 `serviceAreas` 内，避免保存出永远匹配不上的死设置。
- 发布代取时 `pickupArea`、`pickupPlace` 都必填：用户先选片区，再选该片区下的具体地标；只选片区不选地标时，前端把 `pickupPlace` 直接传成片区名。取件详细地址（如“第16教学楼 301 门口”）、交付要求等统一写 `remark`（≤255 字，选填）；发布页备注框用灰色小字提示“填写取件详细地址、交付要求等”，不再单独设详细地址输入框。送达地点 `deliveryLocation` 是自由文本（如“桃园 3 栋 512”），不走片区/地标选择器：只有取件需要两级受控字段参与匹配，送达只用于展示和沟通。

**片区与地标清单（11-08 定稿，11-12 前落地）**

- 三级模型：**分类**（前端分组标题，不落库、不参与匹配）→ **片区**（落库，匹配粗筛）→ **地标**（存受控名称，不建表，匹配细筛）。
- 固定 25 个片区：桃园、李园、橘园、楠园、梅园、竹园、杏园、茶园、北区教学区、南区教学区、中心图书馆、北区图书馆、南区图书馆、第一运动场、第二运动场、第三运动场、第四运动场、第五运动场、北区校医院、南区校医院、一号门外/吾悦广场、二号门外、校外其他、北区其他、南区其他。
- 地标共 52 条（北区教学区 27、南区教学区 20、北区其他/南区其他 5），完整清单见 **11.9**；每条形如 `{ name: "第16教学楼", zone: "北区教学区", aliases: ["16教", "求实楼", "药化大楼", ...] }`，搜索时名称和别名都要能命中。
- 前端：`miniprogram/utils/campus.js`（B 建文件，A 提供清单），导出 `GROUPS`、`ZONES`、`LANDMARKS`；`GROUPS` 只负责选择器分组。
- 后端：`server/src/utils/campus.js`（A 建），导出同一份 `GROUPS`、`ZONES`、`LANDMARKS`、`PLACE_TO_ZONE`、`isValidZone(value)`、`isValidPlace(value)`、`zoneOfPlace(value)`，用于 `PUT /api/users/me/runner-profile` 与 `POST /api/errands` 的白名单校验。
- 数据库：`runner_profiles.service_areas` 存片区数组，`service_places` 存地标数组；`errand_orders.pickup_area` 存片区，`pickup_place` 存地标名（只选片区时等于片区名），`delivery_location` 存自由文本送达地点（不参与匹配），取件详细地址和交付要求写 `remark`。不建地标表。
- 改清单时三处一起改：11.9 的列表、前端 `campus.js`、后端 `campus.js`；地标可以新增，片区值和地标正式名一旦有订单使用就不要再改名（别名可以补）。
- 再次进入 `pages/mine/runner?mode=online` 时显示“下线”，调用 `PUT /api/users/me/online` 传 `{ "isOnline": false }`。

**角色规则（11-12 写进接口文档，B 的页面按这个显示按钮）：**

- 接单：除发布者外的登录用户，订单状态必须是 `pending`；接单成功后变 `taken`，订单从大厅消失，别人不能再接。
- 完成：只有发布者可以确认完成，状态必须是 `taken`。
- 发布者撤回：`pending → cancelled`；`taken → pending`，清空 `runner_id`、`taken_at`，订单回大厅。
- 接单者释放：`taken → pending`，清空 `runner_id`、`taken_at`，订单回大厅。
- `taken` 不能直接变 `cancelled`；发布者必须先退回 `pending`，再取消。
- 不再有单独的“挂起/恢复”状态和接口；`taken` 本身就是锁单。
- 商品状态：只有卖家可以改；`on_sale → reserved / sold / off_shelf`，`reserved → on_sale / sold`，`off_shelf → on_sale`；`sold` 是终态。预订只改状态，不记录预订人。

**聊天页面参数（A 的详情页跳 B 的聊天页，必须一致）：**

```text
/pages/chat/detail?peerId=<对方userId>&bizType=item&bizId=<商品id>
/pages/chat/detail?peerId=<对方userId>&bizType=errand&bizId=<订单id>
```

B 的聊天页用这三个参数调 `POST /api/conversations`，body 为 `{ peerId, bizType, bizId }`；拿到 `conversationId` 后再调 `GET /api/conversations/:id/context` 渲染顶部业务卡片。

**聊天页顶部业务卡片（A/B 必须一致）：**

- 卡片固定在消息列表上方，不随消息滚动；只展示和导航，不放状态按钮，聊天页仍只负责沟通。
- 商品会话：封面、标题、价格、状态；点击跳 `/pages/item/detail?id=<bizId>`。
- 代取会话：规格、取片区 / 地标、报酬、状态；点击跳 `/pages/errand/detail?id=<bizId>`。
- `GET /api/conversations/:id/context` 只允许会话参与者调用，返回 `{ bizType, bizId, bizSummary }`；`bizSummary` 为 `null` 时显示“商品已下架 / 订单不存在”，不可跳转，但不影响聊天。
- `bizSummary` 字段：item 会话返回 `title`、`price`、`status`、`coverUrl`；errand 会话返回 `itemSize`、`pickupArea`、`pickupPlace`、`reward`、`status`。
- `onShow` 重新拉一次 context：卖家在商品详情页改状态、发布者 / 接单者在代取详情页改状态后返回，卡片立即显示新状态。
- 卡片加载失败只影响卡片，不阻塞消息收发；`biz_id` 没有外键，后端查不到业务行时返回 `bizSummary: null`，不要 404。
- B 手册 6.14 的聊天页初始化流程需要加 context 请求，由 B 同步；A 不改 B 的文件。

**页面跳转参数（A/B 必须一致，11-07 写进接口文档）：**

```text
/pages/search/result?keyword=高数
/pages/errand/runners?area=北区教学区&place=第16教学楼&timeType=deadline&deadline=2026-11-20 18:00:00&itemSize=small
/pages/mine/runner?mode=online
```

- A 的首页搜索框跳 `pages/search/result`；结果页用 `keyword` 请求书目和商品。
- B 的发布代取页“先找跑腿”跳 `pages/errand/runners`；参数只用于预填筛选条件，用户可以修改。
- B 的代取页“上线/下线”跳 `pages/mine/runner?mode=online`；个人页“接单设置”跳 `pages/mine/runner`（不带参数）。

**接口变更流程：**

1. 先在群里说“我要改哪个接口、为什么、影响谁”。
2. 改 `docs/接口文档.md` 对应段落。
3. B 确认后，A 改后端，B 改页面。
4. 不允许“代码先改了再说”。

### 1.5 GitHub 仓库当前状态（已完成）

以下事情**已经做完**，不需要再操作一遍：

- 仓库已建：`https://github.com/afresh-breeze/Campus_Trading_Service_Platform`。
- B 已被邀请为 collaborator，并能看到仓库。
- `dev` 分支已创建，并已设为默认分支。
- 本机能连通 GitHub；如果换网络后报 `Failed to connect to github.com port 443` 或超时，按 7.1 处理。

**现在只需要确认一次：**

```bash
git remote -v
git branch -a
git ls-remote origin
```

- `git remote -v` 应显示 `origin` 指向上面的仓库地址。
- `git branch -a` 应能看到 `main`、`dev`、`remotes/origin/dev`。
- `git ls-remote origin` 能列出 `refs/heads/main`、`refs/heads/dev`，说明网络和权限正常。

**B 的本地准备（B 自己做，A 只需确认）：**

```bash
cd D:\Code
git clone https://github.com/afresh-breeze/Campus_Trading_Service_Platform.git
cd Campus_Trading_Service_Platform
git branch
git switch dev
```

如果默认分支是 `dev`，clone 下来就在 `dev`；再执行一次 `git switch dev` 也不会有问题。

B 还需要在本机装 Node、MySQL、微信开发者工具、Navicat，并按 1.6、1.7 建库。两个人的数据库是**各自本地各一份**，不是共享一个远程数据库。

**日常只用这三条：**

```bash
git switch dev
git pull origin dev
git switch -c feature/xxx
```

任务做完后按第 2、3 章的 PR 流程合并回 `dev`。仓库设置本身不用再动。

**可选：分支保护。**

如果仓库是公开的，可以在 `Settings` → `Branches` 给 `main` 加保护规则，要求 PR 才能合并。私有仓库如果提示需要升级套餐，直接跳过，靠两个人的约定即可，不影响课程设计。

### 1.6 本机环境检查

当前机器已经检测到的版本：

| 工具 | 版本 | 结论 |
| --- | --- | --- |
| Node.js | v24.18.0 | 可用；Express/mysql2/bcryptjs/node-cron 都能跑 |
| npm | 11.6.2 | 可用 |
| MySQL | 8.0.44 | 可用，支持 CHECK、JSON_TABLE、窗口函数 |
| Git | 2.53.0.windows.2 | 可用，支持 `git switch` / `git restore` |
| Git 用户 | afresh-breeze / 1526977473@qq.com | 已配置 |
| `core.autocrlf` | true | Windows 推荐值，不用改 |
| Navicat | 已安装 | 建库、执行 SQL、看表、截图 |
| VS Code | 已安装 | 写代码；可选装 MySQL/Thunder Client 插件 |

**图形化工具（当前使用）：**

- **Navicat**：已安装，用它建库、执行 `schema.sql` / `objects.sql`、看表结构、跑查询、截图。本书所有原来写 “Workbench” 的地方都按 Navicat 操作。
- **VS Code**：已安装，用来写代码；建议装 `MySQL` 插件（可选，日常以 Navicat 为主）和 `Thunder Client`（接口调试，替代 Postman 也可以）。
- 不要求安装 MySQL Workbench；报告截图用 Navicat，效果一样，老师不会指定工具。

**Navicat 连接步骤：**

1. 打开 Navicat → `连接` → `MySQL`。
2. 连接名填 `campus_service_local`，主机 `127.0.0.1`，端口 `3306`，用户名 `root`，填 root 密码。
3. 测试连接 → 确定。
4. 双击连接，在左侧看到数据库列表；后续建库、执行 SQL、看表都在这里。

**启动 MySQL：**

```bash
# 需要管理员权限的终端；如果服务名不是 MySQL80，去“服务”里看实际名称
net start MySQL80

mysql -u root -p
```

**Node 版本说明：**

- Node 24 跑 Express 没问题；`bcryptjs` 是纯 JS，不需要编译原生模块。
- 如果 `npm install` 遇到 `node-gyp` 或原生模块报错，再考虑用 nvm-windows 装 Node 20 LTS。**不要一上来就降版本**，先试 24。

### 1.7 第一次数据库连接与建库

在 Navicat 里：双击 `campus_service_local` 连接 → 右键 → `新建数据库` → 数据库名 `campus_service`、字符集 `utf8mb4`、排序规则 `utf8mb4_0900_ai_ci` → 确定。再右键 `campus_service` → `新建查询`，粘贴下面的 SQL 执行。

```sql
-- 用 root 登录后执行
CREATE DATABASE IF NOT EXISTS campus_service
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- 应用账号：先给业务 CRUD + 执行存储过程的权限
-- 密码自己定，不要用 123456，也不要提交到 Git
CREATE USER 'cs_app'@'localhost' IDENTIFIED BY '换成你的强密码';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON campus_service.* TO 'cs_app'@'localhost';
FLUSH PRIVILEGES;
```

`cs_readonly` 只读账号 11-19 再做，避免现在就把权限演示做完、后面忘记。

**试跑两张表：**

```sql
USE campus_service;

CREATE TABLE users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_no VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  campus VARCHAR(50) NULL,
  college VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  credit_score INT NOT NULL DEFAULT 60,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE items (
  item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  seller_id BIGINT NOT NULL,
  category_id INT NULL,
  book_id BIGINT NULL,
  item_type ENUM('normal','book') NOT NULL DEFAULT 'normal',
  title VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  condition_level ENUM('new','like_new','good','fair') NOT NULL DEFAULT 'good',
  negotiable TINYINT(1) NOT NULL DEFAULT 0,
  campus VARCHAR(50) NULL,
  location VARCHAR(100) NULL,
  status ENUM('on_sale','reserved','sold','off_shelf') NOT NULL DEFAULT 'on_sale',
  view_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_seller FOREIGN KEY (seller_id) REFERENCES users(user_id),
  CONSTRAINT chk_items_price CHECK (price >= 0),
  CONSTRAINT chk_items_favorite_count CHECK (favorite_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

测试完可以保留，也可以 `DROP TABLE items, users;`，11-06 再由 `schema.sql` 正式建。**试跑的目的**是确认 MySQL 能连、字符集对、CHECK 生效。

**校区口径**：`users.campus`、`items.campus` 是可空预留字段。MVP 只在西南大学北碚校区试点，注册和发布都不采集校区，也不按校区筛选或展示；南区/北区只用于代取时定位取件片区和地标，不是两个独立校区。

**如果忘了 root 密码**：先问老师/助教，或者用 MySQL 官方的 `--skip-grant-tables` 重置流程；不要直接重装 MySQL，容易把数据目录弄丢。

---

## 2. Git 零基础速通

这一章只讲你每天会用到的内容，不追求系统完整。先把这一章照着走一遍，后面就顺了。

### 2.1 六个概念

用一个类比：

| 概念 | 通俗理解 | 你要记住的 |
| --- | --- | --- |
| 远程仓库 `origin` | GitHub 上的共享文件夹 | 两个人最终同步的地方 |
| 本地仓库 | 你电脑上的副本 | 你的代码先存在这里 |
| 分支 `branch` | 平行世界 / 草稿本 | 每个人在各自的分支上改，不互相打扰 |
| 提交 `commit` | 存档点 | 每完成一小块就存一次 |
| 推送 `push` | 把本地存档上传到 GitHub | 每天至少一次 |
| 拉取 `pull` | 把 GitHub 上的新内容下载并合并到本地 | 每天开工第一件事 |
| 合并 `merge` | 把两个分支的内容合到一起 | 通过 PR 或 `git merge` |
| 冲突 `conflict` | 两个人改了同一行，Git 不知道该用谁 | 手动选最终内容，不是报错 |

**工作区、暂存区、提交区**（只需要知道）：

```text
你改的文件（工作区）
   │ git add
   ▼
暂存区（准备提交的内容）
   │ git commit
   ▼
本地仓库（一个存档点）
   │ git push
   ▼
GitHub 远程仓库
```

`git status` 会告诉你现在处于哪一步。

### 2.2 分支模型

本项目用最简单的三人协作模型（实际只有两个人）：

```text
main    ──●────────────────●────────────────●────────────────●────────●
            \              /                /                /        /
             \            /                /                /        /
dev           ●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●──●
               \    /      \    /      \    /
             feature     feature      feature
             /item-list  /item-publish /errand-take ...
```

- **`main`**：只放“能演示”的版本。只在里程碑（M0、M1、M2、M3、M4、最终）从 `dev` 合并进来。**永远不在 `main` 上写代码。**
- **`dev`**：日常集成分支。每个人当天完成的功能合并到这里。`dev` 也要保持能启动。
- **`feature/xxx`**：你自己的任务分支。从最新的 `dev` 切出来，做完合并回 `dev`，然后删掉。**一个分支只归一个人**，B 不改你的 `feature` 分支。
- **`fix/xxx`**：修 bug 用，流程和 `feature` 一样，只是名字不同。
- **`docs/xxx`**：写报告/文档用。

**为什么不能直接在 `main` 上改？**

- 两个人同时改 `main`，一 push 就冲突。
- `main` 是答辩用的稳定版，改坏了没有退路。
- 老师看 Git 记录时，能看到清晰的分支和 PR，说明你们真的在协作。

### 2.3 一次性配置

你的用户名和邮箱已经配置好了：

```bash
git config --global user.name
git config --global user.email
```

确认输出是 `afresh-breeze` 和你的邮箱即可。补两条新手常用配置：

```bash
# pull 时使用 merge，不熟悉 rebase 就不要用 rebase
git config --global pull.rebase false

# Windows 换行符自动转换（你已经设置过 true，确认一下）
git config --global core.autocrlf true
```

**认证方式：**

- 第一次 `git push` 时，Git Credential Manager 会弹浏览器，让你登录 GitHub；登录一次后会自动记住。
- 如果提示输入用户名/密码，GitHub 已经不接受账户密码，需要用 Personal Access Token（PAT）代替密码；或者改用浏览器登录。
- **不要把 token、密码写进代码或 `.env.example`。**

**检查远程仓库：**

```bash
git remote -v
```

应该看到：

```text
origin  https://github.com/afresh-breeze/Campus_Trading_Service_Platform (fetch)
origin  https://github.com/afresh-breeze/Campus_Trading_Service_Platform (push)
```

### 2.4 每天的标准循环

把下面 7 步背下来，每天重复。

**第 1 步：看状态**

```bash
git status
```

- 如果显示 `nothing to commit, working tree clean`，很好。
- 如果有未提交的修改，先提交或 `git stash`（见 7.6），**不要带着一堆未提交改动去切分支**。

**第 2 步：切到 dev 并拉最新**

```bash
git switch dev
git pull origin dev
```

如果你还在昨天的 feature 分支上，先提交完再切。

**第 3 步：从最新 dev 建任务分支**

```bash
git switch -c feature/item-list
```

分支名用英文小写 + 连字符，不要用中文。命名规则：

- `feature/<模块>-<任务>`：`feature/item-list`、`feature/item-publish`、`feature/errand-take`
- `fix/<问题>`：`fix/take-race`、`fix/item-cover`
- `docs/<主题>`：`docs/report-a`、`docs/api-contract`
- `test/<主题>`：`test/regression`
- `chore/<杂项>`：`chore/release-package`

**第 4 步：写代码，小步提交**

每完成一个能说清楚的小块，就提交一次：

```bash
git status
git diff
git add server/src/routes/items.js server/src/app.js
git commit -m "feat(item): 商品列表接口支持分页和筛选"
```

- `git add .` 可以用，但**必须先看 `git status`**，确认没有 `.env`、`node_modules`、`uploads`、大文件。
- 一次提交只做一件事。不要 `git add .` 之后写“update”。
- 一天至少 commit 一次；建议 30~60 分钟一次。

**第 5 步：推送分支**

```bash
# 第一次推送这个分支
git push -u origin feature/item-list

# 之后同一个分支再推送
git push
```

看到 `branch 'feature/item-list' set up to track 'origin/feature/item-list'` 就成功了。

**第 6 步：在 GitHub 开 PR（Pull Request）**

1. 打开仓库页面，通常会出现黄色的 `Compare & pull request` 按钮；没有就点 `Pull requests` → `New pull request`。
2. `base` 选 **`dev`**，`compare` 选你的 `feature/item-list`。
3. 标题：`feat(item): 商品列表接口与二手首页`
4. 描述按 2.8 的模板写：做了什么、怎么验证、截图、需要 B 注意什么。
5. 点 `Create pull request`。
6. 在群里 @B：“PR #xx 麻烦看一下，5 分钟就行。”
7. B 在 `Files changed` 里看代码、留评论；你根据评论改，改完 `git add` + `git commit` + `git push`，PR 会自动更新。
8. B 点 `Review changes` → `Approve`；然后你（或 B）点 `Merge pull request` → `Confirm merge`。
9. 点 `Delete branch` 删除 GitHub 上的远程分支。

**第 7 步：合完后同步 dev、删本地分支**

```bash
git switch dev
git pull origin dev
git branch -d feature/item-list
git fetch --prune
```

- `git branch -d` 只能删已经合并的分支；如果提示 “not fully merged”，说明你的分支还没合进去，**不要用 `-D` 强删**，先检查 PR 是否真的合并了。
- `git fetch --prune` 清理 GitHub 上已删除分支的本地记录。

### 2.5 当前下一步：从 dev 切第一个任务分支

仓库初始化、邀请 B、创建 `dev` 并设为默认分支**已经完成**，不用重复。现在照着下面做一遍，熟悉“切分支 → 提交 → 推送 → 开 PR”的循环。

```bash
# 1. 确认工作区干净，并切到最新的 dev
git status
git switch dev
git pull origin dev

# 2. 从 dev 切出数据库任务分支
git switch -c feature/db-schema

# 3. 确认当前分支
git branch
# 应看到 * feature/db-schema

# 4. 开始写 database/schema.sql（先写 users、items 两张表也可以）
#    写完后查看改动
git status
git diff --stat

# 5. 只添加这次要提交的文件
git add database/schema.sql

# 6. 提交
git commit -m "feat(db): 新增 14 张表 DDL 与索引"

# 7. 第一次推送这个分支
git push -u origin feature/db-schema
```

推送成功后，去 GitHub 开 PR：`base` 选 `dev`，`compare` 选 `feature/db-schema`，按 2.8 的模板写描述，@B 审查。B 合并后，你本地执行：

```bash
git switch dev
git pull origin dev
git branch -d feature/db-schema
git fetch --prune
```

**注意：**

- 不要直接在 `dev` 上写代码；所有任务都从最新 `dev` 切 `feature/*`。
- 第一次 PR 可以只提交 `schema.sql`，不要顺手改 `app.json`、B 的页面或 `package.json`。
- 如果 `git push` 报网络错误，先按 7.1 处理；本地 commit 不会丢。

### 2.6 命令速查表

| 目的 | 命令 | 备注 |
| --- | --- | --- |
| 看状态 | `git status` | 最常用，先看再操作 |
| 看当前分支 | `git branch` | 带 `*` 的是当前分支 |
| 看所有分支（含远程） | `git branch -a` | 远程分支显示为 `remotes/origin/xxx` |
| 切分支 | `git switch dev` | 旧写法 `git checkout dev` 也行 |
| 新建并切分支 | `git switch -c feature/xxx` | 从当前分支切，所以先切到最新 dev |
| 拉取 | `git pull origin dev` | 先提交本地改动再拉 |
| 推送（首次） | `git push -u origin <分支>` | 建立跟踪关系 |
| 推送（之后） | `git push` | 当前分支已跟踪远程 |
| 查看改动 | `git diff` | 未暂存的改动 |
| 查看已暂存改动 | `git diff --staged` | `git add` 之后 |
| 暂存文件 | `git add <文件>` | 推荐按文件加 |
| 提交 | `git commit -m "feat(xxx): ..."` | 消息要能看懂 |
| 看历史 | `git log --oneline --graph --all -20` | 看分支合并关系 |
| 看远程 | `git remote -v` | 确认 origin 地址 |
| 合并 dev 到当前分支 | `git merge dev` | 当前分支是 feature 时用 |
| 放弃工作区修改 | `git restore <文件>` | **会丢失未提交修改** |
| 取消暂存 | `git restore --staged <文件>` | 文件内容还在 |
| 暂存工作 | `git stash push -m "wip: xxx"` | 见 7.6 |
| 查看 stash | `git stash list` |  |
| 恢复 stash | `git stash pop` |  |
| 打标签 | `git tag -a v1.0-m3 -m "..."` | 里程碑用 |
| 推标签 | `git push origin v1.0-m3` |  |
| 清理已删除远程分支 | `git fetch --prune` |  |

### 2.7 commit message 规范

格式：

```text
<type>(<scope>): <中文描述>
```

常用 type：

| type | 用途 | 例子 |
| --- | --- | --- |
| `feat` | 新功能 | `feat(item): 商品列表接口支持分页和筛选` |
| `fix` | 修 bug | `fix(errand): 修复并发接单重复写入` |
| `docs` | 文档 | `docs(report): 完成第 6 章数据库实施` |
| `test` | 测试 | `test: 增加 29 条核心用例记录` |
| `refactor` | 重构，不改功能 | `refactor(item): 抽取价格校验函数` |
| `chore` | 杂项、配置 | `chore: 添加 .gitignore` |

**好例子：**

- `feat(db): 新增 14 张表 DDL 与索引`
- `feat(auth): 注册登录接口与 JWT 鉴权中间件`
- `feat(item): 发布商品存储过程与上传接口`
- `fix(item): 修复收藏数在取消收藏后变成负数`
- `docs(api): 补充代取接口角色权限说明`
- `chore: 忽略 .env 与 node_modules`

**坏例子（不要用）：**

- `update`
- `111`
- `asdf`
- `改了一下`
- `最终版`
- `再改最后一次`

commit 历史会出现在报告和答辩里（第 18 个问题“两个人怎么分工”可以用 Git 记录证明），写清楚对你们有好处。

### 2.8 PR 模板与审查

**PR 描述模板（复制到 GitHub）：**

```markdown
## 做了什么
- 新增 GET /api/categories、GET /api/books/search
- 商品列表支持 keyword/categoryId/sort/page
- 新增二手首页列表、下拉刷新、上拉加载

## 怎么验证
- [ ] npm run dev 启动成功
- [ ] Postman 调用 GET /api/items?page=1&pageSize=10 返回 code=0
- [ ] 开发者工具首页能看到 seed 商品
- [ ] 搜索“数据结构”能返回书籍商品

## 截图
（贴 1~3 张关键截图）

## 需要 B 注意
- 列表接口返回的 coverUrl 是相对路径，页面要用 BASE_URL 拼接
- 页面路径已提前在 app.json 注册，B 不用改
```

**审查清单（B 看 A 的 PR，或 A 看 B 的 PR）：**

- [ ] 只改了本分支应该改的文件，没有动别人的文件。
- [ ] 没有 `.env`、`node_modules`、`uploads`、视频等不该提交的内容。
- [ ] 本地能启动，接口返回符合 `docs/接口文档.md`。
- [ ] 关键路径有测试，异常路径至少测了一条。
- [ ] 没有把调试代码、`console.log` 密码/token、临时 TODO 提交上去。
- [ ] 涉及 `database/` 的改动，A 必须看；涉及 `app.json` 的改动，B 必须看。

**PR 大小：**

- 一个 PR 最好不超过 400 行、10 个文件；超过就拆。
- 一个 PR 不要挂超过 2 天；每天收工前合并当天的功能，减少冲突。
- 半成品不要开 PR；如果只是想让 B 看看，用 Draft PR（GitHub 创建 PR 时选 `Create draft pull request`）。

### 2.9 什么时候建分支、什么时候合并（规则）

**建分支的时机：**

1. 开始一个新任务之前（新接口、新页面、新数据库对象）。
2. 修一个 bug 之前（`fix/xxx`）。
3. 写报告的一个章节之前（`docs/report-a`）。
4. 每次建分支前，必须先 `git switch dev && git pull origin dev`，从最新 `dev` 切。

**合并到 `dev` 的时机：**

1. 当天的功能做完、本地测试通过、接口文档更新后。
2. 最晚第二天早上；不要攒 3 天以上。
3. 合并前确认 `dev` 没有你要覆盖的别人的新代码（先 pull）。
4. 只合并**能跑通**的增量；写一半的功能留在 feature 分支，不合并。

**合并到 `main` 的时机：**

1. 只在里程碑：11-07、11-11、11-16、11-21、11-26、11-29。
2. 必须通过 PR，从 `dev` 合到 `main`，不能直接把 feature 合到 `main`。
3. 合并后打 tag，例如 `v0.1-m0`。
4. 合并前确认 `dev` 能启动、能演示；不能把坏版本合进 `main`。

**不要做的事：**

- 不要直接在 `main` 或 `dev` 上写代码（11-05 初始化除外）。
- 不要把 feature 分支直接合到 `main`。
- 不要长期保留一个分支超过 3 天。
- 不要重复使用已经合并过的分支；下次从 `dev` 重新切。
- 不要 `git push --force`。
- 不要在 `dev` 坏掉的时候合并到 `main`。

---

## 3. 分支与合并总表

这张表是全局视图，具体每天做什么见第 4 章。**如果觉得分支太多，可以把同一天的两个小任务合成一个分支，但不要跨 3 天不合并。**

| 日期 | 分支 | 内容 | 合并到 | 里程碑 / tag |
| --- | --- | --- | --- | --- |
| 11-05 | —（已完成） | 仓库初始化、邀请 B、创建 `dev` 并设为默认分支 | — | — |
| 11-06 | `feature/db-schema` | 14 张表 DDL、索引、CHECK | `dev` | — |
| 11-06~07 | `feature/server-base` | Express 骨架、health、连接池、鉴权、seed | `dev` | — |
| 11-06~07 | `docs/api-contract` | 接口文档 v0.1 | `dev` | — |
| 11-07 | `release/m0`（PR：`dev` → `main`） | M0 登录打通 | `main` | `v0.1-m0` |
| 11-08 | `feature/item-list` | 分类/书目/列表 API + 首页 | `dev` | — |
| 11-09 | `feature/item-publish` | 上传、发布 API、`sp_publish_item`、发布页 | `dev` | — |
| 11-10 | `feature/item-detail` | 详情、收藏 API、收藏触发器、详情页 | `dev` | — |
| 11-11 | `feature/item-mine` | 我的发布/收藏、状态修改、搜索结果页、两个页面 | `dev` | — |
| 11-11 | `release/m1`（PR：`dev` → `main`） | M1 二手闭环 | `main` | `v0.2-m1` |
| 11-12 | `feature/errand-core` | 跑腿资料（可接规格多选、在线计划 JSON、自动上下线）、发布、大厅、跑腿匹配 API | `dev` | — |
| 11-13 | `feature/errand-take` | 接单事务、状态日志、我的代取 | `dev` | — |
| 11-12~13 | `feature/chat-db-objects` | 聊天数据库对象，交付 B | `dev` | 给 B 发交接消息 |
| 11-14 | `feature/errand-status` | 完成/撤回/释放/取消、信用分 | `dev` | — |
| 11-15 | `fix/errand-integration` | 代取前后端联调修复 | `dev` | — |
| 11-15 | `feature/db-objects-batch1` | `v_user_summary`、函数、游标 | `dev` | — |
| 11-16 | `fix/m2-integration` | M2 联调修复 | `dev` | — |
| 11-16 | `release/m2`（PR：`dev` → `main`） | M2 代取 + 聊天闭环 | `main` | `v0.3-m2` |
| 11-17 | `feature/db-objects` | 全部视图/过程/函数清点补齐 | `dev` | — |
| 11-18 | `feature/triggers-perf` | 触发器、性能、批量数据 | `dev` | — |
| 11-19 | `feature/security` | 安全加固、权限、负向测试 | `dev` | — |
| 11-20 | `test/regression` | 回归、Postman 集合、测试记录 | `dev` | — |
| 11-21 | `release/m3`（PR：`dev` → `main`） | 功能冻结 | `main` | `v1.0-m3` |
| 11-22~24 | `docs/report-a` | A 的报告章节 | `dev` | — |
| 11-25 | `docs/final-report`（B 主导） | 合稿、排版 | `dev` | A 只 review |
| 11-26 | `chore/release-package` | readme、打包、最终 dump | `dev` | — |
| 11-26 | `release/m4`（PR：`dev` → `main`） | 材料齐套 | `main` | `v1.0-m4` |
| 11-27~29 | `fix/rehearsal`（按需） | 彩排发现的问题 | `dev` → `main` | `v1.0-final`（11-29） |
| 11-30 | — | 提交与现场演示 | — | — |

**里程碑合并的固定动作（每次照做）：**

```bash
# 1. 确认 dev 是最新的、能启动
git switch dev
git pull origin dev
# 本地跑一遍 npm run dev 和关键接口

# 2. 在 GitHub 开 PR：base=main，compare=dev
#    标题：release: v0.1 M0 环境与登录打通
#    合并方式：Create a merge commit

# 3. 合并后，本地同步 main 并打 tag
git switch main
git pull origin main
git tag -a v0.1-m0 -m "M0: 环境与登录打通"
git push origin v0.1-m0

# 4. 把 main 合回 dev，保持两边一致
git switch dev
git merge main
git push origin dev
```

第 4 步会多出一个 `Merge branch 'main' into dev` 的提交，这是正常的。它保证 `dev` 包含 `main` 上的合并记录，下次从 `dev` 切分支不会有历史分叉的困惑。

---

## 4. 26 天逐日计划

> 每天默认按 6 小时有效工作安排。有课就压缩到 4 小时，周末补。**里程碑不能挪，任务可以挪。**
> 每天结束前问自己：代码 commit 了吗？push 了吗？PR 开了吗？截图存了吗？接口文档更新了吗？

### 阶段 0：立项、环境、登录（11-05 ~ 11-07）

> **进度提示（11-07）**：Git 仓库、协作者、`dev` 默认分支已经完成。11-05 的仓库步骤可以直接跳过；如果 11-06 的 DDL 还没写完，把 `schema.sql` 并到 11-07 完成，**M0 的验收标准不变**。

#### 11-05（四）已完成：立项、仓库、环境

**已完成**

- [x] 建 GitHub 仓库并邀请 B 为协作者。
- [x] 和 B 对齐分工、接口契约、文件归属。
- [x] 创建 `dev` 分支并设为默认分支，本机能连通 GitHub。
- [x] 确定使用 Navicat 管理数据库、VS Code 写代码。

**如果环境还没验证，今天补做**

1. **和 B 对齐**：按 1.1 逐条确认。重点确认聊天数据库对象归 A、二手 6 个页面归 A、聊天后端归 B、全项目 20 个页面。
2. **检查环境**：按 1.6 确认 Node、npm、MySQL、Git、Navicat、VS Code 版本。
3. **建库**：按 1.7 用 Navicat 建 `campus_service`、建 `cs_app`、试跑 `users`/`items` 两张表。
4. **表清单**：按 3.2 确认 14 张表字段、类型、约束、外键、索引。重点确认：
   - `users.student_no` 唯一，`VARCHAR(20)`。
   - `items.price`、`errand_orders.reward`、`runner_profiles.base_price` 都用 `DECIMAL(10,2)`。
   - `favorites` 用复合主键 `(user_id, item_id)` 防重复。
   - `runner_item_sizes` 用复合主键 `(user_id, item_size)` 支持多选。
   - `runner_profiles.service_areas` 至少一个片区，`service_places` 默认空数组（表示只按片区接单）。
   - `runner_profiles.availability_type` 只能是 `slot/now`；`time_slots` 存 `once`/`weekly` 在线计划；`manual_until` 存手动覆盖截止时间；`slot` 至少一条未来计划。
   - `errand_orders` 的 `pickup_area`（片区）、`pickup_place`（地标名）、`delivery_location`（自由文本送达地点）、`remark`（取件详细地址与交付要求等备注）四列不要混。
   - `conversations.biz_id` 用 `BIGINT NOT NULL DEFAULT 0`，否则唯一键对 NULL 不生效。
   - `messages` 有 `(conversation_id, message_id)` 索引，支撑增量拉取。
   - `item_status_logs`、`errand_status_logs` 的 `changed_by` 允许 NULL，避免触发器拿不到用户时外键报错。
5. **接口文档 v0.1**：在 `docs/接口文档.md` 写入 1.4 的响应格式、分页、鉴权、命名约定，以及第 4 章的接口清单和新增接口。B 负责的聊天部分留标题，B 来补。
6. **21:30-21:45 同步**：按 8.1 模板，确认 B 能拉代码、能打开小程序项目、明天任务。

**Git（只需确认，不要重建仓库/分支）**

```bash
git remote -v
git branch -a
git ls-remote origin
git switch dev
git pull origin dev
```

**验收**

- [ ] B 能 clone、能 push 一个测试提交（B 可以只改自己的文档）。
- [ ] GitHub 上能看到 `main` 和 `dev`，默认分支是 `dev`。
- [ ] `.gitignore` 已提交，后续 `.env`/`node_modules` 不会出现在 `git status`。
- [ ] MySQL 能登录，`campus_service` 库存在，`cs_app` 能连接。
- [ ] `users`、`items` 两张表能建。
- [ ] 14 张表清单和 B 确认，没有“B 的页面需要但表里没有”的字段。
- [ ] 20 个页面清单和 B 确认，A 的 6 个页面路径已发给 B。
- [ ] `docs/接口文档.md` v0.1 在群里。

**注意**

- 仓库和 `dev` 已经建好，**不要重复执行建仓/建分支命令**。
- 从今天开始，所有代码都走 feature 分支，不再直接提交 `main`。
- 如果 GitHub 连不上，先按 7.1 修网络；本地可以先 commit，网络恢复再 push。

#### 11-06（五）DDL v1 + Express 骨架

**今天必须完成**

- `database/schema.sql`：14 张表、主键、外键、唯一键、索引、CHECK，从零执行成功。
- Express 骨架：`app.js`、`db.js`、`/api/health`、统一响应、错误处理、路由占位文件。
- 小程序能请求 `/api/health`（B 配合）。
- 接口文档 v0.1 完成并合并。

> 如果 11-06 没完成，把“写 schema.sql”并到 11-07 上午；Express 骨架可以 11-07 下午做，M0 当天验收。

**怎么做**

1. **09:00-12:00 写 `schema.sql`**：
   - 文件开头建库、`USE campus_service`。
   - 用 `SET FOREIGN_KEY_CHECKS = 0;` + 逆序 `DROP TABLE IF EXISTS ...;` + `SET FOREIGN_KEY_CHECKS = 1;`，保证可以重复执行。**注意：这会清空数据**，开发期可以用；有演示数据后先 dump 再跑。
   - 建表顺序：`users` → `books` → `categories` → `items` → `item_images` → `favorites` → `runner_profiles` → `runner_item_sizes` → `errand_orders` → `conversations` → `messages` → `item_status_logs` → `errand_status_logs` → `feedback`。
   - `books` 增加 `cover_url VARCHAR(255) NULL`；`runner_profiles` 增加 `availability_type ENUM('slot','now')`、`service_areas JSON`、`service_places JSON`、`time_slots JSON`、`manual_until DATETIME NULL`、`base_price`、`remark`；可接规格存 `runner_item_sizes`。
   - `time_slots` 存在线计划数组：`once` 为 `{id,type,date,start,end}`，`weekly` 为 `{id,type,weekdays,start,end,from}`；`slot` 模式至少一条未来计划，`now` 模式可为空但保留原计划；同一时间不允许重叠，暂不支持跨天。
   - `service_areas` 存多选片区 JSON（至少一个）；`service_places` 存多选地标 JSON（可为空数组，表示只按片区接单）；`errand_orders` 增加 `pickup_area`（片区）、`pickup_place`（地标名，只选片区时等于片区名）、`delivery_location`（自由文本送达地点，不参与匹配）、`remark`（订单备注，取件详细地址与交付要求写这里）。地标放前后端常量清单，存受控名称但不建第 15 张表；匹配用两级 `JSON_CONTAINS`。
   - 所有表 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`。
   - 索引命名 `idx_表_字段`、`uk_表_字段`，报告里好写。
   - CHECK：价格/报酬 ≥ 0、`favorite_count >= 0`、`completed_count >= 0`。
   - ENUM 值见《课程设计开发计划.md》3.5；状态/规格枚举存英文，片区、地标等名称型字典直接存中文。
   - 外键动作：`items.seller_id` → `users` 用 `RESTRICT`；`item_images`、`favorites` 对 `items` 用 `CASCADE`；`runner_item_sizes` 对 `runner_profiles` 用 `CASCADE`；`messages` 对 `conversations` 用 `CASCADE`；日志表对应用 `CASCADE` 或 `RESTRICT`，报告里说明选择。
   - 建完在 Navicat 里执行，刷新左侧表列表，应看到 14 张表。
2. **14:00-17:00 搭 Express**：

   ```bash
   cd server
   npm init -y
   npm i express mysql2 dotenv bcryptjs jsonwebtoken multer cors node-cron
   npm i -D nodemon
   ```

   `package.json` 的 scripts：

   ```json
   {
     "scripts": {
       "dev": "nodemon src/app.js",
       "start": "node src/app.js",
       "seed": "node scripts/seed.js"
     }
   }
   ```

   - `server/.env.example` 按计划 6.1；复制成 `.env`，填自己的密码。
   - `src/db.js` 按计划 6.2；注意 `charset: 'utf8mb4'`、`timezone: '+08:00'`、`dateStrings: true`、`decimalNumbers: true`。
   - `src/utils/response.js`：

     ```js
     function ok(res, data = null, message = 'ok') {
       return res.json({ code: 0, message, data });
     }

     function fail(res, status, message) {
       return res.status(status).json({ code: status, message, data: null });
     }

     module.exports = { ok, fail };
     ```

   - `src/app.js` 挂载：`express.json()`、`cors()`、`/uploads` 静态目录、`/api/health`、所有路由占位文件、404、错误处理。
   - 建 `src/routes/` 下 7 个占位文件：`auth.js`、`users.js`、`items.js`、`favorites.js`、`errands.js`、`chat.js`、`upload.js`。每个先导出空 `express.Router()`。**`chat.js` 以后归 B 填，但占位文件由 A 建，这样 `app.js` 不用再改。**
   - `app.js` 一次把所有路由挂好，例如：

     ```js
     app.use('/api/auth', require('./routes/auth'));
     app.use('/api/users', require('./routes/users'));
     app.use('/api/items', require('./routes/items'));
     app.use('/api/favorites', require('./routes/favorites'));
     app.use('/api/errands', require('./routes/errands'));
     app.use('/api/conversations', require('./routes/chat'));
     app.use('/api/upload', require('./routes/upload'));
     ```

     B 的聊天接口路径是 `/api/conversations`，所以 `chat.js` 挂在 `/api/conversations`。B 不要再改 `app.js`。
   - 建 `server/uploads/.gitkeep`。
   - 跑 `npm run dev`，浏览器/`curl` 访问 `http://127.0.0.1:3000/api/health`，应返回 `{ "code": 0, ... }`。
3. **19:30-21:00 接口文档**：把 1.4 的补充接口、角色规则写完整；给 B 发一条消息：“health 已通，你可以在开发者工具里试 request”。
4. **21:00-21:20 Git**：合并 `feature/db-schema`；`feature/server-base` 可以今天先 push、明天再合并；`docs/api-contract` 合并。
5. **21:30 同步**：确认 B 的 `request.js` 能请求 health；如果 B 还没写，A 可以用浏览器/Postman 先验。

**Git**

```bash
# 早上
git switch dev
git pull origin dev
git switch -c feature/db-schema
# 写 schema.sql，执行成功
git add database/schema.sql
git commit -m "feat(db): 新增 14 张表 DDL、索引与约束"
git push -u origin feature/db-schema
# 开 PR → dev，B 看过合并
git switch dev
git pull origin dev
git branch -d feature/db-schema

# 下午
git switch -c feature/server-base
# 写 server 骨架
git add server/package.json server/package-lock.json server/.env.example server/src server/uploads/.gitkeep
git commit -m "feat(server): 搭建 Express 骨架、连接池与健康检查"
git push -u origin feature/server-base
# 开 PR（可以明天合并）

# 晚上
git switch dev
git pull origin dev
git switch -c docs/api-contract
git add docs/接口文档.md
git commit -m "docs(api): 接口契约 v0.1"
git push -u origin docs/api-contract
# 开 PR → dev

# 收工前若 server-base 还没合并，先留在远程；第二天合并
```

**验收**

- [ ] 在 Navicat 里执行 `database/schema.sql` 从零成功，刷新表列表看到 14 张。
- [ ] `npm run dev` 启动无报错，`/api/health` 返回 `code: 0`。
- [ ] B 的小程序能请求到 health（开发者工具勾选“不校验合法域名”）。
- [ ] `docs/接口文档.md` v0.1 合并。
- [ ] `git status` 干净，没有 `.env`。

**注意**

- `.env` 从今天开始就忽略；确认 `git status` 看不到它。
- `app.js` 一次挂好所有路由，后面不再让 B 改，减少冲突。
- 建表顺序错了会报 `ER_NO_REFERENCED_ROW`，按 5.2 的顺序排查。

#### 11-07（六）注册/登录 + seed + M0

**今天必须完成**

- `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`。
- `bcryptjs` 哈希、JWT 签发/校验、鉴权中间件、统一错误处理。
- `server/scripts/seed.js`：3 个演示账号、分类、书目、演示商品；`npm run seed` 成功。
- 14 张表 DDL 在 Navicat 里执行成功；A 把 6 个页面路径发给 B，B 一次性注册 20 个页面。
- M0：两个账号能登录，带 token 请求 `/api/auth/me`；合并 `dev` → `main`，打 tag。

**怎么做**

1. **09:00-12:00 认证接口**：
   - 注册：校验学号（6~20 位）、密码（≥6 位）、昵称；先查学号是否存在；`bcrypt.hash(password, 10)`；插入；返回 token + userInfo（注册后自动登录）。不采集校区，`campus` 留 `NULL`。
   - 登录：按学号查用户；`bcrypt.compare`；失败统一返回“学号或密码错误”（不要提示“用户不存在”，避免被枚举）；成功 `jwt.sign({ userId, studentNo }, process.env.JWT_SECRET, { expiresIn: '7d' })`。
   - `GET /api/auth/me`：走鉴权中间件，返回当前用户（不要返回 `password_hash`）。
   - 鉴权中间件按计划 6.4；注意 `Authorization` 大小写和 `Bearer ` 前缀。
   - 错误处理：参数缺失 400、重复学号 409、密码错误 401、服务器错误 500；不要把 SQL 报错原样返回给前端。
2. **14:00-17:00 seed 脚本**：
   - 用 `bcrypt.hashSync('123456', 10)` 生成 3 个账号的哈希：`2023001`（买家）、`2023002`（卖家/跑腿）、`2023003`（第三用户）。
   - 插入分类：图书教材、数码电子、生活用品、服饰鞋包、运动户外、其他。
   - 插入书目：高等数学、数据结构、计算机网络、大学英语等 5~8 本，含 ISBN、作者、出版社。
   - 插入 8~10 个商品：普通商品 + 书籍商品，价格、成色、卖家不同；每个商品 1~3 张图片。
   - **演示图片方案**：在 `server/assets/demo/` 放 4~6 张演示图片（可用手机拍的书/物品照片，或网上找的可商用图片），`app.js` 加 `app.use('/demo', express.static(path.join(__dirname, '../assets/demo')))`，seed 里图片 URL 写 `/demo/item-1.jpg`。`server/uploads/` 仍然只放用户上传，Git 忽略。
   - `npm run seed` 成功后，用 `SELECT` 检查用户、商品、图片数量。
3. **19:30-21:00 验证 + M0**：
   - 用 Postman/Thunder Client：健康检查 → 注册 → 登录 → me → 错误密码 → 无 token。
   - 和 B 一起验证：B 的登录页能调通；如果 B 的页面还没好，用 Postman 截图也算 M0 的技术验证，但最好让 B 的页面也通。
   - 合并 `feature/server-base` 和 `docs/api-contract`；然后按 3 的固定动作合并 `dev` → `main`，打 `v0.1-m0`。

**Git**

```bash
# 继续昨天的 server-base
git switch feature/server-base
git add server/src/routes/auth.js server/src/middleware/auth.js server/src/app.js server/scripts/seed.js
git commit -m "feat(auth): 注册登录、JWT 鉴权与演示数据"
git push

# 开 PR → dev；B review 后合并
git switch dev
git pull origin dev
git branch -d feature/server-base

# M0：开 PR dev → main，合并后
git switch main
git pull origin main
git tag -a v0.1-m0 -m "M0: 环境与登录打通"
git push origin v0.1-m0

# 同步回 dev
git switch dev
git merge main
git push origin dev
```

**验收**

- [ ] `2023001 / 123456`、`2023002 / 123456`、`2023003 / 123456` 能登录。
- [ ] 登录返回 token；带 token 请求 `/api/auth/me` 返回用户信息。
- [ ] 密码错误返回 401；不带 token 返回 401；重复学号注册返回 409。
- [ ] 数据库里 `password_hash` 是 `$2a$`/`$2b$` 开头的哈希，不是明文。
- [ ] `npm run seed` 可重复执行（先清空或 `INSERT IGNORE`），不报唯一键错误。
- [ ] GitHub 上有 `v0.1-m0` tag。

**注意**

- seed 脚本不要写死数据库密码，用 `.env`。
- 演示账号密码写进 `readme.txt`，但不要写进代码注释。
- 如果 B 的登录页还没好，不要等；A 先用 Postman 把 M0 技术验证做完，B 的页面在 11-08 补。

---

### 阶段 1：二手交易闭环（11-08 ~ 11-11）

> 这 4 天你既要写后端，又要写 6 个页面（首页、详情、发布、搜索、我的发布、我的收藏）。**接口先行、页面先用假数据**，不要等后端全写完再做页面。
> B 会在 11-08 前交付 `utils/request.js`、`components/item-card`、`empty-state`、`app.json` 页面注册。如果 B 延迟，A 先用页面内简单卡片，11-11 前替换。

#### 11-08（日）商品列表 + 二手首页

**今天必须完成**

- `GET /api/categories`、`GET /api/books/search`、`GET /api/items`（分页、筛选、排序）。
- `v_item_list` 视图。
- 二手首页：列表、搜索、分类、排序、下拉刷新、上拉加载、空/加载/错误状态。
- 接口文档补充这 3 个接口。

**怎么做**

1. **09:00-12:00 后端**：
   - `GET /api/categories`：`SELECT category_id AS categoryId, name, sort_no AS sortNo FROM categories ORDER BY sort_no`。
   - `GET /api/books/search?keyword=`：`WHERE title LIKE ? OR isbn LIKE ? OR author LIKE ?`，`LIMIT 10`；返回 `bookId/isbn/title/author/publisher/coverUrl/edition/priceRef`。
   - `GET /api/items`：参数 `keyword/bookId/categoryId/minPrice/maxPrice/sort/page/pageSize`。
     - `bookId` 用于搜索结果页“同书商品优先”；传了 `bookId` 就只查该书商品。
     - 动态 WHERE 用条件数组 + 参数数组，禁止拼接用户输入。
     - `sort` 白名单：`latest` → `created_at DESC`；`price_asc` → `price ASC`；`price_desc` → `price DESC`。
     - `page` 默认 1，`pageSize` 默认 10、最大 50。
     - 列表用 `v_item_list`，`WHERE status='on_sale'`；`total` 用单独 `COUNT(*)`。
     - 返回 `{ list, total, page, pageSize }`。
   - `v_item_list` 放 `database/objects.sql`：商品 + 卖家 + 分类 + 书目 + 首图。首图用子查询 `ORDER BY sort_no LIMIT 1`。字段用 `AS` 转 camelCase。
   - 测试：`GET /api/items?page=1&pageSize=5`；搜索“数据结构”；分类筛选；价格区间；排序。
2. **14:00-18:00 前端首页**：
   - 页面 `pages/index/index`。数据：

     ```js
     data: {
       list: [],
       page: 1,
       pageSize: 10,
       total: 0,
       hasMore: true,
       keyword: '',
       categoryId: null,
       sort: 'latest',
       categories: [],
       loading: false,
       error: false
     }
     ```

   - `onLoad`：加载分类 + 第一页。
   - `onPullDownRefresh`：`page=1`、清空列表、重新加载，完成后 `wx.stopPullDownRefresh()`。
   - `onReachBottom`：`hasMore && !loading` 时加载下一页。
   - 搜索：`bindconfirm` 或 `bindinput` + 防抖 300ms；搜索时重置页码。
   - 分类横向滚动 tab；排序下拉（最新/价格升/价格降）。
   - 卡片：封面、标题、价格、成色、卖家昵称、收藏数。优先用 B 的 `item-card`；没有就先用页面内简单 WXML。
   - 空状态：没有数据时显示“暂无商品，换个关键词试试”；错误状态显示“加载失败，点击重试”。
   - 图片 URL：`{{BASE_URL + item.coverUrl}}`；`coverUrl` 为空时显示本地占位图。
3. **19:30-21:00 联调 + 文档**：和 B 对一下 `request.js` 的用法；把 3 个接口写进 `docs/接口文档.md`；截图首页。
4. **21:30 同步**：确认 B 的组件/页面注册已合并；明天发布页要用的 `POST /api/books` 接口。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/item-list
# 后端 + 前端
git add database/objects.sql server/src/routes/items.js server/src/routes/users.js docs/接口文档.md
git commit -m "feat(item): 分类、书目搜索与商品列表接口"
git add miniprogram/pages/index/
git commit -m "feat(item): 二手首页列表、筛选与分页"
git push -u origin feature/item-list
# PR → dev
```

**验收**

- [ ] 首页显示 seed 商品；下拉刷新、上拉加载正常。
- [ ] 搜索“数据结构”能搜到书籍商品；搜索不存在的词返回空列表、不报错。
- [ ] 分类筛选、价格区间、排序生效。
- [ ] 空/加载/错误状态都能看到（可以临时断后端测试错误状态）。
- [ ] `v_item_list` 查询结果和手工 JOIN 一致。

**注意**

- 列表 SQL 不要 `SELECT *` 后再在 JS 里过滤；筛选和分页在数据库做。
- 分页 `LIMIT ? OFFSET ?` 的占位符参数必须是数字；先 `Number()` 转换。
- 首页是 B 做 UI 走查的重点，颜色/字号用 B 的全局样式，不要自己发明一套。

#### 11-09（一）发布商品 + 图片上传 + 存储过程

**今天必须完成**

- `POST /api/upload`（multer，鉴权，5MB，jpg/png/webp）。
- `POST /api/books`（手动新增书目，ISBN 已存在返回已有）。
- `POST /api/items` 调 `sp_publish_item`，事务插入商品 + 多图。
- 发布页：普通/书籍两种模式、图片上传、表单校验。
- 接口文档补充上传/发布/书目新增。

**怎么做**

1. **09:00-12:00 上传 + 书目**：
   - `upload.js` 按计划 6.6；`destination` 指向 `server/uploads`；文件名用 `Date.now()-随机数.ext`；`fileFilter` 只允许 jpeg/png/webp；`limits.fileSize = 5MB`。
   - 上传接口必须走鉴权中间件；返回 `{ url: '/uploads/xxx.ext' }`。
   - `POST /api/books`：先按 ISBN 查；有则返回已有 `bookId`；无则插入。没有 ISBN 的手动书目允许 ISBN 为空，但 `books.isbn` 是 UNIQUE，多个 NULL 可以共存（MySQL 唯一索引允许多个 NULL），报告里可以提一句。
   - 测试：上传 jpg 成功；上传 txt 失败；上传 6MB 图片失败。
2. **14:00-17:00 发布接口 + 存储过程**：
   - 在 `database/objects.sql` 写 `sp_publish_item`，按计划 6.7；先 `DROP PROCEDURE IF EXISTS`，再 `DELIMITER $$` 创建，最后 `DELIMITER ;`。
   - 入参：`p_seller_id, p_category_id, p_book_id, p_item_type, p_title, p_description, p_price, p_condition_level, p_images JSON, OUT p_item_id`。
   - 事务内插 `items`，`LAST_INSERT_ID()` 拿 `item_id`，用 `JSON_TABLE` 插 `item_images`；`EXIT HANDLER FOR SQLEXCEPTION` 回滚并 `RESIGNAL`。
   - **在 Navicat 查询窗口先用假数据测通**：`CALL sp_publish_item(..., '[{"url":"/demo/item-1.jpg","sortNo":1}]', @id); SELECT @id;`。
   - Node 调用**必须用同一个连接**拿 `@item_id`（否则 `@item_id` 是会话变量，可能落到另一个连接上）：

     ```js
     const conn = await pool.getConnection();
     try {
       await conn.query(
         'CALL sp_publish_item(?, ?, ?, ?, ?, ?, ?, ?, ?, @item_id)',
         [sellerId, categoryId, bookId, itemType, title, description, price, conditionLevel, JSON.stringify(images)]
       );
       const [[{ item_id }]] = await conn.query('SELECT @item_id AS item_id');
       return item_id;
     } finally {
       conn.release();
     }
     ```

   - 校验：标题必填、价格 > 0、分类必填、图片数组最多 3 张；`book` 模式必须有 `bookId`。
   - 返回 `{ itemId }` 或完整详情。
3. **18:00-21:00 发布页**：
   - `pages/item/publish`：顶部“普通商品 / 书籍”切换。
   - 公共字段：标题、描述、价格、原价、成色 picker、是否可议价 switch、分类 picker、位置、图片（最多 3 张）。
   - 书籍模式：书名/ISBN 搜索 → 选中书目后自动带出作者/出版社；没有匹配时显示“手动填写书籍信息”表单，提交前调 `POST /api/books` 拿 `bookId`。
   - 图片：`wx.chooseMedia({ count: 3 - images.length, mediaType: ['image'] })`；逐张 `wx.uploadFile`；用 `BASE_URL` 和 token；成功后把 `url` 收进表单；支持删除。
   - 提交：校验 → `wx.showLoading` → `POST /api/items` → 成功 toast → 跳转详情或“我的发布”；失败 toast 具体原因。
   - 防重复提交：`submitting` 标志位。
4. **21:00-21:20 Git**：合并；截图发布页（普通 + 书籍模式）。
5. **21:30 同步**：和 B 确认发布页用到的组件字段与接口一致。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/item-publish
git add server/src/routes/upload.js server/src/routes/items.js server/src/app.js
git commit -m "feat(item): 图片上传与分类书目接口"
git add database/objects.sql server/src/routes/items.js
git commit -m "feat(item): 发布商品存储过程与事务"
git add miniprogram/pages/item/publish/
git commit -m "feat(item): 商品发布页普通/书籍模式"
git push -u origin feature/item-publish
# PR → dev
```

**验收**

- [ ] 发布普通商品成功，列表能看到，图片能显示。
- [ ] 发布书籍商品成功，`items.book_id` 有值，关联书目正确。
- [ ] `items` 和 `item_images` 行数对应，事务中途失败不会留下半条数据。
- [ ] 非图片/超大文件上传被拒绝。
- [ ] 发布页表单校验、防重复提交、成功跳转正常。

**注意**

- 存储过程先在数据库里测，再接 Node；不要在接口里调一个没测过的 SP。
- `pool.query` 两次可能用两个连接，`@item_id` 会丢；必须 `getConnection`。
- 上传目录要存在；`uploads/.gitkeep` 保留，但上传文件不进 Git。

#### 11-10（二）商品详情 + 收藏 + 触发器

**今天必须完成**

- `GET /api/items/:id`：商品、卖家、图片、是否已收藏、`isOwner`、浏览量 +1。
- `POST/DELETE /api/items/:id/favorite`；收藏/取消收藏触发器。
- 详情页：轮播、价格、卖家卡片、收藏按钮、联系卖家入口；卖家本人可见状态管理。
- 接口文档补充详情/收藏/卖家管理。

**怎么做**

1. **09:00-12:00 详情 + 收藏 API**：
   - 详情：先查商品（用 `v_item_list` 或 JOIN），再查图片列表；卖家信息含昵称、头像、信用分；`isFavorited` 用当前用户查 `favorites`；`isOwner` 由 `item.seller_id === req.user.userId` 计算；`UPDATE items SET view_count = view_count + 1`（可选，但报告有素材）。
   - 收藏：`INSERT IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)`；`affectedRows=1` 说明新收藏，触发器加 1；重复收藏返回成功但不加。
   - 取消：`DELETE FROM favorites WHERE user_id=? AND item_id=?`；触发器减 1，用 `GREATEST(favorite_count - 1, 0)` 防负数。
   - 触发器放 `database/objects.sql`，先 `DROP TRIGGER IF EXISTS`。
   - 测试：两个账号收藏同一商品 → 计数 2；重复收藏 → 仍 2；取消一个 → 1；取消未收藏 → 不变、不报错。
2. **14:00-18:00 详情页**：
   - `pages/item/detail`：`onLoad(options.id)` 加载详情；`swiper` 图片轮播；价格/原价；成色/分类标签；描述；卖家卡片；收藏按钮（显示收藏数）；“联系卖家”按钮。
   - 收藏：点击 → 调 API → 重新拉详情或本地更新计数；失败 toast。
   - 联系卖家：`wx.navigateTo({ url: '/pages/chat/detail?peerId=' + sellerId + '&bizType=item&bizId=' + itemId })`；B 的聊天页还没好时，先 toast“聊天功能开发中”，不要报错。
   - 状态：`on_sale` 显示“在售”，`reserved/off_shelf/sold` 显示对应标签；已预订/已下架/已售出商品详情仍可看，收藏/联系是否禁用按产品决定，MVP 可以都显示。
   - 卖家管理：`isOwner` 为真时隐藏收藏/联系卖家，按当前状态显示标记预订、取消预订、标记售出、下架、重新上架；复用 `PUT /api/items/:id/status`，成功后重新拉详情。
   - 图片预览：`wx.previewImage`。
3. **19:30-21:00 测试 + 截图**：收藏前后 `favorite_count` 截图；详情页截图；接口文档。
4. **21:30 同步**：和 B 确认聊天页参数；B 的聊天页可能 11-15 才好，先留 toast。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/item-detail
git add server/src/routes/items.js server/src/routes/favorites.js database/objects.sql
git commit -m "feat(item): 商品详情、收藏接口与收藏计数触发器"
git add miniprogram/pages/item/detail/
git commit -m "feat(item): 商品详情页与收藏交互"
git push -u origin feature/item-detail
# PR → dev
```

**验收**

- [ ] 详情页图片轮播、卖家信息、价格、描述正确。
- [ ] 收藏/取消收藏计数正确；重复收藏不重复加。
- [ ] 两个账号看到同一商品的收藏数一致。
- [ ] 非登录状态请求 401（前端自动跳登录）。
- [ ] `item_status_logs` 还没做没关系，11-11 做。

**注意**

- 触发器里更新 `favorite_count` 时，`favorites` 的插入/删除必须在同一事务里；单条语句自动提交也没问题。
- 不要在前端手动 `+1/-1` 后再以本地为准；以接口返回或重新查询为准，避免和触发器打架。

#### 11-11（三）我的发布/收藏 + 商品状态 + M1

**今天必须完成**

- `GET /api/items/mine`、`GET /api/favorites`。
- `PUT /api/items/:id/status`：卖家权限、状态机、`trg_item_status_log`。
- 我的发布、我的收藏、搜索结果三个页面。
- 二手闭环全流程通过，M1；合并 `dev` → `main`，打 `v0.2-m1`。
- 晚上画 ER 图初稿（全局 + 局部），为报告第 3 章做准备。

**怎么做**

1. **09:00-12:00 我的发布/收藏 + 状态 API**：
   - `GET /api/items/mine?status=&page=&pageSize=`：`WHERE seller_id = ?`，可按状态筛选；返回所有状态。
   - `GET /api/favorites?page=&pageSize=`：`favorites JOIN v_item_list`，按收藏时间倒序。
   - `PUT /api/items/:id/status`：body `{ status }`；只允许 `on_sale → reserved/sold/off_shelf`、`reserved → on_sale/sold`、`off_shelf → on_sale`；先查商品卖家，非卖家 403；非法跳转 409。预订只改状态，不记录预订人，也不写预订时间。
   - `trg_item_status_log`：`AFTER UPDATE ON items`，`IF OLD.status <> NEW.status` 插入日志；`changed_by` 用 `@current_user_id`（见 5.5）。**路由里必须在同一连接上先 `SET @current_user_id = ?`，再 UPDATE**，否则日志里的操作人是 NULL。
   - 测试：卖家下架/重新上架/标记预订/取消预订/标记售出；非卖家改 → 403；已售出再上架/再预订 → 409；日志表有记录。
2. **14:00-18:00 三个页面**：
   - `pages/mine/items`：顶部 tab “在售/已预订/已售/已下架”；列表；操作按钮（在售：标记预订、下架、标记售出；已预订：取消预订、标记售出；已下架：重新上架；已售：无）；`wx.showModal` 确认；操作后刷新。
   - `pages/mine/favorites`：列表；取消收藏（`wx.showModal` 确认）；点击进详情；空状态。
   - `pages/search/result`：独立搜索结果页。顶部搜索框；先请求 `GET /api/books/search?keyword=`，有匹配书籍时显示书籍卡片（封面、书名、出版社、作者、ISBN）；下方请求 `GET /api/items` 显示商品；同书商品优先（先 `GET /api/items?bookId=`，再请求普通关键词结果并去重）；点击书籍卡片按 `bookId` 过滤；空状态显示“没有找到相关书籍/商品”。
   - 三个页面都支持下拉刷新、加载更多；复用 B 的 `item-card` 或简化卡片。
3. **18:00-19:30 全流程联调**：
   - 用 2023001 登录 → 首页搜索“数据结构” → 搜索结果页书籍卡片 → 点击卡片过滤同书商品 → 详情 → 收藏 → 我的收藏；
   - 用 2023002 登录 → 发布 → 我的发布 → 标记预订 → 取消预订 → 下架 → 重新上架 → 标记售出；
   - 2023001 的收藏列表里，已售出/已预订/下架商品如何显示？按产品决定：显示但置灰，或过滤。MVP 建议显示并带状态标签。
   - 按《课程设计开发计划.md》7.1 的 29 条用例挑二手相关先跑一遍。
4. **19:30-21:00 ER 图**：
   - 用 sql2er（Chen 记法）画全局 ER 图和 3 张局部 ER 图（用户/商品/收藏、跑腿/代取、会话/反馈）；导出 PNG 到 `report/assets/ch3/`，命名 `fig3-1_local-er-user-item.png`、`fig3-2_local-er-runner-errand.png`、`fig3-3_local-er-chat-feedback.png`、`fig3-4_global-er.png`。
   - 画的时候对照实际 `schema.sql`，不要凭记忆；报告里要能解释每个联系（1:1、1:N、M:N）。
5. **21:00-21:20 Git + M1**：
   - 合并 `feature/item-mine`；
   - 按 3 的固定动作合并 `dev` → `main`，打 `v0.2-m1`；
   - `git switch dev; git merge main; git push`。
6. **21:30 同步**：M1 验收；B 的代取页面进度；明天开始代取后端。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/item-mine
git add server/src/routes/items.js server/src/routes/favorites.js database/objects.sql
git commit -m "feat(item): 我的发布、我的收藏与商品状态修改"
git add miniprogram/pages/mine/items/ miniprogram/pages/mine/favorites/ miniprogram/pages/search/
git commit -m "feat(item): 我的发布、我的收藏与搜索结果页面"
git push -u origin feature/item-mine
# PR → dev，合并

# M1
git switch main
git pull origin main
git tag -a v0.2-m1 -m "M1: 二手交易闭环"
git push origin v0.2-m1
git switch dev
git merge main
git push origin dev
```

**验收**

- [ ] 注册 → 发布 → 搜索 → 详情 → 收藏 → 我的收藏 → 下架/售出全流程可用。
- [ ] 搜索结果页书籍卡片字段完整（封面/书名/出版社/作者/ISBN），点击卡片能按 `bookId` 过滤同书商品。
- [ ] 非卖家改商品 403；非法状态跳转 409。
- [ ] `item_status_logs` 有下架/售出记录。
- [ ] 我的发布按状态筛选正确；我的收藏取消后列表更新。
- [ ] ER 图初稿导出到 `report/assets/`。
- [ ] `v0.2-m1` tag 存在。

**注意**

- 今天之后二手模块进入“只修 bug 不加功能”的状态（除非时间富余）。
- 如果页面还没完全好看，先保证功能闭环；UI 统一放到 11-17 和 B 一起走查。
- 报告素材当天截图，不要等 11-22 再补。

---

### 阶段 2：代取 + 聊天（11-12 ~ 11-16）

> 分工口径：A 做代取后端；B 做代取页面。聊天后端和页面都归 B；A 在 11-13 前交付聊天数据库对象。
> 这 5 天 A 没有代取页面任务，时间要投到：代取 API、聊天数据库对象、数据库对象第一批、代取联调。

#### 11-12（四）跑腿资料 + 代取发布/大厅

**今天必须完成**

- `GET/PUT /api/users/me/runner-profile`、`PUT /api/users/me/online`。
- `GET /api/runners?area=&place=&timeType=&timeStart=&deadline=&itemSize=&page=&pageSize=`（找跑腿匹配）。
- `POST /api/errands`、`GET /api/errands`（大厅）。
- `v_errand_hall` 视图。
- 接口文档补充代取接口和角色规则。

**怎么做**

1. **09:00-12:00 跑腿资料 + 上下线 + 自动计划**：
   - `runner_profiles` 与 `users` 一对一，`user_id` 主键 + 外键；可接规格存 `runner_item_sizes`（多选）。
   - `GET /api/users/me/runner-profile`：查不到时返回默认值（`isOnline:false`、`availabilityType:'slot'`、`serviceAreas:[]`、`servicePlaces:[]`、`timeSlots:[]`、`manualUntil:null`、`itemSizes:[]`、`basePrice:null`、`remark:''`、`completedCount:0`），不要 404，方便 B 的页面回显。
   - `PUT /api/users/me/runner-profile`：`INSERT ... ON DUPLICATE KEY UPDATE` 写主表；`runner_item_sizes` 在同一事务里先删后插；校验 `basePrice` 为空或 `>= 0`、`availabilityType` 只能是 `slot/now`、`timeSlots` 是数组且每项符合下面的结构、`itemSizes` 只能取 `small/medium/large`、`serviceAreas` 是非空数组且每个值在 25 个固定片区内、`servicePlaces` 是数组且每个元素是受控地标名或片区名、其所属片区必须在 `serviceAreas` 内；服务片区必填，具体地标 / 规格 / 报价 / 备注选填。
   - `timeSlots` 校验：`once` 必须有 `date`（前端不选默认当天）、`start`、`end`；`weekly` 必须有 `weekdays`（1=周一……7=周日，非空且不重复）、`from`、`start`、`end`；同一天内 `start < end`，不支持跨天；同一时间不允许两条计划重叠；`slot` 模式至少要有一条未来计划，`now` 模式可以为空。
   - `PUT /api/users/me/runner-profile` 保存后：清空旧的手动覆盖；`slot` 模式立即按当前时间重算一次 `is_online`，`now` 模式保持当前状态、后续由用户手动切换；下一次定时任务继续接管 `slot`。若本次修改/删除的 `weekly` 计划当前正处于 occurrence 中，先用旧计划算出本次结束时间并写入 `manual_until`，保证“修改只影响下一次”。
   - `PUT /api/users/me/online`：body `{ isOnline, availabilityType?, scope?, scheduleId? }`；`slot` 模式下手动操作把 `manual_until` 设为“下一个计划边界”和“当天 23:59”中较早者；`now` 模式不设 `manual_until`（切到 `now` 时清空），保持到用户手动切换；正在进行的循环计划下线时，`scope:"once"` 只覆盖到本次结束，`scope:"future"` 删除该循环规则并立即下线。
   - `server/src/jobs/runnerOnline.js`：用 `node-cron` 每分钟执行；扫描 `availability_type='slot'` 的用户，`manual_until > NOW()` 时跳过；否则判断当前时间是否落在任一 `once` 或 `weekly` occurrence 内，设置 `is_online`；过期 `manual_until` 清空；服务启动时先执行一次补算。
   - 测试：单次计划（默认当天/多选几天）、循环计划、手动覆盖到边界、进行中循环的“只这一次/取消之后所有”、服务重启后补算。
2. **14:00-16:00 找跑腿匹配 API**：
   - `GET /api/runners`：`asap` 只查 `is_online = 1`；`deadline`/`range` 查 `availability_type='slot'`（按计划重叠，不要求当前在线）或 `availability_type='now' AND is_online=1`；先按 `service_areas` 的 JSON 包含关系（`JSON_CONTAINS`）做片区粗筛，再按 `service_places` 做地标细筛——`service_places` 为空数组，或包含订单 `place`，或包含订单 `area`（表示跑腿勾了整个片区）；`place` 没传时按 `place = area` 处理（等价于用户只选了片区）；再叠加可接规格、时间重叠过滤；分页。
   - 地标匹配真值表：只接某栋楼的跑腿，不匹配“只填片区”的订单；接整个片区（或只按片区）的跑腿，能匹配片区内任何具体地标。
   - 时间匹配：参数与订单一致，`timeType=asap` 不筛时间；`timeType=deadline` 用 `[NOW(), deadline]`；`timeType=range` 用 `[timeStart, deadline]`。`slot` 跑腿的需求窗口与任一 `once`/`weekly` occurrence 重叠即可；`now` 跑腿只看在线状态。MVP 数据量小，应用层解析 JSON 过滤即可，报告里说明；不要再把 `time_slots` 当成“每天重复的 HH:mm”。
   - 返回昵称、头像、信用分、完成数、`serviceAreas`、`servicePlaces`、在线计划摘要、可接规格、报价、备注；**不返回手机号等敏感信息**。
   - 明确：匹配页只展示信息 + 联系 TA（跳聊天），**不直接改订单状态**；订单仍发布到大厅由 `sp_take_errand` 接单。
3. **16:00-17:00 代取发布 + 大厅**：
   - `POST /api/errands`：`timeType` 必填（页面必须选尽快 / 截止 / 范围之一）；校验取件片区 `pickupArea`（必填，取值在 25 个固定片区内）、取件地标 `pickupPlace`（必填，受控地标名，且所属片区必须等于 `pickupArea`；只选片区时允许直接传片区名）、送达地点 `deliveryLocation`（必填，自由文本，≤100 字，不做片区/地标校验）、物品规格、描述、备注 `remark`（选填，≤255 字，取件详细地址与交付要求写这里；前端输入框用灰色小字提示“填写取件详细地址、交付要求等”）、报酬 ≥ 0、时间要求；`timeType` 只能取 `asap/deadline/range`，`asap` 时 `timeStart`、`deadline` 必须为空，`deadline` 时只填 `deadline`，`range` 时两者都填且 `timeStart < deadline`；插入 `status='pending'`；返回 `orderId`。
   - 不校验“截止时间必须晚于当前时间”，也不做超时自动取消；`deadline` 只作参考和匹配用。
   - `GET /api/errands?status=pending&page=&pageSize=`：用 `v_errand_hall`；默认只查 `pending`；分页；按 `created_at DESC`；返回发布者昵称/头像/信用分。
   - `v_errand_hall`：`errand_orders` + `users`（发布者）；字段 camelCase；包含 `pickupArea`、`pickupPlace`、`deliveryLocation`、`remark`。
   - 测试：seed 几条 pending 订单；大厅能看到；三种时间模式都能发布，非法组合 400；报酬负数 400；`pickupPlace` 不在清单内 400；只传片区名作为 `pickupPlace` 能成功；送达地点为空或超过 100 字返回 400。
4. **18:00-21:00 聊天数据库对象提前做**：
   - 今天先写 `conversations`、`messages` 相关对象（见 11-13 的清单），能写多少写多少；这样 B 的聊天后端不会等到 11-15。
   - 至少先交付 `v_conversation_base`、`sp_get_or_create_conversation` 的初版，让 B 可以开始。
5. **21:30 同步**：B 的代取页面字段和接口对齐；告诉 B 找跑腿匹配页可以用 `GET /api/runners` 了（P1，不阻塞 M2）；聊天对象预计 11-13 中午前可用。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/errand-core
git add server/src/routes/users.js server/src/routes/errands.js server/src/jobs/runnerOnline.js database/objects.sql docs/接口文档.md
git commit -m "feat(errand): 跑腿资料、自动上下线与代取发布/大厅接口"
git push -u origin feature/errand-core
# PR → dev
```

**验收**

- [ ] 跑腿设置保存后能回显；可接规格多选、`once`/`weekly` 在线计划、`manualUntil`、片区与具体地标数组正确保存；上下线状态正确。
- [ ] 自动任务到计划开始上线、结束下线；手动覆盖最晚到 23:59；服务重启后下一分钟补算。
- [ ] 进行中循环下线：选“只这一次”规则保留、下次照常；选“取消之后所有”规则删除、立即下线。
- [ ] 修改进行中的循环计划，前端弹窗提醒“只影响下一次，当前这次要结束用提前下线”。
- [ ] `GET /api/runners` 按时间要求返回可接单跑腿（`asap` 在线；`deadline`/`range` 可含计划重叠的 `slot` 跑腿），按取件片区粗筛 + 具体地标细筛 + 规格 + 时间重叠筛选有效，不泄露手机号。
- [ ] 地标匹配符合真值表：只接某栋楼的跑腿不匹配“只填片区”的订单；接整个片区的跑腿能匹配片区内具体地标订单。
- [ ] 发布代取单成功；大厅显示 pending 订单；分页正常。
- [ ] 报酬负数、时间组合非法、必填缺失、地标不在清单内都返回 400。
- [ ] `v_errand_hall` 结果包含发布者昵称/头像和 `pickupArea`、`pickupPlace`、`deliveryLocation`、`remark`。

**注意**

- 代取页面是 B 的，A 不要抢着写；A 把接口和 Postman 示例给 B。
- 角色规则今天就要写进接口文档，B 的按钮显示依赖它。

#### 11-13（五）接单事务 + 状态日志 + 聊天对象交接

**今天必须完成**

- `POST /api/errands/:id/take`：事务 + `FOR UPDATE`，防并发重复接单。
- `GET /api/errands/mine?role=publisher|runner`。
- `trg_errand_status_log`。
- 聊天数据库对象全部交付 B：`sp_get_or_create_conversation`、`fn_unread_count`、`trg_message_after_insert`、`v_conversation_base`。
- 并发接单测试：两个账号同时接，一个 200、一个 409。

**怎么做**

1. **09:00-12:00 接单事务**：
   - 优先把事务写在 `sp_take_errand` 存储过程里（数据库对象加分）；入参 `p_order_id, p_runner_id, OUT p_code`；内部：
     - `START TRANSACTION`；
     - `SELECT publisher_id, status ... FOR UPDATE`；
     - 不存在 404、自己发的单 403、非 pending 409；
     - `SET @current_user_id = p_runner_id`；
     - `UPDATE ... SET runner_id=?, status='taken', taken_at=NOW() WHERE order_id=? AND status='pending'`；
     - `ROW_COUNT()=1` 才 COMMIT，否则 ROLLBACK + 409。
   - 如果 SP 卡住超过 2 小时，先用计划 6.8 的 Node 事务保证闭环，11-17 再补 SP；但 `sp_take_errand` 必须在 11-17 前补上，算数据库对象。
   - Node 调用 SP 时，同样用**同一个连接**：`CALL sp_take_errand(?, ?, @code)` → `SELECT @code` → 映射 404/403/409。
   - `GET /api/errands/mine?role=publisher|runner`：按发布者/接单者查，带状态筛选和分页。
   - `trg_errand_status_log`：`AFTER UPDATE`，状态变化时插日志；`changed_by` 用 `@current_user_id`。
2. **14:00-17:00 聊天数据库对象 + 交接**：
   - 在 `database/objects.sql` 写：
     - `sp_get_or_create_conversation(p_user1, p_user2, p_biz_type, p_biz_id, OUT p_conversation_id)`：用户 ID 归一化（小的在前），用 `INSERT ... ON DUPLICATE KEY UPDATE conversation_id = LAST_INSERT_ID(conversation_id)` 防并发重复；返回 id。
     - `fn_unread_count(p_conversation_id, p_user_id)`：统计 `sender_id <> p_user_id AND is_read = 0`。
     - `trg_message_after_insert`：更新 `conversations.last_message` 和 `last_time`；`text` 用 `LEFT(NEW.content, 255)` 截断，`image` 固定写 `[图片]`，避免会话列表出现 `/uploads/...` 长路径。
     - `v_conversation_base`：会话 + 双方昵称/头像。
   - 每个对象先在 MySQL 里测：创建会话两次返回同一个 id；插入消息后会话最后消息更新；未读数正确。
   - 把测试 SQL、字段说明、调用示例整理成一条消息发给 B（含发送消息 `msgType` 约定：`text` / `image`，图片 `content` 传 `/uploads/` 相对路径），并在群里说“聊天 DB 对象已合并，可以开始写 chat.js”。
   - **B 的 `chat.js` 不要由 A 写**；如果 B 卡住，A 可以帮忙看 SQL/权限，但代码由 B 提交，保证分工记录清楚。
3. **17:00-19:00 并发测试**：
   - Postman 登录 2023002、2023003（两个跑腿），2023001 发布一单；
   - 两个标签页同时 `POST /api/errands/:id/take`；
   - 预期一个 200、一个 409；数据库 `runner_id` 只有一个；
   - 截图两个响应 + 数据库结果，保存到 `docs/screenshots/2026-11-13/`。
4. **19:30-21:00 Git**：合并 `feature/errand-take` 和 `feature/chat-db-objects`；通知 B。
5. **21:30 同步**：B 的聊天后端是否开始；代取页面联调时间。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/errand-take
git add database/objects.sql server/src/routes/errands.js
git commit -m "feat(errand): 接单事务、并发控制与状态日志"
git push -u origin feature/errand-take
# PR → dev

git switch dev
git pull origin dev
git switch -c feature/chat-db-objects
git add database/objects.sql
git commit -m "feat(db): 聊天会话、消息、未读数数据库对象"
git push -u origin feature/chat-db-objects
# PR → dev，合并后立即通知 B
```

**验收**

- [ ] 两个账号并发接同一单：一个成功、一个 409；数据库只有一个 `runner_id`。
- [ ] 发布者不能接自己的单（403）；已接的单再接 409。
- [ ] `errand_status_logs` 有 `pending → taken` 记录。
- [ ] `sp_get_or_create_conversation` 连续调用两次返回同一个 `conversation_id`。
- [ ] `fn_unread_count` 返回值与 `messages` 明细一致。
- [ ] B 确认收到聊天对象，能开始写 `chat.js`。

**注意**

- 事务里所有 SQL 必须走同一个连接；`pool.query` 可能换连接，事务会失效。
- `@current_user_id` 是会话变量，`SET` 和 `UPDATE` 必须在同一连接上。
- 并发测试不要只点一次；多试几次，确认稳定。

#### 11-14（六）完成/撤回/释放/取消 + 信用分

**今天必须完成**

- `POST /api/errands/:id/complete`、`/cancel`、`/release`。
- `sp_complete_errand`：完成订单、更新跑腿完成数、信用分。
- 状态机全路径测试。
- 聊天对象如果 11-13 没交付完，今天上午必须交付。

**怎么做**

1. **09:00-12:00 完成/撤回/释放/取消**：
   - 完成：只有发布者；状态必须是 `taken`；调 `sp_complete_errand`（事务）：
     - 更新订单 `completed`、`completed_at`；
     - 接单者的 `runner_profiles.completed_count + 1`（不存在则插入）；
     - 接单者的 `users.credit_score = LEAST(100, credit_score + 2)`；
     - 日志触发器记录。
   - 发布者撤回 `/cancel`：
     - `pending → cancelled`，订单结束；
     - `taken → pending`，退回大厅，`runner_id = NULL`、`taken_at = NULL`。
   - 接单者释放 `/release`：
     - `taken → pending`，退回大厅，`runner_id = NULL`、`taken_at = NULL`。
   - `taken` 不能一步变 `cancelled`；发布者要退回 `pending`，再取消。
   - 没有单独的“挂起/恢复”状态和接口；`taken` 本身就是锁单，订单不在大厅、别人不能再接。
   - 所有写操作先查订单，校验角色和状态；角色不符 403，状态不符 409。
   - 撤回/释放和状态更新在同一连接上设置 `@current_user_id`，保证日志记录实际操作人。
2. **14:00-17:00 状态机测试**：
   - 发布 → 接单 → 完成；
   - 发布 → 取消；
   - 发布 → 接单 → 发布者撤回（变 `pending`，`runner_id` 为空）→ 再取消（变 `cancelled`）；
   - 发布 → 接单 → 接单者释放（变 `pending`）→ 另一个跑腿重新接单 → 完成；
   - 接单后发布者调 `/cancel` 只会回到 `pending`，不会一步变 `cancelled`；再调一次才变 `cancelled`；
   - 接单后查大厅，确认该订单不出现；
   - 已完成单再撤回/释放 → 409；
   - 接单者点完成 → 403；
   - 发布者点释放 → 403；
   - 非接单者点释放 → 403；
   - 每一条截图或至少记录结果。
3. **17:00-19:00 数据库对象第一批**（如果时间够，提前做 11-15 的内容）：
   - `v_user_summary`、`fn_completed_errands`、`sp_refresh_user_credit` 的初版。
   - 不要求今天完成，但能提前就提前，11-17 会轻松很多。
4. **19:30-21:00 Git**：合并 `feature/errand-status`；更新接口文档；截图。
5. **21:30 同步**：B 的代取页面联调安排；B 的聊天进度。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/errand-status
git add database/objects.sql server/src/routes/errands.js
git commit -m "feat(errand): 完成、撤回、释放、取消与信用分更新"
git push -u origin feature/errand-status
# PR → dev
```

**验收**

- [ ] 状态机全路径正确；非法跳转 409。
- [ ] 完成后 `runner_profiles.completed_count` +1，`users.credit_score` 增加（不超过 100）。
- [ ] `errand_status_logs` 完整记录每次状态变化，撤回/释放记录实际操作人。
- [ ] 发布者撤回/接单者释放后，订单回到大厅，`runner_id`、`taken_at` 都为空。
- [ ] 角色权限：非发布者完成 403、非接单者释放 403、非发布者撤回 403。
- [ ] 接单后订单从大厅消失，别人不能再接。

**注意**

- `sp_complete_errand` 里更新 `runner_profiles` 用 `INSERT ... ON DUPLICATE KEY UPDATE`，防止跑腿没设置资料时更新 0 行。
- 信用分规则写进报告（例如 60 基础 + 完成单数 ×2，最高 100），答辩可能问。
- 撤回/释放不要删除订单行，也不要把日志删掉；只改状态、清空接单人，历史仍然可查。

#### 11-15（日）代取联调 + 数据库对象第一批

**今天必须完成**

- 和 B 联调代取：大厅、发布、详情、我的代取、接单设置。
- 修复代取接口问题。
- `v_user_summary`、`fn_completed_errands`、`sp_refresh_user_credit` 至少完成初版。
- 接口文档更新实际响应示例。

**怎么做**

1. **09:00-12:00 代取联调**：
   - 用两个账号走：A 发布代取 → B 上线 → B 接单（确认大厅里消失）→ A 完成；
   - 再走一遍：A 发布 → B 接单 → B 释放 → 订单回大厅 → A 撤回；检查 B 的页面按钮是否按 `canTake/canComplete/canCancel/canRelease` 显示；
   - 修接口字段/错误码；不要改 B 的页面代码，除非 B 请你改（改之前说一声）。
2. **14:00-17:00 数据库对象第一批**：
   - `v_user_summary`：用户 + 发布商品数、收藏数、完成跑腿数、发布代取数；用子查询或聚合，先保证结果对，再考虑性能。
   - `fn_completed_errands(user_id)`：查该用户作为跑腿完成的订单数；`READS SQL DATA`。
   - `sp_refresh_user_credit`：游标遍历有完成单的用户，`credit_score = LEAST(100, 60 + count*2)`；按计划 6.10。
   - 每个对象写测试 SQL + 截图。
3. **17:00-19:00 文档 + 截图**：把代取接口的实际响应示例补进 `docs/接口文档.md`；整理 `docs/screenshots/2026-11-15/`。
4. **19:30-21:00 Git**：合并 `fix/errand-integration`、`feature/db-objects-batch1`。
5. **21:30 同步**：M2 前还差什么；B 的聊天是否能在 11-16 联调。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c fix/errand-integration
git add server/src/routes/errands.js docs/接口文档.md
git commit -m "fix(errand): 修复代取联调中的字段与状态问题"
git push -u origin fix/errand-integration
# PR → dev

git switch dev
git pull origin dev
git switch -c feature/db-objects-batch1
git add database/objects.sql
git commit -m "feat(db): 用户统计视图、完成数函数与信用分游标"
git push -u origin feature/db-objects-batch1
# PR → dev
```

**验收**

- [ ] 代取全流程在两个账号之间走通。
- [ ] B 的页面按钮显示与角色/状态一致。
- [ ] `v_user_summary` 统计数与明细一致。
- [ ] `fn_completed_errands` 返回值正确。
- [ ] `sp_refresh_user_credit` 执行后信用分符合规则。

**注意**

- `sp_refresh_user_credit` 游标写法容易死循环，先用 3 条数据测。
- 代取订单没有超时定时事件，`deadline` 只作参考；过了时间订单不会被系统自动取消（跑腿自动上下线是另一条 `node-cron` 任务，不动订单状态）。

#### 11-16（一）M2 联调 + 接口文档 + 性能初查

**今天必须完成**

- 二手 + 代取 + 聊天全流程联调（聊天由 B 主导，A 协助服务端问题）。
- 更新接口文档；检查 N+1 和慢 SQL；修 P0 bug。
- M2：合并 `dev` → `main`，打 `v0.3-m2`。

**怎么做**

1. **09:00-12:00 全流程联调**：
   - 两个账号：登录 → 二手详情 → 联系卖家 → 发消息 → 另一账号收到 → 未读清零；
   - 发布代取 → 接单 → 聊天 → 完成；
   - B 的聊天如果还有问题，A 帮忙看服务端日志、SQL、鉴权，但代码改动由 B 提交。
   - 记录所有阻塞 bug，按 P0/P1 分类；只修 P0。
2. **14:00-17:00 性能初查**：
   - `EXPLAIN` 检查：商品列表、商品搜索、代取大厅、消息增量拉取；
   - 确认 `items(status, created_at)`、`errands(status, created_at)`、`messages(conversation_id, message_id)` 被使用；
   - 搜索 `LIKE '%keyword%'` 不走索引是正常的，报告里写“数据量小 + 前缀搜索可优化”，不要为了演示强行加索引。
   - 用 `EXPLAIN ANALYZE` 记录耗时（MySQL 8.0.18+ 支持）。
3. **17:00-19:00 文档 + 测试**：
   - `docs/接口文档.md` 补充实际响应示例、错误码；
   - 把 M2 的测试结果记录到 `docs/A测试记录.md`；
   - 截图聊天/代取全流程。
4. **19:30-21:20 Git + M2**：
   - 合并 `fix/m2-integration`；
   - 按 3 的固定动作合并 `dev` → `main`，打 `v0.3-m2`；
   - 同步回 `dev`。
5. **21:30 同步**：确认 M2 达标；11-17 开始集中补数据库对象和测试。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c fix/m2-integration
git add server/src/routes/ docs/接口文档.md docs/A测试记录.md
git commit -m "fix: M2 联调修复与接口文档更新"
git push -u origin fix/m2-integration
# PR → dev

# M2
git switch main
git pull origin main
git tag -a v0.3-m2 -m "M2: 代取与聊天闭环"
git push origin v0.3-m2
git switch dev
git merge main
git push origin dev
```

**验收**

- [ ] 两个账号 5 秒内收到对方消息（3 秒轮询 + 网络延迟）。
- [ ] 代取发布/接单/完成/聊天入口全通。
- [ ] 核心接口无 500；错误有明确提示。
- [ ] `docs/接口文档.md` 与实际返回一致。
- [ ] `v0.3-m2` tag 存在。

**注意**

- M2 之后不再加新功能；11-17 开始是“补数据库对象 + 测试 + UI 走查”。
- 如果聊天还没完全好，M2 可以推迟到 11-17 上午，但 11-21 冻结不能推迟。
- 接口文档是 B 写前端时的唯一依据；实际返回和文档不一致时，先改文档再改代码。

---

### 阶段 3：数据库对象、测试、UI 打磨（11-17 ~ 11-21）

> 这 5 天的目标不是“再加功能”，而是把数据库对象补齐、把测试做扎实、把 bug 修掉。
> 11-21 之后只修 bug，不加功能。

#### 11-17（二）数据库对象总清点 + 视图/过程/函数

**今天必须完成**

- 对照清单逐项检查：4 视图、5 存储过程、2 函数、5 触发器。
- 补齐所有缺的视图、存储过程、函数。
- 每个对象有测试 SQL + 结果截图。
- `database/objects.sql` 可以从头重复执行。
- 报告第 6 章开始写（至少把对象清单和截图素材整理好）。

**怎么做**

1. **09:00-10:00 清点**：建一张勾选表，逐项标记“已完成 / 待补 / 有问题”。

   | 类型 | 对象 | 状态 | 备注 |
   | --- | --- | --- | --- |
   | 视图 | `v_item_list` |  | 11-08 已建 |
   | 视图 | `v_errand_hall` |  | 11-12 已建 |
   | 视图 | `v_conversation_base` |  | 11-13 已交 B |
   | 视图 | `v_user_summary` |  | 11-15 初版 |
   | 存储过程 | `sp_publish_item` |  | 11-09 |
   | 存储过程 | `sp_take_errand` |  | 11-13 |
   | 存储过程 | `sp_complete_errand` |  | 11-14 |
   | 存储过程 | `sp_get_or_create_conversation` |  | 11-13 |
   | 存储过程 | `sp_refresh_user_credit` |  | 11-15 初版 |
   | 函数 | `fn_unread_count` |  | 11-13 |
   | 函数 | `fn_completed_errands` |  | 11-15 初版 |
   | 触发器 | `trg_fav_after_insert` |  | 11-10 |
   | 触发器 | `trg_fav_after_delete` |  | 11-10 |
   | 触发器 | `trg_item_status_log` |  | 11-11 |
   | 触发器 | `trg_errand_status_log` |  | 11-13 |
   | 触发器 | `trg_message_after_insert` |  | 11-13 |

2. **10:00-12:00 补齐视图/函数**：
   - `v_item_list`：商品 + 卖家 + 分类 + 书目 + 首图；字段 camelCase；`LEFT JOIN` 处理无分类/无书目。
   - `v_errand_hall`：pending 订单 + 发布者昵称/头像/信用分。
   - `v_conversation_base`：会话 + 双方昵称/头像；B 直接查。
   - `v_user_summary`：用户 + 发布商品数、收藏数、完成跑腿数、发布代取数；每个统计用子查询，先保证正确。
   - `fn_unread_count`：`READS SQL DATA`；统计未读。
   - `fn_completed_errands`：`READS SQL DATA`；统计完成单数。
3. **14:00-17:00 补齐存储过程**：
   - `sp_publish_item`：检查 `JSON_TABLE` 在图片为空时是否报错；用空数组测一次。
   - `sp_take_errand`：检查并发返回码；用两个连接同时 CALL 测。
   - `sp_complete_errand`：检查跑腿资料不存在时 `completed_count` 是否正确插入。
   - `sp_get_or_create_conversation`：重复调用返回同一 id；并发调用不重复。
   - `sp_refresh_user_credit`：游标遍历；空表、单条、多条都测。
4. **17:00-19:00 让 `objects.sql` 可重复执行**：
   - 文件开头按依赖逆序 `DROP VIEW IF EXISTS`、`DROP PROCEDURE IF EXISTS`、`DROP FUNCTION IF EXISTS`、`DROP TRIGGER IF EXISTS`。
   - 注意：`DROP TRIGGER` 不需要表名前缀；`DROP PROCEDURE/FUNCTION` 带名字即可。
   - 重新跑一遍完整初始化：

     ```bash
     mysql -u root -p < database/schema.sql
     mysql -u root -p < database/objects.sql
     mysql -u root -p < database/seed.sql
     cd server && npm run seed
     ```

   - 如果 `CREATE FUNCTION` 报 1418（binlog 相关），用 root 执行：

     ```sql
     SET GLOBAL log_bin_trust_function_creators = 1;
     ```

     这是本地课程环境，报告里说明“为便于演示函数创建临时开启”，答辩时能解释即可。
5. **19:30-21:20 截图 + 文档**：
   - 每个对象至少两张图：创建/查询语句 + 结果；或调用前/调用后。
   - 命名：`docs/screenshots/2026-11-17/db_v_item_list.png`、`db_sp_take_errand.png` 等。
   - 在 `report/A章节.md` 里建第 6 章骨架，把对象清单、用途、测试结果先贴进去。
6. **21:30 同步**：B 的 UI 走查进度；11-18 性能测试需要 B 配合造数据吗（不需要，A 自己写脚本）。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/db-objects
git add database/objects.sql
git commit -m "feat(db): 补齐视图、存储过程与函数"
git push -u origin feature/db-objects
# PR → dev
```

**验收**

- [ ] 清单里所有视图/过程/函数都有实现。
- [ ] `objects.sql` 从空库执行成功。
- [ ] 每个对象都有测试 SQL 和截图。
- [ ] 至少一个接口或演示脚本真实调用了每个对象（不能只建不用）。
- [ ] `SHOW CREATE VIEW`、`SHOW PROCEDURE STATUS`、`SHOW FUNCTION STATUS` 能看到对象。

**注意**

- 报告要求“每个对象说明解决了什么问题”，不要只贴代码。
- 如果某个对象在接口里没用上，至少在答辩演示 SQL 里用一次，并说明用途。
- `sp_refresh_user_credit` 是游标示例，答辩很可能问“游标怎么用、为什么不直接用 UPDATE”；准备好回答。

#### 11-18（三）触发器、状态机、性能与测试数据

**今天必须完成**

- 5 个触发器全部验证：收藏计数、商品状态日志、代取状态日志、消息最后一条。
- 状态机撤回/释放路径验证，日志记录操作人。
- 造 1000 商品、5000 消息；`EXPLAIN` 验证索引；记录耗时。
- 截图：触发器前后对比、状态机日志、`EXPLAIN`、数据量。

**怎么做**

1. **09:00-12:00 触发器逐一测试**：
   - 收藏触发器：

     ```sql
     SELECT item_id, favorite_count FROM items WHERE item_id = 1;
     INSERT INTO favorites (user_id, item_id) VALUES (2, 1);
     SELECT item_id, favorite_count FROM items WHERE item_id = 1;
     DELETE FROM favorites WHERE user_id = 2 AND item_id = 1;
     SELECT item_id, favorite_count FROM items WHERE item_id = 1;
     ```

     预期：0 → 1 → 0；重复插入不重复加；取消未收藏不减成负数。
   - 商品状态日志：

     ```sql
     SET @current_user_id = 2;
     UPDATE items SET status = 'off_shelf' WHERE item_id = 1;
     SELECT * FROM item_status_logs WHERE item_id = 1 ORDER BY log_id DESC;
     ```

     预期：日志有 `on_sale → off_shelf`，`changed_by = 2`。
   - 代取状态日志：接单/完成/撤回/释放/取消各测一次；确认每条状态变化都有记录。
   - 消息触发器：分别插入一条 `text` 和一条 `image` 消息，查 `conversations.last_message`（截断文本 / `[图片]`）与 `last_time` 是否更新。
   - 每个触发器都测“状态没变时是否误写日志”：例如把 `on_sale` 再更新成 `on_sale`，日志不应增加。
2. **14:00-15:30 状态机撤回/释放 + 日志验证**：
   - 准备一条 `taken` 订单；发布者调 `POST /api/errands/:id/cancel`，确认状态回到 `pending`，`runner_id`、`taken_at` 为空。
   - 再接单，接单者调 `POST /api/errands/:id/release`，确认订单重新出现在大厅。
   - 接单后发布者调 `/cancel`，确认只回到 `pending`，不会一步变成 `cancelled`；随后再调一次 `/cancel` 才变 `cancelled`。
   - 查 `errand_status_logs`，确认每次变化都有记录，`changed_by` 是实际操作人。
   - 造一条 `deadline` 已过的 `pending` 单，等几分钟再查，确认状态仍是 `pending`，系统没有自动取消。
   - 截图：大厅重新出现订单 + 状态日志 + 过期订单未变。

3. **15:30-18:00 造数据 + 性能**：
   - 写 `server/scripts/seed-bulk.js`：
     - 1000 个商品，分布在 3 个卖家、6 个分类；标题 `测试商品 1..1000`，价格随机；图片可以只给部分商品。
     - 50 个会话，每个 100 条消息 = 5000 条；消息内容 `测试消息 1..5000`。
     - 用批量插入（`INSERT INTO ... VALUES ?` + 数组）或每 100 条一批，避免 5000 次单条插入太慢。
     - 脚本不提交生成的数据，只提交脚本；数据在本地数据库。
   - `EXPLAIN` 检查：

     ```sql
     EXPLAIN SELECT * FROM v_item_list WHERE status='on_sale' ORDER BY created_at DESC LIMIT 10;
     EXPLAIN SELECT * FROM errand_orders WHERE status='pending' ORDER BY created_at DESC LIMIT 10;
     EXPLAIN SELECT * FROM messages WHERE conversation_id=1 AND message_id > 0 ORDER BY message_id LIMIT 20;
     ```

   - 用 `EXPLAIN ANALYZE` 记录实际耗时；确认 `key` 列使用了预期索引。
   - 搜索 `LIKE '%关键词%'` 不走索引是正常的；报告里写清楚“前缀搜索可用索引，模糊搜索数据量大时考虑 FULLTEXT”。
   - 截图：数据量 `SELECT COUNT(*)`、`EXPLAIN` 结果、查询耗时。
4. **19:30-21:20 Git + 文档**：
   - 合并 `feature/triggers-perf`；更新 `report/A章节.md` 第 5/6 章素材。
   - 把批量数据脚本加入 `server/scripts/`，但不要提交数据库文件。
5. **21:30 同步**：B 的截图是否齐全；11-19 安全测试需要 B 配合越权用例。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/triggers-perf
git add database/objects.sql server/scripts/seed-bulk.js
git commit -m "feat(db): 触发器验证、状态机撤回释放与性能测试脚本"
git push -u origin feature/triggers-perf
# PR → dev
```

**验收**

- [ ] 5 个触发器全部有效，状态未变化时不写日志。
- [ ] 撤回/释放后订单回大厅，日志记录实际操作人；过期订单不会被自动取消。
- [ ] 1000 商品/5000 消息插入成功。
- [ ] 关键查询 `EXPLAIN` 使用索引；记录耗时。
- [ ] 截图齐全。

**注意**

- 触发器测试用真实数据，但不要污染演示账号的关键数据；测试完可以重跑 seed 恢复。
- 造数据前先 dump 一份，防止把演示数据弄乱。
- 没有 MySQL 事件调度器，不要写“超时自动取消”的测试；在线计划由 `node-cron` 维护，但订单 `deadline` 仍只作参考。

#### 11-19（四）安全加固与权限演示

**今天必须完成**

- 所有写接口做身份和权限校验；输入校验完整。
- SQL 注入检查：所有 SQL 用 `?`，没有字符串拼接。
- 上传限制（类型/大小）验证。
- 创建 `cs_readonly`，演示只读；确认 `cs_app` 不能 DDL。
- 统一错误码，不返回堆栈/密码。
- 负向测试记录。

**怎么做**

1. **09:00-12:00 代码审计**：
   - 逐个路由检查：
     - 商品状态：只有卖家能改。
     - 收藏：登录即可，但只能操作自己的收藏。
     - 代取接单：不能接自己的单、不能接非 pending。
     - 完成/撤回/取消：只有发布者；接单者释放单独校验。
     - 上传：必须登录。
     - 聊天：B 的代码，A 一起 review 会话参与者校验。
   - 输入校验：必填、长度、数字范围、枚举白名单、分页上限；价格/报酬不能为负。
   - 错误处理：400/401/403/404/409/500；不要把 `err.stack` 返回给前端。
   - 用 `grep` 搜 `SELECT .* \$`、模板字符串拼 SQL、`req.body` 直接进 SQL 的地方，全部改成 `?`。
2. **14:00-16:00 数据库权限**：
   - 创建只读账号：

     ```sql
     CREATE USER 'cs_readonly'@'localhost' IDENTIFIED BY '换成强密码';
     GRANT SELECT, SHOW VIEW ON campus_service.* TO 'cs_readonly'@'localhost';
     FLUSH PRIVILEGES;
     ```

   - 测试：

     ```bash
     mysql -u cs_readonly -p campus_service
     ```

     ```sql
     SELECT COUNT(*) FROM items;          -- 成功
     INSERT INTO categories(name, sort_no) VALUES ('test', 99);  -- 应报 ERROR 1142
     ```

   - 截图 `SHOW GRANTS FOR 'cs_readonly'@'localhost';` 和插入被拒绝。
   - 确认 `cs_app` 不能 DDL：

     ```sql
     DROP TABLE feedback;  -- 应被拒绝
     ```

   - 把 `server/.env` 的 `DB_USER` 切成 `cs_app`，重启后端，跑登录/发布/接单，确认业务正常。**root 账号保留**，用于建表/对象/重置。
3. **16:00-18:30 负向测试**：
   - 无 token / 过期 token / 错误 token → 401。
   - 用 A 的 token 改 B 的商品 → 403。
   - 发布者接自己的单 → 403。
   - 两个账号并发接单 → 一个 200、一个 409。
   - 已完成订单再撤回/释放 → 409。
   - 上传 txt / 6MB 图片 → 400。
   - 搜索框输入 `' OR 1=1 --` → 按普通字符串处理，不返回全表。
   - 分页 `page=99999` → 空列表，不报错。
   - 价格 `-1`、非数字 → 400。
   - 记录到 `docs/A测试记录.md`，截图关键项。
4. **19:30-21:20 Git + 文档**：
   - 合并 `feature/security`；
   - 报告第 5 章“安全设计”素材补齐；
   - 确认 `.env` 没有被提交：`git log --all -- server/.env` 应无输出；如果有，按 7.5 处理。
5. **21:30 同步**：11-20 回归测试；B 准备 UI 测试记录。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c feature/security
git add server/src/ database/ docs/A测试记录.md
git commit -m "feat(security): 权限校验、输入校验与只读账号"
git push -u origin feature/security
# PR → dev
```

**验收**

- [ ] 所有写接口都有身份/权限校验。
- [ ] 负向测试全部符合预期。
- [ ] `cs_readonly` 只能 SELECT，插入被拒绝。
- [ ] `cs_app` 不能 DROP TABLE。
- [ ] `.env` 不在 Git 历史中。
- [ ] 没有 500 错误泄露堆栈。

**注意**

- 权限演示是报告 40 分的一部分，截图要清晰：账号、GRANT、成功/失败对比。
- 不要把 root 密码写进 `.env.example`；`.env.example` 用占位符。
- 如果 `cs_app` 不能 CALL 存储过程，补 `GRANT EXECUTE`。

#### 11-20（五）回归测试 + Postman 集合 + 修 P0

**今天必须完成**

- Postman/Thunder Client 集合：Auth、Items、Favorites、Upload、Errands、Chat、DB。
- 29 条核心测试用例跑完，记录结果。
- 修 P0 bug；P1 记录不修。
- 数据库 dump + 恢复测试。
- 测试记录交给 B 合并。

**怎么做**

1. **09:00-12:00 建集合**：
   - 在 Postman 建 `CampusService` 集合，环境变量：`baseUrl=http://127.0.0.1:3000`、`token1`、`token2`、`token3`、`itemId`、`errandId`、`conversationId`。
   - 登录请求的 Tests 里自动保存 token：

     ```js
     pm.environment.set('token1', pm.response.json().data.token);
     ```

   - 每个请求加断言：状态码、`code`、关键字段存在。
   - 文件夹按模块分；每个请求保存一个成功示例，报告附录可以用。
   - 导出集合 JSON 到 `docs/postman/CampusService.postman_collection.json`，提交。
2. **14:00-17:00 跑 29 条用例**：
   - 按《课程设计开发计划.md》7.1 的 29 条逐条执行；A 负责后端相关（1~29 都要懂，聊天部分和 B 一起）。
   - 结果写进 `docs/A测试记录.md`：用例号、操作、预期、实际、通过/失败、截图名。
   - 失败的按 P0/P1 分类：阻塞演示的是 P0，样式/文案是 P1。
   - P0 当天修；P1 记录，11-21 前有时间再修。
3. **17:00-18:30 dump + 恢复**：
   - 导出：

     ```bash
     mysqldump -u root -p --databases campus_service --routines --triggers > database/campus_service_dump.sql
     ```

   - 恢复测试：新建 `campus_service_test` 库，导入 dump，检查表/视图/过程/触发器/数据都在；或者直接在干净环境重跑 schema/objects/seed。
   - 注意：`mysqldump` 在 `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump`，Git Bash 里能直接调用；如果不行，用完整路径。
4. **19:30-21:20 Git + 文档**：
   - 合并 `test/regression`；
   - 把 Postman 集合、测试记录、dump 提交；
   - 更新 `docs/接口文档.md` 最终版。
5. **21:30 同步**：11-21 冻结检查清单；B 的截图/测试记录是否齐。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c test/regression
git add docs/postman/ docs/A测试记录.md database/campus_service_dump.sql
git commit -m "test: 核心用例回归、Postman 集合与数据库备份"
git push -u origin test/regression
# PR → dev
```

**验收**

- [ ] 29 条核心用例通过率 100%（P1 样式问题除外）。
- [ ] Postman 集合能一键跑通主要流程。
- [ ] dump 能在空库恢复，表和对象齐全。
- [ ] P0 bug 清零。
- [ ] 测试记录可交给 B 合并进报告第 8 章。

**注意**

- 测试数据要可重复：每次回归前重跑 seed，避免旧数据影响结果。
- 不要把 `campus_service_dump.sql` 里的真实密码/个人信息提交；演示账号是假的，没问题。
- 如果 dump 太大，检查是否把 `uploads` 的二进制或大量测试数据带进去了；只导数据库结构+数据，不含图片文件。

#### 11-21（六）功能冻结 + v1.0-m3

**今天必须完成**

- 功能冻结：只修 bug，不加功能。
- 干净环境完整跑一遍：schema → objects → seed → seed.js → 启动 → 两个账号演示。
- 导出最终 dump；打 tag `v1.0-m3`；合并 `dev` → `main`。
- 更新 readme 初稿。
- 确认所有数据库对象、测试、截图齐全。

**怎么做**

1. **09:00-12:00 干净环境回归**：
   - 先备份当前数据库。
   - 删库重建（或新建 `campus_service_clean`）→ 按顺序执行 schema/objects/seed → `npm run seed` → 启动 → 登录 → 走一遍核心流程。
   - 这一步会发现“只在旧数据库里存在、没写进 SQL”的对象/数据；全部补进脚本。
   - 记录从零到跑起来的步骤和耗时，11-26 的 readme 直接用。
2. **14:00-16:00 冻结检查**：
   - 对照 10.4 的清单逐项勾。
   - 确认没有未合并的 feature 分支；`git branch -a` 检查。
   - 确认 `dev` 和 `main` 的代码一致（M3 合并前 `dev` 最新）。
   - P0 bug 清零；P1 记录到“不足与展望”。
3. **16:00-17:30 合并 + tag**：
   - 开 PR：`dev` → `main`，标题 `release: v1.0 M3 功能冻结`。
   - 合并后打 tag：

     ```bash
     git switch main
     git pull origin main
     git tag -a v1.0-m3 -m "M3: 功能冻结，数据库对象齐全"
     git push origin v1.0-m3
     git switch dev
     git merge main
     git push origin dev
     ```

4. **17:30-19:00 readme 初稿**：
   - 按计划 8.6 的模板写 `readme.txt`：环境、启动步骤、测试账号、数据库对象、常见问题、分工。
   - 启动步骤必须和干净环境实测一致。
5. **19:30-21:20 Git + 文档**：
   - 提交 readme 到 `dev`（`docs/release-readme` 分支或 `chore/release-package` 分支，11-26 继续）。
   - 整理 `docs/screenshots/`，确认数据库/接口/页面截图都在。
6. **21:30 同步**：宣布功能冻结；11-22 开始写报告；B 负责 PPT/视频的启动时间。

**Git**

```bash
# 冻结合并
# GitHub 开 PR：base=main，compare=dev，标题 release: v1.0 M3 功能冻结
git switch main
git pull origin main
git tag -a v1.0-m3 -m "M3: 功能冻结，数据库对象齐全"
git push origin v1.0-m3
git switch dev
git merge main
git push origin dev

# readme 初稿
git switch dev
git pull origin dev
git switch -c chore/release-readme
git add readme.txt
git commit -m "docs: readme 初稿与启动步骤"
git push -u origin chore/release-readme
# PR → dev
```

**验收**

- [ ] 干净环境能按 readme 跑起来。
- [ ] 所有 P0 功能可用；数据库对象齐全。
- [ ] 29 条用例通过。
- [ ] `v1.0-m3` tag 存在。
- [ ] 功能冻结公告发到群里。
- [ ] 截图、测试记录、dump 齐全。

**注意**

- 冻结后如果发现必须加字段/改表，先和 B 商量，评估是否影响演示；能绕就绕，不能绕才改，并重新跑回归。
- 冻结不是“代码不能动”，而是“不加功能”；P0 bug 必须修。
- 11-21 之后所有代码改动走 `fix/*`，并在群里说明原因。

---

### 阶段 4：报告、PPT、视频（11-22 ~ 11-26）

> 报告写作顺序：先写数据库主线（第 2、3、5、6 章），再写第 1、9 章，最后统一术语。
> **A 写 Markdown，B 负责粘进 Word 排版。A 不要直接改 `report/报告.docx`，避免 Word 二进制冲突。**

#### 11-22（日）报告第 1、2、3 章

**今天必须完成**

- 第 1 章 项目概况：任务、要解决的问题、功能模块、开发环境、分工。
- 第 2 章 需求分析：业务流程、功能需求、数据流图、数据字典。
- 第 3 章 概念设计：局部 ER 图、全局 ER 图、实体与联系说明。
- 所有图导出到 `report/assets/`，命名规范。

**怎么做**

1. **09:00-12:00 第 1 章**：
   - 参考《校园服务APP项目方案总结.md》的痛点、定位、功能架构，但不要整段复制；用课程设计的口吻写。
   - 功能模块图：小程序 / 后端 / 数据库三层；用 draw.io 画。
   - 开发环境表：Node.js 24.x、MySQL 8.0.x、微信开发者工具、VS Code、Git。
   - 分工表：A/B 各自负责内容；写清楚“接口先行、数据库只有 A 能改、每天同步”。
2. **14:00-17:00 第 2 章**：
   - 业务流程：二手发布/购买、代取发布/接单/完成、聊天；画 2~3 张流程图。
   - 功能需求：按模块列表，标注 P0/P1/P2；不要写成产品需求文档，要落到数据库和接口。
   - 数据流图：顶层图 + 0 层图；标出外部实体（用户）、加工（发布/接单）、数据存储（items/errands/messages）。
   - 数据字典：核心表/字段的类型、约束、说明；可以按实体分表，不要把所有字段堆成一张巨表。
3. **18:00-21:00 第 3 章**：
   - 局部 ER 图：用户/商品/收藏（含属性和联系基数）。
   - 全局 ER 图：14 张表；用 11-11 画的初稿，按实际 schema 修正。
   - 实体说明：每个实体的主键、主要属性、联系。
   - 联系说明：1:1（用户-跑腿资料）、1:N（用户-商品、用户-订单）、M:N（用户-商品通过收藏）。
4. **21:00-21:20 Git**：
   - `docs/report-a` 分支提交；不要等全部写完再提交。
5. **21:30 同步**：B 的第 4/7/8/10 章进度；统一术语（例如“代取单/订单”“跑腿/接单者”）。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c docs/report-a
git add report/A章节.md report/assets/
git commit -m "docs(report): 完成第 1-3 章与 ER/数据流图"
git push -u origin docs/report-a
```

**验收**

- [ ] 第 1 章有功能模块图、环境表、分工表。
- [ ] 第 2 章有业务流程图、数据流图、数据字典。
- [ ] 第 3 章有局部/全局 ER 图，图题、图号规范。
- [ ] 图都是 draw.io 导出的清晰 PNG，不是手机拍屏。
- [ ] 术语和 B 统一。

**注意**

- 报告要求“参考毕业设计排版”，A 只负责内容；字号/行距/页眉页脚由 B 统一。
- 图号按章编：图 2-1、图 3-1；表号同理。B 最终排版时会检查。
- 不要编造数据；所有功能、表、字段都要和代码一致。

#### 11-23（一）报告第 5、6 章

**今天必须完成**

- 第 5 章 物理设计：存储引擎、字符集、索引、安全、权限。
- 第 6 章 数据库实施：建库建表、视图、存储过程、函数、触发器、事务、测试数据。
- 每个数据库对象都有“作用 + 创建语句 + 测试结果截图”。

**怎么做**

1. **09:00-12:00 第 5 章**：
   - 存储引擎：InnoDB，事务/外键/行锁。
   - 字符集：utf8mb4 + utf8mb4_0900_ai_ci，中文/emoji。
   - 索引表：索引名、表、字段、用途、对应查询；和 3.5 的索引设计一致。
   - 安全：bcrypt、JWT、参数化、权限校验、上传限制、数据库账号权限。
   - 权限：`cs_app` / `cs_readonly` 的 GRANT 和测试截图。
2. **14:00-18:00 第 6 章**：
   - 建库建表：贴 `schema.sql` 关键片段，不要整篇贴；说明建表顺序和外键。
   - 视图：4 个，每个写作用、SQL、查询结果截图。
   - 存储过程：5 个，每个写作用、参数、事务/锁、调用结果截图。
   - 函数：2 个，作用、SQL、调用结果。
   - 触发器：5 个，作用、SQL、触发前后对比截图。
   - 事务：发布商品、接单、完成订单三处；写 ACID 体现。
   - 测试数据：账号、商品、订单、消息数量；批量数据截图。
   - 每个对象都要写“解决了什么问题”，不要只贴代码。
3. **19:30-21:20 截图补齐**：
   - 检查 9.3 的数据库截图清单，缺的补。
   - 截图不要带调试面板/无关窗口；Navicat 查询结果要能看到字段名。
4. **21:30 同步**：B 的合稿时间；A 需要给 B 哪些素材（ER 图、对象截图、接口示例）。

**Git**

```bash
git switch docs/report-a
git pull origin docs/report-a
git add report/A章节.md report/assets/
git commit -m "docs(report): 完成第 5-6 章数据库设计与实施"
git push
```

**验收**

- [ ] 第 5 章索引表和实际索引一致。
- [ ] 第 6 章每个对象都有作用、SQL、截图。
- [ ] 事务和并发接单有单独小节。
- [ ] 测试数据量、截图、SQL 输出一致。
- [ ] 没有“只贴代码不解释”的段落。

**注意**

- 报告里的 SQL 必须从 `database/*.sql` 复制，不要手打，避免和实际代码不一致。
- 截图里的数据库名、表名、字段名要清晰；可以放大 Navicat 字体。
- 第 6 章是 40 分的核心，宁可多写一页，不要漏对象。

#### 11-24（二）报告第 9 章 + 参考文献 + SQL 校对

**今天必须完成**

- 第 9 章 总结与展望：完成情况、难点、不足、未来工作。
- 参考文献 5~8 篇，GB/T 7714 格式，正文有引用。
- 校对报告里所有 SQL 和代码，确保能跑。
- `docs/report-a` 合并到 `dev`，交给 B 合稿。

**怎么做**

1. **09:00-12:00 第 9 章**：
   - 完成情况：对照 P0/P1/P2 列表，哪些做了、哪些没做。
   - 难点：并发接单、触发器维护冗余、聊天轮询、Git 协作、报告与开发并行。
   - 不足：搜索是 LIKE、聊天是轮询、没有支付/后台/实名认证、没有搭子模块。
   - 未来工作：全文检索、WebSocket、平台担保、后台审核、按距离排序、AI 生成描述。
   - 不要写空话；每个难点写“怎么发现、怎么解决、学到什么”。
2. **14:00-16:00 参考文献**：
   - 数据库教材（王珊/萨师煊《数据库系统概论》）、MySQL 8.0 官方手册、Express 官方文档、微信小程序官方文档、软件工程/需求分析教材。
   - 格式按 GB/T 7714；正文引用处标 `[1]`。
   - 不要编造不存在的文献；不确定的就不写。
3. **16:00-18:00 SQL 校对**：
   - 把报告里所有 SQL 复制到 MySQL 跑一遍；不能跑的改报告或改代码。
   - 检查表名/字段名和 `schema.sql` 一致；检查存储过程参数和接口调用一致。
   - 检查截图和正文描述一致（例如截图是 3 条数据，正文写 5 条，要改）。
4. **19:30-21:20 Git**：
   - 合并 `docs/report-a` → `dev`；PR 描述写清楚包含哪些章节、哪些截图。
   - 告诉 B：“A 章节已合并，可以开始合稿；最终 docx 由你唯一编辑。”
5. **21:30 同步**：B 的合稿计划；11-25 A 的校对时间。

**Git**

```bash
git switch docs/report-a
git pull docs/report-a
git add report/A章节.md report/assets/
git commit -m "docs(report): 完成第 9 章、参考文献与 SQL 校对"
git push

# 合并到 dev
git switch dev
git pull origin dev
git merge docs/report-a
git push origin dev
# 或者开 PR → dev，B review 后合并
```

**验收**

- [ ] 第 9 章有完成情况、难点、不足、未来工作。
- [ ] 参考文献 5~8 篇，格式统一，正文有引用。
- [ ] 报告里的 SQL 全部能跑。
- [ ] `docs/report-a` 合并到 `dev`。

**注意**

- 不要在第 9 章写“由于时间不足，功能没做完”这种减分话；写成“范围控制”和“未来工作”。
- 参考文献不要只列网址；教材/手册/论文混合更规范。
- 如果 B 的合稿需要调整章节顺序，配合 B，不要抢着改 docx。

#### 11-25（三）合稿、通读、答辩数据部分

**今天必须完成**

- B 把 A/B 的 Markdown 合成最终 `report/报告.docx`；A 只 review，不直接编辑 docx。
- 通读全文，统一术语、图号、表号、页码。
- 准备答辩数据部分的讲稿（3~4 分钟）。
- 和 B 过一遍 PPT 初稿。

**怎么做**

1. **09:00-12:00 通读 A 的章节**：
   - 检查错别字、术语（“代取单”还是“订单”、“跑腿”还是“接单者”）。
   - 检查图号/表号是否连续，正文是否引用了每张图表。
   - 检查 SQL 代码块是否超页宽；建议 B 用 Consolas 五号、浅灰底纹。
   - 把意见写到 `report/A校对意见.md` 或直接发给 B，不要改 docx。
2. **14:00-16:00 答辩数据部分讲稿**：
   - 3~4 分钟，结构：数据库设计（ER/3NF/索引）→ 数据库对象（视图/过程/触发器/事务）→ 并发接单演示 → 安全/权限。
   - 准备 3 张关键截图：ER 图、并发接单一个成功一个 409、触发器前后对比。
   - 用 9.4 的 10 个问题自测，确保能用自己的话回答。
3. **16:00-18:00 和 B 过 PPT**：
   - 看每页字数、图是否清晰、数据库对象页是否只放了代码截图没有结果。
   - 给 B 提供第 5~8 页的内容：ER 图、表结构/索引、对象清单、并发时序图。
   - PPT 原则：字少图多，每页不超过 6 行。
4. **19:30-21:20 Git**：
   - B 的 `docs/final-report` 分支合并到 `dev`；A 在 PR 里 review 数据库章节。
   - 如果 A 发现事实错误，在 PR 评论里指出，由 B 改。
5. **21:30 同步**：11-26 打包分工；A 负责 readme/dump/源码清理，B 负责报告/PPT/视频。

**Git**

```bash
# B 的分支由 B 推送；A 只 review，不直接改
git switch dev
git pull origin dev
# 在 GitHub 上 review PR，评论数据库章节问题
```

**验收**

- [ ] 最终 docx 章节完整、目录/页码正确。
- [ ] 图表编号连续，正文有引用。
- [ ] A 的数据库章节没有事实错误。
- [ ] 答辩数据部分能脱稿讲 3 分钟。
- [ ] PPT 初稿和报告一致。

**注意**

- Word 是二进制文件，两个人同时改必冲突；**只有 B 能编辑最终 docx**。
- A 的校对意见用文字/批注文件给 B，不要直接改。
- 如果时间不够，优先保证数据库章节和演示截图，不要纠结排版细节。

#### 11-26（四）readme、打包、备份、M4

**今天必须完成**

- `readme.txt` 定稿：环境、启动步骤、测试账号、数据库对象、常见问题、分工。
- 清理源码：`node_modules`、`.env`、上传文件、日志、临时文件。
- 数据库最终 dump；打包 zip；按 readme 在干净目录验证。
- 合并 `dev` → `main`，打 `v1.0-m4`。
- 四类材料初版齐全：源码包、报告、PPT、视频。

**怎么做**

1. **09:00-11:00 readme**：
   - 按计划 8.6 模板；启动步骤和 11-21 干净环境实测一致。
   - 测试账号 3 个；数据库对象清单；常见问题（请求失败、图片不显示、中文乱码、手机预览）。
   - 分工写清楚 A/B；如果老师要求每人一份，准备两份命名。
2. **11:00-13:00 清理源码**：
   - 确认 `.gitignore` 生效；`git status` 干净。
   - 删除本地 `node_modules`（打包时排除，不是删仓库）；确认 `.env` 不在包内；`server/uploads` 只保留 `.gitkeep` 和演示图片（演示图片在 `server/assets/demo`，不在 uploads）。
   - 检查 `package-lock.json` 已提交；`.env.example` 在。
   - 检查没有 `console.log` 密码/token；没有临时测试文件。
3. **14:00-16:00 数据库 dump + 打包**：
   - 最终 dump：

     ```bash
     mysqldump -u root -p --databases campus_service --routines --triggers > database/campus_service_dump.sql
     ```

   - 打包目录按计划 8.7；zip 命名 `<末三位><姓名>--Campus Service Platform.zip`。
   - 压缩包内：

     ```text
     <末三位><姓名>--Campus Service Platform/
     ├─ readme.txt
     ├─ database/        # schema.sql、objects.sql、seed.sql、campus_service_dump.sql、er_diagram.png
     ├─ server/          # 源码 + package.json + package-lock.json + .env.example
     ├─ miniprogram/     # 小程序源码
     ├─ docs/            # 接口文档、测试用例、AI 辅助记录、截图
     └─ report/          # 报告、PPT（视频太大可单独提交）
     ```

   - 不要包含 `node_modules`、`.env`、`server/uploads` 的用户上传文件、`report/*.mp4`（如果太大）。
4. **16:00-18:00 干净目录验证**：
   - 把 zip 解压到 `D:\Temp\CampusCheck`；
   - 按 readme 安装依赖、导入数据库、启动后端、打开小程序；
   - 检查演示账号能登录、图片能显示、数据库对象存在。
   - 发现缺文件立刻补，重新打包。
5. **19:30-21:20 Git + M4**：
   - 合并 `chore/release-package`；
   - 开 PR `dev` → `main`，标题 `release: v1.0 M4 材料齐套`；合并后打 tag `v1.0-m4`；
   - 同步回 `dev`。
6. **21:30 同步**：11-27 彩排安排；B 的视频/PPT 是否完成。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c chore/release-package
git add readme.txt database/campus_service_dump.sql docs/postman/
git commit -m "chore: readme、最终数据库备份与发布材料"
git push -u origin chore/release-package
# PR → dev，合并

# M4
# GitHub 开 PR：base=main，compare=dev，标题 release: v1.0 M4 材料齐套
git switch main
git pull origin main
git tag -a v1.0-m4 -m "M4: 报告、PPT、视频、源码包、readme 初版齐全"
git push origin v1.0-m4
git switch dev
git merge main
git push origin dev
```

**验收**

- [ ] readme 步骤在干净目录能跑通。
- [ ] zip 不含 `node_modules`、`.env`、用户上传文件。
- [ ] 数据库 dump 能恢复，对象齐全。
- [ ] 四类材料初版齐全。
- [ ] `v1.0-m4` tag 存在。

**注意**

- 打包前先 `git status`，确认没有重要文件没提交；但报告/视频可能不在 Git，直接从工作区打包。
- 打包后再改代码，要重新打包；不要用旧 zip 提交。
- 视频太大就单独交，不要硬塞进 zip 导致上传失败。

---

### 阶段 5：彩排与提交（11-27 ~ 11-30）

#### 11-27（五）彩排

**今天必须完成**

- 按答辩流程完整走 2 遍，计时 8~10 分钟。
- 互相问 15 个问题，记录卡壳点。
- 修演示阻塞问题；PPT/讲稿调整。

**怎么做**

1. **09:00-10:30 第一遍**：
   - B 讲产品/UI，A 讲数据库；按 PPT 顺序。
   - 计时；记录哪里超时、哪里卡壳。
   - 演示环境：开发者工具 + 本机后端 + 两个账号；提前打开 Navicat/Postman。
2. **10:30-12:00 互问**：
   - 用 9.4 的 10 个数据库问题 + 计划第 10 章的 18 个问题，随机抽 15 个。
   - A 回答数据库部分，B 回答 UI/聊天部分；不会的记下来，当天补。
3. **14:00-16:00 第二遍**：
   - 按修改后的讲稿再走一遍；确保 8~10 分钟内完成。
   - 演示“并发接单”时，提前准备好两个 token 的 Postman 标签页，或录好的结果截图；现场网络不稳就用截图。
4. **16:00-18:00 修复**：
   - 只修演示阻塞问题；走 `fix/rehearsal` 分支，合并到 `dev`，必要时合并 `main`。
   - 不要改数据库结构；不要加功能。
5. **21:30 同步**：11-28 干净环境演练；11-29 最终检查。

**Git**

```bash
# 如有修复
git switch dev
git pull origin dev
git switch -c fix/rehearsal
git add <修复文件>
git commit -m "fix: 修复彩排发现的演示阻塞问题"
git push -u origin fix/rehearsal
# PR → dev；必要时再合并 main
```

**验收**

- [ ] 两遍都能在 8~10 分钟内讲完。
- [ ] 15 个问题大部分能答上来。
- [ ] 演示流程没有阻塞。
- [ ] 卡壳点有记录和补充材料。

**注意**

- 答辩时老师可能让你现场跑 SQL；提前把 Navicat 连接、数据库、常用查询准备好。
- 不要背逐字稿；记住结构和关键数字。
- 演示账号提前登录好，避免现场输密码出错。

#### 11-28（六）干净环境演练

**今天必须完成**

- 在一台“干净”的环境（另一台电脑、或删除依赖/重新 clone 的目录）按 readme 从零跑起来。
- 修掉缺失文件、路径、SQL 顺序问题。
- 确认 10 分钟内能启动。

**怎么做**

1. **09:00-12:00 干净 clone**：

   ```bash
   cd D:\Temp
   git clone https://github.com/afresh-breeze/Campus_Trading_Service_Platform.git CampusCheck
   cd CampusCheck
   git switch main
   ```

   - 按 readme 安装依赖、导入数据库、启动、打开小程序。
   - 重点检查：`database/assets/demo` 图片是否在仓库；`.env.example` 是否完整；`seed.js` 是否能跑；`uploads/.gitkeep` 是否在。
2. **14:00-16:00 修复**：
   - 缺文件补提交；路径写死改成相对路径；readme 步骤按实际调整。
   - 走 `fix/clean-env` 分支，合并 `dev`，再合并 `main`（如果影响提交版本）。
3. **16:00-18:00 录制备份**：
   - 用手机/录屏软件录一遍完整演示，作为现场故障的备份。
   - 视频放 U 盘 + 网盘；不要只放电脑本地。
4. **21:30 同步**：11-29 最终检查清单；11-30 提交方式/地点。

**Git**

```bash
git switch dev
git pull origin dev
git switch -c fix/clean-env
git add <修复文件>
git commit -m "fix: 修复干净环境启动缺失的文件与路径"
git push -u origin fix/clean-env
# PR → dev，合并；必要时再合并 main
```

**验收**

- [ ] 干净 clone 能按 readme 跑起来，10 分钟内完成。
- [ ] 演示账号能登录，图片能显示，数据库对象存在。
- [ ] 备份视频能播放。
- [ ] readme 和实际步骤一致。

**注意**

- 这一步最容易发现“演示图片没提交”“`.env.example` 少字段”“SQL 顺序错”等问题，不要跳过。
- 如果干净环境跑不起来，先修再彩排；不要指望现场环境特殊。

#### 11-29（日）最终检查与备份

**今天必须完成**

- 按 10.5 清单逐项检查。
- U 盘、网盘、邮箱三处备份。
- 打最终 tag `v1.0-final`。
- 确认提交物命名、格式、大小。

**怎么做**

1. **09:00-11:00 最终检查**：
   - 对照 10.5；重点：zip 不含 `node_modules`/`.env`；readme 账号能登录；报告/PPT/视频能打开；文件名符合要求。
   - 检查报告目录、页码、图表编号；PPT 字体没丢；视频能播放。
2. **11:00-12:00 备份**：
   - U 盘、网盘、邮箱各一份；视频单独备份。
   - 打印一份答辩讲稿和关键 SQL。
3. **14:00-16:00 最终 dry run**：
   - 按 11-30 的提交顺序模拟一遍：打开 zip、报告、PPT、视频；演示完整流程。
   - 记录最后的问题，能修的修，不能修的写进“不足”。
4. **16:00-18:00 tag**：
   - 确认 `main` 是最新提交，`git status` 干净。
   - 打 `v1.0-final` 并推送。
5. **21:30 同步**：11-30 集合时间、提交方式、U 盘谁带。

**Git**

```bash
git switch main
git pull origin main
git status
git tag -a v1.0-final -m "最终提交版本"
git push origin v1.0-final
git log --oneline -10
git tag -l
```

**验收**

- [ ] 三处备份都有。
- [ ] 最终 tag 存在。
- [ ] 提交物命名/格式/大小正确。
- [ ] 完整演示一遍无阻塞。

**注意**

- 今天之后不要再改代码；如果必须改，改完重新打包、重新备份、重新打 tag（或打 `v1.0-final2`）。
- 现场演示优先用本机；视频是备份，不是首选。

#### 11-30（一）提交与现场演示

**今天必须完成**

- 按老师要求提交源码压缩包、报告、PPT、视频。
- 现场演示，控制时间，不慌。

**怎么做**

1. 提前 30 分钟到教室/实验室，检查：
   - 电脑电量/电源、MySQL 服务、后端启动、开发者工具、Navicat/Postman。
   - 两个账号登录状态；演示数据在。
   - U 盘/网盘/视频备份。
2. 提交前最后检查文件名：
   - `<末三位><姓名>--Campus Service Platform.zip`
   - `<末三位><姓名>--Campus Service Platform.docx`
   - `<末三位><姓名>--Campus Service Platform.pptx`
   - `<末三位><姓名>--Campus Service Platform.mp4`
   - 如果老师要求每人一份，B 的那份改成 B 的学号姓名。
3. 演示按 9.4 的流程；数据库部分 A 讲，UI/聊天 B 讲；遇到问题用备份视频/截图。
4. 提交后不要在群里说“终于完了”之类；确认老师收到/拷贝成功再走。

**Git**

- 不需要再操作；确认 `main` 是最终版本即可。
- 可选：答辩后把 GitHub 默认分支改回 `main`，并在仓库首页加一个 `README.md` 介绍项目（不影响提交）。

**验收**

- [ ] 四类材料提交成功。
- [ ] 现场演示完成。
- [ ] 备份还在。

---

## 5. 数据库实施手册（40 分核心）

这一章是 A 的“主战场”，也是答辩最容易被问的部分。原则：**每个对象都要在系统里真实使用，不能只建不用。**

### 5.1 文件与执行顺序

```text
database/
├─ schema.sql              # 建库、14 张表、索引、约束
├─ objects.sql             # 视图、函数、存储过程、触发器
├─ seed.sql                # 分类、书目等静态数据
├─ campus_service_dump.sql # 最终备份（11-20/21 生成）
└─ er_diagram.png          # ER 图导出（也可放 report/assets）
```

执行顺序（Navicat 或命令行二选一）：

**Navicat（推荐）：**

1. 双击 `campus_service` 连接 → 右键 `campus_service` 库 → `新建查询`。
2. 点查询窗口的“打开文件”，选 `database/schema.sql` → 点“运行”。
3. 刷新左侧表列表，确认 14 张表都在。
4. 同样方式运行 `database/objects.sql`、`database/seed.sql`。
5. 最后在 `server` 目录执行 `npm run seed`（演示账号 + 商品）。

**命令行：**

```bash
# 1. 建库建表（会重置数据，先确认！）
mysql -u root -p < database/schema.sql

# 2. 建对象（可重复执行）
mysql -u root -p < database/objects.sql

# 3. 静态数据
mysql -u root -p < database/seed.sql

# 4. 演示账号 + 演示商品（bcrypt 哈希）
cd server
npm run seed
```

**`objects.sql` 必须是幂等的**，也就是可以反复执行。文件开头按依赖逆序写：

```sql
USE campus_service;

DROP TRIGGER IF EXISTS trg_message_after_insert;
DROP TRIGGER IF EXISTS trg_errand_status_log;
DROP TRIGGER IF EXISTS trg_item_status_log;
DROP TRIGGER IF EXISTS trg_fav_after_delete;
DROP TRIGGER IF EXISTS trg_fav_after_insert;
DROP FUNCTION IF EXISTS fn_completed_errands;
DROP FUNCTION IF EXISTS fn_unread_count;
DROP PROCEDURE IF EXISTS sp_refresh_user_credit;
DROP PROCEDURE IF EXISTS sp_get_or_create_conversation;
DROP PROCEDURE IF EXISTS sp_complete_errand;
DROP PROCEDURE IF EXISTS sp_take_errand;
DROP PROCEDURE IF EXISTS sp_publish_item;
DROP VIEW IF EXISTS v_user_summary;
DROP VIEW IF EXISTS v_conversation_base;
DROP VIEW IF EXISTS v_errand_hall;
DROP VIEW IF EXISTS v_item_list;
```

**注意事项：**

- `DELIMITER` 是 `mysql` 命令行/Navicat 的客户端指令，不是服务器 SQL；用 `mysql < objects.sql` 或 Navicat 执行没问题，用 Node 执行时不要带 `DELIMITER`。
- `schema.sql` 会 `DROP TABLE`，**有重要数据后先 dump 再执行**。
- 每次重置数据库后，小程序里的旧 token 可能指向已删除的用户；让 B 清除开发者工具缓存并重新登录。
- 执行顺序不能反：先表，再对象，再静态数据，最后 Node seed（用户密码哈希）。

### 5.2 建表顺序与外键

**建表顺序（被引用的表先建）：**

1. `users`
2. `books`
3. `categories`
4. `items`（引用 users、books、categories）
5. `item_images`（引用 items）
6. `favorites`（引用 users、items）
7. `runner_profiles`（引用 users）
8. `runner_item_sizes`（引用 runner_profiles）
9. `errand_orders`（引用 users）
10. `conversations`（引用 users）
11. `messages`（引用 conversations、users）
12. `item_status_logs`（引用 items、users）
13. `errand_status_logs`（引用 errand_orders、users）
14. `feedback`（引用 users）

**外键动作建议：**

| 外键 | 动作 | 理由 |
| --- | --- | --- |
| `items.seller_id → users` | `RESTRICT` | 有商品的用户不能直接删 |
| `item_images.item_id → items` | `CASCADE` | 商品删了，图片记录一起删 |
| `favorites.item_id → items` | `CASCADE` | 商品删了，收藏一起删 |
| `messages.conversation_id → conversations` | `CASCADE` | 会话删了，消息一起删 |
| 日志表 → 业务表 | `CASCADE` 或 `RESTRICT` | 报告里说明选择；建议 `CASCADE` 便于清理测试数据 |
| `runner_profiles.user_id → users` | `CASCADE` | 用户删了，资料一起删 |
| `runner_item_sizes.user_id → runner_profiles` | `CASCADE` | 资料删了，可接规格一起删 |

**几个容易踩的字段设计：**

- `conversations.biz_id` 用 `BIGINT NOT NULL DEFAULT 0`。唯一键 `(user_a_id, user_b_id, biz_type, biz_id)` 里如果有 NULL，MySQL 不会按“相等”去重，会插入重复会话。
- `runner_profiles.time_slots` 用 `JSON` 存具体日期/星期循环的在线计划，例如 `[{"id":"o1","type":"once","date":"2026-11-09","start":"14:00","end":"18:00"}]`。这是应用层整体读写的复合属性，报告里要说明“为了简化 MVP，暂不拆 `runner_online_schedules` 和 `runner_schedule_weekdays`；若严格按 1NF，可拆成一行一条计划 + 一行一个重复星期”。
- `runner_profiles.service_areas` 存片区数组（至少一个），`service_places` 存具体地标数组（可为空，空数组表示只按片区接单）；两者都用受控名称，严格 1NF 可拆子表，这里是为了守住 14 张表做的权衡。
- `errand_orders.pickup_area` 存片区、`pickup_place` 存地标名（只选片区时等于片区名）；`delivery_location` 也存自由文本，只用于展示、不参与匹配；取件详细地址与交付要求统一写 `remark`，不要和 `item_desc` 混用。
- `runner_item_sizes` 用复合主键 `(user_id, item_size)`，一个跑腿可同时接小/中/大件；`errand_orders.item_size` 仍是单值，因为一个订单只有一个规格。
- `books.cover_url` 存相对路径，可为 `NULL`；前端用 `BASE_URL + coverUrl`，为空显示占位图。
- `item_status_logs.changed_by`、`errand_status_logs.changed_by` 允许 `NULL`。触发器拿不到应用用户时插 NULL，避免外键报错；正常接口会通过 `@current_user_id` 写入真实用户。
- `items.favorite_count` 用 `INT NOT NULL DEFAULT 0`（有符号），配合 `GREATEST(favorite_count - 1, 0)`，不会减成负数。
- `messages.is_read` 用 `TINYINT(1) NOT NULL DEFAULT 0`；B 的已读接口按 `conversation_id + sender_id <> 当前用户` 更新。
- `errand_orders.status` 用 ENUM，状态机在应用层校验；数据库层可以加 CHECK 限制枚举（ENUM 本身已限制）。
- `errand_orders` 的时间用 `time_type + time_start + deadline` 三列：`asap` 两列都空，`deadline` 只填 `deadline`，`range` 两列都填且 `time_start < deadline`；用条件 CHECK 兜底。
- `deadline` 只是参考时间，没有“超时自动取消”；发布者撤回/接单者释放都退回 `pending`，并清空 `runner_id`、`taken_at`。
- 金额统一 `DECIMAL(10,2)`；不要用 `FLOAT`。
- 所有表 `utf8mb4`；排序规则 `utf8mb4_0900_ai_ci`。

**索引检查清单：**

| 表 | 索引 | 用途 |
| --- | --- | --- |
| `users` | `UNIQUE(student_no)` | 登录、防重复注册 |
| `books` | `UNIQUE(isbn)`、`INDEX(title(50))` | ISBN 精确查、书名前缀联想 |
| `items` | `(status, created_at)` | 首页在售列表 |
| `items` | `(book_id, status, created_at)` | 搜索结果页“同书商品优先” |
| `items` | `(category_id, price)` | 分类 + 价格筛选 |
| `items` | `(seller_id, status)` | 我的发布 |
| `item_images` | `(item_id, sort_no)` | 首图、详情图 |
| `runner_profiles` | `(is_online)`、`(availability_type)` | 找跑腿先筛在线；自动任务按类型扫描 `slot` 用户；片区与地标分别用 `JSON_CONTAINS(service_areas, ...)`、`JSON_CONTAINS(service_places, ...)` |
| `runner_item_sizes` | `(item_size, user_id)` | 按规格筛选跑腿 |
| `errand_orders` | `(status, created_at)` | 代取大厅 |
| `errand_orders` | `(publisher_id, status)`、`(runner_id, status)` | 我的代取 |
| `messages` | `(conversation_id, message_id)` | 增量拉取 |
| `conversations` | `UNIQUE(user_a_id, user_b_id, biz_type, biz_id)` | 防重复会话 |
| `favorites` | `PRIMARY KEY(user_id, item_id)` | 防重复收藏 |

### 5.3 数据库对象交付时间表

这张表决定“什么时候必须把哪个对象做出来”。**对象不要拖到 11-17 才第一次写。**

| 对象 | 类型 | 最晚完成 | 谁使用 | 备注 |
| --- | --- | --- | --- | --- |
| `v_item_list` | 视图 | 11-08 | A 首页/我的发布/收藏 | 首图子查询 |
| `v_errand_hall` | 视图 | 11-12 | B 代取大厅 | 含发布者信息 |
| `sp_publish_item` | 存储过程 | 11-09 | A 发布接口 | JSON_TABLE 多图 |
| `trg_fav_after_insert` | 触发器 | 11-10 | A 收藏 | `favorite_count + 1` |
| `trg_fav_after_delete` | 触发器 | 11-10 | A 取消收藏 | `GREATEST(...-1,0)` |
| `trg_item_status_log` | 触发器 | 11-11 | A 商品状态 | `@current_user_id` |
| `v_conversation_base` | 视图 | 11-13 | B 聊天 | 双方昵称/头像 |
| `sp_get_or_create_conversation` | 存储过程 | 11-13 | B 聊天 | 用户 ID 归一化 |
| `fn_unread_count` | 函数 | 11-13 | B 聊天 | 未读数 |
| `trg_message_after_insert` | 触发器 | 11-13 | B 聊天 | 更新最后消息 |
| `sp_take_errand` | 存储过程 | 11-13 | A 接单 | 事务 + `FOR UPDATE` |
| `trg_errand_status_log` | 触发器 | 11-13 | A 代取状态 | `@current_user_id` |
| `sp_complete_errand` | 存储过程 | 11-14 | A 完成订单 | 完成数 + 信用分 |
| `v_user_summary` | 视图 | 11-15/17 | 个人中心/报告 | 统计 |
| `fn_completed_errands` | 函数 | 11-15/17 | 个人中心 | 完成单数 |
| `sp_refresh_user_credit` | 存储过程 | 11-15/17 | 演示/维护 | 游标 |
| `cs_app` / `cs_readonly` | 权限 | 11-19 | 安全演示 | GRANT |
| 索引 | 索引 | 11-06 | 全局 | 建表时一起 |

**交接给 B 的聊天对象必须在 11-13 完成并测试。** B 的聊天后端没有这些对象就无法开始；A 不要等到 11-15 才交。

### 5.4 每个对象怎么测、怎么截图

**测试模板（每个对象都按这个来）：**

1. 展示对象定义：`SHOW CREATE VIEW` / `SHOW CREATE PROCEDURE` / `SHOW CREATE FUNCTION` / `SHOW CREATE TRIGGER`。
2. 执行一次真实调用/查询。
3. 展示结果。
4. 如果是触发器，展示“触发前 → 操作 → 触发后”的对比。
5. 如果是事务/并发，展示“两个请求一个成功一个失败”的截图。
6. 截图命名：`docs/screenshots/日期/db_对象名_说明.png`。

**示例命令：**

```sql
-- 视图
SHOW CREATE VIEW v_item_list;
SELECT * FROM v_item_list WHERE status='on_sale' ORDER BY created_at DESC LIMIT 5;

-- 存储过程
SHOW CREATE PROCEDURE sp_take_errand;
CALL sp_take_errand(1, 2, @code);
SELECT @code;

-- 函数
SELECT fn_unread_count(1, 2);
SELECT fn_completed_errands(2);

-- 触发器
SHOW TRIGGERS;
SELECT item_id, favorite_count FROM items WHERE item_id = 1;
-- 执行收藏 SQL
SELECT item_id, favorite_count FROM items WHERE item_id = 1;

-- 聊天消息触发器：图片消息只写 [图片] 预览
INSERT INTO messages (conversation_id, sender_id, msg_type, content)
VALUES (1, 1, 'image', '/uploads/demo-chat.jpg');
SELECT conversation_id, last_message, last_time FROM conversations WHERE conversation_id = 1;

-- 权限
SHOW GRANTS FOR 'cs_readonly'@'localhost';
```

**报告里每个对象写四段：**

1. 作用：解决什么问题（例如“列表页要显示首图，避免 N+1 查询”）。
2. 创建语句：关键 SQL（不要整篇贴）。
3. 测试方法：用了什么数据、什么操作。
4. 测试结果：截图 + 结论。

### 5.5 触发器与“当前用户”问题

**问题**：MySQL 触发器里没有 `req.user`，拿不到当前登录用户；但 `item_status_logs.changed_by` 需要记录是谁改的。

**解决方案**：用会话变量 `@current_user_id`，在**同一个数据库连接**上先设置，再执行 UPDATE。

**路由里的写法（商品状态）：**

```js
const conn = await pool.getConnection();
try {
  await conn.query('SET @current_user_id = ?', [req.user.userId]);
  await conn.query('UPDATE items SET status = ? WHERE item_id = ? AND seller_id = ?', [
    status, itemId, req.user.userId
  ]);
  // 或者调用存储过程，在 SP 内部 SET
} finally {
  conn.release();
}
```

**触发器里的写法：**

```sql
CREATE TRIGGER trg_item_status_log
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO item_status_logs (item_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.item_id, OLD.status, NEW.status, @current_user_id, NOW());
  END IF;
END;
```

**注意事项：**

- `SET @current_user_id` 和 `UPDATE` 必须走同一个连接；`pool.query` 两次可能用不同连接，变量会丢。
- 存储过程内部可以 `SET @current_user_id = p_runner_id;`，这样调用方不用管。
- 事件已删除：代取订单没有超时自动取消，`deadline` 只作参考；状态变化全部由用户操作触发。跑腿在线计划由 Node 定时任务维护，与 MySQL 事件无关。
- 触发器的 `changed_by` 外键要允许 NULL，手工 SQL 没设置 `@current_user_id` 时也不会报外键错误。

**这是答辩很好的素材**：老师问“触发器怎么知道谁操作的”，你能答出“应用层设置会话变量，触发器读取；因为触发器没有应用上下文”。

### 5.6 事务与并发接单

**`sp_take_errand` 的目标**：两个跑腿同时接同一单，只能有一个成功。

**核心 SQL：**

```sql
START TRANSACTION;

SELECT publisher_id, status
INTO @publisher_id, @status
FROM errand_orders
WHERE order_id = p_order_id
FOR UPDATE;

-- 不存在：404；自己发的单：403；非 pending：409
SET @current_user_id = p_runner_id;

UPDATE errand_orders
SET runner_id = p_runner_id, status = 'taken', taken_at = NOW()
WHERE order_id = p_order_id AND status = 'pending';

-- ROW_COUNT() = 1 才 COMMIT，否则 ROLLBACK
COMMIT;
```

**Node 调用要点：**

```js
const conn = await pool.getConnection();
try {
  await conn.query('CALL sp_take_errand(?, ?, @code)', [orderId, userId]);
  const [[{ code }]] = await conn.query('SELECT @code AS code');
  // code: 0 成功；403 不能接自己的单；404 不存在；409 已被接走
} finally {
  conn.release();
}
```

**为什么必须用同一个连接：**

- `@code`、`@current_user_id` 都是 MySQL 会话变量，只属于当前连接。
- `pool.query` 可能从连接池里换一个连接，变量就丢了。
- 事务、`FOR UPDATE`、`SET @变量` 都必须用 `pool.getConnection()`。

**测试步骤：**

1. Postman 登录 2023001（发布者）、2023002、2023003（跑腿），保存 3 个 token。
2. 2023001 发布一条代取单，记下 `orderId`。
3. 开两个 Postman 标签页，分别用 2023002、2023003 的 token，同时 `POST /api/errands/:id/take`。
4. 预期一个 200、一个 409；数据库 `SELECT order_id, runner_id, status FROM errand_orders WHERE order_id=?` 只有一个 `runner_id`。
5. 截图两个响应 + 数据库结果，保存到 `docs/screenshots/2026-11-13/`。

**报告里写 ACID：**

- 原子性：`START TRANSACTION` + `COMMIT/ROLLBACK`。
- 一致性：状态机 + 外键 + CHECK。
- 隔离性：InnoDB 默认 REPEATABLE READ + 行锁 `FOR UPDATE`。
- 持久性：redo log。

**常见 bug：**

- 两个请求都成功：检查是否用了 `pool.query` 而不是同一连接；检查 `WHERE status='pending'` 和 `ROW_COUNT()`；检查是否在事务外更新。
- 一个请求 500：检查 `SIGNAL`/OUT 参数、权限、外键。
- 数据库有 `runner_id` 但接口返回失败：检查 `COMMIT` 顺序和错误处理。

### 5.7 性能测试

**造数据：**

- 1000 商品、5000 消息足够；不要造 10 万，本机会卡。
- 用 `server/scripts/seed-bulk.js`；批量插入，每 100~200 条一批。
- 造完记录 `SELECT COUNT(*)` 截图。

**检查索引：**

```sql
EXPLAIN SELECT * FROM v_item_list
WHERE status='on_sale' ORDER BY created_at DESC LIMIT 10;

EXPLAIN SELECT * FROM errand_orders
WHERE status='pending' ORDER BY created_at DESC LIMIT 10;

EXPLAIN SELECT * FROM messages
WHERE conversation_id=1 AND message_id > 0 ORDER BY message_id LIMIT 20;
```

关注 `type`、`key`、`rows`、`Extra`：

- `key` 有值说明用了索引。
- `Using filesort` 不一定坏，数据量小可接受；报告里说明。
- `LIKE '%关键词%'` 通常 `type=ALL`，这是正常的；如果老师问，回答“模糊搜索没有前缀，索引失效，数据量大时用 FULLTEXT 或搜索引擎”。

**记录耗时：**

```sql
EXPLAIN ANALYZE SELECT ...;
```

把实际耗时（毫秒）写进报告；本机 < 300ms 算合格。

### 5.8 权限演示

**账号设计：**

| 账号 | 权限 | 用途 |
| --- | --- | --- |
| `root` | 全部 | 建库、建表、建对象、重置 |
| `cs_app` | SELECT/INSERT/UPDATE/DELETE/EXECUTE | 后端运行 |
| `cs_readonly` | SELECT/SHOW VIEW | 只读演示 |

**创建：**

```sql
CREATE USER 'cs_app'@'localhost' IDENTIFIED BY '强密码';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON campus_service.* TO 'cs_app'@'localhost';

CREATE USER 'cs_readonly'@'localhost' IDENTIFIED BY '另一个强密码';
GRANT SELECT, SHOW VIEW ON campus_service.* TO 'cs_readonly'@'localhost';

FLUSH PRIVILEGES;
```

**测试：**

```bash
mysql -u cs_readonly -p campus_service
```

```sql
SELECT COUNT(*) FROM items;  -- 成功
INSERT INTO categories(name, sort_no) VALUES ('test', 99);  -- ERROR 1142，被拒绝
```

**截图：**

- `SHOW GRANTS FOR 'cs_app'@'localhost';`
- `SHOW GRANTS FOR 'cs_readonly'@'localhost';`
- 只读账号 SELECT 成功、INSERT 失败。
- `cs_app` `DROP TABLE` 失败。

**`.env` 切换：**

```ini
DB_USER=cs_app
DB_PASSWORD=强密码
```

切换后重启后端，跑登录/发布/接单，确认业务正常。**root 账号保留**，用于重置数据库和建对象。

### 5.9 备份与恢复

**导出：**

```bash
mysqldump -u root -p --databases campus_service --routines --triggers > database/campus_service_dump.sql
```

- `--routines` 包含存储过程/函数；`--triggers` 包含触发器；本项目没有事件，不需要 `--events`。
- 不加这些参数，恢复后对象会丢。
- 导出的文件可能包含演示账号密码哈希，但都是假账号；不要放真实个人信息。

**恢复：**

```bash
mysql -u root -p < database/campus_service_dump.sql
```

**测试恢复：**

1. 新建空库 `campus_service_test`（或者先备份当前库）。
2. 导入 dump。
3. `SHOW TABLES`、`SHOW TRIGGERS`、`SHOW PROCEDURE STATUS` 检查对象。
4. 启动后端指向测试库，登录/发布/接单。

**什么时候备份：**

- 11-20 回归测试后。
- 11-21 冻结时。
- 任何 `schema.sql` 大改之前。
- 11-26 最终打包前。

**注意：**

- `mysqldump` 默认在 `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump`；Git Bash 能直接调用，找不到就用完整路径。
- 恢复前确认目标库，别把演示库覆盖了。
- 最终 zip 里的 dump 和 `schema.sql`/`objects.sql`/`seed.sql` 保持同一版本；不要用旧 dump 配新代码。

---

## 6. 二手模块前端手册（A 的 6 个页面）

A 的前端经验不多，这一章只讲“够用”的做法：用 B 的公共层、套 B 的样式、先保证功能闭环，再做视觉。

### 6.1 依赖 B 的公共层

A 的页面依赖这些文件（都是 B 的，A 只使用，不改）：

| 文件 | 用途 | 用法 |
| --- | --- | --- |
| `miniprogram/config.js` | `BASE_URL` | 拼接图片 URL |
| `miniprogram/utils/request.js` | 请求封装、token、401 跳登录 | `const { request, BASE_URL } = require('../../utils/request')` |
| `miniprogram/app.json` | 页面注册、tabBar | B 在 11-07 一次性注册全部 20 个页面（A 的 6 个路径先发给 B） |
| `miniprogram/app.wxss` | 全局样式/颜色/字号 | 页面用 class，不自己定义一套颜色 |
| `components/item-card` | 商品卡片 | 在页面 `.json` 里 `usingComponents` |
| `components/empty-state` | 空状态 | 传入文案/图标 |
| `components/status-tag` | 状态标签 | 传入状态枚举 |

**如果 B 的公共层还没好：**

- 页面先用假数据（`data.list` 写死 3 条）把 WXML/WXSS 写出来。
- 请求先用 `wx.request` 临时代替，11-11 前换成 B 的 `request.js`。
- 组件没有就先用页面内简单卡片，11-11 前替换；**不要自己另建一套全局样式**。

**页面注册（B 负责，A 11-07 把清单发给 B）：**

```json
{
  "pages": [
    "pages/index/index",
    "pages/item/detail",
    "pages/item/publish",
    "pages/search/result",
    "pages/mine/items",
    "pages/mine/favorites"
  ]
}
```

### 6.2 页面清单与实现顺序

| 顺序 | 页面 | 路径 | 主要功能 | 完成时间 |
| --- | --- | --- | --- | --- |
| 1 | 二手首页 | `pages/index/index` | 列表、搜索、分类、排序、刷新、加载更多；右下角圆形加号“我要卖” | 11-08 |
| 2 | 发布商品 | `pages/item/publish` | 普通/书籍、图片上传、校验 | 11-09 |
| 3 | 商品详情 | `pages/item/detail` | 轮播、卖家、收藏、联系 | 11-10 |
| 4 | 搜索结果 | `pages/search/result` | 书籍卡片、同书商品优先、商品推荐 | 11-11 |
| 5 | 我的发布 | `pages/mine/items` | 状态 tab、下架/上架/售出 | 11-11 |
| 6 | 我的收藏 | `pages/mine/favorites` | 列表、取消收藏 | 11-11 |

每个页面 4 个文件：`.js`、`.json`、`.wxml`、`.wxss`。`.json` 里写标题和组件引用：

```json
{
  "navigationBarTitleText": "校园二手",
  "usingComponents": {
    "item-card": "/components/item-card/index",
    "empty-state": "/components/empty-state/index"
  }
}
```

### 6.3 搜索结果页要点

**入口：** 首页搜索框 `bindconfirm` → `/pages/search/result?keyword=...`；首页本身不再显示搜索结果。

**页面结构（从上到下）：**

1. 顶部搜索框，回显 `keyword`，可再次搜索。
2. 书籍卡片区：请求 `GET /api/books/search?keyword=`；有匹配时横向滑动展示，每张卡片显示封面、书名、出版社、作者、ISBN。
3. 商品推荐区：请求 `GET /api/items?keyword=&page=&pageSize=`；先显示同书商品，再显示其他匹配商品。
4. 空状态：书名没匹配显示“没有找到相关书籍”；商品没匹配显示“暂无相关商品”。

**同书商品优先的实现：**

```js
async loadBooks(keyword) {
  const books = await request({ url: `/api/books/search?keyword=${encodeURIComponent(keyword)}` });
  this.setData({ books });
  if (books.length > 0) {
    const same = await request({ url: `/api/items?bookId=${books[0].bookId}&page=1&pageSize=10` });
    this.setData({ sameBookList: same.list });
  }
},

onBookTap(e) {
  const bookId = e.currentTarget.dataset.id;
  wx.navigateTo({ url: `/pages/search/result?keyword=${this.data.keyword}&bookId=${bookId}` });
}
```

- 结果页 `onLoad` 先读 `keyword` 和 `bookId`；有 `bookId` 时商品区只请求 `GET /api/items?bookId=`，标题改为“《书名》的在售商品”。
- 没有 `bookId` 时，先请求同书商品（用第一本书的 `bookId`），再请求关键词商品，按 `itemId` 去重后拼接。
- 书籍封面 `coverUrl` 为空时用占位图；图片统一 `BASE_URL + coverUrl`。

**注意：**

- 不要在前端做“书名完全相等”判断，同书判断交给 `bookId`。
- 搜索词为空时不跳结果页，首页直接提示“请输入关键词”。
- 分页只作用于商品区，书籍卡片最多 10 条，不参与分页。

### 6.4 首页示例代码

下面是最小可用版本，A 可以照着改；实际以 B 的 `request.js`/组件接口为准。

`pages/index/index.js`：

```js
const { request, BASE_URL } = require('../../utils/request');

Page({
  data: {
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    keyword: '',
    categoryId: null,
    sort: 'latest',
    categories: [],
    loading: false,
    error: false,
    baseUrl: BASE_URL
  },

  onLoad() {
    this.loadCategories();
    this.loadList(true);
  },

  async loadCategories() {
    try {
      const list = await request({ url: '/api/categories' });
      this.setData({ categories: list });
    } catch (e) {
      // 分类失败不阻塞列表
    }
  },

  async loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: false });

    try {
      const params = [
        `page=${page}`,
        `pageSize=${this.data.pageSize}`,
        `sort=${this.data.sort}`
      ];
      if (this.data.keyword) params.push(`keyword=${encodeURIComponent(this.data.keyword)}`);
      if (this.data.categoryId) params.push(`categoryId=${this.data.categoryId}`);

      const data = await request({ url: `/api/items?${params.join('&')}` });
      const list = reset ? data.list : this.data.list.concat(data.list);

      this.setData({
        list,
        page: page + 1,
        total: data.total,
        hasMore: list.length < data.total,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false, error: true });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh() {
    this.setData({ hasMore: true });
    this.loadList(true);
  },

  onReachBottom() {
    this.loadList(false);
  },

  onSearch(e) {
    const keyword = e.detail.value.trim();
    if (!keyword) return;
    wx.navigateTo({ url: `/pages/search/result?keyword=${encodeURIComponent(keyword)}` });
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/item/publish' });
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ categoryId: id === this.data.categoryId ? null : id, hasMore: true });
    this.loadList(true);
  },

  onSortChange(e) {
    this.setData({ sort: e.detail.value, hasMore: true });
    this.loadList(true);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/item/detail?id=${id}` });
  },

  retry() {
    this.loadList(true);
  }
});
```

`pages/index/index.wxml`（简化）：

```xml
<view class="page">
  <view class="search-bar">
    <input placeholder="搜索商品 / 书名 / ISBN" confirm-type="search"
           bindconfirm="onSearch" />
  </view>

  <scroll-view class="category-scroll" scroll-x>
    <view wx:for="{{categories}}" wx:key="categoryId"
          class="category-item {{categoryId === item.categoryId ? 'active' : ''}}"
          data-id="{{item.categoryId}}" bindtap="onCategoryTap">
      {{item.name}}
    </view>
  </scroll-view>

  <view class="sort-bar">
    <picker range="{{['最新发布','价格从低到高','价格从高到低']}}" bindchange="onSortChange">
      <view class="sort-text">排序：{{sort === 'latest' ? '最新' : (sort === 'price_asc' ? '价格升' : '价格降')}}</view>
    </picker>
  </view>

  <view wx:if="{{error}}" class="state">
    <text>加载失败</text>
    <button size="mini" bindtap="retry">重试</button>
  </view>

  <view wx:elif="{{list.length === 0 && !loading}}" class="state">
    <text>暂无商品，换个关键词试试</text>
  </view>

  <view wx:else class="list">
    <view wx:for="{{list}}" wx:key="itemId" class="card" data-id="{{item.itemId}}" bindtap="goDetail">
      <image class="cover" src="{{item.coverUrl ? baseUrl + item.coverUrl : '/images/placeholder.png'}}" mode="aspectFill" />
      <view class="info">
        <view class="title">{{item.title}}</view>
        <view class="price">￥{{item.price}}</view>
        <view class="meta">{{item.sellerNickname}}</view>
      </view>
    </view>
  </view>

  <view wx:if="{{loading}}" class="loading">加载中...</view>
  <view wx:if="{{!hasMore && list.length > 0}}" class="end">没有更多了</view>

  <view class="fab" bindtap="goPublish">＋</view>
</view>
```

`pages/index/index.wxss`（简化，实际用 B 的全局样式）：

```css
.page { padding: 24rpx; background: #f5f6f8; min-height: 100vh; }
.search-bar { background: #fff; border-radius: 32rpx; padding: 16rpx 24rpx; margin-bottom: 20rpx; }
.category-scroll { white-space: nowrap; margin-bottom: 20rpx; }
.category-item { display: inline-block; padding: 12rpx 28rpx; margin-right: 16rpx; background: #fff; border-radius: 28rpx; color: #666; }
.category-item.active { background: #2b7fff; color: #fff; }
.sort-bar { margin-bottom: 20rpx; color: #666; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { display: flex; background: #fff; border-radius: 20rpx; padding: 20rpx; }
.cover { width: 180rpx; height: 180rpx; border-radius: 16rpx; flex-shrink: 0; }
.info { margin-left: 20rpx; flex: 1; }
.title { font-size: 30rpx; color: #222; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.price { color: #ff4d4f; font-size: 34rpx; font-weight: 600; margin-top: 12rpx; }
.meta { color: #999; font-size: 24rpx; margin-top: 12rpx; }
.state, .loading, .end { text-align: center; color: #999; padding: 40rpx 0; }
.fab { position: fixed; right: 40rpx; bottom: 140rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: #2b7fff; color: #fff; font-size: 60rpx; line-height: 100rpx; text-align: center; box-shadow: 0 8rpx 24rpx rgba(43, 127, 255, 0.35); }
```

**注意：**

- 上面的颜色只是示例；B 的 `app.wxss` 定了主色后，用 B 的 class/变量，不要各写一套。
- `BASE_URL` 从 B 的 `config.js`/`request.js` 来；图片相对路径要拼。
- `hasMore` 用 `list.length < total` 判断；如果后端返回的 `total` 很大，分页正确。
- 搜索用 `encodeURIComponent`，不要直接拼中文。

### 6.5 发布页要点

**表单字段：**

- 模式：普通 / 书籍。
- 普通：标题、描述、价格、原价、成色、可议价、分类、位置、图片。
- 书籍：先搜索书目（书名/ISBN/作者），选中后带出作者/出版社；没有匹配则手动填写书名、作者、出版社、ISBN、版次，提交前调 `POST /api/books`。
- 图片：最多 3 张；上传后显示缩略图；可删除；提交时传 `[{ url, sortNo }]`。

**上传代码示例：**

```js
chooseImages() {
  const remain = 3 - this.data.images.length;
  if (remain <= 0) return;
  wx.chooseMedia({
    count: remain,
    mediaType: ['image'],
    success: async (res) => {
      for (const file of res.tempFiles) {
        const url = await this.uploadOne(file.tempFilePath);
        if (url) {
          this.setData({ images: this.data.images.concat({ url, sortNo: this.data.images.length + 1 }) });
        }
      }
    }
  });
},

uploadOne(filePath) {
  return new Promise((resolve) => {
    wx.uploadFile({
      url: `${BASE_URL}/api/upload`,
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${wx.getStorageSync('token')}` },
      success: (res) => {
        try {
          const body = JSON.parse(res.data);
          if (body.code === 0) resolve(body.data.url);
          else { wx.showToast({ title: body.message || '上传失败', icon: 'none' }); resolve(null); }
        } catch (e) { resolve(null); }
      },
      fail: () => { wx.showToast({ title: '上传失败', icon: 'none' }); resolve(null); }
    });
  });
}
```

**提交校验：**

- 标题非空、≤100 字。
- 价格 > 0，最多两位小数。
- 分类必选。
- 书籍模式必须有 `bookId`（或手动创建书目成功）。
- 图片至少 1 张（产品上建议；如果时间紧可以允许 0 张，但演示效果差）。
- `submitting` 防重复点击。
- 成功后 `wx.redirectTo` 到详情或 `wx.switchTab` 到首页；根据 tabBar 配置选择。

**常见问题：**

- `wx.uploadFile` 返回的 `res.data` 是字符串，要 `JSON.parse`。
- 上传接口需要 token；不要忘记 `Authorization`。
- 图片临时路径不能直接存数据库；必须上传后拿 URL。
- 选 4 张时 `count` 要限制剩余数量。

### 6.6 详情页要点

- `onLoad(options.id)` 保存 `itemId`，`loadDetail()`。
- 轮播：`swiper` + `image`，`mode="aspectFill"`；点击 `wx.previewImage`。
- 价格：`￥{{detail.price}}`；原价加删除线；成色/分类用标签。
- 卖家卡片：头像、昵称、信用分；点击可进主页（MVP 可不做）。
- 收藏按钮：显示 `favoriteCount`；点击调 `POST/DELETE /api/items/:id/favorite`；成功后重新拉详情或本地更新。
- 联系卖家：

  ```js
  wx.navigateTo({
    url: `/pages/chat/detail?peerId=${this.data.detail.sellerId}&bizType=item&bizId=${this.data.detail.itemId}`
  });
  ```

- 状态：`on_sale` 在售、`reserved` 已预订、`sold` 已售出、`off_shelf` 已下架；已售出/下架时收藏/联系按钮是否禁用，按产品决定。
- `isOwner=true`（`GET /api/items/:id` 返回）时，详情页显示「卖家管理」，隐藏收藏和联系卖家；买家只看到状态标签，不显示管理按钮。
- 卖家管理按钮按状态显示：在售 → 标记预订 / 标记售出 / 下架；已预订 → 取消预订 / 标记售出；已下架 → 重新上架；已售出 → 无操作。点击调 `PUT /api/items/:id/status`，成功后 `loadDetail()`；403 / 409 用 toast 提示。
- 从聊天页顶部卡片进入详情时，卖家可直接改状态；返回聊天页后聊天页 `onShow` 会重新拉 context，把卡片状态刷新成最新值。
- 详情页和「我的发布」共用同一个状态接口，权限规则不能在前端复制一份判断；前端只决定按钮显隐，后端仍然校验卖家身份和非法跳转。
- `onShow` 重新拉一次，防止从聊天/收藏返回后状态过期。
- 图片 404：用本地占位图兜底。

### 6.7 我的发布 / 我的收藏

**我的发布：**

- tabs：在售 `on_sale`、已预订 `reserved`、已售 `sold`、已下架 `off_shelf`。
- 列表复用卡片；每个卡片底部操作按钮：
  - 在售：标记预订、下架、标记售出。
  - 已预订：取消预订、标记售出。
  - 已下架：重新上架。
  - 已售出：无操作。
- 操作前 `wx.showModal` 确认；操作后刷新当前 tab。
- 空状态：“还没有发布过商品，去发布一个吧”，带按钮跳发布页。
- 下拉刷新、上拉加载。

**我的收藏：**

- 列表用 `GET /api/favorites`；卡片显示商品状态。
- 取消收藏：`wx.showModal` 确认 → `DELETE /api/items/:id/favorite` → 从列表移除。
- 点击卡片进详情；如果商品已预订/下架/售出，详情页仍可看，状态标签照常显示。
- 空状态：“还没有收藏，去逛逛吧”。

### 6.8 UI 与异常状态

**统一风格（以 B 的 `app.wxss` 为准）：**

- 主色、辅助色、文字色（主/次/弱）、背景色、卡片圆角、间距。
- 字号：标题 30~34rpx，正文 26~28rpx，辅助 22~24rpx。
- 单位用 `rpx`，按 750rpx 设计宽度。
- 图片 `mode="aspectFill"`，加圆角。
- 按钮加 `hover-class`，不要用默认样式裸奔。
- 卡片阴影/边框统一，不要每个页面不一样。

**每个页面必须有三种状态：**

1. 加载中：`wx.showLoading` 或骨架屏/“加载中...”。
2. 空：`empty-state` 组件，文案具体（“暂无商品，换个关键词”）。
3. 错误：显示“加载失败”+ 重试按钮；`wx.showToast` 提示具体原因。

**其他：**

- 所有可点击区域给 `hover-class`/按压反馈。
- 表单错误提示靠近字段，不要只弹 toast。
- 防重复点击：提交按钮 `loading`/`disabled`。
- 返回页面刷新：`onShow` 重新拉关键数据。
- 长文本：标题两行截断，描述可展开。
- 金额保留两位小数；后端返回数字，前端 `toFixed(2)` 显示。

### 6.9 联调测试清单

**功能：**

- [ ] 首页列表、搜索、分类、排序、下拉刷新、上拉加载。
- [ ] 首页右下角圆形加号能进发布页。
- [ ] 搜索结果页：书籍卡片字段完整；点击卡片按 `bookId` 过滤；同书商品优先；无书籍时仍显示商品。
- [ ] 发布普通商品、书籍商品；图片上传、删除；表单校验。
- [ ] 详情轮播、卖家信息、收藏/取消、联系卖家跳转；卖家本人可见状态管理，买家不可见。
- [ ] 我的发布四个 tab、标记预订/取消预订、下架/上架/售出。
- [ ] 我的收藏列表、取消收藏、进详情。

**边界：**

- [ ] 搜索不存在的关键词 → 空列表，不报错。
- [ ] 价格 0 / 负数 / 非数字 → 校验提示。
- [ ] 标题超长 → 截断/校验。
- [ ] 不上传图片 → 按产品规则处理。
- [ ] 选 4 张图 → 限制为 3 张。
- [ ] 上传 txt / 超大图 → 拒绝并提示。
- [ ] token 过期 → 401 → 跳登录。
- [ ] 后端没启动 → 错误提示“网络错误/请检查后端”。
- [ ] 非卖家在我的发布里看不到别人的商品。
- [ ] 已下架商品在首页不出现，在我的发布里能看到。

**跨账号：**

- [ ] A 发布，B 能看到；B 收藏，A 的详情收藏数 +1。
- [ ] B 不能改 A 的商品（403）。
- [ ] 两个账号收藏同一商品，计数正确。

**UI：**

- [ ] 三种状态都有。
- [ ] 图片不拉伸、不溢出。
- [ ] 颜色/字号和 B 的页面一致。
- [ ] 真机/模拟器都试一次（至少开发者工具）。

---

## 7. Git 异常处理手册

这一章建议遇到问题时再来查，不要提前背。**先 `git status`，再动手。**

### 7.1 GitHub 连不上

**症状：**

```text
fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443 after 21000 ms
```

或者 `git push` 一直卡住、超时。

**先判断：**

```bash
git ls-remote origin
curl -I https://github.com
```

- 两个都失败：网络问题（校园网/运营商/防火墙）。
- `curl` 成功但 `git` 失败：Git 代理配置问题。

**处理顺序：**

1. **换网络**：手机热点、校园网换宿舍网、重启路由器。GitHub 在国内经常不稳定。
2. **如果浏览器能打开 GitHub，但 Git 不行**，配置代理（把端口换成你代理软件的 HTTP 端口，常见 7890/10809）：

   ```bash
   git config --global http.proxy http://127.0.0.1:7890
   git config --global https.proxy http://127.0.0.1:7890
   git ls-remote origin
   ```

   不用代理时取消：

   ```bash
   git config --global --unset http.proxy
   git config --global --unset https.proxy
   ```

3. **如果代理是 SOCKS5**：

   ```bash
   git config --global http.proxy socks5://127.0.0.1:7890
   git config --global https.proxy socks5://127.0.0.1:7890
   ```

4. **仍然不行**：先本地 `commit`，把仓库文件夹复制到 U 盘/网盘备份；网络恢复后 `git push`。不要因为 push 失败就停止工作。
5. **长期连不上**：和 B 商量是否临时用 Gitee 镜像；但不要自己偷偷换远程地址，避免两个人不同步。

**检查代理是否生效：**

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

**注意：**

- 代理配置是全局的，不会进仓库，不会提交。
- 不要用 `git config --global url."...".insteadOf` 之类的复杂配置，除非你确定在做什么。
- 如果 `git push` 提示认证失败，检查 Git Credential Manager 是否登录了正确的 GitHub 账号。

### 7.2 push 被拒绝

**症状：**

```text
! [rejected]        dev -> dev (fetch first)
error: failed to push some refs to ...
hint: Updates were rejected because the remote contains work that you do not have locally.
```

**原因**：远程有你本地没有的提交（B 先 push 了）。

**处理：**

```bash
git pull origin <你的分支>
# 如果有冲突，按 7.3 解决
git push origin <你的分支>
```

如果是 feature 分支，只有你一个人用，通常不会遇到；遇到说明 B 动过你的分支，先问 B。

**绝对不要：**

```bash
git push --force
```

强推会覆盖别人的提交，可能丢失 B 的工作。

### 7.3 解决冲突

**什么时候会遇到：**

- 本地 `git merge dev` 提示 `CONFLICT`。
- GitHub PR 显示 `This branch has conflicts that must be resolved`。
- `git pull` 提示冲突。

**冲突文件长这样：**

```text
<<<<<<< HEAD
你的分支的代码
=======
dev 分支的代码
>>>>>>> dev
```

**解决步骤：**

1. `git status` 看哪些文件冲突（`both modified`）。
2. 用 VS Code 打开冲突文件；搜索 `<<<<<<<`。
3. 读懂两边代码，决定最终内容：
   - 保留你的：删掉 `=======` 和 `>>>>>>>` 之间的内容。
   - 保留对方的：删掉 `<<<<<<<` 到 `=======` 之间的内容。
   - 都要：手动合并成一段。
   - **不要保留任何 `<<<<<<<`、`=======`、`>>>>>>>` 标记。**
4. 保存文件，`git add <文件>`。
5. `git commit -m "merge: 解决 xxx 冲突"`。
6. `git push`。

**VS Code 的合并编辑器：**

- 打开冲突文件，点 `Resolve in Merge Editor`。
- `Current Change` = 你当前分支（HEAD）；`Incoming Change` = 被合并进来的分支（通常是 dev）。
- 可以点 `Accept Current`、`Accept Incoming`、`Accept Both`，也可以手动编辑。
- 选完保存，再 `git add` + `git commit`。

**PR 冲突：**

```bash
git switch feature/你的分支
git pull origin feature/你的分支
git switch dev
git pull origin dev
git switch feature/你的分支
git merge dev
# 解决冲突
git add <文件>
git commit -m "merge: 同步 dev 并解决冲突"
git push origin feature/你的分支
```

PR 会自动变成可合并。

**常见冲突文件：**

- `server/src/app.js`：路由挂载。规避：A 一次挂完，B 不改。
- `miniprogram/app.json`：页面注册。规避：B 一次注册完。
- `docs/接口文档.md`：两个人同时编辑。规避：分段落，改前 pull。
- `server/package.json`：依赖。规避：A 独占。
- `database/schema.sql`：B 提需求，A 改。规避：不让 B 直接改。
- `report/报告.docx`：Word 二进制。规避：只有 B 编辑。

**如果冲突太乱、想放弃这次合并：**

```bash
git merge --abort
```

回到合并前状态，再想清楚重来。**不要在冲突未解决时 commit。**

### 7.4 提交到错误分支

**情况 1：提交到了 `dev`，还没 push**

```bash
git log --oneline -3          # 找到刚才的提交
git reset --soft HEAD~1       # 撤销提交，改动还在工作区
git switch -c feature/xxx     # 从当前 dev 切新分支
git add <文件>
git commit -m "feat(xxx): ..."
```

**情况 2：提交到了 `dev`，已经 push**

- 不要强推改历史。
- 如果代码是正确的，只是历史不干净：在群里说一声，继续用；课程项目不扣历史分。
- 如果必须撤回某次提交：`git revert <commit-hash>`（安全，生成一个新提交抵消），再 push。
- 不要让 B 的历史被覆盖。

**情况 3：提交到了错误的功能分支**

```bash
git log --oneline -5          # 找到提交 hash
git switch 正确分支
git cherry-pick <hash>        # 把这次提交复制过来
git switch 错误分支
git reset --soft HEAD~1       # 如果还没 push，撤销错误分支上的提交
```

`cherry-pick` 可能产生新冲突，按 7.3 解决。新手尽量一次只在一个分支上干活，避免这种情况。

### 7.5 误提交 .env / node_modules / 大文件

**`.env` 被提交：**

```bash
git rm --cached server/.env
# 确认 .gitignore 有 .env
git add .gitignore
git commit -m "chore: 移除误提交的 .env"
git push
```

- 如果已经 push，Git 历史里仍然能看到密码；**立刻修改数据库密码/JWT_SECRET**，并告诉 B 重新拉 `.env`。
- 课程项目不需要重写历史；删掉当前文件 + 改密码即可。
- 检查：`git log --all -- server/.env` 应该没有输出（历史里没有）。

**`node_modules` 被提交：**

```bash
git rm -r --cached server/node_modules
git add .gitignore
git commit -m "chore: 移除误提交的 node_modules"
git push
```

如果历史里已经很大，不要尝试重写历史；后续不再提交即可。

**大文件（视频/压缩包）被暂存：**

```bash
git restore --staged report/系统演示.mp4
# 确认 .gitignore 有 report/*.mp4
git status
```

不要提交 >100MB 的文件，GitHub 会拒绝。视频用网盘/U 盘提交。

**检查有没有敏感文件：**

```bash
git status
git ls-files | grep -E "\.env|node_modules|\.mp4"
```

正常情况下应该没有输出。

### 7.6 撤销与暂存

**放弃某个文件的未提交修改：**

```bash
git restore <文件>
```

**这会丢失你在这个文件里的修改**；不确定就先 `git stash` 或复制一份。

**取消暂存（文件内容保留）：**

```bash
git restore --staged <文件>
```

**撤销最近一次 commit，改动保留：**

```bash
git reset --soft HEAD~1
```

**撤销最近一次 commit，改动也丢弃（危险）：**

```bash
git reset --hard HEAD~1
```

不要在没有确认的情况下用 `--hard`。

**暂存当前工作，去处理别的事：**

```bash
git stash push -m "wip: 首页加载更多"
git stash list
# 处理完别的事，回到原分支
git stash pop
```

- `stash pop` 会把暂存内容恢复并删除 stash；如果怕丢，用 `git stash apply` 恢复但保留 stash，确认无误再 `git stash drop`。
- 同一天多个 stash 时，用 `-m` 写清楚，避免恢复错。

### 7.7 合并到一半想放弃

```bash
git status
git merge --abort
```

只对 `git merge` 有效；`git pull` 产生的合并也可以用 `git merge --abort`（如果 Git 提示支持）。

如果已经 commit 了合并，但想撤回：

```bash
git reset --soft HEAD~1
```

然后重新决定。

### 7.8 永远不要用的命令

除非你完全理解后果，否则不要：

```bash
git push --force
git reset --hard
git clean -fd
git checkout .
git checkout -- .
git branch -D <未合并分支>
git filter-branch
rm -rf .git
```

这些命令会覆盖/删除别人的或你自己的未提交工作。课程项目里没有必要用。

### 7.9 卡住时怎么求助

**先自己查 5 分钟：**

```bash
git status
git log --oneline --graph --all -10
git remote -v
git branch -vv
```

**然后给 B/我发消息，包含：**

1. 你想做什么（例如“把 feature/item-list 合并到 dev”）。
2. 你执行了什么命令。
3. 完整报错（不要只截一行）。
4. `git status` 输出。
5. 最近 5 条提交。

**不要做的事：**

- 不要因为报错就删除 `.git` 文件夹。
- 不要强行 `push --force`。
- 不要在没有备份的情况下 `reset --hard`。
- 不要同时开两个 IDE/终端在同一个仓库里操作。

---

## 8. 和 B 的协作规则

两个人做项目，技术问题好解决，协作问题最容易翻车。这一章是“避免互相等待/互相覆盖”的规则。

### 8.1 每日 15 分钟同步

每天 21:30，按这个模板发（微信/语音都行）：

```text
日期：11-XX
A 今天完成：
- ...
A 明天计划：
- ...
A 当前阻塞：
- ...
需要 B：
- ...

B 今天完成：
- ...
B 明天计划：
- ...
B 当前阻塞：
- ...
需要 A：
- ...
```

**同步要确认的三件事：**

1. 明天各自做什么，有没有依赖。
2. 接口有没有变更，文档更新了吗。
3. 有没有人卡住超过 30 分钟。

**阻塞规则**：任何问题卡超过 30 分钟，立刻在群里说，不要一个人闷头搞 2 小时。

### 8.2 接口变更流程

**只增不改**是原则。必须改时：

1. 在群里说：改哪个接口、为什么、影响谁、什么时候改完。
2. 先改 `docs/接口文档.md`，B 确认。
3. A 改后端，B 改页面。
4. 两边都测过再合并。

**不允许：**

- 后端字段名悄悄从 `coverUrl` 改成 `cover_url`。
- 返回结构从 `{ list, total }` 改成数组。
- 错误码从 409 改成 400 不告诉 B。
- B 在页面里写死假数据，不接接口就提 PR。

### 8.3 交接清单

| 日期 | A 交给 B | B 交给 A |
| --- | --- | --- |
| 11-05 | 14 张表清单、20 个页面清单、接口文档 v0.1、文件归属表 | GitHub 用户名、确认分工 |
| 11-06~07 | DDL、`/api/health` 可用 | `app.json` 注册全部 20 个页面（含 A 的 6 个）、`config.js` |
| 11-07 | 注册/登录/me、3 个演示账号、seed 数据 | 登录/注册页、`request.js` 初版、401 跳登录 |
| 11-08 | 分类/书目/列表接口 | `request.js` 稳定版、`item-card`/`empty-state` 组件 |
| 11-09 | 上传接口、发布接口、`POST /api/books` | 发布页字段确认 |
| 11-10 | 详情/收藏接口、收藏触发器 | 详情页收藏按钮联调 |
| 11-11 | 我的发布/收藏接口、状态修改、搜索结果页 | 二手闭环 UI 测试 |
| 11-12 | 跑腿资料/上下线/发布/大厅/找跑腿接口 | 代取页面字段确认 |
| 11-13 | 接单事务、状态日志、**聊天数据库对象** | 聊天 API 进度、代取页面 |
| 11-14 | 完成/撤回/释放/取消接口、信用分 | 聊天页面联调 |
| 11-15 | 数据库对象第一批、代取联调修复 | 代取页面完成 |
| 11-16 | M2 联调、接口文档最终版 | 聊天全流程、M2 测试 |
| 11-17~18 | 数据库对象、触发器、性能截图 | UI 走查、截图整理 |
| 11-19 | 安全/权限截图 | UI 负向测试 |
| 11-20 | 后端测试记录、Postman 集合、dump | 测试用例文档 |
| 11-21 | 冻结检查、readme 初稿 | 截图齐全、PPT 启动 |
| 11-22~24 | 报告第 1/2/3/5/6/9 章 | 报告第 4/7/8/10 章 |
| 11-25 | 数据库章节校对意见、答辩数据讲稿 | 最终 docx、PPT 初稿 |
| 11-26 | readme、dump、源码包、M4 | 报告/PPT/视频初版 |
| 11-27~29 | 数据库演示、答辩问题 | 彩排、视频备份 |

**交接时附一句话**：“这个东西在哪个文件/分支，怎么验证，有什么坑。” 不要只说“做好了”。

### 8.4 冲突高发文件

| 文件 | 为什么会冲突 | 规避 |
| --- | --- | --- |
| `server/src/app.js` | 两个人都挂路由 | A 一次挂完，B 不改 |
| `miniprogram/app.json` | 两个人都加页面 | B 一次注册完，A 只使用 |
| `docs/接口文档.md` | 同时编辑同一段 | A 写自己的模块段，B 写聊天段；改前 pull |
| `server/package.json` | 两个人加依赖 | A 独占；B 要加先问 |
| `database/schema.sql` | B 想加字段 | 只有 A 改；B 提需求 |
| `docs/AI辅助开发记录.md` | 两个人追加 | 拆成 `-A.md`/`-B.md`，11-25 合并 |
| `docs/测试用例.md` | 两个人填结果 | B 主笔，A 写 `docs/A测试记录.md` |
| `report/报告.docx` | Word 二进制 | 只有 B 编辑；A 用 Markdown |
| `report/答辩PPT.pptx` | 二进制 | 只有 B 编辑；A 给素材 |
| `miniprogram/app.wxss` | 两个人都改全局样式 | B 独占；A 用 class |

**如果必须改对方的文件：**

1. 先在群里说“我要改 xxx，因为 yyy，可以吗”。
2. `git pull origin dev` 拉最新。
3. 小改动，别顺手重构/格式化整个文件。
4. 走自己的分支 + PR，让对方 review。

### 8.5 PR 审查清单

**A 看 B 的 PR 时重点看：**

- [ ] `server/src/routes/chat.js` 有没有 SQL 注入、越权（非会话参与者能不能拉消息）。
- [ ] 有没有改 `database/`、`app.js`、`package.json`（这些应该 A 同意）。
- [ ] 有没有提交 `.env`、`node_modules`、大文件。
- [ ] 聊天接口返回是否符合文档。
- [ ] 页面有没有硬编码假数据、没接接口。
- [ ] 有没有 `console.log` token/密码。

**B 看 A 的 PR 时重点看：**

- [ ] 接口字段是否和 `docs/接口文档.md` 一致。
- [ ] 页面是否用了 B 的组件/样式，有没有另起一套。
- [ ] 有没有改 `app.json`/`app.wxss`/B 的页面。
- [ ] 页面的空/加载/错误状态。
- [ ] 有没有提交 `.env`、`node_modules`、大文件。

**两个人都不确定的**：先合并到 feature 分支测，不要直接进 `dev`/`main`。

### 8.6 如果进度落后

**先判断落后多少：**

- 落后 1 天：晚上/周末补，里程碑不动。
- 落后 2~3 天：按下面顺序砍功能。
- 落后 3 天以上：和 B 开一次 30 分钟会，重新分配任务。

**A 的砍功能顺序（从先砍到后砍）：**

1. 书籍 ISBN 联想（保留手动填写书目）。
2. 我的收藏页（保留收藏按钮和数据库表/接口）。
3. 多图上传（改成 1 张图）。
4. 首页价格区间筛选（保留关键词搜索和分类）。
5. 商品浏览量 `view_count`。
6. 我的发布里的“标记预订 / 取消预订”（保留标记售出、下架/上架）。

**绝对不能砍：**

- 14 张表、主外键、索引、CHECK。
- 注册/登录/鉴权。
- 二手列表/详情/发布。
- 代取接单事务（并发防重）。
- 4 视图、5 存储过程、2 函数、5 触发器（40 分的核心）。
- 报告第 6 章。
- 演示账号和 readme。

**如果 A 实在做不完二手 6 个页面：**

- 和 B 商量，把“我的收藏”“我的发布”两个页面给 B（A 保留接口和数据库）；或者只做首页/详情/发布/搜索 4 个 P0 页面。
- 这是应急方案，不是默认分工；改分工要在群里说清楚，避免重复/遗漏。

**如果 B 的页面/聊天落后：**

- A 不要抢着写 B 的页面，先保证后端/数据库/报告；B 的模块延迟会影响 M2，但不影响 A 的 40 分。
- 如果 B 在 11-16 还没完成聊天，和 B 一起决定：砍未读红点，保留文字与图片聊天和会话列表；或者 A 帮忙看服务端 bug，但代码由 B 提。

**里程碑底线：**

- 11-21 功能冻结不能动。
- 11-26 材料齐套不能动。
- 11-30 提交不能动。
- 其他任务都可以挪/砍。

---

## 9. 报告、PPT、视频（A 的部分）

> 这一章解决三件事：**A 写哪些章节、什么时候交、怎么和 B 合稿**；**答辩讲什么、怎么演示**；**材料怎么命名、怎么打包**。
>
> 一条总原则：**A 只写 Markdown、SQL 和截图，最终 `.docx` / `.pptx` 由 B 统一排版。** 二进制文件两个人同时改，Git 一定会冲突，而且 Word 的冲突几乎没法自动合并。

### 9.1 材料总览与时间表

| 材料 | 负责人 | 初版完成 | 定稿 | 存放位置 | 说明 |
| --- | --- | --- | --- | --- | --- |
| A 的论文章节 | A | 11-24 18:00 | 11-25 review | `report/A章节.md` | 第 1/2/3/5/6/9 章 + 参考文献 |
| 最终报告 | B 合稿，A 校对 | 11-25 | 11-29 | `report/报告.docx` | 只有 B 能编辑 docx |
| 答辩 PPT | B 排版，A 供第 5~8 页内容 | 11-25 | 11-26 | `report/答辩PPT.pptx` | 12 页左右 |
| 系统视频 | B 剪辑，A 录数据库片段 | 11-26 | 11-29 | `report/系统演示.mp4` | 6~8 分钟 |
| readme | A | 11-26 | 11-29 | `readme.txt` | 账号、启动步骤、对象清单 |
| 数据库备份 | A | 11-26 | 11-29 | `database/campus_service_dump.sql` | 含例程、触发器 |
| 源码压缩包 | A 打包，B 检查 | 11-26 | 11-29 | `<末三位><姓名>--Campus Service Platform.zip` | 不含 node_modules/.env |
| 答辩讲稿 + 问答 | A 写数据库部分，B 写系统部分 | 11-25 | 11-27 | `docs/答辩讲稿.md` | A 的讲稿见 9.4 |
| 三处备份 | A/B 各备一份 | — | 11-29 | U 盘 + 网盘 + 邮箱 | 断网也能放视频 |

**三条硬规则：**

1. **11-26（M4）所有材料必须有初版**，允许不完美，但不能“还没开始”。
2. **11-29 定稿并三处备份**，之后只改错别字和演示阻塞问题，不再动结构。
3. **11-30 提交后不再改**，避免交上去的版本和演示版本不一致。

### 9.2 报告章节分工与写作要点

#### 9.2.1 章节分工总表

| 章节 | 内容 | 负责人 | 初稿截止 | 主要素材来源 |
| --- | --- | --- | --- | --- |
| 第 1 章 | 项目概况：任务、问题、功能模块、环境、分工 | A | 11-22 | 项目方案总结、实际代码 |
| 第 2 章 | 需求分析：角色、流程、功能/非功能需求、DFD、数据字典 | A | 11-22 | 接口文档、页面清单 |
| 第 3 章 | 概念设计：局部/全局 ER 图、实体与联系 | A | 11-22 | `schema.sql`、draw.io |
| 第 4 章 | 逻辑设计：关系模式、3NF 论证、表结构 | B | 11-22 | A 的 `schema.sql` |
| 第 5 章 | 物理设计：存储引擎、字符集、数据类型、索引、安全 | A | 11-23 | `schema.sql`、`objects.sql` |
| 第 6 章 | 数据库实施：DDL、视图、过程、函数、触发器、事务、测试 | A | 11-23 | 全部 SQL + 截图 |
| 第 7 章 | 系统实现：架构、核心代码、界面 | B | 11-23 | `server/`、`miniprogram/` |
| 第 8 章 | 系统测试：测试用例、结果、缺陷 | B | 11-23 | `docs/测试用例.md` |
| 第 9 章 | 总结与展望：完成情况、难点、不足、未来工作 | A | 11-24 | 开发记录、bug 记录 |
| 第 10 章 | 系统使用简介：环境、启动、账号、操作步骤 | B | 11-24 | `readme.txt` |
| 专题 | 大模型辅助开发：用了什么、怎么用、效果与边界 | B（A 供数据库素材） | 11-24 | `docs/AI辅助开发记录.md` |
| 参考文献 | 8 篇左右，GB/T 7714 | A | 11-24 | 见 9.2.8 |
| 封面/摘要/目录/排版 | 按学校毕业设计模板 | B | 11-25 | 学校模板 |

**合稿顺序：**

1. 11-22 晚：A 交第 1~3 章，B 交第 4 章。
2. 11-23 晚：A 交第 5~6 章，B 交第 7~8 章。
3. 11-24 晚：A 交第 9 章 + 参考文献；B 交第 10 章 + AI 专题 + 排版。
4. 11-25：B 合成 `报告.docx`，A 只 review 数据库章节，意见写在 `report/A校对意见.md` 或 PR 评论里。

#### 9.2.2 第 1 章 项目概况怎么写

建议结构：

```text
1.1 项目背景与任务
1.2 要解决的问题
1.3 系统功能模块
1.4 开发环境与技术选型
1.5 小组分工与协作方式
```

**必须有的图表：**

- 图 1-1 系统功能模块图：小程序端 / 后端 / 数据库三层，二手、代取、聊天、个人中心四个模块。
- 表 1-1 开发环境：Windows 10/11、Node.js 24.x、MySQL 8.0.x、微信开发者工具稳定版、VS Code、Git。
- 表 1-2 分工表：A 数据库 + 后端主线 + 二手模块；B 小程序公共层 + 登录/个人中心 + 代取 + 聊天 + 材料。

**写作要点：**

- 背景从“校园二手信息分散、代取匹配慢、沟通要加好友”切入，两三段即可。
- 明确写出“本课程设计聚焦数据库设计与实现”，不要写成纯产品策划。
- 功能模块只写实际做的，不做的放到第 9 章“不足与展望”。
- 技术选型要写理由：MySQL 关系模型适合展示数据库对象；Express 手写 SQL 便于报告展示；原生小程序减少环境风险。

**常见扣分点：**

- 大段复制产品方案，口语化、宣传化。
- 功能清单和实际系统不一致，报告写了“搭子模块”但系统没有。
- 没有分工，老师无法判断两个人各自做了什么。

#### 9.2.3 第 2 章 需求分析怎么写

建议结构：

```text
2.1 用户角色与权限
2.2 业务流程分析
2.3 功能需求
2.4 非功能需求
2.5 数据流图
2.6 数据字典
```

**2.1 用户角色**：游客、普通用户（买家/卖家）、跑腿、系统维护（后台统计）。用一张表写清“角色—能做什么—不能做什么”。

**2.2 业务流程**：至少 3 张流程图：

- 图 2-1 二手交易流程：注册登录 → 发布/浏览 → 搜索（独立结果页，书籍卡片 + 同书商品优先） → 详情 → 收藏 → 联系卖家 → 线下交易 → 标记售出。
- 图 2-2 代取流程：发布订单 → 先找跑腿（在线/片区+地标/时间要求/规格匹配） → 没合适的发布大厅 → 接单锁单 → 完成 / 撤回 / 释放 / 取消。
- 图 2-3 聊天流程：从商品/订单发起 → 获取或创建会话 → 轮询拉消息 → 标记已读。
- 图 2-4 上线流程：个人页接单设置/代取页上线入口 → 填写范围/在线计划（具体日期或星期循环）/规格/报价 → 保存 → 自动上下线或手动上线/下线；进行中循环下线要选“只这一次/取消之后所有”。

**2.3 功能需求**：按模块列成表，标注 P0/P1/P2。不要只写“用户可以发布商品”，要落到数据：

| 编号 | 功能 | 输入 | 处理 | 输出 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| F-01 | 发布商品 | 标题、价格、分类、图片 | 校验 → 调 `sp_publish_item` → 写 items/item_images | 商品 ID | P0 |
| F-02 | 接单 | 订单 ID、当前用户 | 校验状态 → `sp_take_errand` 行锁 → 更新 runner_id | 新状态 taken | P0 |
| F-03 | 发送消息 | 会话 ID、内容 | 校验参与者 → 插入 messages → 触发器更新会话 | 消息 ID | P0 |

**2.4 非功能需求**：性能（列表 1 秒内返回、消息 3 秒轮询）、安全（bcrypt、JWT、参数化、越权校验）、可用性（加载/空/错误三态）、可维护性（统一响应、统一错误码）。

**2.5 数据流图**：

- 图 2-5 顶层图：用户 ↔ 校园服务平台 ↔ 数据库。
- 图 2-6 0 层图：发布商品、浏览搜索、收藏、发布代取、接单、聊天 6 个加工，数据存储标 `items`、`favorites`、`errand_orders`、`messages`。
- 数据流名称用名词，加工名称用“动词 + 名词”，不要画成程序流程图。

**2.6 数据字典**：不要把所有字段堆成一张巨表，按“数据项 / 数据结构 / 数据流 / 数据存储 / 处理过程”分小节。示例：

| 数据项 | 含义 | 类型/长度 | 约束 | 来源 |
| --- | --- | --- | --- | --- |
| `item_id` | 商品编号 | BIGINT | 主键、自增 | `items.item_id` |
| `title` | 商品标题 | VARCHAR(100) | 非空 | `items.title` |
| `price` | 售价 | DECIMAL(10,2) | ≥ 0 | `items.price` |
| `status` | 商品状态 | ENUM | on_sale/reserved/sold/off_shelf | `items.status` |

数据存储示例：`items` = 商品编号 + 卖家编号 + 分类编号 + 书目编号 + 标题 + 描述 + 价格 + 原价 + 成色 + 状态 + 浏览量 + 收藏数 + 发布时间（`campus` 为多校区预留字段，MVP 不采集）。

**常见扣分点：**

- 只有文字没有图；DFD 和 ER 混在一起。
- 数据字典字段类型和 `schema.sql` 不一致。
- 功能需求没有优先级，后面砍功能时无法解释。

#### 9.2.4 第 3 章 概念设计怎么写

建议结构：

```text
3.1 概念模型概述
3.2 局部 ER 图
3.3 全局 ER 图
3.4 实体与联系说明
3.5 冲突消除
3.6 关系模式转换（简要，详细放第 4 章）
```

**局部 ER 图**至少 3 张：

- 图 3-1 用户—商品—收藏：用户 1:N 商品，用户 M:N 商品（通过收藏），商品 1:N 图片，分类 1:N 商品，书目 1:N 商品。
- 图 3-2 用户—代取订单—跑腿资料：用户 1:N 发布订单，用户 1:N 接单，用户 1:1 跑腿资料，跑腿资料 1:N 可接规格（`runner_item_sizes`）。
- 图 3-3 用户—会话—消息：用户 M:N 会话，会话 1:N 消息，用户 1:N 发送消息。

**全局 ER 图（图 3-4）**：把 14 张表合到一张图，标出主键、联系基数、可选联系（订单的 runner_id 可为空）。图太大就分两张：交易域、代取与聊天域。

**冲突消除**要写具体：

- 命名冲突：`users` 在商品域叫“卖家”，在订单域叫“发布者/接单者”，统一用 `user_id` 外键。
- 属性冲突：商品价格和代取报酬都用 `DECIMAL(10,2)`，单位统一为元。
- 结构冲突：收藏是 M:N，拆成 `favorites` 联合主键表；跑腿资料是 1:1，直接以 `user_id` 为主键。

**关系模式转换**只列结果，例如：

```text
users(user_id, student_no, password_hash, nickname, campus, ...)
items(item_id, seller_id, category_id, book_id, title, price, status, ...)
favorites(user_id, item_id, created_at)   -- 主键 (user_id, item_id)
```

**常见扣分点：**

- ER 图用截图/手绘，线条交叉、字看不清。
- 只画实体不标联系基数。
- 局部图和全局图矛盾，例如全局图里 `book_id` 变成必填。

#### 9.2.5 第 5 章 物理设计怎么写

建议结构：

```text
5.1 存储引擎与字符集
5.2 数据类型选择
5.3 索引设计
5.4 冗余字段与反规范化
5.5 安全设计
5.6 数据库账号与权限
5.7 备份策略
```

**5.1**：InnoDB（事务、外键、行锁、崩溃恢复）；`utf8mb4` + `utf8mb4_0900_ai_ci`（中文、emoji）；每条理由一句话。

**5.2 数据类型表**：

| 场景 | 选型 | 理由 |
| --- | --- | --- |
| 主键 | BIGINT UNSIGNED AUTO_INCREMENT | 容量大、顺序写入 |
| 金额 | DECIMAL(10,2) | 精确计算，不用 FLOAT |
| 状态 | ENUM | 取值受限、可读性好 |
| 时间 | DATETIME | 业务时间，不受时区转换影响 |
| 长文本 | TEXT | 商品描述 |
| 布尔 | TINYINT(1) | 是否议价、是否已读 |
| 多图 | JSON | 发布商品时在存储过程内用 `JSON_TABLE` 展开 |
| 在线计划 | JSON | 存 `runner_profiles.time_slots`，Node 层解析 `once`/`weekly` 后做时间重叠匹配；`node-cron` 每分钟自动上下线 |

**5.3 索引表**：和 3.5 一致，至少写 10 行，列“索引名、表、字段、用途、对应查询”。

**5.4 冗余字段**：`items.favorite_count`、`conversations.last_message` / `last_time`。写清“为什么冗余、谁维护、代价是什么、怎么核对”。核对 SQL 示例：

```sql
UPDATE items i
SET favorite_count = (SELECT COUNT(*) FROM favorites f WHERE f.item_id = i.item_id);
```

**5.5 安全**：bcrypt 加盐、JWT 过期、参数化查询、越权校验（卖家才能改商品、接单者才能完成、会话参与者才能看消息）、上传类型/大小限制。

**5.6 权限**：`cs_app` 只有业务库 CRUD；`cs_readonly` 只有 SELECT；root 只用于建库和备份。贴 GRANT 语句和测试截图。

**5.7 备份**：`mysqldump --routines --triggers`，说明备份频率、存放位置、恢复步骤。

**常见扣分点：**

- 索引表和实际 `SHOW INDEX` 不一致。
- 只写“用了 InnoDB”，不写为什么。
- 权限只写一句“设置了权限”，没有 GRANT 和测试。

#### 9.2.6 第 6 章 数据库实施怎么写（40 分核心）

建议结构：

```text
6.1 建库与建表
6.2 视图（4 个）
6.3 存储过程（5 个）
6.4 函数（2 个）
6.5 触发器（5 个）
6.6 代取状态机与撤回/释放
6.7 事务与并发控制
6.8 测试数据与性能测试
6.9 权限验证与备份恢复
```

**每个数据库对象统一用这个模板写：**

```text
6.x.y 对象名
（1）作用：一句话说明解决什么问题，在系统哪个接口/页面使用。
（2）创建语句：从 database/objects.sql 原样复制，保留缩进。
（3）调用示例：CALL/SELECT 语句和参数。
（4）测试结果：图 6-x，说明返回了什么、关键字段是什么。
（5）设计说明：为什么用视图/过程/触发器，有什么代价。
```

**对象清单与写作重点：**

| 类型 | 数量 | 名称 | 写作重点 |
| --- | --- | --- | --- |
| 视图 | 4 | `v_item_list`、`v_errand_hall`、`v_conversation_base`、`v_user_summary` | 解决了哪些多表 JOIN；列表页如何复用 |
| 存储过程 | 5 | `sp_publish_item`、`sp_take_errand`、`sp_complete_errand`、`sp_get_or_create_conversation`、`sp_refresh_user_credit` | 事务边界、行锁、游标 |
| 函数 | 2 | `fn_unread_count`、`fn_completed_errands` | 确定性、返回值、在查询中的调用 |
| 触发器 | 5 | 收藏 +1/-1、商品状态日志、代取状态日志、会话最后消息 | 触发器不知道“当前用户”，用会话变量补 |
| 事务 | 3 处 | 发布商品、接单、完成订单 | ACID 如何体现、回滚测试 |
| 权限 | 2 个账号 | `cs_app`、`cs_readonly` | GRANT、允许/拒绝对比 |

**事务与并发单独一节**，写清：

1. 发布商品：`items` + `item_images` 同一事务，任何一步失败全部回滚。
2. 接单：`SELECT ... FOR UPDATE` + 条件 `UPDATE` + `affectedRows` 判断 + 409。
3. 完成订单：更新订单状态 + 跑腿完成数 + 信用分，同一事务。
4. 贴两个会话的测试过程：一个成功、一个等待后失败。

**状态机单独写**：`pending → taken → completed`；`pending → cancelled`；`taken → pending`（发布者撤回 / 接单者释放）；`taken → completed`（发布者确认）。说明 `taken` 本身就是锁单，订单从大厅消失、不能被重复接；`taken` 不能直接到 `cancelled`，撤回/释放会清空 `runner_id`、`taken_at`，日志表保留操作轨迹；`deadline` 只是参考，不做超时自动取消。

**测试数据**：3 个账号、20 条以上商品、10 条以上代取单、20 条以上消息、5 条以上在线跑腿资料（含多选规格、`once` 和 `weekly` 在线计划）；性能测试造 1000 商品、5000 消息，贴 `EXPLAIN` 和查询耗时。

**常见扣分点：**

- 只贴代码，不写作用、不贴结果截图。
- 5 个存储过程只写了 2 个，或者对象在系统里根本没调用。
- 事务只写“用了事务”，没有回滚/并发测试。
- 截图里看不到字段名或结果行。

#### 9.2.7 第 9 章 总结与展望怎么写

建议结构：

```text
9.1 完成情况
9.2 主要难点与解决过程
9.3 存在的不足
9.4 未来工作
9.5 收获与体会
```

**9.1 完成情况**：对照 P0/P1/P2 列表逐项打勾，写清数据库对象数量、接口数量、页面数量、测试用例通过率。

**9.2 难点**至少写 4 个，每个按“问题—原因—解决—学到什么”写：

- 并发接单重复：`FOR UPDATE` + 条件更新 + 409。
- 触发器维护冗余：收藏数、最后消息；会话变量传递当前用户。
- 聊天轮询：3 秒增量拉取、`afterId`、未读函数。
- 两人 Git 协作：分支、PR、冲突解决、文件归属。
- 报告与开发并行：边开发边截图，避免最后补图。

**9.3 不足**：搜索是 `LIKE`、聊天是轮询、没有支付/后台/实名认证、没有搭子模块、找跑腿只按片区+地标+在线计划+规格筛选、自动上下线依赖 Node 服务常驻、没有按真实距离或评分排序。每条写“影响是什么、当前怎么规避”。

**9.4 未来工作**：全文索引/Elasticsearch、WebSocket、平台担保交易、管理员后台与审核、按距离排序、AI 生成商品描述、移动端适配。

**9.5 收获**：数据库设计从“画表”到“对象 + 事务 + 权限”的完整落地；Git 协作；AI 辅助开发的边界。

**常见扣分点：**

- 写成流水账或空话（“我学到了很多”）。
- 把没做的功能说成“时间不够”，改成“范围控制”和“未来工作”。
- 难点没有解决过程，只列名词。

#### 9.2.8 参考文献怎么写

按 GB/T 7714，正文引用处标 `[1]`。建议 8 篇，教材 + 官方文档 + 安全规范混合：

```text
[1] 王珊, 萨师煊. 数据库系统概论[M]. 5版. 北京: 高等教育出版社, 2014.
[2] 张海藩, 牟永敏. 软件工程导论[M]. 6版. 北京: 清华大学出版社, 2013.
[3] SILBERSCHATZ A, KORTH H F, SUDARSHAN S. Database System Concepts[M]. 7th ed. New York: McGraw-Hill, 2019.
[4] Oracle Corporation. MySQL 8.0 Reference Manual[EB/OL]. https://dev.mysql.com/doc/refman/8.0/en/.
[5] OpenJS Foundation. Express.js Documentation[EB/OL]. https://expressjs.com/.
[6] 腾讯公司. 微信官方文档·小程序[EB/OL]. https://developers.weixin.qq.com/miniprogram/dev/framework/.
[7] OWASP Foundation. SQL Injection Prevention Cheat Sheet[EB/OL]. https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html.
[8] OpenJS Foundation. Node.js Documentation[EB/OL]. https://nodejs.org/en/docs/.
```

**注意：**

- 出版年份/版次以你实际查到的为准，不要编造。
- 正文至少引用其中 5 篇，不能只在文末堆列表。
- 网址类文献注明访问日期（如 `[2026-11-24]`），按学校模板要求调整。
- 不要引用百度百科、CSDN 博客作为主要文献。

#### 9.2.9 写报告的 6 个操作习惯

1. **从代码复制 SQL**，不要手打；报告里的 SQL 必须能直接跑。
2. **先放图占位**：`![图 6-1 v_item_list 查询结果](assets/ch6/fig6-1_v_item_list.png)`，图后写图题。
3. **每张图表在正文都要被引用**：“如图 3-1 所示”“见表 5-1”。
4. **术语全文统一**，见 9.7.3 的术语表。
5. **截图和正文数字一致**：截图 3 条数据，正文就写 3 条。
6. **每天写完就提交**，不要攒到 11-24 一次提交。

### 9.3 截图与素材清单

#### 9.3.1 命名与存放规则

```text
report/assets/
├─ ch1/fig1-1_module.png
├─ ch1/fig1-2_architecture.png
├─ ch2/fig2-1_item-flow.png
├─ ch2/fig2-4_dfd-top.png
├─ ch3/fig3-1_local-er-user-item.png
├─ ch3/fig3-2_local-er-runner-errand.png
├─ ch3/fig3-3_local-er-chat-feedback.png
├─ ch3/fig3-4_global-er.png
├─ ch3/fig3-4_global-er-overview.png  # 可选：全局总览
├─ ch5/table5-1_index.png          # 可选：索引设计表截图
├─ ch6/fig6-1_tables.png
├─ ch6/fig6-2_v_item_list.png
├─ ch7/fig7-a-01_index.png         # A 的小程序截图，加 a_ 前缀
├─ ch7/fig7-b-01_login.png         # B 的截图，加 b_ 前缀
└─ source/                          # ER 图 SVG 源文件
   ├─ fig3-1_local-er-user-item.svg
   ├─ fig3-2_local-er-runner-errand.svg
   ├─ fig3-3_local-er-chat-feedback.svg
   ├─ fig3-4_global-er.svg
   └─ fig3-4_global-er-overview.svg
```

规则：

- 文件名用**小写英文 + 数字 + 下划线**，不要中文、空格、括号，避免 Word 路径失效。
- A 和 B 都可能往 `ch7/` 放图，用 `a_` / `b_` 前缀区分，最终由 B 统一编号。
- 图片统一 PNG，宽度 1600~1920px，单张不超过 2MB。
- 每张图在 Markdown 里用相对路径，方便 B 直接粘进 Word。
- draw.io 源文件也提交，方便后面改图。

#### 9.3.2 数据库截图清单（A 必交，约 32 张）

| # | 截图内容 | 建议操作 | 预期结果 | 用在哪 |
| --- | --- | --- | --- | --- |
| 1 | 数据库表清单 | 刷新 Navicat 左侧表列表 / `SHOW TABLES;` | 14 张表 | 6.1 |
| 2 | 用户/书目/分类表结构 | `DESC users; DESC books; DESC categories;` | 字段、类型、键 | 6.1 |
| 3 | 商品表结构与索引 | `SHOW CREATE TABLE items\G` | 完整 DDL、索引 | 6.1 |
| 4 | 订单/消息表结构 | `DESC errand_orders; DESC messages;` | 字段、索引 | 6.1 |
| 5 | 跑腿资料/规格表 | `DESC runner_profiles; DESC runner_item_sizes;` | JSON 字段、复合主键 | 6.1 |
| 6 | 外键与约束 | 查 `information_schema.TABLE_CONSTRAINTS` | FK、UNIQUE、CHECK | 6.1 |
| 7 | `v_item_list` 查询 | `SELECT * FROM v_item_list LIMIT 5;` | 商品 + 卖家 + 分类 + 首图 | 6.2 |
| 8 | `v_errand_hall` 查询 | `SELECT * FROM v_errand_hall LIMIT 5;` | 待接单 + 发布者 | 6.2 |
| 9 | `v_conversation_base` 查询 | `SELECT * FROM v_conversation_base LIMIT 5;` | 双方昵称/头像 | 6.2 |
| 10 | `v_user_summary` 查询 | `SELECT * FROM v_user_summary LIMIT 5;` | 发布数、收藏数、完成数 | 6.2 |
| 11 | 发布商品成功 | `CALL sp_publish_item(...); SELECT @item_id;` | 商品 + 多图写入 | 6.3 |
| 12 | 发布商品回滚 | 故意传非法图片 JSON 或不存在分类 | 两表都不留数据 | 6.3/6.7 |
| 13 | 接单成功 | `CALL sp_take_errand(...);` | 状态 pending → taken | 6.3 |
| 14 | 并发接单失败 | 两个会话/两个 Postman 同时接单 | 一个成功，一个 409/错误 | 6.3/6.7 |
| 15 | 完成订单 | `CALL sp_complete_errand(...);` | completed、完成数 +1、信用分变化 | 6.3 |
| 16 | 获取或创建会话 | 连续调用两次 `sp_get_or_create_conversation` | 返回同一个 conversation_id | 6.3 |
| 17 | 信用分刷新 | `CALL sp_refresh_user_credit();` | 游标逐用户更新 | 6.3 |
| 18 | 未读数函数 | `SELECT fn_unread_count(1, 2);` | 未读条数 | 6.4 |
| 19 | 完成单数函数 | `SELECT fn_completed_errands(2);` | 完成单数 | 6.4 |
| 20 | 收藏触发器 +1 | 收藏前后查 `favorite_count` | 数量 +1 | 6.5 |
| 21 | 取消收藏触发器 -1 | 删除收藏前后查 | 数量 -1 | 6.5 |
| 22 | 商品状态日志 | 更新商品状态后查 `item_status_logs` | 新增一条日志 | 6.5 |
| 23 | 代取状态日志 | 接单/完成后查 `errand_status_logs` | 状态变更记录 | 6.5 |
| 24 | 消息触发器 | 分别插入 text / image 消息后查 `conversations` | 预览为截断文本 / `[图片]`，`last_time` 更新 | 6.5 |
| 25 | 发布者撤回接单 | 接单后发布者调 `/cancel` | 状态回 `pending`，`runner_id`/`taken_at` 为空 | 6.6 |
| 26 | 接单者释放 + 过期不取消 | 接单者调 `/release`；再造一条过期 pending 单 | 订单回大厅；过期单仍是 `pending` | 6.6 |
| 27 | 列表查询走索引 | `EXPLAIN SELECT ... FROM items WHERE status='on_sale' ORDER BY created_at DESC;` | `key` 命中索引 | 6.8 |
| 28 | 跑腿匹配先按在线过滤 | `EXPLAIN SELECT ... FROM runner_profiles WHERE is_online=1;` | `key` 命中 `idx_runner_online`；片区和地标再用 `JSON_CONTAINS` 过滤 | 6.8 |
| 29 | 批量测试数据 | `SELECT COUNT(*) FROM items; SELECT COUNT(*) FROM messages;` | 1000 / 5000 | 6.8 |
| 30 | 权限对比 | `cs_app` 能增删改查；`cs_readonly` 只能 SELECT | DELETE 被拒绝 | 6.9 |
| 31 | 备份与恢复 | dump 文件 + 恢复到新库后查表 | 对象齐全 | 6.9 |
| 32 | 两个会话行锁 | 会话 1 `FOR UPDATE`，会话 2 等待 | 第二个阻塞/超时 | 6.7 |

**截图要求：**

- Navicat 最大化，左侧表/视图树和右侧结果网格都露出来；结果网格要能看到字段名。
- SQL 先格式化，关键字大写，避免一行超长。
- 结果行数控制在 5~10 行，太多看不清；需要证明数量时另截 `COUNT(*)`。
- 终端截图要包含“命令 + 输出”，不要只截输出。
- 不要出现密码、token、手机号、真实姓名；演示数据用“张同学/李同学”。

#### 9.3.3 小程序截图清单（A 的 6 个页面）

| # | 页面 | 状态 | 截图内容 | 用在哪 |
| --- | --- | --- | --- | --- |
| 1 | 二手首页 | 正常 | 卡片列表、价格、成色、收藏数、右下角圆形加号 | 7.1 |
| 2 | 二手首页 | 加载中 | 骨架屏/加载提示 | 7.1 |
| 3 | 二手首页 | 空 | 无商品提示 + 去发布按钮 | 7.1 |
| 4 | 二手首页 | 错误 | 网络失败 + 重试按钮 | 7.1 |
| 5 | 搜索结果 | 书籍命中 | 书籍卡片（封面/书名/出版社/作者/ISBN）+ 下方商品 | 7.2 |
| 6 | 搜索结果 | 同书过滤 | 点击书籍卡片后只显示该书商品 | 7.2 |
| 7 | 搜索结果 | 无结果 | 无书籍/无商品提示 | 7.2 |
| 8 | 商品详情 | 正常 | 轮播、价格、卖家、收藏按钮 | 7.3 |
| 9 | 商品详情 | 已收藏 | 收藏按钮高亮、收藏数 +1 | 7.3 |
| 10 | 发布商品 | 普通模式 | 表单、图片上传、议价开关 | 7.4 |
| 11 | 发布商品 | 书籍模式 | ISBN/书名/作者/出版社 | 7.4 |
| 12 | 发布商品 | 校验失败 | 价格为空/图片未传的提示 | 7.4 |
| 13 | 我的发布 | 正常 | 在售/已预订/已售/已下架标签、操作按钮 | 7.5 |
| 14 | 我的收藏 | 正常 | 收藏列表、取消收藏 | 7.5 |
| 15 | 并发接单 | 失败提示 | 第二个账号点接单收到“已被接单” | 7.6/6.7 |

#### 9.3.4 图表（draw.io）清单

| 图号 | 内容 | 截止 | 备注 |
| --- | --- | --- | --- |
| 图 1-1 | 系统功能模块图 | 11-22 | 三层：小程序/后端/数据库 |
| 图 1-2 | 技术架构图 | 11-22 | HTTP + JWT + mysql2 + 本地图片 |
| 图 2-1 | 二手交易流程图 | 11-22 | 含发布、独立搜索页、收藏、售出 |
| 图 2-2 | 代取流程图 | 11-22 | 含先找跑腿、发布大厅、接单锁单、撤回/释放、完成/取消 |
| 图 2-3 | 聊天流程图 | 11-22 | 含轮询、已读 |
| 图 2-4 | 上线/接单设置流程图 | 11-22 | 两个入口、自动/手动上下线、计划列表、循环下线弹窗、修改循环提醒、回填上次数据 |
| 图 2-5 | 顶层 DFD | 11-22 | 用户 ↔ 系统 ↔ 数据库 |
| 图 2-6 | 0 层 DFD | 11-22 | 6 个加工、4 个数据存储 |
| 图 3-1 | 局部 ER（用户/商品/收藏） | 11-22 | 标基数 |
| 图 3-2 | 局部 ER（代取/跑腿/规格） | 11-22 | 标基数 |
| 图 3-3 | 局部 ER（会话/消息） | 11-22 | 标基数 |
| 图 3-4 | 全局 ER（14 表） | 11-22 | 可分两张 |
| 图 6-x | 对象测试截图 | 11-23 | 见 9.3.2 |
| 图 8-x | 测试相关图 | B 负责 | A 提供并发/权限素材 |

**画图规范：**

- 白底黑字，统一字体（微软雅黑/宋体），字号不小于 12。
- 实体用矩形，联系用菱形，属性用椭圆；主键加下划线。
- 线条尽量不交叉，图太大就拆图。
- 导出 PNG 时选 2x/300dpi，不要用截图工具截 draw.io 画布。
- 图题在图下方，格式“图 3-1 局部 ER 图”；表题在表上方，格式“表 5-1 索引设计”。

#### 9.3.5 截图质量检查（提交前逐条看）

- [ ] 没有个人信息、密码、token、真实手机号。
- [ ] 没有微信/QQ 弹窗、浏览器书签栏、桌面杂物。
- [ ] 字体足够大，投影到教室屏幕能看清。
- [ ] SQL 结果有字段名，能看出关键字段值。
- [ ] 每张图都能在正文找到“如图 x-x 所示”。
- [ ] 图片没有拉伸变形，没有模糊。
- [ ] 同一章截图风格一致（主题、缩放、窗口大小）。

### 9.4 答辩讲稿、演示流程与问答

#### 9.4.1 时间分配（总计 8~10 分钟）

| 时间 | 内容 | 讲者 | PPT |
| --- | --- | --- | --- |
| 0:00-0:40 | 开场、项目一句话、分工 | B | P1 |
| 0:40-1:40 | 背景、痛点、目标、功能范围 | B | P2-P3 |
| 1:40-2:20 | 技术架构与选型 | B | P4 |
| 2:20-3:20 | 数据库概念设计：14 表、ER、3NF | A | P5 |
| 3:20-4:20 | 逻辑/物理设计：字段、索引、冗余 | A | P6 |
| 4:20-5:35 | 数据库对象：视图/过程/函数/触发器 | A | P7 |
| 5:35-6:50 | 核心业务与并发接单 | A | P8 |
| 6:50-7:50 | 系统演示：二手、代取、聊天 | B（A 协助数据库部分） | P9 |
| 7:50-8:30 | 测试与安全 | B | P10 |
| 8:30-9:20 | 难点、不足与展望 | A/B | P11 |
| 9:20-9:40 | 总结 | B | P12 |

**A 实际讲 4~5 分钟**（2:20-6:50 + 8:30 后一小段）。彩排时用手机计时，超过 7 分钟就砍细节，不要砍并发接单。

#### 9.4.2 A 的讲稿（约 4 分钟，可直接背）

> 各位老师好，我是成员 A，负责数据库设计和后端主线。下面由我介绍数据库部分。
>
> 先看概念设计。系统一共 14 张表，围绕用户、二手商品、代取订单、聊天四条主线。我们先画局部 ER 图，再合并成全局 ER 图，消除了命名冲突和属性冲突。设计满足 3NF：书目信息拆到 `books`，商品图片拆到 `item_images`，跑腿设置拆到 `runner_profiles`，可接规格因为多选拆到 `runner_item_sizes`，状态变更拆到日志表，所以非主属性都完全依赖主键，没有传递依赖。`runner_profiles.time_slots` 用 JSON 存单次/星期循环的在线计划，是应用层整体读写的权衡，报告里会说明。
>
> 逻辑和物理设计上，主键统一用 BIGINT 自增，金额用 DECIMAL(10,2)，状态用 ENUM，字符集是 utf8mb4，存储引擎是 InnoDB。索引按真实查询建：`items(status, created_at)` 支撑首页在售列表，`items(category_id, price)` 支撑分类和价格筛选，`items(seller_id, status)` 支撑我的发布，`messages(conversation_id, message_id)` 支撑增量拉消息。我们还保留了两个冗余字段：`items.favorite_count` 和 `conversations.last_message`，用触发器维护，避免列表页频繁 COUNT 和子查询。这是有意的反规范化，报告里写了权衡。
>
> 数据库对象方面，4 个视图分别支撑商品列表、代取大厅、会话列表和个人统计；5 个存储过程覆盖发布商品、接单、完成订单、获取会话和信用分刷新；2 个函数计算未读数和完成单数；5 个触发器维护收藏数、状态日志和会话最后消息。所有对象都在系统里真实调用，不是只写在 SQL 文件里。
>
> 代取订单的时间要求用 `time_type + time_start + deadline` 三列表达“尽快 / 截止时间 / 时间范围”，`deadline` 只作参考，不判断超时、不自动取消，只用于找跑腿时和跑腿的在线计划做重叠匹配。发布者可以撤回接单，接单者也可以释放接单，订单都会退回大厅 `pending`；`taken` 不能直接变 `cancelled`，必须先回 `pending`，这样状态变化都有明确操作人，日志可追溯。
>
> 最关键的难点是并发接单。两个跑腿同时点接单，只能有一个成功。我们用事务加 `SELECT ... FOR UPDATE` 锁住订单行，检查状态必须是 pending，再用带 `status='pending'` 条件的 UPDATE，判断 `affectedRows` 是否为 1，最后提交。第二个请求会等待锁释放，然后看到状态已经变成 taken，返回 409。这个流程我们在答辩现场会用两个窗口演示。
>
> 安全方面，密码用 bcrypt 加盐哈希，接口用 JWT，SQL 全部参数化，数据库建了 `cs_app` 和 `cs_readonly` 两个账号，应用只给业务库 CRUD 权限，演示账号只有 SELECT 权限。我的部分就到这里，下面由 B 演示系统功能。

**背诵方法：**

- 按“概念设计 → 逻辑物理 → 对象 → 并发 → 安全”五段背，每段记 3 个关键词。
- 不要逐字背 SQL，记住对象数量和 1~2 个代表对象即可。
- 语速控制在每分钟 200 字左右，4 分钟约 800 字。

#### 9.4.3 现场演示流程（数据库部分，5 步）

**提前准备：**

- 在 `database/demo_checks.sql` 里按顺序写好演示 SQL，每段加注释；11-27 前反复练。
- Navicat 开好连接，标签页排好：表清单、视图、过程、触发器、权限。
- 小程序停在我的发布页，后端已启动，演示账号已登录。
- 两个终端/两个 Postman 窗口准备好并发接单请求。

**演示步骤：**

| 步骤 | 操作 | 预期 | 失败时 |
| --- | --- | --- | --- |
| 1 | `SHOW TABLES;` + 展开 4 个视图、5 个过程 | 14 表、对象齐全 | 用截图/备份视频 |
| 2 | 查 `v_item_list`、`v_user_summary` | 多表 JOIN 结果正确 | 用预存结果截图 |
| 3 | 小程序发布商品 → 刷新 `items`/`item_images` | 商品和多图都写入 | 用 seed 数据讲解 |
| 4 | 两个窗口同时接同一单 | 一个成功，一个 409 | 用备份视频 |
| 5 | 收藏商品 → 查 `favorite_count`；发消息 → 查 `conversations.last_message` | 触发器生效 | 用前后对比截图 |
| 6（可选） | `cs_readonly` 执行 DELETE；`EXPLAIN` 列表查询 | 被拒绝；命中索引 | 口头说明 |

**演示原则：**

- 先讲“我要演示什么”，再操作，最后说“结果说明什么”。
- 每一步不超过 30 秒；不要现场改 SQL、不要现场修 bug。
- 失败不要慌，直接说“这个环节我准备了备份视频”，切视频继续。
- 演示数据提前准备好，不要现场注册、现场上传大图。

#### 9.4.4 10 个必答问题（数据库方向）

**Q1：你的表为什么满足 3NF？举例说明。**

A：以商品为例，书目信息（书名、作者、出版社、ISBN）拆到 `books`，商品只存 `book_id`；图片拆到 `item_images`；跑腿设置拆到 `runner_profiles`；状态变更拆到日志表。每个非主属性都完全依赖主键，不存在部分依赖和传递依赖。比如 `items` 里不会出现“出版社”，它只通过 `book_id` 关联。

**Q2：为什么保留 `favorite_count` 这种冗余字段？怎么保证一致性？**

A：列表页要显示收藏数，如果每条商品都 `COUNT(*)`，会有 N+1 查询。我们用触发器在收藏/取消收藏后维护 `favorite_count`；`conversations.last_message` 同理。代价是触发器逻辑必须正确，所以报告里写了这个权衡，并提供一条定期核对的 UPDATE 语句。

**Q3：你建了哪些索引？为什么 `items(status, created_at)` 能加速首页？**

A：首页查询是 `WHERE status='on_sale' ORDER BY created_at DESC`，联合索引最左列是 status，第二列是 created_at，能同时完成过滤和排序，避免 filesort。还有 `(category_id, price)`、`(seller_id, status)`、`messages(conversation_id, message_id)` 等。最左前缀原则意味着单独按 created_at 查用不上这个索引。

**Q4：事务的 ACID 在接单里怎么体现？**

A：原子性：订单状态和 runner_id 要么一起改，要么都不改；一致性：状态必须从 pending 变 taken，外键和 CHECK 保证合法；隔离性：`FOR UPDATE` 让两个事务串行化；持久性：COMMIT 后写入 redo log，崩溃可恢复。

**Q5：并发接单具体怎么防重复？为什么不用乐观锁？**

A：事务里先 `SELECT ... FOR UPDATE` 锁住订单行，确认 status='pending'，再执行 `UPDATE ... WHERE order_id=? AND status='pending'`，判断 `affectedRows=1` 才提交；第二个请求等待锁释放后看到状态已变，返回 409。乐观锁用版本号也行，但需要重试，校园场景并发不高，悲观锁更直接、更容易讲清楚。

**Q6：MySQL 默认隔离级别是什么？会出现幻读吗？**

A：MySQL 8 默认是 REPEATABLE READ。普通查询用 MVCC 快照读；`SELECT ... FOR UPDATE` 这类当前读会用 next-key lock 锁住记录和间隙，防止其他事务插入符合条件的新行，所以我们的接单场景不会出现重复接单。报告里也对比了四种隔离级别。

**Q7：触发器和存储过程有什么区别？**

A：触发器由 INSERT/UPDATE/DELETE 自动触发，没有参数，不能显式提交事务，适合做审计日志和冗余字段维护；存储过程由 `CALL` 显式调用，有输入输出参数，可以控制事务，适合封装发布商品、接单这类多表业务。我们两种都用，但职责分开。

**Q8：视图有什么用？你的视图能更新吗？**

A：视图把多表 JOIN 封装成一张“虚拟表”，列表页直接查视图，SQL 更简单，也能限制列权限。包含 JOIN、聚合、DISTINCT 的视图通常不可更新；我们的 4 个视图都是只读查询，更新仍然走基表，避免意外。

**Q9：为什么用存储过程？有什么缺点？**

A：优点是把多表事务放在数据库端，减少网络往返，权限也更容易控制；缺点是调试、版本管理、移植不如应用层代码。我们的做法是：核心事务用存储过程，参数校验和权限判断放在 Node 层，两边职责清楚。

**Q10：SQL 注入和越权怎么防？**

A：所有 SQL 用 `?` 占位符，禁止字符串拼接；输入做类型/长度校验；JWT 里带用户 ID，写操作校验资源归属，比如只有卖家能改商品、只有发布者能确认完成/撤回/取消、只有接单者能释放、只有会话参与者能看消息；数据库用最小权限账号 `cs_app`。

#### 9.4.5 5 个加分追问

**追问 1：代取时间为什么设计成三列？为什么不做超时自动取消？**

A：三种时间要求——“尽快”“截止时间”“时间范围”——只靠一个 `deadline` 表达不了，所以用 `time_type` 区分模式，`time_start` 只给范围用，`deadline` 给截止/范围用，再加一条条件 `CHECK` 锁死合法组合。不做超时自动取消，是因为代取受现实因素影响，硬性取消容易误伤进行中的订单；我们把 `deadline` 定为参考时间，只用于展示和找跑腿时的时间重叠匹配，是否继续由双方协商，不满意可以撤回或释放接单。

**追问 2：EXPLAIN 你会看哪些列？**

A：重点看 `type`（最好 const/ref/range，避免 ALL）、`key`（实际用的索引）、`rows`（扫描行数）、`Extra`（避免 Using filesort、Using temporary）。如果 `type=ALL` 且 `rows` 很大，就考虑加索引或改写查询。

**追问 3：数据量到 100 万怎么办？**

A：先确认慢在哪条 SQL，用 EXPLAIN 和慢查询日志；索引覆盖高频查询；列表分页改成基于游标（`created_at < ?`）而不是大 OFFSET；历史消息/日志按月归档；必要时加 Redis 缓存或读写分离。当前课程数据量小，但设计上留了索引和分页。

**追问 4：数据库怎么备份和恢复？**

A：用 `mysqldump --databases campus_service --routines --triggers` 导出结构、数据、视图、过程、函数、触发器；恢复时先建库再 `SOURCE` 文件。备份放在仓库外，U 盘和网盘各一份，答辩前在干净环境恢复一次验证。

**追问 5：为什么不用 ORM？**

A：课程重点是数据库设计和数据库对象，手写 SQL 能让建表、索引、视图、存储过程、触发器和事务都直接展示；ORM 会隐藏 SQL，不利于报告和答辩。代价是代码量更大，所以用连接池和统一响应封装降低重复。

#### 9.4.6 卡住时怎么说

- 不要编造。可以说：“这个点我们目前是按……实现的，更优的方案是……，课程设计阶段受范围限制没有展开。”
- 被问到没做的功能：“这个功能在需求评审时被列为 P2/未来工作，当前优先保证数据库对象和核心闭环。”
- 被问到具体数字但记不清：“具体数字在报告第 x 章的表 x-x 里有，我这里说结论：……”
- 被指出错误：“您说得对，这里确实是我们的不足，回去会按……修正。”不要争辩。

### 9.5 PPT 分工与每页内容

#### 9.5.1 12 页结构

| 页 | 标题 | 主要内容 | 供内容 | 讲者 |
| --- | --- | --- | --- | --- |
| P1 | 封面 | 项目名、成员、学号、日期 | B | B |
| P2 | 项目背景与痛点 | 3 个痛点、1 句目标 | A（B 美化） | B |
| P3 | 系统功能与角色 | 四个模块、三类角色、P0 范围 | A（B 美化） | B |
| P4 | 技术架构 | 小程序 → Express → MySQL、JWT、上传 | A（B 美化） | B |
| P5 | 数据库概念设计 | 14 表、4 条主线、全局 ER、3NF | A | A |
| P6 | 逻辑与物理设计 | 核心表字段、索引表、冗余字段 | A | A |
| P7 | 数据库对象 | 4 视图 / 5 过程 / 2 函数 / 5 触发器 | A | A |
| P8 | 核心业务与并发 | 发布事务、`FOR UPDATE`、409 截图 | A | A |
| P9 | 系统演示 | 二手、代取、聊天截图或现场操作 | B | B |
| P10 | 测试与安全 | 测试用例通过率、越权、权限、注入防护 | B（A 供权限/并发） | B |
| P11 | 难点、不足与展望 | 3 难点、3 不足、3 展望 | A/B | A/B |
| P12 | 总结 | 完成度、收获、分工 | B | B |

#### 9.5.2 A 负责页面的内容（直接给 B 用）

**P5 数据库概念设计：**

- 14 张表、4 条主线：用户、二手、代取、聊天。
- 局部 ER → 全局 ER，消除命名/属性/结构冲突。
- 3NF：books、item_images、runner_profiles、日志表拆分的理由。
- 图：全局 ER 图（占页面 60%）。

**P6 逻辑与物理设计：**

- 主键 BIGINT、金额 DECIMAL(10,2)、状态 ENUM、字符集 utf8mb4、引擎 InnoDB。
- 索引：`items(status, created_at)`、`items(category_id, price)`、`items(seller_id, status)`、`messages(conversation_id, message_id)`。
- 冗余：`favorite_count`、`last_message`，触发器维护。
- 表：索引设计表（4~5 行）。

**P7 数据库对象：**

- 4 视图：商品列表、代取大厅、会话列表、用户统计。
- 5 存储过程：发布商品、接单、完成、获取会话、信用分刷新。
- 2 函数：未读数、完成单数。
- 5 触发器：收藏 ±1、商品日志、代取日志、会话最后消息。
- 一句总结：“所有对象都在系统接口中真实调用。”

**P8 核心业务与并发：**

- 发布商品：`items` + `item_images` 同事务，`JSON_TABLE` 展开多图。
- 接单：`FOR UPDATE` → 校验 pending → 条件 UPDATE → `affectedRows=1` → COMMIT。
- 状态机：`taken → pending`（发布者撤回 / 接单者释放）；`taken` 本身就是锁单，不能直接 `cancelled`。
- 时间：`time_type + time_start + deadline` 三列，`deadline` 仅参考，不自动取消。
- 截图：两个窗口，一个 200，一个 409。
- 一句总结：“数据库层保证不重复接单。”

**P11 难点、不足与展望：**

- 难点：并发接单、触发器维护冗余、聊天轮询。
- 不足：LIKE 搜索、轮询非实时、无支付/后台/实名。
- 展望：全文检索、WebSocket、平台担保、后台审核、按距离排序。

#### 9.5.3 PPT 设计规则

- 16:9，统一主题色（建议深蓝 + 浅灰），不超过 3 种颜色。
- 每页标题不超过 12 字，正文不超过 6 行，每行不超过 20 字。
- 字号：标题 32~40，正文 20~24，图注 14~16。
- 代码最多 8 行，只放关键语句；完整 SQL 放报告，不放 PPT。
- 截图要加红框/箭头，图注写清“图 x 说明什么”。
- 每页右下角放页码；最后一页不要写“谢谢”，写“请老师批评指正”。
- 动画只用淡入，不要飞入、旋转。

#### 9.5.4 交接方式

- 11-25 12:00 前，A 把 P5~P8、P11 的文字、截图、图注放到 `report/A_PPT内容.md`。
- B 负责排版、配色、动画、页码；A 不直接改 `.pptx`。
- 11-25 晚上一起过一遍，重点看：字是否太多、图是否清晰、数据库对象页是否有结果截图。
- 11-27 彩排后只改错别字和演示顺序，不再改结构。

### 9.6 系统视频（A 的部分）

#### 9.6.1 视频结构（6~8 分钟）

| 时间 | 内容 | 录制人 | 说明 |
| --- | --- | --- | --- |
| 0:00-0:30 | 片头：项目名、成员、分工 | B | 静态封面 + 字幕 |
| 0:30-1:30 | 背景与功能总览 | B | 小程序首页/模块切换 |
| 1:30-3:30 | 数据库设计与对象 | A | Navicat 表、视图、过程、触发器 |
| 3:30-5:30 | 二手流程 | A | 发布 → 搜索 → 详情 → 收藏 |
| 5:30-7:00 | 代取 + 聊天 | B | 发单 → 接单 → 完成；发消息 |
| 7:00-7:40 | 并发接单 + 权限 | A | 两个窗口 409；`cs_readonly` 被拒绝 |
| 7:40-8:00 | 结尾 | B | 总结 + 分工 |

#### 9.6.2 A 的录制清单

1. **数据库总览**（20 秒）：Navicat 左侧 14 张表、4 个视图、5 个过程，鼠标依次划过。
2. **视图查询**（20 秒）：执行 `SELECT * FROM v_item_list LIMIT 5;`，展示结果。
3. **存储过程**（30 秒）：调用 `sp_publish_item`，再查 `items` 和 `item_images`。
4. **触发器**（20 秒）：收藏前后 `favorite_count` 对比。
5. **二手流程**（2 分钟）：发布商品 → 首页搜索 → 详情 → 收藏 → 我的收藏。
6. **并发接单**（30 秒）：两个 Postman 窗口同时请求，一个成功一个 409。
7. **权限**（20 秒）：`cs_readonly` 执行 DELETE 被拒绝。

**录制要求：**

- 分辨率 1920×1080，30fps，MP4（H.264）。
- 用 OBS 录屏，关闭微信/QQ/邮件通知，关闭无关浏览器标签。
- 提前打开所有窗口，鼠标移动慢一点，点击后停 1 秒再下一步。
- 不要录到 `.env`、密码、token、真实个人信息。
- 分段录，每段 30 秒~2 分钟，文件名 `video/a_01_schema.mp4`、`a_02_view.mp4`……交给 B 剪辑。
- 录完自己回看一遍：字是否看得清、有没有卡顿、有没有把错误操作录进去。

#### 9.6.3 视频交付

- B 剪辑、加字幕、加片头片尾，导出 `report/系统演示.mp4`。
- 大小控制在 200MB 以内；超过就压缩码率或分段。
- 文件名：`<末三位><姓名>--校园服务平台-系统演示.mp4`（如果老师要求英文系统名，用 `Campus Service Platform`）。
- 11-26 初版，11-29 定稿；U 盘、网盘、邮箱各一份，确保断网能播放。
- 视频里演示的数据必须和报告截图一致，不要用另一套数据。

### 9.7 排版、合稿与术语统一

#### 9.7.1 Markdown 写作约定

- 章标题用 `## 第 1 章 项目概况`，节标题用 `### 1.1 ...`，小节用 `#### 1.1.1 ...`。
- 图片：`![图 3-1 局部 ER 图](assets/ch3/fig3-1_local-er.png)`，图片下一行写图题。
- 表格：表题写在表格上方，格式 `表 5-1 索引设计`。
- SQL 代码块标注 `sql`，JavaScript 标注 `js`，Shell 标注 `bash`。
- 每个图/表在正文都要被引用；不要出现“孤图”。
- 不要用 Word 自动编号；A 只在 Markdown 里写编号，B 排版时统一。

#### 9.7.2 合稿时间与责任

| 时间 | A 做什么 | B 做什么 |
| --- | --- | --- |
| 11-22 22:00 | 交第 1~3 章 + 图 | 交第 4 章 |
| 11-23 22:00 | 交第 5~6 章 + 对象截图 | 交第 7~8 章 |
| 11-24 18:00 | 交第 9 章 + 参考文献 + SQL 校对结果 | 交第 10 章 + AI 专题 |
| 11-24 晚 | 合并 `docs/report-a` → `dev` | 开始合稿 |
| 11-25 12:00 | 交 `report/A_PPT内容.md`、答辩讲稿 | 排版、目录、页码 |
| 11-25 晚 | review 数据库章节，写 `report/A校对意见.md` | 按意见修改，出定稿候选 |
| 11-26 | readme、dump、打包 | PPT、视频 |

#### 9.7.3 术语统一表

| 中文（报告统一用） | 英文/数据库 | 不要混用 |
| --- | --- | --- |
| 用户 | `users` / user | 账号、会员 |
| 卖家 | seller | 商家、店主 |
| 买家 | buyer | 顾客 |
| 跑腿 / 接单者 | runner | 骑手、外卖员 |
| 代取订单 | `errand_orders` / errand order | 跑腿单、任务单 |
| 二手商品 | `items` / item | 产品、货物 |
| 收藏 | `favorites` / favorite | 关注 |
| 会话 | `conversations` / conversation | 聊天室、对话 |
| 消息 | `messages` / message | 信息、聊天记录 |
| 在售 | `on_sale` | 上架中、售卖中 |
| 已预订 | `reserved` | 预定、保留中 |
| 已售出 | `sold` | 已卖出、完成 |
| 已下架 | `off_shelf` | 下架、删除 |
| 待接单 | `pending` | 待处理、未接 |
| 已接单 | `taken` | 已接、进行中 |
| 已完成 | `completed` | 完成、已送达 |
| 已接单 | `taken` | 已有人接单，锁单并从大厅消失 |
| 已取消 | `cancelled` | 取消、关闭 |

#### 9.7.4 A 校对 B 的 docx 时看什么

- [ ] 章节顺序符合学校模板，目录页码正确。
- [ ] A 的章节没有被 B 改出事实错误（表名、字段名、对象数量）。
- [ ] 图号/表号连续，正文引用不跳号。
- [ ] 图和图题没有分页；表格没有跨页断头。
- [ ] SQL 代码没有超出页宽，关键字大小写统一。
- [ ] 术语和 9.7.3 一致。
- [ ] 参考文献正文有引用，编号连续。
- [ ] 页眉页脚、页码、行距、字号统一。

#### 9.7.5 常见排版要求（以学校模板为准）

- A4 纸，页边距通常上/下 2.5cm、左 3cm、右 2.5cm。
- 正文小四宋体，1.5 倍行距；标题黑体，逐级减小。
- 图题在图下方，表题在表上方，五号宋体居中。
- 代码用 Consolas 五号，浅灰底纹，单倍行距。
- 页码底部居中；页眉写项目名/学校名。
- 摘要、目录、正文、参考文献分页。
- 最终以 B 的设置和学校模板为准，A 不纠结字体细节。

### 9.8 提交物命名与打包

#### 9.8.1 命名规则

课程要求：`学号末三位+姓名--系统名称`。

| 材料 | 建议文件名 |
| --- | --- |
| 源码压缩包 | `<末三位><姓名>--Campus Service Platform.zip` |
| 报告 | `<末三位><姓名>--Campus Service Platform.docx` |
| PPT | `<末三位><姓名>--Campus Service Platform-答辩PPT.pptx` |
| 视频 | `<末三位><姓名>--Campus Service Platform-系统演示.mp4` |

说明：

- 系统名称用英文和仓库名一致；如果老师要求中文，改成 `<末三位><姓名>--校园服务平台`，全套材料一起改。
- 两人小组如果只交一套，文件名用谁的名字、是否加 B 的名字，**提前问老师**；默认用 A 的名字，readme 里写清两人分工。
- 文件名不要有空格以外的特殊符号；交之前确认能正常解压、能打开。

#### 9.8.2 压缩包结构

```text
<末三位><姓名>--Campus Service Platform/
├─ readme.txt
├─ database/
│  ├─ schema.sql
│  ├─ objects.sql
│  ├─ seed.sql
│  ├─ campus_service_dump.sql
│  ├─ demo_checks.sql
│  └─ er_diagram.png
├─ server/
│  ├─ src/
│  ├─ scripts/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ .env.example
├─ miniprogram/
├─ docs/
│  ├─ 接口文档.md
│  ├─ 测试用例.md
│  ├─ AI辅助开发记录.md
│  ├─ 答辩讲稿.md
│  └─ screenshots/
├─ report/
│  ├─ A章节.md
│  ├─ 报告.docx
│  ├─ 答辩PPT.pptx
│  ├─ 系统演示.mp4        # 太大可单独提交
│  └─ assets/
└─ 说明.txt               # 可选：提交清单
```

**不要放进压缩包：**

- `node_modules/`、`miniprogram_npm/`
- `.env`、任何密钥/密码文件
- `server/uploads/` 里的用户上传文件（保留 `.gitkeep` 和演示图）
- 日志、临时文件、`.DS_Store`、`Thumbs.db`
- `.git/`（可选排除，减小体积；如果老师要求保留提交历史再放）

#### 9.8.3 readme.txt 模板

```text
========================================
校园服务平台（Campus Service Platform）
《数据库原理与应用》课程设计
成员：<姓名>（A，学号末三位 <末三位>）、<姓名>（B）
日期：2026-11-30
========================================

一、系统简介
校园二手交易 + 代取服务 + 简易聊天，微信小程序 + Node.js/Express + MySQL 8。

二、运行环境
- Windows 10/11
- Node.js 24.x
- MySQL 8.0.x（字符集 utf8mb4）
- 微信开发者工具（稳定版）
- 不需要公网、域名和备案，本机演示

三、启动步骤
1. 导入数据库
   mysql -u root -p < database/schema.sql
   mysql -u root -p campus_service < database/objects.sql
   mysql -u root -p campus_service < database/seed.sql
   cd server && npm install && npm run seed
   （或直接导入 database/campus_service_dump.sql）

2. 配置后端
   复制 server/.env.example 为 server/.env，修改数据库账号密码
   cd server && npm run dev
   浏览器访问 http://127.0.0.1:3000/api/health 应返回 ok

3. 打开小程序
   微信开发者工具导入 miniprogram/ 目录
   详情 → 本地设置 → 勾选“不校验合法域名”
   编译后即可使用

四、演示账号
- 2023001 / 123456  买家（浏览、收藏、发消息、发代取）
- 2023002 / 123456  卖家/跑腿（发布商品、接单、完成）
- 2023003 / 123456  第三用户（并发接单演示）

五、数据库对象
- 14 张表、4 个视图、5 个存储过程、2 个函数、5 个触发器
- 事务：发布商品、接单、完成订单
- 权限：cs_app（业务 CRUD）、cs_readonly（只读）
- 详细说明见 report/报告.docx 第 5~6 章

六、常见问题
1. 请求失败：确认后端已启动、端口 3000、开发者工具已勾选“不校验合法域名”
2. 图片不显示：确认 server/uploads 存在，图片 URL 拼接了 BASE_URL
3. 中文乱码：确认数据库/表字符集 utf8mb4
4. 接单报 409：订单已被别人接走，刷新大厅
5. 代取过了截止时间仍显示 `pending`：这是正常设计，`deadline` 只作参考，系统不会自动取消

七、分工
- A：数据库设计、DDL、视图/过程/函数/触发器/事务、Express 基础设施、鉴权、上传、二手模块前后端、代取后端、报告第 1/2/3/5/6/9 章
- B：小程序公共层、全局样式、登录/注册、个人中心、代取页面、聊天全栈、UI 走查、截图、PPT、视频、报告第 4/7/8/10 章
========================================
```

#### 9.8.4 打包与验证

1. **先提交代码**：`git status` 干净，`dev` 和 `main` 都是最新。
2. **导出 dump**：

   ```bash
   mysqldump -u root -p --databases campus_service --routines --triggers > database/campus_service_dump.sql
   ```

3. **清理工作区**：确认 `.env`、`node_modules`、上传文件不在打包目录。
4. **打包 zip**：按 9.8.2 结构；不要直接在仓库根目录全选压缩。
5. **干净目录验证**：
   - 解压到 `D:\Temp\CampusCheck`；
   - 按 readme 导入数据库、装依赖、启动后端；
   - 登录 2023001，发布商品、收藏、接单、发消息；
   - 检查数据库对象数量和报告截图一致。
6. **重新打包**：验证中改了任何文件，必须重新打包。
7. **三处备份**：U 盘 + 网盘 + 邮箱；视频单独确认能播放。

---

## 10. 检查清单

> 清单的用法：每天收工花 2 分钟看 10.1；每个里程碑看 10.3；11-21、11-29 看专项清单。**打勾才算完成，不靠感觉。**

### 10.1 每日收工检查（2 分钟）

- [ ] 今天的代码/文档已 `git add` + `commit`，commit message 能看懂。
- [ ] 已 `git push` 到自己的远程分支（或已合并到 `dev`）。
- [ ] `git status` 没有意外文件（`.env`、`node_modules`、日志）。
- [ ] 今天的改动在本地能跑通（后端能启动、页面能打开）。
- [ ] 今天新增的截图/图已放进 `report/assets/` 并命名。
- [ ] 给 B 发一条进度：完成了什么、明天做什么、有没有阻塞。
- [ ] 明天的第一件事写在便签/任务里，不超过 3 条。

### 10.2 每周检查（周日晚上 15 分钟）

- [ ] `dev` 分支能完整跑通：登录 → 发布 → 搜索 → 收藏 → 接单 → 聊天。
- [ ] 本周的 feature 分支都已合并或关闭，没有遗留半个月的分支。
- [ ] 数据库对象数量与计划一致（对照 10.3 的 M3 清单）。
- [ ] 报告素材（截图/图表）至少覆盖本周完成的功能。
- [ ] 和 B 对一次接口变更，确认 `docs/接口文档.md` 是最新的。
- [ ] 检查 GitHub 仓库没有敏感文件（`.env`、密码、token）。
- [ ] 下周的里程碑任务拆到天，写在任务列表里。

### 10.3 里程碑验收清单

#### M0（11-07）：环境与登录打通

- [ ] MySQL 能登录，`campus_service` 库存在。
- [ ] 14 张表 DDL 在 Navicat 里执行成功，字符集 `utf8mb4`。
- [ ] Express 能启动，`GET /api/health` 返回 `{code:0}`。
- [ ] 注册/登录接口可用，密码 bcrypt 哈希，返回 JWT。
- [ ] 鉴权中间件能拦截无 token 请求，返回 401。
- [ ] 小程序能请求 `/api/auth/me`，token 存本地。
- [ ] 3 个演示账号能登录（2023001/002/003）。
- [ ] `main` 有 `v0.1-m0` tag，`dev` 是最新。

#### M1（11-11）：二手闭环

- [ ] 发布商品：普通/书籍两种模式，图片能上传并显示。
- [ ] `sp_publish_item` 事务：商品 + 多图，失败能回滚。
- [ ] 列表：分页、搜索、分类、价格、排序、下拉刷新、上拉加载。
- [ ] 首页右下角圆形加号“我要卖”能进发布页。
- [ ] 搜索结果页：书籍卡片、同书商品优先、点击书籍按 `bookId` 过滤。
- [ ] 详情：轮播、卖家、收藏状态、联系卖家入口；卖家本人可从详情页改状态，买家只读。
- [ ] 收藏/取消收藏，`favorite_count` 触发器正确。
- [ ] 我的发布/我的收藏可用，在售/已预订/已售/已下架能切换。
- [ ] 空/加载/错误三态齐全。
- [ ] 3 个账号能完成“注册 → 发布 → 搜索 → 详情 → 收藏 → 标记预订 → 取消预订 → 下架”。
- [ ] 接口文档更新到 v0.2，`main` 有 `v0.2-m1` tag。

#### M2（11-16）：代取 + 聊天闭环

- [ ] 跑腿资料、上下线、接单设置保存/读取正常；可接规格多选、`once`/`weekly` 在线计划、`manualUntil` 回填。
- [ ] 上线/接单设置页两个入口可用：个人页进入为设置，代取页 `?mode=online` 进入可直接上线/下线；计划列表能改/删未开始计划。
- [ ] 自动任务到计划开始上线、结束下线；手动覆盖最晚到 23:59；服务重启后下一分钟补算。
- [ ] 进行中循环下线弹窗二选一可用；修改进行中循环时前端弹窗提醒只影响下一次。
- [ ] 发布代取单，大厅能看到 pending 订单。
- [ ] 找跑腿匹配页（P1）能按取件片区 + 具体地标 + 在线计划 + 规格筛选可接单跑腿并联系 TA；不直接改订单状态。
- [ ] `sp_take_errand` 并发接单：两个账号只有一个成功，另一个 409。
- [ ] 完成/撤回/释放/取消全路径可用，状态日志有记录；接单后订单从大厅消失。
- [ ] `sp_complete_errand` 更新完成数/信用分。
- [ ] 会话列表、聊天页、顶部商品/订单卡片、发送文字 / 图片消息、3 秒轮询、已读、未读数可用；图片先上传成功再发送，会话列表预览显示 `[图片]`；卖家从卡片进详情改状态后返回，卡片状态同步更新。
- [ ] `sp_get_or_create_conversation` 不会重复建会话。
- [ ] 两个账号 5 秒内能收到对方消息。
- [ ] 商品/订单“联系 TA”能进入正确会话；聊天页顶部卡片显示对应商品/订单摘要，点击能回详情。
- [ ] `main` 有 `v0.3-m2` tag。

#### M3（11-21）：功能冻结与数据库对象齐全

**数据库对象清点：**

| 类型 | 目标 | 实际 | 状态 |
| --- | --- | --- | --- |
| 表 | 14（含 `runner_item_sizes` 与 `feedback`） |  | [ ] |
| 视图 | 4 |  | [ ] |
| 存储过程 | 5 |  | [ ] |
| 函数 | 2 |  | [ ] |
| 触发器 | 5 |  | [ ] |
| 事务 | 3 处 |  | [ ] |
| 索引 | ≥ 10 |  | [ ] |
| 权限账号 | 2 |  | [ ] |

**功能与质量：**

- [ ] P0 功能全部可用（对照 1.1 的 P0 列表）。
- [ ] 越权请求被拒绝（改别人的商品、完成别人的单、看别人的会话）。
- [ ] 参数校验齐全，没有 500 报错。
- [ ] 列表查询 `EXPLAIN` 命中索引。
- [ ] 1000 商品/5000 消息下页面不卡。
- [ ] 测试用例执行完，P0 通过率 100%。
- [ ] `database/campus_service_dump.sql` 能恢复。
- [ ] 功能冻结，`main` 有 `v1.0-m3` tag；不再加新功能。

#### M4（11-26）：材料齐套

- [ ] `report/A章节.md` 第 1/2/3/5/6/9 章 + 参考文献完成。
- [ ] `report/报告.docx` 初版完整，目录/页码/图表编号正确。
- [ ] `report/答辩PPT.pptx` 12 页初版。
- [ ] `report/系统演示.mp4` 初版能播放。
- [ ] `readme.txt` 在干净目录能按步骤跑通。
- [ ] `database/campus_service_dump.sql` 对象齐全。
- [ ] 源码 zip 初版，不含 `node_modules`、`.env`、上传文件。
- [ ] `docs/接口文档.md`、`docs/测试用例.md`、`docs/AI辅助开发记录.md` 齐全。
- [ ] `main` 有 `v1.0-m4` tag。

#### M5（11-29）：彩排与备份

- [ ] 按答辩流程完整走 2 遍，计时 8~10 分钟。
- [ ] A 的数据库讲稿能脱稿 4 分钟。
- [ ] 15 个答辩问题能用自己的话回答。
- [ ] 并发接单演示在两个窗口稳定复现。
- [ ] 干净环境从零启动 ≤ 10 分钟。
- [ ] 源码包、报告、PPT、视频、readme 全部定稿。
- [ ] U 盘、网盘、邮箱三处备份，断网能放视频。
- [ ] `main` 有 `v1.0-final` tag。

### 10.4 11-21 功能冻结专项

冻结不是“什么都不改”，而是：

**可以做：**

- 修 P0 bug（登录、发布、列表、详情、收藏、接单、聊天）。
- 修数据不一致（触发器、事务）。
- 补测试、补注释、补文档、补截图。
- 优化明显的性能问题（加索引、去掉 N+1）。

**不可以做：**

- 加新页面、新模块、新字段。
- 改数据库表结构（除非修严重设计缺陷，且要和 B 同步）。
- 改接口返回格式（会让 B 的页面崩）。
- 大规模重构、换框架、换 UI 风格。

**冻结当天的动作：**

1. 所有 feature 分支合并到 `dev`，删除已合并的临时分支。
2. `dev` → `main` 开 PR，合并后打 `v1.0-m3`。
3. 导出 dump，确认对象齐全。
4. 建 `docs/bug清单.md`，按 P0/P1/P2 排优先级，只修 P0/P1。
5. 告诉 B：“功能冻结，后面只修 bug 和做材料。”

### 10.5 11-29 提交前总检查

**材料：**

- [ ] 源码 zip（命名正确、能解压、不含敏感文件）。
- [ ] 报告 docx（章节完整、图表编号、页码、参考文献）。
- [ ] 答辩 PPT（能打开、字体不丢失、视频/图片能播放）。
- [ ] 系统视频（能播放、有声音/字幕、时长 6~8 分钟）。
- [ ] readme（账号、步骤、常见问题、分工）。
- [ ] 数据库 dump（能恢复、对象齐全）。

**系统：**

- [ ] 干净环境按 readme 启动成功。
- [ ] 3 个账号能登录。
- [ ] 二手闭环、代取闭环、聊天闭环都能演示。
- [ ] 并发接单能复现。
- [ ] 数据库对象在 Navicat 能看到。
- [ ] 图片能显示（uploads 和 BASE_URL 正确）。

**备份：**

- [ ] U 盘一份（zip + docx + pptx + mp4）。
- [ ] 网盘一份。
- [ ] 邮箱一份（至少 readme + 报告 + PPT，视频可发链接）。
- [ ] 本地电脑一份，答辩当天不带错版本。

### 10.6 11-30 答辩当天检查

- [ ] 提前 30 分钟到教室，测试投影、网络、电源。
- [ ] 笔记本电量充足，带充电器。
- [ ] U 盘 + 本地 + 网盘三份材料。
- [ ] 后端已启动，MySQL 已启动，Navicat 连接正常。
- [ ] 小程序已编译，开发者工具已登录，演示账号已登录。
- [ ] 两个并发接单窗口已准备好。
- [ ] 备份视频能离线播放。
- [ ] 讲稿/问答纸面版各一份。
- [ ] 手机静音，关闭微信/QQ 通知。

---

## 11. 附录

### 11.1 `.gitignore` 模板

```gitignore
# 依赖
node_modules/
miniprogram_npm/

# 环境变量与密钥
.env
.env.*
!.env.example

# 上传文件（保留目录）
server/uploads/*
!server/uploads/.gitkeep

# 日志与临时文件
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
Thumbs.db

# 编辑器
.vscode/
.idea/
*.swp

# 构建产物
dist/
build/
*.exe

# 压缩包与备份（按需）
*.zip
*.rar
*.7z
```

**注意：**

- `.env.example` 必须提交，里面只写占位符，不写真实密码。
- 如果演示图片要进仓库，放在 `server/assets/demo/`，不要放 `uploads/`。
- 已经误提交的文件，按 7.5 处理，不要只加 `.gitignore`。

### 11.2 最终目录结构

```text
Campus_Trading_Service_Platform/
├─ docs/
│  ├─ 课程设计开发计划.md
│  ├─ A成员开发计划与Git协作手册.md
│  ├─ 接口文档.md
│  ├─ 测试用例.md
│  ├─ AI辅助开发记录.md
│  ├─ A测试记录.md
│  ├─ bug清单.md
│  ├─ 答辩讲稿.md
│  └─ screenshots/
├─ database/
│  ├─ schema.sql
│  ├─ objects.sql
│  ├─ seed.sql
│  ├─ demo_checks.sql
│  ├─ campus_service_dump.sql
│  └─ er_diagram.png
├─ server/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ db.js
│  │  ├─ middleware/auth.js
│  │  ├─ routes/
│  │  │  ├─ auth.js
│  │  │  ├─ users.js
│  │  │  ├─ items.js
│  │  │  ├─ favorites.js
│  │  │  ├─ errands.js
│  │  │  ├─ chat.js
│  │  │  └─ upload.js
│  │  └─ utils/response.js
│  ├─ scripts/seed.js
│  ├─ assets/demo/
│  ├─ uploads/.gitkeep
│  ├─ .env.example
│  ├─ package.json
│  └─ package-lock.json
├─ miniprogram/
│  ├─ app.js / app.json / app.wxss
│  ├─ config.js
│  ├─ utils/request.js
│  ├─ components/
│  │  ├─ item-card/
│  │  ├─ empty-state/
│  │  └─ status-tag/
│  └─ pages/
│     ├─ login/ register/
│     ├─ index/ item/ search/
│     ├─ errand/
│     ├─ chat/
│     └─ mine/（index、items、favorites、errands、runner、profile、settings、help）
├─ report/
│  ├─ A章节.md
│  ├─ A_PPT内容.md
│  ├─ A校对意见.md
│  ├─ 报告.docx
│  ├─ 答辩PPT.pptx
│  ├─ 系统演示.mp4
│  └─ assets/
└─ readme.txt
```

### 11.3 演示账号与演示数据

| 学号 | 密码 | 角色 | 用来演示 |
| --- | --- | --- | --- |
| 2023001 | 123456 | 买家 | 浏览、搜索、收藏、发消息、发代取单 |
| 2023002 | 123456 | 卖家/跑腿 | 发布商品、上线接单、完成订单 |
| 2023003 | 123456 | 第三用户 | 并发接单、多会话 |

**演示数据建议：**

- 商品 20 条以上：教材、电子设备、生活用品各若干；至少 1 条带 3 张图、1 条书籍模式；书籍 `cover_url` 至少有 3 条。
- 代取单 10 条以上：pending 至少 3 条，taken/completed/cancelled 各有 1 条。
- 跑腿资料 5 条以上：至少 3 条在线，覆盖不同片区组合（单选/多选）、不同 `service_places` 组合（空数组/具体楼栋/整片区）、`once` 和 `weekly` 在线计划、规格多选，用于找跑腿匹配和自动上下线演示。
- 消息 20 条以上：至少 2 个会话，包含未读消息。
- 收藏 5 条以上：用于触发器演示。
- 批量数据：1000 商品、5000 消息，用于性能测试（单独写批量插入脚本，不放进默认 `npm run seed`）。

**重置演示数据：**

Navicat：依次打开并运行 `database/schema.sql`、`database/objects.sql`、`database/seed.sql`，再在 `server` 目录执行 `npm run seed`。

命令行：

```bash
mysql -u root -p campus_service < database/schema.sql
mysql -u root -p campus_service < database/objects.sql
mysql -u root -p campus_service < database/seed.sql
cd server && npm run seed
```

### 11.4 常用 SQL 检查命令

```sql
-- 当前库/字符集/引擎
SELECT DATABASE(), @@character_set_database, @@collation_database;
SELECT @@transaction_isolation;

-- 表清单与数据量
SHOW TABLES;
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS items FROM items;
SELECT COUNT(*) AS errands FROM errand_orders;
SELECT COUNT(*) AS messages FROM messages;
SELECT COUNT(*) AS runners FROM runner_profiles;
SELECT COUNT(*) AS runner_sizes FROM runner_item_sizes;

-- 对象清单
SHOW FULL TABLES WHERE Table_type = 'VIEW';
SHOW PROCEDURE STATUS WHERE Db = 'campus_service';
SHOW FUNCTION STATUS WHERE Db = 'campus_service';
SHOW TRIGGERS;

-- 索引与外键
SHOW INDEX FROM items;
SHOW INDEX FROM errand_orders;
SHOW INDEX FROM messages;
SHOW INDEX FROM runner_profiles;
SHOW INDEX FROM runner_item_sizes;
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'campus_service';

-- 执行计划
EXPLAIN SELECT item_id, title, price
FROM items
WHERE status = 'on_sale'
ORDER BY created_at DESC
LIMIT 10;

-- 连接与锁
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;

-- 函数/过程调用
SELECT fn_unread_count(1, 2);
SELECT fn_completed_errands(2);
CALL sp_refresh_user_credit();
```

### 11.5 一页纸命令速查

**Git 日常：**

```bash
git status                      # 看当前状态
git switch dev                  # 切到 dev
git pull origin dev             # 拉最新
git switch -c feature/xxx       # 建功能分支
git add <文件>                  # 暂存指定文件
git commit -m "feat: ..."       # 提交
git push -u origin feature/xxx  # 首次推送
git push                        # 后续推送
git log --oneline -10           # 看最近提交
git diff                        # 看未暂存改动
git restore <文件>              # 撤销未暂存改动
git stash                       # 暂存当前改动
git stash pop                   # 恢复
git merge feature/xxx           # 合并到当前分支
git merge --abort               # 放弃合并
git tag -a v1.0-m3 -m "..."     # 打标签
git push origin v1.0-m3         # 推标签
```

**npm / 后端：**

```bash
cd server
npm install
npm run dev                     # nodemon 启动
npm run seed                    # 插入演示数据
npm run start                   # 生产启动
```

**MySQL：**

```bash
mysql -u root -p                                    # 登录
mysql -u root -p < database/schema.sql              # 建库建表
mysql -u root -p campus_service < database/objects.sql
mysql -u root -p campus_service < database/seed.sql
mysqldump -u root -p --databases campus_service \
  --routines --triggers > database/campus_service_dump.sql
mysql -u root -p campus_service < database/campus_service_dump.sql
```

**小程序：**

```text
微信开发者工具 → 导入 miniprogram/
详情 → 本地设置 → 勾选“不校验合法域名”
编译 → 预览/真机调试
```

### 11.6 学习路线与 AI 提问模板

#### 11.6.1 按阶段学，不要一次学完

| 阶段 | 需要掌握 | 推荐资料 |
| --- | --- | --- |
| 11-05~11-07 | Express 路由、中间件、mysql2 连接池、JWT、bcrypt | Express 官方文档、mysql2 README |
| 11-08~11-11 | 分页 SQL、JOIN、事务、`JSON_TABLE`、multer | MySQL 8.0 手册、multer README |
| 11-12~11-16 | `FOR UPDATE`、隔离级别、触发器、轮询 | MySQL 手册、小程序 `wx.request` |
| 11-17~11-21 | 视图、存储过程、函数、状态机、时间匹配、EXPLAIN、权限 | MySQL 手册、`EXPLAIN` 官方说明 |
| 11-22~11-26 | Markdown 写作、draw.io、PPT 排版、录屏 | 学校模板、draw.io 教程 |

**学习原则：**

- 先跑通最小示例，再放进项目；不要一上来读完整文档。
- 每个新知识点写 3~5 行测试 SQL/JS，确认理解再继续。
- 报错先看错误码和行号，再搜索；不要盲目复制。
- 每天留 30 分钟补基础，不要等到答辩前。

#### 11.6.2 AI 提问模板（可直接复制）

**调试 SQL：**

```text
我在 MySQL 8.0 执行下面这条 SQL，报错：
<粘贴完整错误信息>
SQL：
<粘贴 SQL>
表结构：
<粘贴 SHOW CREATE TABLE 结果>
请按“原因 → 修改后的 SQL → 为什么这样改”回答，不要省略字段类型。
```

**调试 Express 接口：**

```text
我用 Node.js 24 + Express + mysql2 写了一个接口：
<粘贴路由代码>
请求：
<粘贴请求体/参数>
现象：<报错或返回>
数据库表结构：<粘贴相关字段>
请指出最可能的原因，并给出最小修改；如果需要打印日志，告诉我打在哪里。
```

**审查数据库设计：**

```text
这是我的表结构（14 张表）：
<粘贴 schema.sql 的关键部分>
业务规则：
- 一个用户可发布多个商品
- 一个商品多张图
- 一个用户对同一商品只能收藏一次
- 代取订单只能被一个跑腿接
请检查：3NF、外键、索引、唯一约束、可能的并发问题；按“问题 → 影响 → 建议 SQL”列出。
```

**写报告段落：**

```text
请把下面这段开发记录改写成课程设计报告的书面语，保留事实和数据，不要夸大：
<粘贴你的记录>
要求：第三人称/“本系统”，不超过 300 字，不使用“我们觉得”这类口语。
```

**生成测试数据：**

```text
请为 MySQL 8 生成 20 条校园二手商品测试数据，表结构如下：
<粘贴 items 字段>
要求：
- 分类只用 1~5
- 价格 5~500 元，DECIMAL(10,2)
- 状态 80% on_sale，10% sold，10% off_shelf
- `campus` 全部填 `NULL`（MVP 不采集校区）
- 输出 INSERT 语句，不要解释
```

**AI 使用边界：**

- 不要把 `.env`、密码、token、真实个人信息粘贴给 AI。
- AI 生成的 SQL 必须自己跑一遍，确认字段名和业务逻辑正确。
- AI 生成的代码要能解释每一行，答辩可能追问。
- 报告里的 AI 辅助记录要写“用来做什么、怎么验证、发现了什么问题”，不要只写“用了 ChatGPT”。

### 11.7 关键文件索引

| 文件 | 用途 | 谁维护 |
| --- | --- | --- |
| `docs/课程设计开发计划.md` | 总计划、需求、接口、数据库设计 | 共同 |
| `docs/A成员开发计划与Git协作手册.md` | 本文件，A 的执行手册 | A |
| `docs/接口文档.md` | 接口契约，前后端对齐 | 共同，A 主笔 |
| `docs/测试用例.md` | 测试用例与结果 | B 主笔，A 补数据库用例 |
| `docs/AI辅助开发记录.md` | AI 使用记录 | B 主笔，A 补数据库部分 |
| `docs/A测试记录.md` | A 的联调、并发、性能测试记录 | A |
| `database/schema.sql` | 建库、建表、索引、约束 | A |
| `database/objects.sql` | 视图、过程、函数、触发器 | A |
| `database/seed.sql` | 分类、书目等静态数据 | A |
| `database/demo_checks.sql` | 答辩演示 SQL | A |
| `server/src/app.js` | Express 入口 | A |
| `server/src/db.js` | MySQL 连接池 | A |
| `server/src/middleware/auth.js` | JWT 鉴权 | A |
| `server/src/routes/users.js` | 用户资料、跑腿设置、上下线、跑腿匹配 | A |
| `server/src/jobs/runnerOnline.js` | `node-cron` 按在线计划自动上下线 | A |
| `server/src/routes/items.js` | 二手接口 | A |
| `server/src/routes/errands.js` | 代取接口 | A |
| `server/src/routes/chat.js` | 聊天接口 | B |
| `miniprogram/utils/request.js` | 请求封装 | B |
| `miniprogram/pages/index/` | 二手首页（含圆形加号） | A |
| `miniprogram/pages/item/` | 详情/发布 | A |
| `miniprogram/pages/search/` | 搜索结果页 | A |
| `miniprogram/pages/mine/items/` | 我的发布 | A |
| `miniprogram/pages/mine/favorites/` | 我的收藏 | A |
| `miniprogram/pages/errand/` | 代取大厅/发布/详情/找跑腿 | B |
| `miniprogram/pages/mine/runner/` | 接单设置/上线（两个入口） | B |
| `miniprogram/pages/mine/settings/`、`mine/help/` | 设置、帮助 | B |
| `miniprogram/pages/chat/` | 聊天页面 | B |
| `report/A章节.md` | A 的论文章节 | A |
| `report/A_PPT内容.md` | A 负责的 PPT 页内容与图注 | A |
| `report/assets/` | 报告图表与截图 | A/B，按章存放 |
| `report/报告.docx` | 最终报告 | B |

### 11.8 术语表

| 术语 | 解释 |
| --- | --- |
| 3NF | 第三范式：非主属性完全依赖主键，且不传递依赖 |
| 主键 | 唯一标识一行记录的字段或字段组合 |
| 外键 | 指向另一张表主键的字段，保证引用完整性 |
| 索引 | 加速查询的数据结构；联合索引遵循最左前缀 |
| 事务 | 一组要么全成功、要么全回滚的操作 |
| ACID | 原子性、一致性、隔离性、持久性 |
| 隔离级别 | 控制并发事务可见性的级别；MySQL 默认 RR |
| 行锁 | InnoDB 对索引记录加的锁；`FOR UPDATE` 是排他锁 |
| 视图 | 基于查询定义的虚拟表，简化复杂查询 |
| 存储过程 | 预编译的 SQL 过程，可带参数、控制事务 |
| 函数 | 有返回值的数据库程序，可用于 SELECT |
| 触发器 | 在 INSERT/UPDATE/DELETE 前后自动执行的程序 |
| JWT | JSON Web Token，登录后放在 `Authorization` 头 |
| bcrypt | 加盐密码哈希算法 |
| ORM | 对象关系映射；本项目不用，手写 SQL |
| 轮询 | 客户端定时请求服务器拉取新数据 |
| 找跑腿匹配 | 按取件片区 + 具体地标/时间要求/规格筛选可接单跑腿（`asap` 在线；未来单可含计划重叠的 `slot` 跑腿），仅展示信息并联系，不直接指派订单 |
| 上线 | 跑腿设置在线状态、可代取范围/在线计划/规格；按计划自动上下线或手动覆盖；可在个人页或代取页进入 |
| 同书优先 | 搜索结果页先展示同一 `bookId` 的商品，再展示其他匹配商品 |
| PR | Pull Request，GitHub 上的合并请求 |
| 分支 | 独立开发线，如 `feature/items`、`fix/login` |
| 合并 | 把一个分支的提交并入另一个分支 |
| 冲突 | 两人改了同一文件的同一处，Git 无法自动合并 |
| tag | 给某个提交打的版本标记，如 `v1.0-m3` |

### 11.9 校园片区与地标清单（唯一口径）

**三级模型**

| 层级 | 作用 | 是否落库 | 例子 |
| --- | --- | --- | --- |
| 分类 | 选择器分组标题 | 否 | 宿舍园、教学区、图书馆、运动场、校医院、校外、其他 |
| 片区 | 匹配粗筛单位 | 是 | 桃园、北区教学区、中心图书馆 |
| 地标 | 匹配细筛单位 | 存受控名称，不建表 | 第16教学楼、行署楼 |

**25 个固定片区**

| 分类 | 片区 |
| --- | --- |
| 宿舍园（8） | 桃园、李园、橘园、楠园、梅园、竹园、杏园、茶园 |
| 教学区（2） | 北区教学区、南区教学区 |
| 图书馆（3） | 中心图书馆、北区图书馆、南区图书馆 |
| 运动场（5） | 第一运动场、第二运动场、第三运动场、第四运动场、第五运动场 |
| 校医院（2） | 北区校医院、南区校医院 |
| 校外（3） | 一号门外/吾悦广场、二号门外、校外其他 |
| 其他（2） | 北区其他、南区其他 |

**52 条地标**

> 有编号的教学楼以“第 N 教学楼”为正式名；别名用于搜索，不改变正式名。A/B 栋合并为一条。

| 所属片区 | 正式名称 | 别名 / 搜索词 |
| --- | --- | --- |
| 北区教学区 | 第1教学楼 | 1教、一教、雨僧楼、文学院 |
| 北区教学区 | 第2教学楼 | 2教、二教、兰华楼、西塔学院 |
| 北区教学区 | 第3教学楼 | 3教、三教、绩镛楼、国家治理学院、马克思主义学院、马院 |
| 北区教学区 | 第4教学楼（A/B栋） | 4教、四教、咏修楼A/B栋、新闻传媒学院、新闻学院 |
| 北区教学区 | 第5教学楼 | 5教、五教、弘礼楼、外国语学院、外院 |
| 北区教学区 | 第6教学楼 | 6教、六教、师元楼、教师教育学院、教师院 |
| 北区教学区 | 第7教学楼 | 7教、七教、修业楼、教师教育学院、教师院 |
| 北区教学区 | 第8教学楼 | 8教、八教、敬德楼、公共教学楼、公共课 |
| 北区教学区 | 第9教学楼 | 9教、九教、荟文楼A栋、历史文化学院、历院、民族学院 |
| 北区教学区 | 第10教学楼 | 10教、十教、荟文楼B栋、公共教学楼、公共课 |
| 北区教学区 | 第11教学楼 | 11教、十一教、田家炳教育书院、田家炳、教育学部、教育学 |
| 北区教学区 | 第12教学楼 | 12教、十二教、弘学楼、数学与统计学院、数统院 |
| 北区教学区 | 第13教学楼 | 13教、十三教、立惠楼、物理大楼、物理科学与技术学院、物理学院 |
| 北区教学区 | 第14教学楼 | 14教、十四教、白南楼、生命科学学院、生科院 |
| 北区教学区 | 第15教学楼 | 15教、十五教、至美楼、美术学院、美院 |
| 北区教学区 | 第16教学楼 | 16教、十六教、求实楼、药化大楼、化学化工与药学实验楼、化学化工学院、化工学院、药学院、中医药学院 |
| 北区教学区 | 第17教学楼 | 17教、十七教、漱溟楼、国家治理学院 |
| 北区教学区 | 第19教学楼（A/B栋） | 19教、十九教、厚乐楼A/B栋、音乐厅、音乐学院、音院 |
| 北区教学区 | 第20教学楼 | 20教、二十教、行健楼、体育学院、体院 |
| 北区教学区 | 第22教学楼（A/B栋） | 22教、二十二教、实德楼A/B栋、材料与能源学院、材料学院 |
| 北区教学区 | 第23教学楼 | 23教、二十三教、润心楼、心理大楼、心理学部、心理学院 |
| 北区教学区 | 第24教学楼 | 24教、二十四教、启智楼、地理大楼、地理科学学院、地科院 |
| 北区教学区 | 第25教学楼 | 25教、二十五教、明德楼、U盘大楼、理科大厦、计算机与信息科学学院、计信院、软件学院 |
| 北区教学区 | 第26教学楼 | 26教、二十六教、弘诚楼、公共教学楼、公共课 |
| 北区教学区 | 第27教学楼 | 27教、二十七教、弘信楼、公共教学楼、公共课 |
| 北区教学区 | 第28教学楼 | 28教、二十八教、弘义楼、公共教学楼、公共课 |
| 北区教学区 | 第29教学楼 | 29教、二十九教、伴月楼、半月楼 |
| 南区教学区 | 第30教学楼 | 30教、三十教、阳初楼、南区理科楼、水产学院、水产 |
| 南区教学区 | 第31教学楼 | 31教、三十一教、兆畦楼、公共教学楼、公共课、二号门入口 |
| 南区教学区 | 第32教学楼 | 32教、三十二教、弘勤楼、公共教学楼、公共课、南区大屏幕 |
| 南区教学区 | 第33教学楼 | 33教、三十三教、同庆楼、蚕桑纺织与生物质科学学院、蚕桑学院 |
| 南区教学区 | 第34教学楼 | 34教、三十四教、书楠楼、植物保护学院、植保院 |
| 南区教学区 | 第35教学楼 | 35教、三十五教、逸夫楼、资源环境学院、资环院 |
| 南区教学区 | 第36教学楼 | 36教、三十六教、含弘楼、含弘学院 |
| 南区教学区 | 第37教学楼 | 37教、三十七教、弘朴楼、动物科学技术学院、动科院 |
| 南区教学区 | 第38教学楼 | 38教、三十八教、明辨楼、法学院、法学 |
| 南区教学区 | 第39教学楼 | 39教、三十九教、弘忠楼、食品科学学院、食品院 |
| 南区教学区 | 第40教学楼 | 40教、四十教、弘实楼、食品科学学院、食品院 |
| 南区教学区 | 第41教学楼 | 41教、四十一教、世俊楼、国家重点实验室 |
| 南区教学区 | 第42教学楼 | 42教、四十二教、博学楼、电子信息工程学院、电信院 |
| 南区教学区 | 第43教学楼 | 43教、四十三教、隆平楼、农业科学研究院、农科院 |
| 南区教学区 | 第44教学楼 | 44教、四十四教、蚕学宫、资源昆虫高效养殖与利用全国重点实验室、资源昆虫实验室 |
| 南区教学区 | 第45教学楼 | 45教、四十五教、天予楼、蚕桑纺织与生物质科学学院、蚕桑学院 |
| 南区教学区 | 第46教学楼 | 46教、四十六教、荟贤楼、经济管理学院、经管院 |
| 南区教学区 | 第47教学楼 | 47教、四十七教、棉研楼、农学与生物科技学院、农生院 |
| 南区教学区 | 第48教学楼 | 48教、四十八教、弘新楼、工科大楼、工程技术学院、工学院 |
| 南区教学区 | 第49教学楼 | 49教、四十九教、勤学楼、动物医学院、动医院 |
| 北区其他 | 行署楼 | 第一行政楼、北区行政楼、行署楼A/B栋、党政机关 |
| 南区其他 | 文俊楼 | 南区行政楼、第二行政楼、行政楼、机关部门 |
| 北区其他 | 圆顶学生活动中心 | 圆顶、北区学生活动中心、第一学生活动中心 |
| 南区其他 | 厚生楼 | 南区学生活动中心、南活、第二学生活动中心、党委学工部 |
| 南区其他 | 大学生创新创业中心 | 南区招聘大厅、大创中心 |

说明：

- 当前只有教学区和其他片区细分到单体楼；宿舍园、图书馆、运动场、校医院、校外片区暂不设下级地标，选中片区即视为 `pickupPlace = 片区名`，具体门牌、详细地址和交付要求写 `remark`。以后要细分时按同样结构追加。
- 数据形状：前端 `LANDMARKS = [{ name, zone, aliases }]`；后端额外导出 `PLACE_TO_ZONE` 映射，用于 `isValidPlace` 和 `zoneOfPlace`。
- 修改清单时，11.9、前端 `campus.js`、后端 `campus.js` 三处同步；已有订单在用的正式名不改，只补别名。

### 11.10 最后 10 句话

1. 数据库 40 分，先把 14 张表、4 视图、5 过程、2 函数、5 触发器做实。
2. 报告 30 分，边开发边截图，不要留到最后三天。
3. 接口先定，前后端少吵架；数据库只有 A 能改。
4. 每天 commit + push，不要把一周的代码攒成一次提交。
5. 分支短命，功能完成就合并；`main` 只放能演示的版本。
6. 遇到冲突先 `git status`，看不懂就 `git merge --abort`，不要硬删。
7. 不会的 Git 命令先问，永远不要 `push --force`。
8. 演示失败不可怕，提前准备截图和视频。
9. 答辩不会的问题就承认，别编；把话题带回你熟悉的数据库设计。
10. 11-21 冻结功能，11-26 材料齐套，11-29 三处备份，11-30 按时提交。

---

## 12. UI 设计方向与 AI 美化技能（11-10 新增）

> 本节解决两件事：**全项目统一成明亮橙黄的视觉基调**；**A/B 各自在本地装好 UI 美化技能**，写页面时让 AI 按同一套口径出图出码。最终 UI 由 B 统一调整。

### 12.1 结论先看

| 事项 | 口径 |
| --- | --- |
| 视觉基调 | 明亮橙黄 + 暖白背景 + 白色卡片，轻圆角、轻阴影 |
| 全局样式归属 | `miniprogram/app.wxss` 由 B 维护，A 只引用变量和公共类 |
| A 的 6 个页面 | 只写页面自身的 `wxml/wxss/js`，**不修改** `app.wxss`、`app.json`、`project.config.json` |
| 品牌色落地 | B 按 12.2 的变量表更新 `app.wxss`；A 的页面代码自动跟随 |
| AI 美化技能 | ui-ux-pro-max，装在本机、各自安装；生成目录已加入 `.gitignore`，**不入库** |
| 最终 UI 调整 | 由 B 负责；A 配合只改自己负责的页面 |

### 12.2 配色口径（建议值）

**原则：** 暖色只做点缀，不做满屏大背景；亮橙配深色文字，白字只压在深橙上。

| `app.wxss` 变量 | 建议值 | 用途 |
| --- | --- | --- |
| `--color-primary` | `#FFA726` | 品牌亮橙：标签、选中态、图标、装饰块、大号文字 |
| `--color-primary-light` | `#FFF3E0` | 浅橙底：选中背景、提示块、轻量模块 |
| `--color-primary-dark` | `#A94A00` | 深橙：白字按钮底色、链接文字、需要对比度的正文 |
| `--color-accent` | `#FFD54F` | 明黄点缀：徽章、角标、插画高光 |
| `--color-success` | `#1F7A45` | 成功、已完成（白底可读） |
| `--color-warning` | `#B45309` | 警告、待处理（白底可读） |
| `--color-danger` | `#C62828` | 错误、删除、下架（白底可读） |
| `--color-text` | `#2B2622` | 主文字（暖黑） |
| `--color-text-2` | `#6B6259` | 次要文字 |
| `--color-text-3` | `#9C9288` | 弱化文字、辅助说明 |
| `--color-text-4` | `#C4B8AA` | 占位符、禁用态 |
| `--color-border` | `#F2E4D0` | 卡片描边、输入框描边 |
| `--color-divider` | `#F7EEE1` | 分割线 |
| `--color-bg` | `#FFF9F0` | 页面暖白底 |
| `--color-bg-white` | `#FFFFFF` | 卡片、弹层 |

**阴影同步调整：**

```css
--shadow-card: 0 4rpx 16rpx rgba(120, 80, 20, 0.08);
--shadow-float: 0 8rpx 24rpx rgba(255, 167, 38, 0.32);
```

**对比度红线（答辩演示看得清）：**

- 亮橙 `#FFA726` 上只能放深色文字（如 `#2B2622`），**不要放白字**（对比度约 1.9:1，不合格）。
- 白字按钮的底色用深橙 `#A94A00`（白字对比度约 5.7:1，达 WCAG AA）。
- 亮橙、明黄只做背景、图标和装饰，**不做正文文字颜色**；正文用深色或深橙。
- 正文对比度至少 4.5:1，大号字至少 3:1；橙色标签若做浅橙底，文字用深橙 `#A94A00`。
- 颜色配比按 **60-30-10**：暖白背景约 60%，白色卡片与中性文字约 30%，橙黄点缀约 10%。

### 12.3 安装 ui-ux-pro-max（A/B 各装一次）

这是开源 UI/UX 设计技能包，能按指定风格生成配色、组件规范和页面代码。**装在本机，不进仓库**；B 拉代码后需自行安装一次。

```bash
# 1. 全局安装 CLI
npm install -g ui-ux-pro-max-cli

# 2. 在仓库根目录初始化（A 用的是 Qoder）
cd D:\Code\Campus_Trading_Service_Platform
uipro init --ai qoder
```

B 按自己使用的 AI 工具替换 `--ai` 的值，可选：`qoder`、`claude`、`cursor`、`codex`、`windsurf`、`copilot`、`trae`、`universal`（不确定就用 `universal`）。可用 `uipro init --help` 查看全部。

**注意事项：**

- 生成目录随工具不同（Qoder 为 `.qoder/skills/`），已在 `.gitignore` 中排除；体积约 4.5MB，不要提交。
- 该技能只在写页面/调样式时调用，不影响小程序运行，也不要求 B 安装 Node 依赖到项目里。
- 如果技能没生效，重启 AI 工具或重新打开会话再试。
- 不要把生成目录提交到仓库；B 拉取后按上面两条命令自己装。

### 12.4 给 AI 下指令的边界（重要）

AI 默认会往 Web 技术栈跑，必须提前约束，否则生成 React/Tailwind 代码直接作废。

**硬约束：**

- 只输出**原生微信小程序**代码：`.wxml`、`.wxss`、`.js`、`.json`，不生成 H5/React/Vue。
- 不引入任何 npm 组件库、Tailwind、shadcn、Radix、CSS 预处理器。
- 尺寸一律用 `rpx`，按 750rpx 设计宽度；不使用 `px`/`rem`/`vw`。
- 颜色一律引用 `app.wxss` 变量（`var(--color-primary)` 等），**禁止写魔法色值**。
- 公共类优先复用 `app.wxss` 里的 `.row`、`.row-between`、`.btn-primary` 等，不重复造轮子。
- 一次只让 AI 处理一个页面；先让它给结构和样式方案，确认后再改代码。
- 明确告诉 AI：**不要修改** `app.wxss`、`app.json`、`project.config.json` 以及 B 负责的页面。
- 生成后自查：`wx:for`/`wx:if` 语法、`bindtap` 事件名、图片路径、以及是否出现 WXML 不支持的写法。

**提示词模板（直接抄）：**

```text
你是微信小程序前端工程师，只输出原生 WXML/WXSS/JS。
页面：miniprogram/pages/index/index
项目风格：明亮橙黄、暖白背景、白色卡片、24rpx 圆角、轻阴影。
约束：
1. 按 750rpx 设计宽度，全部用 rpx；
2. 颜色只用 app.wxss 的 CSS 变量，不写具体色值；
3. 不引入任何 npm 包、组件库、Tailwind；
4. 不改 app.wxss / app.json / project.config.json；
5. 复用现有全局类（.row / .row-between / .btn-primary 等）。
先给页面结构和样式方案，确认后再输出完整文件。
```

### 12.5 分工与落地顺序

| 时间 | 谁 | 做什么 |
| --- | --- | --- |
| 11-10 | A | 定下本节配色口径和工具安装说明，提交文档 |
| 11-11 | B | 拉取最新 `dev`，安装 ui-ux-pro-max，按 12.2 更新 `app.wxss` 变量与阴影 |
| 11-11~11-14 | A | 用变量实现 A 的 6 个页面，不碰全局样式；每页完成后请 B 过一眼 |
| 11-15 起 | B | 统一 UI 微调（间距、圆角、空状态、图标），A 只配合改自己页面 |
| 11-21 前 | 双方 | 按 12.6 清单验收 |

### 12.6 验收清单

- [ ] `app.wxss` 的 15 个颜色变量和 2 个阴影已换成橙色系（12.2）。
- [ ] 页面背景是暖白 `#FFF9F0`，不是大面积橙色。
- [ ] 白字按钮底色为深橙 `#A94A00`，亮橙上没有白字。
- [ ] A 的 6 个页面里搜不到 `#` 开头的硬编码色值（`app.wxss` 除外）。
- [ ] 所有尺寸使用 `rpx`，模拟器 375/414 宽度下不溢出。
- [ ] `.qoder/` 未被 `git status` 跟踪，仓库体积没有变大。
- [ ] B 拉取后能独立完成安装，且 AI 生成的代码是原生小程序代码。
