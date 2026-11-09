/**
 * 全局配置（B 成员：公共层）
 * ------------------------------------------------------------------
 * 1. 换环境只改这里，其它文件一律从 config 取 BASE_URL。
 * 2. 微信开发者工具 -> 详情 -> 本地设置 -> 勾选「不校验合法域名」，
 *    否则 http://127.0.0.1 会被拦截。
 */

// 'dev' | 'test' | 'prod'
const ENV = 'dev';

const BASE_URL_MAP = {
  dev: 'http://127.0.0.1:3000',        // 本地 Node/Express（A 负责，默认 3000 端口）
  test: 'http://192.168.1.100:3000',   // 真机预览时换成电脑局域网 IP
  prod: 'https://api.example.com'      // 上线占位
};

module.exports = {
  ENV: ENV,
  BASE_URL: BASE_URL_MAP[ENV],

  // 后端未就绪时的本地模拟开关：
  // true  -> utils/mock.js 拦截已登记接口，返回假数据，方便先调 UI 与跳转
  // false -> 全部走真实网络请求（A 的 server 跑起来后改成 false）
  MOCK: true,

  // 存储键名统一管理，避免各处手写字符串
  STORAGE_KEY: {
    TOKEN: 'cs_token',
    USER: 'cs_user',
    SEARCH_HISTORY: 'cs_search_history'
  },

  // 请求超时（毫秒）
  TIMEOUT: 12000,

  // 业务约定：code === 0 为成功
  SUCCESS_CODE: 0,
  UNAUTHORIZED_CODE: 401,

  // 分页默认值
  PAGE_SIZE: 10
};
