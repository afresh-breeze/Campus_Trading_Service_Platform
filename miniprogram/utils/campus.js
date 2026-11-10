/**
 * 校园片区与地标（B 成员：公共层）
 * ------------------------------------------------------------------
 * 唯一口径来源：docs/A成员开发计划与Git协作手册.md §11.9
 * 三级模型：分类（选择器分组）→ 片区（落库匹配单位）→ 地标（受控名称，不建表）
 *
 * 硬约定（改这里之前先读这段）：
 * 1. 只有 25 个片区，不能自行增删；片区名就是落库值，直接写 pickupArea / service_areas。
 * 2. 只有教学区和其他片区细分到单体楼，其余片区选中片区即视为地标 = 片区名。
 * 3. 地标存中文正式名，不存 id，与后端 service_places / pickupPlace 的字符串口径一致。
 * 4. 别名只用于搜索，不改变正式名，也不落库。
 * 5. 修改清单时，手册 11.9、本文件、后端 server/utils/campus.js 三处同步。
 */

/** 分类（选择器分组标题，不落库） */
const CATEGORIES = ['宿舍园', '教学区', '图书馆', '运动场', '校医院', '校外', '其他'];

/** 25 个固定片区：zone -> category */
const ZONES = [
  { name: '桃园', category: '宿舍园' },
  { name: '李园', category: '宿舍园' },
  { name: '橘园', category: '宿舍园' },
  { name: '楠园', category: '宿舍园' },
  { name: '梅园', category: '宿舍园' },
  { name: '竹园', category: '宿舍园' },
  { name: '杏园', category: '宿舍园' },
  { name: '茶园', category: '宿舍园' },

  { name: '北区教学区', category: '教学区' },
  { name: '南区教学区', category: '教学区' },

  { name: '中心图书馆', category: '图书馆' },
  { name: '北区图书馆', category: '图书馆' },
  { name: '南区图书馆', category: '图书馆' },

  { name: '第一运动场', category: '运动场' },
  { name: '第二运动场', category: '运动场' },
  { name: '第三运动场', category: '运动场' },
  { name: '第四运动场', category: '运动场' },
  { name: '第五运动场', category: '运动场' },

  { name: '北区校医院', category: '校医院' },
  { name: '南区校医院', category: '校医院' },

  { name: '一号门外/吾悦广场', category: '校外' },
  { name: '二号门外', category: '校外' },
  { name: '校外其他', category: '校外' },

  { name: '北区其他', category: '其他' },
  { name: '南区其他', category: '其他' }
];

/**
 * 52 条地标：{ name, zone, aliases }
 * 别名用于搜索与联想，不参与落库比对。
 */
const LANDMARKS = [
  // ---------------- 北区教学区（27）----------------
  { name: '第1教学楼', zone: '北区教学区', aliases: ['1教', '一教', '雨僧楼', '文学院'] },
  { name: '第2教学楼', zone: '北区教学区', aliases: ['2教', '二教', '兰华楼', '西塔学院'] },
  { name: '第3教学楼', zone: '北区教学区', aliases: ['3教', '三教', '绩镛楼', '国家治理学院', '马克思主义学院', '马院'] },
  { name: '第4教学楼（A/B栋）', zone: '北区教学区', aliases: ['4教', '四教', '咏修楼A/B栋', '新闻传媒学院', '新闻学院'] },
  { name: '第5教学楼', zone: '北区教学区', aliases: ['5教', '五教', '弘礼楼', '外国语学院', '外院'] },
  { name: '第6教学楼', zone: '北区教学区', aliases: ['6教', '六教', '师元楼', '教师教育学院', '教师院'] },
  { name: '第7教学楼', zone: '北区教学区', aliases: ['7教', '七教', '修业楼', '教师教育学院', '教师院'] },
  { name: '第8教学楼', zone: '北区教学区', aliases: ['8教', '八教', '敬德楼', '公共教学楼', '公共课'] },
  { name: '第9教学楼', zone: '北区教学区', aliases: ['9教', '九教', '荟文楼A栋', '历史文化学院', '历院', '民族学院'] },
  { name: '第10教学楼', zone: '北区教学区', aliases: ['10教', '十教', '荟文楼B栋', '公共教学楼', '公共课'] },
  { name: '第11教学楼', zone: '北区教学区', aliases: ['11教', '十一教', '田家炳教育书院', '田家炳', '教育学部', '教育学'] },
  { name: '第12教学楼', zone: '北区教学区', aliases: ['12教', '十二教', '弘学楼', '数学与统计学院', '数统院'] },
  { name: '第13教学楼', zone: '北区教学区', aliases: ['13教', '十三教', '立惠楼', '物理大楼', '物理科学与技术学院', '物理学院'] },
  { name: '第14教学楼', zone: '北区教学区', aliases: ['14教', '十四教', '白南楼', '生命科学学院', '生科院'] },
  { name: '第15教学楼', zone: '北区教学区', aliases: ['15教', '十五教', '至美楼', '美术学院', '美院'] },
  { name: '第16教学楼', zone: '北区教学区', aliases: ['16教', '十六教', '求实楼', '药化大楼', '化学化工与药学实验楼', '化学化工学院', '化工学院', '药学院', '中医药学院'] },
  { name: '第17教学楼', zone: '北区教学区', aliases: ['17教', '十七教', '漱溟楼', '国家治理学院'] },
  { name: '第19教学楼（A/B栋）', zone: '北区教学区', aliases: ['19教', '十九教', '厚乐楼A/B栋', '音乐厅', '音乐学院', '音院'] },
  { name: '第20教学楼', zone: '北区教学区', aliases: ['20教', '二十教', '行健楼', '体育学院', '体院'] },
  { name: '第22教学楼（A/B栋）', zone: '北区教学区', aliases: ['22教', '二十二教', '实德楼A/B栋', '材料与能源学院', '材料学院'] },
  { name: '第23教学楼', zone: '北区教学区', aliases: ['23教', '二十三教', '润心楼', '心理大楼', '心理学部', '心理学院'] },
  { name: '第24教学楼', zone: '北区教学区', aliases: ['24教', '二十四教', '启智楼', '地理大楼', '地理科学学院', '地科院'] },
  { name: '第25教学楼', zone: '北区教学区', aliases: ['25教', '二十五教', '明德楼', 'U盘大楼', '理科大厦', '计算机与信息科学学院', '计信院', '软件学院'] },
  { name: '第26教学楼', zone: '北区教学区', aliases: ['26教', '二十六教', '弘诚楼', '公共教学楼', '公共课'] },
  { name: '第27教学楼', zone: '北区教学区', aliases: ['27教', '二十七教', '弘信楼', '公共教学楼', '公共课'] },
  { name: '第28教学楼', zone: '北区教学区', aliases: ['28教', '二十八教', '弘义楼', '公共教学楼', '公共课'] },
  { name: '第29教学楼', zone: '北区教学区', aliases: ['29教', '二十九教', '伴月楼', '半月楼'] },

  // ---------------- 南区教学区（20）----------------
  { name: '第30教学楼', zone: '南区教学区', aliases: ['30教', '三十教', '阳初楼', '南区理科楼', '水产学院', '水产'] },
  { name: '第31教学楼', zone: '南区教学区', aliases: ['31教', '三十一教', '兆畦楼', '公共教学楼', '公共课', '二号门入口'] },
  { name: '第32教学楼', zone: '南区教学区', aliases: ['32教', '三十二教', '弘勤楼', '公共教学楼', '公共课', '南区大屏幕'] },
  { name: '第33教学楼', zone: '南区教学区', aliases: ['33教', '三十三教', '同庆楼', '蚕桑纺织与生物质科学学院', '蚕桑学院'] },
  { name: '第34教学楼', zone: '南区教学区', aliases: ['34教', '三十四教', '书楠楼', '植物保护学院', '植保院'] },
  { name: '第35教学楼', zone: '南区教学区', aliases: ['35教', '三十五教', '逸夫楼', '资源环境学院', '资环院'] },
  { name: '第36教学楼', zone: '南区教学区', aliases: ['36教', '三十六教', '含弘楼', '含弘学院'] },
  { name: '第37教学楼', zone: '南区教学区', aliases: ['37教', '三十七教', '弘朴楼', '动物科学技术学院', '动科院'] },
  { name: '第38教学楼', zone: '南区教学区', aliases: ['38教', '三十八教', '明辨楼', '法学院', '法学'] },
  { name: '第39教学楼', zone: '南区教学区', aliases: ['39教', '三十九教', '弘忠楼', '食品科学学院', '食品院'] },
  { name: '第40教学楼', zone: '南区教学区', aliases: ['40教', '四十教', '弘实楼', '食品科学学院', '食品院'] },
  { name: '第41教学楼', zone: '南区教学区', aliases: ['41教', '四十一教', '世俊楼', '国家重点实验室'] },
  { name: '第42教学楼', zone: '南区教学区', aliases: ['42教', '四十二教', '博学楼', '电子信息工程学院', '电信院'] },
  { name: '第43教学楼', zone: '南区教学区', aliases: ['43教', '四十三教', '隆平楼', '农业科学研究院', '农科院'] },
  { name: '第44教学楼', zone: '南区教学区', aliases: ['44教', '四十四教', '蚕学宫', '资源昆虫高效养殖与利用全国重点实验室', '资源昆虫实验室'] },
  { name: '第45教学楼', zone: '南区教学区', aliases: ['45教', '四十五教', '天予楼', '蚕桑纺织与生物质科学学院', '蚕桑学院'] },
  { name: '第46教学楼', zone: '南区教学区', aliases: ['46教', '四十六教', '荟贤楼', '经济管理学院', '经管院'] },
  { name: '第47教学楼', zone: '南区教学区', aliases: ['47教', '四十七教', '棉研楼', '农学与生物科技学院', '农生院'] },
  { name: '第48教学楼', zone: '南区教学区', aliases: ['48教', '四十八教', '弘新楼', '工科大楼', '工程技术学院', '工学院'] },
  { name: '第49教学楼', zone: '南区教学区', aliases: ['49教', '四十九教', '勤学楼', '动物医学院', '动医院'] },

  // ---------------- 其他片区内地标（5）----------------
  { name: '行署楼', zone: '北区其他', aliases: ['第一行政楼', '北区行政楼', '行署楼A/B栋', '党政机关'] },
  { name: '文俊楼', zone: '南区其他', aliases: ['南区行政楼', '第二行政楼', '行政楼', '机关部门'] },
  { name: '圆顶学生活动中心', zone: '北区其他', aliases: ['圆顶', '北区学生活动中心', '第一学生活动中心'] },
  { name: '厚生楼', zone: '南区其他', aliases: ['南区学生活动中心', '南活', '第二学生活动中心', '党委学工部'] },
  { name: '大学生创新创业中心', zone: '南区其他', aliases: ['南区招聘大厅', '大创中心'] }
];

/** 片区名集合，O(1) 校验用 */
const ZONE_SET = ZONES.reduce(function (m, z) { m[z.name] = z; return m; }, {});

/** 片区 -> 地标名数组 */
const ZONE_PLACES = LANDMARKS.reduce(function (m, l) {
  (m[l.zone] = m[l.zone] || []).push(l.name);
  return m;
}, {});

/** 地标名 -> 地标对象 */
const PLACE_MAP = LANDMARKS.reduce(function (m, l) { m[l.name] = l; return m; }, {});

/** 按分类返回片区，供选择器分组：{ 宿舍园: [...], 教学区: [...] } */
function zonesByCategory() {
  const out = {};
  CATEGORIES.forEach(function (c) { out[c] = []; });
  ZONES.forEach(function (z) { out[z.category].push(z.name); });
  return out;
}

/** 是否合法片区 */
function isValidZone(zone) {
  return !!ZONE_SET[zone];
}

/** 某片区下的地标名数组；无下级地标时返回空数组 */
function placesOfZone(zone) {
  return ZONE_PLACES[zone] || [];
}

/**
 * 是否合法地标。
 * 片区无下级地标时（宿舍园/图书馆/运动场/校医院/校外），地标 = 片区名，也视为合法。
 */
function isValidPlace(zone, place) {
  if (!isValidZone(zone)) return false;
  if (!place) return true;
  const list = placesOfZone(zone);
  if (!list.length) return place === zone;
  return list.indexOf(place) > -1;
}

/** 地标反查所属片区；不存在返回 '' */
function zoneOfPlace(place) {
  const l = PLACE_MAP[place];
  return l ? l.zone : '';
}

/**
 * 搜索联想：按正式名或别名模糊匹配地标，返回最多 limit 条。
 * 供发布页、找跑腿页的搜索框使用。
 */
function searchLandmarks(keyword, limit) {
  const kw = String(keyword || '').trim().toLowerCase();
  if (!kw) return [];
  const max = limit || 10;
  const out = [];
  for (let i = 0; i < LANDMARKS.length; i++) {
    const l = LANDMARKS[i];
    let hit = l.name.toLowerCase().indexOf(kw) > -1;
    if (!hit) {
      for (let j = 0; j < l.aliases.length; j++) {
        if (l.aliases[j].toLowerCase().indexOf(kw) > -1) { hit = true; break; }
      }
    }
    if (hit) {
      out.push(l);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * 统一展示格式：「北区教学区 · 第16教学楼」。
 * 片区不合法返回 ''；地标为空时显示「片区 · 全区」。
 * 四个代取页面都调这个，避免各处写法不一致。
 */
function displayArea(zone, place) {
  if (!isValidZone(zone)) return '';
  const p = place && isValidPlace(zone, place) ? place : '';
  return p ? zone + ' · ' + p : zone + ' · 全区';
}

module.exports = {
  CATEGORIES: CATEGORIES,
  ZONES: ZONES,
  LANDMARKS: LANDMARKS,
  zonesByCategory: zonesByCategory,
  isValidZone: isValidZone,
  placesOfZone: placesOfZone,
  isValidPlace: isValidPlace,
  zoneOfPlace: zoneOfPlace,
  searchLandmarks: searchLandmarks,
  displayArea: displayArea
};
