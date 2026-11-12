/**
 * nav-top：自定义导航栏下的顶部安全区
 * - 高度 = 状态栏 + 胶囊按钮（取 getMenuButtonBoundingClientRect().bottom），保证内容不被系统状态栏和右上角胶囊遮挡
 * - back=true 时在有页面栈的二级页左上角渲染一个悬浮返回按钮（原生导航栏关闭后系统返回键不存在）
 * - 不传 title 时不渲染任何标题，页面内容从胶囊下方开始
 */
Component({
  options: { addGlobalClass: true },

  properties: {
    back: { type: Boolean, value: false },
    title: { type: String, value: '' }
  },

  data: {
    spacerH: 64,
    canBack: false
  },

  lifetimes: {
    attached() {
      let h = 64;
      try {
        const menu = wx.getMenuButtonBoundingClientRect
          ? wx.getMenuButtonBoundingClientRect()
          : null;
        if (menu && menu.bottom) {
          h = menu.bottom + 6;
        } else {
          const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          h = (win.statusBarHeight || 20) + 44;
        }
      } catch (e) { h = 64; }
      const canBack = this.data.back && getCurrentPages().length > 1;
      this.setData({ spacerH: h, canBack });
    }
  },

  methods: {
    onBack() {
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/index/index' })
      });
    }
  }
});
