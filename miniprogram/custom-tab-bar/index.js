/**
 * 自定义 tabBar（悬浮胶囊样式）
 * ------------------------------------------------------------------
 * 每个 tab 页各持有一个 tabBar 实例，切页时新实例会重新渲染。
 * 为避免「胶囊瞬移」和「文字频闪」，这里拆成两套状态：
 *   - selected：只负责胶囊位置（点击时带滑动动画，切页同步时无动画）；
 *   - activeIndex：只负责图标/文字的选中配色，等胶囊滑到位再切换，
 *     避免出现「白字压在白底上」的闪烁窗口。
 */
const TAB_LIST = [
  {
    pagePath: '/pages/index/index',
    text: '二手',
    icon: '/assets/tabicons/home-gray.png',
    iconActive: '/assets/tabicons/home-white.png'
  },
  {
    pagePath: '/pages/errand/hall',
    text: '代取',
    icon: '/assets/tabicons/bag-gray.png',
    iconActive: '/assets/tabicons/bag-white.png'
  },
  {
    pagePath: '/pages/chat/list',
    text: '消息',
    icon: '/assets/tabicons/chat-gray.png',
    iconActive: '/assets/tabicons/chat-white.png'
  },
  {
    pagePath: '/pages/mine/index',
    text: '我的',
    icon: '/assets/tabicons/user-gray.png',
    iconActive: '/assets/tabicons/user-white.png'
  }
];

// 模块级变量：同一小程序内所有 tabBar 实例共享，用于新实例出生时直接定位
let lastIndex = 0;
const SLIDE_MS = 240;

Component({
  data: {
    selected: 0,
    activeIndex: 0,
    // animate=false 时不挂过渡类，避免首帧/同步时产生滑动
    animate: false,
    // 消息未读红点（自定义 tabBar 下 wx.setTabBarBadge 不生效，改为组件内绘制）
    badge: 0,
    list: TAB_LIST
  },

  lifetimes: {
    attached() {
      const app = getApp();
      const cached = app && app.globalData && app.globalData.tabIndex;
      const index = typeof cached === 'number' ? cached : lastIndex;
      lastIndex = index;
      this.setData({
        selected: index,
        activeIndex: index,
        animate: false,
        badge: (app && app.globalData && app.globalData.unreadCount) || 0
      });
    }
  },

  pageLifetimes: {
    show() {
      const app = getApp();
      const unread = (app && app.globalData && app.globalData.unreadCount) || 0;
      if (unread !== this.data.badge) this.setData({ badge: unread });
    }
  },

  methods: {
    /** 供 app.setUnreadBadge 调用 */
    setBadge(count) {
      const n = Number(count) || 0;
      if (n !== this.data.badge) this.setData({ badge: n });
    },

    /**
     * 供页面 onShow 调用：同步选中态但绝对不播动画。
     * 之前直接在页面里 setData({selected}) 会把动画一起触发，是胶囊乱跳的根因。
     */
    syncSelected(index) {
      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;

      if (this.data.selected === index && this.data.activeIndex === index && !this.data.animate) {
        return;
      }
      this.setData({ selected: index, activeIndex: index, animate: false });
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;

      if (this._switching) return;
      if (index === this.data.selected) return;

      this._switching = true;
      lastIndex = index;
      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;

      // 1) 胶囊先滑；activeIndex 置 -1 让所有项回到未选中配色，
      //    避免旧项「白字压白底」、新项「白字等胶囊」两种闪烁
      this.setData({ selected: index, activeIndex: -1, animate: true });

      // 2) 胶囊到位后再点亮目标项，并立即跳页
      setTimeout(() => {
        this.setData({ activeIndex: index });
        wx.switchTab({
          url: path,
          complete: () => {
            this._switching = false;
          }
        });
      }, SLIDE_MS);
    }
  }
});
