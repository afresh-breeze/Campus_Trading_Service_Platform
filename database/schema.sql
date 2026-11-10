-- ============================================================
-- 校园交易服务平台 · 数据库建表脚本（schema.sql）
-- 内容：campus_service 库 + 14 张表 + 索引 + 约束
-- 执行：mysql -u root -p < database/schema.sql
-- 警告：脚本会 DROP 并重建 14 张表，已有数据请先备份
-- 执行顺序：schema.sql → objects.sql → seed.sql → server/npm run seed
-- ============================================================

-- 应用账号由管理员单独创建，密码不要写进本文件、不要提交到 Git：
-- CREATE USER 'cs_app'@'localhost' IDENTIFIED BY '<强密码>';
-- GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON campus_service.* TO 'cs_app'@'localhost';

CREATE DATABASE IF NOT EXISTS campus_service
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE campus_service;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS errand_status_logs;
DROP TABLE IF EXISTS item_status_logs;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS errand_orders;
DROP TABLE IF EXISTS runner_item_sizes;
DROP TABLE IF EXISTS runner_profiles;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS item_images;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 1. users：用户表
-- ------------------------------------------------------------
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_no VARCHAR(20) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  campus VARCHAR(50) NULL,
  college VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  credit_score INT NOT NULL DEFAULT 60,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_student_no (student_no),
  CONSTRAINT chk_users_credit CHECK (credit_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 2. books：书目表
-- ------------------------------------------------------------
CREATE TABLE books (
  book_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  isbn VARCHAR(20) NULL,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100) NULL,
  publisher VARCHAR(100) NULL,
  edition VARCHAR(50) NULL,
  price_ref DECIMAL(10,2) NULL,
  cover_url VARCHAR(255) NULL,
  UNIQUE KEY uk_books_isbn (isbn),
  KEY idx_books_title (title(50)),
  CONSTRAINT chk_books_price_ref CHECK (price_ref IS NULL OR price_ref >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 3. categories：二手分类表
-- ------------------------------------------------------------
CREATE TABLE categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  sort_no INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 4. items：商品主表
-- ------------------------------------------------------------
CREATE TABLE items (
  item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  seller_id BIGINT NOT NULL,
  category_id INT NULL,
  book_id BIGINT NULL,
  item_type ENUM('normal','book') NOT NULL DEFAULT 'normal',
  title VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  condition_level ENUM('new','like_new','good','fair') NOT NULL DEFAULT 'good',
  negotiable TINYINT(1) NOT NULL DEFAULT 0,
  campus VARCHAR(50) NULL,
  location VARCHAR(100) NULL,
  status ENUM('on_sale','reserved','sold','off_shelf') NOT NULL DEFAULT 'on_sale',
  view_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_seller FOREIGN KEY (seller_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_items_book FOREIGN KEY (book_id) REFERENCES books(book_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_items_price CHECK (price >= 0),
  CONSTRAINT chk_items_original_price CHECK (original_price IS NULL OR original_price >= 0),
  CONSTRAINT chk_items_favorite_count CHECK (favorite_count >= 0),
  CONSTRAINT chk_items_view_count CHECK (view_count >= 0),
  CONSTRAINT chk_items_negotiable CHECK (negotiable IN (0,1)),
  KEY idx_items_status_created (status, created_at),
  KEY idx_items_book_status_created (book_id, status, created_at),
  KEY idx_items_category_price (category_id, price),
  KEY idx_items_seller_status (seller_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 5. item_images：商品图片表
-- ------------------------------------------------------------
CREATE TABLE item_images (
  image_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  url VARCHAR(255) NOT NULL,
  sort_no INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES items(item_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_item_images_item_sort (item_id, sort_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 6. favorites：收藏表
-- ------------------------------------------------------------
CREATE TABLE favorites (
  user_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorites_item FOREIGN KEY (item_id) REFERENCES items(item_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 7. runner_profiles：跑腿接单设置表
-- ------------------------------------------------------------
CREATE TABLE runner_profiles (
  user_id BIGINT PRIMARY KEY,
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  availability_type ENUM('slot','now') NOT NULL DEFAULT 'slot',
  service_areas JSON NOT NULL,
  service_places JSON NOT NULL DEFAULT (JSON_ARRAY()),
  time_slots JSON NOT NULL DEFAULT (JSON_ARRAY()),
  manual_until DATETIME NULL,
  base_price DECIMAL(10,2) NULL,
  remark VARCHAR(255) NULL,
  completed_count INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_runner_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_runner_online CHECK (is_online IN (0,1)),
  CONSTRAINT chk_runner_base_price CHECK (base_price IS NULL OR base_price >= 0),
  CONSTRAINT chk_runner_completed_count CHECK (completed_count >= 0),
  CONSTRAINT chk_runner_service_areas CHECK (
    JSON_TYPE(service_areas) = 'ARRAY' AND JSON_LENGTH(service_areas) >= 1
  ),
  CONSTRAINT chk_runner_service_places CHECK (
    JSON_TYPE(service_places) = 'ARRAY'
  ),
  CONSTRAINT chk_runner_time_slots CHECK (
    JSON_TYPE(time_slots) = 'ARRAY'
  ),
  CONSTRAINT chk_runner_slot_requires_schedule CHECK (
    availability_type <> 'slot' OR JSON_LENGTH(time_slots) >= 1
  ),
  KEY idx_runner_online (is_online),
  KEY idx_runner_availability (availability_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 8. runner_item_sizes：跑腿可接规格表
-- ------------------------------------------------------------
CREATE TABLE runner_item_sizes (
  user_id BIGINT NOT NULL,
  item_size ENUM('small','medium','large') NOT NULL,
  PRIMARY KEY (user_id, item_size),
  CONSTRAINT fk_runner_sizes_profile FOREIGN KEY (user_id) REFERENCES runner_profiles(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_runner_sizes_size_user (item_size, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 9. errand_orders：代取订单表
-- ------------------------------------------------------------
CREATE TABLE errand_orders (
  order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  publisher_id BIGINT NOT NULL,
  runner_id BIGINT NULL,
  pickup_area VARCHAR(20) NOT NULL,
  pickup_place VARCHAR(50) NOT NULL,
  delivery_location VARCHAR(100) NOT NULL,
  item_size ENUM('small','medium','large') NOT NULL,
  item_desc VARCHAR(500) NULL,
  remark VARCHAR(255) NULL,
  reward DECIMAL(10,2) NOT NULL,
  time_type ENUM('asap','deadline','range') NOT NULL DEFAULT 'asap',
  time_start DATETIME NULL,
  deadline DATETIME NULL,
  status ENUM('pending','taken','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  taken_at DATETIME NULL,
  completed_at DATETIME NULL,
  CONSTRAINT fk_errands_publisher FOREIGN KEY (publisher_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_errands_runner FOREIGN KEY (runner_id) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_errands_reward CHECK (reward >= 0),
  CONSTRAINT chk_errands_time CHECK (
    (time_type = 'asap' AND time_start IS NULL AND deadline IS NULL)
    OR (time_type = 'deadline' AND time_start IS NULL AND deadline IS NOT NULL)
    OR (time_type = 'range' AND time_start IS NOT NULL AND deadline IS NOT NULL AND time_start < deadline)
  ),
  KEY idx_errands_status_created (status, created_at),
  KEY idx_errands_publisher_status (publisher_id, status),
  KEY idx_errands_runner_status (runner_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 10. conversations：会话表
-- ------------------------------------------------------------
CREATE TABLE conversations (
  conversation_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_a_id BIGINT NOT NULL,
  user_b_id BIGINT NOT NULL,
  biz_type ENUM('item','errand') NOT NULL,
  biz_id BIGINT NOT NULL DEFAULT 0,
  last_message VARCHAR(255) NULL,
  last_time DATETIME NULL,
  -- user_id 自增且从不更新；这两列参与 CHECK，MySQL 不允许其外键带 ON UPDATE CASCADE
  CONSTRAINT fk_conversations_user_a FOREIGN KEY (user_a_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_conversations_user_b FOREIGN KEY (user_b_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_conversations_user_order CHECK (user_a_id < user_b_id),
  UNIQUE KEY uk_conversations_pair_biz (user_a_id, user_b_id, biz_type, biz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 11. messages：消息表
-- ------------------------------------------------------------
CREATE TABLE messages (
  message_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  msg_type ENUM('text','image') NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_messages_is_read CHECK (is_read IN (0,1)),
  KEY idx_messages_conv_msg (conversation_id, message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 12. item_status_logs：商品状态变更日志表
-- ------------------------------------------------------------
CREATE TABLE item_status_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  old_status ENUM('on_sale','reserved','sold','off_shelf') NULL,
  new_status ENUM('on_sale','reserved','sold','off_shelf') NOT NULL,
  changed_by BIGINT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_logs_item FOREIGN KEY (item_id) REFERENCES items(item_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_logs_user FOREIGN KEY (changed_by) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_item_logs_item_time (item_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 13. errand_status_logs：代取状态变更日志表
-- ------------------------------------------------------------
CREATE TABLE errand_status_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  old_status ENUM('pending','taken','completed','cancelled') NULL,
  new_status ENUM('pending','taken','completed','cancelled') NOT NULL,
  changed_by BIGINT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_errand_logs_order FOREIGN KEY (order_id) REFERENCES errand_orders(order_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_errand_logs_user FOREIGN KEY (changed_by) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_errand_logs_order_time (order_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- 14. feedback：用户反馈表
-- ------------------------------------------------------------
CREATE TABLE feedback (
  feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_feedback_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
