// 演示数据初始化：可重复执行；每次重建 3 个演示账号名下的商品、图片、收藏、代取单和跑腿设置。
// 前提：已执行 database/schema.sql，不依赖 objects.sql / seed.sql。
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/db');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || '123456';

const DEMO_USERS = [
  {
    studentNo: '2023001',
    nickname: '林小满',
    college: '计算机与信息科学学院',
    phone: '13800000001',
    creditScore: 60
  },
  {
    studentNo: '2023002',
    nickname: '陈子航',
    college: '数学与统计学院',
    phone: '13800000002',
    creditScore: 62
  },
  {
    studentNo: '2023003',
    nickname: '周雨桐',
    college: '外国语学院',
    phone: '13800000003',
    creditScore: 61
  }
];

const CATEGORIES = [
  '图书教材',
  '数码电子',
  '生活用品',
  '服饰鞋包',
  '运动户外',
  '其他'
];

const BOOKS = [
  {
    isbn: '9787040396638',
    title: '高等数学（第七版）上册',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第七版',
    priceRef: 45.0,
    coverUrl: '/demo/book-calculus.png'
  },
  {
    isbn: '9787302129399',
    title: '数据结构（C 语言版）',
    author: '严蔚敏、吴伟民',
    publisher: '清华大学出版社',
    edition: '第 2 版',
    priceRef: 39.0,
    coverUrl: '/demo/book-data-structure.png'
  },
  {
    isbn: '9787117265421',
    title: '计算机网络（第 8 版）',
    author: '谢希仁',
    publisher: '电子工业出版社',
    edition: '第 8 版',
    priceRef: 59.0,
    coverUrl: '/demo/book-network.png'
  },
  {
    isbn: '9787040507409',
    title: '大学英语综合教程 1',
    author: '李荫华',
    publisher: '高等教育出版社',
    edition: '第 3 版',
    priceRef: 42.0,
    coverUrl: null
  },
  {
    isbn: '9787040396614',
    title: '线性代数（第六版）',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第六版',
    priceRef: 29.0,
    coverUrl: null
  },
  {
    isbn: '9787040494792',
    title: '毛泽东思想和中国特色社会主义理论体系概论',
    author: '本书编写组',
    publisher: '高等教育出版社',
    edition: '2023 年版',
    priceRef: 35.0,
    coverUrl: null
  },
  // 11-16 追加：书籍卡片/搜索结果页测试用书目
  {
    isbn: '9787040396645',
    title: '高等数学（第七版）下册',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第七版',
    priceRef: 39.0,
    coverUrl: '/demo/book-calculus.png'
  },
  {
    isbn: '9787040589818',
    title: '高等数学（第八版）上册',
    author: '同济大学数学系',
    publisher: '高等教育出版社',
    edition: '第八版',
    priceRef: 49.0,
    coverUrl: '/demo/book-calculus.png'
  },
  {
    isbn: '9787302561234',
    title: '大学物理（第四版）上册',
    author: '张三慧',
    publisher: '清华大学出版社',
    edition: '第四版',
    priceRef: 48.0,
    coverUrl: null
  },
  {
    isbn: '9787040510409',
    title: '概率论与数理统计（第五版）',
    author: '盛骤、谢式千、潘承毅',
    publisher: '高等教育出版社',
    edition: '第五版',
    priceRef: 36.0,
    coverUrl: '/demo/book-calculus.png'
  },
  {
    isbn: '9787302511321',
    title: '离散数学（第六版）',
    author: '耿素云、屈婉玲、张立昂',
    publisher: '清华大学出版社',
    edition: '第六版',
    priceRef: 35.0,
    coverUrl: '/demo/book-data-structure.png'
  },
  {
    isbn: '9787040406641',
    title: '数据库系统概论（第五版）',
    author: '王珊、萨师煊',
    publisher: '高等教育出版社',
    edition: '第五版',
    priceRef: 42.0,
    coverUrl: '/demo/book-data-structure.png'
  },
  {
    isbn: '9787302482133',
    title: '软件工程导论（第六版）',
    author: '张海藩、牟永敏',
    publisher: '清华大学出版社',
    edition: '第六版',
    priceRef: 39.5,
    coverUrl: '/demo/book-network.png'
  },
  {
    isbn: '9787560633508',
    title: '操作系统（第四版）',
    author: '汤小丹、梁红兵、哲凤屏、汤子瀛',
    publisher: '西安电子科技大学出版社',
    edition: '第四版',
    priceRef: 45.0,
    coverUrl: '/demo/book-network.png'
  },
  {
    isbn: '9787040599008',
    title: '马克思主义基本原理（2023 年版）',
    author: '本书编写组',
    publisher: '高等教育出版社',
    edition: '2023 年版',
    priceRef: 23.0,
    coverUrl: null
  },
  {
    isbn: '9787040599015',
    title: '中国近现代史纲要（2023 年版）',
    author: '本书编写组',
    publisher: '高等教育出版社',
    edition: '2023 年版',
    priceRef: 26.0,
    coverUrl: null
  }
];

const ITEMS = [
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: null,
    itemType: 'normal',
    title: '高数、数据结构、计算机网络 三本教材打包',
    description: '三门课都用得上，无缺页，少量笔记，打包出更划算。',
    price: 45.0,
    originalPrice: 133.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 56,
    daysAgo: 0,
    images: ['/demo/book-calculus.png', '/demo/book-data-structure.png', '/demo/book-network.png']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787040396638',
    itemType: 'book',
    title: '高等数学（第七版）上册 九成新',
    description: '只翻过前两章，无笔记无划线，可小刀。',
    price: 18.0,
    originalPrice: 45.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 128,
    daysAgo: 1,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787302129399',
    itemType: 'book',
    title: '数据结构（C 语言版）',
    description: '期末复习用完，书角轻微磨损，内容完整。',
    price: 15.0,
    originalPrice: 39.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '北区教学区',
    status: 'on_sale',
    viewCount: 74,
    daysAgo: 2,
    images: ['/demo/book-data-structure.png']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787117265421',
    itemType: 'book',
    title: '计算机网络（第 8 版）',
    description: '上课只用了半学期，保存得很好。',
    price: 22.0,
    originalPrice: 59.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '南区教学区',
    status: 'on_sale',
    viewCount: 43,
    daysAgo: 3,
    images: ['/demo/book-network.png']
  },
  {
    sellerNo: '2023002',
    category: '数码电子',
    bookIsbn: null,
    itemType: 'normal',
    title: '罗技 M720 无线鼠标',
    description: '功能正常，送电池，宿舍搬东西出了。',
    price: 95.0,
    originalPrice: 199.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 64,
    daysAgo: 4,
    images: ['/demo/mouse.png']
  },
  {
    sellerNo: '2023003',
    category: '生活用品',
    bookIsbn: null,
    itemType: 'normal',
    title: '宿舍折叠小桌板',
    description: '桌面无划痕，搬宿舍带不走，自提。',
    price: 25.0,
    originalPrice: 69.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '李园',
    status: 'on_sale',
    viewCount: 39,
    daysAgo: 5,
    images: ['/demo/desk.png']
  },
  {
    sellerNo: '2023002',
    category: '生活用品',
    bookIsbn: null,
    itemType: 'normal',
    title: '小米 LED 台灯',
    description: '三档亮度，充电正常，适合宿舍书桌。',
    price: 35.0,
    originalPrice: 89.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '橘园',
    status: 'on_sale',
    viewCount: 51,
    daysAgo: 6,
    images: ['/demo/lamp.png']
  },
  {
    sellerNo: '2023003',
    category: '服饰鞋包',
    bookIsbn: null,
    itemType: 'normal',
    title: '阿迪达斯双肩包',
    description: '容量大，能放 15 寸电脑，已预订。',
    price: 60.0,
    originalPrice: 199.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '北区教学区',
    status: 'reserved',
    viewCount: 33,
    daysAgo: 7,
    images: ['/demo/backpack.png']
  },
  {
    sellerNo: '2023002',
    category: '运动户外',
    bookIsbn: null,
    itemType: 'normal',
    title: '瑜伽垫 加厚防滑',
    description: '用了几次，已清洁，附收纳绑带。',
    price: 20.0,
    originalPrice: 59.0,
    conditionLevel: 'like_new',
    negotiable: 0,
    location: '第一运动场',
    status: 'on_sale',
    viewCount: 27,
    daysAgo: 8,
    images: ['/demo/yoga-mat.png']
  },
  {
    sellerNo: '2023001',
    category: '生活用品',
    bookIsbn: null,
    itemType: 'normal',
    title: '保温杯 500ml',
    description: '保温效果正常，已售出，仅用于状态展示。',
    price: 15.0,
    originalPrice: 49.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '楠园',
    status: 'sold',
    viewCount: 19,
    daysAgo: 9,
    images: ['/demo/bottle.png']
  },
  // 11-15 追加：实拍演示商品（全部在售，用于首页滚动/吸顶/分页与图片展示）
  {
    sellerNo: '2023001',
    category: '数码电子',
    bookIsbn: null,
    itemType: 'normal',
    title: '头戴式无线耳机 降噪',
    description: '用了一学期，耳罩无破损，续航正常，附收纳袋。',
    price: 120.0,
    originalPrice: 399.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 41,
    daysAgo: 0,
    images: ['/demo/headphones.jpg']
  },
  {
    sellerNo: '2023002',
    category: '数码电子',
    bookIsbn: null,
    itemType: 'normal',
    title: '87 键机械键盘 茶轴',
    description: '键帽有轻微使用痕迹，所有按键正常，送拔键器。',
    price: 85.0,
    originalPrice: 219.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '北区教学区',
    status: 'on_sale',
    viewCount: 33,
    daysAgo: 2,
    images: ['/demo/keyboard.jpg']
  },
  {
    sellerNo: '2023003',
    category: '生活用品',
    bookIsbn: null,
    itemType: 'normal',
    title: '宿舍静音小风扇',
    description: '两档风力，声音小，扇叶已清洁，毕业出。',
    price: 20.0,
    originalPrice: 49.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '李园',
    status: 'on_sale',
    viewCount: 58,
    daysAgo: 4,
    images: ['/demo/mini-fan.jpg']
  },
  {
    sellerNo: '2023001',
    category: '生活用品',
    bookIsbn: null,
    itemType: 'normal',
    title: '不锈钢电热水壶 1.5L',
    description: '烧水正常，壶身有水渍，已除垢。',
    price: 28.0,
    originalPrice: 69.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '橘园',
    status: 'on_sale',
    viewCount: 22,
    daysAgo: 6,
    images: ['/demo/kettle.jpg']
  },
  {
    sellerNo: '2023002',
    category: '运动户外',
    bookIsbn: null,
    itemType: 'normal',
    title: '标准 7 号篮球',
    description: '室外场用了一学期，纹路还清楚，气足。',
    price: 45.0,
    originalPrice: 129.0,
    conditionLevel: 'fair',
    negotiable: 1,
    location: '第一运动场',
    status: 'on_sale',
    viewCount: 37,
    daysAgo: 8,
    images: ['/demo/basketball.jpg']
  },
  {
    sellerNo: '2023003',
    category: '运动户外',
    bookIsbn: null,
    itemType: 'normal',
    title: '羽毛球拍一对 送球',
    description: '两支拍子，手柄有使用痕迹，送三个球。',
    price: 35.0,
    originalPrice: 99.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '第三运动场',
    status: 'on_sale',
    viewCount: 29,
    daysAgo: 1,
    images: ['/demo/badminton.jpg']
  },
  {
    sellerNo: '2023002',
    category: '服饰鞋包',
    bookIsbn: null,
    itemType: 'normal',
    title: '灰色连帽卫衣 L 码',
    description: '洗过两次，无起球，版型宽松，适合 175 左右。',
    price: 40.0,
    originalPrice: 129.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '梅园',
    status: 'on_sale',
    viewCount: 46,
    daysAgo: 3,
    images: ['/demo/hoodie.jpg']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: null,
    itemType: 'normal',
    title: '四级真题 + 词汇书 打包',
    description: '真题只做了两套，词汇书有少量笔记，打包出。',
    price: 25.0,
    originalPrice: 78.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '中心图书馆',
    status: 'on_sale',
    viewCount: 51,
    daysAgo: 5,
    images: ['/demo/cet-books.jpg']
  },
  {
    sellerNo: '2023003',
    category: '其他',
    bookIsbn: null,
    itemType: 'normal',
    title: '宿舍折叠收纳箱 大号',
    description: '可折叠，容量大，边角有轻微磨损，不影响使用。',
    price: 18.0,
    originalPrice: 45.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '杏园',
    status: 'on_sale',
    viewCount: 26,
    daysAgo: 7,
    images: ['/demo/storage-box.jpg']
  },
  // 11-16 追加：书籍商品测试数据（多版本/多库存/多状态）
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787040396638',
    itemType: 'book',
    title: '高等数学（第七版）上册 有少量笔记',
    description: '重点章节有铅笔笔记，可擦除，书页完整。',
    price: 12.0,
    originalPrice: 45.0,
    conditionLevel: 'fair',
    negotiable: 1,
    location: '李园',
    status: 'on_sale',
    viewCount: 31,
    daysAgo: 0,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787040396638',
    itemType: 'book',
    title: '高等数学（第七版）上册 已预订',
    description: '已被同学预订，用于展示已预订状态。',
    price: 16.0,
    originalPrice: 45.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '橘园',
    status: 'reserved',
    viewCount: 22,
    daysAgo: 4,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787040396645',
    itemType: 'book',
    title: '高等数学（第七版）下册 几乎全新',
    description: '买来没怎么翻，无笔记无划线。',
    price: 17.0,
    originalPrice: 39.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 18,
    daysAgo: 1,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787040396645',
    itemType: 'book',
    title: '高等数学（第七版）下册 已售出',
    description: '已售出，仅用于状态展示，不计入在售数。',
    price: 13.0,
    originalPrice: 39.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '梅园',
    status: 'sold',
    viewCount: 12,
    daysAgo: 9,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787040589818',
    itemType: 'book',
    title: '高等数学（第八版）上册 全新未拆',
    description: '买重复了，塑封还在，未拆封。',
    price: 29.0,
    originalPrice: 49.0,
    conditionLevel: 'new',
    negotiable: 0,
    location: '中心图书馆',
    status: 'on_sale',
    viewCount: 44,
    daysAgo: 2,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787302561234',
    itemType: 'book',
    title: '大学物理（第四版）上册 九成新',
    description: '课后题没写过，书脊平整，无缺页。',
    price: 20.0,
    originalPrice: 48.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '北区教学区',
    status: 'on_sale',
    viewCount: 26,
    daysAgo: 3,
    images: ['/demo/cet-books.jpg']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787302561234',
    itemType: 'book',
    title: '大学物理（第四版）上册 少量划线',
    description: '公式部分有荧光笔划线，不影响阅读。',
    price: 24.0,
    originalPrice: 48.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '南区教学区',
    status: 'on_sale',
    viewCount: 17,
    daysAgo: 5,
    images: ['/demo/cet-books.jpg']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787040510409',
    itemType: 'book',
    title: '概率论与数理统计（第五版）',
    description: '考研复习用书，笔记集中在最后几章。',
    price: 14.0,
    originalPrice: 36.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '李园',
    status: 'on_sale',
    viewCount: 35,
    daysAgo: 6,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787040510409',
    itemType: 'book',
    title: '概率论与数理统计（第五版） 暂不出',
    description: '暂时下架，仅用于展示已下架状态。',
    price: 10.0,
    originalPrice: 36.0,
    conditionLevel: 'fair',
    negotiable: 1,
    location: '楠园',
    status: 'off_shelf',
    viewCount: 9,
    daysAgo: 10,
    images: ['/demo/book-calculus.png']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787302511321',
    itemType: 'book',
    title: '离散数学（第六版） 期末用书',
    description: '期末复习用完，书内干净，附一张公式纸。',
    price: 19.0,
    originalPrice: 35.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '竹园',
    status: 'on_sale',
    viewCount: 21,
    daysAgo: 1,
    images: ['/demo/book-data-structure.png']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787040406641',
    itemType: 'book',
    title: '数据库系统概论（第五版）',
    description: '数据库课程教材，重点章节有标签贴。',
    price: 21.0,
    originalPrice: 42.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '桃园',
    status: 'on_sale',
    viewCount: 29,
    daysAgo: 4,
    images: ['/demo/book-data-structure.png']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787302482133',
    itemType: 'book',
    title: '软件工程导论（第六版） 划线较多',
    description: '专业课教材，划线和批注较多，价格便宜出。',
    price: 15.0,
    originalPrice: 39.5,
    conditionLevel: 'fair',
    negotiable: 1,
    location: '杏园',
    status: 'on_sale',
    viewCount: 14,
    daysAgo: 7,
    images: ['/demo/book-network.png']
  },
  {
    sellerNo: '2023003',
    category: '图书教材',
    bookIsbn: '9787040599008',
    itemType: 'book',
    title: '马克思主义基本原理（2023 年版）',
    description: '公共课教材，几乎没翻，无笔记。',
    price: 8.0,
    originalPrice: 23.0,
    conditionLevel: 'good',
    negotiable: 0,
    location: '中心图书馆',
    status: 'on_sale',
    viewCount: 19,
    daysAgo: 2,
    images: ['/demo/cet-books.jpg']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787560633508',
    itemType: 'book',
    title: '操作系统（第四版） 计算机专业课',
    description: '计算机专业课教材，书角轻微磨损，内容完整。',
    price: 18.0,
    originalPrice: 45.0,
    conditionLevel: 'like_new',
    negotiable: 1,
    location: '北区教学区',
    status: 'on_sale',
    viewCount: 23,
    daysAgo: 3,
    images: ['/demo/book-network.png']
  },
  {
    sellerNo: '2023001',
    category: '图书教材',
    bookIsbn: '9787117265421',
    itemType: 'book',
    title: '计算机网络（第 8 版） 第二本',
    description: '同款第二本，保存良好，适合备用。',
    price: 20.0,
    originalPrice: 59.0,
    conditionLevel: 'good',
    negotiable: 1,
    location: '南区教学区',
    status: 'on_sale',
    viewCount: 16,
    daysAgo: 0,
    images: ['/demo/book-network.png']
  },
  {
    sellerNo: '2023002',
    category: '图书教材',
    bookIsbn: '9787302129399',
    itemType: 'book',
    title: '数据结构（C 语言版） 已预订',
    description: '已被预订，仅用于展示状态，不计入在售数。',
    price: 17.0,
    originalPrice: 39.0,
    conditionLevel: 'like_new',
    negotiable: 0,
    location: '北区教学区',
    status: 'reserved',
    viewCount: 11,
    daysAgo: 5,
    images: ['/demo/book-data-structure.png']
  }
];

const FAVORITES = [
  { studentNo: '2023001', itemIndex: 0 },
  { studentNo: '2023001', itemIndex: 4 },
  { studentNo: '2023001', itemIndex: 6 }
];

// 覆盖不同片区、规格、时间类型和报酬，用于大厅筛选/排序演示。
const ERRANDS = [
  {
    publisherNo: '2023001',
    pickupArea: '桃园',
    pickupPlace: '桃园',
    deliveryLocation: '李园 2 栋 305',
    itemSize: 'small',
    itemDesc: '一份外卖',
    remark: '桃园 3 栋楼下，到了打电话',
    reward: 5.0,
    timeType: 'asap',
    hoursAgo: 0.5
  },
  {
    publisherNo: '2023002',
    pickupArea: '北区教学区',
    pickupPlace: '第16教学楼',
    deliveryLocation: '橘园 5 栋 212',
    itemSize: 'medium',
    itemDesc: '一箱教材',
    remark: '第16教学楼 301 门口',
    reward: 8.0,
    timeType: 'deadline',
    deadlineInHours: 24,
    hoursAgo: 2
  },
  {
    publisherNo: '2023003',
    pickupArea: '李园',
    pickupPlace: '李园',
    deliveryLocation: '中心图书馆一楼大厅',
    itemSize: 'small',
    itemDesc: '两杯奶茶',
    remark: '李园 6 栋楼下奶茶店取',
    reward: 3.0,
    timeType: 'range',
    timeStartInHours: 2,
    deadlineInHours: 5,
    hoursAgo: 4
  },
  {
    publisherNo: '2023001',
    pickupArea: '南区教学区',
    pickupPlace: '第30教学楼',
    deliveryLocation: '楠园 1 栋 101',
    itemSize: 'large',
    itemDesc: '一个 24 寸行李箱',
    remark: '第30教学楼一楼大厅',
    reward: 15.0,
    timeType: 'asap',
    hoursAgo: 8
  },
  {
    publisherNo: '2023002',
    pickupArea: '中心图书馆',
    pickupPlace: '中心图书馆',
    deliveryLocation: '梅园 4 栋 410',
    itemSize: 'small',
    itemDesc: '两本借阅的书',
    remark: '图书馆自助借还机旁',
    reward: 4.0,
    timeType: 'deadline',
    deadlineInHours: 48,
    hoursAgo: 12
  },
  {
    publisherNo: '2023003',
    pickupArea: '第一运动场',
    pickupPlace: '第一运动场',
    deliveryLocation: '竹园 6 栋 606',
    itemSize: 'medium',
    itemDesc: '羽毛球拍和球',
    remark: '运动场看台入口',
    reward: 6.0,
    timeType: 'range',
    timeStartInHours: 24,
    deadlineInHours: 27,
    hoursAgo: 20
  },
  {
    publisherNo: '2023001',
    pickupArea: '一号门外/吾悦广场',
    pickupPlace: '一号门外/吾悦广场',
    deliveryLocation: '杏园 2 栋 202',
    itemSize: 'large',
    itemDesc: '一个大件快递',
    remark: '吾悦广场负一楼快递柜',
    reward: 20.0,
    timeType: 'asap',
    hoursAgo: 24
  },
  {
    publisherNo: '2023002',
    pickupArea: '南区其他',
    pickupPlace: '文俊楼',
    deliveryLocation: '南区校医院门口',
    itemSize: 'medium',
    itemDesc: '一个文件袋',
    remark: '文俊楼 205 办公室',
    reward: 10.0,
    timeType: 'deadline',
    deadlineInHours: 72,
    hoursAgo: 30
  },
  {
    publisherNo: '2023003',
    pickupArea: '北区图书馆',
    pickupPlace: '北区图书馆',
    deliveryLocation: '茶园 1 栋 101',
    itemSize: 'small',
    itemDesc: '一把雨伞',
    remark: '北区图书馆二楼服务台',
    reward: 2.0,
    timeType: 'asap',
    hoursAgo: 36
  }
];

// 演示“按我的接单设置”：三个账号都有一套可接片区/规格，方便任意账号登录演示。
const RUNNER_PROFILES = [
  {
    studentNo: '2023001',
    isOnline: 1,
    availabilityType: 'now',
    serviceAreas: ['桃园', '楠园', '中心图书馆'],
    servicePlaces: [],
    itemSizes: ['small', 'large'],
    timeSlots: [],
    basePrice: 7.0,
    remark: '图书馆和桃园附近，小件大件都可'
  },
  {
    studentNo: '2023002',
    isOnline: 1,
    availabilityType: 'now',
    serviceAreas: ['南区教学区', '中心图书馆', '南区其他'],
    servicePlaces: [],
    itemSizes: ['medium', 'large'],
    timeSlots: [],
    basePrice: 6.0,
    remark: '下午和晚饭后顺路带单'
  },
  {
    studentNo: '2023003',
    isOnline: 1,
    availabilityType: 'now',
    serviceAreas: ['桃园', '李园', '北区教学区'],
    servicePlaces: [],
    itemSizes: ['small', 'medium'],
    timeSlots: [],
    basePrice: 5.0,
    remark: '饭点在线，小件优先'
  }
];

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

async function upsertUsers(conn, passwordHash) {
  const userIds = new Map();
  for (const user of DEMO_USERS) {
    await conn.query(
      `INSERT INTO users
         (student_no, password_hash, nickname, avatar_url, campus, college, phone, credit_score, status)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         nickname = VALUES(nickname),
         avatar_url = NULL,
         campus = NULL,
         college = VALUES(college),
         phone = VALUES(phone),
         credit_score = VALUES(credit_score),
         status = 'active'`,
      [
        user.studentNo,
        passwordHash,
        user.nickname,
        user.college,
        user.phone,
        user.creditScore
      ]
    );
    const [[row]] = await conn.query(
      'SELECT user_id FROM users WHERE student_no = ?',
      [user.studentNo]
    );
    userIds.set(user.studentNo, row.user_id);
  }
  return userIds;
}

async function upsertCategories(conn) {
  const categoryIds = new Map();
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const name = CATEGORIES[i];
    await conn.query(
      `INSERT INTO categories (name, sort_no)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE sort_no = VALUES(sort_no)`,
      [name, i + 1]
    );
    const [[row]] = await conn.query(
      'SELECT category_id FROM categories WHERE name = ?',
      [name]
    );
    categoryIds.set(name, row.category_id);
  }
  return categoryIds;
}

async function upsertBooks(conn) {
  const bookIds = new Map();
  for (const book of BOOKS) {
    await conn.query(
      `INSERT INTO books
         (isbn, title, author, publisher, edition, price_ref, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         author = VALUES(author),
         publisher = VALUES(publisher),
         edition = VALUES(edition),
         price_ref = VALUES(price_ref),
         cover_url = VALUES(cover_url)`,
      [
        book.isbn,
        book.title,
        book.author,
        book.publisher,
        book.edition,
        book.priceRef,
        book.coverUrl
      ]
    );
    const [[row]] = await conn.query(
      'SELECT book_id FROM books WHERE isbn = ?',
      [book.isbn]
    );
    bookIds.set(book.isbn, row.book_id);
  }
  return bookIds;
}

async function insertItems(conn, userIds, categoryIds, bookIds) {
  const itemIds = [];
  for (const item of ITEMS) {
    const createdAt = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);
    const [result] = await conn.query(
      `INSERT INTO items
         (seller_id, category_id, book_id, item_type, title, description,
          price, original_price, condition_level, negotiable, campus, location,
          status, view_count, favorite_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, ?)`,
      [
        userIds.get(item.sellerNo),
        categoryIds.get(item.category),
        item.bookIsbn ? bookIds.get(item.bookIsbn) : null,
        item.itemType,
        item.title,
        item.description,
        item.price,
        item.originalPrice,
        item.conditionLevel,
        item.negotiable,
        item.location,
        item.status,
        item.viewCount,
        createdAt
      ]
    );

    const itemId = result.insertId;
    itemIds.push(itemId);
    for (let i = 0; i < item.images.length; i += 1) {
      await conn.query(
        'INSERT INTO item_images (item_id, url, sort_no) VALUES (?, ?, ?)',
        [itemId, item.images[i], i + 1]
      );
    }
  }
  return itemIds;
}

async function insertFavorites(conn, userIds, itemIds) {
  for (const favorite of FAVORITES) {
    await conn.query(
      'INSERT IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)',
      [userIds.get(favorite.studentNo), itemIds[favorite.itemIndex]]
    );
  }
}

async function upsertRunnerProfiles(conn, userIds) {
  for (const profile of RUNNER_PROFILES) {
    const userId = userIds.get(profile.studentNo);
    await conn.query(
      `INSERT INTO runner_profiles
         (user_id, is_online, availability_type, service_areas, service_places,
          time_slots, manual_until, base_price, remark, completed_count)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         is_online = VALUES(is_online),
         availability_type = VALUES(availability_type),
         service_areas = VALUES(service_areas),
         service_places = VALUES(service_places),
         time_slots = VALUES(time_slots),
         manual_until = NULL,
         base_price = VALUES(base_price),
         remark = VALUES(remark),
         completed_count = 0`,
      [
        userId,
        profile.isOnline,
        profile.availabilityType,
        JSON.stringify(profile.serviceAreas),
        JSON.stringify(profile.servicePlaces),
        JSON.stringify(profile.timeSlots),
        profile.basePrice,
        profile.remark
      ]
    );

    await conn.query('DELETE FROM runner_item_sizes WHERE user_id = ?', [userId]);
    for (const size of profile.itemSizes) {
      await conn.query(
        'INSERT INTO runner_item_sizes (user_id, item_size) VALUES (?, ?)',
        [userId, size]
      );
    }
  }
}

async function insertErrands(conn, userIds) {
  const now = Date.now();
  for (const errand of ERRANDS) {
    const createdAt = new Date(now - errand.hoursAgo * 60 * 60 * 1000);
    const timeStart = errand.timeStartInHours === undefined
      ? null
      : new Date(now + errand.timeStartInHours * 60 * 60 * 1000);
    const deadline = errand.deadlineInHours === undefined
      ? null
      : new Date(now + errand.deadlineInHours * 60 * 60 * 1000);

    await conn.query(
      `INSERT INTO errand_orders
         (publisher_id, pickup_area, pickup_place, delivery_location, item_size,
          item_desc, remark, reward, time_type, time_start, deadline,
          status, visibility, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'hall', ?)`,
      [
        userIds.get(errand.publisherNo),
        errand.pickupArea,
        errand.pickupPlace,
        errand.deliveryLocation,
        errand.itemSize,
        errand.itemDesc,
        errand.remark,
        errand.reward,
        errand.timeType,
        timeStart,
        deadline,
        createdAt
      ]
    );
  }
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    const userIds = await upsertUsers(conn, passwordHash);
    const demoUserIds = [...userIds.values()];

    await conn.query(
      `DELETE FROM favorites WHERE user_id IN (${placeholders(demoUserIds)})`,
      demoUserIds
    );
    await conn.query(
      `DELETE FROM items WHERE seller_id IN (${placeholders(demoUserIds)})`,
      demoUserIds
    );
    await conn.query(
      `DELETE FROM errand_orders WHERE publisher_id IN (${placeholders(demoUserIds)})`,
      demoUserIds
    );

    const categoryIds = await upsertCategories(conn);
    const bookIds = await upsertBooks(conn);
    const itemIds = await insertItems(conn, userIds, categoryIds, bookIds);
    await insertFavorites(conn, userIds, itemIds);
    await upsertRunnerProfiles(conn, userIds);
    await insertErrands(conn, userIds);

    await conn.query(
      `UPDATE items
          SET favorite_count = (
            SELECT COUNT(*) FROM favorites f WHERE f.item_id = items.item_id
          )
        WHERE item_id IN (${placeholders(itemIds)})`,
      itemIds
    );

    await conn.commit();

    const [[userCount]] = await conn.query(
      `SELECT COUNT(*) AS c FROM users WHERE student_no IN (${placeholders(DEMO_USERS.map((u) => u.studentNo))})`,
      DEMO_USERS.map((u) => u.studentNo)
    );
    const [[itemCount]] = await conn.query(
      `SELECT COUNT(*) AS c FROM items WHERE item_id IN (${placeholders(itemIds)})`,
      itemIds
    );
    const [[imageCount]] = await conn.query(
      `SELECT COUNT(*) AS c FROM item_images WHERE item_id IN (${placeholders(itemIds)})`,
      itemIds
    );
    const [[favoriteCount]] = await conn.query(
      `SELECT COUNT(*) AS c FROM favorites WHERE user_id IN (${placeholders(demoUserIds)})`,
      demoUserIds
    );
    const [[errandCount]] = await conn.query(
      `SELECT COUNT(*) AS c FROM errand_orders WHERE publisher_id IN (${placeholders(demoUserIds)})`,
      demoUserIds
    );

    console.log('seed 完成');
    console.log(`- 演示账号：${userCount.c} 个（2023001 / 2023002 / 2023003）`);
    console.log(`- 分类：${CATEGORIES.length} 个；书目：${BOOKS.length} 本`);
    console.log(`- 商品：${itemCount.c} 个；图片：${imageCount.c} 张；收藏：${favoriteCount.c} 条`);
    console.log(`- 代取单：${errandCount.c} 条（hall + pending）`);
    console.log(`- 跑腿设置：${RUNNER_PROFILES.length} 个演示账号（含可接片区/规格）`);
    console.log('- 演示账号密码见《课程设计开发计划.md》3.7 节，不在脚本里单独输出');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  main()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error('seed 失败：', err.message);
      try {
        await pool.end();
      } catch (e) {
        // ignore close error
      }
      process.exitCode = 1;
    });
}

module.exports = { BOOKS, ITEMS, DEMO_USERS };
