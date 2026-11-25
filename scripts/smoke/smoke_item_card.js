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

console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
