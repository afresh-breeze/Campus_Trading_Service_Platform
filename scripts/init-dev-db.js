/**
 * 本机一键初始化开发库 + 启动后端（B，11-16）
 * ------------------------------------------------------------------
 * 用途：MOCK=false 后需要真后端，本机首次配置用。
 * 步骤（全部自动化，可重复执行）：
 *   1. 连 MySQL（root + 命令行传入的密码）
 *   2. 执行 database/schema.sql（建库 + 14 张表；脚本会 DROP 重建，注意备份）
 *   3. 执行 database/objects.sql（4 视图 + 2 函数 + 5 存储过程 + 5 触发器）
 *   4. 写 server/.env（不存在才写；已存在则沿用，除非 --force-env）
 *   5. npm run seed（3 个演示账号，密码 123456）
 *   6. 启动后端（后台）并 curl /api/categories 验证
 *
 * 跑法：node scripts/init-dev-db.js <root密码>
 * 之后日常启动只需：cd server && npm start
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require(path.join(ROOT_DIR(), 'server', 'node_modules', 'mysql2', 'promise.js'));
const { spawn } = require('child_process');

function ROOT_DIR() {
  return path.resolve(__dirname, '..');
}
const ROOT = ROOT_DIR();
const pwd = process.argv[2];
if (!pwd) {
  console.error('用法：node scripts/init-dev-db.js <MySQL root 密码>');
  process.exit(1);
}

/**
 * 按 DELIMITER 指令切分 SQL（mysql2 驱动不认 `DELIMITER $$`，那是客户端指令）。
 * objects.sql 里函数/存储过程/触发器用 $$ 包着，内部有 `;`，必须按当前分隔符切。
 */
function splitStatements(sql) {
  const out = [];
  let delimiter = ';';
  let buf = '';
  const lines = String(sql).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line);
    if (m) {
      delimiter = m[1];
      continue;
    }
    buf += line + '\n';
    const trimmed = buf.replace(/\s+$/, '');
    if (trimmed.endsWith(delimiter)) {
      const stmt = trimmed.slice(0, trimmed.length - delimiter.length).trim();
      if (stmt) out.push(stmt);
      buf = '';
    }
  }
  const rest = buf.trim();
  if (rest) out.push(rest);
  return out;
}

/** 逐条执行（视图/函数/存储过程/触发器等含 DELIMITER 的文件用） */
async function runSqlFileLexed(conn, file) {
  const list = splitStatements(fs.readFileSync(file, 'utf8'));
  for (let i = 0; i < list.length; i += 1) {
    try {
      await conn.query(list[i]);
    } catch (e) {
      const head = list[i].replace(/\s+/g, ' ').slice(0, 90);
      throw new Error('第 ' + (i + 1) + '/' + list.length + ' 条失败：' + head + ' → ' + (e.message || e));
    }
  }
  return list.length;
}

async function runSqlFile(conn, file) {
  const sql = fs.readFileSync(file, 'utf8');
  const [results] = await conn.query(sql);
  return results;
}

(async () => {
  // 1. 连接
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: pwd,
      multipleStatements: true
    });
    console.log('[1/6] root 连接成功');
  } catch (e) {
    console.error('[1/6] root 连接失败：', e.code || e.message);
    process.exit(1);
  }

  // 2. schema.sql（内含 CREATE DATABASE/USE）
  try {
    await runSqlFile(conn, path.join(ROOT, 'database', 'schema.sql'));
    console.log('[2/6] schema.sql 执行完成（campus_service + 14 张表）');
  } catch (e) {
    console.error('[2/6] schema.sql 失败：', e.message && e.message.slice(0, 300));
    process.exit(1);
  }

  // 3. objects.sql（含 DELIMITER $$，逐条切分执行）
  try {
    await conn.changeUser({ database: 'campus_service' });
    const n = await runSqlFileLexed(conn, path.join(ROOT, 'database', 'objects.sql'));
    console.log('[3/6] objects.sql 执行完成（' + n + ' 条：视图/函数/存储过程/触发器）');
  } catch (e) {
    console.error('[3/6] objects.sql 失败：', e.message && e.message.slice(0, 400));
    process.exit(1);
  }

  // 验证表与演示前提
  const [tb] = await conn.query('SHOW TABLES');
  console.log('      表清单：', tb.map((r) => Object.values(r)[0]).join(', '));
  conn.end();

  // 4. server/.env
  const envPath = path.join(ROOT, 'server', '.env');
  if (fs.existsSync(envPath) && !process.argv.includes('--force-env')) {
    console.log('[4/6] server/.env 已存在，沿用（加 --force-env 覆盖）');
  } else {
    const env = [
      'PORT=3000',
      'DB_HOST=127.0.0.1',
      'DB_PORT=3306',
      'DB_USER=root',
      'DB_PASSWORD=' + pwd,
      'DB_NAME=campus_service',
      'JWT_SECRET=' + crypto.randomBytes(32).toString('hex'),
      ''
    ].join('\n');
    fs.writeFileSync(envPath, env, 'utf8');
    console.log('[4/6] server/.env 已写入（root 直连；权限分离见 A 手册 §1.7，.env 已 gitignore 勿提交）');
  }

  // 5. seed
  console.log('[5/6] npm run seed …');
  const seed = spawn('npm', ['run', 'seed'], {
    cwd: path.join(ROOT, 'server'),
    shell: true,
    stdio: 'inherit'
  });
  await new Promise((resolve) => seed.on('close', resolve));
  console.log('[5/6] seed 完成（演示账号 2023001/2023002/2023003，密码 123456）');

  // 6. 探测后端是否已在跑（不在则提示手动启动；不用 detached spawn，
  //    Windows + Git Bash 下 detached npm 不可靠，且进程应挂在用户自己的终端里）
  console.log('[6/6] 探测 http://127.0.0.1:3000 …');
  const http = require('http');
  const probe = () =>
    new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:3000/api/categories', { timeout: 1500 }, (res) => {
        res.resume();
        resolve(res.statusCode); // 401 也说明服务活着（该接口要鉴权）
      });
      req.on('error', () => resolve(0));
      req.on('timeout', () => {
        req.destroy();
        resolve(0);
      });
    });
  const status = await probe();
  if (status) {
    console.log('      后端已在运行（/api/categories → ' + status + '，401 = 服务正常但需登录）');
    console.log('\n完成。微信开发者工具重新编译即可。');
  } else {
    console.log('      后端未运行，请在**另一个终端**执行：');
    console.log('      cd server && npm start');
    console.log('\n数据库与 .env 已就绪，启动后即可用（演示账号 2023001/2023002/2023003，密码 123456）。');
  }
  process.exit(0);
})();
