// 聊天接口（B 成员负责，挂载点 /api/conversations）
// 数据库对象由 A 交付：conversations / messages 表、v_conversation_base、
// fn_unread_count、sp_get_or_create_conversation、trg_message_after_insert。
// 口径以 docs/接口文档.md 第 6 章为准，不按 B 手册旧稿的 POST /read。
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const BIZ_TYPES = ['item', 'errand'];
const MSG_TYPES = ['text', 'image'];
const MAX_CONTENT_LENGTH = 500;
const MAX_PAGE_SIZE = 50;
const MAX_MESSAGE_LIMIT = 50;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MESSAGE_LIMIT = 20;

function readTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }
  return null;
}

function parseNonNegativeInt(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  }
  return null;
}

function readPagination(query) {
  const page = query.page === undefined || query.page === '' ? 1 : parsePositiveInt(query.page);
  const pageSize =
    query.pageSize === undefined || query.pageSize === ''
      ? DEFAULT_PAGE_SIZE
      : parsePositiveInt(query.pageSize);
  if (!page || !pageSize || pageSize > MAX_PAGE_SIZE) {
    return null;
  }
  return { page, pageSize };
}

/** 从 v_conversation_base 的一行里取出「对方」信息（BIGINT 可能是字符串，统一转数字比较） */
function peerOf(row, userId) {
  const isA = Number(row.userAId) === Number(userId);
  return {
    peerId: isA ? row.userBId : row.userAId,
    peerNickname: isA ? row.userBNickname : row.userANickname,
    peerAvatar: (isA ? row.userBAvatar : row.userAAvatar) || ''
  };
}

/**
 * 读会话并校验参与者身份。
 * 返回 { status: 'ok'|'not_found'|'forbidden', conversation }
 */
async function loadConversation(conversationId, userId) {
  const [rows] = await pool.query(
    `SELECT conversationId, userAId, userBId, bizType, bizId,
            userANickname, userAAvatar, userBNickname, userBAvatar,
            lastMessage, lastTime
       FROM v_conversation_base
      WHERE conversationId = ?`,
    [conversationId]
  );
  if (!rows.length) {
    return { status: 'not_found', conversation: null };
  }
  const row = rows[0];
  const isParticipant =
    Number(row.userAId) === Number(userId) || Number(row.userBId) === Number(userId);
  return { status: isParticipant ? 'ok' : 'forbidden', conversation: row };
}

// ============================================================
// GET /api/conversations/unread-count
// 必须注册在 /:id 系列之前，避免 unread-count 被当成会话 ID
// ============================================================
router.get('/unread-count', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count
         FROM messages m
         JOIN conversations c ON c.conversation_id = m.conversation_id
        WHERE (c.user_a_id = ? OR c.user_b_id = ?)
          AND m.sender_id <> ?
          AND m.is_read = 0`,
      [req.user.userId, req.user.userId, req.user.userId]
    );
    return ok(res, { count: Number(rows[0].count || 0) });
  } catch (err) {
    return next(err);
  }
});

// ============================================================
// POST /api/conversations  获取或创建会话
// ============================================================
router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const userId = req.user.userId;

  const peerId = parsePositiveInt(body.peerId);
  if (!peerId) {
    return fail(res, 400, 'peerId 不能为空');
  }
  if (peerId === userId) {
    return fail(res, 400, '不能和自己创建会话');
  }

  const bizType = readTrimmed(body.bizType);
  if (!BIZ_TYPES.includes(bizType)) {
    return fail(res, 400, 'bizType 不合法');
  }

  const bizId = parseNonNegativeInt(body.bizId);
  if (bizId === null || (bizType === 'item' && bizId <= 0)) {
    return fail(res, 400, 'bizId 不合法');
  }

  let conn;
  try {
    const [peerRows] = await pool.query(
      'SELECT user_id AS userId, nickname, avatar_url AS avatarUrl, status FROM users WHERE user_id = ?',
      [peerId]
    );
    if (!peerRows.length) {
      return fail(res, 404, '对方用户不存在');
    }
    if (peerRows[0].status !== 'active') {
      return fail(res, 404, '对方用户不存在');
    }

    if (bizType === 'item') {
      const [itemRows] = await pool.query('SELECT item_id FROM items WHERE item_id = ?', [bizId]);
      if (!itemRows.length) {
        return fail(res, 404, '商品不存在');
      }
    } else if (bizId > 0) {
      // P0-4：私单的查看/接单授权依赖「存在该单会话」（errands.js 的 isErrandChatPeer
      // 与 sp_take_errand），所以建会话这一步必须自己把关：私单只允许发布者发起。
      // 否则知道 publisherId + orderId 的人可以先插一条会话，再据此查看甚至接走私单。
      // 大厅单（visibility='hall'）不受限，任何人都可以就它发起咨询。
      const [orderRows] = await pool.query(
        `SELECT order_id AS orderId, publisher_id AS publisherId, visibility
           FROM errand_orders
          WHERE order_id = ?`,
        [bizId]
      );
      if (!orderRows.length) {
        return fail(res, 404, '订单不存在');
      }
      const order = orderRows[0];
      if (order.visibility === 'private' && Number(order.publisherId) !== Number(userId)) {
        return fail(res, 403, '私单只能由发布者发起会话');
      }
    }

    // 存储过程保证 user_a_id < user_b_id 归一化 + 唯一键去重
    conn = await pool.getConnection();
    await conn.query('CALL sp_get_or_create_conversation(?, ?, ?, ?, @conversationId)', [
      userId,
      peerId,
      bizType,
      bizId
    ]);
    const [outRows] = await conn.query('SELECT @conversationId AS conversationId');
    const conversationId = outRows[0] ? parsePositiveInt(outRows[0].conversationId) : null;
    if (!conversationId) {
      return fail(res, 400, '会话创建失败');
    }

    return ok(res, {
      conversationId,
      peerId,
      peerNickname: peerRows[0].nickname,
      peerAvatar: peerRows[0].avatarUrl || ''
    });
  } catch (err) {
    return next(err);
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// ============================================================
// GET /api/conversations  会话列表
// ============================================================
router.get('/', async (req, res, next) => {
  const pagination = readPagination(req.query);
  if (!pagination) {
    return fail(res, 400, '页码或每页条数不合法');
  }
  const { page, pageSize } = pagination;
  const userId = req.user.userId;

  try {
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM conversations WHERE user_a_id = ? OR user_b_id = ?',
      [userId, userId]
    );
    const total = Number(countRows[0].total || 0);

    const [rows] = await pool.query(
      `SELECT conversationId, userAId, userBId, bizType, bizId,
              userANickname, userAAvatar, userBNickname, userBAvatar,
              lastMessage, lastTime,
              fn_unread_count(conversationId, ?) AS unreadCount
         FROM v_conversation_base
        WHERE userAId = ? OR userBId = ?
        ORDER BY (lastTime IS NULL) ASC, lastTime DESC, conversationId DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      [userId, userId, userId]
    );

    const list = rows.map((row) => {
      const peer = peerOf(row, userId);
      return {
        conversationId: row.conversationId,
        peerId: peer.peerId,
        peerNickname: peer.peerNickname,
        peerAvatar: peer.peerAvatar,
        lastMessage: row.lastMessage === null ? null : row.lastMessage,
        lastTime: row.lastTime === null ? null : row.lastTime,
        unreadCount: Number(row.unreadCount || 0),
        bizType: row.bizType,
        bizId: row.bizId
      };
    });

    return ok(res, { list, total, page, pageSize });
  } catch (err) {
    return next(err);
  }
});

// ============================================================
// GET /api/conversations/:id/context  聊天页顶部业务卡片
// ============================================================
router.get('/:id/context', async (req, res, next) => {
  const conversationId = parsePositiveInt(req.params.id);
  if (!conversationId) {
    return fail(res, 400, '会话 ID 不合法');
  }

  try {
    const { status, conversation } = await loadConversation(conversationId, req.user.userId);
    if (status === 'not_found') {
      return fail(res, 404, '会话不存在');
    }
    if (status === 'forbidden') {
      return fail(res, 403, '无权查看该会话');
    }

    const bizType = conversation.bizType;
    const bizId = Number(conversation.bizId || 0);
    let bizSummary = null;

    if (bizType === 'item' && bizId > 0) {
      const [rows] = await pool.query(
        `SELECT i.item_id AS itemId,
                i.title,
                i.price,
                i.status,
                COALESCE(
                  (SELECT url FROM item_images
                    WHERE item_id = i.item_id
                    ORDER BY sort_no ASC, image_id ASC
                    LIMIT 1),
                  ''
                ) AS coverUrl
           FROM items i
          WHERE i.item_id = ?`,
        [bizId]
      );
      if (rows.length) {
        const row = rows[0];
        bizSummary = {
          itemId: row.itemId,
          title: row.title,
          // 接口文档 6 章的商品摘要字段就是 coverUrl（商品卡片用的 firstImage 在 adapter 里转换）
          coverUrl: row.coverUrl || '',
          price: row.price,
          status: row.status
        };
      }
    } else if (bizType === 'errand' && bizId > 0) {
      const [rows] = await pool.query(
        `SELECT order_id AS orderId, item_size AS itemSize, pickup_area AS pickupArea,
                pickup_place AS pickupPlace, reward, status
           FROM errand_orders
          WHERE order_id = ?`,
        [bizId]
      );
      if (rows.length) {
        bizSummary = rows[0];
      }
    }

    return ok(res, { bizType, bizId, bizSummary });
  } catch (err) {
    return next(err);
  }
});

// ============================================================
// GET /api/conversations/:id/messages  增量拉消息
// ============================================================
router.get('/:id/messages', async (req, res, next) => {
  const conversationId = parsePositiveInt(req.params.id);
  if (!conversationId) {
    return fail(res, 400, '会话 ID 不合法');
  }

  const afterId = parseNonNegativeInt(req.query.afterId);
  if (afterId === null) {
    return fail(res, 400, 'afterId 不合法');
  }

  const limit =
    req.query.limit === undefined || req.query.limit === ''
      ? DEFAULT_MESSAGE_LIMIT
      : parsePositiveInt(req.query.limit);
  if (!limit || limit > MAX_MESSAGE_LIMIT) {
    return fail(res, 400, 'limit 不合法');
  }

  const userId = req.user.userId;

  try {
    const { status } = await loadConversation(conversationId, userId);
    if (status === 'not_found') {
      return fail(res, 404, '会话不存在');
    }
    if (status === 'forbidden') {
      return fail(res, 403, '无权查看该会话');
    }

    // afterId=0：先按 messageId DESC 取最近一页，再升序返回
    const [rows] = await pool.query(
      `SELECT messageId, senderId, msgType, content, createdAt
         FROM (
           SELECT message_id AS messageId,
                  sender_id AS senderId,
                  msg_type AS msgType,
                  content,
                  created_at AS createdAt
             FROM messages
            WHERE conversation_id = ?
              AND message_id > ?
            ORDER BY message_id DESC
            LIMIT ${limit}
         ) t
        ORDER BY messageId ASC`,
      [conversationId, afterId]
    );

    const list = rows.map((row) => ({
      messageId: row.messageId,
      senderId: row.senderId,
      msgType: row.msgType,
      content: row.content,
      createdAt: row.createdAt,
      isMine: Number(row.senderId) === Number(userId)
    }));

    return ok(res, { list });
  } catch (err) {
    return next(err);
  }
});

// ============================================================
// POST /api/conversations/:id/messages  发送消息
// ============================================================
router.post('/:id/messages', async (req, res, next) => {
  const conversationId = parsePositiveInt(req.params.id);
  if (!conversationId) {
    return fail(res, 400, '会话 ID 不合法');
  }

  const body = req.body || {};
  const msgType = body.msgType === undefined || body.msgType === '' ? 'text' : readTrimmed(body.msgType);
  if (!MSG_TYPES.includes(msgType)) {
    return fail(res, 400, '消息类型不合法');
  }

  const content = readTrimmed(body.content);
  if (!content) {
    return fail(res, 400, '消息内容不能为空');
  }
  if (msgType === 'text' && content.length > MAX_CONTENT_LENGTH) {
    return fail(res, 400, `消息不能超过 ${MAX_CONTENT_LENGTH} 字`);
  }
  if (msgType === 'image' && !content.startsWith('/uploads/')) {
    return fail(res, 400, '图片地址不合法');
  }

  const userId = req.user.userId;

  try {
    const { status } = await loadConversation(conversationId, userId);
    if (status === 'not_found') {
      return fail(res, 404, '会话不存在');
    }
    if (status === 'forbidden') {
      return fail(res, 403, '无权在该会话发送消息');
    }

    // last_message / last_time 由 trg_message_after_insert 维护，不在这里手写
    const [result] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, msg_type, content, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [conversationId, userId, msgType, content]
    );

    const [rows] = await pool.query(
      'SELECT created_at AS createdAt FROM messages WHERE message_id = ?',
      [result.insertId]
    );

    return ok(res, {
      messageId: result.insertId,
      createdAt: rows.length ? rows[0].createdAt : null
    });
  } catch (err) {
    return next(err);
  }
});

// ============================================================
// PUT /api/conversations/:id/read  标记已读（方法固定 PUT）
// ============================================================
router.put('/:id/read', async (req, res, next) => {
  const conversationId = parsePositiveInt(req.params.id);
  if (!conversationId) {
    return fail(res, 400, '会话 ID 不合法');
  }

  const body = req.body || {};
  let lastMessageId = null;
  if (body.lastMessageId !== undefined && body.lastMessageId !== null && body.lastMessageId !== '') {
    lastMessageId = parsePositiveInt(body.lastMessageId);
    if (!lastMessageId) {
      return fail(res, 400, 'lastMessageId 不合法');
    }
  }

  const userId = req.user.userId;

  try {
    const { status } = await loadConversation(conversationId, userId);
    if (status === 'not_found') {
      return fail(res, 404, '会话不存在');
    }
    if (status === 'forbidden') {
      return fail(res, 403, '无权操作该会话');
    }

    if (lastMessageId) {
      await pool.query(
        `UPDATE messages
            SET is_read = 1
          WHERE conversation_id = ?
            AND sender_id <> ?
            AND is_read = 0
            AND message_id <= ?`,
        [conversationId, userId, lastMessageId]
      );
    } else {
      await pool.query(
        `UPDATE messages
            SET is_read = 1
          WHERE conversation_id = ?
            AND sender_id <> ?
            AND is_read = 0`,
        [conversationId, userId]
      );
    }

    const [rows] = await pool.query('SELECT fn_unread_count(?, ?) AS unreadCount', [
      conversationId,
      userId
    ]);

    return ok(res, { unreadCount: Number(rows[0].unreadCount || 0) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
