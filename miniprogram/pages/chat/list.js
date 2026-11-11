// 消息（B 成员负责）
Page({
  data: {
    pageTitle: '消息'
  },

  onLoad(options) {
    console.log('[消息] options:', options);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  }
});
