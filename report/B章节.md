# B 章节 · 第 4 章 数据库逻辑设计

## 合稿前置部分（B 负责：封面 / 摘要 / 目录 / 排版）

> 以下为 B 在 `report/报告.docx` 合稿时使用的前置内容。合稿方式：A 的 `report/A章节.md` + 本文件正文按章顺序「插入 → 对象 → 文件中的文字」拼入 Word，再用本节设置排版。姓名、学号、班级、指导教师为**占位**，合稿前按实际替换。

### 封面（学校模板，占 1 页）

| 项 | 内容（合稿时替换占位） |
| --- | --- |
| 课程名称 | 数据库原理与应用课程设计 |
| 题目 | 校园易站——校园二手交易与代取服务平台 |
| 姓名 / 学号 / 班级 | 【成员 A 姓名/学号】、【成员 B 姓名/学号】、【班级】 |
| 指导教师 | 【指导教师姓名】 |
| 日期 | 2026 年 11 月 |

### 摘要与关键词（约 350 字，单独一页）

**摘要**：针对高校校园内二手交易信息分散、代取需求依赖熟人转告、供需双方缺乏可信沟通渠道的问题，设计并实现了「校园易站」——面向校内用户的二手交易与代取服务平台。系统以学号作为注册身份，围绕二手商品和代取订单两条主线，完成商品发布与检索、收藏、代取订单发布与大厅接单、跑腿上线计划、站内会话与消息（含图片）等核心功能。技术上采用微信小程序原生前端、Express + MySQL 后端三层架构：前端以统一请求层与契约同构的本地模拟层支撑离线演示，后端以 JWT 鉴权、统一响应与参数化 SQL 保证安全与一致，数据库以 14 张表、4 个视图、5 个存储过程、2 个函数、5 个触发器及 ENUM + CHECK 状态机固化业务规则，并用状态日志表保留迁移轨迹。测试采用用例走查、接口回归与自动化三层：66 条用例中 B 侧 49 条全部通过，Postman 集合 116 请求 / 378 断言通过，自建冒烟 857 条断言与 mock 契约 192 条断言全绿。系统已在微信开发者工具与真机完成演示验证，覆盖从发布、沟通到完成的全流程。

**关键词**：校园易站；微信小程序；MySQL；代取服务

### 目录与排版约定

- 目录在 Word 中**自动生成**（引用 → 目录 → 自动目录），不手打页码；摘要、目录、正文、参考文献各自分页。
- A4 纸，页边距上/下 2.5cm、左 3cm、右 2.5cm；正文小四宋体、1.5 倍行距，标题黑体逐级减小；代码 Consolas 五号、浅灰底纹、单倍行距。
- 图题在图下方、表题在表上方（五号宋体居中）；图号表号按章编（图 7-1、表 4-2），正文必须引用、不留孤图；页码底部居中，页眉写项目名。
- 参考文献按 GB/T 7714 排版，正文引用标注 `[n]` 上标。
- **本次报告不含「大模型辅助开发」专题**：正文只到第 10 章 + 参考文献。

---> 负责人：B ｜ 2026-11-22 初稿，2026-11-27 按最终基线修订 ｜ 依据：`database/schema.sql`（14 张表，与《数据库 14 张表设计详解》一致）
> 约定：主键以**加粗**表示（正式 Word 排版时改为下划线）；`FK` 表示外键。图号/表号按章编号，图题在图下、表题在表上，术语按《A 成员开发计划与 Git 协作手册》§9.7.3。
>
> **本次报告不含「大模型辅助开发」专题**：按最终分工，报告正文只含第 1~10 章与参考文献，B 负责第 4/7/8/10 章及封面、摘要、目录、排版。
>
> **B 章节交接状态**（合稿时供 B 自查，A 不编辑本文件）：

| 章节 | 状态 | 配图 / 表 | 待补 | 待确认 |
| --- | --- | --- | --- | --- |
| 第 4 章 逻辑设计 | 定稿 | 表 4-1 ~ 4-15 | — | 主键下划线排版 |
| 第 7 章 系统实现 | 定稿（截图占位） | 图 7-1 + 表 7-1 + ⬜ 12 张 | 真机截图归档 | 7.6 截图编号 |
| 第 8 章 系统测试 | 定稿 | 表 8-1 ~ 8-4 | A 侧 17 条用例回填 | 终版统计值 |
| 第 10 章 系统使用简介 | 定稿 | 表 10-1 ~ 10-3 | — | 演示账号 |
| 封面/摘要/目录/排版 | 定稿（排版说明） | — | Word 自动生成目录 | 学校模板细节 |

## 4.1 关系模式

14 张表的关系模式如下（表 4-1）。所有表均满足第三范式（3NF），论证见 4.2；金额类属性统一 `DECIMAL(10,2)`，状态类属性统一 ENUM 枚举并配套 CHECK 约束。

**表 4-1 关系模式一览**

| # | 表名 | 关系模式 | 主要外键 |
| --- | --- | --- | --- |
| 1 | 用户表 | users(**user_id**, student_no, password_hash, nickname, avatar_url, campus, college, phone, credit_score, status, created_at) | — |
| 2 | 书目表 | books(**book_id**, isbn, title, author, publisher, edition, price_ref, cover_url) | — |
| 3 | 二手分类表 | categories(**category_id**, name, sort_no) | — |
| 4 | 商品主表 | items(**item_id**, seller_id FK→users, category_id FK→categories, book_id FK→books, item_type, title, description, price, original_price, condition_level, negotiable, campus, location, status, view_count, favorite_count, created_at, updated_at) | seller_id / category_id / book_id |
| 5 | 商品图片表 | item_images(**image_id**, item_id FK→items, url, sort_no) | item_id |
| 6 | 收藏表 | favorites(**user_id** FK→users, **item_id** FK→items, created_at) | (user_id, item_id) 复合主键 |
| 7 | 跑腿接单设置表 | runner_profiles(**user_id** FK→users, is_online, availability_type, service_areas, service_places, time_slots, manual_until, base_price, remark, completed_count) | user_id（与用户 1:1） |
| 8 | 跑腿可接规格表 | runner_item_sizes(**user_id** FK→runner_profiles, **item_size**) | user_id |
| 9 | 代取订单表 | errand_orders(**order_id**, publisher_id FK→users, runner_id FK→users, pickup_area, pickup_place, delivery_location, item_size, item_desc, remark, reward, time_type, time_start, deadline, status, visibility, created_at, taken_at, completed_at) | publisher_id / runner_id |
| 10 | 会话表 | conversations(**conversation_id**, user_a_id FK→users, user_b_id FK→users, biz_type, biz_id, last_message, last_time) | user_a_id / user_b_id |
| 11 | 消息表 | messages(**message_id**, conversation_id FK→conversations, sender_id FK→users, msg_type, content, is_read, created_at) | conversation_id / sender_id |
| 12 | 商品状态日志表 | item_status_logs(**log_id**, item_id FK→items, old_status, new_status, changed_by FK→users, changed_at) | item_id / changed_by |
| 13 | 代取状态日志表 | errand_status_logs(**log_id**, order_id FK→errand_orders, old_status, new_status, changed_by FK→users, changed_at) | order_id / changed_by |
| 14 | 用户反馈表 | feedback(**feedback_id**, user_id FK→users, content, created_at) | user_id |

实体联系说明（对应图 4-1 关系模式图，可选绘制）：

- users 与 items 是 **1 : n**（一个用户发布多件商品）；users 与 runner_profiles 是 **1 : 1**（一个用户至多一份接单设置）。
- users 与 errand_orders 存在**两条** 1:n 联系（作为发布者 publisher_id、作为接单人 runner_id，接单人可为空）。
- users 与 users 通过 conversations 构成**多对多**的会话联系，并由 (biz_type, biz_id) 绑定到具体商品或代取单；conversations 与 messages 是 **1 : n**。
- items 与 item_images 是 **1 : n**；users、items 通过 favorites 构成**多对多**收藏联系（复合主键天然去重）。
- items / errand_orders 与各自的状态日志表是 **1 : n**，日志表记录状态机每次迁移的轨迹（审计用途）。

## 4.2 3NF 论证（挑 4 张核心表）

判定路径：1NF（属性原子）→ 2NF（非主属性完全函数依赖于候选键）→ 3NF（消除非主属性对候选键的传递依赖）。

### 4.2.1 items（商品主表）

- **1NF**：所有属性均为不可再分的原子值；多值属性「图片」被拆出到 item_images，满足原子性。
- **2NF**：主键为单属性 item_id，不存在复合主键，部分依赖问题无从产生。
- **3NF 论证（消除传递依赖）**：最初的草稿把「分类名称 category_name」「书名 book_title」直接放进商品表，形成传递依赖
  `item_id → category_id → category_name`、`item_id → book_id → book_title`——分类一旦改名就要批量更新所有商品行，且存在插入异常（新分类没有商品时无处安放）。因此把分类名与书名分别归位到 categories、books 两张主表，items 只保留外键 category_id / book_id，**消除了这两条传递依赖**。同理，「卖家昵称 / 信用分」依赖 seller_id 而非 item_id，统一由 JOIN users 得到，不在 items 冗余存储。
- 另外价格类属性带 `CHECK (price >= 0)`，浏览量/收藏量 `CHECK >= 0`，保证用户自定义完整性。

### 4.2.2 errand_orders（代取订单表）

- **1NF**：「取件片区 + 取件地标 + 送达地」拆为三个独立属性（pickup_area / pickup_place / delivery_location），不做「桃园 · 三食堂」式的拼串存储；时间拆为 time_type + time_start + deadline 三列。
- **2NF**：单属性主键 order_id，无部分依赖。
- **3NF 论证**：设计上容易出现的传递依赖是「接单人 → 接单人昵称/头像」，即 `order_id → runner_id → runner_nickname`。若在订单表冗余接单人昵称，用户改名后历史订单展示将不一致。本表只保留 runner_id 外键，展示字段经 JOIN users 获取，**消除了对 runner 的传递依赖**（会话卡片所需的发布者昵称快照由视图/查询层组装，不在表层冗余）。
- 表级 CHECK 同时约束了状态机与时间语义：`chk_errands_time` 保证 asap 不带时间、deadline 必有截止、range 必有起止且 `time_start < deadline`，把「非法组合」挡在数据库层而非只靠应用层。

### 4.2.3 messages（消息表）

- **1NF**：消息内容整体为 TEXT 原子属性，图片消息只存 url 不存二进制。
- **2NF**：主键 message_id 单属性，无部分依赖。
- **3NF 论证**：会话的双方用户、业务对象等描述信息都依赖 conversation_id 而非 message_id。若把 user_a/user_b 或商品标题放进消息表，则每条消息都要冗余一份会话级数据——这是典型的传递依赖 `message_id → conversation_id → 会话属性`。消息表只保留 conversation_id 外键，**消除该传递依赖**。
- 未读数不在表内聚合存储（避免计数器维护不一致），由触发器 + `v_conversation_base` 视图按 `is_read = 0` 实时聚合，读侧一致性由数据库对象保证。

### 4.2.4 runner_profiles（跑腿接单设置表）

- **1NF**：「服务片区」「服务地标」「在线时段」均为多值集合，拆为 JSON 数组列 + 独立的 runner_item_sizes 规格表（复合主键 (user_id, item_size)），不在一行里放逗号串，满足原子性。
- **2NF**：主键 user_id 单属性（与 users 1:1），无部分依赖。
- **3NF 论证**：完成单数 completed_count 是「由接单行为聚合出来的派生属性」，理论上可由 errand_orders 统计得出——若直接依赖订单表计算，它对 user_id 的依赖是通过 errand_orders 的传递依赖。设计上将其作为**可验证的冗余计数**保留（由触发器/事务维护），并以 `CHECK (completed_count >= 0)` 约束；这是「反规范化换查询性能」的明确取舍，其余属性均无传递依赖。
- `chk_runner_slot_requires_schedule` 保证「按计划上线」至少有一条未来时段，业务规则下沉到数据库层。

### 小结

- 全库 14 张表满足 3NF；仅 completed_count 一处为有约束保障的反规范化冗余。
- 状态机（items.status、errand_orders.status）全部用 ENUM + 日志表 + 触发器三方固化，杜绝「字符串状态」。
- 金额统一 DECIMAL(10,2) 并 CHECK 非负，对应接口层 v0.10 的两位小数校验（前后端三层同口径）。

## 4.3 表结构（从 schema.sql 整理，表 4-2 ~ 4-15）

> 字段名/类型/约束与 `database/schema.sql` 完全一致，禁止手打；说明列为业务含义。

**表 4-2 users（用户表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | BIGINT | 主键自增 | 用户 ID |
| student_no | VARCHAR(20) | NOT NULL，唯一 uk_users_student_no | 学号（登录名） |
| password_hash | VARCHAR(100) | NOT NULL | 密码哈希 |
| nickname | VARCHAR(50) | NOT NULL | 昵称 |
| avatar_url | VARCHAR(255) | NULL | 头像地址 |
| campus | VARCHAR(50) | NULL | 校区（保留字段） |
| college | VARCHAR(100) | NULL | 学院 |
| phone | VARCHAR(20) | NULL | 手机号 |
| credit_score | INT | NOT NULL 默认 60，CHECK 0~100 | 信用分 |
| status | ENUM('active','disabled') | NOT NULL 默认 active | 账号状态 |
| created_at | DATETIME | NOT NULL 默认当前时间 | 注册时间 |

**表 4-3 books（书目表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| book_id | BIGINT | 主键自增 | 书目 ID |
| isbn | VARCHAR(20) | NULL，唯一 uk_books_isbn | ISBN（去重键） |
| title | VARCHAR(200) | NOT NULL | 书名 |
| author | VARCHAR(100) | NULL | 作者 |
| publisher | VARCHAR(100) | NULL | 出版社 |
| edition | VARCHAR(50) | NULL | 版次 |
| price_ref | DECIMAL(10,2) | NULL，CHECK ≥0 | 参考价 |
| cover_url | VARCHAR(255) | NULL | 封面地址 |

**表 4-4 categories（二手分类表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| category_id | INT | 主键自增 | 分类 ID |
| name | VARCHAR(50) | NOT NULL，唯一 | 分类名 |
| sort_no | INT | NOT NULL 默认 0 | 排序号 |

**表 4-5 items（商品主表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| item_id | BIGINT | 主键自增 | 商品 ID |
| seller_id | BIGINT | NOT NULL，FK→users，RESTRICT | 卖家 |
| category_id | INT | NULL，FK→categories，SET NULL | 分类 |
| book_id | BIGINT | NULL，FK→books，SET NULL | 书目（book 类商品） |
| item_type | ENUM('normal','book') | NOT NULL 默认 normal | 商品类型 |
| title | VARCHAR(100) | NOT NULL | 标题 |
| description | TEXT | NULL | 描述 |
| price | DECIMAL(10,2) | NOT NULL，CHECK ≥0 | 售价 |
| original_price | DECIMAL(10,2) | NULL，CHECK ≥0 | 原价 |
| condition_level | ENUM('new','like_new','good','fair') | NOT NULL 默认 good | 成色 |
| negotiable | TINYINT(1) | NOT NULL 默认 0，CHECK ∈(0,1) | 可议价 |
| campus | VARCHAR(50) | NULL | 校区（保留） |
| location | VARCHAR(100) | NULL | 交易地点 |
| status | ENUM('on_sale','reserved','sold','off_shelf') | NOT NULL 默认 on_sale | 状态 |
| view_count | INT | NOT NULL 默认 0，CHECK ≥0 | 浏览量 |
| favorite_count | INT | NOT NULL 默认 0，CHECK ≥0 | 收藏数 |
| created_at / updated_at | DATETIME | NOT NULL，自动维护 | 创建/更新时间 |

索引：idx_items_status_created(status,created_at)、idx_items_book_status_created、idx_items_category_price(category_id,price)、idx_items_seller_status。

**表 4-6 item_images（商品图片表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| image_id | BIGINT | 主键自增 | 图片 ID |
| item_id | BIGINT | NOT NULL，FK→items，CASCADE | 所属商品 |
| url | VARCHAR(255) | NOT NULL | 图片地址 |
| sort_no | INT | NOT NULL 默认 0 | 排序号（封面取最小） |

**表 4-7 favorites（收藏表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | BIGINT | 复合主键，FK→users，CASCADE | 收藏人 |
| item_id | BIGINT | 复合主键，FK→items，CASCADE | 被收藏商品 |
| created_at | DATETIME | NOT NULL 默认当前时间 | 收藏时间 |

**表 4-8 runner_profiles（跑腿接单设置表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | BIGINT | 主键，FK→users，CASCADE | 用户（1:1） |
| is_online | TINYINT(1) | NOT NULL 默认 0 | 当前是否上线 |
| availability_type | ENUM('slot','now') | NOT NULL 默认 slot | 在线方式 |
| service_areas | JSON | NOT NULL，CHECK 为非空数组 | 服务片区 |
| service_places | JSON | NOT NULL 默认 [] | 服务地标 |
| time_slots | JSON | NOT NULL 默认 [] | 在线计划 |
| manual_until | DATETIME | NULL | 手动上线截止 |
| base_price | DECIMAL(10,2) | NULL，CHECK ≥0 | 起步报价 |
| remark | VARCHAR(255) | NULL | 备注 |
| completed_count | INT | NOT NULL 默认 0，CHECK ≥0 | 完成单数（触发器维护） |

**表 4-9 runner_item_sizes（跑腿可接规格表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | BIGINT | 复合主键，FK→runner_profiles，CASCADE | 跑腿用户 |
| item_size | ENUM('small','medium','large') | 复合主键 | 可接规格 |

**表 4-10 errand_orders（代取订单表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| order_id | BIGINT | 主键自增 | 订单 ID |
| publisher_id | BIGINT | NOT NULL，FK→users，RESTRICT | 发布者 |
| runner_id | BIGINT | NULL，FK→users，SET NULL | 接单人 |
| pickup_area | VARCHAR(20) | NOT NULL | 取件片区 |
| pickup_place | VARCHAR(50) | NOT NULL | 取件地标 |
| delivery_location | VARCHAR(100) | NOT NULL | 送达地 |
| item_size | ENUM('small','medium','large') | NOT NULL | 物品规格 |
| item_desc | VARCHAR(500) | NULL | 物品描述 |
| remark | VARCHAR(255) | NULL | 备注 |
| reward | DECIMAL(10,2) | NOT NULL，CHECK ≥0 | 报酬 |
| time_type | ENUM('asap','deadline','range') | NOT NULL 默认 asap | 时间类型 |
| time_start / deadline | DATETIME | NULL，由 chk_errands_time 联动校验 | 起止时间 |
| status | ENUM('pending','taken','completed','cancelled') | NOT NULL 默认 pending | 状态 |
| visibility | ENUM('private','hall') | NOT NULL 默认 hall | 可见性 |
| created_at / taken_at / completed_at | DATETIME | 默认当前时间/NULL | 关键时间点 |

索引：idx_errands_visibility_status_created（大厅查询）、idx_errands_publisher_status、idx_errands_runner_status。

**表 4-11 conversations（会话表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| conversation_id | BIGINT | 主键自增 | 会话 ID |
| user_a_id | BIGINT | NOT NULL，FK→users（RESTRICT/RESTRICT） | 会话方 A（较小 ID） |
| user_b_id | BIGINT | NOT NULL，FK→users（RESTRICT/RESTRICT） | 会话方 B（较大 ID） |
| biz_type | ENUM('item','errand') | NOT NULL | 业务类型 |
| biz_id | BIGINT | NOT NULL 默认 0 | 业务对象 ID |
| last_message | VARCHAR(255) | NULL | 最后一条消息（触发器维护） |
| last_time | DATETIME | NULL | 最后消息时间 |

约束：chk_conversations_user_order（user_a_id < user_b_id，配合存储过程保证两端并发只建一条会话）、uk_conversations_pair_biz 四元组唯一。

**表 4-12 messages（消息表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| message_id | BIGINT | 主键自增 | 消息 ID（增量轮询锚点） |
| conversation_id | BIGINT | NOT NULL，FK→conversations，CASCADE | 所属会话 |
| sender_id | BIGINT | NOT NULL，FK→users，RESTRICT | 发送者 |
| msg_type | ENUM('text','image') | NOT NULL 默认 text | 消息类型 |
| content | TEXT | NOT NULL | 内容（≤500 字） |
| is_read | TINYINT(1) | NOT NULL 默认 0，CHECK ∈(0,1) | 已读标记 |
| created_at | DATETIME | NOT NULL 默认当前时间 | 发送时间 |

索引：idx_messages_conv_msg(conversation_id, message_id)——支撑「按会话取增量」的游标查询。

**表 4-13 item_status_logs（商品状态日志表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| log_id | BIGINT | 主键自增 | 日志 ID |
| item_id | BIGINT | NOT NULL，FK→items，CASCADE | 商品 |
| old_status | ENUM(四态) | NULL | 原状态（首建为 NULL） |
| new_status | ENUM(四态) | NOT NULL | 新状态 |
| changed_by | BIGINT | NULL，FK→users，SET NULL | 操作人 |
| changed_at | DATETIME | NOT NULL 默认当前时间 | 变更时间 |

**表 4-14 errand_status_logs（代取状态日志表）**

结构同表 4-13，主键 log_id、外键 order_id→errand_orders，枚举为代取四态（pending/taken/completed/cancelled）。

**表 4-15 feedback（用户反馈表）**

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| feedback_id | BIGINT | 主键自增 | 反馈 ID |
| user_id | BIGINT | NOT NULL，FK→users，CASCADE | 反馈人 |
| content | TEXT | NOT NULL | 内容（≤200 字） |
| created_at | DATETIME | NOT NULL 默认当前时间 | 提交时间 |

索引：idx_feedback_user_time(user_id, created_at)。

---

# B 章节 · 第 7 章 系统实现

> 负责人：B ｜ 2026-11-23 初稿，2026-11-27 按最终基线修订 ｜ 依据：`miniprogram/`（20 页，B 14 页 + A 6 页）、`server/src/`（A 主笔，B 参与 `routes/chat.js`）
> 截图占位说明：7.4 / 7.6 的真机截图统一归档到 `report/assets/`，文中以 ⬜ 标注；本次排版保持占位，不在正文塞未核对的截图。

## 7.1 系统总体架构

系统采用「小程序端 + 后端服务 + 数据库」三层架构（图 7-1）：

```text
┌─────────────────────────────────────────────────┐
│  微信小程序（miniprogram/，JS/WXML/WXSS 共 94 文件、23,035 行）│
│  20 个页面 ｜ 5 个公共组件 + custom-tab-bar ｜ utils 公共层 │
│  request.js 统一封装 ←→ MOCK 模式（utils/mock.js）  │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / JSON
                       │ Authorization: Bearer <token>
┌──────────────────────▼──────────────────────────┐
│  Express 后端（server/src/，19 个 JS 文件、3,910 行）│
│  11 个路由模块 ｜ auth 鉴权中间件 ｜ 统一响应 ok/fail │
│  全局错误中间件 ｜ multer 上传                       │
└──────────────────────┬──────────────────────────┘
                       │ mysql2 连接池，参数化 SQL
┌──────────────────────▼──────────────────────────┐
│  MySQL 8.0（database/，14 张表）                   │
│  4 视图 ｜ 5 存储过程 ｜ 2 函数 ｜ 5 触发器          │
│  ENUM + CHECK 状态机 ｜ 状态日志表                   │
└─────────────────────────────────────────────────┘
```

（图 7-1 系统总体架构图 ⬜ 按上图绘制）

三个关键设计决策：

1. **统一响应契约**：后端所有接口返回 `{ code, message, data }`，`code === 0` 成功；`fail()` 的 `code` 即 HTTP 状态码，前端据此做 401/403/404/409 分支，两端无需各自的错误字典。
2. **契约同构的 MOCK 层**：`miniprogram/utils/mock.js` 与 A 的真实路由逐字对齐（含错误文案、分页上限 50、两位小数校验），由 `scripts/mock-contract-test.js` 192 条断言锁定。后端未联调时前端可独立开发演示，切换只需改 `config.MOCK`。
3. **权限判断前置后端**：详情/订单类接口直接返回 `canTake/canEdit/canPublish/canComplete/canCancel/canRelease` 布尔字段，前端不自行推导权限，避免两端规则漂移。

## 7.2 小程序端实现

**代码量统计（表 7-1）**

| 部分 | 文件数 | 行数 | 说明 |
| --- | --- | --- | --- |
| miniprogram JS | 39 | 12,686 | 页面逻辑、公共层、custom-tab-bar |
| miniprogram WXML | 27 | 3,372 | 页面结构 |
| miniprogram WXSS | 28 | 6,977 | 全局设计令牌 + 页面样式 |
| **小程序端合计** | **94** | **23,035** | — |
| server/src JS | 19 | 3,910 | A 主笔（B 参与 chat.js） |
| scripts 测试脚本 | 20 | 5,390 | 16 个冒烟脚本 + 契约测试 + 建库辅助（不入小程序包） |

**公共层（miniprogram/utils/）**：

- `request.js`：统一网络封装。约定（与 A 后端一致）：响应体 `{code,message,data}`、code 0 成功 resolve、401 清登录态跳登录（`skipAuthRedirect` 例外）、403「账号已被禁用」特判、其余 code 默认 toast；支持 `silent/loading/auth` 选项。MOCK 模式只走 mock，路由未登记明确报错，绝不回落真实网络。
- `adapter.js`：图片地址适配（相对路径 `/uploads/...` 与 `fullUrl` 拼接）。
- `mock.js`：与 A 路由逐字对齐的契约层（见 7.4 关键功能 2）。
- `campus.js`：25 片区 + 52 地标唯一数据源（与 `server/src/utils/campus.js` 同步）。
- `placeholder.js`：无图占位统一入口——二手商品无封面、代取订单（无图片字段）按 `itemId/orderId` 稳定哈希取 `assets/placeholder/ph-1..7.png` 一张，同一条目在列表、详情、刷新之间恒为同一张图。
- `util.js` / `version.js`：时间格式化等工具与版本号。

**公共组件（miniprogram/components/，5 个）**：`item-card`（商品卡）、`status-tag`（状态标签）、`empty-state`（空态）、`nav-top`（自定义导航）、`place-picker`（片区/地标联动选择）。另有 `custom-tab-bar` 实现半透明模糊底栏。

**页面结构**：20 个页面，其中 B 独立负责 14 页（登录、注册、代取大厅、发布代取、代取详情、找跑腿、我的代取、接单设置、聊天列表、聊天详情、我的、个人资料、设置、帮助），A 负责 6 页（首页、搜索、商品详情、发布商品、我的发布、我的收藏）。页面按「登录门 → 业务页」组织，受限页通过 `app.requireLogin(path)` 守卫，登录成功带 `redirect` 回跳。

## 7.3 后端接口实现

> 本节由 B 依据 A 的代码归纳，代码归 A。

**路由分层**：11 个路由模块挂载于 `/api` 前缀——`auth`（登录/注册）、`users`（资料）、`items`（商品）、`books`（书目）、`categories`、`favorites`、`errands`（代取）、`runners`（跑腿）、`chat`（会话/消息）、`upload`、`feedback`。固定路由注册在 `/:id` 之前（如 chat 的 `/unread-count`），避免路径参数误吞。

**鉴权中间件**：`middleware/auth.js` 校验 `Authorization: Bearer <token>`，失败统一 401；禁用账号固定返回 403 +「账号已被禁用」文案（前端据此清会话踢回登录页）。路由按需挂载，公开接口（登录、注册）不挂。

**统一响应**：`ok(res, data)` / `fail(res, code, message)` 两个助手，`fail` 的 code 直接作为 HTTP 状态码（400 参数错 / 401 未登录 / 403 越权 / 404 不存在 / 409 状态冲突），保证全站错误语义一致。

**全局错误中间件**：兜底 500，固定返回「服务器错误」，不向外泄漏堆栈；业务校验失败则透出可读的 `message`（如「该单已被别人接走」）。

## 7.4 关键功能实现

每个关键功能按「需求 → 设计 → 代码片段 → 效果截图」四段写，代码只放最关键的判断。

### 7.4.1 登录鉴权（前端请求层）

**需求**：token 过期自动踢回登录页；但登录接口自身的 401（「学号或密码错误」）不能被误当成「登录过期」而清掉用户已有的会话。

**设计**：`request.js` 在响应拦截处区分两种 401——调用方传 `skipAuthRedirect`（登录接口专用）时走普通错误分支只 toast；其余 401 统一 `clearSessionEverywhere()`（走 `app.clearSession`，连同未读数、tabBar 角标一起清）后带 redirect 跳登录页。

```js
// miniprogram/utils/request.js（节选）
if ((status === 401 || body.code === config.UNAUTHORIZED_CODE)
    && !opts.skipAuthRedirect) {
  handleUnauthorized();            // 清登录态（含角标/未读）+ 跳登录页
  reject({ code: 401, message: '登录已失效，请重新登录' });
  return;
}
// 403 + 「账号已被禁用」：清会话回登录页，不留假登录态
if (status === 403 && (body && body.message) === '账号已被禁用') { ... }
```

**效果**：输错密码只出 toast 不跳页（TC-U02）；token 过期任何请求自动回登录页且并发只跳一次（TC-U07）⬜ 截图。

### 7.4.2 代取/商品状态机

**需求**：状态流转只能沿合法路径进行（如已售出是终态），非法流转必须 409；前端按钮随权限字段显隐。

**设计**：状态机用「映射表 + 白名单判定」固化，与 A 的 `errands.js` / `items.js` 语义一致；前端不自推权限，按钮显隐信任接口返回的 `canXxx` 字段。

```js
// miniprogram/utils/mock.js（与 A 路由逐字对齐）
const STATUS_TRANSITIONS = {
  on_sale:  ['reserved', 'sold', 'off_shelf'],
  reserved: ['on_sale', 'sold'],
  off_shelf: ['on_sale'],
  sold: []                                // 终态
};
// PUT /api/items/:id/status（节选）
const allowed = STATUS_TRANSITIONS[found.status] || [];
if (allowed.indexOf(status) < 0) return fail(409, '当前状态不能变更为目标状态');
```

**效果**：sold → on_sale 409（A 的 Postman API-17 PASS）；前端连点接单由 `submitting` 守卫只发 1 次请求（负向场景 9）⬜ 截图。

### 7.4.3 聊天会话建立（B 参与 chat.js，A 文件）

**需求**：同一对用户对同一业务对象（商品/代取单）只建一条会话；任何登录用户都可就任意订单发起会话（「先聊后接」）——私单发布者把订单 ID 分享给同学后，对方点进对话即可直接沟通、接单。

**设计**：会话表以 `chk_conversations_user_order` 约束 `user_a_id < user_b_id` 归一化 + 四元组唯一键去重；路由层调存储过程 `sp_get_or_create_conversation`，存储过程内部先查后插，配合唯一键在两端并发创建时也只留一条。服务端 `chat.js` 保留「对方用户存在」「商品/订单存在」校验，不再按发布者/接单者身份拦截会话创建（11-26 定稿）。

```js
// server/src/routes/chat.js（B 参与实现，节选；11-26 起不按身份拦私单）
const [orderRows] = await pool.query(
  `SELECT order_id AS orderId FROM errand_orders WHERE order_id = ?`, [bizId]
);
if (!orderRows.length) return fail(res, 404, '订单不存在');
// 存储过程保证 user_a_id < user_b_id 归一化 + 唯一键去重
conn = await pool.getConnection();
await conn.query('CALL sp_get_or_create_conversation(?, ?, ?, ?, @conversationId)',
  [userId, peerId, bizType, bizId]);
const [outRows] = await conn.query('SELECT @conversationId AS conversationId');
```

**效果**：同一商品反复「联系对方」不产生重复会话（TC-C 系列）；私单点进对话直接进入会话、不再被 403 拦回；会话 ID 幂等复用（负向场景 8 已改为此口径）⬜ 截图。

**连带授权说明**：代取详情可见性与 `canTake` 依赖 `isErrandChatPeer`（存在该单会话即可见/可接），因此放开会话发起后，私单对知道订单 ID 的用户开放——与「分享单号邀请同学」的产品口径一致（口径变化已在接口文档与手册留痕）。

### 7.4.4 消息轮询与增量拉取

**需求**：聊天页无 WebSocket 依赖，用定时轮询保持消息新鲜；页面隐藏必须停止轮询，进出 10 次不留定时器。

**设计**：`onLoad` 拉全量，此后以 `messageId` 为游标只拉增量（后端索引 `idx_messages_conv_msg(conversation_id, message_id)` 支撑游标查询）；`onShow` 起轮询、`onHide`/`onUnload` 均 `clearInterval`，`_pollTimer` 守卫防止叠加；隐藏时顺手标记已读。

```js
// miniprogram/pages/chat/detail.js（节选）
startPoll() {
  if (this._pollTimer || !this.data.conversationId) return;   // 守卫不叠加
  this._pollTimer = setInterval(() => this.pollTick(), POLL_INTERVAL);
},
stopPoll() {
  if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
},
onHide() { this.stopPoll(); this.markRead(); }   // 隐藏即停轮询 + 标已读
```

**效果**：快速进出聊天页 10 次后定时器集合为空（负向场景 10，`smoke_negative.js` [10] 断言）⬜ 截图。

**图片消息（11-24 补齐，11-26 加固）**：输入栏「＋」选图（`wx.chooseMedia`，相册/拍照、压缩图）→ `wx.uploadFile` 上传得 `/uploads/` 相对路径 → 以 `msgType: 'image'` 发送；乐观气泡先显示本地临时图，上传成功后换服务端 URL；点击图片气泡 `wx.previewImage` 全屏预览；发送阶段失败重发不重新上传（已传 URL 直发），上传失败则从本地临时文件重传。真机上若手机端加载不到图片源（回环地址/域名校验/服务未启动），`<image>` 的 `binderror` 把气泡降级为「图片加载失败·点击重试」占位——重试优先回退本地临时图，否则加时间戳破缓存；不再留 240rpx 空白泡。契约 `[13]` 节 + 冒烟 `[13b]` 节锁定（最终基线：契约 192/0、冒烟 857/0）。

**键盘适配（11-26 定稿）**：聊天输入框关闭 `adjust-position`（默认行为会把整页连同 nav-top 顶出屏幕），改监听 `bindkeyboardheightchange` 给输入条按键盘实高垫 `padding-bottom`；同时键盘弹起时页面底部 `env(safe-area-inset-bottom)` 归零，避免与键盘高度双重抬升出约 34px 的空隙——键盘与输入框贴紧、导航与消息区位置不变。

## 7.5 数据库访问

> 数据库对象归 A，本节写访问侧的关键约定与调用点。

- **连接与参数化**：全部经 `mysql2/pool` 连接池访问，语句一律 `?` 占位符传参（如 7.4.3、7.4.4 的 `pool.query(sql, [params])`），杜绝字符串拼接注入。
- **视图调用点**：`chat.js` 的会话列表/详情读 `v_conversation_base`（一次 JOIN 出双方昵称头像），商品列表读 `v_item_list`（聚合首图/浏览数），未读数由 `fn_unread_count(conversationId, userId)` 按行计算；其余视图由 A 在 `/api/users/me` 等入口使用（共 4 视图）。
- **存储过程调用点**：`sp_get_or_create_conversation`（7.4.3）是会话创建唯一入口，保证归一化与并发去重。
- **触发器维护**：messages 插入后由触发器回写 conversations 的 `last_message/last_time`，未读数不冗余存储、读时聚合，写侧一致。
- **状态日志**：items/errands 状态变更由触发器写入两张状态日志表，形成完整审计轨迹。
- **事务/乐观锁**：接单等并发敏感操作由 A 在 errands 层以条件 UPDATE（影响行数判定）处理，竞态失败返回 409「该单已被别人接走」（8.5 详述）。

## 7.6 界面展示

截图随归档补入 `report/assets/`，以下为拍摄清单（⬜）：

| # | 截图 | 一句话说明 |
| --- | --- | --- |
| 1 | 登录页 | 学号密码登录，奶油纸感设计令牌 |
| 2 | 二手首页 | 分类宫格 + 商品瀑布流（A 页） |
| 3 | 商品详情 | 轮播图 + 成色/价格 + 收藏与联系卖家 |
| 4 | 发布商品（book 模式） | 选书目自动带出 ISBN 与参考价 |
| 5 | 代取大厅 | 待接单大厅卡：片区路线连接线 + 报酬胶囊 |
| 6 | 发布代取 | 片区/地标联动选择器 + 时间三类型 |
| 7 | 代取详情 | 状态条 + canXxx 权限按钮组 |
| 8 | 找跑腿 | 在线跑腿列表（effectiveOnline 口径） |
| 9 | 接单设置 | 片区多选 + 每周/单次在线计划 |
| 10 | 聊天列表 | 会话卡 + 未读角标 |
| 11 | 聊天详情 | 气泡流 + 500 字输入栏 |
| 12 | 我的 | 用户卡 + 统计行 + 全部功能入口 |

---

# B 章节 · 第 8 章 系统测试

> 负责人：B ｜ 2026-11-23 初稿，2026-11-27 按最终基线修订 ｜ 数字口径：全部来自 `docs/测试用例.md`、`docs/B测试记录.md`、`docs/负向测试记录-B.md`、`docs/bug清单.md`、`docs/A测试记录.md`，与正文引用文件保持一致；自动化数字取仓库最终一次全量回归（冒烟 857/0、契约 192/0）。

## 8.1 测试环境与方法

| 项 | 内容 |
| --- | --- |
| 环境 | Windows 11 + 微信开发者工具（小程序端）；Node.js + Express + MySQL 8.0（后端，A 维护） |
| 方法 | ① **代码级冒烟测试**：16 个自写 Node 脚本（`scripts/smoke/`）直接解析 WXML/JS 断言交互逻辑，合计 **857 条断言**；② **契约测试**：`scripts/mock-contract-test.js` **192 条断言**锁定 mock 与 A 真实路由逐字一致；③ **接口测试**：A 的 Postman 集合（newman 6.2.3，116 请求 / 378 断言）；④ **走查 + 负向测试**：两轮 UI 走查 + 12 条异常场景 + 多轮真机回归；⑤ **用例管理**：`docs/测试用例.md` 66 条（B 49 / A 17） |
| 证据约定 | B 侧「实际结果」必须落到冒烟脚本编号 / 契约断言编号 / 走查记录章节，不接受口头「过了」 |

## 8.2 测试用例设计

用例按「模块 × 正反向」设计，正向覆盖主流程闭环，反向覆盖参数校验、越权、状态冲突。P0（阻塞演示路径）必须在演示前 100% 通过。全表见 `docs/测试用例.md`（66 条），模块分布如表 8-1：

**表 8-1 用例模块分布**

| 模块 | 用例数 | B（UI/聊天） | A（后端/数据库） |
| --- | --- | --- | --- |
| 用户与登录 | 12 | 8 | 4 |
| 二手商品 | 11 | 8 | 3 |
| 收藏 | 5 | 4 | 1 |
| 代取 | 15 | 12 | 3 |
| 聊天 | 11 | 9 | 2 |
| 公共与全局 | 12 | 8 | 4 |
| **合计** | **66** | **49** | **17** |

## 8.3 功能测试结果

**表 8-2 功能测试结果统计**（与 `docs/测试用例.md` §七 一致）

| 模块 | B 通过 / B 用例 | A 执行情况 |
| --- | --- | --- |
| 用户与登录 | 8 / 8 | 4 条待 A 回填 |
| 二手商品 | 8 / 8 | 3 条待 A 回填（其中 TC-I09/I10 的 mock 断言已过） |
| 收藏 | 4 / 4 | 1 条待 A 回填 |
| 代取 | 12 / 12 | 3 条待 A 回填 |
| 聊天 | 9 / 9 | 2 条待 A 回填 |
| 公共与全局 | 8 / 8 | 4 条待 A 回填 |
| **合计** | **49 / 49（100%）** | **17 条已立、待执行** |

- **B 侧 49 条全部通过，P0 用例全量 100%**（证据链：`docs/B测试记录.md` 三链映射）。
- **A 侧自动化回归已过**：Postman 集合 **116/116 请求、378/378 断言**通过（2026-11-20 newman，总耗时 10.6s，平均响应 8ms）；数据库对象用例待 A 执行回填。
- **自动化基线（终版）**：冒烟 **857 / 0**（16 个脚本）、契约 **192 / 0**、WXML 配平检查全 PASS。每次回归数字以仓库最新提交为准。

## 8.4 异常与边界测试

12 条负向场景全部通过（详见 `docs/负向测试记录-B.md`，自动化断言 `smoke_negative.js` 43/0），摘要如表 8-3：

**表 8-3 负向测试摘要**

| # | 场景 | 结果与关键证据 |
| --- | --- | --- |
| 1 | token 过期/被删 | ✅ 清会话（含角标）→ 带 redirect 回登录页 |
| 2 | 未登录点受限页 | ✅ 拦截跳登录，登录后回原页 |
| 3 | 断网刷列表 | ✅ 错误态 + 重试；翻页失败只 toast 保留已有列表 |
| 4 | 后端 500 | ✅ 固定「服务器错误」，不漏堆栈；业务错误透出可读 message |
| 5 | 提交空表单 | ✅ 字段级红字拦截，请求数为 0 |
| 6 | 报酬 abc / -1 / 9999 | ✅ 前端全部拦截（0 < r ≤ 200） |
| 7 | 消息发空 / 501 字 | ✅ 前端 maxlength 截断 + 后端 400 双层 |
| 8 | 私单会话发起（11-26 口径） | ✅ 取消发布者/接单者限制后，任何登录用户可就私单直接建会话（幂等复用既有会话）；保留「订单不存在 404」「越权读他人会话 403」两层校验（TC-G03） |
| 9 | 快速连点接单 3 次 | ✅ `submitting` 守卫，只发 1 次请求 |
| 10 | 聊天页快速进出 10 次 | ✅ 定时器集合为空，无泄漏 |
| 11 | 长昵称 / 长标题 | ✅ 省略号截断，不撑破布局 |
| 12 | 无数据新账号 | ✅ 空态组件 + 引导按钮 |

**口径备注（写进报告避免歧义）**：① 报酬上限是两层口径——后端按 `DECIMAL(10,2)` 上限放行，**前端收紧到 200 元**，填 9999 时到不了后端；② 401 有双语义（登录密码错 vs 登录过期），由 `skipAuthRedirect` 区分；③ 500 文案由 A 的错误中间件统一，400/403/409 才透出后端 message；④ 会话发起权限与会话内容权限是两层——任何用户可就私单发起会话，但**读他人会话内容仍受参与者校验 403**。

## 8.5 并发测试

按计划设计了两类并发场景，执行状态如实区分：

1. **商品状态机并发**：已覆盖。已售出终态再上架返回 409（A 的 Postman API-17 PASS）；`STATUS_TRANSITIONS` 白名单（7.4.2）保证任意非法流转 409。
2. **双账号并发接单（409 竞态）**：**用例已立（API-24）、双账号真机端到端待执行**（A 测试记录 M2 待办，与 M2 真机验收同批）。代码层已有三重保障：接单按钮 `submitting` 守卫防连点（负向场景 9）；后端接单为条件 UPDATE、影响行数判定，失败 409「该单已被别人接走」；会话创建走存储过程 + 唯一键，两端并发建会话只留一条。

## 8.6 缺陷统计与修复

开发全程缺陷登记于 `docs/bug清单.md`。累计缺陷 13 个（P0×3、P1×5、P2×5），**已全部修复关闭，当前 Open 为 0**，另有 3 条「口径备注」（非缺陷）单独留痕。

**表 8-4 缺陷清单（Fixed 留痕，节选自 bug 清单）**

| 编号 | 位置 | 现象 | 修复 | 级别 |
| --- | --- | --- | --- | --- |
| F-1 | `chat.js`（A 文件，B 修复） | `router.use(auth)` 缺失 → 会话列表/未读数 500 | `edf392d` 补挂 auth，15/0 回归 | P0 |
| F-7 | 全局对比度 | 亮橙底白字 ≈2:1（4 处） | 统一压深棕 `#79513D` | P0 |
| F-2 | mock 用户表 | 代取单发布人缺失 → 联系发布者 404 | `bf70a17` 补 3 用户 | P0 |
| F-3 | `mine/profile` | 头像链路两处断（取错路径字段 + 相对路径直绑） | `efec4cc` 双修 | P1 |
| F-6 | `mine/runner` | 加载中渲染空表单、失败只 toast | `bec9651` 骨架屏 + 错误卡 + 重试 | P1 |
| F-8 | `mine/items` / `mine/favorites` | 两页占位；取消收藏列表不即时移除 | `48a90a8` / `e9fc5b4` | P1 |
| F-4 | 全局样式 | `--color-surface-2` 未定义，hover 失效 | `efec4cc` 正式定义 | P2 |
| F-5 | 冒烟脚本 | 硬编码绝对路径不可移植 | `efec4cc` 改 `__dirname` | P2 |
| F-9 | 全局 `.page` | 非 tab 页底部多 150rpx 空白 | `.page`/`.page--tab` 拆分 | P2 |
| F-10 | `utils/mock.js` | 未同步 A 的 v0.10 契约（5 组校验） | 逐字对齐 + 契约 `[12]` 节 16 条 | P2 |
| F-11 | B 侧全站按压反馈 | 按压时文字抖动（u-enter 与 scale 冲突 + 小元素缩放重栅格化） | 两步分级修复：摘列表卡入场动画；卡片级 scale / 行控件 opacity | P1 |
| F-12 | 发布代取 `place-picker` | 漏传 `place-required`，有下级地标的片区确认被静默吞掉（「选不了取件地点」） | 发布页补传 + 兜底 toast 提示 | P1 |
| F-13 | 发布代取/找跑腿 radio-group | radio 的 value 字符串被当索引转换，选中弹回首项且**提交值恒为首项**（大件单实际发 small） | 3 处 handler 改按 value 反查索引；冒烟桩改真实字符串并新增 payload 断言 | P0 |

**复验记录**：11-19 负向测试 12/12 通过；11-20 A 复核 4 项全部闭环；11-23 契约 161/0、冒烟 497/0；11-26~27 多轮真机回归后终版 **契约 192/0、冒烟 857/0**（16 脚本），全部通过。

**表 8-4 之后补充（11-25~26 真机走查修复，不计入 F-1~F-13 编号）**：登录页开场穿帮与待机断档、登录转场果冻与水波纹、tabBar 连续切换频闪（三轮：同帧渲染 → 恢复滑动 + 红点确认窗 → 缓存实例广播根治）、聊天图片空泡兜底、键盘顶飞导航与键盘间距、发布代取返回键固定、接单设置备注换行、私单会话限制取消、无图线条占位。修复过程逐条留痕于 `docs/开发日志.md` v0.59~v0.64 与《AI 使用说明/B端会话1.md》，均配套冒烟断言回闸。

---

# B 章节 · 第 10 章 系统使用简介

> 负责人：B ｜ 2026-11-27 定稿 ｜ 依据：`docs/README-导入与验通说明.md`、`README.md`、`miniprogram/config.js`、`database/campus_service_dump.sql`
>
> 本章面向答辩演示与课程验收：给出从导入工程到走通二手、代取、聊天三条主线的完整步骤。术语按 §9.7.3：用户、卖家、买家、跑腿（接单者）、二手商品、代取订单、会话、消息。

## 10.1 运行环境

**表 10-1 运行环境**

| 层 | 环境 | 说明 |
| --- | --- | --- |
| 小程序端 | 微信开发者工具（最新稳定版） | 原生小程序，无需构建；AppID 可用测试号（工程内为占位 `touristappid`） |
| 后端 | Node.js + Express（`server/`） | 监听 `http://127.0.0.1:3000`；图片存本地 `server/uploads/` |
| 数据库 | MySQL 8.0（InnoDB，`utf8mb4`） | 导入 `database/campus_service_dump.sql` 即含 14 张表 + 4 视图 + 5 存储过程 + 2 函数 + 5 触发器及演示数据 |
| 辅助 | Node.js 16+（跑 `scripts/` 冒烟与契约测试） | 测试脚本不入小程序包 |

系统不依赖云服务、域名或备案，普通笔记本即可完整演示；真实支付未接入，交易由双方在站内会话沟通后自主完成。

## 10.2 启动步骤

1. **导入数据库**：MySQL 8.0 中执行 `database/campus_service_dump.sql`（或先执行 `schema.sql` 再执行 `objects.sql`）；确认字符集为 `utf8mb4`。
2. **启动后端**：在 `server/` 目录按 `package.json` 安装依赖后启动服务，确认 `GET /api/health` 返回正常；默认端口 3000，与 `miniprogram/config.js` 的 `BASE_URL` 对应。
3. **导入小程序**：微信开发者工具 → 导入项目 → 选择**仓库根目录**（不是 `miniprogram/` 子目录，见 `project.config.json` 的 `miniprogramRoot`）。
4. **本地设置**：详情 → 本地设置 → 勾选「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」（后端在本机 HTTP 上运行）。
5. **选择数据模式**：
   - **离线演示**：`miniprogram/config.js` 保持 `MOCK: true`，无需后端，登录用本地假 token；
   - **联调演示**：改 `MOCK: false`（`BASE_URL` 默认 `http://127.0.0.1:3000`，端口不同则同步修改），重新编译即可，页面代码无需改动。
6. **真机预览**：`127.0.0.1` 在手机上指向手机自身，须改为电脑局域网 IP（如 `http://192.168.1.100:3000`），手机与电脑连同一 Wi-Fi；真机需在开发版打开调试模式绕过域名校验。

## 10.3 演示账号

**表 10-2 演示账号（均来自 seed 演示数据，无真实个人信息）**

| 用途 | 学号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 通用演示 | `202321010100001` | `123456` | 接口测试与契约测试常用账号，具备二手商品、代取订单、会话等演示数据 |
| 新建用户 | 任意未注册学号 | 6 位以上 | 注册页自填昵称与两次密码，可体验空态新账号流程 |

> `MOCK` 模式下任意学号 + 6 位以上密码即可登录（假 token）；联调模式请用表中 seed 账号。图片与账号均为演示数据。

## 10.4 操作步骤（演示主线）

**表 10-3 演示路径**

| # | 主线 | 操作路径 | 观察要点 |
| --- | --- | --- | --- |
| 1 | 登录与首页 | 打开工程 → 登录页输学号/密码 → 进二手首页 | 输错密码只 toast 不跳页；token 过期自动回登录页并带回跳 |
| 2 | 二手交易 | 首页分类/关键词/排序筛商品 → 进详情看轮播与成色 → 收藏 → 点「联系卖家」进会话 | 收藏计数同步；商品状态四态展示；无图商品显示线条占位图 |
| 3 | 发布二手 | 「我的」→ 我的发布 → 发布商品 → 选书目自动带出 ISBN/参考价 → 传图 → 提交 | 金额最多两位小数；必填项红字拦截；提交后跳商品详情 |
| 4 | 发布代取 | 代取 tab → 发布代取 → 选片区与具体地标 → 选规格/时间类型 → 填报酬 → 提交（可直接进大厅或先建私单找跑腿） | 有下级地标的片区必须选到具体教学楼；报酬 0~200 元 |
| 5 | 接单与沟通 | 大厅待接单订单 → 详情看 canTake 按钮 → 接单 → 会话沟通 → 完成后状态更新 | 接单者按钮由后端权限字段控制；并发抢单失败返回「该单已被别人接走」 |
| 6 | 跑腿上线 | 「我的」→ 接单设置 → 选服务片区/地标与规格 → 选「当前在线」或「按计划上线」并配时段 → 保存 | 按计划上线需有未来时段；找跑腿页只显示此刻在线的跑腿 |
| 7 | 私单会话 | 私单详情点「联系」→ 直接进会话（无需发布者身份）→ 谈妥后接单 | 私单点进去即可对话；会话创建幂等，同一对不重复 |
| 8 | 消息与图片 | 聊天列表进会话 → 发文字（≤500 字）/「＋」选图发送 → 点图片放大预览 | 3 秒增量轮询；图片失败显示「点击重试」占位；键盘弹起导航固定 |
| 9 | 个人中心 | 「我的」→ 个人资料改昵称/头像 → 设置切通知开关 → 帮助与反馈提交 | 昵称按码点 2~12；头像超限自动压缩；退出登录二次确认 |

## 10.5 常见问题

- **页面全空/报「无法连接后端」**：联调模式下后端未启动或端口不一致；检查 `GET /api/health` 与 `config.js` 的 `BASE_URL`。
- **真机图片不显示**：`127.0.0.1` 未改局域网 IP，或未开开发版调试；图片气泡加载失败时点「点击重试」占位回退本地临时图。
- **请求被 400 拒绝**：检查分页 `pageSize ≤ 50`、金额两位小数、报酬范围 0~200 元、文本长度上限。
- **想离线演示**：把 `config.js` 的 `MOCK` 改回 `true` 重新编译；MOCK 模式下未登记的接口会明确报错，不会静默回落真实网络。

