# 小程序地基代码 v1 —— 导入与验通说明

> 本包是 **公共层地基**，目标：在微信开发者工具里能一次编译通过、能登录、能切换 4 个 tab。
> 业务页面目前只有**登录、注册、我的（tab 4）**已实现，其余 **17 个页面仍是占位页**（含 4 个 tab 中的二手/代取/消息），后续按里程碑逐个替换实现。

## 一、工程结构

```
Campus_Trading_Service_Platform/
├─ project.config.json          # 开发者工具工程配置（miniprogramRoot = miniprogram/）
└─ miniprogram/
   ├─ app.js                    # 登录态恢复 / setSession / clearSession / requireLogin
   ├─ app.json                  # 20 个页面 + 4 个 tabBar
   ├─ app.wxss                  # 设计令牌（颜色/字号/圆角/阴影）+ 通用类
   ├─ sitemap.json
   ├─ config.js                 # BASE_URL、MOCK 开关、存储键、分页大小
   ├─ utils/
   │  ├─ request.js             # 统一请求：{code,message,data}、Bearer、401 跳登录、上传
   │  ├─ util.js                # 时间格式化、防抖节流、toast、confirm
   │  └─ mock.js                # 本地假数据（A 的后端未就绪时用）
   └─ pages/                    # 20 个页面（每页 4 文件齐全）
      ├─ login/                 # ✅ 已实现
      ├─ register/              # ✅ 已实现
      ├─ mine/index/            # ✅ 已实现（tab 4 个人中心）
      └─ ... 其余 17 个占位页
```

## 二、导入步骤（3 步）

1. **解压**本 zip，得到 `Campus_Trading_Service_Platform` 文件夹。
2. 微信开发者工具 → 导入项目 → 选择**整个文件夹**（不是 miniprogram 目录）。
3. AppID 处粘贴你在公众平台注册得到的 AppID（`project.config.json` 里目前是占位 `touristappid`）。
   如果不改文件，也可以在导入界面的 AppID 输入框直接填，工具会回写配置。

## 三、第一次编译必做的一次设置

开发者工具 → 右上角**详情** → **本地设置** → 勾选：

- ☑ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书

原因：后端还在本机 `http://127.0.0.1:3000` 跑，微信默认只允许 https 且已备案域名。
此外 `project.config.json` 里已把 `urlCheck` 设为 `false`，双保险。

## 四、现在能看到什么

| 操作 | 预期结果 |
| --- | --- |
| 打开工程 | 直接进登录页，无红色报错 |
| 随便填学号 + 6 位以上密码，点登录 | Toast「登录成功」→ 跳到二手首页（tab 1） |
| 点「还没有账号？去注册」 | 进注册页，选校区、填两次密码，注册成功同样进首页 |
| 底部 tabBar | 4 个 tab 全部可点：二手 / 代取 / 消息 / 我的 |
| 退出登录 | 「我的」页后续会加，暂时清缓存即可（工具菜单 → 清缓存 → 清除数据缓存） |

因为 `config.js` 里 `MOCK = true`，此时**完全不需要后端**，登录用的是 `utils/mock.js` 里的假 token。

## 五、对接 A 的后端时改两处

```js
// miniprogram/config.js
const ENV = 'dev';
const BASE_URL_MAP = {
  dev: 'http://127.0.0.1:3000',   // ← 如果 A 用了别的端口，改这里
  ...
};
module.exports = {
  MOCK: false,                     // ← 改成 false，全部走真实请求
  ...
};
```

改完重新编译即可，页面代码一行不用动。

真机预览时 `127.0.0.1` 指向手机自己，要改成电脑局域网 IP（例如 `http://192.168.1.100:3000`），
并且手机和电脑连同一个 Wi-Fi；同时开发者工具「详情 → 本地设置」里勾选不校验域名只对模拟器生效，
真机需要在该小程序的**开发版**下打开「调试」模式才能绕过域名校验。

## 六、接口约定（已在 request.js 内固化）

| 项 | 约定 |
| --- | --- |
| 响应体 | `{ code, message, data }`，`code === 0` 为成功 |
| 认证 | 请求头 `Authorization: Bearer <token>` |
| 字段命名 | camelCase |
| 分页 | 入参 `page`/`pageSize`，返回 `{ list, total, page, pageSize }` |
| 401 | 清本地登录态 → `reLaunch` 到登录页（并发请求只跳一次） |
| 超时 | 12000ms（`config.TIMEOUT`） |

## 七、20 个页面清单（与手册一致）

| # | 路径 | 标题 | 负责人 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | pages/login/login | 登录 | B | ✅ 已实现 |
| 2 | pages/register/register | 注册 | B | ✅ 已实现 |
| 3 | pages/index/index | 二手市场 | A | 占位（tab） |
| 4 | pages/search/result | 搜索结果 | A | 占位 |
| 5 | pages/item/detail | 商品详情 | A | 占位 |
| 6 | pages/item/publish | 发布商品 | A | 占位 |
| 7 | pages/mine/items | 我的发布 | A | 占位 |
| 8 | pages/mine/favorites | 我的收藏 | A | 占位 |
| 9 | pages/errand/hall | 代取大厅 | B | 占位（tab） |
| 10 | pages/errand/publish | 发布代取 | B | 占位 |
| 11 | pages/errand/detail | 代取详情 | B | 占位 |
| 12 | pages/errand/runners | 找跑腿 | B | 占位 |
| 13 | pages/mine/errands | 我的代取 | B | 占位 |
| 14 | pages/mine/runner | 接单设置 / 上线 | B | 占位 |
| 15 | pages/chat/list | 消息 | B | 占位（tab） |
| 16 | pages/chat/detail | 聊天 | B | 占位 |
| 17 | pages/mine/index | 我的 | B | ✅ 已实现（tab） |
| 18 | pages/mine/profile | 个人资料 | B | 占位 |
| 19 | pages/mine/settings | 设置 | B | 占位 |
| 20 | pages/mine/help | 帮助与反馈 | B | 占位 |

## 八、已完成与下一批

已完成：
1. 三个公共组件：`components/item-card`、`components/empty-state`、`components/status-tag`
2. **「我的」页（tab 4）**：用户卡 + 四项统计 + 我的发布/我的收藏/我的代取/接单设置 + 设置/帮助/关于 + 退出登录，含下拉刷新与 `onShow` 刷新
3. 自定义 tabBar（悬浮胶囊、图标+文字、滑动动画）、`components/nav-top`（全站自定义导航栏）

下一批：
1. 代取大厅（tab 2）：筛选 + 卡片列表 + 右下角「找代取」+ 下拉刷新 + 触底加载
2. 代取详情（状态机 UI + 接单/完成/撤回/释放 + 409 冲突处理）
3. 聊天列表与聊天页

## 九、常见报错速查

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `app.json: ["pages"][x] 未找到` | 解压后目录层级不对，工程根应同时含 `project.config.json` 和 `miniprogram/` | 重新选对导入目录 |
| `invalid appid` | 占位 appid 未替换 | 换成自己的 AppID |
| `request:fail url not in domain list` | 未勾选「不校验合法域名」 | 见第三节 |
| `Cannot find module '../../config'` | 页面文件被移动过 | 保持 `pages/xx/xx.js` 两级深度 |
| tabBar 图标缺失警告 | 本版未配图标（文本模式） | 提供 png 后补 `iconPath` |

---
生成时间：2026-11-08 ｜ 负责人：B
