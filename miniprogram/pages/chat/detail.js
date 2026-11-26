// 聊天页（B 成员，11-14）
// ------------------------------------------------------------------
// 契约（对照 server/src/routes/chat.js，mock.js 同构）：
//   POST /api/conversations {peerId,bizType,bizId} → { conversationId, peerNickname, peerAvatar }
//     （幂等：同一 (用户,对方,bizType,bizId) 恒返回同一会话，可用于补 peer 信息）
//   GET  /api/conversations/:id/messages?afterId=&limit= → { list:[{ messageId, senderId,
//     msgType, content, createdAt, isMine }] }，按 messageId 升序；afterId=0 取最近一页
//   POST /api/conversations/:id/messages {content} → { messageId, createdAt }（只回 id+时间）
//   PUT  /api/conversations/:id/read {lastMessageId?} → { unreadCount }
//   GET  /api/conversations/:id/context → { bizType, bizId, bizSummary }
// 铁律（手册 §6.14）：
//   · 轮询用 afterId 增量 + messageId 去重，绝不全量拉；
//   · onShow 启动 3 秒轮询，onHide/onUnload 必须 clearInterval；
//   · 发送乐观更新，失败标红可重发，不丢草稿；
//   · 进入/隐藏各标记一次已读；只有新消息才滚到底（isAtBottom）。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');
const campus = require('../../utils/campus');

const POLL_INTERVAL = 3000;
const FIRST_LIMIT = 20; // 首屏条数（后端默认 20，最大 50）
const TIME_GAP = 5 * 60 * 1000; // 消息间隔超过 5 分钟显示时间分隔

const ERRAND_STATUS_TEXT = {
  pending: '待接单',
  taken: '进行中',
  completed: '已完成',
  cancelled: '已取消'
};
const ITEM_STATUS_TEXT = {
  on_sale: '在售',
  reserved: '已预留',
  sold: '已售出',
  off_shelf: '已下架'
};
const SIZE_TEXT = { small: '小件', medium: '中件', large: '大件' };

/** 'YYYY-MM-DD HH:mm:ss' → 今天显示 HH:mm，否则 MM-DD HH:mm（实现已收进 utils/util.js） */
function dividerTime(v) {
  return util.timeDivider(v);
}

/** 后端消息行 → 展示结构（含时间分隔计算） */
function toBubble(raw, prev) {
  const isImage = raw.msgType === 'image';
  const createdAt = raw.createdAt || '';
  const lastTs = prev && prev._ts;
  const ts = new Date(String(createdAt).replace(/-/g, '/')).getTime();
  const showTime = !prev || isNaN(ts) || isNaN(lastTs) || ts - lastTs > TIME_GAP;
  return {
    key: 'm' + raw.messageId,
    messageId: raw.messageId,
    isMine: raw.isMine === true || Number(raw.senderId) === Number(wxMe()),
    content: raw.content || '',
    isImage: isImage,
    imageUrl: isImage ? adapter.fullUrl(raw.content) : '',
    timeText: dividerTime(createdAt),
    showTime: showTime,
    pending: false,
    failed: false,
    _ts: ts
  };
}

/** 当前用户 id（拿不到就返回 NaN，isMine 退回后端字段） */
function wxMe() {
  const app = getApp();
  const me = (app && app.globalData && app.globalData.userInfo) || {};
  return Number(me.userId || 0);
}

Page({
  data: {
    pageTitle: '聊天',
    peerId: 0,
    bizType: '',
    bizId: 0,
    conversationId: 0,
    peerNickname: '对方',
    peerInitial: '对',
    peerAvatarUrl: '',

    // 初始化三态：fatal(403/404/网络) / loading / ready
    loading: true,
    fatalError: '',
    fatalDesc: '',
    canRetry: false,

    // 业务卡片
    bizCard: null, // { title, statusText, coverUrl, priceText, mainText, subText, jumpUrl }
    bizTitleText: '',

    messages: [],
    input: '',
    sending: false,
    scrollAnchor: '',
    isAtBottom: true,
    // 11-26：键盘实高（px）。adjust-position 关掉后，输入条用它垫底，
    // 页面整体不再被键盘顶飞，nav-top 与消息区保持原位
    keyboardHeight: 0
  },

  onLoad(options) {
    const o = options || {};
    this.setData({
      peerId: Number(o.peerId || 0),
      bizType: o.bizType === 'item' || o.bizType === 'errand' ? o.bizType : '',
      bizId: Number(o.bizId || 0),
      conversationId: Number(o.conversationId || 0)
    });
    this._reqSeq = 0;
    this._pollTimer = null;
    this.init();
  },

  onShow() {
    // init 完成后才会真正 start；从详情页回来也要保持轮询
    if (this.data.conversationId && !this._pollTimer) this.startPoll();
  },

  onHide() {
    this.stopPoll();
    // 隐藏时也标记一次已读（手册 §6.14 交互要点 5）
    this.markRead();
  },

  onUnload() {
    this.stopPoll();
  },

  /** 初始化：确保会话 → 并行拉业务卡片与首屏消息 → 标记已读 → 启动轮询 */
  init() {
    this.setData({ loading: true, fatalError: '', fatalDesc: '', canRetry: false });
    this.ensureConversation()
      .then((conv) => {
        this.applyPeer(conv);
        // 卡片与消息并行；消息失败不阻塞轮询启动（可重试）
        this.loadContext();
        return this.loadMessages(true);
      })
      .then(() => {
        this.setData({ loading: false });
        this.markRead();
        this.startPoll();
      })
      .catch((err) => {
        this.applyFatal(err);
      });
  },

  /** 没有 conversationId 就建；有了也补一次拿 peer 昵称/头像（幂等） */
  ensureConversation() {
    if (this.data.conversationId && this.data.peerId && this.data.bizType) {
      // 仍要拿 peer 信息：POST 幂等，返回同一会话
      return http.post(
        '/api/conversations',
        { peerId: this.data.peerId, bizType: this.data.bizType, bizId: this.data.bizId || 0 },
        { silent: true }
      );
    }
    if (!this.data.peerId || !this.data.bizType) {
      // 只有 conversationId 的极端入口：跳过建会话，peer 信息给缺省
      if (this.data.conversationId) return Promise.resolve(null);
      return Promise.reject({ code: 400, message: '缺少对方信息，无法打开会话' });
    }
    return http.post(
      '/api/conversations',
      { peerId: this.data.peerId, bizType: this.data.bizType, bizId: this.data.bizId || 0 },
      { silent: true }
    ).then((res) => {
      this.setData({ conversationId: Number((res && res.conversationId) || 0) });
      return res;
    });
  },

  applyPeer(conv) {
    if (!conv) return;
    const nickname = conv.peerNickname || this.data.peerNickname;
    this.setData({
      peerId: Number(conv.peerId || this.data.peerId),
      peerNickname: nickname,
      peerInitial: nickname.slice(0, 1),
      peerAvatarUrl: adapter.fullUrl(conv.peerAvatar),
      pageTitle: nickname
    });
  },

  applyFatal(err) {
    const code = err && err.code;
    this.stopPoll();
    if (code === 403) {
      this.setData({
        loading: false,
        // 透出后端原因（如「私单只能由发布者发起会话」），比通用文案更有用
        fatalError: '无法打开会话',
        fatalDesc: (err && err.message) || '只有会话参与者才能查看消息',
        canRetry: false
      });
      return;
    }
    if (code === 404) {
      this.setData({
        loading: false,
        fatalError: '会话不存在',
        fatalDesc: '可能已被删除',
        canRetry: false
      });
      return;
    }
    // 网络/后端异常：给重试
    this.setData({
      loading: false,
      fatalError: '打开会话失败',
      fatalDesc: (err && err.message) || '请检查网络后重试',
      canRetry: true
    });
  },

  onRetryInit() {
    this.init();
  },

  onBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/chat/list' });
  },

  /** 业务卡片：商品给封面/标题/价格/状态，代取给规格/取件地/报酬/状态 */
  loadContext() {
    const id = this.data.conversationId;
    if (!id) return;
    http
      .get('/api/conversations/' + id + '/context', {}, { silent: true })
      .then((ctx) => {
        if (!ctx) return;
        const s = ctx.bizSummary;
        let card = null;
        let bizTitleText = '关于代取订单';
        if (ctx.bizType === 'item' && s) {
          bizTitleText = s.title ? '关于《' + s.title + '》' : '关于商品';
          card = {
            jumpUrl: '/pages/item/detail?id=' + s.itemId,
            title: s.title || '商品',
            statusText: ITEM_STATUS_TEXT[s.status] || s.status || '',
            coverUrl: adapter.fullUrl(s.coverUrl),
            mainText: '¥' + util.formatPrice(s.price),
            subText: ''
          };
        } else if (ctx.bizType === 'errand' && s) {
          // 11-25 口径同大厅卡片：卡片摘要空间最紧，优先出具体地标
          const place = campus.shortPlace(s.pickupArea, s.pickupPlace);
          card = {
            jumpUrl: '/pages/errand/detail?id=' + s.orderId,
            title: '代取订单 #' + s.orderId,
            statusText: ERRAND_STATUS_TEXT[s.status] || s.status || '',
            coverUrl: '',
            mainText: '¥' + util.formatPrice(s.reward),
            subText: (SIZE_TEXT[s.itemSize] || '') + (place ? ' · ' + place : '')
          };
        } else if (ctx.bizType === 'errand') {
          card = null; // 记录不存在：bizSummary=null，只留标题
        } else if (ctx.bizType === 'item') {
          card = null;
        }
        this.setData({ bizCard: card, bizTitleText });
      })
      .catch(() => {
        // 卡片拉不到不阻塞聊天
      });
  },

  onBizTap() {
    const url = this.data.bizCard && this.data.bizCard.jumpUrl;
    if (!url) return;
    wx.navigateTo({ url, fail: () => util.toast('详情页打开失败') });
  },

  /** 首屏：afterId=0 拉最近一页（后端 DESC 取再升序返回） */
  loadMessages(isFirst) {
    const id = this.data.conversationId;
    if (!id) return Promise.resolve();
    const seq = (this._reqSeq = (this._reqSeq || 0) + 1);
    return http
      .get(
        '/api/conversations/' + id + '/messages',
        isFirst ? { afterId: 0, limit: FIRST_LIMIT } : { afterId: this.maxMessageId() },
        { silent: true }
      )
      .then((res) => {
        if (seq !== this._reqSeq) return null;
        const rows = (res && Array.isArray(res.list)) ? res.list : [];
        return this.appendMessages(rows, isFirst);
      });
  },

  maxMessageId() {
    const list = this.data.messages;
    let max = 0;
    for (let i = 0; i < list.length; i++) {
      const id = Number(list[i].messageId || 0);
      if (id > max) max = id;
    }
    return max;
  },

  /** 追加消息（含去重）+ 按需滚底 + 新的对方消息触发已读 */
  appendMessages(rows, isFirst) {
    const seen = {};
    this.data.messages.forEach((m) => {
      if (m.messageId) seen[m.messageId] = true;
    });
    const fresh = rows
      .map((raw) => raw)
      .filter((raw) => raw && raw.messageId && !seen[raw.messageId]);
    if (!fresh.length) return null;

    const base = this.data.messages.filter((m) => !m.pending);
    // 逐条顺序计算时间分隔：prev 指向上一条新气泡，首条指向最后一条已有消息
    let prev = base.length ? base[base.length - 1] : null;
    const bubbles = fresh.map((raw) => {
      const b = toBubble(raw, prev);
      prev = b;
      return b;
    });

    const hasPeerNew = fresh.some((raw) => !raw.isMine);
    const list = isFirst ? bubbles : this.data.messages.concat(bubbles);
    const lastKey = list.length ? list[list.length - 1].key : '';
    this.setData({
      messages: list,
      scrollAnchor: lastKey,
      isAtBottom: true
    });
    if (hasPeerNew) this.markRead();
    return list;
  },

  /** 已读：标记到最新，成功后同步全局角标 */
  markRead() {
    const id = this.data.conversationId;
    if (!id) return;
    const maxId = this.maxMessageId();
    const body = maxId ? { lastMessageId: maxId } : {};
    http
      .put('/api/conversations/' + id + '/read', body, { silent: true })
      .then(() => {
        const app = getApp();
        if (app && typeof app.refreshUnread === 'function') app.refreshUnread();
      })
      .catch(() => {});
  },

  // ---- 轮询 ----
  startPoll() {
    if (this._pollTimer || !this.data.conversationId) return;
    this._pollTimer = setInterval(() => this.pollTick(), POLL_INTERVAL);
  },

  stopPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  pollTick() {
    if (!this.data.conversationId) return;
    this.loadMessages(false);
  },

  // ---- 滚动位置 ----
  onScrollToUpper() {
    this.setData({ isAtBottom: false });
  },
  onScrollToLower() {
    this.setData({ isAtBottom: true });
  },

  // ---- 发送（乐观更新 + 失败重发） ----
  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  onSend() {
    const content = String(this.data.input || '').trim();
    if (!content) {
      util.toast('不能发送空消息');
      return;
    }
    if (content.length > 500) {
      util.toast('消息不能超过 500 字');
      return;
    }
    const tempId = 'tmp' + new Date().getTime() + Math.floor(Math.random() * 1000);
    const bubble = {
      key: tempId,
      tempId: tempId,
      messageId: 0,
      isMine: true,
      content: content,
      isImage: false,
      imageUrl: '',
      timeText: dividerTime(new Date()),
      showTime: this.needDivider(),
      pending: true,
      failed: false,
      _ts: Date.now()
    };
    this.setData({
      input: '', // 立即清空：草稿已进入气泡，失败可点重发（不丢内容）
      messages: this.data.messages.concat([bubble]),
      scrollAnchor: bubble.key,
      isAtBottom: true
    });
    this.requestSend(tempId, content);
  },

  /** 最后一条真实消息与 pending 气泡间隔超过 5 分钟才再显示时间 */
  needDivider() {
    const list = this.data.messages;
    const last = list[list.length - 1];
    if (!last) return true;
    return Date.now() - (last._ts || 0) > TIME_GAP;
  },

  requestSend(tempId, content, msgType) {
    const id = this.data.conversationId;
    if (!id || this.data.sending) {
      this.markPending(tempId, false, '发送失败');
      return;
    }
    this.setData({ sending: true });
    http
      .post('/api/conversations/' + id + '/messages', { content, msgType: msgType || 'text' }, { silent: true })
      .then((res) => {
        this.setData({ sending: false });
        this.resolvePending(tempId, res || {});
      })
      .catch((err) => {
        this.setData({ sending: false });
        this.markPending(tempId, false, (err && err.message) || '发送失败');
      });
  },

  /** 乐观气泡替换为真实消息（msgType 跟随气泡：文本/图片） */
  resolvePending(tempId, res) {
    const list = this.data.messages.map((m) => {
      if (m.tempId !== tempId) return m;
      const real = toBubble(
        {
          messageId: res.messageId,
          senderId: wxMe(),
          msgType: m.isImage ? 'image' : 'text',
          content: m.content,
          createdAt: res.createdAt,
          isMine: true
        },
        null
      );
      // showTime 保持乐观气泡的判断，不重算
      real.showTime = m.showTime;
      return real;
    });
    const lastKey = list.length ? list[list.length - 1].key : '';
    this.setData({ messages: list, scrollAnchor: lastKey });
  },

  /** 失败标红；点击可重发 */
  markPending(tempId, ok, toastText) {
    if (toastText) util.toast(toastText);
    const list = this.data.messages.map((m) =>
      m.tempId === tempId ? Object.assign({}, m, { pending: false, failed: !ok }) : m
    );
    this.setData({ messages: list });
  },

  onTapFailed(e) {
    const tempId = e.currentTarget.dataset.temp;
    const target = this.data.messages.filter((m) => m.tempId === tempId)[0];
    if (!target || !target.failed) return;
    this.setData({
      messages: this.data.messages.map((m) =>
        m.tempId === tempId ? Object.assign({}, m, { pending: true, failed: false }) : m
      )
    });
    if (target.isImage) {
      // 图片消息重发：已上传成功的直接重发 URL，没传完的从本地临时文件重新上传
      if (target._uploadedUrl) this.requestSend(tempId, target._uploadedUrl, 'image');
      else this.uploadImage(tempId, target._tempPath);
      return;
    }
    this.requestSend(tempId, target.content);
  },

  /** 图片气泡点击 → 全屏预览（用例 27；失败态不预览，走重发） */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({
      current: url,
      urls: [url],
      fail: () => util.toast('图片预览失败')
    });
  },

  // ---- 图片加载兜底（11-26）----
  // 真机上 src 不可达（回环地址 / 网络切换 / 服务未启动）时，<image> 只会留
  // 一块 240rpx 的空白泡。binderror 触发后降级为「点击重试」占位：
  //   1) 刚发的图优先回退本地临时文件（一定还能显示）；
  //   2) 服务端图加时间戳破缓存原地重试，避开失败结果的磁盘缓存。

  /** <image> binderror：按气泡 key 标记降级 */
  onImgError(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const list = this.data.messages;
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === key && !list[i].imgError) {
        this.setData({ ['messages[' + i + '].imgError']: true });
        return;
      }
    }
  },

  /** 占位点击重试 */
  onImgRetry(e) {
    const key = e.currentTarget.dataset.key;
    const list = this.data.messages;
    const idx = list.findIndex((m) => m.key === key);
    if (idx < 0 || !list[idx].isImage) return;
    const m = list[idx];
    if (m._tempPath && m.imageUrl !== m._tempPath) {
      this.setData({
        ['messages[' + idx + '].imageUrl']: m._tempPath,
        ['messages[' + idx + '].imgError']: false
      });
      return;
    }
    const src = m.imageUrl || '';
    if (!src) {
      util.toast('图片地址为空，无法加载');
      return;
    }
    const bust = src + (src.indexOf('?') > -1 ? '&' : '?') + 'r=' + Date.now();
    this.setData({
      ['messages[' + idx + '].imgError']: false,
      ['messages[' + idx + '].imageUrl']: bust
    });
  },

  // ---- 键盘（11-26）：页面不再整体上推，输入条按键盘实高垫底 ----

  onKbHeight(e) {
    const h = (e.detail && e.detail.height) || 0;
    if (h === this.data.keyboardHeight) return;
    this.setData({ keyboardHeight: h });
  },

  // ---- 图片消息（11-24 补齐用例 27：选图 → 上传 → 发送） ----

  onPickImage() {
    if (this.data.sending) return;
    if (!this.data.conversationId) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const filePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (filePath) this.sendImage(filePath);
      }
    });
  },

  /** 图片消息乐观气泡：先显示本地临时图，上传成功后换服务端 URL */
  sendImage(filePath) {
    const tempId = 'tmp' + new Date().getTime() + Math.floor(Math.random() * 1000);
    const bubble = {
      key: tempId,
      tempId: tempId,
      messageId: 0,
      isMine: true,
      content: '',
      isImage: true,
      imageUrl: filePath,
      timeText: dividerTime(new Date()),
      showTime: this.needDivider(),
      pending: true,
      failed: false,
      _ts: Date.now(),
      _tempPath: filePath,
      _uploadedUrl: ''
    };
    this.setData({
      messages: this.data.messages.concat([bubble]),
      scrollAnchor: bubble.key,
      isAtBottom: true
    });
    this.uploadImage(tempId, filePath);
  },

  /** 上传图片 → /uploads/ 相对路径 → 发送 msgType=image */
  uploadImage(tempId, filePath) {
    const id = this.data.conversationId;
    if (!id || this.data.sending) {
      this.markPending(tempId, false, '发送失败');
      return;
    }
    this.setData({ sending: true });
    http
      .upload(filePath)
      .then((res) => {
        const url = res && res.url;
        if (!url) throw { message: '上传失败' };
        // 记录已上传 URL：发送阶段失败重发时不用重新上传
        this.setData({
          sending: false,
          messages: this.data.messages.map((m) =>
            m.tempId === tempId
              ? Object.assign({}, m, { content: url, imageUrl: adapter.fullUrl(url), _uploadedUrl: url })
              : m
          )
        });
        this.requestSend(tempId, url, 'image');
      })
      .catch((err) => {
        this.setData({ sending: false });
        this.markPending(tempId, false, (err && err.message) || '上传失败');
      });
  },

  onLongPressMsg(e) {
    const content = e.currentTarget.dataset.content;
    if (!content) return;
    util.copy(content, '已复制');
  },

  noop() {}
});
