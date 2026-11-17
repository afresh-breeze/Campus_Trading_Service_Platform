// 帮助与反馈（B 成员，11-17）：常见问题折叠 + 意见反馈 → POST /api/feedback
// ------------------------------------------------------------------
// 口径（手册 §6.6）：
//   · FAQ 写「真踩过的坑」，不写"如何使用本产品"这种空话（每条都能对上代码里的行为）
//   · 反馈只提交 content，`feedback` 表没有 type/status 两列，多传会被忽略
//   · 前端限 200 字（手册要求），后端上限 500 字，两边不冲突
const http = require('../../utils/request');
const util = require('../../utils/util');

const MAX_LEN = 200;

// 8 条 FAQ：全部来自本项目真实行为（mock/后端校验、权限口径、状态机）
const FAQS = [
  {
    q: '为什么代取大厅里看不到在线的跑腿同学？',
    a: '大厅只展示 status=pending 且 visibility=hall 的单子；跑腿是否可接单要看「接单设置」里当前是否处于在线时段。选了「按计划上下线」时，只有计划时段内才会出现在找跑腿列表。'
  },
  {
    q: '我发布了代取，但大厅里找不到自己的单？',
    a: '发布时如果选了「仅指定跑腿可见」（私单），单子不会进大厅，需要在「我的代取」里点「发布到大厅」；私单也只能由你自己发起会话。'
  },
  {
    q: '点「联系发布者/联系接单人」提示会话不存在？',
    a: '会话是按「订单 + 双方」自动创建的，正常情况下点一次就会建好。若提示不存在，先确认订单状态是否为「已取消」，或返回重新进一次详情页。'
  },
  {
    q: '上传头像或商品图片失败怎么办？',
    a: '只支持 jpg/png/webp，单张不超过 5MB；超过时客户端会先自动压缩。上传失败会保留原图，可重试一次。'
  },
  {
    q: '为什么提示「登录已失效」？',
    a: '登录态有效期结束后需要重新登录。为了安全，任何页面收到 401 都会回到登录页，登录后原来的操作需要重新进入。'
  },
  {
    q: '接单后可以取消吗？',
    a: '接单人可以「释放订单」把它退回大厅（回到待接单状态），发布人也可以取消订单。订单一旦完成就不能撤销。'
  },
  {
    q: '按计划上线了，为什么状态还显示「已下线」？',
    a: '「按计划」只在计划时段内生效：时段没到之前按钮只保存设置、不会真正上线，状态条会显示下一次自动上线的时间。想立刻可接单请用「当前在线」。'
  },
  {
    q: '给同学发的消息对方多久能看到？',
    a: '聊天页打开时每 3 秒增量拉一次新消息；离开页面就停止拉取，让对方收到通知红点。所以对面停在列表页时不会实时弹消息，属正常现象。'
  }
];

Page({
  data: {
    faqs: FAQS,
    // 折叠状态：默认全部收起，用「当前展开的下标」表示（-1 = 全收起）
    openIndex: -1,
    content: '',
    // 计数按 Unicode 码点算（与 maxlength 的字符口径一致，emoji 不会被算成 2）
    contentLen: 0,
    maxLen: MAX_LEN,
    submitting: false
  },

  onToggleFaq(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ openIndex: this.data.openIndex === index ? -1 : index });
  },

  onInput(e) {
    const value = e.detail.value;
    this.setData({ content: value, contentLen: Array.from(value || '').length });
  },

  onClear() {
    this.setData({ content: '', contentLen: 0 });
  },

  onSubmit() {
    if (this.data.submitting) return;
    const content = String(this.data.content || '').trim();
    if (!content) {
      util.toast('请先写下你的意见');
      return;
    }
    if (Array.from(content).length > MAX_LEN) {
      util.toast('反馈内容不能超过 ' + MAX_LEN + ' 字');
      return;
    }
    this.setData({ submitting: true });
    http
      .post('/api/feedback', { content: content }, { silent: true })
      .then(() => {
        this.setData({ submitting: false, content: '', contentLen: 0 });
        util.toast('感谢反馈');
      })
      .catch((err) => {
        this.setData({ submitting: false });
        util.toast((err && err.message) || '提交失败，请稍后再试');
      });
  }
});
