/**
 * 自定义 tabBar（悬浮胶囊样式）
 * ------------------------------------------------------------------
 * 每个 tab 页各持有一个 tabBar 实例，切页时新实例会重新渲染。
 * 两套状态：
 *   - selected：只负责胶囊位置（点击时滑动，切页同步时无动画）；
 *   - activeIndex：只负责图标/文字的选中配色，与 selected 同帧切换。
 * 切换策略（11-28 二次调整）：点击后一次 setData 同帧点亮目标项，胶囊先滑
 * 260ms（与 wxss 过渡时长一致），滑到位后再 switchTab；连点用 clearTimeout
 * 打断上一次未跳页的滑动，直接改道滑向新目标。
 * 旧实现之一「胶囊先滑 + activeIndex=-1 全灰中间态」会频闪，已废弃；
 * 中间态只允许「旧项亮 → 新项亮」的配色切换，绝不允许全灰。
 * 新页面实例 attached 时用 globalData.tabIndex 直接渲染最终态，无中间帧。
 *
 * 缓存旧帧根治（11-26 三修，真机仍现「全灰→点亮→跳页」后定位）：
 * 目标页是缓存页时，微信会先画它上一次的渲染帧。之前只有发起点击的实例知道
 * 选中态变了，其余缓存页实例全停在旧值——切回去时旧帧先上屏（胶囊错位/全灰），
 * onShow 的 syncSelected 才修正，真机上这一帧肉眼可见，连续切换就反复闪。
 * 对策：点击瞬间把最终选中态广播给 badgeTargets 注册表里所有实例；隐藏实例
 * 的 setData 属离屏渲染（用户看不见），等它再上屏时缓存帧已是最终态。
 * 滑动动画只在发起实例上播，节奏（260ms 滑到位再跳页）不变。
 *
 * 红点防闪断（11-28）：真机/模拟器上偶现「切到“我的”后红点先消失再出现」，
 * 30fps 录屏取证看不到断点（QQ20261126-164651.mp4 全程 203 帧红点恒在），
 * 属亚帧级渲染竞态——某个 0 值瞬时盖上来、随即被回填。对策：setBadge 收到 0
 * 时不立刻隐藏，延迟 400ms 确认后再隐藏；期间任何非 0 到达即取消隐藏。
 * 「1→0→1」的竞态被直接抹平；真正的清零（读完消息）只是晚 400ms 生效，无感知。
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

// 跳页延迟：与 wxss 里胶囊过渡 0.26s 对齐，滑到位后再切页面
const SLIDE_WAIT_MS = 260;
// 红点清零确认窗：0 值到达后等这么久才真的隐藏（防亚帧竞态闪断）
const BADGE_CLEAR_CONFIRM_MS = 400;

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
      // 清掉未生效的定时器：实例销毁后不应再有 setData / switchTab
      if (this._badgeClearTimer) {
        clearTimeout(this._badgeClearTimer);
        this._badgeClearTimer = null;
      }
      if (this._switchTimer) {
        clearTimeout(this._switchTimer);
        this._switchTimer = null;
      }
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
      // 走 setBadge 统一入口：0 值也经过防闪断确认窗，不在 show 时机硬切
      this.setBadge(unread);
      // 每次切回 tab 都向服务端对齐一次，避免任何页面内的已读操作让红点停在旧值
      if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
    }
  },

  methods: {
    /** 供 app.setUnreadBadge 调用；0 值走 400ms 确认窗，抹平「消失再出现」竞态 */
    setBadge(count) {
      const n = Number(count) || 0;
      if (n !== 0) {
        // 非 0：取消待生效的清零，直接同步显示
        if (this._badgeClearTimer) {
          clearTimeout(this._badgeClearTimer);
          this._badgeClearTimer = null;
        }
        if (n !== this.data.badge) this.setData({ badge: n });
        return;
      }
      // 0：已在确认窗里就不用重复排队
      if (this._badgeClearTimer) return;
      if (this.data.badge === 0) return;
      this._badgeClearTimer = setTimeout(() => {
        this._badgeClearTimer = null;
        // 窗口期内可能已被非 0 值覆盖，隐藏前再核对一次
        if (Number(this.data.badge) !== 0) this.setData({ badge: 0 });
      }, BADGE_CLEAR_CONFIRM_MS);
    },

    /**
     * 把最终选中态广播给所有已注册的 tabBar 实例（含隐藏页的缓存实例）。
     * 隐藏实例的 setData 是离屏渲染，用户看不见；等切到它时缓存帧已是最终态，
     * 「旧帧先上屏再修正」的频闪从机制上消失。
     */
    broadcastSelection(index) {
      const app = getApp();
      const targets = (app && app.globalData && app.globalData.badgeTargets) || [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        // 跳过发起方（它自己播滑动动画）；落点实例只落态、不回广播，防止循环
        if (!t || t === this || typeof t.applySelection !== 'function') continue;
        t.applySelection(index);
      }
    },

    /** 广播落点：无动画直接落到最终态（只被 broadcastSelection 调用） */
    applySelection(index) {
      this.setData({ selected: index, activeIndex: index, animate: false });
    },

    /**
     * 供页面 onShow 调用：同步选中态但绝对不播动画。
     * 之前直接在页面里 setData({selected}) 会把动画一起触发，是胶囊乱跳的根因。
     * 广播放在最前：即使本实例已是最终态（早退），也兜底把隐藏缓存实例拉齐。
     */
    syncSelected(index) {
      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;
      this.broadcastSelection(index);

      if (this.data.selected === index && this.data.activeIndex === index && !this.data.animate) {
        return;
      }
      this.setData({ selected: index, activeIndex: index, animate: false });
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      // 同项重复点击直接拦掉
      if (index === this.data.selected) return;

      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;

      // 连点打断：上一次滑动还没跳页就点新目标 → 清掉旧定时器，胶囊改道滑向新项
      if (this._switchTimer) {
        clearTimeout(this._switchTimer);
        this._switchTimer = null;
      }

      // 先广播：所有隐藏缓存实例离屏同步到最终态，切过去时旧帧就是对的
      this.broadcastSelection(index);
      // 目标项配色同帧点亮（绝不允许全灰中间态），胶囊开始滑动；
      // 滑到位（260ms，与 wxss 过渡一致）后再切页面。
      this.setData({ selected: index, activeIndex: index, animate: true });
      this._switchTimer = setTimeout(() => {
        this._switchTimer = null;
        wx.switchTab({ url: path });
      }, SLIDE_WAIT_MS);
    }
  }
});
