const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const { ok, fail } = require('./utils/response');
const { start: startRunnerOnlineJob } = require('./jobs/runnerOnline');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/demo', express.static(path.join(__dirname, '../assets/demo')));

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    return ok(res, { time: new Date().toISOString(), db: 'ok' });
  } catch (err) {
    return next(err);
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/runners', require('./routes/runners'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/books', require('./routes/books'));
app.use('/api/items', require('./routes/items'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/errands', require('./routes/errands'));
app.use('/api/conversations', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/feedback', require('./routes/feedback'));

app.use((req, res) => fail(res, 404, '接口不存在'));

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  if (err.type === 'entity.parse.failed') {
    return fail(res, 400, '请求体格式错误');
  }
  const status = err.status || 500;
  return fail(res, status, status === 500 ? '服务器错误' : err.message);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`server running on http://127.0.0.1:${port}`);
  startRunnerOnlineJob();
});
