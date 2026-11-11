Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '二手' },
      { pagePath: '/pages/errand/hall', text: '代取' },
      { pagePath: '/pages/chat/list', text: '消息' },
      { pagePath: '/pages/mine/index', text: '我的' }
    ]
  },

  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      const index = e.currentTarget.dataset.index;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    }
  }
});
