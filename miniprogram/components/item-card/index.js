// 商品卡片（B 成员：公共层）
// 二手列表、我的发布、我的收藏、首页推荐共用。
// 字段口径：组件对外只认 coverUrl，**由 utils/adapter.js 统一转换**。
// 后端商品卡片返回的是 firstImage，不是 coverUrl；页面必须传 adapter.toItem() 的结果进来。
// 不要在页面里手写 item.coverUrl = raw.firstImage —— 转换只有 adapter 一处，
// 否则后端再次改名时又要全量翻页。
// 字段缺失时降级显示，不报错、不出现 undefined。
// 枚举严格对齐 database/schema.sql：items.condition_level ENUM('new','like_new','good','fair')
const adapter = require('../../utils/adapter');
const util = require('../../utils/util');

const CONDITION_TEXT = {
  new: '全新',
  like_new: '几乎全新',
  good: '成色良好',
  fair: '有使用痕迹'
};

Component({
  properties: {
    item: { type: Object, value: {} },
    // grid：两列瀑布流卡片；list：单列横向卡片（我的发布/收藏）
    mode: { type: String, value: 'grid' },
    // list 模式可选：显示商品 createdAt 的相对时间（「刚刚」「3 小时前」「昨天」「11-05」）。
    // 默认 false，我的发布/收藏等既有页面不受影响；二手首页传 show-time="{{true}}"。
    // 只做展示，不加「发布」前缀；grid 模式不渲染（网格卡高度已按走查记录 #1 对齐，不能再变）
    showTime: { type: Boolean, value: false }
  },

  data: {
    cover: '',
    priceText: '',
    originText: '',
    conditionText: '',
    placeText: '',
    timeText: ''
  },

  observers: {
    // 两个字段都要监听：showTime 可能在 item 之后才传进来
    'item, showTime': function (raw, showTime) {
      if (!raw) return;
      // 双保险：即使页面漏了 adapter，这里也能拿到 firstImage
      const item = adapter.toItem(raw);
      const price = item.price;
      const origin = Number(item.originalPrice || 0);

      this.setData({
        cover: item.coverUrl || '',
        priceText: price ? price.toFixed(price % 1 === 0 ? 0 : 2) : '面议',
        // 原价只在明显高于现价时显示，避免出现原价等于现价的噪声
        originText: origin > price ? '¥' + origin.toFixed(origin % 1 === 0 ? 0 : 2) : '',
        conditionText: CONDITION_TEXT[item.conditionLevel] || item.conditionLevel || '',
        // 地点取 items.location（schema 唯一地点列），不是已废弃的 campus
        placeText: item.location || '',
        // createdAt 由 adapter.toItem() 带出；缺失时 fromNow 返回空串，不出现 undefined
        timeText: showTime ? util.fromNow(item.createdAt) : ''
      });
    }
  },

  methods: {
    onTap() {
      const id = this.data.item && this.data.item.itemId;
      if (!id) return;
      this.triggerEvent('tap', { itemId: id });
    }
  }
});
