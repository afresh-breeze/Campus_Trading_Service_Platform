// 商品卡片（B 成员：公共层）
// 二手列表、我的发布、我的收藏、首页推荐共用。
// 字段口径严格对齐后端 items / item_images / users：
//   itemId / title / price / originalPrice / conditionLevel / status
//   coverUrl（item_images 第一张）/ location（items.location）/ sellerNickname
// 字段缺失时降级显示，不报错、不出现 undefined。
// 枚举严格对齐 database/schema.sql：items.condition_level ENUM('new','like_new','good','fair')
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
    mode: { type: String, value: 'grid' }
  },

  data: {
    cover: '',
    priceText: '',
    originText: '',
    conditionText: '',
    placeText: ''
  },

  observers: {
    item(item) {
      if (!item) return;
      const price = Number(item.price || 0);
      const origin = Number(item.originalPrice || 0);

      this.setData({
        cover: item.coverUrl || '',
        priceText: price ? price.toFixed(price % 1 === 0 ? 0 : 2) : '面议',
        // 原价只在明显高于现价时显示，避免出现原价等于现价的噪声
        originText: origin > price ? '¥' + origin.toFixed(origin % 1 === 0 ? 0 : 2) : '',
        conditionText: CONDITION_TEXT[item.conditionLevel] || item.conditionLevel || '',
        // 地点取 items.location（schema 唯一地点列），不是已废弃的 campus
        placeText: item.location || ''
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
