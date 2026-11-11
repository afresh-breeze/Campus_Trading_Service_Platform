// 二手市场（A 成员负责）
Page({
  data: {
    pageTitle: '二手市场'
  },

  onLoad(options) {
    console.log('[二手市场] options:', options);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  }
});
