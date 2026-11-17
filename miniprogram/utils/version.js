/**
 * 应用版本号（单一来源，B 成员）
 * 走查口径：版本号只允许出现在这里，其它页面一律 require 引用，
 * 避免「我的」页 v0.3.0、设置页 v0.2.9 这种各写各的。
 */
const APP_VERSION = 'v0.3.0';

module.exports = { APP_VERSION };
