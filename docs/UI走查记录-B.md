# UI 走查记录（B，11-11 第一遍）

> 对应《B 成员开发计划与Git协作手册》§4.3「11-11：M1 配合 + UI 走查第一遍」。
> 走查方法按手册「三看」：**看对齐**（左右边距/等高）、**看三态**（空态/加载态/错误态）、**看文案**（术语统一表）。
> 每条按「页面/组件 + 现象 + 期望」写，不接受"这里怪怪的"这类无坐标描述。

---

## 0. 本轮走查的前提（很重要，先看这段）

| 项 | 实际情况 |
| --- | --- |
| A 的 6 个页面 | **仍是占位骨架**（`pages/index/index`、`item/detail`、`item/publish`、`search/result`、`mine/items`、`mine/favorites` 的 wxml 均只有 11 行，内容为"页面骨架已注册，等待实现"）。**页面级走查（对齐/三态/文案）无法执行**，只能记为阻塞项 #18。**11-20 更新：A 六页已全部交付（首页/详情/发布/搜索 11-14、items 11-18、favorites 随 11-19 推送），页面级走查已在第二轮补齐，本条不再是阻塞。** |
| 本轮可走查对象 | 公共层 `app.wxss`、`app.json`、`utils/*`；三个组件 `item-card` / `status-tag` / `empty-state`；已实现页 `login` / `register` / `mine/index`（本轮新写）；自定义 tabBar。 |
| 走查方式 | 代码级走查 + 静态校验（`node --check`、mock 单测）。**微信开发者工具的实际编译与截图未在本轮完成**（需在装有开发者工具的本机执行，见 §4 待办）。 |
| 配色口径 | 全站已切换为奶茶色系：`#F4F1E7` 页面底 / `#FCDBA9` 浅底 / `#E6A874` 主色 / `#A7724F` 辅色 / `#79513D` 深色（白字按钮）/ `#6A4431` 最深。**红线：`#E6A874` 上不允许放白字。** |

---

## 1. 问题清单

严重程度：**P0** = 阻塞/不可读，当天必修；**P1** = 明显影响观感或数据正确性；**P2** = 打磨项。

| # | 页面/组件 | 现象 | 期望 | 严重 | 谁改 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `app.wxss` `.btn-primary` | 底色用 `--color-primary`（`#E6A874`）配白字，对比度约 **2.0:1**，字几乎糊在底上 | 白字按钮一律压 `--color-primary-dark`（`#79513D`，约 6.9:1） | P0 | B | ✅ 已修 |
| 2 | `app.wxss` `.fab` | 首页/列表右下角加号同样亮橙底白字，符号看不清 | 同上，改深棕底 | P0 | B | ✅ 已修 |
| 3 | `app.wxss` `.btn-ghost` | 亮橙文字 + 亮橙描边压在暖白底上（约 2.0:1），按钮像"消失" | 文字与描边都改深棕 | P0 | B | ✅ 已修 |
| 4 | `pages/register` `.link` | 「去登录」文字用亮橙，暖白底上读不清 | 改深棕 | P1 | B | ✅ 已修 |
| 5 | `item-card`（grid） | **卡片高度不一致**：成色与地点都为空时 `card__meta` 整行不渲染，卡片比同排矮 34rpx，两列网格出现锯齿 | meta 容器恒占位（`min-height: 34rpx`），`card__body` 改 flex 列 + 价格 `margin-top:auto` 贴底 | P1 | B | ✅ 已修 |
| 6 | `item-card` | 图片未加载时占位底色是浅焦糖 `#FCDBA9`，一屏 10 张卡片整片发黄，压过商品图 | 占位底改中性 `--color-divider` | P1 | B | ✅ 已修 |
| 7 | `item-card`（grid） | 图片左上角的「已售出/已预订」用浅底描边标签，压在商品图上边界糊掉 | 压图的标签改实心（`plain=false`），白字压深底 | P1 | B | ✅ 已修 |
| 8 | `item-card`（list） | 右侧状态标签跟价格用 `align-items: baseline`，标签被拽到价格基线以下，视觉上"掉出卡片" | 标签 `align-self: center` 单独回正 | P2 | B | ✅ 已修 |
| 9 | `status-tag` | 标签字号 22rpx（真机约 11px），比正文小两档，扫列表时读不出状态 | 提到 24rpx，高度 40→42rpx | P1 | B | ✅ 已修 |
| 10 | `status-tag` | `plain` 灰色标签文字 `#9A8875` 压在 `#F1EAE0` 上，对比约 **2.2:1**，等于看不见 | 文字改 `--color-text-2`（≈5.6:1） | P1 | B | ✅ 已修 |
| 11 | `status-tag` | 没有 `user` 域，账号状态（`users.status`）无处渲染；当日「试渲染」任务也缺落点 | 新增 `user` 域：`active`→正常（绿）/`disabled`→已禁用（灰） | P2 | B | ✅ 已修（已接到「我的」页用户卡） |
| 12 | `empty-state` | 标题/描述颜色写死 `#6B5B4D`/`#9A8875`，换主题必漏改 | 改引用 `--color-text-2/3` | P2 | B | ✅ 已修 |
| 13 | `empty-state` | 空态按钮 28rpx，比全局 `.btn` 的 32rpx 小一档，同屏出现时像两套按钮 | 统一 30rpx（空态按钮本就矮一档，字号不再额外缩） | P2 | B | ✅ 已修 |
| 14 | `utils/mock.js` | `currentUser` 只有 `id`，接口文档 §2 的字段名是 **`userId`**；个人中心读 `userId` 会拿到 `undefined` | 补 `userId: 1`（保留 `id` 兼容旧代码） | P1 | B | ✅ 已修 |
| 15 | `utils/mock.js` | 缺 `GET /api/items/mine` 与 `GET /api/favorites`，MOCK 模式下「我的发布/我的收藏」与个人中心统计**必然失败** | 按接口文档 §5、§6 的返回结构补齐（含 `total`） | P1 | B | ✅ 已修 |
| 16 | `utils/mock.js` | `GET /api/errands/mine` 忽略 `status` 参数，`role=runner&status=completed` 会把「进行中」也算进「完成数」 | 支持 `status` 过滤（接口文档 §7.7 已定义） | P2 | B | ✅ 已修 |
| 17 | `utils/mock.js` | 当前用户没有任何商品/订单，个人中心四项统计全是 0，演示时看不出效果 | 补 1 条自己的在售商品（`itemId 1006`）、1 条自己发布的待接单代取（`2004`）、1 条自己接单并完成的代取（`2005`） | P2 | B | ✅ 已修 |
| 18 | A 的 6 个页面 | 全部仍是占位页，无法走查对齐/三态/文案；M1「二手闭环」在 B 侧无法验收 | A 交付页面后按 §3 清单逐条复查 | **P0（阻塞）** | A | ✅ 已交付（11-20 更新：六页全部落地，第二轮已补走查） |
| 19 | A 的页面 json | 列表页需要 `enablePullDownRefresh` + `onReachBottomDistance: 80`（手册 §5.7），当前占位页未配置，页面落地时容易漏 | 首页/搜索/我的发布/我的收藏四个列表页补上 | P1 | A | ✅ 已补齐（11-20 核实：首页/搜索/我的发布均已配置，favorites 以远端最新为准） |
| 20 | 全局 `.page` | `.page` 统一给了 `padding-bottom: 150rpx` 用来避让悬浮 tabBar，但 **非 tab 页**（详情/发布/设置/聊天）也套了 `.page`，底部会多出约 110rpx 空白 | 拆成 `.page`（默认安全区）+ `.page--tab`（tab 页专用）。**改动要动 4 个 tab 页 wxml，其中 `pages/index/index.wxml` 属于 A**，按 §9.2 先记录、不擅自动 A 的文件 | P2 | B（需 A 同意） | ✅ 已执行（11-20：A 同意后拆分完成，B 侧 3 个 tab 页已加 `page--tab`，`index/index` 由 A 自加） |
| 21 | 「我的」页 | 页面自己写了 `padding` 简写，会覆盖 `.page` 的 `padding-bottom`，最后一条入口会被悬浮胶囊条压住 | 显式写 `padding-bottom: calc(150rpx + safe-area)` | P1 | B | ✅ 已修 |
| 22 | 自定义 tabBar | 选中项文字原为白色，压在新胶囊 `#E6A874` 上同样违反红线；已按需求去掉白色 | 选中态只用胶囊色块区分，文字沿用常态色 | P1 | B | ✅ 已修（11-11 上午） |

**统计**：共 22 条，其中 B 侧 19 条已全部修完；A 侧 2 条待落地；1 条需 A 同意后改（#20）。**11-20 更新：A 侧 2 条已随六页交付闭环，#20 已在 A 同意后执行完毕，22 条全部关闭。**

---

## 2. 已修项的技术说明（给 A 看的部分）

1. **为什么按钮统一改深棕**：`#E6A874` 的相对亮度约 0.46，白字对比度 `(1.05)/(0.46+0.05) ≈ 2.0`，远低于 WCAG AA 的 4.5。深棕 `#79513D` 亮度约 0.10，白字对比度 6.9，同时仍是同一色板内的暖色。
2. **网格卡片等高的两个前提**：① meta 行必须恒占位（否则内容决定高度）；② `card__body` 必须是 flex 列容器，`card__foot` 的 `margin-top: auto` 才能生效。只做 ① 不做 ②，标题两行的卡片价格仍会比标题一行的低 20rpx 左右。
3. **`status-tag` 新增 `user` 域**：枚举值直接对齐 `users.status`（`active` / `disabled`），颜色走 `success` / `muted`。这是 11-11 新增的唯一枚举，页面里没有写死文案。
4. **个人中心统计的口径**：后端**没有** stats 聚合接口，四项数字由四个列表接口的 `total` 派生——
   `items/mine`、`favorites`、`errands/mine?role=publisher`、`errands/mine?role=runner&status=completed`，
   每个请求 `pageSize=1` 只要 `total`。任一失败该格显示「—」而不是 0，避免把"没拉到"读成"没有数据"。

---

## 3. A 的页面落地后要复查的清单（页面级走查，本轮无法执行）

按「对齐 / 三态 / 文案」逐页过，每页至少记 2 条：

| 页面 | 对齐要看 | 三态要看 | 文案要看 |
| --- | --- | --- | --- |
| 首页 `pages/index/index` | 卡片左右边距是否与页面 24rpx 一致；两列间距是否等宽；右下角 `.fab` 是否避开悬浮 tabBar | 首屏加载有无骨架；空数据有无 `empty-state`；后端未起有无错误态+重试 | 分类名是否与 `categories` 表一致；价格是否 `¥` + 两位小数 |
| 搜索 `pages/search/result` | 搜索栏与结果列表左边缘是否对齐 | 无结果、搜索中、搜索失败三态 | 「搜索结果」而非「查询结果」，术语按 §9.3 |
| 商品详情 `pages/item/detail` | 图片轮播高度、卖家信息行、底部操作条是否被 tabBar 影响（详情页无 tabBar，确认 `.page` 多留白） | 商品已售出/已下架时的按钮禁用态 | 「联系卖家」不要写成「私聊」 |
| 发布商品 `pages/item/publish` | 表单分组间距、图片九宫格间距 | 未选图片、超出 9 张、提交中 | 成色枚举显示「几乎全新」等中文，不出现 `like_new` |
| 我的发布 `pages/mine/items` | 与 `item-card` 的 `mode="list"` 是否用对 | 空态文案「还没有发布过商品」+ 去发布 | 状态标签用 `status-tag`，不自己写文字 |
| 我的收藏 `pages/mine/favorites` | 同上 | 取消收藏后列表要即时移除 | 「已取消收藏」提示语 |

---

## 4. 本轮未完成的验证（下一轮补）

| 待办 | 说明 | 谁 |
| --- | --- | --- |
| 微信开发者工具编译 | 需在装有开发者工具的本机跑一遍，确认 **0 错误 0 警告**，并截图存档 `docs/screenshots/11-11/` | B（本机） |
| `status-tag` 实机渲染 | 已接到「我的」页用户卡，登录后应显示绿色「正常」标签 | B（本机） |
| 个人中心四项统计 | MOCK 模式下应为 1 / 1 / 1 / 1；切 `config.MOCK = false` 后需 A 的 `items/mine`、`favorites` 接口真实返回 | B + A |
| 真机字号 | tabBar 26rpx、标签 24rpx、正文 28rpx 是否仍需整体上调，等真机结论 | B |

---

## 5. 21:30 同步要问 A 的三件事（对应 §0.4）

1. ~~`routes/errands.js` 何时可联调~~ → **已就绪**：A 已推送 10 个接口（`GET /api/errands`、`/mine`、`POST /`、`GET /:id`、`PUT /:id`、`POST /:id/publish`、`:id/take`、`:id/complete`、`:id/cancel`、`:id/release`），B 侧代取详情 11-12 可直接对真实接口开发，仅需核对字段。
2. A 的 6 个页面落地时间，落地后 B 立即执行 §3 的页面级走查。
3. `.page` 拆成 `.page` / `.page--tab` 需改 `pages/index/index.wxml` 一行 class，是否由 A 自己加（B 不擅自动 A 的文件）。

---

# UI 走查记录（B，第二轮 · 11-17）

> 对应手册 §4.3「11-17：UI 走查第二轮（全局统一）」。本轮验收口径：**走查清单清零 P0；文案与术语表一致**。
> A 已交付：二手首页、商品详情、发布商品、搜索结果（`pages/index/*`、`item/detail`、`item/publish`、`search/result`）；
> **仍未交付**：`mine/items`、`mine/favorites`（仍为占位骨架，属 A 的 P1）。**11-20 更新：mine/items 已于 11-18 交付，mine/favorites 随 A `e9fc5b4`（11-19 推送）交付，A 六页至此全部实现（已 fetch `d8dc508` 复核确认）。**

## 6. 本轮前提与结论

| 项 | 实际情况 |
| --- | --- |
| 20 页状态 | B 侧 14 页 + A 侧 6 页里，B 侧 3 页（`mine/profile`、`mine/settings`、`mine/help`）本轮前仍是 11-06 的占位骨架 → **本轮全部落地**，这是清零 P0 的关键 |
| 三态覆盖 | 8 个列表/详情页（大厅、消息列表、聊天页、我的代取、找跑腿、代取详情、商品详情、搜索结果）**三态齐全**；本轮补上接单设置页缺失的加载态/错误态 |
| 点击反馈 | 卡片与按钮全覆盖；本轮补 4 处纯 `view/text` 可点元素（大厅筛选 chip、排序按钮、接单设置「编辑/删除」） |
| 时间口径 | 全站时间都走 `utils/util.js`（`formatTime` / `fromNow` / `timeDivider` / 本轮 11-18 补的 `hhmm`）；11-17 记录时 `mine/runner` 的 manualUntil 还有自造切片，11-18 A 复查后已收进 util，页面内现已无第二套格式化 |
| 文案口径 | 状态词统一「待接单 / 进行中 / 已完成 / 已取消」，全仓库检索**无「未接单」**；聊天对象统一「联系 TA」，pending 大厅单统一「联系发布者」 |

## 7. 本轮问题清单（P0 已清零）

| # | 页面 | 现象 | 期望 | 严重 | 谁 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 23 | `mine/profile` | 占位骨架，「我的」页点头像卡进来什么都没有，改昵称无门 | 头像（选图→>5MB 压缩→上传→预览→保存）、昵称 2-12（按码点计数）、学院 ≤100、手机号 11 位；只读展示学号/信用分/账号状态；保存后同步全局缓存 | **P0** | B | ✅ 已修 |
| 24 | `mine/settings` | 占位骨架，退出登录/清缓存只能从「我的」页临时入口走 | 通知开关（本地存储 + 真联动 tabBar 红点）、清缓存（保留登录态）、版本号、退出登录（二次确认→reLaunch） | **P0** | B | ✅ 已修 |
| 25 | `mine/help` | 占位骨架，8 条 FAQ 与意见反馈无落点，`POST /api/feedback` 从未被调用 | FAQ 折叠（8 条写真实行为）+ 反馈表单（≤200 字计数）→ 提交成功清空 | **P0** | B | ✅ 已修 |
| 26 | `mine/runner` | D1 级问题：`loading` 在 JS 里设了但 WXML **没有加载分支**，加载中直接渲染空表单；失败只 toast，页面仍是空表单 | 骨架屏 + 错误卡片 + 重试；失败时绝不能让空表单看起来像「设置被清空」 | **P1** | B | ✅ 已修 |
| 27 | `errand/hall` | 筛选/排序是纯 `view/text`，按下无任何反馈（选中态是结果，不是按下反馈） | 补 `hover-class`（chip 浅底、排序按钮降透明度） | P2 | B | ✅ 已修 |
| 28 | `mine/runner` | 计划条「编辑 / 删除」纯文字，按下无反馈，误触风险高 | 补 `hover-class` + 降透明度 | P2 | B | ✅ 已修 |
| 29 | `chat/detail` | 时间分隔在页面里自造 `slice(0,10)/slice(11,16)`，与「所有时间走 util」口径不符 | 新增 `util.timeDivider()`，页面只调用 | P2 | B | ✅ 已修 |
| 30 | `mine/index` / `mine/settings` | 版本号 `v0.3.0` 两处硬编码，改版本必漏改一处 | 新增 `utils/version.js` 单一来源 | P2 | B | ✅ 已修 |
| 31 | `mine/items`、`mine/favorites` | 仍为 11-06 占位骨架，个人中心「我的发布/我的收藏」两个入口进去是空白页 | 与 `item-card list` 一致的列表 + 空态「还没有发布过商品」 | **P0（阻塞）** | A | ✅ 已交付（11-20 更新：items 11-18、favorites 随 11-19 推送） |
| ~~32~~ | `pages/item/detail`（A） | ~~图片加载失败时无占位~~ → **误报，撤回（11-18 A 复查）**：已核实 `item/detail.wxml` 图片有 `binderror` + 「暂无图片」兜底，本轮记录时漏看 | — | — | — | ✅ 已核实，非问题 |
| 33 | 全局 `.page` | 非 tab 页（详情/发布/设置/聊天）套 `.page` 会多出约 150rpx 底部空白（第一轮 #20） | 拆 `.page` / `.page--tab`，需动 A 的 `pages/index/index.wxml` | P2 | B（需 A 同意） | ✅ 已执行（11-20：拆分完成，B 侧 3 个 tab 页已加 `page--tab`，`index/index` 由 A 自加） |

**统计**：本轮 11 条，B 侧 8 条已全部修完（P0 3 条、P1 1 条、P2 4 条）；#32 经 A 复查为误报已撤回；A 侧剩 #31（items/favorites 占位）待落地 + #33 待 A 同意。**11-20 更新：#31 随 A 交付闭环、#33 已执行，本轮 11 条全部关闭。**

## 8. 本轮验证证据

| 检查 | 结果 |
| --- | --- |
| `node --check`（profile/settings/help/index/app/util/version/runner） | 全通过 |
| `scripts/smoke/wxml_check.js`（profile/settings/help/hall/runner） | 全 PASS |
| `scripts/smoke/smoke_mine_pages.js`（本轮新增） | **30 / 0**（加载回填、码点校验、保存同步缓存、清缓存保留登录态、FAQ 折叠、反馈 200 字上限） |
| 冒烟合计（11 个脚本） | **440 / 0**（第一轮 410 → 本轮 +30） |
| mock 契约 | **145 / 0** |
| 术语抽查 | `grep 未接单` 0 命中；`联系 TA` 4 处一致；状态词与 `status-tag` 枚举一致 |

## 9. 本轮遗留（下一轮 / 交 A）

| 待办 | 说明 | 谁 |
| --- | --- | --- |
| ~~`mine/items`、`mine/favorites`~~ | ✅ 已关闭（11-20 更新：A 两页均已交付，items 11-18、favorites 随 11-19 推送） | A |
| 开发者工具全页编译留证 | 需在本机跑一遍并截图（11-18 截图归档时一起做，`report/assets/`） | B |
| 真机双账号互发 | M2 遗留，依赖 A 的 `GET /api/runners` 真实数据 | B + A |
| ~~`.page` 拆 `--tab`~~ | ✅ 已执行（11-20：A 同意后拆分完成，B 侧 3 个 tab 页已加 `page--tab`，`index/index` 由 A 自加） | B |

---

# A 复查修复（11-18）

A 对 B 文件提出 4 条问题，逐条处理如下（P1 1 / P2 2 / P3 1，全部闭环）：

| # | 级别 | A 指出的问题 | 修复 |
| --- | --- | --- | --- |
| R1 | **P1** | `profile.js` 取 `res.tempFiles[0].path`——`wx.chooseMedia` 实际返回 `tempFilePath`，上传拿到 undefined；且 `profile.wxml` 把相对路径 `/uploads/...` 直接绑给 `<image>`，显示不出来 | 两处同修：选图改 `tempFiles[0].tempFilePath`（与 A 的 `item/publish.js` 同口径）；data 拆成 `avatarRaw`（存相对路径，保存时提交）+ `avatarUrl`（`adapter.fullUrl` 补全后给 `<image>`），与「我的」页口径一致 |
| R2 | P2 | `smoke_mine_pages.js`、`smoke_detail.js` 硬编码 `E:/Qin/...`，换机器 MODULE_NOT_FOUND，手册里「440/0」无法在别的机器复现 | REPO 改 `path.join(__dirname, '..', '..', 'miniprogram')`，脚本随仓库移动 |
| R3 | P2 | `hall/profile/settings/help` 四个 wxss 用了 `--color-surface-2`，但 `app.wxss` 没定义 → 新补的 hover 反馈实际不生效 | `app.wxss` 正式定义 `--color-surface-2: #F1EAE0`（与 divider 同色，按压反馈面），全局生效；chat/detail 等带 fallback 的旧写法不受影响 |
| R4 | P3 | 走查记录 #32 说商品详情图片无兜底，但 `item/detail.wxml` 已有 `binderror` +「暂无图片」；且文档称时间全走 util，`runner.js` 的 manualUntil 仍直接切片 | #32 撤回并标注误报（见上表）；`runner.js` 改用新增 `util.hhmm()`，页面内自造切片清零，时间口径表述同步修正 |

**验证（11-18 复跑）**：契约 145/0；冒烟 440/0（脚本已可移植）；`wxml_check` 全 PASS。
