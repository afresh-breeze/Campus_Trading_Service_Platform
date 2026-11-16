/**
 * place-picker 组件冒烟（stub Component，直跑组件逻辑）
 * 运行：node smoke_place_picker.js（cwd 必须在仓库根）
 */
const path = require('path');
const Module = require('module');

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

let compCfg = null;
global.Component = (cfg) => {
  compCfg = cfg;
};
// 组件不 require request，无需拦截

require(path.join(process.cwd(), 'miniprogram/components/place-picker/index.js'));

function makeComp(props) {
  // methods/observers 展开到顶层，让 this.applyZone / observers.visible 可直接调用
  const inst = Object.assign({}, compCfg, compCfg.methods, compCfg.observers);
  inst.data = JSON.parse(JSON.stringify(compCfg.data));
  Object.keys(props || {}).forEach((k) => {
    inst.data[k] = props[k];
  });
  inst.setData = function (patch) {
    Object.keys(patch).forEach((k) => {
      if (k.indexOf('.') > -1) {
        const parts = k.split('.');
        let cur = this.data;
        for (let i = 0; i < parts.length - 1; i += 1) cur = cur[parts[i]];
        cur[parts[parts.length - 1]] = patch[k];
      } else {
        this.data[k] = patch[k];
      }
    });
  };
  inst._events = [];
  inst.triggerEvent = function (name, detail) {
    this._events.push({ name, detail });
  };
  return inst;
}
const ev = (v) => ({ detail: { value: v } });
const tap = (dataset) => ({ currentTarget: { dataset } });

(async () => {
  console.log('[1] 打开同步外部值');
  const c = makeComp({ visible: false, zone: '北区教学区', place: '第25教学楼' });
  c.setData({ visible: true });
  c.visible(true);
  check('分类跟随片区', c.data.cat === '教学区', c.data.cat);
  check('片区列表 = 南北教学区', JSON.stringify(c.data.zoneList) === JSON.stringify(['北区教学区', '南区教学区']), c.data.zoneList);
  check('地标回填', c.data.place === '第25教学楼', c.data.place);
  check('搜索已重置', c.data.keyword === '' && c.data.results.length === 0);
  check('预览带楼名', c.data.previewText === '北区教学区 · 第25教学楼', c.data.previewText);
  check('可直接确认', c.data.canConfirm === true, c.data.canConfirm);

  console.log('\n[2] 搜索（正式名 + 别名）');
  c.onKeyword(ev('25教'));
  check('搜「25教」命中', c.data.results.length > 0 && c.data.results[0].name === '第25教学楼', c.data.results.map((r) => r.name));
  c.onKeyword(ev('兰华楼'));
  check('搜别名「兰华楼」命中第2教学楼', c.data.results.length > 0 && c.data.results[0].name === '第2教学楼', c.data.results.map((r) => r.name));
  c.onKeyword(ev('田家炳'));
  check('搜别名「田家炳」命中第11教学楼', c.data.results.length > 0 && c.data.results[0].name === '第11教学楼', c.data.results.map((r) => r.name));
  c.onKeyword(ev('不存在的大楼xyz'));
  check('无命中为空', c.data.results.length === 0);
  c.onClearKeyword();
  check('清空关键字恢复浏览模式', c.data.keyword === '' && c.data.results.length === 0);

  console.log('\n[3] 浏览选择');
  c.onCatTap(tap({ cat: '宿舍园' }));
  check('切分类更新片区列表', c.data.cat === '宿舍园' && c.data.zoneList.length === 8, c.data.zoneList.length);
  c.onZoneTap(tap({ zone: '桃园' }));
  check('桃园无地标 → 直接可确认', c.data.places.length === 0 && c.data.canConfirm === true, { p: c.data.places.length, ok: c.data.canConfirm });
  check('桃园预览不带「全区」尾巴', c.data.previewText === '桃园', c.data.previewText);
  c.onConfirm();
  check('confirm 事件带 zone/place', c._events.length === 1 && c._events[0].name === 'confirm' && c._events[0].detail.zone === '桃园' && c._events[0].detail.place === '', c._events);

  // 有地标片区：placeRequired=true（发布页）必须选到楼
  const c2 = makeComp({ visible: true, placeRequired: true });
  c2.visible(true);
  c2.onZoneTap(tap({ zone: '北区教学区' }));
  check('教学区地标已载入', c2.data.places.length === 27, c2.data.places.length);
  check('placeRequired 未选楼不可确认', c2.data.canConfirm === false, c2.data.canConfirm);
  c2.onConfirm();
  check('不可确认时 confirm 不发出', c2._events.length === 0, c2._events);
  c2.onPlaceTap(tap({ place: '第1教学楼' }));
  check('选楼后可确认', c2.data.canConfirm === true && c2.data.place === '第1教学楼', c2.data);
  check('预览 = 片区 · 楼名', c2.data.previewText === '北区教学区 · 第1教学楼', c2.data.previewText);

  // placeRequired=false（找跑腿页）：教学区不选楼 = 全片区，也可确认
  const c3 = makeComp({ visible: true, placeRequired: false });
  c3.visible(true);
  c3.onZoneTap(tap({ zone: '北区教学区' }));
  check('placeRequired=false 未选楼可确认', c3.data.canConfirm === true, c3.data.canConfirm);
  check('全区预览', c3.data.previewText === '北区教学区 · 全区', c3.data.previewText);
  c3.onConfirm();
  check('全区 confirm place 为空', c3._events.length === 1 && c3._events[0].detail.place === '', c3._events);

  console.log('\n[4] 搜索直选');
  c2.onKeyword(ev('圆顶'));
  check('搜「圆顶」命中活动中心', c2.data.results.length > 0 && c2.data.results[0].name === '圆顶学生活动中心', c2.data.results.map((r) => r.name));
  c2.onPickHit(tap({ zone: c2.data.results[0].zone, place: c2.data.results[0].name }));
  check('直选后搜索态清空', c2.data.keyword === '' && c2.data.results.length === 0, c2.data.keyword);
  check('直选回填片区与地标', c2.data.zone === '北区其他' && c2.data.place === '圆顶学生活动中心', { z: c2.data.zone, p: c2.data.place });
  check('直选后分类跟随', c2.data.cat === '其他', c2.data.cat);
  c2.onConfirm();
  check('confirm detail 完整', c2._events.length === 1 && c2._events[0].detail.zone === '北区其他', c2._events);

  console.log('\n[5] 关闭');
  c2.onMaskTap();
  c2.onCancel();
  check('遮罩与 ✕ 都走 close', c2._events.filter((e) => e.name === 'close').length === 2, c2._events);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('脚本异常：', e && e.stack);
  process.exit(1);
});
