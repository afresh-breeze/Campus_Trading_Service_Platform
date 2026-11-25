// 代取详情（B 成员，11-12 主线）
// ------------------------------------------------------------------
// 铁律（手册 §6.9）：底部按钮**只按后端布尔字段**显示，前端绝不用
//   status + 当前用户自己推权限——A 一改 sp_take_errand 的规则，前端就会错。
//   后端 GET /api/errands/:id 已返回 canTake / canEdit / canPublish /
//   canComplete / canCancel / canRelease 六个字段。
//
// 私单（visibility='private'）注意：
//   1. 私单不出现在大厅，只能从「我的代取」/ 会话卡片 / 分享链接进入；
//   2. 非发布者、非接单者、且没就该单建过会话的人，详情接口直接 404（不是 403）；
//   3. 谈妥后跑腿可直接接单，不必先发布到大厅；发布者也可点「发布到大厅」。
//
// 未接入项：无（canEdit 编辑按钮 11-13 随发布页落地一并挂上，跳
//   /pages/errand/publish?id= 回填编辑；发布页 PUT 成功后 navigateBack 回本页）。
//
// 本次修（P1-2/6/7/8、P2-4/6/8）：
//   · 404 与临时失败分开：404 只给「回大厅」，网络失败给「重试」；
//   · 补完成时间、正常态固定「回代取大厅」入口（单页栈时没有返回键）；
//   · 取消类操作不再被提为主色，弹窗标题跟随动作名；
//   · 身份判断等 /api/auth/me 回来再算，避免冷启动把发布者当第三方。
const http = require('../../utils/request');
const adapter = require('../../utils/adapter');
const util = require('../../utils/util');
const campus = require('../../utils/campus');
// 品类插画派生（11-25 抽到公共层，与大厅列表缩略图同一张图、同一套规则）
const errandUtil = require('../../utils/errand');
// 小票落款随机短句（11-25：替换「打印时间」行，与随机图案同一批在 onLoad 抽取）
const mottoUtil = require('../../utils/motto');

const SIZE_TEXT = { small: '小件', medium: '中件', large: '大件' };

// 粒子环（11-25 用户反馈）：跑步小人整圈环绕，顶部色最重、向两侧渐浅。
// 四档色全部取自既有令牌（wxss 里定义 --0..--3 变体），js 只算位置与档位。
const RING_STEPS = 16;
const routeDots = [];
for (let i = 0; i < RING_STEPS; i++) {
  const deg = (i * 360) / RING_STEPS;
  const rad = (deg * Math.PI) / 180;
  const eff = Math.min(deg, 360 - deg); // 距顶部的角度 0..180
  routeDots.push({
    k: i,
    x: +(50 + 50 * Math.sin(rad)).toFixed(2),
    y: +(50 - 50 * Math.cos(rad)).toFixed(2),
    c: eff <= 22.5 ? 0 : eff <= 67.5 ? 1 : eff <= 112.5 ? 2 : 3
  });
}

/* ---------------- 小票装饰（11-25 用户预览确认「细锯齿」版） ----------------
   SAW_TEETH 是固定数据、只算一次，页面里用 wx:for 铺出来，不占运行时开销：
   纸面在 rpx 下恒为 686rpx（750 - 两侧 32rpx），齿距 26rpx → 26.4 齿，
   取 27 齿（702rpx）由 .receipt__saw 的 overflow 裁掉末齿。 */
const SAW_TEETH = [];
for (let i = 0; i < 27; i++) SAW_TEETH.push(i);

/* 小票落款图案（11-25 用户定稿）：原为 view 拼条形码，用户反馈像真的码
   会引起误会（扫码/支付联想）→ 换成卡通线条图案随机展示。
   图源 E:\Qin\photo\ui线条图案（512×512 黑线条透明底），按内容语义命名入库
   assets/receipt/（cat 睡猫 / mouse 老鼠 / cake 蛋糕 / umbrella 雨中撑伞 / trees 树丛；
   狗图按用户要求已删），每次打开详情页随机抽一张；刷新/回跳保持同一张，不闪变。
   用户加新图：拷进 assets/receipt/ 按语义命名，再往清单追加一行即可。 */
const DOODLE_IMAGES = [
  '/assets/receipt/cat.png',
  '/assets/receipt/mouse.png',
  '/assets/receipt/cake.png',
  '/assets/receipt/umbrella.png',
  '/assets/receipt/trees.png'
];

/** 时间口径：asap 无时间字段；deadline 只有截止；range 有起止 */
function timeText(order) {
  if (!order) return '';
  if (order.timeType === 'asap') return '尽快送达';
  if (order.timeType === 'deadline') {
    return (util.formatTime(order.deadline) || '截止时间未填') + ' 前送达';
  }
  const start = util.formatTime(order.timeStart);
  const end = util.formatTime(order.deadline);
  if (!start || !end) return '时间待定';
  return start + ' 至 ' + end;
}

/**
 * 底部按钮：顺序 = 主操作 → 私单发布 → 找跑腿 → 编辑 → 撤回 → 释放
 * 有主操作时它一定是主色按钮；若只有次要操作，把第一个提为主色，避免整条栏都是灰按钮
 */
function buildActions(order) {
  const list = [];
  if (order.canTake) list.push({ key: 'take', text: '接单', primary: true });
  if (order.canComplete) list.push({ key: 'complete', text: '确认完成', primary: true });
  // edit 放在 publish 之后：待发布私单的主色应留给「发布到大厅」这个关键下一步
  if (order.canPublish) list.push({ key: 'publish', text: '发布到大厅', primary: false });
  // 待发布私单可以反复回找跑腿页挑人（谈崩了不一定要发大厅）
  if (order.canEdit) list.push({ key: 'findRunner', text: '找跑腿', primary: false });
  if (order.canEdit) list.push({ key: 'edit', text: '编辑订单', primary: false });
  if (order.canCancel) {
    list.push({
      key: 'cancel',
      text: order.status === 'taken' ? '撤回订单' : '取消订单',
      primary: false,
      // 取消/撤回是破坏性操作：用 danger 样式，且**不参与**「提为主色」
      danger: true
    });
  }
  if (order.canRelease) list.push({ key: 'release', text: '释放订单', primary: false });

  // 只有「非破坏性」的次要操作才允许被提为主色，
  // 否则「我发布的待接单大厅单」只有取消时，破坏性按钮会变成唯一主按钮（P1-8）
  const hasPrimary = list.some((a) => a.primary);
  if (!hasPrimary) {
    const firstSafe = list.filter((a) => !a.danger)[0];
    if (firstSafe) firstSafe.primary = true;
  }
  return list;
}

Page({
  data: {
    id: 0,
    loading: true,
    error: '',
    errorDesc: '',
    order: null,
    // 展示层派生字段（wxml 不做计算，全部在 js 里算好）
    sizeText: '',
    heroImage: '',
    routeFromMain: '',
    routeFromSub: '',
    routeDots: [],
    // 小票装饰：齿数固定；落款图案在 onLoad 里随机抽，进页面时定死
    sawTeeth: SAW_TEETH,
    receiptImage: DOODLE_IMAGES[0],
    receiptDate: '',
    receiptMotto: '',
    rewardText: '0.00',
    timeText: '',
    createdText: '',
    takenText: '',
    completedText: '',
    canRetry: false,
    isPublisher: false,
    isRunner: false,
    publisherInitial: '发',
    publisherAvatarUrl: '',
    runnerInitial: '接',
    runnerAvatarUrl: '',
    chatPeerId: 0,
    chatShow: false,
    chatLabel: '联系 TA',
    chatTip: '',
    actions: [],
    actionKey: '',
    submitting: false
  },

  onLoad(options) {
    // 11-25 下拉刷新改 scroll-view refresher（Mode A）：容器高度 = 视口 − 导航高度
    try {
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      this.setData({ stickyTop: menu && menu.bottom ? menu.bottom + 6 : 64 });
    } catch (e) {
      this.setData({ stickyTop: 64 });
    }
    const id = Number((options && options.id) || 0);
    if (!id) {
      util.toast('缺少订单号');
      setTimeout(() => this.backOut(), 800);
      return;
    }
    this.setData({ id });
    // 落款图案随机抽一张：只在打开页面时定，之后的 fetch/回跳不重抽（避免图案闪变）
    this.setData({
      receiptImage: DOODLE_IMAGES[Math.floor(Math.random() * DOODLE_IMAGES.length)],
      // 短句与图案同批抽取：开页定死，fetch/回跳/刷新不重抽（防闪变）
      receiptMotto: mottoUtil.randomMotto()
    });
  },

  // 从聊天页返回时必须看到最新状态（可能刚被接单/完成），所以每次 onShow 都重拉
  onShow() {
    if (!this.data.id) return;
    const app = getApp();
    if (app && typeof app.isLogin === 'function' && !app.isLogin()) {
      app.requireLogin('/pages/errand/detail?id=' + this.data.id);
      return;
    }
    this.fetch();
  },

  onRefresh() {
    this.setData({ pulling: true });
    const done = () => this.setData({ pulling: false });
    this.fetch().then(done, done);
  },

  fetch() {
    if (!this.data.id) return Promise.resolve();
    // 身份（isPublisher/isRunner/chatPeerId）依赖当前用户；冷启动时如果只有 token、
    // 缓存 cs_user 缺失，必须等 /api/auth/me 回来再算，否则发布者会被当成第三方（P2-6）。
    return this.ensureUser()
      .then(() => http.get('/api/errands/' + this.data.id, {}, { silent: true }))
      .then((order) => {
        this.apply(order || {});
        return order;
      })
      .catch((err) => {
        this.applyError(err);
        return null;
      });
  },

  /** 当前用户信息兜底：没有 userId 时补一次 /api/auth/me（失败不阻塞页面） */
  ensureUser() {
    const app = getApp();
    const me = (app && app.globalData && app.globalData.userInfo) || {};
    if (me && me.userId) return Promise.resolve(me);
    if (!http || !app || !app.globalData || !app.globalData.token) return Promise.resolve(me);
    return http
      .get('/api/auth/me', {}, { silent: true })
      .then((user) => {
        if (user) {
          app.globalData.userInfo = user;
          try {
            wx.setStorageSync('cs_user', user);
          } catch (e) {
            /* 忽略缓存写失败 */
          }
        }
        return user || me;
      })
      .catch(() => me);
  },

  apply(order) {
    const app = getApp();
    const me = (app && app.globalData && app.globalData.userInfo) || {};
    const myId = Number(me.userId || 0);

    const isPublisher = !!myId && Number(order.publisherId) === myId;
    const isRunner = !!order.runnerId && Number(order.runnerId) === myId;
    const publisherNick = order.publisherNickname || '发布者';
    // 小票落款只取一次「此刻」，避免两次 new Date() 跨分钟导致日期与时间不一致
    const printAt = new Date();

    // 联系谁：我是发布者找接单人；其他人（接单者 / 聊过私单的跑腿 / 大厅单的潜在跑腿）找发布者
    let chatPeerId = 0;
    if (isPublisher) chatPeerId = Number(order.runnerId || 0);
    else chatPeerId = Number(order.publisherId || 0);

    // 聊天入口的口径（A 15:11 反馈「没接单聊天的入口」）：
    //   · taken/completed：发布者找接单人、其他人找发布者（原口径）；
    //   · pending 大厅单：非发布者可先联系发布者问清楚再接单——后端 chat.js 只拦
    //     「私单非发布者建会话」，大厅单任意登录用户都能建，放开是安全的；
    //   · pending 私单：非发布者本来就进不来详情页（404，除非已是会话方），
    //     能进来的会话方继续聊也合理；
    //   · cancelled：不再给聊天入口。
    const canChat = !!chatPeerId && order.status !== 'cancelled';
    const chatLabel = !isPublisher && order.status === 'pending' ? '联系发布者' : '联系 TA';
    const chatTip =
      canChat && !isPublisher && order.status === 'pending' ? '有疑问可以先联系发布者，谈妥后再接单' : '';

    this.setData({
      loading: false,
      error: '',
      errorDesc: '',
      order,
      sizeText: SIZE_TEXT[order.itemSize] || order.itemSize || '未填写',
      // 11-25 对齐二手详情页：顶部大预览图在上、详情在下。表里没有图片字段，
      // 用与大厅卡片同一套品类插画（utils/errand.js，源图已放大到 512²）
      heroImage: errandUtil.categoryIcon(order),
      // 11-25 用户反馈：详情页取件地点「地标在上、片区在下」两行，不许截断——
      // 列表卡可以 ellipsis，详情页出现「南区教学区 · …」显示不全是大忌
      routeFromMain: campus.shortPlace(order.pickupArea, order.pickupPlace) || '未填写',
      routeFromSub:
        campus.shortPlace(order.pickupArea, order.pickupPlace) &&
        campus.shortPlace(order.pickupArea, order.pickupPlace) !== order.pickupArea
          ? order.pickupArea
          : '',
      routeDots,
      // 小票落款（11-25）：日期取此刻；「打印时间」行已换成随机短句（开页时已定）
      receiptDate: util.formatTime(printAt, false),
      rewardText: util.formatPrice(order.reward),
      timeText: timeText(order),
      createdText: util.fromNow(order.createdAt),
      takenText: order.takenAt ? '接单于 ' + util.formatTime(order.takenAt) : '已接单',
      completedText: order.completedAt ? util.formatTime(order.completedAt) : '',
      isPublisher,
      isRunner,
      publisherInitial: publisherNick.slice(0, 1),
      publisherAvatarUrl: adapter.fullUrl(order.publisherAvatar),
      runnerInitial: (order.runnerNickname || '接').slice(0, 1),
      runnerAvatarUrl: adapter.fullUrl(order.runnerAvatar),
      chatPeerId,
      chatShow: canChat,
      chatLabel,
      chatTip,
      // 聊天入口并进底部操作栏（11-16 反馈：联系发布者和接单放一起，卡片里只留发布人信息）
      actions: (function () {
        const list = buildActions(order);
        if (canChat) list.unshift({ key: 'chat', text: chatLabel, primary: false });
        return list;
      })()
    });
  },

  /**
   * 404 与临时失败分开处理（P1-2/P2-8）：
   *   404 可能是「ID 不存在」「被删除」「私单无权查看」三种，统一给一句中性说明 + 回大厅；
   *   网络/后端异常给「重试」，别让用户只能离开页面。
   */
  applyError(err) {
    const code = err && err.code;
    if (code === 404) {
      this.setData({
        loading: false,
        order: null,
        actions: [],
        canRetry: false,
        error: '订单不存在或无法查看',
        errorDesc: '可能已被删除；如果是私单，只有发布者、接单者和聊过这单的人可以查看'
      });
      return;
    }
    this.setData({
      loading: false,
      canRetry: true,
      error: '加载失败',
      errorDesc: (err && err.message) || '请检查网络后重试'
    });
  },

  onRetry() {
    this.setData({ loading: true, error: '', errorDesc: '', canRetry: false });
    this.fetch();
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    if (this.data.submitting) return;

    // 聊天是跳转类动作，不弹确认，必须在 cfg 判空之前处理（同 edit/findRunner）
    if (key === 'chat') {
      this.onContact();
      return;
    }

    const map = {
      take: {
        confirm: '接单后订单将从大厅消失，确认接单？',
        title: '确认接单',
        url: '/api/errands/{id}/take',
        ok: '接单成功，记得联系发布者'
      },
      complete: {
        confirm: '确认这笔代取已经送达？完成后不可撤销。',
        title: '确认完成',
        url: '/api/errands/{id}/complete',
        ok: '已确认完成'
      },
      cancel: {
        confirm: this.cancelConfirmText(),
        // 标题跟随动作名：pending 是「取消订单」，taken 才是「撤回订单」（P1-8）
        title:
          this.data.order && this.data.order.status === 'taken' ? '确认撤回' : '确认取消',
        url: '/api/errands/{id}/cancel'
      },
      release: {
        confirm: '释放后订单回到待接单，你可能被其他人接走，确认？',
        title: '确认释放',
        url: '/api/errands/{id}/release',
        ok: '已释放，订单回到待接单'
      },
      publish: {
        confirm: '发布到大厅后所有人都能看到并接单，确认？',
        title: '发布到大厅',
        url: '/api/errands/{id}/publish',
        ok: '已发布到大厅'
      }
    };

    // 编辑/找跑腿是「跳转类」动作，不弹确认，也**不在 map 里**——
    // 必须放在 cfg 判空之前，否则 edit 键取不到 cfg 会被直接 return（11-13~11-15 的空点击 bug）
    if (key === 'edit') {
      wx.navigateTo({
        url: '/pages/errand/publish?id=' + this.data.id,
        fail: () => util.toast('编辑页打开失败')
      });
      return;
    }
    if (key === 'findRunner') {
      const order = this.data.order || {};
      const query = [
        'orderId=' + order.orderId,
        'area=' + encodeURIComponent(order.pickupArea || ''),
        'place=' + encodeURIComponent(order.pickupPlace || ''),
        'timeType=' + (order.timeType || 'asap'),
        'itemSize=' + (order.itemSize || '')
      ];
      if (order.timeStart) query.push('timeStart=' + encodeURIComponent(order.timeStart));
      if (order.deadline) query.push('deadline=' + encodeURIComponent(order.deadline));
      wx.navigateTo({
        url: '/pages/errand/runners?' + query.join('&'),
        fail: () => util.toast('找跑腿页打开失败')
      });
      return;
    }

    const cfg = map[key];
    if (!cfg) return;

    util.confirm(cfg.confirm, cfg.title).then((ok) => {
      if (!ok) return;
      this.setData({ submitting: true, actionKey: key });
      http
        .post(cfg.url.replace('{id}', this.data.id), {}, { silent: true })
        .then((res) => {
          // cancel 的文案由后端返回的 visibility 决定：私单退回待接单 ≠ 回大厅
          if (key === 'cancel') {
            const data = res || {};
            if (data.status === 'cancelled') util.toast('订单已取消');
            else if (data.visibility === 'hall') util.toast('订单已退回大厅');
            else util.toast('订单已退回待接单');
          } else {
            util.toast(cfg.ok || '操作成功');
          }
          // 刷新完成前不解禁按钮：否则状态还没变，用户能在窗口内再点一次（P2-4）
          return this.fetch().then(() => {
            this.setData({ submitting: false, actionKey: '' });
          });
        })
        .catch((err) => {
          this.setData({ submitting: false, actionKey: '' });
          this.handleActionError(err);
        });
    });
  },

  /** 取消/撤回的确认文案：私单从未进过大厅，不能说「不再出现在大厅」（P1-8） */
  cancelConfirmText() {
    const order = this.data.order || {};
    if (order.status === 'taken') {
      return '撤回后订单退回待接单（大厅单回大厅、私单仍为私单），确认？';
    }
    if (order.visibility === 'private') {
      return '取消后订单直接作废，无法恢复，确认？';
    }
    return '取消后订单作废，将不再出现在大厅，确认？';
  },

  /**
   * 409 / 404 / 403 分别给不同出路，别一律弹 message。
   * 409 的原因不止「被接走」：发布→「订单已在大厅」、撤回→「当前订单不能撤回」、
   * 释放→「当前订单不能释放」，所以优先透出后端 message，前端只留兜底文案。
   */
  handleActionError(err) {
    const code = err && err.code;
    if (code === 409) {
      util.toast((err && err.message) || '手慢了，订单已被接走');
      this.fetch();
      return;
    }
    if (code === 404) {
      this.applyError({ code: 404 });
      return;
    }
    // 403：私单未发布时接单会走到这里，后端文案已说明原因，直接透出
    util.toast((err && err.message) || '操作失败，请重试');
  },

  onContact() {
    const order = this.data.order;
    const peerId = this.data.chatPeerId;
    if (!order || !peerId) {
      util.toast('暂无可联系的对象');
      return;
    }
    // 聊天页 11-13~14 落地前是占位页，URL 契约先按手册 §6.14 写死
    wx.navigateTo({
      url: '/pages/chat/detail?peerId=' + peerId + '&bizType=errand&bizId=' + order.orderId,
      fail: () => util.toast('聊天页打开失败')
    });
  },

  onCopyOrderId() {
    const order = this.data.order;
    if (!order) return;
    util.copy(String(order.orderId), '订单号已复制');
  },

  onBackHall() {
    wx.switchTab({ url: '/pages/errand/hall', fail: () => wx.navigateBack() });
  },

  backOut() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/errand/hall' });
  }
});
