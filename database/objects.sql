-- ============================================================
-- 校园交易服务平台 · 数据库对象（objects.sql）
-- 内容：4 视图 + 2 函数 + 5 存储过程 + 5 触发器
-- 执行：mysql -u root -p campus_service < database/objects.sql
-- 说明：脚本可重复执行；每次先按依赖逆序 DROP，再重新创建
-- 前提：已执行 schema.sql
-- ============================================================

USE campus_service;

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 按依赖逆序清理旧对象
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_message_after_insert;
DROP TRIGGER IF EXISTS trg_errand_status_log;
DROP TRIGGER IF EXISTS trg_item_status_log;
DROP TRIGGER IF EXISTS trg_fav_after_delete;
DROP TRIGGER IF EXISTS trg_fav_after_insert;

DROP FUNCTION IF EXISTS fn_completed_errands;
DROP FUNCTION IF EXISTS fn_unread_count;

DROP PROCEDURE IF EXISTS sp_refresh_user_credit;
DROP PROCEDURE IF EXISTS sp_get_or_create_conversation;
DROP PROCEDURE IF EXISTS sp_complete_errand;
DROP PROCEDURE IF EXISTS sp_take_errand;
DROP PROCEDURE IF EXISTS sp_publish_item;

DROP VIEW IF EXISTS v_user_summary;
DROP VIEW IF EXISTS v_conversation_base;
DROP VIEW IF EXISTS v_errand_hall;
DROP VIEW IF EXISTS v_item_list;

-- ============================================================
-- 一、视图
-- ============================================================

-- 商品列表 / 详情：商品 + 卖家 + 分类 + 书目 + 首图
CREATE OR REPLACE VIEW v_item_list AS
SELECT
  i.item_id            AS itemId,
  i.seller_id          AS sellerId,
  u.nickname           AS sellerNickname,
  u.avatar_url         AS sellerAvatar,
  u.credit_score       AS sellerCreditScore,
  i.category_id        AS categoryId,
  c.name               AS categoryName,
  i.book_id            AS bookId,
  b.title              AS bookTitle,
  b.author             AS bookAuthor,
  i.item_type          AS itemType,
  i.title              AS title,
  i.description        AS description,
  i.price              AS price,
  i.original_price     AS originalPrice,
  i.condition_level    AS conditionLevel,
  i.negotiable         AS negotiable,
  i.location           AS location,
  i.status             AS status,
  i.view_count         AS viewCount,
  i.favorite_count     AS favoriteCount,
  i.created_at         AS createdAt,
  i.updated_at         AS updatedAt,
  (SELECT img.url
     FROM item_images img
    WHERE img.item_id = i.item_id
    ORDER BY img.sort_no, img.image_id
    LIMIT 1)           AS firstImage
FROM items i
JOIN users u ON u.user_id = i.seller_id
LEFT JOIN categories c ON c.category_id = i.category_id
LEFT JOIN books b ON b.book_id = i.book_id;

-- 代取大厅：只展示待接单订单，带发布者公开信息
CREATE OR REPLACE VIEW v_errand_hall AS
SELECT
  e.order_id           AS orderId,
  e.publisher_id       AS publisherId,
  u.nickname           AS publisherNickname,
  u.avatar_url         AS publisherAvatar,
  u.credit_score       AS publisherCreditScore,
  e.pickup_area        AS pickupArea,
  e.pickup_place       AS pickupPlace,
  e.delivery_location  AS deliveryLocation,
  e.item_size          AS itemSize,
  e.item_desc          AS itemDesc,
  e.remark             AS remark,
  e.reward             AS reward,
  e.time_type          AS timeType,
  e.time_start         AS timeStart,
  e.deadline           AS deadline,
  e.status             AS status,
  e.created_at         AS createdAt
FROM errand_orders e
JOIN users u ON u.user_id = e.publisher_id
WHERE e.status = 'pending';

-- 会话列表：会话 + 双方昵称头像
CREATE OR REPLACE VIEW v_conversation_base AS
SELECT
  c.conversation_id    AS conversationId,
  c.user_a_id          AS userAId,
  ua.nickname          AS userANickname,
  ua.avatar_url        AS userAAvatar,
  c.user_b_id          AS userBId,
  ub.nickname          AS userBNickname,
  ub.avatar_url        AS userBAvatar,
  c.biz_type           AS bizType,
  c.biz_id             AS bizId,
  c.last_message       AS lastMessage,
  c.last_time          AS lastTime
FROM conversations c
JOIN users ua ON ua.user_id = c.user_a_id
JOIN users ub ON ub.user_id = c.user_b_id;

-- 用户维度统计：发布商品数、收藏数、完成跑腿数、发布代取数
CREATE OR REPLACE VIEW v_user_summary AS
SELECT
  u.user_id            AS userId,
  u.student_no         AS studentNo,
  u.nickname           AS nickname,
  u.avatar_url         AS avatarUrl,
  u.credit_score       AS creditScore,
  (SELECT COUNT(*) FROM items i WHERE i.seller_id = u.user_id) AS itemCount,
  (SELECT COUNT(*) FROM favorites f WHERE f.user_id = u.user_id) AS favoriteCount,
  (SELECT COUNT(*)
     FROM errand_orders e
    WHERE e.runner_id = u.user_id AND e.status = 'completed') AS completedErrandCount,
  (SELECT COUNT(*)
     FROM errand_orders e
    WHERE e.publisher_id = u.user_id) AS publishedErrandCount
FROM users u;

-- ============================================================
-- 二、函数
-- ============================================================

DELIMITER $$

-- 某会话中当前用户的未读消息数
CREATE FUNCTION fn_unread_count(p_conversation_id BIGINT, p_user_id BIGINT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
    FROM messages
   WHERE conversation_id = p_conversation_id
     AND sender_id <> p_user_id
     AND is_read = 0;

  RETURN v_count;
END$$

-- 某用户作为跑腿完成的订单数
CREATE FUNCTION fn_completed_errands(p_user_id BIGINT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
    FROM errand_orders
   WHERE runner_id = p_user_id
     AND status = 'completed';

  RETURN v_count;
END$$

-- ============================================================
-- 三、存储过程
-- ============================================================

-- 发布商品：商品 + 多张图片在同一事务内完成
CREATE PROCEDURE sp_publish_item(
  IN p_seller_id BIGINT,
  IN p_category_id INT,
  IN p_book_id BIGINT,
  IN p_item_type VARCHAR(10),
  IN p_title VARCHAR(100),
  IN p_description TEXT,
  IN p_price DECIMAL(10,2),
  IN p_original_price DECIMAL(10,2),
  IN p_condition_level VARCHAR(20),
  IN p_negotiable TINYINT,
  IN p_location VARCHAR(100),
  IN p_images JSON,
  OUT p_item_id BIGINT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO items
    (seller_id, category_id, book_id, item_type, title, description,
     price, original_price, condition_level, negotiable, campus, location, status)
  VALUES
    (p_seller_id, p_category_id, p_book_id, p_item_type, p_title, p_description,
     p_price, p_original_price, p_condition_level, p_negotiable, NULL, p_location, 'on_sale');

  SET p_item_id = LAST_INSERT_ID();

  IF p_images IS NOT NULL AND JSON_LENGTH(p_images) > 0 THEN
    INSERT INTO item_images (item_id, url, sort_no)
    SELECT p_item_id, jt.url, jt.sort_no
      FROM JSON_TABLE(p_images, '$[*]' COLUMNS (
        url VARCHAR(255) PATH '$.url',
        sort_no INT PATH '$.sortNo'
      )) AS jt;
  END IF;

  COMMIT;
END$$

-- 接单：事务 + 行锁，防并发重复接单
-- p_code：0 成功；403 不能接自己的单；404 不存在；409 已被接走
CREATE PROCEDURE sp_take_errand(
  IN p_order_id BIGINT,
  IN p_runner_id BIGINT,
  OUT p_code INT
)
BEGIN
  DECLARE v_publisher_id BIGINT DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT publisher_id, status
    INTO v_publisher_id, v_status
    FROM errand_orders
   WHERE order_id = p_order_id
   FOR UPDATE;

  IF v_publisher_id IS NULL THEN
    SET p_code = 404;
    ROLLBACK;
  ELSEIF v_publisher_id = p_runner_id THEN
    SET p_code = 403;
    ROLLBACK;
  ELSEIF v_status <> 'pending' THEN
    SET p_code = 409;
    ROLLBACK;
  ELSE
    SET @current_user_id = p_runner_id;

    UPDATE errand_orders
       SET runner_id = p_runner_id,
           status = 'taken',
           taken_at = NOW()
     WHERE order_id = p_order_id
       AND status = 'pending';

    IF ROW_COUNT() = 1 THEN
      SET p_code = 0;
      COMMIT;
    ELSE
      SET p_code = 409;
      ROLLBACK;
    END IF;
  END IF;
END$$

-- 完成订单：更新订单、跑腿完成数、信用分
-- p_code：0 成功；403 非发布者；404 不存在；409 状态不是 taken
CREATE PROCEDURE sp_complete_errand(
  IN p_order_id BIGINT,
  IN p_publisher_id BIGINT,
  OUT p_code INT
)
BEGIN
  DECLARE v_publisher_id BIGINT DEFAULT NULL;
  DECLARE v_runner_id BIGINT DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT publisher_id, runner_id, status
    INTO v_publisher_id, v_runner_id, v_status
    FROM errand_orders
   WHERE order_id = p_order_id
   FOR UPDATE;

  IF v_publisher_id IS NULL THEN
    SET p_code = 404;
    ROLLBACK;
  ELSEIF v_publisher_id <> p_publisher_id THEN
    SET p_code = 403;
    ROLLBACK;
  ELSEIF v_status <> 'taken' THEN
    SET p_code = 409;
    ROLLBACK;
  ELSE
    SET @current_user_id = p_publisher_id;

    UPDATE errand_orders
       SET status = 'completed',
           completed_at = NOW()
     WHERE order_id = p_order_id
       AND status = 'taken';

    IF ROW_COUNT() = 1 THEN
      -- 正常流程跑腿已有资料；兜底插入满足 service_areas 非空约束
      INSERT INTO runner_profiles
        (user_id, availability_type, service_areas, service_places, time_slots, completed_count)
      VALUES
        (v_runner_id, 'now', JSON_ARRAY('北区其他'), JSON_ARRAY(), JSON_ARRAY(), 1)
      ON DUPLICATE KEY UPDATE completed_count = completed_count + 1;

      UPDATE users
         SET credit_score = LEAST(100, credit_score + 2)
       WHERE user_id = v_runner_id;

      SET p_code = 0;
      COMMIT;
    ELSE
      SET p_code = 409;
      ROLLBACK;
    END IF;
  END IF;
END$$

-- 获取或创建会话：用户 ID 归一化，唯一键防重复
CREATE PROCEDURE sp_get_or_create_conversation(
  IN p_user1 BIGINT,
  IN p_user2 BIGINT,
  IN p_biz_type VARCHAR(10),
  IN p_biz_id BIGINT,
  OUT p_conversation_id BIGINT
)
BEGIN
  DECLARE v_user_a BIGINT;
  DECLARE v_user_b BIGINT;

  SET v_user_a = LEAST(p_user1, p_user2);
  SET v_user_b = GREATEST(p_user1, p_user2);

  IF v_user_a = v_user_b THEN
    SET p_conversation_id = NULL;
  ELSE
    INSERT INTO conversations (user_a_id, user_b_id, biz_type, biz_id)
    VALUES (v_user_a, v_user_b, p_biz_type, COALESCE(p_biz_id, 0))
    ON DUPLICATE KEY UPDATE conversation_id = LAST_INSERT_ID(conversation_id);

    SET p_conversation_id = LAST_INSERT_ID();
  END IF;
END$$

-- 游标刷新信用分：60 基础 + 完成单数 × 2，最高 100
CREATE PROCEDURE sp_refresh_user_credit()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_user_id BIGINT;

  DECLARE cur CURSOR FOR SELECT user_id FROM users;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_user_id;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    UPDATE users
       SET credit_score = LEAST(100, 60 + fn_completed_errands(v_user_id) * 2)
     WHERE user_id = v_user_id;
  END LOOP;

  CLOSE cur;
END$$

DELIMITER ;

-- ============================================================
-- 四、触发器
-- ============================================================

DELIMITER $$

-- 收藏后收藏数 +1
CREATE TRIGGER trg_fav_after_insert
AFTER INSERT ON favorites
FOR EACH ROW
BEGIN
  UPDATE items
     SET favorite_count = favorite_count + 1
   WHERE item_id = NEW.item_id;
END$$

-- 取消收藏后收藏数 -1，最低为 0
CREATE TRIGGER trg_fav_after_delete
AFTER DELETE ON favorites
FOR EACH ROW
BEGIN
  UPDATE items
     SET favorite_count = GREATEST(favorite_count - 1, 0)
   WHERE item_id = OLD.item_id;
END$$

-- 商品状态变化写日志；操作人由接口在同一连接上设置 @current_user_id
CREATE TRIGGER trg_item_status_log
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO item_status_logs (item_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.item_id, OLD.status, NEW.status, @current_user_id, NOW());
  END IF;
END$$

-- 代取状态变化写日志
CREATE TRIGGER trg_errand_status_log
AFTER UPDATE ON errand_orders
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO errand_status_logs (order_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.order_id, OLD.status, NEW.status, @current_user_id, NOW());
  END IF;
END$$

-- 新消息更新会话最后一条消息和时间；图片消息预览固定为 [图片]
CREATE TRIGGER trg_message_after_insert
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
  IF NEW.msg_type = 'image' THEN
    UPDATE conversations
       SET last_message = '[图片]',
           last_time = NEW.created_at
     WHERE conversation_id = NEW.conversation_id;
  ELSE
    UPDATE conversations
       SET last_message = LEFT(NEW.content, 255),
           last_time = NEW.created_at
     WHERE conversation_id = NEW.conversation_id;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- 完成
-- ============================================================
