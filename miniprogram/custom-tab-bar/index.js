/**
 * 自定义 tabBar（悬浮胶囊样式）
 * ------------------------------------------------------------------
 * 每个 tab 页各持有一个 tabBar 实例，切页时新实例会重新渲染。
 * 两套状态：
 *   - selected：只负责胶囊位置（点击时滑动，切页同步时无动画）；
 *   - activeIndex：只负责图标/文字的选中配色，与 selected 同帧切换。
 * 切换策略（11-28 三次调整）：点击后同帧落最终态并**立即 switchTab**。
 * 不再等胶囊滑完再切页：真机上缓存页会先画上一次的高亮帧，延迟期间旧页的
 * 胶囊已经滑到新项，切页瞬间缓存帧又把高亮画回旧项，表现为「高亮闪回」。
 * 连点由「目标项已选中」直接拦截；页面切换交给微信，胶囊动画只做视觉。
 * 新页面实例 attached 时用 globalData.tabIndex 直接渲染最终态，无中间帧。
 *
 * 缓存旧帧（11-26/11-28 多轮真机定位）：
 * 目标页是缓存页时，微信会先画它上一次的渲染帧。对策两层：
 *   1) 点击瞬间把最终选中态广播给 badgeTargets 注册表里所有实例；
 *   2) 目标页 onShow 的 syncSelected 不再早退，强制 setData 一次，
 *      保证缓存帧即使短暂显示旧高亮，也会在页面显示时立即拉回当前 tab。
 * 配合「立即 switchTab」，不再给旧页的胶囊留出先滑到新项、再被缓存帧
 * 拉回旧项的时间窗。
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
      // 防旧页 onShow 抢写：只有当前页面栈顶确实是该 tab 时才同步选中态，
      // 避免切页瞬间旧页生命周期把高亮写回旧 tab（真机闪回来源之一）。
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      const top = pages.length ? pages[pages.length - 1] : null;
      const expected = TAB_LIST[index] && TAB_LIST[index].pagePath.replace(/^\//, '');
      if (top && expected && top.route !== expected) return;

      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;
      this.broadcastSelection(index);

      // 不要在这里早退：缓存页的旧帧可能还停在旧高亮上，
      // onShow 的这次 setData 必须真的触发一次渲染，把高亮拉回当前 tab。
      this.setData({ selected: index, activeIndex: index, animate: false });
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      // 同项重复点击直接拦掉
      if (index === this.data.selected) return;

      const app = getApp();
      if (app && app.globalData) app.globalData.tabIndex = index;
      lastIndex = index;

      // 先广播：所有隐藏缓存实例离屏同步到最终态，切过去时旧帧就是对的
      this.broadcastSelection(index);
      // 同帧点亮目标项并立即切页：不再等胶囊滑完，避免旧页高亮先到新项、
      // 目标缓存页又把高亮画回旧项的「闪回」
      this.setData({ selected: index, activeIndex: index, animate: true });
      wx.switchTab({ url: path });
    }
  }
});
