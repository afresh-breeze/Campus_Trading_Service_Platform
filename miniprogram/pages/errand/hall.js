// 代取大厅（B 成员负责）
Page({
  data: {
    pageTitle: '代取大厅'
  },

  onLoad(options) {
    console.log('[代取大厅] options:', options);
  },

  onShow() {
    // 切页同步选中态：走 syncSelected，避免胶囊播放「瞬移后滑动」的动画
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().syncSelected(1);
    }
  }
});
