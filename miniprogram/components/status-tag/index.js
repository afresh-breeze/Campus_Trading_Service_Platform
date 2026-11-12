// 状态标签（B 成员：公共层）
// 枚举口径来源：docs/数据库14张表设计详解.md
//   items.status            : on_sale / reserved / sold / off_shelf
//   errand_orders.status    : pending / taken / completed / cancelled
//   users.status            : active / disabled（11-11 新增，个人中心试渲染用）
// 新增状态必须先改这里，不要在页面里写死文案和颜色。
const STATUS_MAP = {
  item: {
    on_sale:   { text: '在售',   tone: 'primary' },
    reserved:  { text: '已预订', tone: 'warning' },
    sold:      { text: '已售出', tone: 'muted' },
    off_shelf: { text: '已下架', tone: 'muted' }
  },
  errand: {
    pending:   { text: '待接单', tone: 'primary' },
    taken:     { text: '进行中', tone: 'warning' },
    completed: { text: '已完成', tone: 'success' },
    cancelled: { text: '已取消', tone: 'muted' }
  },
  user: {
    active:   { text: '正常',   tone: 'success' },
    disabled: { text: '已禁用', tone: 'muted' }
  }
};

Component({
  properties: {
    // 业务域：item 二手 / errand 代取 / user 账号
    domain: { type: String, value: 'errand' },
    // 后端原始状态值，直接传，不在页面翻译
    status: { type: String, value: '' },
    // 描边样式（浅底），用于卡片正文；压在图片上时传 false 用实心
    plain: { type: Boolean, value: true }
  },

  data: {
    text: '',
    tone: 'muted'
  },

  observers: {
    'domain, status': function (domain, status) {
      const dict = STATUS_MAP[domain] || STATUS_MAP.errand;
      const hit = dict[status] || { text: status || '未知', tone: 'muted' };
      this.setData({ text: hit.text, tone: hit.tone });
    }
  }
});
