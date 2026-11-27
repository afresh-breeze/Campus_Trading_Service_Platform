/**
 * item-card 组件冒烟测试（临时脚本，stub 掉 Component）
 * 运行：node smoke_item_card.js   （cwd 必须在仓库根）
 */
const path = require('path');
const REPO = process.cwd();
const MP = path.join(REPO, 'miniprogram');

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log('  PASS  ' + name);
  } else {
    fail += 1;
    console.log('  FAIL  ' + name + (extra === undefined ? '' : ' -> ' + JSON.stringify(extra)));
  }
}

let cfg = null;
global.Component = (c) => {
  cfg = c;
};

require(path.join(MP, 'components/item-card/index.js'));

const observer = cfg.observers['item, showTime'];
if (typeof observer !== 'function') {
  console.error('observers 未监听 item, showTime');
  process.exit(1);
}

function makeInst() {
  const inst = {
    data: JSON.parse(JSON.stringify(cfg.data)),
    setData(patch) {
      Object.assign(this.data, patch);
    },
    events: [],
    triggerEvent(name, detail) {
      this.events.push({ name, detail });
    }
  };
  return inst;
}
function run(raw, showTime) {
  const inst = makeInst();
  observer.call(inst, raw, showTime);
  return inst;
}

const HOUR = 3600 * 1000;
function iso(offsetMs) {
  // 必须保留秒：截断成 :00 会让 10s 前的用例随当前秒数漂移成「1 分钟前」（假红）
  const d = new Date(Date.now() - offsetMs);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  );
}

const baseItem = {
  itemId: 1001,
  title: '高数上册',
  price: 18,
  originalPrice: 30,
  firstImage: '/uploads/b1.jpg',
  conditionLevel: 'like_new',
  location: '桃园',
  status: 'on_sale',
  createdAt: '2026-11-15 10:00:00'
};

console.log('[1] 默认不传 showTime：与改动前完全一致');
const d1 = run(baseItem, false);
check('timeText 为空', d1.data.timeText === '', d1.data.timeText);
check('封面 from firstImage', /\/uploads\/b1\.jpg/.test(d1.data.cover), d1.data.cover);
check('价格 18', d1.data.priceText === '18', d1.data.priceText);
check('原价高于现价才显示', d1.data.originText === '¥30', d1.data.originText);
check('成色文案', d1.data.conditionText === '几乎全新', d1.data.conditionText);
check('地点', d1.data.placeText === '桃园', d1.data.placeText);

console.log('[2] showTime=true：相对时间（只显示时间本身）');
const now = run(Object.assign({}, baseItem, { createdAt: iso(10 * 1000) }), true);
check('刚发布 → 刚刚', now.data.timeText === '刚刚', now.data.timeText);
const h3 = run(Object.assign({}, baseItem, { createdAt: iso(3 * HOUR) }), true);
check('3 小时前', h3.data.timeText === '3 小时前', h3.data.timeText);
const yd = run(Object.assign({}, baseItem, { createdAt: iso(30 * HOUR) }), true);
check('昨天', yd.data.timeText === '昨天', yd.data.timeText);
const old = run(Object.assign({}, baseItem, { createdAt: iso(10 * 24 * HOUR) }), true);
check('超过 7 天 → MM-DD', /^\d{2}-\d{2}$/.test(old.data.timeText), old.data.timeText);
check('文案不含「发布」二字', old.data.timeText.indexOf('发布') < 0 && h3.data.timeText.indexOf('发布') < 0);

console.log('[3] 边界：createdAt 缺失 / showTime 后到');
const miss = run(Object.assign({}, baseItem, { createdAt: undefined }), true);
check('无 createdAt → 空串（不出现 undefined）', miss.data.timeText === '', miss.data.timeText);
// item 先到、showTime 后到：观察器同时监听两字段，第二次触发要能补上时间
const late = makeInst();
observer.call(late, baseItem, false);
check('先 item 后 showTime：初始为空', late.data.timeText === '');
observer.call(late, baseItem, true);
check('showTime 后到能补出时间', late.data.timeText !== '', late.data.timeText);

console.log('[4] 其他字段不受 showTime 影响');
const wt = run(baseItem, true);
check('价格不变', wt.data.priceText === '18', wt.data.priceText);
check('原价不变', wt.data.originText === '¥30', wt.data.originText);
check('成色不变', wt.data.conditionText === '几乎全新');
check('地点不变', wt.data.placeText === '桃园');
check('封面不变', /b1\.jpg/.test(wt.data.cover));

console.log('[5] 面议与无原价降级');
const cheap = run({ itemId: 2, title: '赠品', price: 0, originalPrice: null, createdAt: iso(1000) }, true);
check('价格 0 → 面议', cheap.data.priceText === '面议', cheap.data.priceText);
check('无原价 → 空串', cheap.data.originText === '', cheap.data.originText);

console.log('[6] tap 事件带 itemId');
const tapInst = run(baseItem, true);
tapInst.data.item = baseItem;
cfg.methods.onTap.call(tapInst);
check('triggerEvent tap + itemId', tapInst.events.length === 1 && tapInst.events[0].detail.itemId === 1001, tapInst.events);

console.log('[7] WXML 门闸：仅 list 模式渲染时间');
const fs = require('fs');
const wxml = fs.readFileSync(path.join(MP, 'components/item-card/index.wxml'), 'utf8');
check('时间节点带 list 模式判断', /wx:if="\{\{mode === 'list' && timeText\}\}"/.test(wxml), 'wxml 未见 list 门闸');
check('meta--empty 兼容仅有时间的情况', /conditionText \|\| placeText \|\| \(mode === 'list' && timeText\)/.test(wxml), 'meta--empty 条件未含 timeText');
const wxss = fs.readFileSync(path.join(MP, 'components/item-card/index.wxss'), 'utf8');
check('时间样式 22rpx + text-3', /\.card__time[\s\S]*?font-size: 22rpx[\s\S]*?color: var\(--color-text-3/.test(wxss), '样式不符');
check('卡片按压只压暗不缩放（11-25 方案二：scale 与视差同帧最伤）',
  /\.card--hover\s*\{[^}]*opacity:\s*0\.94/.test(wxss) && !/\.card--hover\s*\{[^}]*scale\(/.test(wxss), '按压口径不符');

console.log('\n[ ] 无封面占位：线条图案稳定随机（11-26 定稿）');
const phCompJs = fs.readFileSync(path.join(MP, 'components/item-card/index.js'), 'utf8');
check('组件接 placeholder.pick（itemId 稳定随机）', /require\('\.\.\/\.\.\/utils\/placeholder'\)/.test(phCompJs) && /placeholder\.pick\(item\.itemId\)/.test(phCompJs) && /placeholder: item\.coverUrl \? '' : placeholder\.pick/.test(phCompJs));
check('wxml 无封面分支渲染占位图（不再「暂无图片」灰框）', wxml.indexOf('{{placeholder}}"') > -1 && wxml.indexOf('card__img--empty') < 0);
check('占位图资源齐备（7 张全部存在）', [1, 2, 3, 4, 5, 6, 7].every((n) => fs.existsSync(path.join(MP, 'assets/placeholder/ph-' + n + '.png'))));
// 占位缩小版（11-27 对齐代取侧）：插画约 1/3 居中 + 50% 透明 + 「暂无图片」小字
check('wxml 无封面走占位分支（插画 + 小字，有封面仍满铺）', /wx:if="\{\{cover\}\}" class="card__img"/.test(wxml) && /wx:else class="card__ph"/.test(wxml) && /class="card__ph-img" src="\{\{placeholder\}\}"/.test(wxml) && />暂无图片</.test(wxml));
check('wxss 占位插画 50% 透明 + 按模式 1/3 尺寸（grid 106 / list 66）', /card__ph-img\s*\{[^}]*opacity: 0\.5;/.test(wxss) && /card--grid \.card__ph-img\s*\{[^}]*width: 106rpx;/.test(wxss) && /card--list \.card__ph-img\s*\{[^}]*width: 66rpx;/.test(wxss));
check('wxss 占位小字 18rpx + 居中容器', /card__ph\s*\{[^}]*align-items: center/.test(wxss) && /card__ph-cap\s*\{[^}]*font-size: 18rpx;/.test(wxss));

// 二手商品详情页无图占位（11-27 对齐代取详情页：插画约 1/3 居中 + 50% 透明 + 小字）
console.log('\n[ ] 二手详情页无图占位（对齐代取详情）');
const itemDetailWxml = fs.readFileSync(path.join(MP, 'pages/item/detail.wxml'), 'utf8');
const itemDetailWxss = fs.readFileSync(path.join(MP, 'pages/item/detail.wxss'), 'utf8');
const itemDetailJs = fs.readFileSync(path.join(MP, 'pages/item/detail.js'), 'utf8');
check('详情 js 引占位模块并始终生成 galleryPlaceholder（加载失败也复用）', /require\('\.\.\/\.\.\/utils\/placeholder'\)/.test(itemDetailJs) && /galleryPlaceholder: placeholder\.pick\(item\.itemId\)/.test(itemDetailJs));
check('详情 applyDetail 把 galleryPlaceholder 写进页面 data（关键：只算不写 wxml 拿不到）', /galleryPlaceholder: view\.galleryPlaceholder/.test(itemDetailJs) && /galleryPlaceholder: ''/.test(itemDetailJs));
check('详情 wxml 无图走占位分支（插画 + 小字，有图走轮播）', /wx:if="\{\{images\.length\}\}"/.test(itemDetailWxml) && /wx:else class="gallery__ph"/.test(itemDetailWxml) && /class="gallery__ph-img" src="\{\{galleryPlaceholder\}\}"/.test(itemDetailWxml) && />暂无图片</.test(itemDetailWxml));
check('详情 wxml 图片加载失败也走同款插画占位（不再只有文字）', /wx:else class="gallery__ph">\s*<image class="gallery__ph-img"/.test(itemDetailWxml) && itemDetailWxml.indexOf('gallery__empty') === -1);
check('详情 wxss 占位插画 172rpx（520 的约 1/3）+ 50% 透明 + 22rpx 小字', /gallery__ph-img\s*\{[^}]*width: 172rpx;[^}]*opacity: 0\.5;/.test(itemDetailWxss) && /gallery__ph-cap\s*\{[^}]*font-size: 22rpx;/.test(itemDetailWxss));

console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
