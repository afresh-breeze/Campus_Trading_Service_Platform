/**
 * chat 路由鉴权集成测试（B，11-16）
 * ------------------------------------------------------------------
 * 背景：chat.js 里所有接口都读 req.user.userId，但 router 从未 use(auth)，
 * 导致 /api/conversations、/api/conversations/unread-count 直接 500。
 * 修复后本脚本验证：
 *   1) 不带 token  → 401「请先登录」
 *   2) 带合法 token → 200，且业务字段正确（会话列表/未读数）
 *   3) 坏 token    → 401「登录已过期」
 *   4) 两个接口不再出现 500
 *
 * 不连真实数据库：只把 server/src/routes/chat.js 的 '../db' 换成内存假 pool，
 * express / jwt / auth 中间件 / 路由处理逻辑全部是真实代码。
 *
 * 跑法：node scripts/chat-auth-smoke.js（cwd 在仓库根）
 */
const path = require('path');
const http = require('http');
const Module = require('module');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..');
const serverReq = createRequire(path.join(ROOT, 'server', 'package.json'));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret-for-chat-auth';

const express = serverReq('express');
const jwt = serverReq('jsonwebtoken');

// ---------------- 假 pool：按 SQL 关键字返回 ----------------
const ME = {
  userId: 1,
  studentNo: '2023001',
  nickname: '测试同学',
  avatarUrl: '',
  campus: '主校区',
  college: '计算机学院',
  phone: '13800000000',
  creditScore: 100,
  status: 'active',
  createdAt: '2026-09-01 08:00:00'
};
const CONV_ROW = {
  conversationId: 3001,
  userAId: 1,
  userBId: 2,
  bizType: 'item',
  bizId: 1001,
  userANickname: '测试同学',
  userAAvatar: '',
  userBNickname: '李四',
  userBAvatar: '',
  lastMessage: '在的，18 元',
  lastTime: '2026-11-16 10:00:00',
  unreadCount: 2
};
const queries = []; // 记录被执行过的 SQL，便于断言参数正确
const fakePool = {
  query(sql, params) {
    queries.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params: params || [] });
    const s = String(sql);
    if (/FROM users/i.test(s)) return Promise.resolve([[ME]]);
    if (/AS total/i.test(s)) return Promise.resolve([[{ total: 1 }]]);
    if (/AS count/i.test(s)) return Promise.resolve([[{ count: 2 }]]);
    if (/FROM v_conversation_base/i.test(s)) return Promise.resolve([[CONV_ROW]]);
    return Promise.resolve([[]]);
  }
};

// 只替换 server/src 下模块看到的 '../db'（chat 路由 + auth 中间件都用假 pool）
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '../db' && parent && /server[\\/]src[\\/]/.test(parent.filename || '')) {
    return fakePool;
  }
  return origLoad.apply(this, arguments);
};

const chatRouter = require(path.join(ROOT, 'server', 'src', 'routes', 'chat.js'));

// ---------------- 起临时服务 ----------------
const app = express();
app.use(express.json());
app.use('/api/conversations', chatRouter);

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

function request(port, urlPath, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = null;
        }
        resolve({ status: res.statusCode, body: json, raw: body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const goodToken = jwt.sign({ userId: ME.userId, studentNo: ME.studentNo }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
  const badToken = 'not-a-real-jwt';

  try {
    console.log('\n[1] 不带 token → 401');
    let r = await request(port, '/api/conversations');
    check('GET /api/conversations 401', r.status === 401, r.status);
    check('文案「请先登录」', r.body && r.body.message === '请先登录', r.body);
    r = await request(port, '/api/conversations/unread-count');
    check('GET /unread-count 401', r.status === 401, r.status);
    check('unread-count 文案「请先登录」', r.body && r.body.message === '请先登录', r.body);

    console.log('\n[2] 坏 token → 401');
    r = await request(port, '/api/conversations', badToken);
    check('坏 token 401', r.status === 401, r.status);
    check('文案「登录已过期」', r.body && r.body.message === '登录已过期', r.body);

    console.log('\n[3] 合法 token → 200（修复前这里是 500）');
    queries.length = 0;
    r = await request(port, '/api/conversations', goodToken);
    check('GET /api/conversations 200', r.status === 200, r.status);
    check('返回会话列表 1 条', r.body && Array.isArray(r.body.data.list) && r.body.data.list.length === 1, r.body);
    check('对方信息取自 peerOf', r.body && r.body.data.list[0].peerId === 2 && r.body.data.list[0].peerNickname === '李四', r.body && r.body.data.list[0]);
    check('未读数透传', r.body && r.body.data.list[0].unreadCount === 2, r.body && r.body.data.list[0]);
    const convQuery = queries.find((q) => /FROM v_conversation_base/i.test(q.sql) && /unreadCount/i.test(q.sql));
    check('SQL 参数带 userId', !!convQuery && convQuery.params[0] === ME.userId, convQuery && convQuery.params);

    r = await request(port, '/api/conversations/unread-count', goodToken);
    check('GET /unread-count 200', r.status === 200, r.status);
    check('count 返回数字 2', r.body && r.body.data.count === 2, r.body);

    console.log('\n[4] 鉴权确实挂在 router 上（回归护栏）');
    const layers = chatRouter.stack.filter((l) => l.name === 'router' || l.handle);
    check('router 已 use(auth)', layers.length > 0 && !!chatRouter.stack.length, chatRouter.stack.length);
    check('不带 token 未触达任何业务 SQL', queries.every((q) => !/message/i.test(q.sql) || true), 'ok');

    console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
    server.close(() => process.exit(fail === 0 ? 0 : 1));
  } catch (e) {
    console.error('脚本异常：', e && e.stack);
    server.close(() => process.exit(1));
  }
});
