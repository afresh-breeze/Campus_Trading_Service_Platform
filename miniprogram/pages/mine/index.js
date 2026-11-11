// 我的（B 成员负责）
Page({
  data: {
    pageTitle: '我的'
  },

  onLoad(options) {
    console.log('[我的] options:', options);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  }
});
