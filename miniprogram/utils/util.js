/**
 * 通用工具函数（B 成员：公共层）
 */

/** 手机号/学号等基础校验 */
const REGEX = {
  studentNo: /^\d{6,12}$/,
  phone: /^1[3-9]\d{9}$/,
  password: /^\S{6,20}$/
};

/** 格式化时间：2026-11-08 14:30 */
function formatTime(input, withTime) {
  if (!input) return '';
  let d;
  if (input instanceof Date) d = input;
  else if (typeof input === 'number') d = new Date(input);
  else d = new Date(String(input).replace(/-/g, '/').replace('T', ' ').replace(/\..*$/, ''));
  if (isNaN(d.getTime())) return String(input);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  const date = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  if (withTime === false) return date;
  return date + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 昨天 / 11-05 */
function fromNow(input) {
  if (!input) return '';
  const d = new Date(String(input).replace(/-/g, '/').replace('T', ' ').replace(/\..*$/, ''));
  if (isNaN(d.getTime())) return String(input);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hour = Math.floor(min / 60);
  if (hour < 24) return hour + ' 小时前';
  const day = Math.floor(hour / 24);
  if (day === 1) return '昨天';
  if (day < 7) return day + ' 天前';
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** 价格显示：12 -> 12.00，12.5 -> 12.50 */
function formatPrice(v) {
  const n = Number(v);
  if (isNaN(n)) return '0.00';
  return n.toFixed(2);
}

/** 未读数展示：>99 显示 99+ */
function formatBadge(n) {
  const num = Number(n) || 0;
  if (num <= 0) return '';
  return num > 99 ? '99+' : String(num);
}

/** 防抖 */
function debounce(fn, delay) {
  let timer = null;
  return function () {
    const args = arguments;
    const ctx = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(ctx, args), delay || 300);
  };
}

/** 节流 */
function throttle(fn, interval) {
  let last = 0;
  return function () {
    const now = Date.now();
    if (now - last >= (interval || 500)) {
      last = now;
      fn.apply(this, arguments);
    }
  };
}

/** 轻提示 */
function toast(title, icon) {
  wx.showToast({ title: title || '', icon: icon || 'none', duration: 1800 });
}

/** 二次确认，返回 Promise<boolean> */
function confirm(content, title) {
  return new Promise((resolve) => {
    wx.showModal({
      title: title || '提示',
      content: content,
      confirmColor: '#79513D',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false)
    });
  });
}

/** 复制文本 */
function copy(text, tip) {
  wx.setClipboardData({
    data: String(text || ''),
    success: () => toast(tip || '已复制')
  });
}

/** 简易深拷贝（仅 JSON 安全对象） */
function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

/** 金额/数字保留两位 */
function toFixed2(v) {
  const n = Number(v);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

module.exports = {
  REGEX,
  formatTime,
  fromNow,
  formatPrice,
  formatBadge,
  debounce,
  throttle,
  toast,
  confirm,
  copy,
  clone,
  toFixed2
};
