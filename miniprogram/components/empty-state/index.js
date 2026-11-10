// 空状态（B 成员：公共层）
// 用于列表无数据、搜索无结果、未登录未接单等场景。
// 只在真正没有内容时用；加载中请用骨架屏或 loading，不要用本组件。
Component({
  properties: {
    title: { type: String, value: '暂无内容' },
    desc: { type: String, value: '' },
    actionText: { type: String, value: '' }
  },
  methods: {
    onAction() {
      this.triggerEvent('action');
    }
  }
});
