// 地点选择弹层（B 成员，11-15，用户反馈第 3 条）
// ------------------------------------------------------------------
// 替代发布页/找跑腿页原来的三级 picker：搜索 + 分类横滑 + 片区网格 + 具体地标。
// 数据唯一来源 utils/campus.js（25 片区 / 52 地标），不在这里维护任何地名。
//
// 交互约定：
//   · 搜索命中（正式名或别名）→ 点一下直接选中并回填；
//   · 无搜索词时：选片区 → 该片区有下级地标则必须点一个地标（后端 pickupPlace 必填，
//     教学区传「北区教学区」本身不合法）；无下级地标（宿舍园/图书馆…）= 片区即地标；
//   · 「确定」才 emit confirm，点遮罩/✕ 走 close，不丢外部已选值。
const campus = require('../../utils/campus');

const ZONE_CAT = {};
campus.ZONES.forEach((z) => {
  ZONE_CAT[z.name] = z.category;
});

Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '选择取件地点' },
    zone: { type: String, value: '' },
    place: { type: String, value: '' },
    /**
     * 有下级地标的片区是否必须选到楼：
     *   true  = 发布页（后端 pickupPlace 必填，且「北区教学区」本身不是合法地标）
     *   false = 找跑腿页（place 省略 = 全片区，后端 servicePlaces 匹配口径允许）
     */
    placeRequired: { type: Boolean, value: false }
  },

  data: {
    categories: campus.CATEGORIES,
    cat: campus.CATEGORIES[0],
    zoneList: [],
    places: [],
    keyword: '',
    results: [],
    previewText: '',
    canConfirm: false,
    /** 级联入场计数器：奇偶交替切换动画名（pp-anim-0/1）触发重放；
        只驱动被点层级的下一级——点分类 zTick++（片区入场），点片区 pTick++（地标入场） */
    zTick: 0,
    pTick: 0
  },

  observers: {
    /** 每次打开都同步外部值，重置搜索，避免上一次的选择残留 */
    visible(open) {
      if (!open) return;
      const zone = this.data.zone || '';
      const patch = this.applyZone(zone, this.data.place || '');
      patch.keyword = '';
      patch.results = [];
      patch.cat = ZONE_CAT[zone] || campus.CATEGORIES[0];
      patch.zTick = this.data.zTick + 1;
      patch.pTick = this.data.pTick + 1;
      this.setData(patch);
    }
  },

  methods: {
    /** 挡住冒泡，防止点面板内部触发遮罩关闭 */
    noop() {},

    onMaskTap() {
      this.triggerEvent('close');
    },

    onCancel() {
      this.triggerEvent('close');
    },

    onKeyword(e) {
      const kw = String(e.detail.value || '').trim();
      if (!kw) {
        this.setData({ keyword: '', results: [] });
        return;
      }
      this.setData({ keyword: kw, results: campus.searchLandmarks(kw, 20) });
    },

    onClearKeyword() {
      this.setData({ keyword: '', results: [] });
    },

    onCatTap(e) {
      const cat = e.currentTarget.dataset.cat;
      // 点一级：只有二级（片区）重新入场，一级菜单与三级不重放
      this.setData({
        cat,
        zoneList: campus.zonesByCategory()[cat] || [],
        zTick: this.data.zTick + 1
      });
    },

    onZoneTap(e) {
      const zone = e.currentTarget.dataset.zone;
      const patch = this.applyZone(zone, '');
      // 点二级：只有三级（地标）重新入场，一级/二级不重放
      patch.pTick = this.data.pTick + 1;
      this.setData(patch);
    },

    onPlaceTap(e) {
      const place = e.currentTarget.dataset.place;
      if (!this.data.zone) return;
      this.setData({
        place,
        previewText: campus.displayArea(this.data.zone, place),
        canConfirm: true
      });
    },

    /** 搜索结果直选：跨分类跳转，片区与地标一并刷新（各自入场一次） */
    onPickHit(e) {
      const zone = e.currentTarget.dataset.zone;
      const place = e.currentTarget.dataset.place;
      const patch = this.applyZone(zone, place);
      patch.keyword = '';
      patch.results = [];
      patch.zTick = this.data.zTick + 1;
      patch.pTick = this.data.pTick + 1;
      this.setData(patch);
    },

    onConfirm() {
      if (!this.data.canConfirm) return;
      this.triggerEvent('confirm', { zone: this.data.zone, place: this.data.place });
    },

    /**
     * 切片区后的统一状态：
     *   · 有下级地标 → place 只有在列表里才保留，否则清空（片区名本身不是合法地标）；
     *   · 无下级地标 → place 置空（预览走「片区 · 全区」，落库时由页面传片区名）。
     */
    applyZone(zone, place) {
      const places = campus.placesOfZone(zone);
      const p = places.length ? (places.indexOf(place) > -1 ? place : '') : '';
      // cat 必须跟着 zone 走：搜索直选跨分类跳转时，tab 高亮与片区列表要一致
      const cat = ZONE_CAT[zone] || this.data.cat;
      return {
        zone,
        cat,
        places,
        place: p,
        zoneList: campus.zonesByCategory()[cat] || [],
        previewText: zone ? campus.displayArea(zone, p) : '',
        // placeRequired=true（发布页）时，有下级地标的片区必须选到楼
        canConfirm:
          !!zone && (!this.data.placeRequired || places.length === 0 || !!p)
      };
    }
  }
});
