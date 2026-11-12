const CAMPUS_ZONES = [
  '桃园', '李园', '橘园', '楠园', '梅园', '竹园', '杏园', '茶园',
  '北区教学区', '南区教学区',
  '中心图书馆', '北区图书馆', '南区图书馆',
  '第一运动场', '第二运动场', '第三运动场', '第四运动场', '第五运动场',
  '北区校医院', '南区校医院',
  '一号门外/吾悦广场', '二号门外', '校外其他', '北区其他', '南区其他'
];

const LANDMARKS = [
  { name: '第1教学楼', zone: '北区教学区' },
  { name: '第2教学楼', zone: '北区教学区' },
  { name: '第3教学楼', zone: '北区教学区' },
  { name: '第4教学楼（A/B栋）', zone: '北区教学区' },
  { name: '第5教学楼', zone: '北区教学区' },
  { name: '第6教学楼', zone: '北区教学区' },
  { name: '第7教学楼', zone: '北区教学区' },
  { name: '第8教学楼', zone: '北区教学区' },
  { name: '第9教学楼', zone: '北区教学区' },
  { name: '第10教学楼', zone: '北区教学区' },
  { name: '第11教学楼', zone: '北区教学区' },
  { name: '第12教学楼', zone: '北区教学区' },
  { name: '第13教学楼', zone: '北区教学区' },
  { name: '第14教学楼', zone: '北区教学区' },
  { name: '第15教学楼', zone: '北区教学区' },
  { name: '第16教学楼', zone: '北区教学区' },
  { name: '第17教学楼', zone: '北区教学区' },
  { name: '第19教学楼（A/B栋）', zone: '北区教学区' },
  { name: '第20教学楼', zone: '北区教学区' },
  { name: '第22教学楼（A/B栋）', zone: '北区教学区' },
  { name: '第23教学楼', zone: '北区教学区' },
  { name: '第24教学楼', zone: '北区教学区' },
  { name: '第25教学楼', zone: '北区教学区' },
  { name: '第26教学楼', zone: '北区教学区' },
  { name: '第27教学楼', zone: '北区教学区' },
  { name: '第28教学楼', zone: '北区教学区' },
  { name: '第29教学楼', zone: '北区教学区' },
  { name: '第30教学楼', zone: '南区教学区' },
  { name: '第31教学楼', zone: '南区教学区' },
  { name: '第32教学楼', zone: '南区教学区' },
  { name: '第33教学楼', zone: '南区教学区' },
  { name: '第34教学楼', zone: '南区教学区' },
  { name: '第35教学楼', zone: '南区教学区' },
  { name: '第36教学楼', zone: '南区教学区' },
  { name: '第37教学楼', zone: '南区教学区' },
  { name: '第38教学楼', zone: '南区教学区' },
  { name: '第39教学楼', zone: '南区教学区' },
  { name: '第40教学楼', zone: '南区教学区' },
  { name: '第41教学楼', zone: '南区教学区' },
  { name: '第42教学楼', zone: '南区教学区' },
  { name: '第43教学楼', zone: '南区教学区' },
  { name: '第44教学楼', zone: '南区教学区' },
  { name: '第45教学楼', zone: '南区教学区' },
  { name: '第46教学楼', zone: '南区教学区' },
  { name: '第47教学楼', zone: '南区教学区' },
  { name: '第48教学楼', zone: '南区教学区' },
  { name: '第49教学楼', zone: '南区教学区' },
  { name: '行署楼', zone: '北区其他' },
  { name: '文俊楼', zone: '南区其他' },
  { name: '圆顶学生活动中心', zone: '北区其他' },
  { name: '厚生楼', zone: '南区其他' },
  { name: '大学生创新创业中心', zone: '南区其他' }
];

const ZONE_SET = new Set(CAMPUS_ZONES);
const PLACE_TO_ZONE = new Map(LANDMARKS.map((landmark) => [landmark.name, landmark.zone]));

// 片区名也可直接作为 pickupPlace / servicePlaces 元素，表示接整个片区
function isValidZone(value) {
  return typeof value === 'string' && ZONE_SET.has(value);
}

function isValidPlace(value) {
  return isValidZone(value) || (typeof value === 'string' && PLACE_TO_ZONE.has(value));
}

function zoneOfPlace(value) {
  if (isValidZone(value)) {
    return value;
  }
  return PLACE_TO_ZONE.get(value) || null;
}

module.exports = {
  CAMPUS_ZONES,
  LANDMARKS,
  PLACE_TO_ZONE,
  isValidZone,
  isValidPlace,
  zoneOfPlace
};
