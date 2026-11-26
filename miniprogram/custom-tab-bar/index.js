/**
 * 自定义 tabBar（悬浮胶囊样式）
 * ------------------------------------------------------------------
 * 每个 tab 页各持有一个 tabBar 实例，切页时新实例会重新渲染。
 * 两套状态：
 *   - selected：只负责胶囊位置（点击时滑动，切页同步时无动画）；
 *   - activeIndex：只负责图标/文字的选中配色，与 selected 同帧切换。
 * 切换策略（11-28 去频闪）：点击后一次 setData 同帧到位并立即 switchTab。
 * 旧实现「胶囊先滑 240ms 再跳页 + activeIndex=-1 全灰中间态」会让导航栏
 * 在连续切换时反复经历「全灰 → 点亮 → 跳页」，看起来就是频闪；
 * 新页面实例 attached 时用 globalData.tabIndex 直接渲染最终态，无中间帧。
 */
const TAB_LIST = [
  {
    pagePath: '/pages/index/index',
    text: '二手',
    icon: '/assets/tabicons/home-gray.png',
    iconActive: '/assets/tabicons/home-dark.png'
  },
  {
    pagePath: '/pages/errand/hall',
    text: '代取',
    icon: '/assets/tabicons/bag-gray.png',
    iconActive: '/assets/tabicons/bag-dark.png'
  },
  {
    pagePath: '/pages/chat/list',
    text: '消息',
    icon: '/assets/tabicons/chat-gray.png',
    iconActive: '/assets/tabicons/chat-dark.png'
  },
  {
    pagePath: '/pages/mine/index',
    text: '我的',
    icon: '/assets/tabicons/user-gray.png',
    iconActive: '/assets/tabicons/user-dark.png'
  }
];

// 模块级变量：同一小程序内所有 tabBar 实例共享，用于新实例出生时直接定位
let lastIndex = 0;

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
      // 注册到全局注册表：在非 tab 页（如聊天详情）标记已读时也能收到广播
      if (app && typeof app.registerBadgeTarget === 'function') {
        app.registerBadgeTarget(this);
      }
    },
    detached() {
      const app = getApp();
      if (app && typeof app.unregisterBadgeTarget === 'function') {
        app.unregisterBadgeTarget(this);
      }
    }
  },

  pageLifetimes: {
    show() {
      const app = getApp();
      const unread = (app && app.globalData && app.globalData.unreadCount) || 0;
      if (unread !== this.data.badge) this.setData({ badge: unread });
      // 每次切回 tab 都向服务端对齐一次，避免任何页面内的已读操作让红点停在旧值
      if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
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
      // 同项重复点击直接拦掉；不同项走「一次渲染 + 立即跳页」
      if (index === this.data.selected) return;

      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;

      // 胶囊滑动与选中配色同帧切换，页面立即切换：
      // 新实例 attached 时按 globalData.tabIndex 直接渲染最终态，
      // 全程没有「全灰图标」「胶囊等待」这类中间帧。
      this.setData({ selected: index, activeIndex: index, animate: true });
      wx.switchTab({ url: path });
    }
  }
});
