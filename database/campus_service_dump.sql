-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: campus_service
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `campus_service`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `campus_service` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `campus_service`;

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `books` (
  `book_id` bigint NOT NULL AUTO_INCREMENT,
  `isbn` varchar(20) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `author` varchar(100) DEFAULT NULL,
  `publisher` varchar(100) DEFAULT NULL,
  `edition` varchar(50) DEFAULT NULL,
  `price_ref` decimal(10,2) DEFAULT NULL,
  `cover_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`book_id`),
  UNIQUE KEY `uk_books_isbn` (`isbn`),
  KEY `idx_books_title` (`title`(50)),
  CONSTRAINT `chk_books_price_ref` CHECK (((`price_ref` is null) or (`price_ref` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `books`
--

LOCK TABLES `books` WRITE;
/*!40000 ALTER TABLE `books` DISABLE KEYS */;
INSERT INTO `books` VALUES (1,'9787040396638','高等数学（第七版）上册','同济大学数学系','高等教育出版社','第七版',45.00,'/demo/book-calculus.png'),(2,'9787302129399','数据结构（C 语言版）','严蔚敏、吴伟民','清华大学出版社','第 2 版',39.00,'/demo/book-data-structure.png'),(3,'9787117265421','计算机网络（第 8 版）','谢希仁','电子工业出版社','第 8 版',59.00,'/demo/book-network.png'),(4,'9787040507409','大学英语综合教程 1','李荫华','高等教育出版社','第 3 版',42.00,NULL),(5,'9787040396614','线性代数（第六版）','同济大学数学系','高等教育出版社','第六版',29.00,NULL),(6,'9787040494792','毛泽东思想和中国特色社会主义理论体系概论','本书编写组','高等教育出版社','2023 年版',35.00,NULL),(56,'9787040396645','高等数学（第七版）下册','同济大学数学系','高等教育出版社','第七版',39.00,'/demo/book-calculus.png'),(57,'9787040589818','高等数学（第八版）上册','同济大学数学系','高等教育出版社','第八版',49.00,'/demo/book-calculus.png'),(58,'9787302561234','大学物理（第四版）上册','张三慧','清华大学出版社','第四版',48.00,NULL),(59,'9787040510409','概率论与数理统计（第五版）','盛骤、谢式千、潘承毅','高等教育出版社','第五版',36.00,'/demo/book-calculus.png'),(60,'9787302511321','离散数学（第六版）','耿素云、屈婉玲、张立昂','清华大学出版社','第六版',35.00,'/demo/book-data-structure.png'),(61,'9787040406641','数据库系统概论（第五版）','王珊、萨师煊','高等教育出版社','第五版',42.00,'/demo/book-data-structure.png'),(62,'9787302482133','软件工程导论（第六版）','张海藩、牟永敏','清华大学出版社','第六版',39.50,'/demo/book-network.png'),(63,'9787560633508','操作系统（第四版）','汤小丹、梁红兵、哲凤屏、汤子瀛','西安电子科技大学出版社','第四版',45.00,'/demo/book-network.png'),(64,'9787040599008','马克思主义基本原理（2023 年版）','本书编写组','高等教育出版社','2023 年版',23.00,NULL),(65,'9787040599015','中国近现代史纲要（2023 年版）','本书编写组','高等教育出版社','2023 年版',26.00,NULL);
/*!40000 ALTER TABLE `books` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `sort_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_categories_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'图书教材',1),(2,'数码电子',2),(3,'生活用品',3),(4,'服饰鞋包',4),(5,'运动户外',5),(6,'其他',6);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `conversation_id` bigint NOT NULL AUTO_INCREMENT,
  `user_a_id` bigint NOT NULL,
  `user_b_id` bigint NOT NULL,
  `biz_type` enum('item','errand') NOT NULL,
  `biz_id` bigint NOT NULL DEFAULT '0',
  `last_message` varchar(255) DEFAULT NULL,
  `last_time` datetime DEFAULT NULL,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`conversation_id`),
  UNIQUE KEY `uk_conversations_pair_biz` (`user_a_id`,`user_b_id`,`biz_type`,`biz_id`),
  KEY `fk_conversations_user_b` (`user_b_id`),
  CONSTRAINT `fk_conversations_user_a` FOREIGN KEY (`user_a_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_conversations_user_b` FOREIGN KEY (`user_b_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_conversations_user_order` CHECK ((`user_a_id` < `user_b_id`)),
  CONSTRAINT `chk_conversations_is_pinned` CHECK ((`is_pinned` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` (`conversation_id`,`user_a_id`,`user_b_id`,`biz_type`,`biz_id`,`last_message`,`last_time`,`is_pinned`) VALUES (4,2,6,'item',89,NULL,NULL,0),(5,2,7,'item',87,'小宝贝','2026-11-16 20:42:05',0),(7,2,6,'item',70,NULL,NULL,0),(8,2,7,'item',94,NULL,NULL,0);
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `errand_orders`
--

DROP TABLE IF EXISTS `errand_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `errand_orders` (
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `publisher_id` bigint NOT NULL,
  `runner_id` bigint DEFAULT NULL,
  `pickup_area` varchar(20) NOT NULL,
  `pickup_place` varchar(50) NOT NULL,
  `delivery_location` varchar(100) NOT NULL,
  `item_size` enum('small','medium','large') NOT NULL,
  `item_desc` varchar(500) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `reward` decimal(10,2) NOT NULL,
  `time_type` enum('asap','deadline','range') NOT NULL DEFAULT 'asap',
  `time_start` datetime DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `status` enum('pending','taken','completed','cancelled') NOT NULL DEFAULT 'pending',
  `visibility` enum('private','hall') NOT NULL DEFAULT 'hall',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `taken_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `images` json DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `idx_errands_status_created` (`status`,`created_at`),
  KEY `idx_errands_publisher_status` (`publisher_id`,`status`),
  KEY `idx_errands_runner_status` (`runner_id`,`status`),
  CONSTRAINT `fk_errands_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_errands_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_errands_reward` CHECK ((`reward` >= 0)),
  CONSTRAINT `chk_errands_time` CHECK ((((`time_type` = _utf8mb4'asap') and (`time_start` is null) and (`deadline` is null)) or ((`time_type` = _utf8mb4'deadline') and (`time_start` is null) and (`deadline` is not null)) or ((`time_type` = _utf8mb4'range') and (`time_start` is not null) and (`deadline` is not null) and (`time_start` < `deadline`)))),
  CONSTRAINT `chk_errands_images` CHECK (((`images` is null) or ((json_type(`images`) = _utf8mb4'ARRAY') and (json_length(`images`) <= 3))))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `errand_orders`
--

LOCK TABLES `errand_orders` WRITE;
/*!40000 ALTER TABLE `errand_orders` DISABLE KEYS */;
INSERT INTO `errand_orders` VALUES (11,2,NULL,'桃园','桃园','李园 2 栋 305','small','一份外卖','桃园 3 栋楼下，到了打电话',5.00,'asap',NULL,NULL,'pending','hall','2026-11-15 14:33:20',NULL,NULL),(12,6,NULL,'北区教学区','第16教学楼','橘园 5 栋 212','medium','一箱教材','第16教学楼 301 门口',8.00,'deadline',NULL,'2026-11-16 15:03:20','pending','hall','2026-11-15 13:03:20',NULL,NULL),(13,7,2,'李园','李园','中心图书馆一楼大厅','small','两杯奶茶','李园 6 栋楼下奶茶店取',3.00,'range','2026-11-15 17:03:20','2026-11-15 20:03:20','taken','hall','2026-11-15 11:03:20','2026-11-15 15:27:49',NULL),(14,2,NULL,'南区教学区','第30教学楼','楠园 1 栋 101','large','一个 24 寸行李箱','第30教学楼一楼大厅',15.00,'asap',NULL,NULL,'cancelled','hall','2026-11-15 07:03:20',NULL,NULL),(15,6,NULL,'中心图书馆','中心图书馆','梅园 4 栋 410','small','两本借阅的书','图书馆自助借还机旁',4.00,'deadline',NULL,'2026-11-17 15:03:20','pending','hall','2026-11-15 03:03:20',NULL,NULL),(16,7,NULL,'第一运动场','第一运动场','竹园 6 栋 606','medium','羽毛球拍和球','运动场看台入口',6.00,'range','2026-11-16 15:03:20','2026-11-16 18:03:20','pending','hall','2026-11-14 19:03:20',NULL,NULL),(17,2,NULL,'一号门外/吾悦广场','一号门外/吾悦广场','杏园 2 栋 202','large','一个大件快递','吾悦广场负一楼快递柜',20.00,'asap',NULL,NULL,'pending','hall','2026-11-14 15:03:20',NULL,NULL),(18,6,NULL,'南区其他','文俊楼','南区校医院门口','medium','一个文件袋','文俊楼 205 办公室',10.00,'deadline',NULL,'2026-11-18 15:03:20','pending','hall','2026-11-14 09:03:20',NULL,NULL),(19,7,NULL,'北区图书馆','北区图书馆','茶园 1 栋 101','small','一把雨伞','北区图书馆二楼服务台',2.00,'asap',NULL,NULL,'pending','hall','2026-11-14 03:03:20',NULL,NULL),(20,2,NULL,'桃园','桃园','审计测试-请忽略','small',NULL,'审计测试用，测后取消',1.00,'asap',NULL,NULL,'cancelled','private','2026-11-19 19:51:57',NULL,NULL);
/*!40000 ALTER TABLE `errand_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_errand_status_log` AFTER UPDATE ON `errand_orders` FOR EACH ROW BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO errand_status_logs (order_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.order_id, OLD.status, NEW.status, @current_user_id, NOW());
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `errand_status_logs`
--

DROP TABLE IF EXISTS `errand_status_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `errand_status_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `old_status` enum('pending','taken','completed','cancelled') DEFAULT NULL,
  `new_status` enum('pending','taken','completed','cancelled') NOT NULL,
  `changed_by` bigint DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `fk_errand_logs_user` (`changed_by`),
  KEY `idx_errand_logs_order_time` (`order_id`,`changed_at`),
  CONSTRAINT `fk_errand_logs_order` FOREIGN KEY (`order_id`) REFERENCES `errand_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_errand_logs_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `errand_status_logs`
--

LOCK TABLES `errand_status_logs` WRITE;
/*!40000 ALTER TABLE `errand_status_logs` DISABLE KEYS */;
INSERT INTO `errand_status_logs` VALUES (3,14,'pending','cancelled',2,'2026-11-15 15:27:36'),(4,13,'pending','taken',2,'2026-11-15 15:27:49'),(5,20,'pending','cancelled',2,'2026-11-19 19:51:57');
/*!40000 ALTER TABLE `errand_status_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorites` (
  `user_id` bigint NOT NULL,
  `item_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`item_id`),
  KEY `fk_favorites_item` (`item_id`),
  CONSTRAINT `fk_favorites_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorites`
--

LOCK TABLES `favorites` WRITE;
/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
INSERT INTO `favorites` VALUES (2,66,'2026-11-15 15:03:19'),(2,70,'2026-11-15 15:03:19'),(2,94,'2026-11-19 09:08:44');
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_fav_after_insert` AFTER INSERT ON `favorites` FOR EACH ROW BEGIN
  UPDATE items
     SET favorite_count = favorite_count + 1
   WHERE item_id = NEW.item_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_fav_after_delete` AFTER DELETE ON `favorites` FOR EACH ROW BEGIN
  UPDATE items
     SET favorite_count = GREATEST(favorite_count - 1, 0)
   WHERE item_id = OLD.item_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `feedback_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `idx_feedback_user_time` (`user_id`,`created_at`),
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_images`
--

DROP TABLE IF EXISTS `item_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_images` (
  `image_id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `url` varchar(255) NOT NULL,
  `sort_no` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`image_id`),
  KEY `idx_item_images_item_sort` (`item_id`,`sort_no`),
  CONSTRAINT `fk_item_images_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_images`
--

LOCK TABLES `item_images` WRITE;
/*!40000 ALTER TABLE `item_images` DISABLE KEYS */;
INSERT INTO `item_images` VALUES (79,66,'/demo/book-calculus.png',1),(80,66,'/demo/book-data-structure.png',2),(81,66,'/demo/book-network.png',3),(82,67,'/demo/book-calculus.png',1),(83,68,'/demo/book-data-structure.png',1),(84,69,'/demo/book-network.png',1),(85,70,'/demo/mouse.png',1),(86,71,'/demo/desk.png',1),(87,72,'/demo/lamp.png',1),(88,73,'/demo/backpack.png',1),(89,74,'/demo/yoga-mat.png',1),(90,75,'/demo/bottle.png',1),(91,76,'/demo/headphones.jpg',1),(92,77,'/demo/keyboard.jpg',1),(93,78,'/demo/mini-fan.jpg',1),(94,79,'/demo/kettle.jpg',1),(95,80,'/demo/basketball.jpg',1),(96,81,'/demo/badminton.jpg',1),(97,82,'/demo/hoodie.jpg',1),(98,83,'/demo/cet-books.jpg',1),(99,84,'/demo/storage-box.jpg',1),(100,85,'/demo/book-calculus.png',1),(101,86,'/demo/book-calculus.png',1),(102,87,'/demo/book-calculus.png',1),(103,88,'/demo/book-calculus.png',1),(104,89,'/demo/book-calculus.png',1),(105,90,'/demo/cet-books.jpg',1),(106,91,'/demo/cet-books.jpg',1),(107,92,'/demo/book-calculus.png',1),(108,93,'/demo/book-calculus.png',1),(109,94,'/demo/book-data-structure.png',1),(110,95,'/demo/book-data-structure.png',1),(111,96,'/demo/book-network.png',1),(112,97,'/demo/cet-books.jpg',1),(113,98,'/demo/book-network.png',1),(114,99,'/demo/book-network.png',1),(115,100,'/demo/book-data-structure.png',1);
/*!40000 ALTER TABLE `item_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_status_logs`
--

DROP TABLE IF EXISTS `item_status_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_status_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `item_id` bigint NOT NULL,
  `old_status` enum('on_sale','reserved','sold','off_shelf') DEFAULT NULL,
  `new_status` enum('on_sale','reserved','sold','off_shelf') NOT NULL,
  `changed_by` bigint DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `fk_item_logs_user` (`changed_by`),
  KEY `idx_item_logs_item_time` (`item_id`,`changed_at`),
  CONSTRAINT `fk_item_logs_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_item_logs_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_status_logs`
--

LOCK TABLES `item_status_logs` WRITE;
/*!40000 ALTER TABLE `item_status_logs` DISABLE KEYS */;
INSERT INTO `item_status_logs` VALUES (5,99,'on_sale','reserved',2,'2026-11-16 20:32:29'),(6,99,'reserved','on_sale',2,'2026-11-16 20:32:34'),(7,85,'on_sale','reserved',2,'2026-11-18 10:55:54'),(8,76,'on_sale','reserved',2,'2026-11-18 10:56:06'),(9,94,'on_sale','reserved',7,'2026-11-18 13:00:20'),(10,94,'reserved','on_sale',7,'2026-11-18 13:00:20'),(11,99,'on_sale','reserved',2,'2026-11-18 13:38:45'),(12,99,'reserved','on_sale',2,'2026-11-18 13:38:51');
/*!40000 ALTER TABLE `item_status_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `item_id` bigint NOT NULL AUTO_INCREMENT,
  `seller_id` bigint NOT NULL,
  `category_id` int DEFAULT NULL,
  `book_id` bigint DEFAULT NULL,
  `item_type` enum('normal','book') NOT NULL DEFAULT 'normal',
  `title` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `condition_level` enum('new','like_new','good','fair') NOT NULL DEFAULT 'good',
  `negotiable` tinyint(1) NOT NULL DEFAULT '0',
  `campus` varchar(50) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `status` enum('on_sale','reserved','sold','off_shelf') NOT NULL DEFAULT 'on_sale',
  `view_count` int NOT NULL DEFAULT '0',
  `favorite_count` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_items_status_created` (`status`,`created_at`),
  KEY `idx_items_book_status_created` (`book_id`,`status`,`created_at`),
  KEY `idx_items_category_price` (`category_id`,`price`),
  KEY `idx_items_seller_status` (`seller_id`,`status`),
  CONSTRAINT `fk_items_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_items_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_items_favorite_count` CHECK ((`favorite_count` >= 0)),
  CONSTRAINT `chk_items_negotiable` CHECK ((`negotiable` in (0,1))),
  CONSTRAINT `chk_items_original_price` CHECK (((`original_price` is null) or (`original_price` >= 0))),
  CONSTRAINT `chk_items_price` CHECK ((`price` >= 0)),
  CONSTRAINT `chk_items_view_count` CHECK ((`view_count` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (66,6,1,NULL,'normal','高数、数据结构、计算机网络 三本教材打包','三门课都用得上，无缺页，少量笔记，打包出更划算。',45.00,133.00,'good',1,NULL,'桃园','on_sale',57,1,'2026-11-15 15:03:20','2026-11-16 13:19:58'),(67,6,1,1,'book','高等数学（第七版）上册 九成新','只翻过前两章，无笔记无划线，可小刀。',18.00,45.00,'like_new',1,NULL,'桃园','on_sale',128,0,'2026-11-14 15:03:20','2026-11-15 15:03:19'),(68,7,1,2,'book','数据结构（C 语言版）','期末复习用完，书角轻微磨损，内容完整。',15.00,39.00,'good',0,NULL,'北区教学区','on_sale',74,0,'2026-11-13 15:03:20','2026-11-15 15:03:19'),(69,7,1,3,'book','计算机网络（第 8 版）','上课只用了半学期，保存得很好。',22.00,59.00,'like_new',1,NULL,'南区教学区','on_sale',43,0,'2026-11-12 15:03:20','2026-11-15 15:03:19'),(70,6,2,NULL,'normal','罗技 M720 无线鼠标','功能正常，送电池，宿舍搬东西出了。',95.00,199.00,'good',1,NULL,'桃园','on_sale',67,1,'2026-11-11 15:03:20','2026-11-19 16:16:08'),(71,7,3,NULL,'normal','宿舍折叠小桌板','桌面无划痕，搬宿舍带不走，自提。',25.00,69.00,'good',0,NULL,'李园','on_sale',39,0,'2026-11-10 15:03:20','2026-11-15 15:03:19'),(72,6,3,NULL,'normal','小米 LED 台灯','三档亮度，充电正常，适合宿舍书桌。',35.00,89.00,'like_new',1,NULL,'橘园','on_sale',51,0,'2026-11-09 15:03:20','2026-11-19 16:16:07'),(73,7,4,NULL,'normal','阿迪达斯双肩包','容量大，能放 15 寸电脑，已预订。',60.00,199.00,'good',1,NULL,'北区教学区','reserved',33,0,'2026-11-08 15:03:20','2026-11-15 15:03:19'),(74,6,5,NULL,'normal','瑜伽垫 加厚防滑','用了几次，已清洁，附收纳绑带。',20.00,59.00,'like_new',0,NULL,'第一运动场','on_sale',27,0,'2026-11-07 15:03:20','2026-11-15 15:03:19'),(75,2,3,NULL,'normal','保温杯 500ml','保温效果正常，已售出，仅用于状态展示。',15.00,49.00,'good',0,NULL,'楠园','sold',19,0,'2026-11-06 15:03:20','2026-11-15 15:03:19'),(76,2,2,NULL,'normal','头戴式无线耳机 降噪','用了一学期，耳罩无破损，续航正常，附收纳袋。',120.00,399.00,'good',1,NULL,'桃园','reserved',49,0,'2026-11-15 15:03:20','2026-11-18 10:56:06'),(77,6,2,NULL,'normal','87 键机械键盘 茶轴','键帽有轻微使用痕迹，所有按键正常，送拔键器。',85.00,219.00,'like_new',1,NULL,'北区教学区','on_sale',34,0,'2026-11-13 15:03:20','2026-11-16 13:24:55'),(78,7,3,NULL,'normal','宿舍静音小风扇','两档风力，声音小，扇叶已清洁，毕业出。',20.00,49.00,'good',0,NULL,'李园','on_sale',58,0,'2026-11-11 15:03:20','2026-11-15 15:03:19'),(79,2,3,NULL,'normal','不锈钢电热水壶 1.5L','烧水正常，壶身有水渍，已除垢。',28.00,69.00,'good',1,NULL,'橘园','on_sale',22,0,'2026-11-09 15:03:20','2026-11-15 15:03:19'),(80,6,5,NULL,'normal','标准 7 号篮球','室外场用了一学期，纹路还清楚，气足。',45.00,129.00,'fair',1,NULL,'第一运动场','on_sale',37,0,'2026-11-07 15:03:20','2026-11-15 15:03:19'),(81,7,5,NULL,'normal','羽毛球拍一对 送球','两支拍子，手柄有使用痕迹，送三个球。',35.00,99.00,'good',1,NULL,'第三运动场','on_sale',29,0,'2026-11-14 15:03:20','2026-11-15 15:03:19'),(82,6,4,NULL,'normal','灰色连帽卫衣 L 码','洗过两次，无起球，版型宽松，适合 175 左右。',40.00,129.00,'like_new',1,NULL,'梅园','on_sale',46,0,'2026-11-12 15:03:20','2026-11-15 15:03:19'),(83,2,1,NULL,'normal','四级真题 + 词汇书 打包','真题只做了两套，词汇书有少量笔记，打包出。',25.00,78.00,'good',0,NULL,'中心图书馆','on_sale',51,0,'2026-11-10 15:03:20','2026-11-15 15:03:19'),(84,7,6,NULL,'normal','宿舍折叠收纳箱 大号','可折叠，容量大，边角有轻微磨损，不影响使用。',18.00,45.00,'good',1,NULL,'杏园','on_sale',26,0,'2026-11-08 15:03:20','2026-11-15 15:03:19'),(85,2,1,1,'book','高等数学（第七版）上册 有少量笔记','重点章节有铅笔笔记，可擦除，书页完整。',12.00,45.00,'fair',1,NULL,'李园','reserved',33,0,'2026-11-16 17:36:09','2026-11-18 10:55:54'),(86,6,1,1,'book','高等数学（第七版）上册 已预订','已被同学预订，用于展示已预订状态。',16.00,45.00,'good',0,NULL,'橘园','reserved',22,0,'2026-11-12 17:36:09','2026-11-16 17:36:09'),(87,7,1,56,'book','高等数学（第七版）下册 几乎全新','买来没怎么翻，无笔记无划线。',17.00,39.00,'like_new',1,NULL,'桃园','on_sale',22,0,'2026-11-15 17:36:09','2026-11-19 16:41:30'),(88,2,1,56,'book','高等数学（第七版）下册 已售出','已售出，仅用于状态展示，不计入在售数。',13.00,39.00,'good',0,NULL,'梅园','sold',13,0,'2026-11-07 17:36:09','2026-11-18 10:55:44'),(89,6,1,57,'book','高等数学（第八版）上册 全新未拆','买重复了，塑封还在，未拆封。',29.00,49.00,'new',0,NULL,'中心图书馆','on_sale',48,0,'2026-11-14 17:36:09','2026-11-16 21:30:25'),(90,2,1,58,'book','大学物理（第四版）上册 九成新','课后题没写过，书脊平整，无缺页。',20.00,48.00,'good',1,NULL,'北区教学区','on_sale',27,0,'2026-11-13 17:36:09','2026-11-18 12:58:37'),(91,7,1,58,'book','大学物理（第四版）上册 少量划线','公式部分有荧光笔划线，不影响阅读。',24.00,48.00,'good',0,NULL,'南区教学区','on_sale',17,0,'2026-11-11 17:36:09','2026-11-16 17:36:09'),(92,6,1,59,'book','概率论与数理统计（第五版）','考研复习用书，笔记集中在最后几章。',14.00,36.00,'good',1,NULL,'李园','on_sale',35,0,'2026-11-10 17:36:09','2026-11-16 17:36:09'),(93,2,1,59,'book','概率论与数理统计（第五版） 暂不出','暂时下架，仅用于展示已下架状态。',10.00,36.00,'fair',1,NULL,'楠园','off_shelf',10,0,'2026-11-06 17:36:09','2026-11-18 10:55:33'),(94,7,1,60,'book','离散数学（第六版） 期末用书','期末复习用完，书内干净，附一张公式纸。',19.00,35.00,'like_new',1,NULL,'竹园','on_sale',26,1,'2026-11-15 17:36:09','2026-11-19 16:41:27'),(95,6,1,61,'book','数据库系统概论（第五版）','数据库课程教材，重点章节有标签贴。',21.00,42.00,'good',1,NULL,'桃园','on_sale',29,0,'2026-11-12 17:36:09','2026-11-16 17:36:09'),(96,2,1,62,'book','软件工程导论（第六版） 划线较多','专业课教材，划线和批注较多，价格便宜出。',15.00,39.50,'fair',1,NULL,'杏园','on_sale',14,0,'2026-11-09 17:36:09','2026-11-16 17:36:09'),(97,7,1,64,'book','马克思主义基本原理（2023 年版）','公共课教材，几乎没翻，无笔记。',8.00,23.00,'good',0,NULL,'中心图书馆','on_sale',19,0,'2026-11-14 17:36:09','2026-11-16 17:36:09'),(98,6,1,63,'book','操作系统（第四版） 计算机专业课','计算机专业课教材，书角轻微磨损，内容完整。',18.00,45.00,'like_new',1,NULL,'北区教学区','on_sale',23,0,'2026-11-13 17:36:09','2026-11-16 17:36:09'),(99,2,1,3,'book','计算机网络（第 8 版） 第二本','同款第二本，保存良好，适合备用。',20.00,59.00,'good',1,NULL,'南区教学区','on_sale',30,0,'2026-11-16 17:36:09','2026-11-19 19:35:18'),(100,6,1,2,'book','数据结构（C 语言版） 已预订','已被预订，仅用于展示状态，不计入在售数。',17.00,39.00,'like_new',0,NULL,'北区教学区','reserved',11,0,'2026-11-11 17:36:09','2026-11-16 17:36:09');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_item_status_log` AFTER UPDATE ON `items` FOR EACH ROW BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO item_status_logs (item_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.item_id, OLD.status, NEW.status, @current_user_id, NOW());
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `message_id` bigint NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint NOT NULL,
  `sender_id` bigint NOT NULL,
  `msg_type` enum('text','image') NOT NULL DEFAULT 'text',
  `content` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `fk_messages_sender` (`sender_id`),
  KEY `idx_messages_conv_msg` (`conversation_id`,`message_id`),
  CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`conversation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_messages_is_read` CHECK ((`is_read` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (4,5,2,'text','小宝贝',0,'2026-11-16 20:42:05');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_message_after_insert` AFTER INSERT ON `messages` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `runner_item_sizes`
--

DROP TABLE IF EXISTS `runner_item_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `runner_item_sizes` (
  `user_id` bigint NOT NULL,
  `item_size` enum('small','medium','large') NOT NULL,
  PRIMARY KEY (`user_id`,`item_size`),
  KEY `idx_runner_sizes_size_user` (`item_size`,`user_id`),
  CONSTRAINT `fk_runner_sizes_profile` FOREIGN KEY (`user_id`) REFERENCES `runner_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `runner_item_sizes`
--

LOCK TABLES `runner_item_sizes` WRITE;
/*!40000 ALTER TABLE `runner_item_sizes` DISABLE KEYS */;
INSERT INTO `runner_item_sizes` VALUES (2,'small'),(2,'large'),(6,'medium'),(6,'large'),(7,'small'),(7,'medium');
/*!40000 ALTER TABLE `runner_item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `runner_profiles`
--

DROP TABLE IF EXISTS `runner_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `runner_profiles` (
  `user_id` bigint NOT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `availability_type` enum('slot','now') NOT NULL DEFAULT 'slot',
  `service_areas` json NOT NULL,
  `service_places` json NOT NULL DEFAULT (json_array()),
  `time_slots` json NOT NULL DEFAULT (json_array()),
  `manual_until` datetime DEFAULT NULL,
  `base_price` decimal(10,2) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `completed_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  KEY `idx_runner_online` (`is_online`),
  KEY `idx_runner_availability` (`availability_type`),
  CONSTRAINT `fk_runner_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_runner_base_price` CHECK (((`base_price` is null) or (`base_price` >= 0))),
  CONSTRAINT `chk_runner_completed_count` CHECK ((`completed_count` >= 0)),
  CONSTRAINT `chk_runner_online` CHECK ((`is_online` in (0,1))),
  CONSTRAINT `chk_runner_service_areas` CHECK (((json_type(`service_areas`) = _utf8mb4'ARRAY') and (json_length(`service_areas`) >= 1))),
  CONSTRAINT `chk_runner_service_places` CHECK ((json_type(`service_places`) = _utf8mb4'ARRAY')),
  CONSTRAINT `chk_runner_slot_requires_schedule` CHECK (((`availability_type` <> _utf8mb4'slot') or (json_length(`time_slots`) >= 1))),
  CONSTRAINT `chk_runner_time_slots` CHECK ((json_type(`time_slots`) = _utf8mb4'ARRAY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `runner_profiles`
--

LOCK TABLES `runner_profiles` WRITE;
/*!40000 ALTER TABLE `runner_profiles` DISABLE KEYS */;
INSERT INTO `runner_profiles` VALUES (2,0,'now','[\"桃园\", \"楠园\", \"中心图书馆\", \"李园\", \"橘园\", \"北区图书馆\", \"北区其他\"]','[]','[]',NULL,7.00,'图书馆和桃园附近，小件大件都可',0),(6,1,'now','[\"南区教学区\", \"中心图书馆\", \"南区其他\"]','[]','[]',NULL,6.00,'下午和晚饭后顺路带单',0),(7,1,'now','[\"桃园\", \"李园\", \"北区教学区\"]','[]','[]',NULL,5.00,'饭点在线，小件优先',0);
/*!40000 ALTER TABLE `runner_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `student_no` varchar(20) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `campus` varchar(50) DEFAULT NULL,
  `college` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `credit_score` int NOT NULL DEFAULT '60',
  `status` enum('active','disabled') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_student_no` (`student_no`),
  CONSTRAINT `chk_users_credit` CHECK ((`credit_score` between 0 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'2023001','$2b$10$C6ORgo3Bz9nAryZAs47UA.vtSPhYBQa43FDy6Sl39MolYvyMTrTCq','林小满',NULL,NULL,'计算机与信息科学学院','13800000001',60,'active','2026-11-09 21:10:52'),(6,'2023002','$2b$10$C6ORgo3Bz9nAryZAs47UA.vtSPhYBQa43FDy6Sl39MolYvyMTrTCq','陈子航',NULL,NULL,'数学与统计学院','13800000002',62,'active','2026-11-10 19:22:50'),(7,'2023003','$2b$10$C6ORgo3Bz9nAryZAs47UA.vtSPhYBQa43FDy6Sl39MolYvyMTrTCq','周雨桐',NULL,NULL,'外国语学院','13800000003',61,'active','2026-11-10 19:22:50');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_conversation_base`
--

DROP TABLE IF EXISTS `v_conversation_base`;
/*!50001 DROP VIEW IF EXISTS `v_conversation_base`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_conversation_base` AS SELECT 
 1 AS `conversationId`,
 1 AS `userAId`,
 1 AS `userANickname`,
 1 AS `userAAvatar`,
 1 AS `userBId`,
 1 AS `userBNickname`,
 1 AS `userBAvatar`,
 1 AS `bizType`,
 1 AS `bizId`,
 1 AS `lastMessage`,
 1 AS `lastTime`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_errand_hall`
--

DROP TABLE IF EXISTS `v_errand_hall`;
/*!50001 DROP VIEW IF EXISTS `v_errand_hall`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_errand_hall` AS SELECT 
 1 AS `orderId`,
 1 AS `publisherId`,
 1 AS `publisherNickname`,
 1 AS `publisherAvatar`,
 1 AS `publisherCreditScore`,
 1 AS `pickupArea`,
 1 AS `pickupPlace`,
 1 AS `deliveryLocation`,
 1 AS `itemSize`,
 1 AS `itemDesc`,
 1 AS `remark`,
 1 AS `reward`,
 1 AS `timeType`,
 1 AS `timeStart`,
 1 AS `deadline`,
 1 AS `status`,
 1 AS `visibility`,
 1 AS `createdAt`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_item_list`
--

DROP TABLE IF EXISTS `v_item_list`;
/*!50001 DROP VIEW IF EXISTS `v_item_list`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_item_list` AS SELECT 
 1 AS `itemId`,
 1 AS `sellerId`,
 1 AS `sellerNickname`,
 1 AS `sellerAvatar`,
 1 AS `sellerCreditScore`,
 1 AS `categoryId`,
 1 AS `categoryName`,
 1 AS `bookId`,
 1 AS `bookTitle`,
 1 AS `bookAuthor`,
 1 AS `itemType`,
 1 AS `title`,
 1 AS `description`,
 1 AS `price`,
 1 AS `originalPrice`,
 1 AS `conditionLevel`,
 1 AS `negotiable`,
 1 AS `location`,
 1 AS `status`,
 1 AS `viewCount`,
 1 AS `favoriteCount`,
 1 AS `createdAt`,
 1 AS `updatedAt`,
 1 AS `firstImage`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_user_summary`
--

DROP TABLE IF EXISTS `v_user_summary`;
/*!50001 DROP VIEW IF EXISTS `v_user_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_user_summary` AS SELECT 
 1 AS `userId`,
 1 AS `studentNo`,
 1 AS `nickname`,
 1 AS `avatarUrl`,
 1 AS `creditScore`,
 1 AS `itemCount`,
 1 AS `favoriteCount`,
 1 AS `completedErrandCount`,
 1 AS `publishedErrandCount`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'campus_service'
--
/*!50003 DROP FUNCTION IF EXISTS `fn_completed_errands` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_completed_errands`(p_user_id BIGINT) RETURNS int
    READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
    FROM errand_orders
   WHERE runner_id = p_user_id
     AND status = 'completed';

  RETURN v_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_unread_count` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_unread_count`(p_conversation_id BIGINT, p_user_id BIGINT) RETURNS int
    READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
    FROM messages
   WHERE conversation_id = p_conversation_id
     AND sender_id <> p_user_id
     AND is_read = 0;

  RETURN v_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_complete_errand` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_complete_errand`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_or_create_conversation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_or_create_conversation`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_publish_item` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_publish_item`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_user_credit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_refresh_user_credit`()
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_take_errand` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_take_errand`(
  IN p_order_id BIGINT,
  IN p_runner_id BIGINT,
  OUT p_code INT
)
BEGIN
  DECLARE v_publisher_id BIGINT DEFAULT NULL;
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_visibility VARCHAR(10) DEFAULT NULL;
  DECLARE v_chat_peer INT DEFAULT 0;
  DECLARE v_allowed INT DEFAULT 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT publisher_id, status, visibility
    INTO v_publisher_id, v_status, v_visibility
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
    IF v_visibility = 'private' THEN
      SELECT COUNT(*)
        INTO v_chat_peer
        FROM conversations
       WHERE biz_type = 'errand'
         AND biz_id = p_order_id
         AND user_a_id = LEAST(v_publisher_id, p_runner_id)
         AND user_b_id = GREATEST(v_publisher_id, p_runner_id);

      IF v_chat_peer = 0 THEN
        SET v_allowed = 0;
        SET p_code = 4031;
        ROLLBACK;
      END IF;
    END IF;

    IF v_allowed = 1 THEN
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
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Current Database: `campus_service`
--

USE `campus_service`;

--
-- Final view structure for view `v_conversation_base`
--

/*!50001 DROP VIEW IF EXISTS `v_conversation_base`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_conversation_base` AS select `c`.`conversation_id` AS `conversationId`,`c`.`user_a_id` AS `userAId`,`ua`.`nickname` AS `userANickname`,`ua`.`avatar_url` AS `userAAvatar`,`c`.`user_b_id` AS `userBId`,`ub`.`nickname` AS `userBNickname`,`ub`.`avatar_url` AS `userBAvatar`,`c`.`biz_type` AS `bizType`,`c`.`biz_id` AS `bizId`,`c`.`last_message` AS `lastMessage`,`c`.`last_time` AS `lastTime` from ((`conversations` `c` join `users` `ua` on((`ua`.`user_id` = `c`.`user_a_id`))) join `users` `ub` on((`ub`.`user_id` = `c`.`user_b_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_errand_hall`
--

/*!50001 DROP VIEW IF EXISTS `v_errand_hall`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_errand_hall` AS select `e`.`order_id` AS `orderId`,`e`.`publisher_id` AS `publisherId`,`u`.`nickname` AS `publisherNickname`,`u`.`avatar_url` AS `publisherAvatar`,`u`.`credit_score` AS `publisherCreditScore`,`e`.`pickup_area` AS `pickupArea`,`e`.`pickup_place` AS `pickupPlace`,`e`.`delivery_location` AS `deliveryLocation`,`e`.`item_size` AS `itemSize`,`e`.`item_desc` AS `itemDesc`,`e`.`remark` AS `remark`,`e`.`reward` AS `reward`,`e`.`time_type` AS `timeType`,`e`.`time_start` AS `timeStart`,`e`.`deadline` AS `deadline`,`e`.`status` AS `status`,`e`.`visibility` AS `visibility`,`e`.`created_at` AS `createdAt` from (`errand_orders` `e` join `users` `u` on((`u`.`user_id` = `e`.`publisher_id`))) where ((`e`.`status` = 'pending') and (`e`.`visibility` = 'hall')) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_item_list`
--

/*!50001 DROP VIEW IF EXISTS `v_item_list`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_item_list` AS select `i`.`item_id` AS `itemId`,`i`.`seller_id` AS `sellerId`,`u`.`nickname` AS `sellerNickname`,`u`.`avatar_url` AS `sellerAvatar`,`u`.`credit_score` AS `sellerCreditScore`,`i`.`category_id` AS `categoryId`,`c`.`name` AS `categoryName`,`i`.`book_id` AS `bookId`,`b`.`title` AS `bookTitle`,`b`.`author` AS `bookAuthor`,`i`.`item_type` AS `itemType`,`i`.`title` AS `title`,`i`.`description` AS `description`,`i`.`price` AS `price`,`i`.`original_price` AS `originalPrice`,`i`.`condition_level` AS `conditionLevel`,`i`.`negotiable` AS `negotiable`,`i`.`location` AS `location`,`i`.`status` AS `status`,`i`.`view_count` AS `viewCount`,`i`.`favorite_count` AS `favoriteCount`,`i`.`created_at` AS `createdAt`,`i`.`updated_at` AS `updatedAt`,(select `img`.`url` from `item_images` `img` where (`img`.`item_id` = `i`.`item_id`) order by `img`.`sort_no`,`img`.`image_id` limit 1) AS `firstImage` from (((`items` `i` join `users` `u` on((`u`.`user_id` = `i`.`seller_id`))) left join `categories` `c` on((`c`.`category_id` = `i`.`category_id`))) left join `books` `b` on((`b`.`book_id` = `i`.`book_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_user_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_user_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_user_summary` AS select `u`.`user_id` AS `userId`,`u`.`student_no` AS `studentNo`,`u`.`nickname` AS `nickname`,`u`.`avatar_url` AS `avatarUrl`,`u`.`credit_score` AS `creditScore`,(select count(0) from `items` `i` where (`i`.`seller_id` = `u`.`user_id`)) AS `itemCount`,(select count(0) from `favorites` `f` where (`f`.`user_id` = `u`.`user_id`)) AS `favoriteCount`,(select count(0) from `errand_orders` `e` where ((`e`.`runner_id` = `u`.`user_id`) and (`e`.`status` = 'completed'))) AS `completedErrandCount`,(select count(0) from `errand_orders` `e` where (`e`.`publisher_id` = `u`.`user_id`)) AS `publishedErrandCount` from `users` `u` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-20 14:43:36
