// 演示数据初始化：可重复执行；每次重建 3 个演示账号名下的商品、图片和收藏。
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
  }
];

const FAVORITES = [
  { studentNo: '2023001', itemIndex: 0 },
  { studentNo: '2023001', itemIndex: 4 },
  { studentNo: '2023001', itemIndex: 6 }
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

    const categoryIds = await upsertCategories(conn);
    const bookIds = await upsertBooks(conn);
    const itemIds = await insertItems(conn, userIds, categoryIds, bookIds);
    await insertFavorites(conn, userIds, itemIds);

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

    console.log('seed 完成');
    console.log(`- 演示账号：${userCount.c} 个（2023001 / 2023002 / 2023003）`);
    console.log(`- 分类：${CATEGORIES.length} 个；书目：${BOOKS.length} 本`);
    console.log(`- 商品：${itemCount.c} 个；图片：${imageCount.c} 张；收藏：${favoriteCount.c} 条`);
    console.log('- 演示账号密码见《课程设计开发计划.md》3.7 节，不在脚本里单独输出');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

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
