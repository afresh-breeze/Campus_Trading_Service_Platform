# B 章节 · 第 4 章 数据库逻辑设计

> 负责人：B ｜ 2026-11-22 初稿 ｜ 依据：`database/schema.sql`（14 张表，与《数据库 14 张表设计详解》一致）
> 约定：主键以**加粗**表示（正式 Word 排版时改为下划线）；`FK` 表示外键。

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
