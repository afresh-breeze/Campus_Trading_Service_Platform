/**
 * 统一网络请求封装（B 成员：公共层核心）
 * ------------------------------------------------------------------
 * 约定（与 A 的后端一致）：
 *   1. 响应体统一 { code, message, data }
 *   2. code === 0 视为成功，resolve(data)
 *   3. code === 401 或 HTTP 401 -> 清登录态并跳登录页，reject
 *      例外：传了 skipAuthRedirect 的请求（登录本身）走普通错误分支，
 *      只 toast 后端 message，**不清已有会话** —— 否则「密码错」会被当成「登录过期」。
 *   4. HTTP 403 + message「账号已被禁用」-> 清会话并回登录页（账号被禁用不是普通权限错）
 *   5. 其余 code -> 默认 toast 提示 message，reject，调用方可传 silent 关闭
 *   6. 头信息 Authorization: Bearer <token>
 */
const config = require('../config');
const mock = require('./mock');

/** 拼装完整 URL */
function buildUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  return config.BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

/** 是否已登录 */
function getToken() {
  return wx.getStorageSync(config.STORAGE_KEY.TOKEN) || '';
}

/** 401 统一处理：只跳一次，避免并发请求重复跳转 */
let redirecting = false;

/** 当前页面的完整路径（含参数），用于 401 后回跳 */
function currentUrl() {
  const pages = getCurrentPages();
  const current = pages.length ? pages[pages.length - 1] : null;
  if (!current) return '';
  const route = current.route || '';
  const options = current.options || {};
  const query = Object.keys(options)
    .map((k) => k + '=' + options[k])
    .join('&');
  return '/' + route + (query ? '?' + query : '');
}

/**
 * 清登录态：**统一走 app.clearSession()**，避免只清 token 不清未读数/角标，
 * 否则重登后还挂着上一个账号的红点（app.clearSession 会重置 unreadCount + 角标）。
 */
function clearSessionEverywhere() {
  const app = getApp();
  if (app && typeof app.clearSession === 'function') {
    app.clearSession();
    return;
  }
  // app 还没起来（极早期请求）：退化为直接清缓存
  wx.removeStorageSync(config.STORAGE_KEY.TOKEN);
  wx.removeStorageSync(config.STORAGE_KEY.USER);
}

/**
 * 踢回登录页。带 redirect，登录完能回到原页面。
 * @param {string} [tip] 额外提示（账号被禁用时用）
 */
function gotoLogin(tip) {
  if (redirecting) return;
  redirecting = true;
  const pages = getCurrentPages();
  const current = pages.length ? pages[pages.length - 1] : null;
  const route = current ? current.route : '';
  if (route.indexOf('pages/login/login') === 0) {
    redirecting = false;
    return;
  }
  const back = currentUrl();
  const url = '/pages/login/login' + (back ? '?redirect=' + encodeURIComponent(back) : '');
  if (tip) wx.showToast({ title: tip, icon: 'none' });
  wx.reLaunch({
    url,
    complete: () => {
      setTimeout(() => {
        redirecting = false;
      }, 800);
    }
  });
}

function handleUnauthorized() {
  clearSessionEverywhere();
  gotoLogin('');
}

/** 账号被禁用（HTTP 403 + 固定文案）：清会话并回登录页，不要留着一个假登录态 */
function handleDisabledAccount() {
  clearSessionEverywhere();
  gotoLogin('账号已被禁用，请联系管理员');
}

/**
 * 核心请求
 * @param {Object} options
 * @param {string} options.url       相对路径，例如 '/api/items'
 * @param {string} [options.method]  GET/POST/PUT/DELETE
 * @param {Object} [options.data]    请求体或 query
 * @param {Object} [options.header]  附加头
 * @param {boolean} [options.skipAuthRedirect] 为 true 时 401 不跳登录、不清会话（登录接口用）
 * @param {boolean} [options.silent] 为 true 时不自动 toast 错误
 * @param {boolean} [options.auth]   为 false 时不带 token（如登录注册）
 * @param {boolean} [options.loading] 为 true 时显示全局 loading
 * @param {string} [options.loadingText]
 * @returns {Promise<any>} resolve 业务 data
 */
function request(options) {
  const opts = Object.assign(
    {
      method: 'GET',
      data: {},
      header: {},
      auth: true,
      silent: false,
      loading: false,
      skipAuthRedirect: false
    },
    options
  );

  // ---- 本地模拟数据（后端未就绪时启用，config.MOCK = true）----
  // MOCK 模式下**只走 mock**：路由没登记就明确报错，绝不回落到真实网络。
  // 否则会出现"本地看着正常、其实是在打一个连不上的后端"，问题被掩盖到联调才暴露。
  if (config.MOCK) {
    if (!mock.has(opts.url, opts.method)) {
      const key = (opts.method || 'GET').toUpperCase() + ' ' + opts.url.split('?')[0];
      const message = 'mock 未登记该接口：' + key;
      console.warn('[request] ' + message + '（请在 utils/mock.js 补一条，或关掉 config.MOCK）');
      if (!opts.silent) wx.showToast({ title: message, icon: 'none' });
      return Promise.reject({ code: 404, message: message });
    }
    return mock
      .run(opts.url, opts.method, opts.data)
      .then((res) => res)
      .catch((err) => {
        if (!opts.silent) wx.showToast({ title: err.message || '请求失败', icon: 'none' });
        return Promise.reject(err);
      });
  }

  if (opts.loading) {
    wx.showLoading({ title: opts.loadingText || '加载中', mask: true });
  }

  const header = Object.assign({ 'content-type': 'application/json' }, opts.header);
  if (opts.auth) {
    const token = getToken();
    if (token) header.Authorization = 'Bearer ' + token;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(opts.url),
      method: opts.method,
      data: opts.data,
      header: header,
      timeout: config.TIMEOUT,
      success(res) {
        const status = res.statusCode || 0;
        const body = res.data || {};

        if ((status === 401 || body.code === config.UNAUTHORIZED_CODE) && !opts.skipAuthRedirect) {
          handleUnauthorized();
          reject({ code: 401, message: '登录已失效，请重新登录' });
          return;
        }
        // 账号被禁用：A 的后端在 middleware/auth.js 固定返回 403 + 这段文案
        if (status === 403 && (body && body.message) === '账号已被禁用') {
          handleDisabledAccount();
          reject({ code: 403, message: '账号已被禁用' });
          return;
        }
        if (status < 200 || status >= 300) {
          // 非 2xx 时后端仍会返回 { code, message }，业务原因必须透出，
          // 否则「报酬不能低于 2 元」「该单已被别人接走」这类校验文案会被吞掉。
          const msg = (body && body.message) || '服务异常（' + status + '）';
          if (!opts.silent) wx.showToast({ title: msg, icon: 'none' });
          reject({ code: (body && body.code) || status, message: msg, status });
          return;
        }
        // 兼容后端直接返回裸数据的情况
        if (typeof body !== 'object' || body === null || body.code === undefined) {
          resolve(body);
          return;
        }
        if (body.code === config.SUCCESS_CODE) {
          resolve(body.data);
          return;
        }
        const msg = body.message || '操作失败';
        if (!opts.silent) wx.showToast({ title: msg, icon: 'none' });
        reject(body);
      },
      fail(err) {
        const msg = /timeout/i.test(err.errMsg || '')
          ? '请求超时，请检查网络'
          : '无法连接后端，请确认服务已启动';
        if (!opts.silent) wx.showToast({ title: msg, icon: 'none' });
        reject({ code: -1, message: msg, raw: err });
      },
      complete() {
        if (opts.loading) wx.hideLoading();
      }
    });
  });
}

/** 便捷方法 */
const http = {
  get: (url, data, extra) => request(Object.assign({ url, method: 'GET', data }, extra)),
  post: (url, data, extra) => request(Object.assign({ url, method: 'POST', data }, extra)),
  put: (url, data, extra) => request(Object.assign({ url, method: 'PUT', data }, extra)),
  del: (url, data, extra) => request(Object.assign({ url, method: 'DELETE', data }, extra)),
  request
};

/** 文件上传（图片等），字段名统一 file */
function upload(filePath, extra) {
  const opts = extra || {};
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '上传中', mask: true });
    wx.uploadFile({
      url: buildUrl(opts.url || '/api/upload'),
      filePath: filePath,
      name: opts.name || 'file',
      formData: opts.formData || {},
      header: { Authorization: 'Bearer ' + getToken() },
      success(res) {
        let body = res.data;
        try {
          body = typeof body === 'string' ? JSON.parse(body) : body;
        } catch (e) {
          reject({ code: -1, message: '上传响应解析失败' });
          return;
        }
        if (res.statusCode === 401 || body.code === 401) {
          handleUnauthorized();
          reject({ code: 401, message: '登录已失效' });
          return;
        }
        if (body.code === config.SUCCESS_CODE) resolve(body.data);
        else {
          wx.showToast({ title: body.message || '上传失败', icon: 'none' });
          reject(body);
        }
      },
      fail(err) {
        wx.showToast({ title: '上传失败', icon: 'none' });
        reject({ code: -1, message: '上传失败', raw: err });
      },
      complete() {
        wx.hideLoading();
      }
    });
  });
}

module.exports = {
  request,
  get: http.get,
  post: http.post,
  put: http.put,
  del: http.del,
  upload
};
