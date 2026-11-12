const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDir),
  filename: (req, file, callback) => {
    const extension = MIME_EXTENSIONS[file.mimetype];
    callback(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!MIME_EXTENSIONS[file.mimetype]) {
      const error = new Error('INVALID_FILE_TYPE');
      error.code = 'INVALID_FILE_TYPE';
      return callback(error);
    }
    return callback(null, true);
  }
});

router.post('/', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 413, '图片不能超过 5MB');
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return fail(res, 400, '只支持 jpg/png/webp 图片');
      }
      return next(err);
    }
    if (!req.file) {
      return fail(res, 400, '请选择要上传的图片');
    }
    return ok(res, { url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
