function ok(res, data = null, message = 'ok') {
  return res.json({ code: 0, message, data });
}

function fail(res, status, message) {
  return res.status(status).json({ code: status, message, data: null });
}

module.exports = { ok, fail };
